// TV home screen: everything on one screen with no scrolling, two columns, the name box does not open the
// keyboard until OK, and "How to play" opens as a panel that Back closes.
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

      // Everything on one screen: every control fully visible, and the page cannot scroll.
      await page.evaluate(() => window.scrollTo(0, 0));
      const fitCheck = await page.evaluate(() => {
        const out = [];
        for (const el of document.querySelectorAll('#home button, #home input, #home summary, .top button')) {
          if (el.offsetParent === null) continue;
          const target = el.type === 'radio' ? document.querySelector(`label[for="${el.id}"]`) : el;
          const r = target.getBoundingClientRect();
          if (r.width && (r.top < 0 || r.bottom > innerHeight || r.left < 0 || r.right > innerWidth)) out.push(`${el.id || el.textContent.trim()} at ${Math.round(r.top)}-${Math.round(r.bottom)}`);
        }
        window.scrollTo(0, 500);
        const scrolled = window.scrollY;
        window.scrollTo(0, 0);
        return { off: out, scrolled };
      });
      if (fitCheck.off.length) errors.push(`${tag}: not on screen: ${fitCheck.off.join(', ')}`);
      if (fitCheck.scrolled > 2) errors.push(`${tag}: the home screen scrolls (${fitCheck.scrolled}px)`);
      if (process.argv[2]) await page.screenshot({ path: `${process.argv[2]}/tv-home-${old ? 'old' : 'new'}-${w}.png` });

      // How to play: OK opens the panel, Back closes it and returns to "How to play".
      await page.evaluate(() => document.querySelector('.rules summary').focus());
      await page.keyboard.press('Enter');
      await page.waitForTimeout(200);
      if (await page.locator('#rulesPanel').isHidden()) errors.push(`${tag}: OK did not open the rules panel`);
      else {
        const panel = await page.evaluate(() => { const r = document.querySelector('#rulesPanel .panel').getBoundingClientRect(); return { top: r.top, bottom: r.bottom, focus: document.activeElement.id }; });
        if (panel.top < 0 || panel.bottom > h) errors.push(`${tag}: rules panel does not fit the screen`);
        if (panel.focus !== 'rulesClose') errors.push(`${tag}: Close is not selected in the rules panel`);
        if (process.argv[2] && w === 1920 && !old) await page.screenshot({ path: `${process.argv[2]}/tv-rules.png` });
        await page.keyboard.press('ArrowDown'); // arrows stay inside the panel
        if ((await page.evaluate(() => document.activeElement.id)) !== 'rulesClose') errors.push(`${tag}: arrows left the rules panel`);
        await page.evaluate(() => { const e = new Event('keydown', { bubbles: true }); Object.defineProperty(e, 'keyCode', { value: 461 }); document.dispatchEvent(e); });
        await page.waitForTimeout(100);
        if (!(await page.locator('#rulesPanel').isHidden())) errors.push(`${tag}: Back did not close the rules panel`);
        if ((await page.evaluate(() => document.activeElement.tagName)) !== 'SUMMARY') errors.push(`${tag}: selection did not return to "How to play"`);
      }
      console.log(`${tag}: online card ${onlineShown ? 'shown' : 'hidden (no server)'}, controls visited: ${[...seen].join(', ')}`);
      await page.context().close();
    }
  }
  console.log(errors.length ? 'FAILED\n' + errors.join('\n') : 'all TV home checks passed');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
