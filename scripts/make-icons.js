// Draws the app icon files in assets/ from the game's own pixel icon. Run after "node build.mjs": node scripts/make-icons.js
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const out = path.resolve(__dirname, '../assets');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + path.resolve(__dirname, '../dist/index.html'));
  // [file, canvas size, drawn icon size, square corners]. The icon is 64 pixels, so drawn sizes are whole multiples of 64.
  const jobs = [
    ['icon-192.png', 192, 192, false], ['icon-512.png', 512, 512, false], ['store-icon-512.png', 512, 512, true],
    ['icon-maskable-512.png', 512, 320, true], // phones crop this one to their own shape, so the art sits in the middle
    ['tv-icon-80.png', 80, 64, true], ['tv-icon-130.png', 130, 128, true],
  ];
  for (const [file, size, art, square] of jobs) {
    const data = await page.evaluate(([size, art, square]) => {
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const x = c.getContext('2d');
      x.imageSmoothingEnabled = false;
      if (square) { x.fillStyle = '#14110e'; x.fillRect(0, 0, size, size); }
      x.drawImage(Pixel.icon(), (size - art) / 2, (size - art) / 2, art, art);
      return c.toDataURL('image/png').split(',')[1];
    }, [size, art, square]);
    fs.writeFileSync(path.join(out, file), Buffer.from(data, 'base64'));
    console.log('wrote assets/' + file);
  }
  await browser.close();
})();
