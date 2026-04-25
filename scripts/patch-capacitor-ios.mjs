import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const bridgePath = join(process.cwd(), 'node_modules/@capacitor/ios/Capacitor/Capacitor/CapacitorBridge.swift');
const cordovaPluginManagerPath = join(process.cwd(), 'node_modules/@capacitor/ios/CapacitorCordova/CapacitorCordova/Classes/Public/CDVPluginManager.m');
const guardedPause = "if (window.Capacitor && typeof window.Capacitor.triggerEvent === 'function') { window.Capacitor.triggerEvent('pause', 'document'); } else { window.addEventListener('load', function () { if (window.Capacitor && typeof window.Capacitor.triggerEvent === 'function') { window.Capacitor.triggerEvent('pause', 'document'); } }, { once: true }); }";
const guardedResume = "if (window.Capacitor && typeof window.Capacitor.triggerEvent === 'function') { window.Capacitor.triggerEvent('resume', 'document'); } else { window.addEventListener('load', function () { if (window.Capacitor && typeof window.Capacitor.triggerEvent === 'function') { window.Capacitor.triggerEvent('resume', 'document'); } }, { once: true }); }";
let patchedFiles = 0;

if (!existsSync(bridgePath)) {
  console.warn('[patch-capacitor-ios] Capacitor iOS bridge not found; skipping.');
  process.exit(0);
}

const source = readFileSync(bridgePath, 'utf8');

const patched = source
  .replace(
    'self.eval(js: "window.Capacitor.triggerEvent(\'\\(eventName)\', \'\\(target)\')")',
    'self.eval(js: "if (window.Capacitor && typeof window.Capacitor.triggerEvent === \'function\') { window.Capacitor.triggerEvent(\'\\(eventName)\', \'\\(target)\'); } else { window.addEventListener(\'load\', function () { if (window.Capacitor && typeof window.Capacitor.triggerEvent === \'function\') { window.Capacitor.triggerEvent(\'\\(eventName)\', \'\\(target)\'); } }, { once: true }); }")'
  )
  .replace(
    'self.eval(js: "window.Capacitor.triggerEvent(\'\\(eventName)\', \'\\(target)\', \\(data))")',
    'self.eval(js: "if (window.Capacitor && typeof window.Capacitor.triggerEvent === \'function\') { window.Capacitor.triggerEvent(\'\\(eventName)\', \'\\(target)\', \\(data)); } else { window.addEventListener(\'load\', function () { if (window.Capacitor && typeof window.Capacitor.triggerEvent === \'function\') { window.Capacitor.triggerEvent(\'\\(eventName)\', \'\\(target)\', \\(data)); } }, { once: true }); }")'
  );

if (patched !== source) {
  writeFileSync(bridgePath, patched);
  patchedFiles += 1;
}

if (existsSync(cordovaPluginManagerPath)) {
  const cordovaSource = readFileSync(cordovaPluginManagerPath, 'utf8');
  const cordovaPatched = cordovaSource
    .replace('@"window.Capacitor.triggerEvent(\'pause\', \'document\');"', `@"${guardedPause}"`)
    .replace('@"window.Capacitor.triggerEvent(\'resume\', \'document\');"', `@"${guardedResume}"`);
  if (cordovaPatched !== cordovaSource) {
    writeFileSync(cordovaPluginManagerPath, cordovaPatched);
    patchedFiles += 1;
  }
}

if (patchedFiles === 0 && !source.includes('window.Capacitor && typeof window.Capacitor.triggerEvent')) {
  console.error('[patch-capacitor-ios] Expected iOS bridge triggerEvent lines were not found.');
  process.exit(1);
}

console.log(`[patch-capacitor-ios] Verified safe Capacitor iOS event dispatch (${patchedFiles} file${patchedFiles === 1 ? '' : 's'} patched).`);
