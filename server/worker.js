// Oware King game server (Cloudflare Workers).
// Each game link is one "room". A room holds two players, the list of moves and nothing else.
// The server replays the moves with the same rules engine as the game page, so a player cannot cheat by editing their page.
import { DurableObject } from 'cloudflare:workers';
import Engine from '../src/engine.js';

const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'; // no look-alike letters or digits
const REACTIONS = 5;
const DAY = 24 * 60 * 60 * 1000;
const MAX_SOCKETS = 4; // per room: two players, plus one spare each while a phone reconnects
const JOIN_WITHIN = 10 * 1000; // a connection must say who it is within this time
const RATE_WINDOW = 10 * 1000, RATE_MAX = 25; // messages allowed per connection per window
const REACT_GAP = 800; // milliseconds between reactions from one player

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/ping') return json({ ok: true });
    if (url.pathname === '/api/room' && request.method === 'POST') {
      const bytes = crypto.getRandomValues(new Uint8Array(6));
      const code = [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('');
      await env.ROOMS.get(env.ROOMS.idFromName(code)).create();
      return json({ code });
    }
    const room = url.pathname.match(/^\/api\/room\/([a-z2-9]{6})(\/ws)?$/);
    if (room) {
      const stub = env.ROOMS.get(env.ROOMS.idFromName(room[1]));
      if (!room[2]) return request.method === 'GET' ? json(await stub.info()) : json({ error: 'Not found' }, 404);
      if (request.headers.get('Upgrade') !== 'websocket') return json({ error: 'Expected a WebSocket' }, 426);
      return stub.fetch(request);
    }
    return json({ error: 'Not found' }, 404);
  },
};

const fresh = () => ({ created: false, players: [null, null], game: 0, starter: 0, moves: [], rematch: [false, false], touched: 0 });

export class Room extends DurableObject {
  lastReact = [0, 0];

  async load() {
    if (!this.room) this.room = (await this.ctx.storage.get('room')) || fresh();
    return this.room;
  }
  save() {
    this.room.touched = Date.now();
    return this.ctx.storage.put('room', this.room);
  }
  // The position is always rebuilt from the move list, so the list is the single source of truth.
  position() {
    let st = Engine.start();
    st.turn = this.room.starter;
    for (const pit of this.room.moves) st = Engine.play(st, pit).state;
    return st;
  }

  // Called by the Worker when a player taps "Create game link". Only created rooms can be joined.
  async create() {
    const r = await this.load();
    if (!r.created) {
      r.created = true;
      await this.save();
      await this.ctx.storage.setAlarm(Date.now() + DAY);
    }
  }
  // What an invited friend's page shows before they join.
  async info() {
    const r = await this.load();
    return { ok: !!r.created, host: r.created && r.players[0] ? r.players[0].name : null, full: !!(r.players[0] && r.players[1]) };
  }

  async fetch() {
    this.sweep();
    if (this.ctx.getWebSockets().length >= MAX_SOCKETS) return json({ error: 'This game has too many connections' }, 429);
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);
    pair[1].serializeAttachment({ seat: null, t0: Date.now(), w: Date.now(), n: 0 });
    const alarm = await this.ctx.storage.getAlarm();
    if (!alarm || alarm > Date.now() + JOIN_WITHIN + 2000) await this.ctx.storage.setAlarm(Date.now() + JOIN_WITHIN + 2000);
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  att(ws) {
    return ws.deserializeAttachment() || { seat: null, t0: 0, w: 0, n: 0 };
  }
  seatOf(ws) {
    return this.att(ws).seat;
  }
  shut(ws, code, reason) {
    try { ws.close(code, reason); } catch { /* already closed */ }
  }
  // Close connections that never said who they are.
  sweep() {
    const now = Date.now();
    for (const ws of this.ctx.getWebSockets()) {
      const a = this.att(ws);
      if (a.seat === null && now - a.t0 > JOIN_WITHIN) this.shut(ws, 4000, 'No join received');
    }
  }

  broadcast(leaving = null) {
    const r = this.room, sockets = this.ctx.getWebSockets().filter((ws) => ws !== leaving);
    const online = [0, 1].map((seat) => sockets.some((ws) => this.seatOf(ws) === seat));
    for (const ws of sockets) {
      const seat = this.seatOf(ws);
      if (seat === null) continue;
      this.send(ws, {
        t: 'state', you: seat, game: r.game, starter: r.starter, moves: r.moves, rematch: r.rematch,
        players: r.players.map((p, s) => (p ? { name: p.name, online: online[s] } : null)),
      });
    }
  }
  send(ws, msg) {
    try { ws.send(JSON.stringify(msg)); } catch { /* the socket has gone */ }
  }

