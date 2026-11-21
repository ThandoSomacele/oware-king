// Acts as a broken or hostile player, talking to the game server directly.
// Start the server first: npm run dev
const assert = require('node:assert');
const BASE = process.argv[2] || 'http://127.0.0.1:8787';
const WS = BASE.replace(/^http/, 'ws');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const newRoom = async () => (await (await fetch(BASE + '/api/room', { method: 'POST' })).json()).code;

function client(code) {
  const ws = new WebSocket(`${WS}/api/room/${code}/ws`);
  const c = { ws, msgs: [], closed: null, last: (t) => [...c.msgs].reverse().find((m) => m.t === t) };
  ws.onmessage = (e) => c.msgs.push(JSON.parse(e.data));
  ws.onclose = (e) => { c.closed = e.code; };
  c.open = new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  c.send = (m) => ws.send(typeof m === 'string' ? m : JSON.stringify(m));
  return c;
}
async function seated(code, id, name) {
  const c = client(code);
  await c.open;
  c.send({ t: 'join', id, name });
  await wait(150);
  return c;
}

(async () => {
  // A room that was never created cannot be joined
  const never = Array.from({ length: 6 }, () => 'abcdefghjkmnpqrstuvwxyz23456789'[Math.floor(Math.random() * 31)]).join('');
  const ghost = await seated(never, 'ghost-player-1', 'Ghost');
  assert.ok(ghost.last('gone'), 'join to a room that was never created must be refused');
  assert.deepStrictEqual(await (await fetch(BASE + '/api/room/' + never)).json(), { ok: false, host: null, full: false });

  const code = await newRoom();
  const a = await seated(code, 'player-aaaaaaaa', 'Ama');
  assert.strictEqual(a.last('state').you, 0);

  // No moves before a second player joins
  a.send({ t: 'move', pit: 2, n: 0 });
  await wait(150);
  assert.strictEqual(a.last('state').moves.length, 0, 'moved without an opponent');

  const b = await seated(code, 'player-bbbbbbbb', '<img src=x onerror=alert(1)> Kofi the very long name');
  assert.strictEqual(b.last('state').you, 1);
  const bName = b.last('state').players[1].name;
  assert.ok(!/[<>=()]/.test(bName) && bName.length <= 16, 'name not cleaned: ' + bName);

  // A third player is refused
  const c = await seated(code, 'player-cccccccc', 'Third');
  assert.ok(c.last('full'), 'third player was not refused');

  // Out of turn, wrong pits, bad values
  for (const bad of [{ pit: 8, n: 0, from: b }, { pit: 7, n: 0, from: a }, { pit: -1, n: 0, from: a }, { pit: 2.5, n: 0, from: a }, { pit: '2', n: 0, from: a }, { pit: 99, n: 0, from: a }, { n: 0, from: a }]) {
    const { from, ...m } = bad;
    from.send({ t: 'move', ...m });
  }
  a.send('not json');
  a.send(JSON.stringify([1, 2, 3]));
  await wait(250);
  assert.strictEqual(a.last('state').moves.length, 0, 'an illegal move was accepted');

  // The same move sent twice is applied once
  a.send({ t: 'move', pit: 2, n: 0 });
  a.send({ t: 'move', pit: 2, n: 0 });
  await wait(250);
  assert.deepStrictEqual(a.last('state').moves, [2], 'double move');

  // A player cannot rename themselves by joining again
  const a2 = await seated(code, 'player-aaaaaaaa', 'HELLO THERE');
  assert.strictEqual(a2.last('state').players[0].name, 'Ama', 'name changed on rejoin');
  await wait(150);
  assert.ok(a.last('replaced') && a.closed, 'old connection was not replaced by the new one');

  // Reactions are limited per player, even across new connections
  const before = b.msgs.filter((m) => m.t === 'react').length;
  for (let k = 0; k < 6; k++) a2.send({ t: 'react', e: 1 });
  const a3 = await seated(code, 'player-aaaaaaaa', 'x');
  for (let k = 0; k < 6; k++) a3.send({ t: 'react', e: 1 });
  a3.send({ t: 'react', e: 99 });
  await wait(300);
  const got = b.msgs.filter((m) => m.t === 'react').length - before;
  assert.ok(got <= 2, `reaction flood got through: ${got}`);

  // A message flood closes the connection, and the room still works afterwards
  for (let k = 0; k < 60; k++) a3.send({ t: 'ping' });
  await wait(400);
  assert.ok(a3.closed, 'message flood did not close the connection');
  const a4 = await seated(code, 'player-aaaaaaaa', 'Ama');
  b.send({ t: 'move', pit: 8, n: 1 });
  await wait(250);
  assert.deepStrictEqual(a4.last('state').moves, [2, 8], 'room broken after a flood');

  // Oversized message closes the connection
  const big = await seated(await newRoom(), 'player-dddddddd', 'Big');
  big.send('x'.repeat(5000));
  await wait(250);
  assert.ok(big.closed, 'oversized message was accepted');

  // Connection flood: the room accepts only a few connections
  const code2 = await newRoom();
  const many = Array.from({ length: 12 }, () => client(code2));
  const opened = (await Promise.allSettled(many.map((m) => m.open))).filter((r) => r.status === 'fulfilled').length;
  assert.ok(opened <= 4, `room accepted ${opened} connections`);
  many.forEach((m) => { try { m.ws.close(); } catch {} });

  // The creator can free the other seat only before the game starts and only when that player is away
  const code3 = await newRoom();
  const h = await seated(code3, 'player-hhhhhhhh', 'Host');
  const g = await seated(code3, 'player-gggggggg', 'Guest');
  h.send({ t: 'free' });
  await wait(200);
  assert.ok(h.last('state').players[1], 'seat freed while the guest was online');
  g.send({ t: 'free' });
  g.ws.close();
  await wait(300);
  h.send({ t: 'free' });
  await wait(200);
  assert.strictEqual(h.last('state').players[1], null, 'creator could not free the seat of an absent guest');
  const n = await seated(code3, 'player-nnnnnnnn', 'New');
  assert.strictEqual(n.last('state').you, 1, 'freed seat could not be taken');

  // Rematch needs a finished game
  h.send({ t: 'rematch' });
  await wait(200);
  assert.deepStrictEqual(h.last('state').rematch, [false, false], 'rematch accepted mid-game');

  console.log('all server checks passed');
  process.exit(0);
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
