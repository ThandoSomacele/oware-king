// Builds every form of the game from the files in src/. Run: node build.mjs
//   dist/index.html           the web page that the server sends out
//   dist-artifact/index.html  the same page without outer document tags (for the Claude preview link)
//   dist-tv/                  the LG webOS TV app folder (packaged page, older-browser code, icons, appinfo.json)
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { transformSync } from 'esbuild';

// The live server. The TV app is a packaged page, so it must name the server in full.
// Change this one line when the game moves to its own web address, then rebuild.
// (OWARE_SERVER overrides it for local tests of the TV build.)
export const LIVE = process.env.OWARE_SERVER || 'https://owareking.object91.co.za';

const at = (f) => new URL(f, import.meta.url);
const read = (f) => readFileSync(at('./src/' + f), 'utf8');
const assemble = (config) => read('index.html')
  .replace('/*CSS*/', () => read('style.css'))
  .replace('/*CONFIG*/', () => config)
  .replace('/*COMPAT*/', () => read('compat.js'))
  .replace('/*QRCODE*/', () => read('vendor/qrcode.min.js'))
  .replace('/*BRAND*/', () => read('brand.js'))
  .replace('/*PIXEL*/', () => read('pixel.js'))
  .replace('/*ENGINE*/', () => read('engine.js'))
  .replace('/*APP*/', () => read('app.js'));
const wrap = (page, head = '') => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#14110e">${head}<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}</style></head><body>
${page}</body></html>
`;

const page = assemble(read('config.js'));
const webHead = '<meta name="description" content="Oware King. A centuries-old African strategy game, brought to your phone and living room. Play a friend online, the computer, or the daily challenge."><link rel="manifest" href="/manifest.webmanifest"><link rel="icon" href="/icon-192.png"><link rel="apple-touch-icon" href="/icon-192.png"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="Oware King">';
for (const d of ['./dist/', './dist-artifact/', './dist-tv/']) mkdirSync(at(d), { recursive: true });
writeFileSync(at('./dist/index.html'), wrap(page, webHead));
writeFileSync(at('./dist-artifact/index.html'), page);

// TV: name the server, switch on the remote-control layout, and rewrite the code for old TV browser engines (webOS 4 = Chrome 53).
const tvVersion = JSON.parse(readFileSync(at('./platforms/webos/appinfo.json'), 'utf8')).version;
const tvConfig = `const Config = { SERVER: '${LIVE}', TV: true, VERSION: '${tvVersion}' };`;
const tvPage = assemble(tvConfig).replace(/<script>([\s\S]*?)<\/script>/g, (_, code) =>
  `<script>${transformSync(code, { target: 'chrome53', charset: 'utf8' }).code}</script>`);
writeFileSync(at('./dist-tv/index.html'), wrap(tvPage));
copyFileSync(at('./platforms/webos/appinfo.json'), at('./dist-tv/appinfo.json'));
copyFileSync(at('./platforms/webos/keepawake.mp4'), at('./dist-tv/keepawake.mp4')); // a tiny silent video that stops the TV screen saver during a game
for (const [from, to] of [['tv-icon-80.png', 'icon.png'], ['tv-icon-130.png', 'largeIcon.png']]) {
  if (existsSync(at('./assets/' + from))) copyFileSync(at('./assets/' + from), at('./dist-tv/' + to));
}
console.log('built dist/index.html', (page.length / 1024).toFixed(1) + ' KB, and dist-tv/');
