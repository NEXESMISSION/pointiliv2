# Pointili for Android (the APK)

The site itself as an Android app: a Trusted Web Activity made with [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap)
(Google Chrome Labs). It opens https://www.pointili.online full screen in the phone's Chrome — the same pages, sign-in,
camera and notifications — so the app never needs an update for the site to change.

Why it exists (6 Nov 2026): on some phones the browser never offers to install the site (the owner of «سلطان العطور»,
Chrome and Brave alike, three days). The install buttons offer this app when the browser has not answered in fifteen
seconds (components/InstallNone), and https://www.pointili.online/android leads straight to it.

- `twa-manifest.json` — what Bubblewrap builds: package `online.pointili.app`, the name, icons and colours of the site,
  Android 7.0 (API 24) and up.
- `public/pointili.apk` — the signed app, served with its own headers (next.config.ts).
- `public/.well-known/assetlinks.json` — the site vouches for the app (its certificate's SHA-256): the app opens without
  an address bar. A new signing key means a new fingerprint there, or the app shows Chrome's bar.

## The signing key

Never in git. `C:\Users\ayoub\pointili-android\keystore\pointili.keystore` (alias `pointili`), a copy in
`C:\Users\ayoub\OneDrive\pointili-android-signing\`, its password in `.env.local` as `ANDROID_KEYSTORE_PASSWORD`.
Every update must be signed with it, or phones refuse to update the app.

## A new version

Raise `appVersionCode` (and `appVersionName`) in `twa-manifest.json`, copy it to `C:\Users\ayoub\pointili-android\app\`,
then from that folder (Java 17 and the Android SDK are in `C:\Users\ayoub\pointili-android\`, Bubblewrap in `bw\`):

```
set JAVA_HOME=C:\Users\ayoub\pointili-android\jdk-17.0.21+9
set ANDROID_HOME=C:\Users\ayoub\pointili-android\sdk
set PATH=C:\Users\ayoub\pointili-android\app;%PATH%
set BUBBLEWRAP_KEYSTORE_PASSWORD=<ANDROID_KEYSTORE_PASSWORD>
set BUBBLEWRAP_KEY_PASSWORD=<ANDROID_KEYSTORE_PASSWORD>
..\bw\node_modules\.bin\bubblewrap update --skipVersionUpgrade
..\bw\node_modules\.bin\bubblewrap build --skipPwaValidation
```

Then copy `app-release-signed.apk` to `public/pointili.apk`. (`app-release-bundle.aab` is the one Google Play takes, if
the app ever goes there.) `node scripts/install.mjs` checks the buttons, the download and `assetlinks.json`.