  async webSocketMessage(ws, raw) {
    if (typeof raw !== 'string' || raw.length > 300) return this.shut(ws, 4009, 'Message too large');
    // A flood of messages closes the connection.
    const a = this.att(ws), now = Date.now();
    if (now - a.w > RATE_WINDOW) { a.w = now; a.n = 0; }
    a.n += 1;
    ws.serializeAttachment(a);
    if (a.n > RATE_MAX) return this.shut(ws, 4008, 'Too many messages');

    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (!msg || typeof msg !== 'object') return;
    if (msg.t === 'ping') return this.send(ws, { t: 'pong' });
    const r = await this.load();

    if (msg.t === 'join') {
      if (a.seat !== null) return; // one join per connection
      if (typeof msg.id !== 'string' || msg.id.length < 8 || msg.id.length > 64) return this.shut(ws, 4003, 'Bad join');
      if (!r.created) {
        this.send(ws, { t: 'gone' });
        return this.shut(ws, 4004, 'No such game');
      }
      let seat = r.players.findIndex((p) => p && p.id === msg.id);
      if (seat === -1) {
        seat = !r.players[0] ? 0 : !r.players[1] ? 1 : -1;
        if (seat === -1) {
          this.send(ws, { t: 'full' });
          return this.shut(ws, 4001, 'This game already has two players');
        }
        // The name is fixed when a player first takes a seat. It cannot be changed later,
        // so it cannot be used to pass messages.
        const name = String(msg.name || '').replace(/[^\p{L}\p{N} ._-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 16) || 'Player';
        r.players[seat] = { id: msg.id, name };
        await this.save();
        await this.ctx.storage.setAlarm(Date.now() + DAY);
      }
      // One connection per player: a newer tab or device takes over from the older one.
      for (const other of this.ctx.getWebSockets()) {
        if (other !== ws && this.seatOf(other) === seat) {
          this.send(other, { t: 'replaced' });
          this.shut(other, 4002, 'Opened somewhere else');
        }
      }
      ws.serializeAttachment({ ...a, seat });
      this.broadcast();
      return;
    }

    const seat = a.seat;
    if (seat === null) return;

    if (msg.t === 'move') {
      const st = this.position();
      // msg.n is the move number the page thinks this is, so a move sent twice is applied once.
      const ok = r.players[0] && r.players[1] && !st.over && st.turn === seat && msg.n === r.moves.length
        && Number.isInteger(msg.pit) && Engine.legalMoves(st).includes(msg.pit);
      if (ok) {
        r.moves.push(msg.pit);
        await this.save();
        this.broadcast();
      } else this.broadcast(); // puts a page that is out of step right again
    } else if (msg.t === 'react') {
      if (!Number.isInteger(msg.e) || msg.e < 0 || msg.e >= REACTIONS || now - this.lastReact[seat] < REACT_GAP) return;
      this.lastReact[seat] = now;
      for (const other of this.ctx.getWebSockets()) if (this.seatOf(other) !== null) this.send(other, { t: 'react', seat, e: msg.e });
    } else if (msg.t === 'rematch') {
      if (!this.position().over || r.rematch[seat]) return;
      r.rematch[seat] = true;
      if (r.rematch[0] && r.rematch[1]) {
        r.game += 1;
        r.starter = 1 - r.starter; // the other player starts the next game
        r.moves = [];
        r.rematch = [false, false];
      }
      await this.save();
      this.broadcast();
    } else if (msg.t === 'free') {
      // The player who created the game can free the other seat to invite someone else,
      // but only while that player is away and the current game has not started.
      const awaySeat = this.ctx.getWebSockets().every((o) => this.seatOf(o) !== 1);
      if (seat !== 0 || !r.players[1] || !awaySeat || r.moves.length) return;
      r.players[1] = null;
      r.rematch = [false, false];
      await this.save();
      this.broadcast();
    }
  }

  async webSocketClose(ws) {
    await this.load();
    if (this.seatOf(ws) !== null) this.broadcast(ws);
  }
  async webSocketError(ws) {
    await this.load();
    if (this.seatOf(ws) !== null) this.broadcast(ws);
  }

  // Runs shortly after a connection opens (to drop silent ones) and one day after the last activity (to delete the room).
  async alarm() {
    const r = await this.load();
    this.sweep();
    const sockets = this.ctx.getWebSockets();
    const now = Date.now(), idle = now - (r.touched || 0);
    if (!sockets.length && idle >= DAY - 60 * 1000) return this.ctx.storage.deleteAll();
    const waiting = sockets.some((ws) => this.seatOf(ws) === null);
    await this.ctx.storage.setAlarm(now + (waiting ? JOIN_WITHIN : sockets.length ? DAY : Math.max(60 * 1000, DAY - idle)));
  }
}
