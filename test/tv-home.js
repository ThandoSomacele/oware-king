// TV home screen: two columns, the name box does not open the keyboard until OK,
// and "How to play" can be opened and read to the end with the down button.
// Run: node build.mjs && node test/tv-home.js [folder for screenshots]
const { chromium } = require('playwright');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch();
  const errors = [];
  for (const old of [false, true]) {
    for (const [w, h] of [[1920, 1080], [1280, 720]]) {
      const tag = `${old ? 'old' : 'new'} ${w}x${h}`;
      const page = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage();
      page.on('pageerror', (e) => errors.push(tag + ': ' + e));
      if (old) await page.addInitScript(() => { const o = CSS.supports.bind(CSS); CSS.supports = (a, b) => (a === 'aspect-ratio' ? false : o(a, b)); });
      await page.goto('file://' + path.resolve(__dirname, '../dist-tv/index.html'));
      await page.waitForTimeout(600);
      await page.keyboard.press('Enter'); // leave the title screen
      await page.waitForSelector('#intro', { state: 'hidden' });
      await page.waitForTimeout(500);
      const focus = () => page.evaluate(() => { const e = document.activeElement; return { id: e.id || e.tagName, readOnly: !!e.readOnly }; });

      // Two columns: the online card sits to the right of the daily challenge.
      const cols = await page.evaluate(() => {
        const a = document.querySelector('.daily').getBoundingClientRect(), b = document.querySelector('#onlineCard').getBoundingClientRect();
        return { dailyRight: a.right, onlineLeft: b.left, onlineTop: b.top, dailyTop: a.top, overflow: document.documentElement.scrollWidth > innerWidth };
      });
      // (The online card is shown only when the game server answers. From a file:// test without a server it may be hidden.)
      const onlineShown = await page.evaluate(() => !document.querySelector('#onlineCard').hidden);
      if (onlineShown && !(cols.onlineLeft > cols.dailyRight)) errors.push(`${tag}: "Play a friend online" is not beside the other options ${JSON.stringify(cols)}`);
      if (cols.overflow) errors.push(`${tag}: page is wider than the screen`);
      if (process.argv[2] && w === 1920) await page.screenshot({ path: `${process.argv[2]}/tv-home-${old ? 'old' : 'new'}.png` });

      // Walk the whole home screen with the arrow keys. No step may land on an editable text box.
      const seen = new Set();
      for (const k of ['ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'ArrowUp']) {
        await page.keyboard.press(k);
        const f = await focus();
        seen.add(f.id);
        if ((f.id === 'nick' || f.id === 'joinNick') && !f.readOnly) errors.push(`${tag}: the name box opened for typing just by moving onto it`);
      }
      if (onlineShown) {
        // OK on the name box opens it for typing.
        await page.evaluate(() => document.querySelector('#nick').focus());
        await page.keyboard.press('Enter');
        const f = await focus();
        if (f.id !== 'nick' || f.readOnly) errors.push(`${tag}: OK on the name box did not open it for typing`);
        await page.keyboard.type('Thandi');
        if ((await page.inputValue('#nick')) !== 'Thandi') errors.push(`${tag}: could not type a name`);
        await page.keyboard.press('ArrowDown');
        await page.evaluate(() => document.activeElement.blur());
        if (!(await page.evaluate(() => document.querySelector('#nick').readOnly))) errors.push(`${tag}: name box stays open after leaving it`);
      }

      // How to play: open it with OK, then the down button must bring its last line into view.
      await page.evaluate(() => { window.scrollTo(0, 0); document.querySelector('.rules summary').focus(); });
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);
      if (!(await page.evaluate(() => document.querySelector('.rules').open))) errors.push(`${tag}: OK did not open "How to play"`);
      let visible = false;
      for (let n = 0; n < 12 && !visible; n++) {
        visible = await page.evaluate(() => { const li = [...document.querySelectorAll('.rules li')].pop().getBoundingClientRect(); return li.bottom <= innerHeight && li.top >= 0; });
        if (!visible) { await page.keyboard.press('ArrowDown'); await page.waitForTimeout(80); }
      }
      if (!visible) errors.push(`${tag}: the last rule cannot be reached with the down button`);
      if (process.argv[2] && w === 1920 && !old) await page.screenshot({ path: `${process.argv[2]}/tv-rules.png` });
      // Up brings the page back to the top.
      for (let n = 0; n < 12; n++) await page.keyboard.press('ArrowUp');
      if ((await page.evaluate(() => window.scrollY)) > 40) errors.push(`${tag}: up button does not return to the top`);
      console.log(`${tag}: online card ${onlineShown ? 'shown' : 'hidden (no server)'}, controls visited: ${[...seen].join(', ')}`);
      await page.context().close();
    }
  }
  console.log(errors.length ? 'FAILED\n' + errors.join('\n') : 'all TV home checks passed');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
