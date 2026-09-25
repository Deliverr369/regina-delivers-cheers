# Android Release Guide

## One-time requirements

Install Android Studio with the current Android SDK and Java version requested by the generated Gradle project. Export this project to your GitHub repository, then pull it onto that computer.

## Prepare the Android project

```bash
npm install
npx cap add android
npm run android:prepare
```

For every later project update, pull the latest changes and run:

```bash
npm install
npm run android:prepare
npx cap sync android
```

## Create the signing key

In Android Studio, open the `android` folder and choose **Build → Generate Signed Bundle / APK → Android App Bundle**. Create and securely back up a new upload key when prompted. Do not commit the keystore, its password or signing configuration.

Google Play App Signing should manage the distribution key. Your upload key is still required for future updates, so retain at least two protected backups.

## Build and upload

Generate a signed release bundle from Android Studio. The resulting file is normally:

`android/app/build/outputs/bundle/release/app-release.aab`

Create the new Play Console app, complete the store listing and declarations, then upload the bundle under **Production**. Resolve any Play Console validation errors before starting rollout.

## Important

The release package uses bundled website files and does not point to the Lovable preview. The package name is `deliverr.deliverrconsumer`, the visible name is **Deliverr**, and the first release is version `1.0.0` with version code `1`.