# Oware King

Oware, the West African sowing game, as one small web page that runs on phones, tablets and PCs.

**Live game:** https://owareking.object91.co.za (the older address https://oware-king.oware-king.workers.dev also works)

- `src/engine.js`: the rules, the computer player and the daily puzzle. No screen code. The game server uses the same file.
- `src/pixel.js`: the pixel-art title screen and logo, drawn in code.
- `src/brand.js`: the game's name and the seed bands.
- `src/config.js`, `src/compat.js`: per-build settings, and fill-ins for old TV browsers.
- `src/vendor/qrcode.min.js`: QR code library (MIT licence, see `src/vendor/README.md`).
- `platforms/webos/`, `store/`, `assets/`, `scripts/`: TV app settings, store material, icons and the scripts that make them.
- `src/app.js`, `src/style.css`, `src/index.html`: the screens, animation, sounds and online play.
- `server/worker.js`: the online game server (Cloudflare Workers). One room per game link; it checks every move.
- `wrangler.jsonc`: Cloudflare settings.
- `BRAND.md`: how to use the name, logo, colours and patterns.

## Commands

Run `npm install` once. Then:

- `npm run build`: builds the web page (`dist/`), the preview page (`dist-artifact/`) and the TV app folder (`dist-tv/`).
- `npm run dev`: builds, then runs the page and game server on your computer at http://127.0.0.1:8787
- `npm test`: checks the rules and plays two full games in a browser.
- `npm run test:online`: with `npm run dev` running in another window, a hostile-player test and two browsers playing two online games.
- `npm run test:tv`: with `npm run dev` running, the TV app hosts a game with remote keys and a phone joins from the QR link.
- `npm run tv`: makes the LG TV package in `dist-ipk/`. `sh platforms/webos/deploy.sh` also installs it on your TV.
- `npm run icons`: redraws the icon files in `assets/` from the pixel icon.
- `npm run store`: with `npm run dev` running, remakes the store screenshots in `store/screenshots/`.
- `npm run deploy`: builds and publishes to Cloudflare. It needs a Cloudflare API token with the "Edit Cloudflare Workers" permission, given as the `CLOUDFLARE_API_TOKEN` setting. Never save the token in this repository.
- The game page is bundled into the server code (`server/worker.js` imports `dist/index.html`), so one upload publishes both.

## Platforms

`store/README.md` is the starting point for every store. In short:

- **Web:** the live page installs as an app from the browser (manifest, icons and an offline copy are served by `server/worker.js`).
- **Big screens:** on tablets, PCs and TVs the whole game is enlarged to fit (`fit()` in `src/app.js`). Arrow keys, Enter and Escape work everywhere.
- **LG webOS TV:** `platforms/webos/` holds the app settings. The TV build names the server in full (`LIVE` in `build.mjs`) and its code is converted for old TV browsers.
- **Android, Windows, iOS:** store packages that wrap the live page, made with PWABuilder. See `store/`.

## How online play works

1. A player taps "Create game link". The server creates a room and gives a six-character code, shown as a link ending in `#g-code`.
2. The friend opens the link, sees who invited them, types a name and joins. A link that was never created, or is more than a day old, is refused.
3. Each tap is sent to the server. The server checks that it is that player's turn and that the move is legal, then adds it to the move list.
4. Both pages get the move list and animate the new move.
5. There are no accounts. A random ID saved on the device lets a player rejoin their seat after a reload, or from "Return to your game".
6. A player's name is fixed when they first join, so names cannot be used to pass messages. There is no chat, only five preset reactions.
7. The page checks the connection every 10 seconds and reconnects by itself.
8. Limits protect the server: 4 connections per room, one per player, 25 messages per 10 seconds, one reaction per 0.8 seconds.
9. A room that nobody uses for one day is deleted.

`npm run test:online` (with `npm run dev` running) checks all of this: `test/server.test.js` acts as a hostile player, and `test/online.js` plays two full games in two browsers.

Copyright (c) 2026 Thando Somacele. All rights reserved. See `LICENSE`.
