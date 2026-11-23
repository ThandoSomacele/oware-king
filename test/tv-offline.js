// The TV app with no internet at all: it must open, and every mode except online play must work.
// Run: node build.mjs && node test/tv-offline.js
const { chromium } = require('playwright');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, offline: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.addInitScript(() => {
    const st = window.setTimeout; window.setTimeout = (f, ms, ...a) => st(f, ms > 900 ? ms : ms / 20, ...a);
    const an = Element.prototype.animate; Element.prototype.animate = function (k, o) { return an.call(this, k, { ...o, duration: o.duration / 20 }); };
  });
  const t0 = Date.now();
  await page.goto('file://' + path.resolve(__dirname, '../dist-tv/index.html'));
  await page.waitForSelector('#intro:not([hidden])', { timeout: 5000 }).catch(() => errors.push('title screen did not show offline'));
  const shownMs = Date.now() - t0;
  await page.waitForTimeout(800);
  await page.keyboard.press('Enter');
  await page.waitForSelector('#intro', { state: 'hidden' });
  if (!(await page.locator('#onlineCard').isHidden())) errors.push('online card shown with no internet');
  for (const id of ['#playAi', '#playLocal', '#playDaily']) {
    await page.evaluate((b) => document.querySelector(b).click(), id);
    await page.waitForSelector('.pit.can', { timeout: 10000 }).catch(() => errors.push(`${id}: no playable pit offline`));
    await page.locator('.pit.can').first().click();
    await page.waitForTimeout(800);
    await page.evaluate(() => { const r = document.querySelector('#resultHome'); if (r && r.offsetParent) r.click(); else document.querySelector('#back').click(); });
    await page.waitForSelector('#home:not([hidden])', { timeout: 5000 }).catch(() => errors.push(`${id}: could not return home`));
  }
  console.log(`title shown after ${shownMs} ms offline`);
  console.log(errors.length ? 'FAILED\n' + errors.join('\n') : 'all TV offline checks passed');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
