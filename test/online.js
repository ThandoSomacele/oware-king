// Two browsers play a full online game through the local game server.
// Start the server first: npx wrangler dev --port 8787
const { chromium } = require('playwright');
const URL0 = process.argv[2] || 'http://127.0.0.1:8787/';
const fast = async (page) => {
  await page.addInitScript(() => {
    const st = window.setTimeout; window.setTimeout = (f, ms, ...a) => st(f, ms > 900 ? ms : ms / 20, ...a);
    const an = Element.prototype.animate; Element.prototype.animate = function (k, o) { return an.call(this, k, { ...o, duration: o.duration / 20 }); };
    try { sessionStorage.setItem('oware.intro', '1'); } catch {}
  });
};
const board = (page) => page.evaluate(() => ({
  top: +scoreTop.textContent, bottom: +scoreBottom.textContent,
  pits: [...document.querySelectorAll('.count')].map((e) => +e.textContent),
  status: document.querySelector('#status').textContent, result: document.querySelector('#result').hidden ? null : resultTitle.textContent,
}));
(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const mk = async (name) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(name + ': ' + e));
    await fast(page);
    return page;
  };
  const a = await mk('A'), b = await mk('B');
  await a.goto(URL0);
  await a.waitForSelector('#onlineCard:not([hidden])', { timeout: 15000 });
  await a.fill('#nick', 'Ama');
  await a.click('#playOnline');
  await a.waitForSelector('#invite:not([hidden])');
  const link = await a.inputValue('#inviteLink');
  console.log('link:', link);

  await b.goto(link);
  await b.waitForSelector('#onlineCard:not([hidden])');
  if (!/Join/.test(await b.textContent('#playOnline'))) errors.push('B does not see a Join button');
  await b.fill('#nick', 'Kofi');
  await b.click('#playOnline');
  await a.waitForSelector('#invite', { state: 'hidden' });
  if (!/Kofi/.test(await a.textContent('#nameTop'))) errors.push('A does not see Kofi');
  if (!/Ama/.test(await b.textContent('#nameTop'))) errors.push('B does not see Ama');

  // A third player cannot join
  const c = await mk('C');
  await c.goto(link);
  await c.waitForSelector('#onlineCard:not([hidden])');
  await c.fill('#nick', 'Third');
  await c.click('#playOnline');
  await c.waitForSelector('#onlineError:not([hidden])', { timeout: 10000 }).catch(() => errors.push('third player was not refused'));
  await c.context().close();

  // reaction
  await b.click('#reacts button');
  await a.waitForSelector('.react-pop', { timeout: 5000 }).catch(() => errors.push('reaction did not arrive'));

  const playGame = async (label, reloadAt) => {
    let moves = 0;
    for (;;) {
      await Promise.race([
        a.waitForSelector('.pit.can, #result:not([hidden])', { timeout: 30000 }),
        b.waitForSelector('.pit.can, #result:not([hidden])', { timeout: 30000 }),
      ]);
      if ((await board(a)).result && (await board(b)).result) break;
      const mover = (await a.locator('.pit.can').count()) ? a : (await b.locator('.pit.can').count()) ? b : null;
      if (!mover) { await a.waitForTimeout(50); continue; }
      const other = mover === a ? b : a;
      if (await other.locator('.pit.can').count()) errors.push(`${label} move ${moves}: both players can move`);
      if (await mover.locator('.pit.north.can').count()) errors.push(`${label} move ${moves}: playable pit on the top row`);
      const can = mover.locator('.pit.south.can');
      await can.nth(Math.floor(Math.random() * (await can.count()))).click();
      moves++;
      if (moves === reloadAt) { await b.reload(); await b.waitForSelector('#game:not([hidden])', { timeout: 15000 }); }
      // Both pages must settle on the same position (seen from opposite sides) within a few seconds.
      const flip = (p) => [...p.slice(6).reverse(), ...p.slice(0, 6).reverse()];
      let A, B, same = false;
      for (let k = 0; k < 150 && !same; k++) {
        await a.waitForTimeout(40);
        if ((await a.locator('.hand').count()) || (await b.locator('.hand').count())) continue;
        A = await board(a); B = await board(b);
        same = A.top === B.bottom && A.bottom === B.top && JSON.stringify(A.pits) === JSON.stringify(flip(B.pits))
          && A.pits.reduce((x, y) => x + y, 0) + A.top + A.bottom === 48;
      }
      if (!same) errors.push(`${label} move ${moves}: pages disagree ${JSON.stringify({ A, B })}`);
      if (moves > 600) { errors.push('game did not end'); break; }
    }
    const A = await board(a), B = await board(b);
    console.log(label, 'finished in', moves, 'moves. A:', A.result, `${A.bottom}-${A.top}`, '| B:', B.result, `${B.bottom}-${B.top}`);
    return moves;
  };

  await playGame('game 1', 7);
  // rematch: both must agree
  await a.click('#resultMain');
  await b.waitForFunction(() => /wants a rematch/.test(resultText.textContent), null, { timeout: 10000 }).catch(() => errors.push('B was not told about the rematch request'));
  await b.click('#resultMain');
  await a.waitForSelector('#result', { state: 'hidden', timeout: 10000 }).catch(() => errors.push('rematch did not start for A'));
  await b.waitForSelector('#result', { state: 'hidden', timeout: 10000 }).catch(() => errors.push('rematch did not start for B'));
  await a.waitForTimeout(200);
  if (!(await b.locator('.pit.can').count())) errors.push('rematch: B (the other player) should start');
  await playGame('game 2', 0);

  console.log(errors.length ? 'FAILED\n' + [...new Set(errors)].slice(0, 15).join('\n') : 'all online checks passed');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
