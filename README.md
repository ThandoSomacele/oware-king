# Imbewu (working title)

Oware, the African sowing game, as one small web page that runs on phones, tablets and PCs.

- `src/engine.js`: the rules, the computer player and the daily puzzle. No screen code.
- `src/app.js`, `src/style.css`, `src/index.html`: the screens.
- `node build.mjs`: joins everything into `dist/index.html`.
- `node test/engine.test.js`: checks the rules.
- `node test/shot.js <folder>`: plays through the page in a phone-sized browser and saves screenshots.
