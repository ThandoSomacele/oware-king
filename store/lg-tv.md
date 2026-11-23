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
7. Check the version at the bottom of the home screen. It must match the number in `platforms/webos/appinfo.json`.

The script builds the app, makes the package in `dist-ipk/`, installs it and starts it.

## Part 2: What to check on the TV

1. The title screen shows and "OK" on the remote starts the game.
2. A gold frame shows which button is selected.
3. The arrow keys move between buttons and pits.
4. "Play the computer" works: OK on a pit sows the seeds, and the seeds move smoothly.
5. Sound plays.
6. "Play a friend online" shows a QR code. Scan it with your phone, type a name, and play against the TV.
7. Back during a game asks "Leave this game?". Back on the home screen or the title screen closes the app.
8. Leave a game on screen for 3 minutes without touching the remote. The screen saver must not start.
9. The Magic Remote pointer can click every button.
10. Text is readable from the couch.
11. Turn off the TV's internet connection and open the app again. Every mode except online play must work.

Tell me what does not work, and what the TV model and webOS version are (Settings, General, About This TV).

## Part 3: Submit to LG Seller Lounge

Do this after Part 2 is good. Follow `lg-seller-lounge.md`: it has the exact value for every field, the files to upload, and what to do if LG asks for changes.

## Good to know

- The TV app talks to the game server named in `build.mjs` (`LIVE`), now `https://owareking.object91.co.za`. If the web address changes, change that line, raise the version in `platforms/webos/appinfo.json`, and build again.
- The app supports webOS 4 and newer (TVs from 2018). The code is converted for the old browser in those TVs.
- Every mode except online play works with no internet connection. With no connection the app uses the TV's own font, so the lettering looks a little different.
- A tiny silent video (`keepawake.mp4`, the same file as in Photo Frame) plays during a game to stop the TV screen saver.
