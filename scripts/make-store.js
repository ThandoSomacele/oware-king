// Makes the store screenshots and graphics in store/. Needs the local server:
//   npm run dev        (in one window)
//   OWARE_SERVER=http://127.0.0.1:8787 node build.mjs && node scripts/make-store.js && node build.mjs
const { chromium } = require('playwright');
const path = require('node:path'), fs = require('node:fs');
const out = path.resolve(__dirname, '../store/screenshots');
const WEB = 'http://127.0.0.1:8787/', TV = 'file://' + path.resolve(__dirname, '../dist-tv/index.html');
// The address shown in the pictures: the planned final address. Remake the pictures if the plan changes.
const LIVE = 'https://owareking.object91.co.za';

// name: [width, height, pixel density, page, folder]. Sizes are the ones each store asks for.
const DEVICES = {
  'tv-1920x1080': [1920, 1080, 1, TV],
  'windows-1920x1080': [1920, 1080, 1, WEB],
  'phone-1080x1920': [360, 640, 3, WEB],
  'tablet7-1200x1920': [600, 960, 2, WEB],
  'tablet10-1600x2560': [800, 1280, 2, WEB],
  'iphone67-1290x2796': [430, 932, 3, WEB],
  'ipad129-2048x2732': [1024, 1366, 2, WEB],
};
const fast = () => {
  const st = window.setTimeout; window.setTimeout = (f, ms, ...a) => st(f, ms > 900 ? ms : ms / 12, ...a);
  const an = Element.prototype.animate; Element.prototype.animate = function (k, o) { return an.call(this, k, { ...o, duration: o.duration / 12 }); };
};

