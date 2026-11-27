# Distributing Oware King

Publisher: **Object91**. App ID on every store: `com.object91.owareking`.

Everything here was prepared in code. The steps that need your accounts, your TV or your Mac are written as numbered guides.

| Platform | What is ready | What you must do | Guide |
|---|---|---|---|
| Web (any phone, tablet, PC) | Live. Can be installed from the browser as an app. Works offline for the modes that need no server. | Nothing. | - |
| LG webOS TV | App package (`.ipk`), remote-control play, QR code to join, icons, screenshots, listing text, tester notes. | Install on your TV, test, then submit with the values in `lg-seller-lounge.md` (worldwide, English). | `lg-tv.md` |
| Android (Google Play) | Installable web app, icons, screenshots, banner, listing text, privacy policy. | Create the Android package with PWABuilder, send me two fingerprints, upload to Play Console. | `google-play.md` |
| Windows (Microsoft Store) | Install check passed, Windows tiles, screenshots, every form value. | Create the developer account, reserve the name, make the package with PWABuilder, submit. | `microsoft-store.md` |
| iPhone and iPad (App Store) | Installable web app, icons, screenshots, listing text. | Create the Xcode project with PWABuilder, build and upload from your Mac. | `apple-app-store.md` |
| Web address | Done. The game runs at `https://owareking.object91.co.za`. | Nothing. Use this address in every store step. | `domain.md` |

## Files

- `listing.md`: the name, descriptions, keywords and answers that every store asks for.
- `screenshots/<device>/`: five screenshots per device size, at the exact sizes the stores ask for.
- `feature-graphic-1024x500.png`: the wide banner for Google Play.
- `../assets/store-icon-512.png`: the square store icon. `../assets/icon-*.png`: the app icons.
- `lg-seller-lounge.md`: every LG Seller Lounge field, ready to copy.
- `lg-tester-notes.md`: the note for LG's tester. `lg-ux-scenario.pdf`: the screen-by-screen document that LG asks for.

To make the screenshots again after a design change, see the first lines of `../scripts/make-store.js`.

## Order of work

1. Test the TV app on your own TV (`lg-tv.md`, part 1). It does not depend on anything else.
2. The web address is settled: `https://owareking.object91.co.za`.
3. Do Android, then Windows, then iOS. Each one wraps the live web address, so the address must be final first.
4. Submit the TV app to LG after you are happy with it on your TV.

## Not tested

- The TV app was tested in a desktop browser at TV size with remote-control keys, and with the code converted for old TV browsers. It was not tested on a real TV.
- The store steps were written from each store's published process. Menus change, so a button name can differ from what is written here.
