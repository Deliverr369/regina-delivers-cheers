# Google Play Production Checklist

Complete these declarations in Play Console using the current app behaviour and your business records.

## App setup

- [ ] Create the app as **Deliverr**, default language English (Canada), app type App, pricing Free.
- [ ] Accept Google Play App Signing.
- [ ] Use package name `deliverr.deliverrconsumer`. This identity is permanent after the first upload.
- [ ] Upload the signed Android App Bundle from `android/app/build/outputs/bundle/release/app-release.aab`.
- [ ] Add support contact details and the public privacy policy URL `https://deliverr.ca/privacy`.

## Policy declarations

- [ ] **App access:** explain whether review requires a test account. If checkout or orders require sign-in, provide a working reviewer account and concise access steps.
- [ ] **Ads:** select No unless advertising SDKs or paid advertisements are added before submission.
- [ ] **Target audience:** choose adults only. The service sells age-restricted alcohol and tobacco products and requires customers to be 19+.
- [ ] **Content rating:** disclose alcohol and tobacco references and commerce accurately.
- [ ] **News app:** select No.
- [ ] **Government app:** select No.
- [ ] **Financial features:** disclose only ordinary card payment processing; the app does not provide lending, investing or banking services.
- [ ] **Health apps:** select No.

## Data safety

Review the final SDK report in Play Console before submitting. The app currently handles:

- Account details: name, email address, phone number and user ID
- Delivery details: street address and delivery instructions when supplied
- Purchase history and order details
- Payment processing identifiers; full card details are entered through Stripe and are not stored by Deliverr
- Device tokens for push notifications when enabled
- App interactions and diagnostics required to operate and secure the service

Declare collection, sharing, encryption in transit, deletion handling and whether each data type is required or optional based on the final production behaviour. Do not claim that no data is collected.

## Account deletion

- [ ] Confirm customers can request account deletion inside the app.
- [ ] Add the required external account-deletion URL in Play Console if Google requests one. The URL must explain how to request deletion and what legally required order records may be retained.

## Commerce and age restrictions

- [ ] State clearly that alcohol and tobacco purchases require age 19+ and government photo ID at delivery.
- [ ] Confirm service availability is limited to Regina, Saskatchewan.
- [ ] Ensure screenshots do not market age-restricted products to minors.
- [ ] Confirm local licensing, delivery and regulated-product requirements with qualified Saskatchewan counsel before public submission.

## Production verification

- [ ] Add the Android `google-services.json` for package `deliverr.deliverrconsumer` before the final build if push notifications must work in version 1. The existing server notification credentials do not replace this Android app configuration file.
- [ ] Test signup, login, address entry, catalogue, cart, card payment, Pay at the door, order creation and notifications on a physical Android device.
- [ ] Test with production services and remove all sandbox/test notices from screenshots.
- [ ] Verify `https://deliverr.ca/privacy`, support email and phone number are reachable.
- [ ] Review the Play pre-launch report and fix crashes, blank screens, accessibility blockers and Android compatibility warnings.
- [ ] Submit the production release for Google review.