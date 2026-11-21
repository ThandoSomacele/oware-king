// Full-game checks in the browser: seeds always total 48 at rest, no hand left behind, daily try cannot be repeated.
const { chromium } = require('playwright');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch();
  const url = 'file://' + path.resolve(__dirname, '../dist/index.html');
  const errors = [];
  for (const reducedMotion of ['no-preference', 'reduce']) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(url);
    // speed up timers so a full game is quick, keeping order
    await page.evaluate(() => { const st = window.setTimeout; window.setTimeout = (f, ms) => st(f, ms / 20); });
    await page.addStyleTag({ content: '*{animation-duration:1ms!important}' });
    await page.evaluate(() => { const a = Element.prototype.animate; Element.prototype.animate = function (k, o) { return a.call(this, k, { ...o, duration: o.duration / 20 }); }; });
    await page.click('#playLocal');
    let moves = 0;
    while (await page.locator('#result').isHidden()) {
      await page.waitForSelector('.pit.can, #result:not([hidden])', { timeout: 30000 });
      if (!(await page.locator('#result').isHidden())) break;
      const check = await page.evaluate(() => ({
        sum: [...document.querySelectorAll('.count')].reduce((a, e) => a + +e.textContent, 0) + +scoreTop.textContent + +scoreBottom.textContent,
        hands: document.querySelectorAll('.hand').length,
      }));
      if (check.sum !== 48 || check.hands) errors.push(`move ${moves}: ${JSON.stringify(check)}`);
      const can = page.locator('.pit.can');
      await can.nth(Math.floor(Math.random() * (await can.count()))).click();
      moves++;
    }
    const end = await page.evaluate(() => ({ a: +scoreTop.textContent, b: +scoreBottom.textContent, board: [...document.querySelectorAll('.count')].reduce((x, e) => x + +e.textContent, 0), hands: document.querySelectorAll('.hand').length, title: resultTitle.textContent }));
    if (end.a + end.b + end.board !== 48 || end.hands) errors.push('end: ' + JSON.stringify(end));
    console.log(reducedMotion, 'two-player game finished in', moves, 'moves:', JSON.stringify(end));

    // daily: leave mid-move, the try must already be saved
    await page.click('#resultHome');
    await page.click('#playDaily');
    await page.locator('.pit.south.can').first().click();
    await page.click('#back');
    const label = await page.textContent('#playDaily');
    if (!/See today/.test(label)) errors.push('daily retry possible: ' + label);
    await page.click('#playDaily');
    await page.waitForSelector('#result:not([hidden])');
    if (await page.locator('.pit.can').count()) errors.push('daily pits still tappable');
    await ctx.close();
  }
  console.log(errors.length ? 'FAILED\n' + errors.join('\n') : 'all browser checks passed');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
