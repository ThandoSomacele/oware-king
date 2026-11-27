// Installing the game as an app (Windows, Android, any browser). Start the server first (npm run dev), then: node test/install.js
//  1. The browser itself says the game can be installed.
//  2. Every picture in the install description loads and is the size it claims.
//  3. After one visit the game opens with no connection (the start page comes from the offline copy).
//  4. The game fits common Windows window sizes.
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://127.0.0.1:8787';
(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(BASE + '/');
  await page.waitForTimeout(1500);

  // 1. Installable, in the browser's own judgement
  const cdp = await ctx.newCDPSession(page);
  const inst = await cdp.send('Page.getInstallabilityErrors');
  if (inst.installabilityErrors.length) errors.push('not installable: ' + JSON.stringify(inst.installabilityErrors));
  const app = await cdp.send('Page.getAppManifest');
  if (app.errors && app.errors.length) errors.push('manifest problems: ' + JSON.stringify(app.errors));
  const manifest = JSON.parse(app.data);

  // 2. Every picture is there and the right size
  const pics = [...manifest.icons, ...(manifest.screenshots || [])];
  for (const p of pics) {
    const got = await page.evaluate(async (src) => {
      const r = await fetch(src);
      if (!r.ok) return { status: r.status };
      const b = await createImageBitmap(await r.blob());
      return { status: r.status, size: `${b.width}x${b.height}`, type: r.headers.get('content-type') };
    }, p.src);
    if (got.status !== 200) errors.push(`${p.src}: HTTP ${got.status}`);
    else if (got.size !== p.sizes) errors.push(`${p.src}: is ${got.size}, says ${p.sizes}`);
    else if (got.type !== p.type) errors.push(`${p.src}: type ${got.type}, says ${p.type}`);
  }
  const wide = (manifest.screenshots || []).filter((s) => s.form_factor === 'wide').length;
  const narrow = (manifest.screenshots || []).filter((s) => s.form_factor === 'narrow').length;
  if (wide < 1 || narrow < 1) errors.push('install dialog needs wide and narrow screenshots');
  for (const k of ['name', 'short_name', 'description', 'id', 'start_url', 'display', 'background_color', 'theme_color']) if (!manifest[k]) errors.push('manifest is missing ' + k);

  // 3. Offline start after one visit
  await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 15000 })
    .catch(async () => { await page.reload(); });
  await page.waitForTimeout(800);
  await ctx.setOffline(true);
  await page.reload().catch(() => errors.push('offline: page did not load'));
  await page.waitForTimeout(800);
  const offlineOk = await page.evaluate(() => !!document.querySelector('#playAi')).catch(() => false);
  if (!offlineOk) errors.push('offline: the game did not open with no connection');
  await ctx.setOffline(false);
  await ctx.close();

  // 4. Windows window sizes: home and a game must fit, with no sideways scrolling
  for (const [w, h] of [[1920, 1080], [1366, 768], [900, 600], [960, 1040]]) {
    const c = await browser.newContext({ viewport: { width: w, height: h } });
    const p = await c.newPage();
    await p.addInitScript(() => { try { sessionStorage.setItem('oware.intro', '1'); } catch {} });
    await p.goto(BASE + '/');
    await p.waitForSelector('#onlineCard:not([hidden])');
    const home = await p.evaluate(() => ({ sideways: document.documentElement.scrollWidth > innerWidth + 1 }));
    if (home.sideways) errors.push(`${w}x${h} home: scrolls sideways`);
    await p.click('#playAi');
    await p.waitForSelector('.pit.can');
    await p.waitForTimeout(300);
    const game = await p.evaluate(() => {
      const board = document.querySelector('#board').getBoundingClientRect(), st = document.querySelector('#status').getBoundingClientRect();
      return { sideways: document.documentElement.scrollWidth > innerWidth + 1, boardBottom: Math.round(board.bottom), statusBottom: Math.round(st.bottom), boardW: Math.round(board.width) };
    });
    if (game.sideways) errors.push(`${w}x${h} game: scrolls sideways`);
    if (game.statusBottom > h) errors.push(`${w}x${h} game: board or status below the window edge (${JSON.stringify(game)})`);
    console.log(`${w}x${h}: board ${game.boardW}px wide, status line ends at ${game.statusBottom}px`);
    await c.close();
  }

  console.log(`manifest: ${manifest.icons.length} icons, ${wide} wide and ${narrow} narrow screenshots`);
  console.log(errors.length ? 'FAILED\n' + errors.join('\n') : 'all install checks passed');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
