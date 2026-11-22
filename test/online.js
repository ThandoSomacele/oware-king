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

  // An invalid link is refused with a clear message
  const bad = await mk('bad');
  await bad.goto(URL0 + '#g-zzzzzz');
  await bad.waitForSelector('#notice:not([hidden])', { timeout: 10000 }).catch(() => errors.push('invalid link was not refused'));
  if (!(await bad.locator('#game').isHidden())) errors.push('invalid link opened a game');
  await bad.context().close();

  // The friend opens the link, sees who invited them, types a name and joins
  await b.goto(link);
  await b.waitForSelector('#join:not([hidden])', { timeout: 10000 });
  if (!/Ama invited you/.test(await b.textContent('#joinTitle'))) errors.push('join screen does not name the host');
  await b.fill('#joinNick', 'Kofi');
  await b.press('#joinNick', 'Enter'); // Enter joins, no need to find the button
  await a.waitForSelector('#invite', { state: 'hidden' });
  if (!/Kofi/.test(await a.textContent('#nameTop'))) errors.push('A does not see Kofi');
  if (!/Ama/.test(await b.textContent('#nameTop'))) errors.push('B does not see Ama');

  // A third player cannot join
  const c = await mk('C');
  await c.goto(link);
  await c.waitForSelector('#notice:not([hidden])', { timeout: 10000 }).catch(() => errors.push('third player was not refused'));
  if (!/two players/.test(await c.textContent('#notice'))) errors.push('third player was not told the game is full');
  if (!(await c.locator('#join').isHidden())) errors.push('third player was asked for a name before being refused');
  // A good link pasted into this already open page opens the join screen
  const other = await (await c.request.post(URL0 + 'api/room')).json();
  await c.evaluate((code) => { location.hash = 'g-' + code; }, other.code);
  await c.waitForSelector('#join:not([hidden])', { timeout: 10000 }).catch(() => errors.push('a link pasted into an open page did nothing'));
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

  // Leave and return: Home asks first, and the home screen offers the way back
  await a.click('#back');
  await a.waitForSelector('#leave:not([hidden])').catch(() => errors.push('Home did not ask before leaving'));
  await a.click('#leaveNo');
  if (await a.locator('#game').isHidden()) errors.push('"Keep playing" left the game');
  await a.click('#back');
  await a.click('#leaveYes');
  await a.waitForSelector('#resume:not([hidden])').catch(() => errors.push('no "Return to your game" button'));
  await b.waitForFunction(() => /offline/.test(document.querySelector('#status').textContent), null, { timeout: 10000 }).catch(() => errors.push('B was not told that A is offline'));
  await a.click('#resume');
  await a.waitForFunction(() => /Kofi/.test(nameTop.textContent), null, { timeout: 10000 }).catch(() => errors.push('A could not return to the game'));

  // The same player in a second tab takes over; the first tab says so and can take the game back
  const a2 = await a.context().newPage();
  await a2.goto(link);
  await a2.waitForFunction(() => /Kofi/.test(nameTop.textContent), null, { timeout: 15000 }).catch(() => errors.push('second tab did not join'));
  await a.waitForSelector('#takeover:not([hidden])', { timeout: 10000 }).catch(() => errors.push('first tab was not told about the second tab'));
  await a2.close();
  await a.click('#takeover');
  await a.waitForSelector('#takeover', { state: 'hidden', timeout: 10000 }).catch(() => errors.push('"Play here" did not take the game back'));

  // Lost connection: the page says so, recovers, and the player can still move
  await a.context().setOffline(true);
  await a.evaluate(() => window.dispatchEvent(new Event('offline')));
  await a.waitForFunction(() => /Reconnecting/.test(document.querySelector('#status').textContent), null, { timeout: 10000 }).catch(() => errors.push('A was not told the connection was lost'));
  await a.context().setOffline(false);
  await a.evaluate(() => window.dispatchEvent(new Event('online')));
  await a.waitForFunction(() => !/Reconnecting|Connecting/.test(document.querySelector('#status').textContent), null, { timeout: 20000 }).catch(() => errors.push('A did not reconnect'));

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

  // After the game, one player leaves: the other is told and is not left waiting on a dead button
  await b.click('#resultHome');
  await a.waitForFunction(() => /not connected/.test(resultText.textContent) && /Back to home/.test(resultMain.textContent), null, { timeout: 10000 }).catch(() => errors.push('A was not told that B left after the game'));
  if (!(await b.locator('#resume').isHidden())) errors.push('a finished game is still offered as "Return to your game"');

  console.log(errors.length ? 'FAILED\n' + [...new Set(errors)].slice(0, 15).join('\n') : 'all online checks passed');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
