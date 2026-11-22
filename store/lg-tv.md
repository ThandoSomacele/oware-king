# LG webOS TV

The TV app is a packaged page, the same kind of app as Photo Frame. It plays with the remote. A friend joins an online game by scanning a QR code with a phone.

App ID: `com.object91.owareking`. Vendor: Object91. Resolution: 1920 x 1080.

## Part 1: Install on your own TV

You need the same setup that you use for Photo Frame: the TV in Developer Mode, and `tools/tv-relay.py` from the `webos-apps` project.

1. Open a terminal on your Mac.
2. Go to the `oware-king` folder.
3. Run `npm install` once.
4. Start the relay, as for Photo Frame.
5. Run `sh platforms/webos/deploy.sh`.
6. Wait for the app to open on the TV.

The script builds the app, makes the package in `dist-ipk/`, installs it and starts it.

## Part 2: What to check on the TV

1. The title screen shows and "OK" on the remote starts the game.
2. A gold frame shows which button is selected.
3. The arrow keys move between buttons and pits.
4. "Play the computer" works: OK on a pit sows the seeds, and the seeds move smoothly.
5. Sound plays.
6. "Play a friend online" shows a QR code. Scan it with your phone, type a name, and play against the TV.
7. Back during a game asks "Leave this game?". Back on the home screen closes the app.
8. The Magic Remote pointer can click every button.
9. Text is readable from the couch.

Tell me what does not work, and what the TV model and webOS version are (Settings, General, About This TV).

## Part 3: Submit to LG Seller Lounge

Do this after Part 2 is good.

1. Sign in to LG Seller Lounge with the Object91 account.
2. Start a new app.
3. Upload `dist-ipk/com.object91.owareking_1.0.0_all.ipk`.
4. Enter the text from `listing.md`.
5. Upload `../assets/store-icon-512.png` as the app icon. Tile colour: `#14110E`.
6. Upload the five pictures from `screenshots/tv-1920x1080/`.
7. Service country: South Africa. Add more countries later if you want.
8. Remote controller: both Magic Remote and standard remote.
9. Billing: No. In-app ads: No. Test account: Not applicable.
10. Paste `lg-tester-notes.md` into "Note for tester".
11. Submit.

LG also asked for a UX scenario document for Photo Frame. Oware King does not have one yet. Ask me to make it when you are ready to submit.

## Good to know

- The TV app talks to the game server named in `build.mjs` (`LIVE`). If the web address changes, change that line, raise the version in `platforms/webos/appinfo.json`, and build again.
- The app supports webOS 4 and newer (TVs from 2018). The code is converted for the old browser in those TVs.
- Every mode except online play works with no internet connection.
