# App Icons & Splash Screen Source Assets

This folder contains the master source images used to generate native iOS and Android app icons and splash screens for Deliverr.

## Files

- `icon.png` — 1024×1024 master app icon (red background, white logo mark). Used for iOS App Store icon and all Android launcher icon densities.
- `splash.png` — 1920×1920+ master splash screen (logo centered with generous padding so it stays centered when cropped to any aspect ratio).

## Brand colors

- Primary red: `#E63946`
- Logo mark: white (#FFFFFF)

## Regenerate native assets

After editing `icon.png` or `splash.png`, regenerate all platform-specific sizes with:

```bash
npm run mobile:sync
```

This populates:
- `ios/App/App/Assets.xcassets/AppIcon.appiconset/` — all iOS icon sizes
- `ios/App/App/Assets.xcassets/Splash.imageset/` — iOS splash images
- `android/app/src/main/res/mipmap-*/` — all Android icon densities (incl. adaptive icons)
- `android/app/src/main/res/drawable-*/splash.png` — Android splash images
