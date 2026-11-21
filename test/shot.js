// Plays through the built page in a phone-sized browser and saves screenshots.
const { chromium } = require('playwright');
const path = require('node:path');
const out = process.argv[2];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts|ERR_/.test(m.text())) errors.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../dist/index.html'));
  await page.screenshot({ path: out + '/home.png', fullPage: true });

  // Game against the computer: play 3 moves
  await page.click('label[for="lvHard"]');
  await page.click('#playAi');
  for (let k = 0; k < 3; k++) {
    await page.waitForSelector('.pit.south.can', { timeout: 20000 });
    await page.locator('.pit.south.can').first().click();
    await page.waitForTimeout(430);
    if (k === 0) await page.screenshot({ path: out + '/flight.png', clip: { x: 0, y: 60, width: 390, height: 330 } });
  }
  await page.waitForSelector('.pit.south.can', { timeout: 20000 });
  await page.screenshot({ path: out + '/game.png', fullPage: true });
  const sum = await page.evaluate(() => [...document.querySelectorAll('.count')].reduce((a, e) => a + +e.textContent, 0)
    + +document.querySelector('#scoreTop').textContent + +document.querySelector('#scoreBottom').textContent);

  // Daily challenge
  await page.click('#back');
  await page.click('#playDaily');
  await page.locator('.pit.south.can').first().click();
  await page.waitForSelector('#result:not([hidden])', { timeout: 20000 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.screenshot({ path: out + '/daily-dark.png', fullPage: true });
  await page.click('#resultHome');
  const streakBtn = await page.textContent('#playDaily');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  console.log(JSON.stringify({ seedsOnScreen: sum, streakBtn, overflow, errors }));
  await browser.close();
})();
