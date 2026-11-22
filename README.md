# Oware King

Oware, the West African sowing game, as one small web page that runs on phones, tablets and PCs.

**Live game:** https://oware-king.oware-king.workers.dev

- `src/engine.js`: the rules, the computer player and the daily puzzle. No screen code. The game server uses the same file.
- `src/pixel.js`: all the artwork, drawn in code: title screen, logo, board, seeds, digits, rings and app icon.
- `src/brand.js`: the game's name.
- `src/app.js`, `src/style.css`, `src/index.html`: the screens, animation, sounds and online play.
- `server/worker.js`: the online game server (Cloudflare Workers). One room per game link; it checks every move.
- `wrangler.jsonc`: Cloudflare settings.
- `BRAND.md`: how to use the name, logo, colours and patterns.

## Commands

Run `npm install` once. Then:

- `npm run build`: joins the source files into `dist/index.html`.
- `npm run dev`: builds, then runs the page and game server on your computer at http://127.0.0.1:8787
- `npm test`: checks the rules and plays two full games in a browser.
- `npm run test:online`: with `npm run dev` running in another window, two browsers play two online games by link.
- `npm run deploy`: builds and publishes to Cloudflare. It needs a Cloudflare API token with the "Edit Cloudflare Workers" permission, given as the `CLOUDFLARE_API_TOKEN` setting. Never save the token in this repository.
- The game page is bundled into the server code (`server/worker.js` imports `dist/index.html`), so one upload publishes both.

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
