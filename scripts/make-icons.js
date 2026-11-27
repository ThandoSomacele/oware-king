// Draws the app icon files in assets/ from the game's own pixel icon. Run after "node build.mjs": node scripts/make-icons.js
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const out = path.resolve(__dirname, '../assets');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + path.resolve(__dirname, '../dist/index.html'));
  // [file, width, height, drawn icon size, dark background]. The icon is 64 pixels. Drawn sizes are whole multiples of 64,
  // or exactly 32 (half size, averaged), so the pixel art stays sharp.
  const jobs = [
    ['icon-192.png', 192, 192, 192, false], ['icon-512.png', 512, 512, 512, false], ['store-icon-512.png', 512, 512, 512, true],
    ['icon-maskable-512.png', 512, 512, 320, true], // phones crop this one to their own shape, so the art sits in the middle
    ['tv-icon-80.png', 80, 80, 64, true], ['tv-icon-130.png', 130, 130, 128, true],
    // Windows (Microsoft Store). Names as PWABuilder and Windows use them.
    ['win/Square44x44Logo.png', 44, 44, 32, true], ['win/StoreLogo.png', 50, 50, 32, true], ['win/SmallTile.png', 71, 71, 64, true],
    ['win/Square150x150Logo.png', 150, 150, 128, true], ['win/Square310x310Logo.png', 310, 310, 256, true],
    ['win/Wide310x150Logo.png', 310, 150, 128, true], ['win/SplashScreen.png', 620, 300, 256, true],
    ['icon-256.png', 256, 256, 256, false],
  ];
  fs.mkdirSync(path.join(out, 'win'), { recursive: true });
  for (const [file, w, h, art, dark] of jobs) {
    const data = await page.evaluate(([w, h, art, dark]) => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const x = c.getContext('2d');
      x.imageSmoothingEnabled = art < 64; // a half-size icon is averaged; every other size keeps hard pixels
      if (dark) { x.fillStyle = '#14110e'; x.fillRect(0, 0, w, h); }
      x.drawImage(Pixel.icon(), Math.floor((w - art) / 2), Math.floor((h - art) / 2), art, art);
      return c.toDataURL('image/png').split(',')[1];
    }, [w, h, art, dark]);
    fs.writeFileSync(path.join(out, file), Buffer.from(data, 'base64'));
    console.log('wrote assets/' + file);
  }
  await browser.close();
})();
