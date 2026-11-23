(() => {
  'use strict';
  const E = Engine;
  const $ = (s) => document.querySelector(s);
  const isTV = Config.TV || /Web0S|webOS|SmartTV|Tizen/i.test(navigator.userAgent); // remote-control layout
  const YOUR_TURN = isTV ? 'Your turn. Choose a pit with a gold ring and press OK.' : 'Your turn. Tap a pit with a gold ring.';
  const DEPTH = { easy: 1, medium: 3, hard: 9 };
  const BLUNDER = { easy: 0.35, medium: 0.05, hard: 0 };

  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => fmt(new Date());
  const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return fmt(d); };

  // Saved on this device only. The game must still work when storage is blocked.
  const store = {
    get(k, d) { try { let v = localStorage.getItem('oware.' + k); if (v == null) v = localStorage.getItem('imbewu.' + k); // 'imbewu.' is the old name
      return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('oware.' + k, JSON.stringify(v)); } catch { /* ignore */ } },
  };

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  let mode = null, level = store.get('level', 'easy');
  let hadTurn = false; // TV: whether the last drawing already had pits the player could choose
  let freeArmed = false; // "Invite someone else" was tapped once and waits for a second tap
  let bottom = 0; // the player whose pits are on the bottom row
  const net = { tapped: null, conn: 0, ws: null, code: null, seat: null, snap: null, applied: 0, game: -1, busy: false, waiting: false, phase: 'idle', retry: 0, ticket: 0, pending: 0, beat: 0, pong: 0, sent: 0 };
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
      b.dataset.slot = n; // 0-5 top row, 6-11 bottom row, left to right
      b.innerHTML = '<span class="bowl"><span class="seeds"></span></span><span class="count"></span>';
      b.addEventListener('click', () => onPit(i));
      boardEl.appendChild(b);
      pitEls[i] = b;
    }
    const inlay = document.createElement('span');
    inlay.className = 'inlay';
    boardEl.appendChild(inlay);
    bowlSide = 0;
    sizeBowls();
  }

  // On TVs every part of the board is placed at a fixed pixel position, the way the Photo Frame TV app is built.
  // Older TV browsers lay out grid, flex buttons and aspect-ratio wrongly, so the board does not use them there.
  // The numbers are in the game's own pixels; fit() then enlarges the whole game to the screen.
  const FIXED = isTV || document.documentElement.classList.contains('old');
  const B = { W: 528, padX: 12, padTop: 14, padBottom: 18, gap: 8, rowGap: 22, num: 22, numGap: 4, side: 0 };
  let bowlSide = 0;
  function sizeBowls() {
    if (!FIXED) return;
    const app = document.querySelector('.app');
    B.W = Math.max(280, Math.min(528, (app && app.clientWidth) || 528)); // narrow phones get a narrower board
    B.side = Math.floor((B.W - 2 * B.padX - 5 * B.gap) / 6);
    if (bowlSide === B.side) return;
    bowlSide = B.side;
    const { W, padX, padTop, padBottom, gap, rowGap, num, numGap, side } = B;
    const pitH = side + numGap + num;
    boardEl.classList.add('fixed');
    boardEl.style.width = W + 'px';
    boardEl.style.height = padTop + 2 * pitH + rowGap + padBottom + 'px';
    for (const el of pitEls) {
      const slot = +el.dataset.slot, top = slot < 6, col = slot % 6;
      el.style.left = padX + col * (side + gap) + 'px';
      el.style.top = (top ? padTop : padTop + pitH + rowGap) + 'px';
      el.style.width = side + 'px';
      el.style.height = pitH + 'px';
      const bowl = el.querySelector('.bowl'), count = el.querySelector('.count');
      bowl.style.top = (top ? num + numGap : 0) + 'px';
      bowl.style.width = bowl.style.height = side + 'px';
      count.style.top = (top ? 0 : side + numGap) + 'px';
      count.style.width = side + 'px';
      count.style.height = count.style.lineHeight = num + 'px';
    }
    const inlay = boardEl.querySelector('.inlay');
    inlay.style.top = padTop + pitH + Math.round(rowGap / 2) - 1 + 'px';
    if (state) for (let i = 0; i < 12; i++) drawPit(i); // seeds are sized from the pit
  }

  // `ref` is the pit's size in pixels. With it, each seed gets an exact size, which every browser draws the same.
  function seedsHTML(n, i, ref = bowlSide) {
    const shown = Math.min(n, 30);
    const size = n <= 5 ? 26 : n <= 10 ? 21 : n <= 16 ? 17 : 14;
    let h = '';
    for (let k = 0; k < shown; k++) {
      const r = shown === 1 ? 0 : 36 * Math.sqrt((k + 0.5) / Math.max(shown, 4));
      const a = k * 2.39996 + i * 0.7;
      h += `<i class="seed s${(k + i) % 3}" style="left:${(50 + r * Math.cos(a)).toFixed(1)}%;top:${(50 + r * Math.sin(a)).toFixed(1)}%;${ref ? `width:${(ref * size / 100).toFixed(1)}px;height:${(ref * size / 100).toFixed(1)}px` : `width:${size}%;padding-bottom:${size}%`}"></i>`;
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
    hand.innerHTML = `<span class="seeds">${seedsHTML(n, i, parseFloat(hand.style.width) || 0)}</span><b>${n}</b>`;
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
    // Old engines have no `finished` promise on an animation.
    const done = anim.finished || new Promise((res) => { anim.onfinish = res; anim.oncancel = res; });
    return done.catch(() => {});
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
        : mode === 'online' ? net.phase === 'live' && state.turn === net.seat && bothIn() && !net.waiting
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
    // On a TV, when it becomes your turn the remote's focus goes to a pit you can play,
    // unless the player is answering a question in a panel.
    if (isTV && can.length) {
      const f = document.activeElement, onPit = pitEls.indexOf(f), inPanel = f && f.closest && f.closest('#leave, #result');
      const lost = !f || f === document.body || f.offsetParent === null || (onPit !== -1 && !can.includes(onPit));
      if (!inPanel && (lost || !hadTurn)) pitEls[can[0]].focus();
    }
    hadTurn = can.length > 0;
    let s = note;
    const online = mode === 'online';
    // Connection trouble is always shown, also after the game has ended.
    if (!s && online && net.phase === 'connecting') s = 'Connecting';
    else if (!s && online && net.phase === 'down') s = 'Connection lost. Reconnecting';
    else if (!s && online && net.phase === 'replaced') s = 'This game is now open in another tab or on another device.';
    else if (!s && live) {
      if (mode === 'ai') s = state.turn === 1 ? (thinking ? 'The computer is thinking' : 'The computer is playing') : locked ? 'Sowing your seeds' : YOUR_TURN;
      else if (mode === 'local') s = state.turn === 0 ? 'Player 1 to play' : 'Player 2 to play';
      else if (online) {
        const r = rival();
        if (!r) s = 'Waiting for your friend to join';
        else if (net.waiting) s = 'Sending your move';
        else if (state.turn === net.seat) s = locked ? 'Sowing your seeds' : r.online ? YOUR_TURN : `${r.name} is offline. You can still play your move.`;
        else s = r.online ? `${r.name} is playing` : `${r.name} is offline. The game waits for them.`;
      }
    }
    $('#status').textContent = s;
    const on = online && !!net.snap, r = on ? rival() : null;
    // The creator can replace a friend who is away, before the game starts. It takes two taps.
    const canFree = !!(on && net.phase === 'live' && net.seat === 0 && r && !r.online && !net.snap.moves.length);
    if (!canFree) freeArmed = false;
    $('#free').hidden = !canFree;
    $('#free').textContent = canFree && freeArmed ? `Remove ${r.name} and invite someone else` : 'Invite someone else';
    $('#takeover').hidden = !(online && net.phase === 'replaced');
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
      net.tapped = i;
      pitEls[i].classList.add('lift'); // an instant sign that the tap was received
      netSend({ t: 'move', pit: i, n: net.snap.moves.length });
      clearTimeout(net.sent);
      net.sent = setTimeout(dropped, 5000); // no answer: reconnect and unlock the board
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
    const opening = $('#result').hidden;
    $('#result').hidden = false;
    if (opening) $('#resultMain').focus({ preventScroll: true });
    fit(); // on big screens the board shrinks a little so the panel fits
    reveal($('#result'));
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
  // The TV starts its screen saver over a still picture unless media plays. A tiny silent video keeps a game on screen.
  let keep = null;
  function keepAwake(on) {
    if (!Config.TV) return; // only the packaged TV app carries the video file
    if (!keep) {
      if (!on) return;
      keep = document.createElement('video');
      keep.src = 'keepawake.mp4';
      keep.muted = true;
      keep.loop = true;
      keep.setAttribute('muted', '');
      keep.setAttribute('playsinline', '');
      keep.style.cssText = 'position:fixed;left:0;top:0;width:16px;height:16px;opacity:0.01;pointer-events:none';
      document.body.appendChild(keep);
    }
    if (on) { const p = keep.play(); if (p && p.catch) p.catch(() => {}); } else keep.pause();
  }

  function show(name) {
    $('#home').hidden = name !== 'home';
    $('#game').hidden = name !== 'game';
    $('#join').hidden = name !== 'join';
    $('#send').hidden = name !== 'send';
    document.querySelector('.app').classList.toggle('wide', isTV && name === 'home'); // TV home screen uses two columns
    document.documentElement.classList.toggle('tvhome', isTV && name === 'home'); // and fits the screen, with no scrolling
    if (isTV && name !== 'home') document.querySelector('.app').classList.remove('wide');
    if (typeof tvLayout === 'function') tvLayout();
    $('#back').hidden = name === 'home';
    sizeBowls();
    fit();
    keepAwake(name === 'game');
    window.scrollTo(0, 0);
    if (isTV) setTimeout(() => { const c = homeControl(); if (c) c.focus(); }, 50);
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
    $('#leave').hidden = true;
    notify('');
    tvLayout();
    $('#reacts').hidden = mode !== 'online' || !rival();
    net.busy = false;
    net.ticket++;
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
    $('#resume').hidden = !store.get('room', null);
    const radio = document.querySelector(`input[name="level"][value="${level}"]`);
    if (radio) radio.checked = true;
  }

  function goHome() {
    if (mode === 'online' && state && state.over) store.set('room', null); // a finished game is not offered again
    if (invite) { invite = null; setHash(null); }
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
  // A game link that was opened but not joined yet. Kept here, not re-read from the address bar.
  let invite = (() => { const m = /^#g-([a-z2-9]{6})$/.exec(location.hash); return m ? m[1] : null; })();
  // A TV game's QR code opens #s-code: a page on the TV owner's phone for sending the game link on to a friend.
  let sendCode = (() => { const m = /^#s-([a-z2-9]{6})$/.exec(location.hash); return m ? m[1] : null; })();
  const myName = () => ($('#nick').value.trim() || $('#joinNick').value.trim()).slice(0, 16) || 'Player';
  const setHash = (code) => { try { history.replaceState(null, '', code ? `#g-${code}` : location.pathname); } catch { /* keep the address */ } };
  // '' means the site this page came from. The TV app names the server in full (see config.js).
  const api = (path) => Config.SERVER + path;
  const wsBase = () => (Config.SERVER || location.origin).replace(/^http/, 'ws');
  const pageBase = () => (Config.SERVER ? Config.SERVER + '/' : location.origin + location.pathname);
  const linkFor = (code) => `${pageBase()}#g-${code}`;
  const sendLinkFor = (code) => `${pageBase()}#s-${code}`;
  const netSend = (msg) => { try { if (net.ws && net.ws.readyState === 1) net.ws.send(JSON.stringify(msg)); } catch { /* the reconnect loop will recover */ } };

  function connect() {
    clearTimeout(net.pending);
    const code = net.code;
    if (!code) return;
    if (net.phase !== 'down') net.phase = 'connecting';
    const old = net.ws; // never more than one connection at a time
    net.ws = null;
    try { if (old) old.close(); } catch { /* already closed */ }
    clearTimeout(net.conn);
    net.conn = setTimeout(() => { if (net.code === code && net.phase !== 'live' && net.phase !== 'replaced') dropped(); }, 10000);
    const ws = new WebSocket(`${wsBase()}/api/room/${code}/ws`);
    net.ws = ws;
    ws.onopen = () => netSend({ t: 'join', id: pid, name: myName() });
    ws.onmessage = (ev) => {
      if (net.ws !== ws) return;
      clearTimeout(net.pong);
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.t === 'state') onSnapshot(msg);
      else if (msg.t === 'react') showReaction(msg.seat, msg.e);
      else if (msg.t === 'full') failOnline('That game already has two players. Create a new one.');
      else if (msg.t === 'gone') failOnline('This game link is not valid or has expired.');
      else if (msg.t === 'replaced') { // the same player opened the game in another tab or on another device
        net.ws = null;
        net.phase = 'replaced';
        untap();
        clearTimeout(net.sent);
        drawAll();
      }
    };
    ws.onclose = () => { if (net.ws === ws && net.code === code) dropped(); };
  }

  // The connection is lost or silent: say so, unlock the board and keep trying.
  function dropped() {
    if (!net.code || net.phase === 'replaced') return;
    const ws = net.ws;
    net.ws = null;
    try { if (ws) ws.close(); } catch { /* already closed */ }
    net.phase = 'down';
    untap();
    clearTimeout(net.sent);
    clearTimeout(net.pong);
    if (state) drawAll();
    if (state && state.over && !$('#result').hidden) endOnline();
    clearTimeout(net.pending);
    net.pending = setTimeout(connect, Math.min(8000, 500 * 2 ** net.retry++));
  }
  // The tapped pit is no longer waiting for the server.
  function untap() {
    net.waiting = false;
    if (net.tapped != null && pitEls[net.tapped]) pitEls[net.tapped].classList.remove('lift');
    net.tapped = null;
  }
  // Asks the server for a sign of life. No answer in 5 seconds means the connection is dead.
  function heartbeat() {
    if (net.phase !== 'live') return;
    netSend({ t: 'ping' });
    clearTimeout(net.pong);
    net.pong = setTimeout(dropped, 5000);
  }

  function joinOnline(code) {
    if (!code) return;
    leaveOnline();
    invite = null;
    store.set('nick', myName());
    mode = 'online';
    Object.assign(net, { code, seat: null, snap: null, applied: 0, game: -1, busy: false, waiting: false, phase: 'connecting', retry: 0 });
    setHash(code);
    orient(0);
    resetBoard();
    state = E.start();
    view = state.pits.slice();
    $('#prompt').hidden = true;
    $('#nameTop').textContent = 'Connecting';
    $('#nameBottom').textContent = 'You';
    drawAll();
    show('game');
    net.beat = setInterval(heartbeat, 10000);
    connect();
  }

  function leaveOnline() {
    if (!net.code) return;
    clearTimeout(net.pending);
    clearTimeout(net.pong);
    clearTimeout(net.sent);
    clearTimeout(net.conn);
    clearInterval(net.beat);
    const ws = net.ws;
    net.ws = null;
    net.code = null;
    net.snap = null;
    net.phase = 'idle';
    try { if (ws) ws.close(); } catch { /* already closed */ }
    setHash(null);
    $('#invite').hidden = true;
    $('#reacts').hidden = true;
    $('#leave').hidden = true;
    mode = null;
    orient(0);
  }

  // The game cannot be joined: go home and say why.
  function failOnline(text) {
    if (store.get('room', null) === net.code) store.set('room', null); // only forget the game that failed
    leaveOnline();
    goHome();
    notify(text);
  }

  function onSnapshot(s) {
    clearTimeout(net.sent);
    net.snap = s;
    net.seat = s.you;
    net.phase = 'live';
    net.retry = 0;
    untap();
    if (store.get('room', null) !== net.code) store.set('room', net.code); // saved once the server has given us a seat
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
    if (!r && $('#invite').hidden) $('#inviteCopy').textContent = 'Copy link'; // a new invite has not been copied yet
    $('#invite').hidden = !!r;
    tvLayout();
    $('#reacts').hidden = !r;
    if (!r && $('#inviteLink').value !== linkFor(net.code)) {
      $('#inviteLink').value = linkFor(net.code);
      // On a TV the code opens the "send to a friend" page on the owner's own phone. Elsewhere it joins directly.
      drawQr($('#inviteQr'), isTV ? sendLinkFor(net.code) : linkFor(net.code));
      $('#inviteText').textContent = linkFor(net.code).replace(/^https?:\/\//, '');
      $('#inviteText').hidden = !isTV;
    }
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
    const s = net.snap, r = rival(), w = state.winner, me = net.seat, them = r ? r.name : 'Your friend';
    const title = w === -1 ? 'A draw' : w === me ? 'You win' : `${them} wins`;
    const score = `Final score ${state.score[me]} to ${state.score[1 - me]}.${state.sweep ? ' No more moves were possible, so each player kept the seeds on their side.' : ''}`;
    const first = $('#result').hidden;
    if (net.phase !== 'live') { // our own connection is down
      showResult(title, `${score} Connection lost. Reconnecting.`, 'Rematch', () => {});
      $('#resultMain').disabled = true;
    } else if (!r || !r.online) {
      showResult(title, `${score} ${them} is not connected right now.`, 'Back to home', goHome);
      $('#resultMain').disabled = false;
    } else {
      const asked = s.rematch[me], theyAsked = s.rematch[1 - me];
      showResult(title, `${score}${theyAsked && !asked ? ` ${them} wants a rematch.` : ''}`, asked ? `Waiting for ${them}` : 'Rematch', () => netSend({ t: 'rematch' }));
      $('#resultMain').disabled = asked;
    }
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

  // A notice at the top of the home screen, where it cannot be missed.
  function notify(text) {
    $('#notice').textContent = text;
    $('#notice').hidden = !text;
    if (text) window.scrollTo(0, 0);
  }

  // The QR code on a TV was scanned by the TV owner's phone: offer to send the game link to a friend.
  async function openSend(code) {
    sendCode = code;
    let info = null;
    try { info = await (await fetch(api(`/api/room/${code}`), { cache: 'no-store' })).json(); } catch { /* treated as not valid */ }
    if (sendCode !== code || !$('#game').hidden) return; // the player has moved on
    if (!info || !info.ok || info.full) {
      sendCode = null;
      setHash(null);
      show('home');
      notify(info && info.ok ? 'That TV game already has two players.' : 'This game link is not valid or has expired. Create a new game on the TV.');
      return;
    }
    const link = linkFor(code), host = info.host || 'A friend';
    const text = `${host} invites you to play ${Brand.NAME} on their TV. Open this link to join: ${link}`;
    $('#sendLink').textContent = link;
    $('#sendWhatsApp').href = `https://wa.me/?text=${encodeURIComponent(text)}`;
    $('#sendNote').textContent = '';
    $('#sendCopy').textContent = 'Copy link';
    $('#sendShare').hidden = !navigator.share;
    $('#sendShare').onclick = () => navigator.share({ title: Brand.NAME, text, url: link }).catch(() => {});
    $('#sendCopy').onclick = () => {
      const done = () => { $('#sendCopy').textContent = 'Copied'; $('#sendNote').textContent = 'Paste it into a message to your friend.'; };
      try { navigator.clipboard.writeText(link).then(done, () => { $('#sendNote').textContent = 'Press and hold the link above to copy it.'; }); } catch { $('#sendNote').textContent = 'Press and hold the link above to copy it.'; }
    };
    $('#sendJoin').onclick = () => { sendCode = null; openInvite(code); };
    show('send');
  }

  // A game link was opened: check it, then go straight in or ask for a name first.
  async function openInvite(code) {
    invite = code;
    let info = null;
    try { info = await (await fetch(api(`/api/room/${code}`), { cache: 'no-store' })).json(); } catch { /* treated as not valid */ }
    if (invite !== code || $('#game').hidden === false) return; // the player has moved on
    const mine = store.get('room', null) === code;
    if (!info || !info.ok || (info.full && !mine)) {
      invite = null;
      setHash(null);
      show('home');
      notify(info && info.ok ? 'That game already has two players. Ask your friend for a new link, or create a game.'
        : 'This game link is not valid or has expired. Ask your friend for a new one, or create a game.');
      return;
    }
    if (mine || store.get('nick', '')) return joinOnline(code); // a returning player goes straight in
    $('#joinTitle').textContent = info.host ? `${info.host} invited you to play` : 'You are invited to play';
    show('join');
    $('#joinNick').focus({ preventScroll: true });
  }

  // Draws a QR code for `text` on a canvas: dark squares on white, with the quiet border scanners need.
  function drawQr(cv, text) {
    try {
      const qr = qrcode(0, 'M');
      qr.addData(text);
      qr.make();
      const n = qr.getModuleCount(), q = 4, ctx = cv.getContext('2d');
      cv.width = cv.height = n + 2 * q;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = '#000';
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.isDark(y, x)) ctx.fillRect(x + q, y + q, 1, 1);
      cv.hidden = false;
    } catch { cv.hidden = true; }
  }

  function onlineError(text) {
    $('#onlineError').textContent = text;
    $('#onlineError').hidden = !text;
  }

  async function createOnline() {
    onlineError('');
    const ticket = ++net.ticket; // if the player starts something else while we wait, this reply is dropped
    $('#playOnline').disabled = true;
    try {
      const res = await fetch(api('/api/room'), { method: 'POST' });
      if (!res.ok) throw new Error(String(res.status));
      const { code } = await res.json();
      if (ticket === net.ticket && !$('#home').hidden) joinOnline(code);
    } catch {
      if (ticket === net.ticket) onlineError('Could not reach the game server. Check your connection and try again.');
    }
    $('#playOnline').disabled = false;
  }

  // Home during a live online game asks first, because leaving keeps the other player waiting.
  function askHome() {
    if (mode === 'online' && net.code && net.phase !== 'replaced' && state && !state.over) {
      $('#leave').hidden = false;
      $('#leaveNo').focus({ preventScroll: true });
      fit();
      reveal($('#leave'));
      return;
    }
    goHome();
  }

  // The online card only appears where a game server answers (not in the offline preview).
  async function setupOnline() {
    EMOJI.forEach((ch, e) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = ch;
      b.setAttribute('aria-label', ['Thumbs up', 'Laughing', 'Surprised', 'Sad', 'Fire'][e]);
      b.addEventListener('click', () => {
        netSend({ t: 'react', e });
        const all = [...$('#reacts').children]; // a short pause shows that taps in quick succession are not sent
        all.forEach((x) => { x.disabled = true; });
        setTimeout(() => all.forEach((x) => { x.disabled = false; }), 900);
      });
      $('#reacts').appendChild(b);
    });
    $('#nick').value = $('#joinNick').value = store.get('nick', '');
    $('#nick').addEventListener('input', () => { $('#joinNick').value = $('#nick').value; });
    $('#joinNick').addEventListener('input', () => { $('#nick').value = $('#joinNick').value; });
    $('#playOnline').addEventListener('click', createOnline);
    $('#resume').addEventListener('click', () => {
      const code = store.get('room', null);
      if (!code) { drawHome(); notify('That game is no longer saved on this device.'); return; }
      joinOnline(code);
    });
    const onEnter = (input, button) => $(input).addEventListener('keydown', (e) => { if (e.key === 'Enter' && !$(input).readOnly) { e.preventDefault(); $(button).click(); } });
    // On a TV, a text box opens the on-screen keyboard as soon as it is selected. So the name boxes stay locked
    // while the selection passes over them, and open only when the player presses OK on one.
    if (isTV) {
      for (const id of ['#nick', '#joinNick']) {
        const el = $(id), open = () => { el.blur(); el.readOnly = false; el.focus(); };
        el.readOnly = true;
        el.addEventListener('keydown', (e) => { if (e.keyCode === 13 && el.readOnly) { e.preventDefault(); e.stopImmediatePropagation(); open(); } });
        el.addEventListener('click', () => { if (el.readOnly) open(); });
        el.addEventListener('blur', () => { el.readOnly = true; });
      }
    }
    onEnter('#nick', '#playOnline');
    onEnter('#joinNick', '#joinGo');
    $('#joinGo').addEventListener('click', () => { if (invite) joinOnline(invite); else goHome(); });
    $('#joinNo').addEventListener('click', goHome);
    $('#leaveYes').addEventListener('click', goHome);
    $('#leaveNo').addEventListener('click', () => { $('#leave').hidden = true; });
    $('#free').addEventListener('click', () => {
      if (!freeArmed) { freeArmed = true; drawAll(); return; } // the first tap only says what will happen
      freeArmed = false;
      netSend({ t: 'free' });
    });
    $('#takeover').addEventListener('click', () => { net.phase = 'connecting'; drawAll(); connect(); });
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
    window.addEventListener('storage', () => { if (!$('#home').hidden) drawHome(); }); // keep in step with other tabs
    // A game link pasted or tapped into this already open page.
    window.addEventListener('hashchange', () => {
      const m = /^#g-([a-z2-9]{6})$/.exec(location.hash), sm = /^#s-([a-z2-9]{6})$/.exec(location.hash);
      if (m && m[1] !== net.code && $('#game').hidden && !$('#onlineCard').hidden) openInvite(m[1]);
      else if (sm && $('#game').hidden && !$('#onlineCard').hidden) openSend(sm[1]);
    });
    window.addEventListener('online', () => { if (net.code && net.phase === 'down') { net.retry = 0; connect(); } });
    window.addEventListener('offline', () => { if (net.code && net.ws) dropped(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) heartbeat(); }); // phones can cut a hidden page's connection

    if (!Config.SERVER && !/^https?:$/.test(location.protocol)) return; // opened as a file: there is no server
    // An installed app can start with no connection. Keep looking for the server, quietly, until it answers.
    for (let tries = 0; ; tries++) {
      try {
        const res = await fetch(api('/api/ping'), { cache: 'no-store' });
        if (res.ok && (await res.json()).ok) break;
      } catch { /* not reachable yet */ }
      await new Promise((r) => { const t = tries < 6 ? setTimeout(done, 30000) : 0; function done() { clearTimeout(t); window.removeEventListener('online', done); r(); } window.addEventListener('online', done); });
    }
    $('#onlineCard').hidden = false;
    drawHome();
    if (isTV) { // a TV has no browser to come back from, so show the address as text
      const where = document.createElement('span');
      where.textContent = `Privacy policy: ${api('/privacy').replace(/^https?:\/\//, '')}`;
      $('#privacyLink').replaceWith(where);
    } else $('#privacyLink').href = api('/privacy');
    if (isTV) {
      $('#inviteTitle').textContent = 'Invite a friend';
      $('#inviteHint').textContent = 'Scan this code with your phone, then send the link to a friend on WhatsApp. They play on their phone, from anywhere.';
      $('#onlineNote').textContent = 'Create a game, scan the code with your phone, and send the link to a friend.';
    }
    // Installed like an app: works offline for the modes that need no server.
    if (!Config.SERVER && 'serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/sw.js').catch(() => {});
    if (invite) openInvite(invite);
    else if (sendCode) openSend(sendCode);
  }

  // ---------- big screens ----------
  // On tablets, PCs and TVs the whole game is enlarged to use the screen. Phones are left alone.
  const appEl = document.querySelector('.app');
  function fit() {
    const w = innerWidth, h = innerHeight, game = $('#game');
    let need = 560;
    if (isTV && (!$('#home').hidden || !game.hidden)) {
      need = appEl.offsetHeight + 44; // every TV screen must fit without scrolling
      // Game screens keep room for the daily prompt and the reactions, so the board is the same size on every one.
      if (!game.hidden && !appEl.classList.contains('wide-game')) need = Math.max(need, 572);
    }
    else if (!game.hidden) { // the whole game screen, with any open panel, must fit the height
      let sum = 0, n = 0;
      for (const c of game.children) if (c.offsetHeight) { sum += c.offsetHeight; n++; }
      need = Math.max(560, 104 + sum + 12 * Math.max(0, n - 1) + 24);
    }
    // The game's own width. TV screens keep a 5% margin, inside the TV's safe area.
    const base = appEl.classList.contains('wide') ? 1150 : appEl.classList.contains('wide-game') ? 1060 : isTV ? 620 : 560;
    let z = w >= 700 ? Math.min((w - 32) / base, h / need) : 1;
    z = Math.round(Math.max(1, Math.min(3.5, z)) * 100) / 100;
    appEl.style.transform = z === 1 ? '' : `scale(${z})`;
    document.documentElement.style.setProperty('--avail', `${Math.floor(h / z)}px`); // the screen height in the game's own units
    appEl.style.marginBottom = z === 1 ? '' : `${Math.round((z - 1) * appEl.offsetHeight)}px`; // scaling does not move what follows, so make the room by hand
    // The TV home screen sits in the middle of the screen, top to bottom.
    const spare = isTV && (!$('#home').hidden || !game.hidden) ? Math.floor((h - appEl.offsetHeight * z - 44) / 2) : 0;
    document.documentElement.style.setProperty('--z', String(z)); // panels over the screen use the same size
    appEl.style.marginTop = spare > 8 ? spare + 'px' : '';
  }
  window.addEventListener('resize', () => { sizeBowls(); fit(); });
  // TV: while waiting for a friend, the invite card sits to the right of the board.
  function tvLayout() {
    if (!isTV) return;
    const waiting = !$('#game').hidden && !$('#invite').hidden;
    appEl.classList.toggle('wide-game', waiting);
    const right = $('#gcolRight');
    if (right) right.hidden = !waiting;
    fit();
  }
  if (window.ResizeObserver) new ResizeObserver(fit).observe(appEl);
  else setInterval(fit, 1000); // old TV engines

  // ---------- remote control and arrow keys ----------
  // Arrow keys move to the nearest control in that direction. OK or Enter presses it. Back or Escape goes back.
  if (isTV) document.documentElement.className += ' tv';
  const shape = (el) => (el.type === 'radio' ? document.querySelector(`label[for="${el.id}"]`) || el : el).getBoundingClientRect();
  function controls() {
    if (!$('#rulesPanel').hidden) return [$('#rulesClose')];
    for (const id of ['#leave', '#result']) { // TV panels over the board
      const p = $(id);
      if (isTV && !p.hidden) return [...p.querySelectorAll('button')].filter((b) => !b.hidden && !b.disabled && b.offsetParent !== null);
    }
    const view = [$('#home'), $('#game'), $('#join'), $('#send')].find((m) => !m.hidden);
    return [...document.querySelectorAll('.top button'), ...(view ? view.querySelectorAll('button, input, summary') : [])]
      .filter((el) => !el.disabled && el.offsetParent !== null && shape(el).width > 0);
  }
  function homeControl() {
    const shown = (b) => b && !b.disabled && b.offsetParent !== null;
    if (!$('#rulesPanel').hidden) return $('#rulesClose');
    if (!$('#game').hidden) {
      return [$('#leaveNo'), document.querySelector('.pit.can'), $('#resultMain'), $('#resultHome'), $('#takeover'), $('#free'), $('#back')].find(shown);
    }
    if (!$('#join').hidden) return $('#joinNick');
    if (!$('#send').hidden) return $('#sendWhatsApp');
    return [$('#playDaily'), $('#playOnline'), $('#playAi')].find(shown); // the first control on the home screen
  }
  // Scrolls just enough to show a control. (Older engines do not understand scrollIntoView options.)
  function reveal(el) {
    const r = shape(el), pad = 24;
    if (r.top < pad) window.scrollBy(0, r.top - pad);
    else if (r.bottom > innerHeight - pad) window.scrollBy(0, r.bottom - innerHeight + pad);
  }
  // On a TV something must always be selected, or the remote appears dead.
  if (isTV) {
    setInterval(() => {
      if (!$('#intro').hidden) return;
      const f = document.activeElement;
      if (f && f !== document.body && !f.disabled && f.offsetParent !== null) return;
      const c = homeControl();
      if (c) { c.focus(); reveal(c); }
    }, 300);
  }
  function step(dir) { // 37 left, 38 up, 39 right, 40 down
    const all = controls(), from = document.activeElement;
    if (!all.includes(from)) {
      if (!isTV) return false; // on a PC the arrow keys scroll the page until a control is selected with Tab or a click
      const first = homeControl();
      if (first) { first.focus(); reveal(first); }
      return true;
    }
    const a = shape(from), ax = a.left + a.width / 2, ay = a.top + a.height / 2, across = dir === 38 || dir === 40;
    let best = null, bestScore = Infinity;
    for (const el of all) {
      if (el === from) continue;
      const b = shape(el), bx = b.left + b.width / 2, by = b.top + b.height / 2;
      // `gap` is the clear distance in the direction pressed, edge to edge. `side` is how far off to the side it is.
      const gap = dir === 37 ? a.left - b.right : dir === 39 ? b.left - a.right : dir === 38 ? a.top - b.bottom : b.top - a.bottom;
      const side = across ? Math.abs(bx - ax) : Math.abs(by - ay);
      if (gap < -2) continue; // not in that direction
      if (!across && side > Math.max(a.height, b.height)) continue; // left and right stay in the same row
      const score = across ? gap * 4 + side : gap + side * 4; // up and down take the nearest row first
      if (score < bestScore) { bestScore = score; best = el; }
    }
    if (!best) return false;
    best.focus();
    reveal(best);
    return true;
  }
  function goBack() {
    if (!$('#rulesPanel').hidden) { closeRules(); return; }
    if (!$('#leave').hidden) { $('#leave').hidden = true; return; }
    if ($('#home').hidden) return askHome();
    if (isTV) window.close(); // on the TV, Back on the first screen leaves the app
  }
  document.addEventListener('keydown', (e) => {
    if (!$('#intro').hidden) return; // the title screen has its own keys
    const k = e.keyCode, t = document.activeElement, typing = t && t.tagName === 'INPUT' && t.type === 'text' && !t.readOnly;
    if (k === 461 || (k === 27 && !typing)) { e.preventDefault(); goBack(); return; }
    if (k === 13 && t && t.type === 'radio') { t.click(); return; }
    if (k < 37 || k > 40 || e.altKey || e.ctrlKey || e.metaKey) return;
    if (typing && (k === 37 || k === 39)) return; // left and right move the text cursor
    let moved = step(k);
    if (!moved && isTV && (k === 38 || k === 40)) { window.scrollBy(0, (k === 40 ? 1 : -1) * Math.round(innerHeight * 0.4)); moved = true; } // read text below the last button
    if (moved || (t && t.type === 'radio')) e.preventDefault(); // arrows never change a level choice by themselves
  });

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
  // The page icon (browser tab, home screen shortcut) is the pixel app icon, enlarged with hard edges.
  try {
    const iconArt = Pixel.icon(), big = document.createElement('canvas');
    big.width = big.height = 192;
    const ictx = big.getContext('2d');
    ictx.imageSmoothingEnabled = false;
    ictx.drawImage(iconArt, 0, 0, 192, 192);
    for (const rel of ['icon', 'apple-touch-icon']) {
      const link = document.createElement('link');
      link.rel = rel;
      link.href = big.toDataURL('image/png');
      document.head.appendChild(link);
    }
  } catch { /* the page works without an icon */ }

  // The title screen covers the page from the first paint (see index.html) and is skipped on return visits.
  function intro() {
    const el = $('#intro'), cv = $('#introCv'), app = document.querySelector('.app');
    if (el.hidden) return;
    try { sessionStorage.setItem('oware.intro', '1'); } catch { /* it will show again next time */ }
    let open = true, byKey = false; // the title stays until the player presses OK, a key or taps
    app.inert = true; // nothing behind the title can be tapped, tabbed to or read out
    app.setAttribute('aria-hidden', 'true');
    const onKey = (e) => {
      if (isTV && e.keyCode === 461) { window.close(); return; } // Back on the first screen leaves the app
      const arrow = e.keyCode >= 37 && e.keyCode <= 40;
      if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Escape' && e.keyCode !== 13 && !(isTV && arrow)) return;
      e.preventDefault();
      byKey = true;
      close();
    };
    const close = () => {
      if (!open) return;
      open = false;
      document.removeEventListener('keydown', onKey);
      app.inert = false;
      app.removeAttribute('aria-hidden');
      el.classList.add('out'); // it keeps swallowing taps while it fades
      setTimeout(() => {
        el.hidden = true;
        const next = homeControl();
        if ((byKey || isTV) && next) { window.scrollTo(0, 0); next.focus(); }
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
      const cap = isTV ? 90000 : 260000; // TVs have slow processors
      const s = Math.max(1, Math.floor(Math.min(pw / 156, ph / Pixel.AH)));
      const H = Math.max(Pixel.AH, Math.ceil(ph / s));
      let W = Math.max(156, Math.ceil(pw / s));
      if (W * H > cap) W = Math.max(Pixel.AW, Math.floor(cap / H)); // keep the whole picture; plain sky at the sides
      cv.width = W;
      cv.height = H;
      cv.style.width = (W * s) / dpr + 'px';
      cv.style.height = (H * s) / dpr + 'px';
      const art = Pixel.title(W, H, isTV ? 'PRESS OK' : 'TAP TO START');
      if (reduced) Pixel.drawTitle(cv, art, Infinity);
      else {
        const t0 = performance.now();
        const frame = (now) => { if (!open) return; Pixel.drawTitle(cv, art, now - t0); requestAnimationFrame(frame); };
        requestAnimationFrame(frame);
      }
    }, 30));
  }

  // ---------- wiring ----------
  if (Config.VERSION) $('#version').textContent = ` · Version ${Config.VERSION}`; // shows which build is installed
  // TV home screen: play options on the left, "Play a friend online" and the rules on the right.
  if (isTV) {
    const home = $('#home'), left = document.createElement('div'), right = document.createElement('div');
    left.className = 'col left';
    right.className = 'col right';
    for (const c of [...home.children]) (c.id === 'onlineCard' || c.classList.contains('rules') || c.classList.contains('foot') ? right : left).appendChild(c);
    home.appendChild(left);
    home.appendChild(right);
    document.querySelector('.app').classList.add('wide');
    document.documentElement.classList.add('tvhome');
    // Game screen: board on the left, the invite card on the right (shown only while waiting for a friend).
    const game = $('#game'), gl = document.createElement('div'), gr = document.createElement('div');
    gl.className = 'gcol left';
    gr.className = 'gcol right';
    gr.id = 'gcolRight';
    gr.hidden = true;
    for (const c of [...game.children]) (c.id === 'invite' ? gr : gl).appendChild(c);
    game.appendChild(gl);
    game.appendChild(gr);
    // The result and "Leave this game?" open as panels over the screen, outside the scaled game.
    document.body.appendChild($('#result'));
    document.body.appendChild($('#leave'));
  }
  // On a TV "How to play" opens as a panel over the screen, so the home screen never has to scroll.
  const rules = document.querySelector('.rules');
  $('#rulesList').innerHTML = rules.querySelector('ol').innerHTML;
  function closeRules() {
    $('#rulesPanel').hidden = true;
    rules.querySelector('summary').focus();
  }
  $('#rulesClose').addEventListener('click', closeRules);
  if (isTV) {
    rules.querySelector('summary').addEventListener('click', (e) => {
      e.preventDefault(); // do not open in place
      $('#rulesPanel').hidden = false;
      $('#rulesClose').focus();
    });
  }
  // Elsewhere, opening "How to play" brings the text into view.
  rules.addEventListener('toggle', () => {
    if (!rules.open) return;
    setTimeout(() => {
      fit();
      const r = rules.getBoundingClientRect();
      if (r.bottom > innerHeight - 24) window.scrollBy(0, Math.min(r.bottom - innerHeight + 24, r.top - 24));
    }, 60);
  });
  buildBoard();
  fit();
  intro();
  setupOnline();
  // "Install" appears where the browser offers to install the game as an app.
  let installEvent = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvent = e; $('#install').hidden = isTV; });
  window.addEventListener('appinstalled', () => { $('#install').hidden = true; });
  $('#install').addEventListener('click', () => { if (installEvent) installEvent.prompt(); $('#install').hidden = true; });
  drawSound();
  drawHome();
  $('#sound').addEventListener('click', () => { soundOn = !soundOn; store.set('sound', soundOn); drawSound(); sfx.drop(); });
  $('#back').addEventListener('click', askHome);
  $('#resultHome').addEventListener('click', goHome);
  $('#playDaily').addEventListener('click', startDaily);
  $('#playAi').addEventListener('click', () => startGame('ai'));
  $('#playLocal').addEventListener('click', () => startGame('local'));
  document.querySelectorAll('input[name="level"]').forEach((r) =>
    r.addEventListener('change', () => { level = r.value; store.set('level', level); }));
})();
