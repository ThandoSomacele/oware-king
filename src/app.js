(() => {
  'use strict';
  const E = Engine;
  const $ = (s) => document.querySelector(s);
  const DEPTH = { easy: 1, medium: 3, hard: 9 };
  const BLUNDER = { easy: 0.35, medium: 0.05, hard: 0 };

  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => fmt(new Date());
  const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return fmt(d); };

  // Saved on this device only. The game must still work when storage is blocked.
  const store = {
    get(k, d) { try { const v = localStorage.getItem('oware.' + k) ?? localStorage.getItem('imbewu.' + k); // 'imbewu.' is the old name
      return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('oware.' + k, JSON.stringify(v)); } catch { /* ignore */ } },
  };

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  let mode = null, level = store.get('level', 'easy');
  let bottom = 0; // the player whose pits are on the bottom row
  const net = { ws: null, code: null, seat: null, snap: null, applied: 0, game: -1, busy: false, waiting: false, down: false, retry: 0, pending: null };
  let state = null, view = [], locked = false, thinking = false, puzzle = null, gameId = 0, note = '';

  // ---------- sound ----------
  // All sounds are made in the browser (no audio files). A seed on wood is two parts:
  // a short bright click (the hard seed) and a low, quickly fading thump (the board).
  let audio = null, out = null, noise = null, soundOn = store.get('sound', true);
  function ready() {
    if (!soundOn) return false;
    try {
      if (!audio) {
        audio = new (window.AudioContext || window.webkitAudioContext)();
        out = audio.createGain();
        out.gain.value = 0.8;
        out.connect(audio.destination);
        const len = Math.floor(audio.sampleRate * 0.25);
        noise = audio.createBuffer(1, len, audio.sampleRate);
        const d = noise.getChannelData(0);
        for (let k = 0; k < len; k++) d[k] = Math.random() * 2 - 1;
      }
      if (audio.state !== 'running') { const p = audio.resume(); if (p && p.catch) p.catch(() => {}); } // also covers iOS 'interrupted'
      return true;
    } catch { return false; }
  }
  const rand = (a, b) => a + Math.random() * (b - a);
  function env(vol, t, dur) {
    const g = audio.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    g.connect(out);
    return g;
  }
  function click(freq, vol, delay = 0, dur = 0.022) {
    const t = audio.currentTime + delay;
    const src = audio.createBufferSource(), bp = audio.createBiquadFilter();
    src.buffer = noise;
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = 1.4;
    src.connect(bp);
    bp.connect(env(vol, t, dur));
    src.start(t, Math.random() * 0.2);
    src.stop(t + dur + 0.02);
  }
  function thump(freq, vol, delay = 0, dur = 0.09) {
    const t = audio.currentTime + delay;
    for (const [mult, v, d] of [[1, vol, dur], [2.76, vol * 0.3, dur * 0.45]]) { // 2.76 is the second mode of a wooden bar
      const o = audio.createOscillator();
      o.frequency.setValueAtTime(freq * mult * 1.35, t);
      o.frequency.exponentialRampToValueAtTime(freq * mult, t + 0.02);
      o.connect(env(v, t, d));
      o.start(t);
      o.stop(t + d + 0.02);
    }
  }
  // A steady tone that fades out: one resonance of the wood.
  function ring(freq, vol, delay, dur) {
    const t = audio.currentTime + delay;
    const o = audio.createOscillator();
    o.frequency.value = freq;
    o.connect(env(vol, t, dur));
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  const VOICE = { pitch: 1300, len: 0.05, body: 0.05 }; // the landing sound chosen by ear
  const sfx = {
    // One seed lands in a pit that now holds n seeds.
    drop(n = 1) {
      if (!ready()) return;
      const v = VOICE;
      const f = v.pitch * rand(0.92, 1.08), damp = (n > 3 ? 0.7 : 1) * 0.45; // a full pit rings less; 0.45 sets the overall level
      // Wood rings at fixed, unevenly spaced pitches that die away fast. No pitch slide.
      ring(f, 0.5 * damp, 0, v.len * damp);
      ring(f * 2.76, 0.22 * damp, 0, v.len * 0.5);
      ring(f * 5.4, 0.1 * damp, 0, v.len * 0.25);
      ring(f * 0.42, v.body * damp, 0, v.len * 1.2); // faint body of the board
      click(rand(3000, 4400), 0.4, 0, 0.012); // the hard seed touching down
      const bounce = rand(0.05, 0.08); // one small bounce
      ring(f * 1.04, 0.12 * damp, bounce, v.len * 0.5);
      click(rand(3400, 4800), 0.14, bounce, 0.01);
      if (n > 1) click(rand(3600, 5200), 0.15, rand(0.018, 0.04), 0.014); // it also taps the seeds already there
    },
    // n seeds are scooped up or poured out: a quick rattle.
    rattle(n) {
      if (!ready()) return;
      const c = Math.min(Math.max(n, 2), 8);
      for (let k = 0; k < c; k++) click(rand(2600, 5200), rand(0.5, 0.9), k * rand(0.016, 0.03), 0.03);
      thump(rand(240, 300), 0.06, 0.01, 0.05);
    },
    knock() {
      if (!ready()) return;
      thump(150, 0.45, 0, 0.12);
      thump(480, 0.35, 0, 0.08);
      click(1200, 1.0, 0, 0.04);
    },
    // Short wooden-key notes, like a balafon.
    tune(notes) {
      if (!ready()) return;
      notes.forEach((f, k) => { thump(f, 0.35, k * 0.16, 0.38); click(2400, 0.18, k * 0.16); });
    },
  };
  // Sound must never stop the game.
  for (const k of Object.keys(sfx)) { const f = sfx[k]; sfx[k] = (...a) => { try { f(...a); } catch { /* ignore */ } }; }
  function drawSound() {
    $('#sound').textContent = soundOn ? 'Sound on' : 'Sound off';
    $('#sound').setAttribute('aria-pressed', String(soundOn));
  }

  // ---------- board ----------
  const boardEl = $('#board'), pitEls = [];
  // flip = true puts pits 6-11 on the bottom row, for the second online player.
  function buildBoard(flip = false) {
    boardEl.replaceChildren();
    const order = flip ? [5, 4, 3, 2, 1, 0, 6, 7, 8, 9, 10, 11] : [11, 10, 9, 8, 7, 6, 0, 1, 2, 3, 4, 5];
    for (const [n, i] of order.entries()) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pit ' + (n < 6 ? 'north' : 'south');
      b.innerHTML = '<span class="bowl"><span class="seeds"></span></span><span class="count"></span>';
      b.addEventListener('click', () => onPit(i));
      boardEl.appendChild(b);
      pitEls[i] = b;
    }
    const inlay = document.createElement('span');
    inlay.className = 'inlay';
    inlay.innerHTML = Brand.band('stripe', 6, 120);
    boardEl.appendChild(inlay);
  }

  function seedsHTML(n, i) {
    const shown = Math.min(n, 30);
    const size = n <= 5 ? 26 : n <= 10 ? 21 : n <= 16 ? 17 : 14;
    let h = '';
    for (let k = 0; k < shown; k++) {
      const r = shown === 1 ? 0 : 36 * Math.sqrt((k + 0.5) / Math.max(shown, 4));
      const a = k * 2.39996 + i * 0.7;
      h += `<i class="seed s${(k + i) % 3}" style="left:${(50 + r * Math.cos(a)).toFixed(1)}%;top:${(50 + r * Math.sin(a)).toFixed(1)}%;width:${size}%"></i>`;
    }
    return h;
  }

  function drawPit(i) {
    const n = view[i], el = pitEls[i];
    el.querySelector('.seeds').innerHTML = seedsHTML(n, i);
    el.querySelector('.count').textContent = n;
    el.setAttribute('aria-label', `Pit ${(i % 6) + 1}, ${n} seed${n === 1 ? '' : 's'}`);
  }

  // ---------- seeds in flight ----------
  // The "hand" is the group of seeds that was picked up. It hops from pit to pit and drops one seed at each stop.
  const fx = $('#fx');
  const bowlOf = (i) => pitEls[i].querySelector('.bowl');
  // Positions are measured from the #fx layer, which scrolls with the page.
  const centre = (el) => {
    const r = el.getBoundingClientRect(), o = fx.getBoundingClientRect();
    return { x: r.left - o.left + r.width / 2, y: r.top - o.top + r.height / 2, w: r.width };
  };
  const at = (el, p, scale) => `translate(${p.x - el.offsetWidth / 2}px, ${p.y - el.offsetHeight / 2}px) scale(${scale})`;

  function setHand(hand, n, i) {
    hand.innerHTML = `<span class="seeds">${seedsHTML(n, i)}</span><b>${n}</b>`;
  }
  function makeHand(n, i, p) {
    const hand = document.createElement('div');
    hand.className = 'hand';
    hand.style.width = hand.style.height = p.w * 0.92 + 'px';
    setHand(hand, n, i);
    fx.appendChild(hand);
    hand.style.transform = at(hand, p, 1.12);
    return hand;
  }
  function fly(el, a, b, ms, lift) {
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - lift };
    el.style.transform = at(el, b, 1.12);
    if (reduced || !el.animate) return wait(ms); // no flight, but keep the pit-by-pit pace
    const anim = el.animate(
      [
        { transform: at(el, a, 1.12), easing: 'ease-out' },
        { transform: at(el, mid, 1.34), easing: 'ease-in' },
        { transform: at(el, b, 1.12) },
      ],
      { duration: ms }
    );
    return anim.finished.catch(() => {});
  }

  const scoreEl = (p) => $(p === bottom ? '#scoreBottom' : '#scoreTop');
  function orient(seat) {
    if (bottom === seat) return;
    bottom = seat;
    buildBoard(seat === 1);
  }
  const bothIn = () => !!(net.snap && net.snap.players[0] && net.snap.players[1]);
  const rival = () => (net.snap && net.snap.players[1 - net.seat]) || null;
  const humanTurn = () =>
    mode === 'ai' ? state.turn === 0
      : mode === 'daily' ? !puzzle.done
        : mode === 'online' ? state.turn === net.seat && bothIn() && !net.waiting && !net.down
          : true;

  function drawAll() {
    for (let i = 0; i < 12; i++) drawPit(i);
    $('#scoreTop').textContent = state.score[1 - bottom];
    $('#scoreBottom').textContent = state.score[bottom];
    const live = !state.over && !(mode === 'daily' && puzzle.done);
    $('#barTop').classList.toggle('turn', live && state.turn !== bottom);
    $('#barBottom').classList.toggle('turn', live && state.turn === bottom);
    const can = !locked && live && humanTurn() ? E.legalMoves(state) : [];
    pitEls.forEach((el, i) => el.classList.toggle('can', can.includes(i)));
    let s = note;
    if (!s && live) {
      if (mode === 'ai') s = state.turn === 1 ? (thinking ? 'The computer is thinking' : 'The computer is playing') : locked ? 'Sowing your seeds' : 'Your turn. Tap a pit with a gold ring.';
      else if (mode === 'local') s = state.turn === 0 ? 'Player 1 to play' : 'Player 2 to play';
      else if (mode === 'online') {
        const r = rival();
        if (net.down) s = 'Connection lost. Reconnecting';
        else if (!r) s = 'Waiting for your friend to join';
        else if (state.turn === net.seat) s = locked ? 'Sowing your seeds' : 'Your turn. Tap a pit with a gold ring.';
        else s = r.online ? `${r.name} is playing` : `${r.name} is offline. The game waits for them.`;
      }
    }
    $('#status').textContent = s;
  }

  function pulse(i) {
    const el = pitEls[i];
    el.classList.remove('pulse');
    void el.offsetWidth;
    el.classList.add('pulse');
  }

  function onPit(i) {
    if (locked || !state || state.over || !humanTurn() || E.owner(i) !== state.turn) return;
    if (!E.legalMoves(state).includes(i)) {
      if (state.pits[i] > 0) { note = 'Your opponent has no seeds. Choose a pit that reaches their side.'; drawAll(); }
      return;
    }
    if (mode === 'online') {
      net.waiting = true; // the move is shown when the server confirms it
      netSend({ t: 'move', pit: i });
      drawAll();
      return;
    }
    move(i);
  }

  // Flies the seeds in pit k to player p's score. `shown` holds the scores on screen.
  async function toScore(k, p, shown, n, id) {
    await wait(n * 140);
    if (id !== gameId) return;
    const el = scoreEl(p);
    const from = centre(bowlOf(k)), seeds = view[k];
    const flyer = makeHand(seeds, k, from);
    pitEls[k].classList.remove('taken');
    view[k] = 0;
    drawPit(k);
    await fly(flyer, from, centre(el), 560, 24);
    flyer.remove();
    if (id !== gameId) return;
    shown[p] += seeds;
    el.textContent = shown[p];
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
    sfx.rattle(seeds);
  }

  async function move(i) {
    const id = gameId, before = state, res = E.play(state, i);
    // The daily try is saved at once, so leaving mid-move cannot give a second try.
    const rec = mode === 'daily' ? saveDaily(i, res) : null;
    note = '';
    locked = true;
    drawAll();
    view = before.pits.slice();
    view[i] = 0;
    drawPit(i);
    pitEls[i].classList.add('lift');
    let left = before.pits[i], pos = centre(bowlOf(i));
    const hand = makeHand(left, i, pos);
    sfx.rattle(left);
    await wait(220);
    const hop = Math.max(150, Math.min(270, Math.round(2400 / res.steps.length)));
    for (const s of res.steps) {
      if (id !== gameId) return;
      const to = centre(bowlOf(s));
      await fly(hand, pos, to, hop, pos.w * 0.4);
      if (id !== gameId) return;
      pos = to;
      left--;
      view[s]++;
      drawPit(s);
      pulse(s);
      sfx.drop(view[s]);
      if (left) setHand(hand, left, i);
      else hand.remove();
      await wait(60);
    }
    hand.remove();
    if (id !== gameId) return;
    pitEls[i].classList.remove('lift');
    if (res.captured.length) {
      await wait(240);
      if (id !== gameId) return;
      res.captured.forEach((k) => pitEls[k].classList.add('taken'));
      sfx.knock();
      await wait(420);
      if (id !== gameId) return;
      const shown = before.score.slice();
      await Promise.all(res.captured.map((k, n) => toScore(k, before.turn, shown, n, id)));
      if (id !== gameId) return;
      await wait(200);
      if (id !== gameId) return;
    }
    if (res.state.sweep && mode !== 'daily') {
      // The game is over: the seeds left on each side fly to that side's score.
      await wait(400);
      if (id !== gameId) return;
      const shown = res.state.score.map((v, p) => v - res.state.sweep[p]);
      let n = 0;
      await Promise.all(view.map((seeds, k) => (seeds ? toScore(k, E.owner(k), shown, n++, id) : null)));
      if (id !== gameId) return;
    }
    state = res.state;
    view = state.pits.slice();
    locked = false;
    if (mode === 'daily') return finishDaily(rec, id);
    drawAll();
    if (state.over) {
      await wait(600);
      if (id === gameId) endGame();
      return;
    }
    if (mode === 'ai' && state.turn === 1) {
      locked = true;
      thinking = true;
      drawAll();
      await wait(550);
      thinking = false;
      if (id !== gameId) return;
      const m = E.bestMove(state, DEPTH[level], BLUNDER[level]);
      locked = false;
      move(m);
    }
  }

  // ---------- results ----------
  function showResult(title, text, mainLabel, mainAction) {
    $('#resultTitle').textContent = title;
    $('#resultText').textContent = text;
    $('#resultMain').textContent = mainLabel;
    $('#resultMain').onclick = mainAction;
    $('#shareText').hidden = true;
    $('#result').hidden = false;
    $('#result').scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
  }

  function endGame() {
    if (mode === 'online') return endOnline();
    const [a, b] = state.score, w = state.winner;
    let title;
    if (w === -1) title = 'A draw';
    else if (mode === 'ai') title = w === 0 ? 'You win' : 'The computer wins';
    else title = w === 0 ? 'Player 1 wins' : 'Player 2 wins';
    if (mode === 'ai' && w === 0) {
      const wins = store.get('wins', {});
      wins[level] = (wins[level] || 0) + 1;
      store.set('wins', wins);
    }
    const tail = state.sweep ? ' No more moves were possible, so each player kept the seeds on their side.' : '';
    showResult(title, `Final score ${a} to ${b}.${tail}`, 'Play again', () => startGame(mode));
    sfx.tune(w === 1 && mode === 'ai' ? [392, 330, 262] : [392, 494, 587, 784]);
  }

  function showDailyResult(rec) {
    view = puzzle.state.pits.slice();
    state = puzzle.state;
    drawAll();
    pitEls[puzzle.best].classList.add('best');
    if (!rec.solved && rec.picked != null) pitEls[rec.picked].classList.add('wrong');
    const text = rec.solved
      ? `You found the best pit and captured ${puzzle.gain} seeds. A new challenge arrives tomorrow.`
      : `Your pit captured ${rec.gain}. The pit with the solid green ring captured ${puzzle.gain}. Try again tomorrow.`;
    showResult(rec.solved ? 'Solved' : 'Not this time', text, 'Copy result', () => share(rec));
  }

  function saveDaily(i, res) {
    const prev = store.get('daily', {});
    const solved = i === puzzle.best;
    const streak = solved ? (prev.last === yesterday() ? (prev.streak || 0) + 1 : 1) : 0;
    const rec = { last: today(), solved, gain: res.gain, picked: i, streak, best: Math.max(prev.best || 0, streak) };
    store.set('daily', rec);
    return rec;
  }

  async function finishDaily(rec, id) {
    puzzle.done = true;
    drawAll();
    sfx.tune(rec.solved ? [494, 587, 784] : [330, 262]);
    await wait(1000);
    if (id !== gameId) return;
    showDailyResult(rec);
  }

  function share(rec) {
    const text = `${Brand.NAME} daily challenge ${rec.last}\n${rec.solved ? 'Solved' : 'Missed'}: ${rec.gain} of ${puzzle.gain} seeds captured\nStreak: ${rec.streak} day${rec.streak === 1 ? '' : 's'}`;
    const box = $('#shareText');
    const fallback = () => { box.value = text; box.hidden = false; box.focus(); box.select(); };
    try {
      navigator.clipboard.writeText(text).then(() => { $('#resultMain').textContent = 'Copied'; }, fallback);
    } catch { fallback(); }
  }

  // ---------- screens ----------
  function show(name) {
    $('#home').hidden = name !== 'home';
    $('#game').hidden = name !== 'game';
    $('#back').hidden = name === 'home';
    window.scrollTo(0, 0);
  }

  function resetBoard() {
    gameId++;
    locked = false;
    note = '';
    pitEls.forEach((el) => el.classList.remove('best', 'wrong', 'taken', 'lift', 'pulse'));
    fx.replaceChildren();
    thinking = false;
    $('#scoreTop').classList.remove('bump');
    $('#scoreBottom').classList.remove('bump');
    $('#result').hidden = true;
    $('#resultMain').disabled = false;
    $('#invite').hidden = true;
    $('#reacts').hidden = mode !== 'online' || !rival();
    net.busy = false;
  }

  function startGame(m) {
    mode = m;
    orient(0);
    resetBoard();
    state = E.start();
    view = state.pits.slice();
    $('#prompt').hidden = true;
    $('#nameTop').textContent = m === 'ai' ? `Computer (${level})` : 'Player 2';
    $('#nameBottom').textContent = m === 'ai' ? 'You' : 'Player 1';
    drawAll();
    show('game');
  }

  function startDaily() {
    mode = 'daily';
    orient(0);
    resetBoard();
    puzzle = E.dailyPuzzle(today());
    state = puzzle.state;
    view = state.pits.slice();
    $('#nameTop').textContent = 'Opponent';
    $('#nameBottom').textContent = 'You';
    $('#prompt').textContent = 'Your move, bottom row. Which pit captures the most seeds? You get one try.';
    $('#prompt').hidden = false;
    const rec = store.get('daily', {});
    puzzle.done = rec.last === today();
    drawAll();
    show('game');
    if (puzzle.done) showDailyResult(rec);
  }

  function drawHome() {
    const rec = store.get('daily', {});
    const alive = rec.last === today() || rec.last === yesterday();
    $('#streakN').textContent = alive ? rec.streak || 0 : 0;
    $('#streakBest').textContent = `Best ${rec.best || 0}`;
    const done = rec.last === today();
    $('#playDaily').textContent = done ? "See today's result" : "Play today's challenge";
    $('#dailyNote').textContent = done
      ? 'You played today. A new position arrives at midnight.'
      : 'One position, one try. Find the pit that captures the most seeds.';
    const wins = store.get('wins', {});
    const n = (wins.easy || 0) + (wins.medium || 0) + (wins.hard || 0);
    $('#winsNote').textContent = n ? `You have beaten the computer ${n} time${n === 1 ? '' : 's'}.` : 'First to capture 25 seeds wins.';
    const radio = document.querySelector(`input[name="level"][value="${level}"]`);
    if (radio) radio.checked = true;
  }

  function goHome() {
    leaveOnline();
    gameId++;
    fx.replaceChildren();
    drawHome();
    show('home');
  }

  // ---------- online play ----------
  // The server keeps the list of moves. This page replays that list, one animated move at a time.
  const EMOJI = ['\u{1F44D}', '\u{1F602}', '\u{1F62E}', '\u{1F622}', '\u{1F525}'];
  const pid = (() => {
    let v = store.get('pid', null);
    if (!v) {
      v = window.crypto && crypto.randomUUID ? crypto.randomUUID() : `p${Date.now()}${Math.random().toString(36).slice(2)}`;
      store.set('pid', v);
    }
    return v;
  })();
  const hashCode = () => { const m = /^#g-([a-z2-9]{6})$/.exec(location.hash); return m ? m[1] : null; };
  const myName = () => $('#nick').value.trim().slice(0, 16) || 'Player';
  const netSend = (msg) => { try { net.ws.send(JSON.stringify(msg)); } catch { /* the reconnect loop will recover */ } };

  function connect() {
    const code = net.code;
    const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/room/${code}/ws`);
    net.ws = ws;
    ws.onopen = () => { net.retry = 0; netSend({ t: 'join', id: pid, name: myName() }); };
    ws.onmessage = (ev) => {
      if (net.ws !== ws) return;
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.t === 'state') onSnapshot(msg);
      else if (msg.t === 'react') showReaction(msg.seat, msg.e);
      else if (msg.t === 'full') { leaveOnline(); goHome(); onlineError('That game already has two players. Create a new one.'); }
    };
    ws.onclose = () => {
      if (net.ws !== ws || net.code !== code) return;
      net.down = true;
      if (state) drawAll();
      net.pending = setTimeout(connect, Math.min(8000, 1000 * 2 ** net.retry++));
    };
  }

  function joinOnline(code) {
    leaveOnline();
    store.set('nick', myName());
    mode = 'online';
    Object.assign(net, { code, seat: null, snap: null, applied: 0, game: -1, busy: false, waiting: false, down: false, retry: 0 });
    try { history.replaceState(null, '', `#g-${code}`); } catch { location.hash = `g-${code}`; }
    orient(0);
    resetBoard();
    state = E.start();
    view = state.pits.slice();
    $('#prompt').hidden = true;
    $('#nameTop').textContent = 'Waiting for a friend';
    $('#nameBottom').textContent = 'You';
    drawAll();
    show('game');
    connect();
  }

  function leaveOnline() {
    if (!net.code) return;
    clearTimeout(net.pending);
    const ws = net.ws;
    net.ws = null;
    net.code = null;
    net.snap = null;
    try { ws.close(); } catch { /* already closed */ }
    try { history.replaceState(null, '', location.pathname); } catch { /* keep the link */ }
    $('#invite').hidden = true;
    $('#reacts').hidden = true;
    mode = null;
    orient(0);
  }

  function onSnapshot(s) {
    net.snap = s;
    net.seat = s.you;
    net.down = false;
    net.waiting = false;
    if (s.game !== net.game || s.moves.length < net.applied) { // first picture, a rematch, or we are out of step
      net.game = s.game;
      orient(s.you);
      resetBoard();
      state = E.start();
      state.turn = s.starter;
      view = state.pits.slice();
      net.applied = 0;
    }
    const r = rival();
    $('#nameBottom').textContent = `${s.players[s.you].name} (you)`;
    $('#nameTop').textContent = r ? r.name : 'Waiting for a friend';
    $('#invite').hidden = !!r;
    $('#reacts').hidden = !r;
    if (!r) $('#inviteLink').value = `${location.origin}${location.pathname}#g-${net.code}`;
    if (state.over && !$('#result').hidden) endOnline();
    sync();
  }

  async function sync() {
    if (net.busy || !net.snap) return;
    const moves = net.snap.moves;
    if (net.applied >= moves.length) { drawAll(); return; }
    // Far behind (a reload or a long disconnect): catch up without animation, then animate only the last move.
    while (moves.length - net.applied > 1) state = E.play(state, moves[net.applied++]).state;
    view = state.pits.slice();
    net.busy = true;
    const g = gameId;
    await move(moves[net.applied++]);
    if (g !== gameId) return;
    net.busy = false;
    sync();
  }

  function endOnline() {
    const s = net.snap, r = rival(), w = state.winner, me = net.seat;
    const title = w === -1 ? 'A draw' : w === me ? 'You win' : `${r ? r.name : 'Your friend'} wins`;
    const tail = state.sweep ? ' No more moves were possible, so each player kept the seeds on their side.' : '';
    const asked = s.rematch[me], theyAsked = s.rematch[1 - me];
    const first = $('#result').hidden;
    showResult(title, `Final score ${state.score[me]} to ${state.score[1 - me]}.${tail}${theyAsked && !asked ? ` ${r.name} wants a rematch.` : ''}`,
      asked ? `Waiting for ${r ? r.name : 'your friend'}` : 'Rematch', () => netSend({ t: 'rematch' }));
    $('#resultMain').disabled = asked;
    if (first) sfx.tune(w === me || w === -1 ? [392, 494, 587, 784] : [392, 330, 262]);
  }

  function showReaction(seat, e) {
    const bar = seat === bottom ? $('#barBottom') : $('#barTop');
    const el = document.createElement('span');
    el.className = 'react-pop';
    el.textContent = EMOJI[e] || '';
    bar.appendChild(el);
    setTimeout(() => el.remove(), 1700);
    sfx.rattle(2);
  }

  function onlineError(text) {
    $('#onlineError').textContent = text;
    $('#onlineError').hidden = !text;
  }

  async function createOnline() {
    onlineError('');
    const pending = hashCode();
    if (pending) return joinOnline(pending);
    $('#playOnline').disabled = true;
    try {
      const res = await fetch('/api/room', { method: 'POST' });
      if (!res.ok) throw new Error(String(res.status));
      joinOnline((await res.json()).code);
    } catch {
      onlineError('Could not reach the game server. Check your connection and try again.');
    }
    $('#playOnline').disabled = false;
  }

  // The online card only appears where a game server answers (not in the offline preview).
  async function setupOnline() {
    EMOJI.forEach((ch, e) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = ch;
      b.setAttribute('aria-label', ['Thumbs up', 'Laughing', 'Surprised', 'Sad', 'Fire'][e]);
      b.addEventListener('click', () => netSend({ t: 'react', e }));
      $('#reacts').appendChild(b);
    });
    $('#nick').value = store.get('nick', '');
    $('#playOnline').addEventListener('click', createOnline);
    $('#inviteCopy').addEventListener('click', () => {
      const box = $('#inviteLink'), done = () => { $('#inviteCopy').textContent = 'Copied'; };
      const select = () => { box.focus(); box.select(); };
      try { navigator.clipboard.writeText(box.value).then(done, select); } catch { select(); }
    });
    if (navigator.share) {
      $('#inviteShare').hidden = false;
      $('#inviteShare').addEventListener('click', () => {
        navigator.share({ title: Brand.NAME, text: `Play ${Brand.NAME} with me`, url: $('#inviteLink').value }).catch(() => {});
      });
    }
    try {
      if (!/^https?:$/.test(location.protocol)) return;
      const res = await fetch('/api/ping', { cache: 'no-store' });
      if (!res.ok || !(await res.json()).ok) return;
    } catch { return; }
    $('#onlineCard').hidden = false;
    if (hashCode()) {
      $('#onlineTitle').textContent = 'Your friend invited you to play';
      $('#onlineNote').textContent = 'Type your name and join their game.';
      $('#playOnline').textContent = 'Join the game';
      if (store.get('nick', '')) joinOnline(hashCode()); // a returning player goes straight in
    }
  }

  // ---------- brand and opening screen ----------
  // The header logo is drawn at a whole number of screen pixels per art pixel, so it stays sharp.
  const dpr = window.devicePixelRatio || 1;
  const logoArt = Pixel.logoCanvas(3), logoK = Math.max(1, Math.round(dpr));
  const headerLogo = document.createElement('canvas');
  headerLogo.width = logoArt.width * logoK;
  headerLogo.height = logoArt.height * logoK;
  const hctx = headerLogo.getContext('2d');
  hctx.imageSmoothingEnabled = false;
  hctx.drawImage(logoArt, 0, 0, headerLogo.width, headerLogo.height);
  headerLogo.style.width = headerLogo.width / dpr + 'px';
  headerLogo.style.height = headerLogo.height / dpr + 'px';
  headerLogo.setAttribute('role', 'img');
  headerLogo.setAttribute('aria-label', Brand.NAME);
  $('#brand').appendChild(headerLogo);
  $('#weave').innerHTML = Brand.seedBand();

  // The title screen covers the page from the first paint (see index.html) and is skipped on return visits.
  function intro() {
    const el = $('#intro'), cv = $('#introCv'), app = document.querySelector('.app');
    if (el.hidden) return;
    try { sessionStorage.setItem('oware.intro', '1'); } catch { /* it will show again next time */ }
    let open = true, timer = 0, byKey = false;
    app.inert = true; // nothing behind the title can be tapped, tabbed to or read out
    app.setAttribute('aria-hidden', 'true');
    const onKey = (e) => {
      if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Escape') return;
      e.preventDefault();
      byKey = true;
      close();
    };
    const close = () => {
      if (!open) return;
      open = false;
      clearTimeout(timer);
      document.removeEventListener('keydown', onKey);
      app.inert = false;
      app.removeAttribute('aria-hidden');
      el.classList.add('out'); // it keeps swallowing taps while it fades
      setTimeout(() => {
        el.hidden = true;
        const next = [$('#playOnline'), $('#playDaily')].find((b) => b.offsetParent);
        if (byKey && next) next.focus({ preventScroll: true });
      }, 450);
    };
    el.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    try { el.focus({ preventScroll: true }); } catch { /* older browsers */ }
    // Let the dark cover paint first, then build the art in its own task.
    requestAnimationFrame(() => setTimeout(() => {
      if (!open) return;
      // Whole screen pixels per art pixel: square, even pixels on every screen.
      const pw = innerWidth * dpr, ph = innerHeight * dpr;
      let s = Math.max(1, Math.floor(Math.min(pw / 156, ph / Pixel.AH))), W, H;
      for (;;) {
        W = Math.max(156, Math.ceil(pw / s));
        H = Math.max(Pixel.AH, Math.ceil(ph / s));
        if (W * H <= 260000) break;
        s++; // very large screens: bigger pixels keep the drawing fast
      }
      cv.width = W;
      cv.height = H;
      cv.style.width = (W * s) / dpr + 'px';
      cv.style.height = (H * s) / dpr + 'px';
      const art = Pixel.title(W, H);
      if (reduced) Pixel.drawTitle(cv, art, Infinity);
      else {
        const t0 = performance.now();
        const frame = (now) => { if (!open) return; Pixel.drawTitle(cv, art, now - t0); requestAnimationFrame(frame); };
        requestAnimationFrame(frame);
      }
      timer = setTimeout(close, 9000); // never trap a player on the title screen
    }, 30));
  }

  // ---------- wiring ----------
  buildBoard();
  intro();
  setupOnline();
  drawSound();
  drawHome();
  $('#sound').addEventListener('click', () => { soundOn = !soundOn; store.set('sound', soundOn); drawSound(); sfx.drop(); });
  $('#back').addEventListener('click', goHome);
  $('#resultHome').addEventListener('click', goHome);
  $('#playDaily').addEventListener('click', startDaily);
  $('#playAi').addEventListener('click', () => startGame('ai'));
  $('#playLocal').addEventListener('click', () => startGame('local'));
  document.querySelectorAll('input[name="level"]').forEach((r) =>
    r.addEventListener('change', () => { level = r.value; store.set('level', level); }));
})();
