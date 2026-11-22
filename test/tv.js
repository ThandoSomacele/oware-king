// The TV app (a packaged page, remote control only) hosts an online game and a phone joins from the link in its QR code.
// Start the server first (npm run dev), then: OWARE_SERVER=http://127.0.0.1:8787 node build.mjs && node test/tv.js
const { chromium } = require('playwright');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const tvCtx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const tv = await tvCtx.newPage();
  tv.on('pageerror', (e) => errors.push('TV: ' + e));
  await tv.goto('file://' + path.resolve(__dirname, '../dist-tv/index.html'));
  const focus = () => tv.evaluate(() => { const e = document.activeElement; return e.id || e.className || e.tagName; });
  const pressUntil = async (key, want, max = 12) => { for (let k = 0; k < max; k++) { if (want(await focus())) return true; await tv.keyboard.press(key); } return want(await focus()); };

  // Title screen: OK starts. Focus lands on a control without any pointer.
  await tv.waitForTimeout(1200);
  await tv.keyboard.press('Enter');
  await tv.waitForSelector('#intro', { state: 'hidden' });
  await tv.waitForSelector('#onlineCard:not([hidden])', { timeout: 15000 }).catch(() => errors.push('TV: online card did not appear (cannot reach the server from a packaged page)'));
  await tv.waitForTimeout(300);
  if (!(await tv.evaluate(() => document.documentElement.classList.contains('tv')))) errors.push('TV: remote-control mode is off');

  // Use only arrow keys and OK to create a game.
  await tv.keyboard.press('ArrowDown');
  if (!(await pressUntil('ArrowUp', (f) => f === 'sound' || f === 'playOnline', 12))) errors.push('TV: cannot move up with the remote');
  await tv.evaluate(() => window.scrollTo(0, 0));
  if (!(await pressUntil('ArrowDown', (f) => f === 'playOnline', 12))) errors.push('TV: cannot reach "Create game link" with the remote, focus is on ' + await focus());
  await tv.keyboard.press('Enter');
  await tv.waitForSelector('#invite:not([hidden])', { timeout: 15000 }).catch(() => errors.push('TV: no invite panel'));
  const link = await tv.inputValue('#inviteLink');
  const qr = await tv.evaluate(() => { const c = document.querySelector('#inviteQr'); return { hidden: c.hidden, size: c.width, shown: c.getBoundingClientRect().width }; });
  if (qr.hidden || qr.size < 25 || qr.shown < 150) errors.push('TV: QR code missing or too small ' + JSON.stringify(qr));
  if (!/^https?:\/\/[^#]+\/#g-[a-z2-9]{6}$/.test(link)) errors.push('TV: bad invite link ' + link);
  await tv.screenshot({ path: process.argv[2] ? process.argv[2] + '/tv-invite.png' : '/dev/null' }).catch(() => {});

  // A phone opens the link from the QR code and joins.
  const phone = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  phone.on('pageerror', (e) => errors.push('phone: ' + e));
  await phone.addInitScript(() => { try { sessionStorage.setItem('oware.intro', '1'); } catch {} });
  await phone.goto(link);
  await phone.waitForSelector('#join:not([hidden])', { timeout: 15000 });
  await phone.fill('#joinNick', 'Kofi');
  await phone.press('#joinNick', 'Enter');
  await tv.waitForFunction(() => /Kofi/.test(nameTop.textContent), null, { timeout: 15000 }).catch(() => errors.push('TV: did not see the phone join'));

  // TV plays with the remote; the phone answers by touch. Six moves each way.
  for (let n = 0; n < 6; n++) {
    await tv.waitForSelector('.pit.south.can', { timeout: 30000 });
    // When it is the TV's turn, focus should already be on a playable pit. Move one pit sideways to prove the arrows work.
    if (!/pit south.*\bcan\b/.test(await focus())) { errors.push(`TV move ${n}: focus is not on a playable pit but on ${await focus()}`); break; }
    await tv.keyboard.press(n % 2 ? 'ArrowLeft' : 'ArrowRight');
    if (!/pit south/.test(await focus())) { errors.push(`TV move ${n}: sideways arrow left the bottom row`); break; }
    if (!/can/.test(await focus())) await tv.keyboard.press(n % 2 ? 'ArrowRight' : 'ArrowLeft');
    await tv.keyboard.press('Enter');
    await phone.waitForSelector('.pit.south.can', { timeout: 30000 });
    await phone.locator('.pit.south.can').first().click();
  }
  await tv.waitForSelector('.pit.south.can', { timeout: 30000 });
  await tv.waitForFunction(() => !document.querySelector('.hand'), null, { timeout: 30000 });
  await phone.waitForFunction(() => !document.querySelector('.hand'), null, { timeout: 30000 });
  const sum = (p) => p.evaluate(() => [...document.querySelectorAll('.count')].reduce((a, e) => a + +e.textContent, 0) + +scoreTop.textContent + +scoreBottom.textContent);
  if ((await sum(tv)) !== 48 || (await sum(phone)) !== 48) errors.push('seeds do not total 48 after 12 moves');
  if (process.argv[2]) await tv.screenshot({ path: process.argv[2] + '/tv-game.png' });

  // Back on the remote (key 461) asks before leaving.
  await tv.evaluate(() => { const e = new Event('keydown', { bubbles: true }); Object.defineProperty(e, 'keyCode', { value: 461 }); document.dispatchEvent(e); });
  await tv.waitForSelector('#leave:not([hidden])', { timeout: 5000 }).catch(() => errors.push('TV: Back did not ask before leaving'));

  console.log(errors.length ? 'FAILED\n' + errors.join('\n') : 'all TV checks passed');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
