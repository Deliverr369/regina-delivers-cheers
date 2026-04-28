import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const appName = 'Deliverr';
const root = process.cwd();

function writeIfChanged(path, contents) {
  if (!existsSync(path)) return false;
  const current = readFileSync(path, 'utf8');
  if (current === contents) return false;
  writeFileSync(path, contents);
  return true;
}

function patchAndroidStrings() {
  const path = join(root, 'android', 'app', 'src', 'main', 'res', 'values', 'strings.xml');
  if (!existsSync(path)) return false;

  let source = readFileSync(path, 'utf8');
  const upsertString = (xml, name, value) => {
    const pattern = new RegExp(`<string\\s+name=["']${name}["'][^>]*>[^<]*<\\/string>`);
    const replacement = `<string name="${name}">${value}</string>`;
    if (pattern.test(xml)) return xml.replace(pattern, replacement);
    return xml.replace('</resources>', `    ${replacement}\n</resources>`);
  };

  source = upsertString(source, 'app_name', appName);
  source = upsertString(source, 'title_activity_main', appName);
  return writeIfChanged(path, source);
}

function patchIosInfoPlist() {
  const path = join(root, 'ios', 'App', 'App', 'Info.plist');
  if (!existsSync(path)) return false;

  let source = readFileSync(path, 'utf8');
  const upsertPlistString = (plist, key, value) => {
    const pattern = new RegExp(`(<key>${key}<\\/key>\\s*<string>)[^<]*(<\\/string>)`);
    if (pattern.test(plist)) return plist.replace(pattern, `$1${value}$2`);
    return plist.replace('</dict>', `\t<key>${key}</key>\n\t<string>${value}</string>\n</dict>`);
  };

  source = upsertPlistString(source, 'CFBundleDisplayName', appName);
  source = upsertPlistString(source, 'CFBundleName', appName);
  return writeIfChanged(path, source);
}

function patchIosProjectName() {
  const path = join(root, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
  if (!existsSync(path)) return false;

  const source = readFileSync(path, 'utf8');
  const patched = source.replace(/PRODUCT_NAME = [^;]+;/g, `PRODUCT_NAME = ${appName};`);
  return writeIfChanged(path, patched);
}

const changes = {
  androidStrings: patchAndroidStrings(),
  iosInfoPlist: patchIosInfoPlist(),
  iosProjectName: patchIosProjectName(),
};

console.log(`[patch-native-branding] App name set to ${appName}: ${Object.entries(changes).map(([key, changed]) => `${key}=${changed}`).join(', ')}`);
