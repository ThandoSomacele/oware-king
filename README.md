# Oware King

Oware, the West African sowing game, as one small web page that runs on phones, tablets and PCs.

- `src/engine.js`: the rules, the computer player and the daily puzzle. No screen code.
- `src/brand.js`: the logo, app icon, woven patterns and pixel map of Africa, all drawn in code.
- `src/app.js`, `src/style.css`, `src/index.html`: the screens, animation and sounds.
- `node build.mjs`: joins everything into `dist/index.html`.
- `node test/engine.test.js`: checks the rules.
- `node test/play.js`: plays two full games in a browser and checks the daily one-try rule.
- `node test/shot.js <folder>`: saves screenshots of each screen.
- `BRAND.md`: how to use the name, logo, colours and patterns.

Copyright (c) 2026 Thando Somacele. All rights reserved. See `LICENSE`.
