# Pointili for Android (the APK)

The site itself as an Android app, in **Android's own WebView** — nothing else on the phone needed: no Chrome, no
Play services, no browser that has to agree to install anything. Served at https://www.pointili.online/pointili.apk
(short: `/android`), offered by the install buttons when a phone's browser has not offered the install in fifteen
seconds (components/InstallNone).

Why (6–8 Nov 2026): on one owner's phone the browser never offered to install the site — Chrome and Brave alike —
and the first app (version 1, a Chrome Trusted Web Activity made with Bubblewrap) still leaned on that browser.
Version 2 is this one, with the same package and the same key: it installs over version 1 as an update.

What it does (`app/src/main/java/online/pointili/app/LauncherActivity.java`, one screen):

- Pointili's pages stay in the app, signed in across launches (cookies and storage kept); anything else —
  WhatsApp, a call, another site — opens in its own app.
- The camera goes to the page's scanner, after Android's own question (Pointili's pages only).
- A logo is picked with Android's file picker; the customers' file (`/api/export`) lands in Downloads, signed in.
- The back button goes back a page; no network: a page that says so, and tries again.
- Pointili's links (a tampon link, the account) open in the app: the site vouches for it
  (`public/.well-known/assetlinks.json`, the key's SHA-256).
- Its user agent ends in `PointiliApp/2`: the site knows it is in the app (lib/pwa `inOurApp`: no install button;
  lib/track: counted as the app). Web push does not exist in a WebView: no notifications here.

## The signing key

Never in git. `C:\Users\ayoub\pointili-android\keystore\pointili.keystore` (alias `pointili`), a copy in
`C:\Users\ayoub\OneDrive\pointili-android-signing\`, its password in `.env.local` as `ANDROID_KEYSTORE_PASSWORD`.
Every update must be signed with it, or phones refuse it.

## A new version

Raise `versionCode` and `versionName` in `app/build.gradle`. With Java 17 and the Android SDK
(`C:\Users\ayoub\pointili-android\`: `jdk-17.0.21+9`, `sdk`), from this folder:

```
set JAVA_HOME=C:\Users\ayoub\pointili-android\jdk-17.0.21+9
set ANDROID_HOME=C:\Users\ayoub\pointili-android\sdk
set POINTILI_KEYSTORE_PASSWORD=<ANDROID_KEYSTORE_PASSWORD>
gradlew.bat assembleRelease
```

(`local.properties` with `sdk.dir=...` the first time.) Then copy `app/build/outputs/apk/release/app-release.apk` to
`public/pointili.apk`. `node scripts/install.mjs` checks the download and `assetlinks.json`;
`node scripts/android.mjs` runs the app itself in an Android emulator.
