import { existsSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// ---------- Legacy UIScene cleanup ----------
// Earlier generated iOS projects may contain a custom SceneDelegate.swift that
// referenced NSNotification.Name.capacitorStatusBarTappedNotification. Current
// Capacitor iOS exposes Notification.Name.capacitorStatusBarTapped instead, so
// that stale custom file breaks Xcode builds. The safest fix is to remove this
// custom UIScene retrofit and return to Capacitor's stock UIApplicationDelegate
// lifecycle until Capacitor ships an official SceneDelegate template.

const iosAppRoot = join(process.cwd(), 'ios', 'App', 'App');
const iosRoot = join(process.cwd(), 'ios');
const staleStatusBarNotificationToken = 'capacitorStatusBarTappedNotification';

function removeSceneManifestFromInfoPlist() {
  const plistPath = join(iosAppRoot, 'Info.plist');
  if (!existsSync(plistPath)) return false;
  const source = readFileSync(plistPath, 'utf8');
  const sceneManifestPattern = /\n\s*<key>UIApplicationSceneManifest<\/key>\s*\n\s*<dict>\s*\n\s*<key>UIApplicationSupportsMultipleScenes<\/key>\s*\n\s*<false\/>\s*\n\s*<key>UISceneConfigurations<\/key>\s*\n\s*<dict>\s*\n\s*<key>UIWindowSceneSessionRoleApplication<\/key>\s*\n\s*<array>\s*\n\s*<dict>\s*\n\s*<key>UISceneConfigurationName<\/key>\s*\n\s*<string>Default Configuration<\/string>\s*\n\s*<key>UISceneDelegateClassName<\/key>\s*\n\s*<string>\$\(PRODUCT_MODULE_NAME\)\.SceneDelegate<\/string>\s*\n\s*<key>UISceneStoryboardFile<\/key>\s*\n\s*<string>Main<\/string>\s*\n\s*<\/dict>\s*\n\s*<\/array>\s*\n\s*<\/dict>\s*\n\s*<\/dict>/;
  const patched = source.replace(sceneManifestPattern, '');
  if (patched === source) return false;
  writeFileSync(plistPath, patched);
  return true;
}

function removeSceneHooksFromAppDelegate() {
  const appDelegatePath = join(iosAppRoot, 'AppDelegate.swift');
  if (!existsSync(appDelegatePath)) return false;
  const source = readFileSync(appDelegatePath, 'utf8');
  const patched = source.replace(/\n\s*\/\/ MARK: UISceneSession Lifecycle\s*\n\s*func application\(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene\.ConnectionOptions\) -> UISceneConfiguration \{\s*\n\s*return UISceneConfiguration\(name: "Default Configuration", sessionRole: connectingSceneSession\.role\)\s*\n\s*\}\s*\n\s*func application\(_ application: UIApplication, didDiscardSceneSessions sceneSessions: Set<UISceneSession>\) \{\s*\n\s*\}\s*\n/, '\n');
  if (patched === source) return false;
  writeFileSync(appDelegatePath, patched);
  return true;
}

function removeGeneratedSceneDelegates() {
  if (!existsSync(iosRoot)) return false;
  const scenePaths = new Set(collectFiles(iosRoot, 'SceneDelegate.swift'));
  if (scenePaths.size === 0) return false;
  for (const scenePath of scenePaths) {
    unlinkSync(scenePath);
  }
  return true;
}

function removeSceneDelegateFromPbxproj() {
  const pbxPath = join(process.cwd(), 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
  if (!existsSync(pbxPath)) return false;
  const source = readFileSync(pbxPath, 'utf8');
  const patched = source
    .replace(/\n\s*[0-9A-F]{24} \/\* SceneDelegate\.swift in Sources \*\/ = \{isa = PBXBuildFile; fileRef = [0-9A-F]{24} \/\* SceneDelegate\.swift \*\/; \};/g, '')
    .replace(/\n\s*[0-9A-F]{24} \/\* SceneDelegate\.swift \*\/ = \{isa = PBXFileReference;[^\n]*\};/g, '')
    .replace(/\n\s*[0-9A-F]{24} \/\* SceneDelegate\.swift \*\/,/g, '')
    .replace(/\n\s*[0-9A-F]{24} \/\* SceneDelegate\.swift in Sources \*\/,/g, '');

  if (patched === source) return false;
  writeFileSync(pbxPath, patched);
  return true;
}

function removeLegacyUISceneAdoption() {
  if (!existsSync(iosRoot)) {
    console.log('[patch-capacitor-ios] No ios directory; skipping legacy UIScene cleanup.');
    return;
  }
  const sceneRemoved = removeGeneratedSceneDelegates();
  const plistPatched = removeSceneManifestFromInfoPlist();
  const appDelegatePatched = removeSceneHooksFromAppDelegate();
  const pbxPatched = removeSceneDelegateFromPbxproj();
  console.log(
    `[patch-capacitor-ios] Legacy UIScene cleanup: SceneDelegateRemoved=${sceneRemoved} Info.plist=${plistPatched} AppDelegate=${appDelegatePatched} project.pbxproj=${pbxPatched}`
  );
  verifyNoStaleIOSNotificationReferences();
}

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

function collectSwiftFiles(root, results = []) {
  if (!existsSync(root)) return results;
  for (const entry of readdirSync(root)) {
    const fullPath = join(root, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) collectSwiftFiles(fullPath, results);
    else if (entry.endsWith('.swift')) results.push(fullPath);
  }
  return results;
}

function verifyNoStaleIOSNotificationReferences() {
  const staleFiles = collectSwiftFiles(iosRoot).filter((path) => readFileSync(path, 'utf8').includes(staleStatusBarNotificationToken));
  if (staleFiles.length === 0) return;
  console.error(`[patch-capacitor-ios] Stale Capacitor status-bar notification reference remains in: ${staleFiles.join(', ')}`);
  process.exit(1);
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
const foundFiles = bridgePaths.length + cordovaPaths.length;
const verifiedFiles = [
  ...bridgePaths.filter(patchSwiftBridge),
  ...cordovaPaths.filter(patchCordovaManager),
];

if (foundFiles === 0) {
  console.warn('[patch-capacitor-ios] No Capacitor iOS bridge files found; skipping bridge patch.');
} else if (verifiedFiles.length !== foundFiles) {
  console.error(`[patch-capacitor-ios] Patched ${verifiedFiles.length}/${foundFiles} Capacitor iOS bridge files. Please check changed Capacitor source format.`);
  process.exit(1);
} else {
  console.log(`[patch-capacitor-ios] Verified safe Capacitor iOS event dispatch in ${verifiedFiles.length} file${verifiedFiles.length === 1 ? '' : 's'}.`);
}

removeLegacyUISceneAdoption();

