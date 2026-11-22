# Android: Google Play

The Android app is a thin wrapper that opens the live game full screen (a "Trusted Web Activity"). PWABuilder, a free Microsoft website, makes the package from the live web address.

Before you start: settle the web address (`domain.md`). You need a Google Play developer account (once-off fee, 25 US dollars).

## Part 1: Make the package

1. Open https://www.pwabuilder.com in a browser.
2. Enter the game's web address and select "Start".
3. Wait for the report. It must show a manifest and a service worker. If it shows a problem, send me the text.
4. Select "Package for stores", then "Android".
5. Set Package ID to `com.object91.owareking`.
6. Set App name to `Oware King`. Set Launcher name to `Oware King`.
7. Set version to `1.0.0` and version code to `1`.
8. Under signing key, select "Create new".
9. Select "Download".
10. Unzip the file. Keep the whole folder in a safe place that is backed up.

The folder holds the app (`.aab`), a signing key (`signing.keystore`) and its passwords (`signing-key-info.txt`). You need the same key for every future update. If you lose it, you cannot update the app. Do not put it in GitHub. Do not send it to me.

## Part 2: Link the app to the website

1. Open `assetlinks.json` from the folder.
2. Copy the long value after `sha256_cert_fingerprints`. It is a public fingerprint, not a secret.
3. Send it to me. I add it to the game server, so the app opens without a browser bar.

After the first upload, Google Play shows a second fingerprint (Play Console, your app, "App integrity", "App signing key certificate", SHA-256). Send me that one too.

## Part 3: Publish

1. Sign in to Google Play Console.
2. Select "Create app". Name: Oware King. Type: Game. Free.
3. Fill in the store listing with the text from `listing.md`.
4. Upload the icon `../assets/store-icon-512.png` and the banner `feature-graphic-1024x500.png`.
5. Upload phone screenshots from `screenshots/phone-1080x1920/`, and tablet screenshots from the two tablet folders.
6. Complete "App content": privacy policy link, no ads, content rating questionnaire, target audience, data safety. Use the answers in `listing.md`.
7. Go to "Testing", "Internal testing". Create a release and upload the `.aab` file.
8. Add your own email as a tester and install the app on your phone from the test link.
9. Check that the game opens full screen with no address bar, and that online play works.
10. When it is good, create a "Production" release with the same file and send it for review.

Google requires new personal developer accounts to run a closed test with at least 12 testers for 14 days before production. A company account does not have this rule. Check which type the Object91 account is.
