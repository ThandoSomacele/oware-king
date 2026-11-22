// Plays a two-player game in the TV build, in normal and old-browser layout, and checks that the board,
// pits and seeds never change size as seeds move. Run: node build.mjs && node test/tv-size.js
const { chromium } = require('playwright');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch();
  const errors = [];
  for (const old of [false, true]) {
    for (const [w, h] of [[1920, 1080], [1280, 720]]) {
      const page = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage();
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.addInitScript(() => { try { sessionStorage.setItem('oware.intro', '1'); } catch {} });
      if (old) await page.addInitScript(() => { const o = CSS.supports.bind(CSS); CSS.supports = (a, b) => (a === 'aspect-ratio' ? false : o(a, b)); });
      await page.addInitScript(() => {
        const st = window.setTimeout; window.setTimeout = (f, ms, ...a) => st(f, ms > 900 ? ms : ms / 20, ...a);
        const an = Element.prototype.animate; Element.prototype.animate = function (k, o) { return an.call(this, k, { ...o, duration: o.duration / 20 }); };
      });
      await page.goto('file://' + path.resolve(__dirname, '../dist-tv/index.html'));
      await page.evaluate(() => document.querySelector('#playLocal').click());
      const sizes = () => page.evaluate(() => {
        const r = (e) => `${e.offsetWidth}x${e.offsetHeight}`; // layout size
        const seen = (e) => { const b = e.getBoundingClientRect(); return `${Math.round(b.width)}x${Math.round(b.height)}`; }; // size on screen, with any animation
        const pits = [...document.querySelectorAll('.pit')], bowls = pits.map((p) => p.querySelector('.bowl'));
        return { board: r(document.querySelector('#board')), pits: [...new Set(pits.map(r))], bowls: [...new Set(bowls.map(r))], shown: [...new Set(bowls.map(seen))], most: Math.max(...[...document.querySelectorAll('.count')].map((c) => +c.textContent)) };
      });
      const first = await sizes();
      let most = 0, moves = 0;
      for (; moves < 60; moves++) {
        await page.waitForSelector('.pit.can, #result:not([hidden])', { timeout: 30000 });
        if (!(await page.locator('#result').isHidden())) break;
        const can = page.locator('.pit.can');
        await can.nth((moves * 3) % (await can.count())).click();
        // Look at the pits in the middle of the sowing, while seeds are landing, and again at rest.
        await page.waitForTimeout(20);
        let now = await sizes();
        if (now.shown.join() === first.shown.join()) { await page.waitForFunction(() => !document.querySelector('.hand')); now = await sizes(); }
        most = Math.max(most, now.most);
        if (now.board !== first.board || now.pits.join() !== first.pits.join() || now.bowls.join() !== first.bowls.join() || now.shown.join() !== first.shown.join()) {
          errors.push(`${old ? 'old' : 'new'} ${w}x${h} move ${moves}: size changed ${JSON.stringify(first)} -> ${JSON.stringify(now)}`);
          break;
        }
      }
      if (first.pits.length !== 1 || first.bowls.length !== 1) errors.push(`${w}x${h}: pits are not all the same size ${JSON.stringify(first)}`);
      console.log(`${old ? 'old' : 'new'} ${w}x${h}: board ${first.board}, pit ${first.pits}, bowl ${first.bowls}, ${moves} moves, up to ${most} seeds in one pit`);
      await page.context().close();
    }
  }
  console.log(errors.length ? 'FAILED\n' + errors.join('\n') : 'all TV size checks passed');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
