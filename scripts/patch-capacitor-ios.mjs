import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// ---------- UIScene lifecycle adoption ----------
// Capacitor's stock iOS template still uses the legacy UIApplicationDelegate
// lifecycle. Modern iOS prints "UIScene lifecycle will soon be required" and
// will eventually assert. We retrofit the generated `ios/App/App` project with
// a SceneDelegate, register it in Info.plist, and forward the legacy
// AppDelegate lifecycle hooks so Capacitor plugins keep working.

const iosAppRoot = join(process.cwd(), 'ios', 'App', 'App');
const iosRoot = join(process.cwd(), 'ios');

const sceneDelegateSwift = `import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }
        let window = UIWindow(windowScene: windowScene)
        let storyboard = UIStoryboard(name: "Main", bundle: nil)
        window.rootViewController = storyboard.instantiateInitialViewController()
        self.window = window
        window.makeKeyAndVisible()
    }

    func sceneDidDisconnect(_ scene: UIScene) {
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        NotificationCenter.default.post(name: UIApplication.didBecomeActiveNotification, object: nil)
    }

    func sceneWillResignActive(_ scene: UIScene) {
        NotificationCenter.default.post(name: UIApplication.willResignActiveNotification, object: nil)
    }

    func sceneWillEnterForeground(_ scene: UIScene) {
        NotificationCenter.default.post(name: UIApplication.willEnterForegroundNotification, object: nil)
    }

    func sceneDidEnterBackground(_ scene: UIScene) {
        NotificationCenter.default.post(name: UIApplication.didEnterBackgroundNotification, object: nil)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        guard let urlContext = URLContexts.first else { return }
        let url = urlContext.url
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: url, options: [:])
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
    }
}
`;

const sceneManifestPlist = `    <key>UIApplicationSceneManifest</key>
    <dict>
        <key>UIApplicationSupportsMultipleScenes</key>
        <false/>
        <key>UISceneConfigurations</key>
        <dict>
            <key>UIWindowSceneSessionRoleApplication</key>
            <array>
                <dict>
                    <key>UISceneConfigurationName</key>
                    <string>Default Configuration</string>
                    <key>UISceneDelegateClassName</key>
                    <string>$(PRODUCT_MODULE_NAME).SceneDelegate</string>
                    <key>UISceneStoryboardFile</key>
                    <string>Main</string>
                </dict>
            </array>
        </dict>
    </dict>
`;

function patchInfoPlist() {
  const plistPath = join(iosAppRoot, 'Info.plist');
  if (!existsSync(plistPath)) return false;
  const source = readFileSync(plistPath, 'utf8');
  if (source.includes('UIApplicationSceneManifest')) return true;
  const patched = source.replace(/<\/dict>\s*<\/plist>\s*$/, `${sceneManifestPlist}</dict>\n</plist>\n`);
  if (patched === source) return false;
  writeFileSync(plistPath, patched);
  return true;
}

function patchAppDelegate() {
  const appDelegatePath = join(iosAppRoot, 'AppDelegate.swift');
  if (!existsSync(appDelegatePath)) return false;
  const source = readFileSync(appDelegatePath, 'utf8');
  if (source.includes('configurationForConnecting')) return true;

  const sceneHooks = `
    // MARK: UISceneSession Lifecycle
    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        return UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    }

    func application(_ application: UIApplication, didDiscardSceneSessions sceneSessions: Set<UISceneSession>) {
    }
`;

  const patched = source.replace(/(\n\}\s*)$/, `${sceneHooks}$1`);
  if (patched === source) return false;
  writeFileSync(appDelegatePath, patched);
  return true;
}

function writeSceneDelegate() {
  if (!existsSync(iosRoot)) return false;
  const scenePaths = new Set(collectFiles(iosRoot, 'SceneDelegate.swift'));
  if (existsSync(iosAppRoot)) scenePaths.add(join(iosAppRoot, 'SceneDelegate.swift'));
  if (scenePaths.size === 0) return false;

  for (const scenePath of scenePaths) {
    // Always overwrite stale local copies. Older versions referenced
    // NSNotification.Name.capacitorStatusBarTappedNotification, which no
    // longer exists in current Capacitor iOS and breaks Xcode builds.
    writeFileSync(scenePath, sceneDelegateSwift);
  }
  return true;
}

function patchPbxproj() {
  const pbxPath = join(process.cwd(), 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
  if (!existsSync(pbxPath)) return false;
  const source = readFileSync(pbxPath, 'utf8');
  if (source.includes('SceneDelegate.swift')) return true;

  // Generate stable-ish 24-char hex ids
  const fileRefId = 'A1B2C3D4E5F6A7B8C9D0E1F2';
  const buildFileId = 'F2E1D0C9B8A7F6E5D4C3B2A1';

  let patched = source;

  // 1. PBXFileReference entry — inject after AppDelegate.swift file reference
  patched = patched.replace(
    /(\/\* AppDelegate\.swift \*\/ = \{isa = PBXFileReference;[^}]*\};)/,
    `$1\n\t\t${fileRefId} /* SceneDelegate.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = SceneDelegate.swift; sourceTree = "<group>"; };`
  );

  // 2. PBXBuildFile entry — inject after AppDelegate build file
  patched = patched.replace(
    /(\/\* AppDelegate\.swift in Sources \*\/ = \{isa = PBXBuildFile; fileRef = [0-9A-F]+ \/\* AppDelegate\.swift \*\/; \};)/,
    `$1\n\t\t${buildFileId} /* SceneDelegate.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${fileRefId} /* SceneDelegate.swift */; };`
  );

  // 3. Add to App group children (group containing AppDelegate.swift)
  patched = patched.replace(
    /([0-9A-F]+ \/\* AppDelegate\.swift \*\/,)/,
    `$1\n\t\t\t\t${fileRefId} /* SceneDelegate.swift */,`
  );

  // 4. Add to Sources build phase
  patched = patched.replace(
    /([0-9A-F]+ \/\* AppDelegate\.swift in Sources \*\/,)/,
    `$1\n\t\t\t\t${buildFileId} /* SceneDelegate.swift in Sources */,`
  );

  if (patched === source) return false;
  writeFileSync(pbxPath, patched);
  return true;
}

function applyUISceneAdoption() {
  if (!existsSync(iosRoot)) {
    console.log('[patch-capacitor-ios] No ios directory; skipping UIScene adoption.');
    return;
  }
  const sceneWritten = writeSceneDelegate();
  const plistPatched = patchInfoPlist();
  const appDelegatePatched = patchAppDelegate();
  const pbxPatched = patchPbxproj();
  console.log(
    `[patch-capacitor-ios] UIScene adoption: SceneDelegate=${sceneWritten} Info.plist=${plistPatched} AppDelegate=${appDelegatePatched} project.pbxproj=${pbxPatched}`
  );
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

applyUISceneAdoption();

