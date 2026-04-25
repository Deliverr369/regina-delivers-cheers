import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const roots = ['node_modules/@capacitor/ios', 'ios'].map((path) => join(process.cwd(), path));
const bridgeFileName = 'CapacitorBridge.swift';
const cordovaFileName = 'CDVPluginManager.m';

const safeNoDataSwift = `self.eval(js: "(function(){try{var c=window.Capacitor;if(c&&typeof c.triggerEvent==='function'){return c.triggerEvent('\\(eventName)','\\(target)');}var e=document.createEvent('Events');e.initEvent('\\(eventName)',false,false);var t='\\(target)'==='document'?document:('\\(target)'==='window'?window:document.querySelector('\\(target)'));return !!(t&&t.dispatchEvent&&t.dispatchEvent(e));}catch(e){return false;}})()")`;
const safeWithDataSwift = `self.eval(js: "(function(){try{var d=\\(data);var c=window.Capacitor;if(c&&typeof c.triggerEvent==='function'){return c.triggerEvent('\\(eventName)','\\(target)',d);}var e=document.createEvent('Events');e.initEvent('\\(eventName)',false,false);if(d&&typeof d==='object'){Object.assign(e,d);}var t='\\(target)'==='document'?document:('\\(target)'==='window'?window:document.querySelector('\\(target)'));return !!(t&&t.dispatchEvent&&t.dispatchEvent(e));}catch(e){return false;}})()")`;

const safeCordovaEvent = (eventName) =>
  `(function(){try{var c=window.Capacitor;if(c&&typeof c.triggerEvent==='function'){return c.triggerEvent('${eventName}','document');}var e=document.createEvent('Events');e.initEvent('${eventName}',false,false);return document.dispatchEvent(e);}catch(e){return false;}})()`;

function collectFiles(root, fileName, results = []) {
  if (!existsSync(root)) return results;
  for (const entry of readdirSync(root)) {
    const fullPath = join(root, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) collectFiles(fullPath, fileName, results);
    else if (entry === fileName) results.push(fullPath);
  }
  return results;
}

function patchSwiftBridge(path) {
  const source = readFileSync(path, 'utf8');
  const patched = source
    .replace(
      /(@objc public func triggerJSEvent\(eventName: String, target: String\) \{\n\s*)self\.eval\(js: ".*"\)(\n\s*\})/,
      `$1${safeNoDataSwift}$2`
    )
    .replace(
      /(@objc public func triggerJSEvent\(eventName: String, target: String, data: String\) \{\n\s*)self\.eval\(js: ".*"\)(\n\s*\})/,
      `$1${safeWithDataSwift}$2`
    );

  if (patched !== source) writeFileSync(path, patched);
  return patched.includes('typeof c.triggerEvent') && patched.includes('document.createEvent');
}

function patchCordovaManager(path) {
  const source = readFileSync(path, 'utf8');
  const patched = source
    .replace(/\[self\.commandDelegate evalJsHelper2:@".*pause.*"\];/, `[self.commandDelegate evalJsHelper2:@"${safeCordovaEvent('pause')}"];`)
    .replace(/\[self\.commandDelegate evalJsHelper2:@".*resume.*"\];/, `[self.commandDelegate evalJsHelper2:@"${safeCordovaEvent('resume')}"];`);

  if (patched !== source) writeFileSync(path, patched);
  return patched.includes('typeof c.triggerEvent') && patched.includes('document.createEvent');
}

const bridgePaths = roots.flatMap((root) => collectFiles(root, bridgeFileName));
const cordovaPaths = roots.flatMap((root) => collectFiles(root, cordovaFileName));
const verifiedFiles = [
  ...bridgePaths.filter(patchSwiftBridge),
  ...cordovaPaths.filter(patchCordovaManager),
];

if (verifiedFiles.length === 0) {
  console.warn('[patch-capacitor-ios] No Capacitor iOS bridge files found; skipping.');
  process.exit(0);
}

console.log(`[patch-capacitor-ios] Verified safe Capacitor iOS event dispatch in ${verifiedFiles.length} file${verifiedFiles.length === 1 ? '' : 's'}.`);
