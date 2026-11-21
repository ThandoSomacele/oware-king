// Oware King game server (Cloudflare Workers).
// Each game link is one "room". A room holds two players, the list of moves and nothing else.
// The server replays the moves with the same rules engine as the game page, so a player cannot cheat by editing their page.
import { DurableObject } from 'cloudflare:workers';
import Engine from '../src/engine.js';

const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'; // no look-alike letters or digits
const REACTIONS = 5;
const DAY = 24 * 60 * 60 * 1000;
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/ping') return json({ ok: true });
    if (url.pathname === '/api/room' && request.method === 'POST') {
      const bytes = crypto.getRandomValues(new Uint8Array(6));
      return json({ code: [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('') });
    }
    const room = url.pathname.match(/^\/api\/room\/([a-z2-9]{6})\/ws$/);
    if (room) {
      if (request.headers.get('Upgrade') !== 'websocket') return json({ error: 'Expected a WebSocket' }, 426);
      return env.ROOMS.get(env.ROOMS.idFromName(room[1])).fetch(request);
    }
    return json({ error: 'Not found' }, 404);
  },
};

export class Room extends DurableObject {
  async load() {
    if (!this.room) {
      this.room = (await this.ctx.storage.get('room')) || { players: [null, null], game: 0, starter: 0, moves: [], rematch: [false, false] };
    }
    return this.room;
  }
  save() {
    return this.ctx.storage.put('room', this.room);
  }
  // The position is always rebuilt from the move list, so the list is the single source of truth.
  position() {
    let st = Engine.start();
    st.turn = this.room.starter;
    for (const pit of this.room.moves) st = Engine.play(st, pit).state;
    return st;
  }

  async fetch() {
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  seatOf(ws) {
    const a = ws.deserializeAttachment();
    return a ? a.seat : null;
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
    if (typeof raw !== 'string' || raw.length > 300) return;
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (!msg || typeof msg !== 'object') return;
    const r = await this.load();

    if (msg.t === 'join') {
      if (typeof msg.id !== 'string' || msg.id.length < 8 || msg.id.length > 64) return;
      const name = String(msg.name || '').replace(/[^\p{L}\p{N} ._-]/gu, '').trim().slice(0, 16) || 'Player';
      let seat = r.players.findIndex((p) => p && p.id === msg.id);
      if (seat === -1) seat = !r.players[0] ? 0 : !r.players[1] ? 1 : -1;
      if (seat === -1) {
        this.send(ws, { t: 'full' });
        ws.close(4001, 'This game already has two players');
        return;
      }
      r.players[seat] = { id: msg.id, name };
      ws.serializeAttachment({ seat, last: 0 });
      await this.save();
      await this.ctx.storage.setAlarm(Date.now() + DAY);
      this.broadcast();
      return;
    }

    const seat = this.seatOf(ws);
    if (seat === null) return;

    if (msg.t === 'move') {
      const st = this.position();
      const ok = r.players[0] && r.players[1] && !st.over && st.turn === seat && Engine.legalMoves(st).includes(msg.pit);
      if (ok) {
        r.moves.push(msg.pit);
        await this.save();
      }
      this.broadcast(); // also corrects a page that is out of step
    } else if (msg.t === 'react') {
      const a = ws.deserializeAttachment(), now = Date.now();
      if (!Number.isInteger(msg.e) || msg.e < 0 || msg.e >= REACTIONS || now - a.last < 800) return;
      ws.serializeAttachment({ ...a, last: now });
      for (const other of this.ctx.getWebSockets()) this.send(other, { t: 'react', seat, e: msg.e });
    } else if (msg.t === 'rematch') {
      if (!this.position().over) return;
      r.rematch[seat] = true;
      if (r.rematch[0] && r.rematch[1]) {
        r.game += 1;
        r.starter = 1 - r.starter; // the other player starts the next game
        r.moves = [];
        r.rematch = [false, false];
      }
      await this.save();
      this.broadcast();
    }
  }

  async webSocketClose(ws) {
    await this.load();
    this.broadcast(ws);
  }
  async webSocketError(ws) {
    await this.load();
    this.broadcast(ws);
  }

  // Rooms that nobody has touched for a day are deleted.
  async alarm() {
    if (this.ctx.getWebSockets().length) await this.ctx.storage.setAlarm(Date.now() + DAY);
    else await this.ctx.storage.deleteAll();
  }
}
