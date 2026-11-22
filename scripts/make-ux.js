// Makes store/lg-ux-scenario.pdf: the screen-by-screen document that LG Seller Lounge asks for.
// Run after the store screenshots exist: node scripts/make-ux.js
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const shots = path.resolve(__dirname, '../store/screenshots/tv-1920x1080');
const img = (f) => 'data:image/png;base64,' + fs.readFileSync(path.join(shots, f)).toString('base64');
const APP = 'Oware King  ·  com.object91.owareking  ·  v1.0.3  ·  Object91';

const SCREENS = [
  ['1. Title screen', '1-title.png', [
    ['OK', 'Starts the game and opens the home screen.'],
    ['Arrow keys', 'Also start the game.'],
    ['Back', 'Closes the app.'],
    ['Magic Remote', 'Click anywhere to start.'],
  ]],
  ['2. Home screen', '5-home.png', [
    ['Arrow keys', 'Move the gold frame to the next button in that direction. The page scrolls to keep the frame in view.'],
    ['OK', 'Selects the framed button.'],
    ['Play today\'s challenge', 'Opens one position. The player gets one try to find the best pit.'],
    ['Play a friend online', 'OK on the name field opens the TV keyboard. "Create game link" opens the scan-to-join screen.'],
    ['Play the computer', 'Easy, Medium or Hard, then "Start game".'],
    ['Two players, one device', 'Two people take turns with the same remote.'],
    ['Back', 'Closes the app.'],
  ]],
  ['3. Game screen', '2-play-the-computer.png', [
    ['Gold ring', 'Marks each pit the player may choose. The gold frame shows the pit in focus.'],
    ['Left / Right', 'Move between pits.'],
    ['OK', 'Sows the seeds from the pit in focus, one seed per pit, counter-clockwise.'],
    ['Scores', 'Captured seeds are shown beside each player\'s name. First to 25 wins.'],
    ['Home (top left)', 'Returns to the home screen.'],
    ['Sound on / off (top right)', 'Switches the seed sounds on or off.'],
    ['Back', 'In an online game asks "Leave this game?". In other modes returns to the home screen.'],
  ]],
  ['4. Scan to join (online play)', '3-scan-to-join.png', [
    ['QR code', 'A friend scans it with a phone camera, types a name on the phone and joins the game.'],
    ['Waiting for a friend', 'Changes to the friend\'s name when they join. Play then starts.'],
    ['Home', 'Leaves the game after a confirmation.'],
    ['Network', 'This is the only screen that needs an internet connection.'],
  ]],
  ['5. Online game in progress', '4-play-a-friend-online.png', [
    ['Names', 'The friend is shown at the top, the TV player at the bottom.'],
    ['Reactions', 'Five preset pictures can be sent. There is no text chat.'],
    ['Result', 'When a player reaches 25 a panel shows the result, with "Rematch" and "Home".'],
    ['Lost connection', 'The status line says "Connection lost. Reconnecting" and the game continues when the connection returns.'],
  ]],
];

const page = (title, body) => `<section><header><h1>${title}</h1><p>${APP}</p></header>${body}</section>`;
const html = `<!doctype html><meta charset="utf-8"><style>
  @page { size: 1920px 1080px; margin: 0 }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #1d1d1f }
  section { width: 1920px; height: 1080px; box-sizing: border-box; padding: 56px 72px; page-break-after: always; position: relative }
  header h1 { font-size: 46px; margin: 0 0 6px } header p { font-size: 22px; color: #63636a; margin: 0 0 28px }
  .row { display: flex; gap: 48px; align-items: flex-start }
  img { width: 1100px; border: 1px solid #dedee4; display: block }
  table { border-collapse: collapse; font-size: 24px; line-height: 1.35; flex: 1 }
  td { border-top: 1px solid #dedee4; padding: 12px 10px; vertical-align: top } td:first-child { font-weight: bold; width: 240px }
  ul { font-size: 28px; line-height: 1.7 } .big td { font-size: 28px }
</style>
${page('Oware King: UX scenario', `<ul>
  <li>Oware King is a board game for two players: Oware, the West African seed game.</li>
  <li>Type: packaged web app. Resolution: 1920 x 1080. No login, no payment, no advertising, no video content.</li>
  <li>Input: standard remote (arrow keys, OK, Back) and Magic Remote (pointer and click). Colour keys and number keys are not used.</li>
  <li>Modes: play the computer, two players with one remote, the daily challenge, and online play against a friend who joins on a phone by scanning a QR code.</li>
  <li>Network: only online play needs an internet connection.</li>
  <li>Screen saver: a muted 16 x 16 pixel looping video plays during a game so the screen saver does not start. It stops on the home screen.</li>
</ul>`)}
${SCREENS.map(([title, file, rows]) => page(title, `<div class="row"><img src="${img(file)}"><table>${rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table></div>`)).join('')}
${page('Remote control keys', `<table class="big">
  <tr><td>Up, Down, Left, Right</td><td>Move the selection to the nearest button or pit in that direction.</td></tr>
  <tr><td>OK</td><td>Press the selected button, or sow the seeds from the selected pit.</td></tr>
  <tr><td>Back</td><td>Title screen and home screen: close the app. Game screen: return to the home screen (online games ask first). Open question panel: close the panel.</td></tr>
  <tr><td>Magic Remote pointer</td><td>Every button and pit can be clicked. Hovering is not required.</td></tr>
  <tr><td>Other keys</td><td>Not used.</td></tr>
</table>`)}`;

(async () => {
  const browser = await chromium.launch();
  const p = await browser.newPage();
  await p.setContent(html);
  await p.pdf({ path: path.resolve(__dirname, '../store/lg-ux-scenario.pdf'), width: '1920px', height: '1080px', printBackground: true });
  await browser.close();
  console.log('wrote store/lg-ux-scenario.pdf');
})();
