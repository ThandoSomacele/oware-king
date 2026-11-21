# Oware King

Oware, the West African sowing game, as one small web page that runs on phones, tablets and PCs.

- `src/engine.js`: the rules, the computer player and the daily puzzle. No screen code. The game server uses the same file.
- `src/pixel.js`: the pixel-art title screen and logo, drawn in code.
- `src/brand.js`: the app icon and seed bands, drawn in code.
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
- `npm run deploy`: builds and publishes to Cloudflare. Needs a Cloudflare account.

## How online play works

1. A player taps "Create game link". The server gives a six-character code, shown as a link ending in `#g-code`.
2. The friend opens the link and types a name. Both pages connect to the same room.
3. Each tap is sent to the server. The server checks that it is that player's turn and that the move is legal, then adds it to the move list.
4. Both pages get the move list and animate the new move.
5. There are no accounts. A random ID saved on the device lets a player rejoin their seat after a reload.
6. A room that nobody uses for one day is deleted.

Copyright (c) 2026 Thando Somacele. All rights reserved. See `LICENSE`.