(async () => {
  const browser = await chromium.launch();
  for (const [name, [w, h, dsf, url]] of process.env.ONLY === 'banner' ? [] : Object.entries(DEVICES)) {
    const dir = path.join(out, name);
    fs.mkdirSync(dir, { recursive: true });
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf });
    const page = await ctx.newPage();
    const shot = (n) => page.screenshot({ path: path.join(dir, n + '.png') });
    const isTV = url === TV;

    // 1. Title screen
    await page.goto(url);
    await page.waitForTimeout(3400);
    await page.evaluate(() => {}); // settle
    await shot('1-title');
    await page.evaluate(fast);
    await page.click('#intro');
    await page.waitForSelector('#intro', { state: 'hidden' });
    await page.waitForSelector('#onlineCard:not([hidden])');
    await page.evaluate(() => { try { localStorage.setItem('oware.daily', JSON.stringify({ last: '2026-11-21', streak: 6, best: 9, solved: true })); } catch {} });

    // 2. A game against the computer, a few moves in
    await page.click('label[for="lvMedium"]');
    await page.click('#playAi');
    for (let k = 0; k < 7; k++) {
      await page.waitForSelector('.pit.south.can', { timeout: 30000 });
      const can = page.locator('.pit.south.can');
      await can.nth((k * 2) % (await can.count())).click();
    }
    await page.waitForSelector('.pit.south.can', { timeout: 30000 });
    await page.waitForFunction(() => !document.querySelector('.hand'));
    await page.waitForTimeout(300);
    await shot('2-play-the-computer');

    // 3. Online: this device hosts, a friend joins and reacts
    await page.evaluate(() => { document.querySelector('#back').click(); });
    await page.waitForTimeout(100);
    await page.evaluate(() => { const b = document.querySelector('#leaveYes'); if (b && b.offsetParent) b.click(); });
    await page.waitForSelector('#home:not([hidden])');
    await page.fill('#nick', 'Thando');
    await page.click('#playOnline');
    await page.waitForSelector('#invite:not([hidden])');
    const link = await page.inputValue('#inviteLink');
    // The picture must show the real address, not this test server.
    await page.evaluate((live) => {
      const show = live + '/#g-ama7kf', cv = document.querySelector('#inviteQr'), qr = qrcode(0, 'M');
      qr.addData(show); qr.make();
      const n = qr.getModuleCount(), q = 4, x = cv.getContext('2d');
      cv.width = cv.height = n + 2 * q; x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height); x.fillStyle = '#000';
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) x.fillRect(c + q, r + q, 1, 1);
      document.querySelector('#inviteLink').value = show;
    }, LIVE);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);
    await shot(isTV ? '3-scan-to-join' : '3-invite-a-friend');
    const friend = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
    await friend.addInitScript(() => { try { sessionStorage.setItem('oware.intro', '1'); localStorage.setItem('oware.nick', '"Ama"'); } catch {} });
    await friend.addInitScript(fast);
    await friend.goto(WEB + link.slice(link.indexOf('#')));
    for (let k = 0; k < 4; k++) {
      await page.waitForSelector('.pit.south.can', { timeout: 30000 });
      await page.locator('.pit.south.can').nth(k % 3).click();
      await friend.waitForSelector('.pit.south.can', { timeout: 30000 });
      await friend.locator('.pit.south.can').nth((k + 1) % 3).click();
    }
    await page.waitForSelector('.pit.south.can', { timeout: 30000 });
    await page.waitForFunction(() => !document.querySelector('.hand'));
    await friend.click('#reacts button:nth-child(5)');
    await page.waitForSelector('.react-pop');
    await page.waitForTimeout(60);
    await shot('4-play-a-friend-online');
    await friend.context().close();

    // 5. Home screen with a streak
    await page.evaluate(() => { document.querySelector('#back').click(); });
    await page.waitForTimeout(100);
    await page.evaluate(() => { const b = document.querySelector('#leaveYes'); if (b && b.offsetParent) b.click(); });
    await page.waitForSelector('#home:not([hidden])');
    await page.evaluate(() => { try { localStorage.removeItem('oware.room'); } catch {} window.scrollTo(0, 0); document.activeElement && document.activeElement.blur(); });
    await page.reload();
    await page.waitForSelector('#onlineCard:not([hidden])');
    await page.evaluate(() => { const s = document.querySelector('#streakN'); if (s) s.textContent = '6'; const b = document.querySelector('#streakBest'); if (b) b.textContent = 'Best 9'; });
    await page.waitForTimeout(300);
    await shot('5-home');
    await ctx.close();
    console.log('wrote', name);
  }

  // Wide banner for Google Play (1024 x 500) and a square store icon check.
  const page = await browser.newPage({ viewport: { width: 1024, height: 500 } });
  await page.addInitScript(() => { try { sessionStorage.setItem('oware.intro', '1'); } catch {} });
  await page.goto(WEB);
  await page.evaluate(() => {
    const art = Pixel.title(256, 284), bg = art.bg, logo = Pixel.logoCanvas(5);
    document.body.innerHTML = '';
    document.body.style.cssText = 'margin:0;padding:0;background:#0e0c20;overflow:hidden';
    const c = document.createElement('canvas'); c.width = 1024; c.height = 500; c.style.cssText = 'display:block';
    document.body.appendChild(c);
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    x.fillStyle = '#161435'; x.fillRect(0, 0, 1024, 500);         // night sky
    const glow = x.createRadialGradient(790, 225, 20, 790, 225, 330); // dusk glow behind the continent
    glow.addColorStop(0, '#8a3a6a'); glow.addColorStop(0.55, '#3a1d4f'); glow.addColorStop(1, '#161435');
    x.fillStyle = glow; x.fillRect(0, 0, 1024, 500);
    x.drawImage(art.map, 48, 20, 160, 130, 590, 60, 400, 325);   // the continent, right
    const k = 2;
    x.drawImage(logo, 44, 150, logo.width * k, logo.height * k);
    x.font = '600 26px Figtree, system-ui, sans-serif'; x.fillStyle = '#fdf0dc';
    x.fillText('The West African seed game.', 48, 150 + logo.height * k + 56);
    x.fillText('Play a friend online, anywhere.', 48, 150 + logo.height * k + 92);
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.resolve(out, '../feature-graphic-1024x500.png') });
  console.log('wrote feature graphic');
  await browser.close();
})();
