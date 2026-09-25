# Launch Deliverr on Google Play

## Goal
Prepare Deliverr as a production Android app for a new public Google Play listing. The existing Android identity `deliverr.deliverrconsumer` will be retained because Google package names cannot be changed after launch.

## Build preparation
- Generate the Android project from the existing Capacitor setup.
- Remove the hosted-preview development address from production packaging so the app ships its bundled website files.
- Keep the visible app name as **Deliverr** and apply the existing branded icon and splash artwork.
- Set an initial production version code and version name, plus safe release defaults for Android.
- Verify permissions and native configuration for current features, including push notifications and external payment pages.

## Google Play materials
- Add a release guide with the exact commands for generating a signed Android App Bundle (`.aab`).
- Prepare Play Store listing copy: app title, short description, full description, category, contact details, and privacy-policy URL.
- Prepare a compliance checklist covering alcohol/tobacco age restrictions, content rating, target audience, ads, data safety, account deletion, app access, and payment disclosures.
- Inventory available artwork and specify any screenshots or feature graphic still required in Play Console.

## Verification
- Generate and sync the Android project and native assets.
- Inspect the generated manifest and release settings.
- Build a local unsigned release bundle where the environment supports it, and report any signing-only blocker clearly.
- Check the latest project build diagnostics before completion.

## Publishing boundary
Google Play requires your personal Play Console access, legal declarations, identity verification, app signing acceptance, and final review submission. I will prepare everything in the project, but you will complete those protected steps in Play Console and upload the generated signed `.aab`.
