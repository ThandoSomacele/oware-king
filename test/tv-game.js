// Every TV game screen fits one screen: game against the computer, daily challenge, online (waiting and playing),
// the result panel and the "Leave this game?" panel. Start the server first (npm run dev), then:
//   OWARE_SERVER=http://127.0.0.1:8787 node build.mjs && node test/tv-game.js [folder for screenshots]
const { chromium } = require('playwright');
const path = require('node:path');
const TV = 'file://' + path.resolve(__dirname, '../dist-tv/index.html');
const fast = () => {
  try { sessionStorage.setItem('oware.intro', '1'); } catch {}
  const st = window.setTimeout; window.setTimeout = (f, ms, ...a) => st(f, ms > 900 ? ms : ms / 20, ...a);
  const an = Element.prototype.animate; Element.prototype.animate = function (k, o) { return an.call(this, k, { ...o, duration: o.duration / 20 }); };
};
const back = (page) => page.evaluate(() => { const e = new Event('keydown', { bubbles: true }); Object.defineProperty(e, 'keyCode', { value: 461 }); document.dispatchEvent(e); });

(async () => {
  const browser = await chromium.launch();
  const errors = [], shots = process.argv[2];
  for (const old of [false, true]) {
    for (const [w, h] of [[1920, 1080], [1280, 720]]) {
      const tag = `${old ? 'old' : 'new'} ${w}x${h}`;
      const ctx = await browser.newContext({ viewport: { width: w, height: h } });
      const page = await ctx.newPage();
      page.on('pageerror', (e) => errors.push(`${tag}: ${e}`));
      await page.addInitScript(fast);
      if (old) await page.addInitScript(() => { const o = CSS.supports.bind(CSS); CSS.supports = (a, b) => (a === 'aspect-ratio' ? false : o(a, b)); });

      // Checks one screen: all controls on screen, no scrolling, something selected, board size.
      const check = async (name) => {
        await page.waitForTimeout(150);
        const r = await page.evaluate(() => {
          const off = [];
          for (const el of document.querySelectorAll('#game button, #game input, #result button, #leave button, .top button')) {
            if (el.offsetParent === null || el.hidden) continue;
            const b = el.getBoundingClientRect();
            if (b.width && (b.top < 0 || b.bottom > innerHeight || b.left < 0 || b.right > innerWidth)) off.push(`${el.id || el.className} ${Math.round(b.top)}-${Math.round(b.bottom)}`);
          }
          window.scrollTo(0, 400);
          const scrolled = window.scrollY;
          window.scrollTo(0, 0);
          const f = document.activeElement, board = document.querySelector('#board').getBoundingClientRect();
          return { off, scrolled, focus: f && f !== document.body ? (f.id || f.className) : null, board: Math.round(board.width), boardBottom: Math.round(board.bottom) };
        });
        if (r.off.length) errors.push(`${tag} ${name}: not on screen: ${r.off.join(', ')}`);
        if (r.scrolled > 2) errors.push(`${tag} ${name}: page scrolls`);
        if (!r.focus) errors.push(`${tag} ${name}: nothing selected`);
        if (r.boardBottom > h) errors.push(`${tag} ${name}: board below the screen edge`);
        if (shots && w === 1920 && !old) await page.screenshot({ path: `${shots}/tvg-${name}.png` });
        return r;
      };

      await page.goto(TV);
      await page.waitForSelector('#onlineCard:not([hidden])', { timeout: 15000 });

      // 1. Game against the computer
      await page.evaluate(() => document.querySelector('#playAi').click());
      await page.waitForSelector('.pit.can');
      const ai = await check('computer');
      if (ai.board < w * 0.45) errors.push(`${tag} computer: board too small (${ai.board}px)`);
      if (!/pit/.test(ai.focus)) errors.push(`${tag} computer: a pit is not selected (${ai.focus})`);
      await back(page);
      await page.waitForSelector('#home:not([hidden])');

      // 2. Daily challenge
      await page.evaluate(() => document.querySelector('#playDaily').click());
      await page.waitForSelector('#game:not([hidden])');
      const daily = await check('daily');
      if (Math.abs(daily.board - ai.board) > 2) errors.push(`${tag} daily: board size differs (${daily.board} vs ${ai.board})`);
      await page.evaluate(() => document.querySelector('.pit.can') && document.querySelector('.pit.can').click());
      await page.waitForSelector('#result:not([hidden])', { timeout: 30000 });
      const dr = await check('daily-result');
      if (dr.focus !== 'resultMain') errors.push(`${tag} daily result: main button not selected (${dr.focus})`);
      await back(page); // Back on a result goes home
      await page.waitForSelector('#home:not([hidden])', { timeout: 5000 }).catch(() => errors.push(`${tag} daily result: Back did not go home`));

      // 3. Two players to the end: the result panel
      await page.evaluate(() => document.querySelector('#playLocal').click());
      for (let n = 0, t0 = Date.now(); Date.now() - t0 < 150000; n++) {
        if (!(await page.locator('#result').isHidden())) break;
        const can = page.locator('.pit.can');
        if (await can.count()) await can.nth(n % (await can.count())).click({ timeout: 5000 }).catch(() => {});
        else await page.waitForTimeout(30);
      }
      await page.waitForSelector('#result:not([hidden])', { timeout: 30000 });
      const res = await check('result');
      if (res.focus !== 'resultMain') errors.push(`${tag} result: main button not selected (${res.focus})`);
      await page.keyboard.press('ArrowDown'); // arrows stay in the panel
      const inPanel = await page.evaluate(() => !!document.activeElement.closest('#result'));
      if (!inPanel) errors.push(`${tag} result: arrows left the panel`);
      await page.evaluate(() => document.querySelector('#resultHome').click());
      await page.waitForSelector('#home:not([hidden])');

      // 4. Online: waiting for a friend (invite card beside the board), then playing
      await page.evaluate(() => { const n = document.querySelector('#nick'); n.readOnly = false; n.value = 'Thando'; n.blur(); document.querySelector('#playOnline').click(); });
      await page.waitForSelector('#invite:not([hidden])', { timeout: 15000 });
      const wait = await check('online-waiting');
      const lay = await page.evaluate(() => {
        const b = document.querySelector('#board').getBoundingClientRect(), q = document.querySelector('#inviteQr').getBoundingClientRect();
        return { side: q.left > b.right, qr: Math.round(q.width), link: document.querySelector('#inviteLink').value };
      });
      if (!lay.side) errors.push(`${tag} waiting: invite card is not beside the board`);
      if (lay.qr < h * 0.22) errors.push(`${tag} waiting: QR code too small to scan (${lay.qr}px)`);
      if (wait.board < w * 0.3) errors.push(`${tag} waiting: board too small (${wait.board}px)`);
      const phone = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
      await phone.addInitScript(fast);
      await phone.addInitScript(() => { try { localStorage.setItem('oware.nick', '"Ama"'); } catch {} });
      await phone.goto(lay.link);
      await page.waitForSelector('#invite', { state: 'hidden', timeout: 15000 });
      await page.waitForTimeout(300);
      const play = await check('online-playing');
      if (Math.abs(play.board - ai.board) > 2) errors.push(`${tag} online: board size differs from the computer game (${play.board} vs ${ai.board})`);

      // 5. Leave this game? (Back during an online game)
      await back(page);
      await page.waitForSelector('#leave:not([hidden])', { timeout: 5000 }).catch(() => errors.push(`${tag}: Back did not ask before leaving`));
      const lv = await check('leave');
      if (lv.focus !== 'leaveNo') errors.push(`${tag} leave: "Keep playing" not selected (${lv.focus})`);
      await back(page); // Back closes the question
      await page.waitForTimeout(150);
      if (!(await page.locator('#leave').isHidden())) errors.push(`${tag} leave: Back did not close the question`);
      if (await page.locator('#game').isHidden()) errors.push(`${tag} leave: Back left the game`);
      await phone.context().close();
      await ctx.close();
      console.log(`${tag}: board ${ai.board}px (waiting ${wait.board}px, QR ${lay.qr}px)`);
    }
  }
  console.log(errors.length ? 'FAILED\n' + [...new Set(errors)].join('\n') : 'all TV game screen checks passed');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
