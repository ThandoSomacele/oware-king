# Android: Google Play

The Android app is a thin wrapper that opens the live game full screen (a "Trusted Web Activity"). PWABuilder, a free Microsoft website, makes the package from the live web address.

The game's web address is `https://owareking.object91.co.za`. You need a Google Play developer account (once-off fee, 25 US dollars).

Check the account type first: Play Console, Settings, Developer account, Account details. It is either Personal or Organisation. Part 3 differs for the two.

## Part 1: Make the package

1. Open https://www.pwabuilder.com in a browser.
2. Enter `https://owareking.object91.co.za` and select "Start".
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

This fingerprint is for the file you made. Google Play signs the app again with its own key, so there is a second fingerprint. You get it in Part 3, step 8.

## Part 3: Publish

1. Sign in to Google Play Console.
2. Select "Create app". Name: Oware King. Type: Game. Free.
3. Fill in the store listing with the text from `listing.md`.
4. Upload the icon `../assets/store-icon-512.png` and the banner `feature-graphic-1024x500.png`.
5. Upload phone screenshots from `screenshots/phone-1080x1920/`, and tablet screenshots from the two tablet folders.
6. Complete "App content": privacy policy link, no ads, content rating questionnaire, target audience, data safety. Use the answers in `listing.md`.
7. Go to "Testing", "Internal testing". Create a release and upload the `.aab` file.
8. Open "Test and release", "App integrity", then "App signing". Copy the SHA-256 value under "App signing key certificate".
9. Send it to me. Wait until I say it is live on the game server.
10. Add your own email as a tester and install the app on your phone from the test link.
11. Check that the game opens full screen with no address bar, and that online play works. If there is an address bar, uninstall the app, clear Chrome's storage for the game's address, and install again.
12. If the account type is Organisation: when it is good, create a "Production" release with the same file and send it for review.

If the account type is Personal (created after 13 November 2023), Google locks "Production" until a closed test is done. The internal test above does not count. Do this instead of step 12:

1. Go to "Testing", "Closed testing". Create a release on the closed track and upload the same `.aab` file.
2. Add at least 12 testers by email (Google accounts). Send them the opt-in link. Each one must accept and install the app.
3. Keep at least 12 testers opted in for 14 days in a row.
4. After 14 days, open the app's Dashboard and select "Apply for production access". Answer the questions about the test.
5. When Google approves, create a "Production" release with the same file and send it for review.
