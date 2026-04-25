import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const bridgePath = join(process.cwd(), 'node_modules/@capacitor/ios/Capacitor/Capacitor/CapacitorBridge.swift');

if (!existsSync(bridgePath)) {
  console.warn('[patch-capacitor-ios] Capacitor iOS bridge not found; skipping.');
  process.exit(0);
}

const source = readFileSync(bridgePath, 'utf8');

if (source.includes('window.Capacitor && typeof window.Capacitor.triggerEvent')) {
  console.log('[patch-capacitor-ios] Capacitor iOS bridge already patched.');
  process.exit(0);
}

const patched = source
  .replace(
    'self.eval(js: "window.Capacitor.triggerEvent(\'\\(eventName)\', \'\\(target)\')")',
    'self.eval(js: "if (window.Capacitor && typeof window.Capacitor.triggerEvent === \'function\') { window.Capacitor.triggerEvent(\'\\(eventName)\', \'\\(target)\'); } else { window.addEventListener(\'load\', function () { if (window.Capacitor && typeof window.Capacitor.triggerEvent === \'function\') { window.Capacitor.triggerEvent(\'\\(eventName)\', \'\\(target)\'); } }, { once: true }); }")'
  )
  .replace(
    'self.eval(js: "window.Capacitor.triggerEvent(\'\\(eventName)\', \'\\(target)\', \\(data))")',
    'self.eval(js: "if (window.Capacitor && typeof window.Capacitor.triggerEvent === \'function\') { window.Capacitor.triggerEvent(\'\\(eventName)\', \'\\(target)\', \\(data)); } else { window.addEventListener(\'load\', function () { if (window.Capacitor && typeof window.Capacitor.triggerEvent === \'function\') { window.Capacitor.triggerEvent(\'\\(eventName)\', \'\\(target)\', \\(data)); } }, { once: true }); }")'
  );

if (patched === source) {
  console.error('[patch-capacitor-ios] Expected bridge lines were not found.');
  process.exit(1);
}

writeFileSync(bridgePath, patched);
console.log('[patch-capacitor-ios] Patched Capacitor iOS bridge event dispatch.');
