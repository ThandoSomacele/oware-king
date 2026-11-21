// Pixel art drawn in code, in the style of 16-bit console title screens:
// a small fixed palette, ordered dithering, one light from the top left, dark outlines.
// Everything is computed (no image files): the relief map of Africa, the bevelled logo, the woven borders.
const Pixel = (() => {
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const PAL = [
    '#07060f', '#0e0c20', '#161435', '#1f1c4d', '#2b2869', '#3d3a8c', '#5a58b8', // night blues
    '#3a1d4f', '#5c2a66', '#8a3a6a', '#b8505a', // dusk glow
    '#2b1605', '#4a2a0c', '#7a4510', '#a8620f', '#d98a14', '#f2b01e', '#ffd75a', '#fff3b0', // golds
    '#0c2a1c', '#14472f', '#1f6e46', '#2f9a58', '#6dbb5e', '#a9cf6e', // greens
    '#5a3218', '#8a5426', '#b47a3c', '#d6a35e', '#ecc98a', '#f7e3b4', // earth and sand
    '#6e1f12', '#a83420', '#d2532f', '#ee8a55', // red earth
    '#8f8068', '#c9b99c', '#fdf0dc', '#ffffff', // cream
  ].map(hex);
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const LIGHT = (() => { const v = [-0.55, -0.65, 0.52], n = Math.hypot(...v); return v.map((c) => c / n); })();

  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const mul = (c, s) => [c[0] * s, c[1] * s, c[2] * s];
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const hash = (x, y) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };
  function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), s = (t) => t * t * (3 - 2 * t), u = s(x - xi), v = s(y - yi);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  const fbm = (x, y) => vnoise(x, y) * 0.5 + vnoise(x * 2.1 + 9, y * 2.1) * 0.3 + vnoise(x * 4.3, y * 4.3 + 5) * 0.2;

  // A buffer of true-colour pixels; it is reduced to the palette when turned into a canvas.
  const buf = (w, h) => ({ w, h, d: new Float32Array(w * h * 4) });
  function put(b, x, y, c) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= b.w || y >= b.h) return;
    const i = (y * b.w + x) * 4;
    b.d[i] = c[0]; b.d[i + 1] = c[1]; b.d[i + 2] = c[2]; b.d[i + 3] = 1;
  }
  const has = (b, x, y) => x >= 0 && y >= 0 && x < b.w && y < b.h && b.d[(y * b.w + x) * 4 + 3] > 0;
  function toCanvas(b, spread = 26) {
    const cv = document.createElement('canvas');
    cv.width = b.w; cv.height = b.h;
    const ctx = cv.getContext('2d'), img = ctx.createImageData(b.w, b.h), o = img.data;
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
      const i = (y * b.w + x) * 4;
      if (b.d[i + 3] <= 0) continue;
      const t = (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.47) * spread;
      const r = b.d[i] + t, g = b.d[i + 1] + t, bl = b.d[i + 2] + t;
      let best = 0, bd = 1e9;
      for (let k = 0; k < PAL.length; k++) {
        const p = PAL[k], d = (p[0] - r) ** 2 + (p[1] - g) ** 2 + (p[2] - bl) ** 2;
        if (d < bd) { bd = d; best = k; }
      }
      o[i] = PAL[best][0]; o[i + 1] = PAL[best][1]; o[i + 2] = PAL[best][2]; o[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return cv;
  }

  // ---------- Africa ----------
  // Coastline as [longitude, latitude] points, clockwise from Tangier.
  const AFRICA = [[-6, 35.8], [-2, 35.1], [3, 36.8], [10, 37.3], [11, 33.5], [15, 32.4], [19, 30.3], [20, 32.5], [23, 32.6], [25, 31.6], [29, 31], [32.3, 31.2], [33.5, 28], [35.5, 24], [37.2, 21], [38.5, 18], [39.5, 15.5], [43, 12.5], [44, 11], [48, 11.3], [51.2, 11.8], [50.5, 9], [48, 5], [45.5, 2.2], [42, -1.5], [40.5, -2.8], [39.5, -5], [39.3, -8], [40.5, -11], [40.6, -15], [37, -17.5], [35, -20], [35.5, -23.5], [33, -25.5], [32.5, -28.5], [30.5, -31], [27.5, -33.3], [25.5, -34], [22, -34.2], [20, -34.8], [18.4, -34.2], [18, -32], [16.5, -28.5], [15, -26], [14.5, -22.5], [12, -18], [11.8, -15.5], [13.5, -12.5], [13.2, -9], [12.2, -6], [11.8, -4.5], [9.5, -2.5], [9.3, 0.5], [9.7, 3.5], [8.8, 4.5], [7, 4.4], [5.5, 5.5], [4.4, 6.3], [1.2, 6.1], [-2, 4.8], [-4.5, 5.2], [-7.5, 4.4], [-10.5, 6.3], [-13.2, 8.5], [-15, 10.8], [-16.7, 12.5], [-17.5, 14.7], [-16.5, 16.5], [-16.2, 19], [-17, 21], [-16, 23.7], [-14.5, 26.2], [-13, 27.7], [-11.5, 28.5], [-9.8, 29.8], [-9.7, 31.5], [-8.5, 33.3], [-6.8, 34.2]];
  const MADAGASCAR = [[49.3, -12], [50.5, -15.5], [49.5, -18], [47.8, -22.5], [47, -25], [45, -25.5], [43.7, -23], [44, -20], [44.4, -16.5], [46.5, -15.5], [48, -13.5]];
  const GHANA = [-1.2, 7.9];
  // Land colour from north to south: [latitude, colour].
  const BIOMES = [[38, '#ecc98a'], [19, '#ecc98a'], [14, '#d6a35e'], [10, '#6dbb5e'], [5, '#2f9a58'], [-3, '#1f6e46'], [-8, '#6dbb5e'], [-15, '#a9cf6e'], [-20, '#d6a35e'], [-27, '#d6a35e'], [-31, '#6dbb5e'], [-36, '#2f9a58']].map(([l, c]) => [l, hex(c)]);

  function landMap(ox, oy, scale, w, h) {
    const polys = [AFRICA, MADAGASCAR].map((p) => p.map(([lon, lat]) => [ox + (lon + 18) * scale, oy + (37.5 - lat) * scale]));
    // Distance to the coast: positive on land, negative at sea.
    const dist = (x, y) => {
      let dm = 1e9, inside = false;
      for (const p of polys) {
        let c = false;
        for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
          const [x1, y1] = p[i], [x2, y2] = p[j];
          if ((y1 > y) !== (y2 > y) && x < ((x2 - x1) * (y - y1)) / (y2 - y1) + x1) c = !c;
          const dx = x2 - x1, dy = y2 - y1, t = clamp(((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy));
          dm = Math.min(dm, Math.hypot(x - x1 - t * dx, y - y1 - t * dy));
        }
        inside = inside || c;
      }
      return inside ? dm : -dm;
    };
    const D = new Float32Array(w * h), H = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const d = dist(x + 0.5, y + 0.5);
      D[y * w + x] = d;
      // Height: the land rises from the coast, then rolls with hills.
      H[y * w + x] = d > 0 ? Math.min(d / 3.5, 1) * 1.6 + fbm(x * 0.11, y * 0.11) * 2.4 : 0;
    }
    return { D, H, ghana: [ox + (GHANA[0] + 18) * scale, oy + (37.5 - GHANA[1]) * scale] };
  }

  function biome(lat, lon, wobble) {
    lat += wobble;
    for (let i = 1; i < BIOMES.length; i++) {
      if (lat >= BIOMES[i][0]) {
        const [l0, c0] = BIOMES[i - 1], [l1, c1] = BIOMES[i];
        let c = mix(c0, c1, (l0 - lat) / (l0 - l1));
        if (lon > 33 && lat < 12 && lat > -12) c = mix(c, hex('#d6a35e'), clamp((lon - 33) / 8) * 0.7); // the dry east
        return c;
      }
    }
    return BIOMES[BIOMES.length - 1][1];
  }

  // ---------- letters ----------
  const G = {
    A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
    G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
    I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
    K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
    N: ['#...#', '##..#', '##..#', '#.#.#', '#..##', '#..##', '#...#'],
    O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
    W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  };
  const TINY = {
    A: ['.#.', '#.#', '###', '#.#', '#.#'], O: ['###', '#.#', '#.#', '#.#', '###'], P: ['##.', '#.#', '##.', '#..', '#..'],
    R: ['##.', '#.#', '##.', '#.#', '#.#'], S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'],
  };
  const RAMPS = {
    gold: ['#fff3b0', '#ffd75a', '#f2b01e', '#a8620f', '#4a2a0c'].map(hex),
    cream: ['#ffffff', '#fdf0dc', '#ecc98a', '#b47a3c', '#5a3218'].map(hex),
  };
  const OUTLINE = hex('#07060f');

  function sphere(b, cx, cy, r, base) {
    for (let y = -r - 1; y <= r + 1; y++) for (let x = -r - 1; x <= r + 1; x++) {
      const d = Math.hypot(x, y);
      if (d > r + 1.2) continue;
      if (d > r + 0.2) { put(b, cx + x, cy + y, OUTLINE); continue; }
      const z = Math.sqrt(Math.max(r * r - d * d, 0)) / r;
      const lit = (x / r) * LIGHT[0] + (y / r) * LIGHT[1] + z * LIGHT[2];
      put(b, cx + x, cy + y, lit > 0.9 ? [255, 255, 255] : mul(base, 0.42 + 0.78 * clamp(lit)));
    }
  }

  // Draws one word as bevelled metal letters: bright top-left edges, dark bottom-right edges,
  // a face that shades from light to deep, a moving-looking glint, a dark outline and a cast shadow.
  function drawWord(b, text, ox, oy, cell, gap, ramp, seed) {
    const w = text.length * (5 * cell + gap) - gap, h = 7 * cell;
    const m = new Uint8Array(w * h), on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && m[y * w + x] === 1;
    const pits = [];
    [...text].forEach((ch, n) => {
      const x0 = n * (5 * cell + gap);
      G[ch].forEach((row, ry) => [...row].forEach((c, cx) => {
        if (c !== '#') return;
        for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) m[(ry * cell + y) * w + x0 + cx * cell + x] = 1;
      }));
      if (ch === 'O') pits.push(x0 + Math.floor(2.5 * cell));
    });
    // Knock one pixel off every outside corner so the blocks look cut, not printed.
    const cut = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!on(x, y)) continue;
      const l = on(x - 1, y), r = on(x + 1, y), u = on(x, y - 1), d = on(x, y + 1);
      // A corner is only cut when nothing touches it diagonally, so slanted strokes stay joined.
      if ((!l && !u && !on(x - 1, y - 1)) || (!r && !u && !on(x + 1, y - 1)) || (!l && !d && !on(x - 1, y + 1)) || (!r && !d && !on(x + 1, y + 1))) cut.push(y * w + x);
    }
    if (cell > 2) cut.forEach((i) => { m[i] = 0; });
    const sh = Math.max(1, Math.round(cell * 0.5));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!on(x, y)) continue;
      for (let k = 1; k <= sh; k++) put(b, ox + x + k, oy + y + k + 1, OUTLINE);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) put(b, ox + x + dx, oy + y + dy, OUTLINE);
    }
    const [hi, light, mid, dark, lo] = ramp;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!on(x, y)) continue;
      const t = y / (h - 1);
      let c = t < 0.45 ? mix(light, mid, t / 0.45) : mix(mid, dark, (t - 0.45) / 0.55);
      if ((x + y * 0.7 + 400) % (cell * 9) < cell * 0.8) c = mix(c, hi, 0.65); // glint
      if (!on(x - 1, y) || !on(x, y - 1)) c = hi;
      else if (!on(x + 1, y) || !on(x, y + 1)) c = lo;
      put(b, ox + x, oy + y, c);
    }
    pits.forEach((px) => sphere(b, ox + px, oy + Math.floor(3.5 * cell), Math.max(2, Math.round(cell * 1.05)), seed));
    return { w, h };
  }

  function tiny(b, text, ox, oy, c) {
    [...text].forEach((ch, n) => (TINY[ch] || []).forEach((row, y) => [...row].forEach((p, x) => { if (p === '#') put(b, ox + n * 4 + x, oy + y, c); })));
  }

  // Woven border: each block is lit like a raised thread.
  const WEAVE = ['gg..rr..gg..nn..', 'gg..rr..gg..nn..', '..nn..gg..rr..gg', '..nn..gg..rr..gg'];
  const THREAD = { g: hex('#f2b01e'), n: hex('#2f9a58'), r: hex('#d2532f'), '.': hex('#161435') };
  function weave(b, y0, cell, rows = WEAVE) {
    for (let y = 0; y < rows.length * cell; y++) for (let x = 0; x < b.w; x++) {
      const k = rows[Math.floor(y / cell)][Math.floor(x / cell) % rows[0].length], c = THREAD[k];
      const ix = x % cell, iy = y % cell;
      const s = k === '.' ? 1 : ix === 0 || iy === 0 ? 1.28 : ix === cell - 1 || iy === cell - 1 ? 0.62 : 1;
      put(b, x, y0 + y, mul(c, s));
    }
  }

  // ---------- pieces ----------
  // One-line logo for the header. Shown at one canvas pixel per screen pixel.
  function logoCanvas(cell = 3) {
    const gap = Math.max(1, cell - 1), wordW = (n) => n * (5 * cell + gap) - gap;
    const b = buf(wordW(5) + cell * 2 + wordW(4) + cell + 4, 7 * cell + cell + 4);
    drawWord(b, 'OWARE', 1, 1, cell, gap, RAMPS.gold, hex('#2f9a58'));
    drawWord(b, 'KING', 1 + wordW(5) + cell * 2, 1, cell, gap, RAMPS.cream, hex('#d2532f'));
    return toCanvas(b, 0);
  }

  const W = 160, H = 284;
  // The title screen, as layers that the opening animation puts together.
  function title() {
    const mapScale = 1.62, mapX = 23, mapY = 22, cx = mapX + 35 * mapScale + 2, cy = mapY + 34 * mapScale;
    const land = landMap(mapX, mapY, mapScale, W, H);
    const at = (a, x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : a[y * W + x]);

    // Background: night sky, a dusk glow behind the continent, stars, the continent's shadow.
    const bg = buf(W, H);
    const stars = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const t = y / H;
      let c = t < 0.5 ? mix(hex('#0e0c20'), hex('#1f1c4d'), t / 0.5) : mix(hex('#1f1c4d'), hex('#0e0c20'), (t - 0.5) / 0.5);
      const g = Math.exp(-(((x - cx) / 62) ** 2 + ((y - cy) / 70) ** 2));
      c = mix(c, hex('#5c2a66'), clamp(g * 1.1));
      c = mix(c, hex('#b8505a'), clamp((g - 0.55) * 1.6));
      if (at(land.D, x - 4, y - 6) > 0) c = mul(c, 0.45);
      const surf = at(land.D, x, y);
      if (surf < 0 && surf > -3.2) c = mix(c, hex('#5a58b8'), 0.55 * (1 + surf / 3.2));
      put(bg, x, y, c);
      if (hash(x * 1.7, y * 2.3) > 0.9925 && g < 0.35 && y > 16 && y < 150) stars.push([x, y]);
    }
    weave(bg, 0, 3);
    weave(bg, H - 12, 3);

    // The continent: lit relief, coloured by climate, with a dark coast line.
    const map = buf(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = at(land.D, x, y);
      if (d <= 0) { if (d > -1.25) put(map, x, y, OUTLINE); continue; }
      const nx = at(land.H, x - 1, y) - at(land.H, x + 1, y), ny = at(land.H, x, y - 1) - at(land.H, x, y + 1);
      const len = Math.hypot(nx, ny, 1.1), lit = (nx * LIGHT[0] + ny * LIGHT[1] + 1.1 * LIGHT[2]) / len;
      const lat = 37.5 - (y - mapY) / mapScale, lon = (x - mapX) / mapScale - 18;
      const c = biome(lat, lon, fbm(x * 0.07 + 3, y * 0.07) * 9 - 4.5);
      put(map, x, y, mul(c, 0.5 + 0.85 * clamp(lit)));
    }

    // The logo, the stripe under it and the prompt.
    const logo = buf(W, 96);
    drawWord(logo, 'OWARE', 12, 2, 5, 3, RAMPS.gold, hex('#2f9a58'));
    drawWord(logo, 'KING', 26, 46, 5, 3, RAMPS.cream, hex('#d2532f'));
    const stripe = buf(112, 4);
    weave(stripe, 0, 2, ['ggnnggrrgg..ggrr', 'ggnnggrrgg..ggrr']);
    const tap = buf(48, 5);
    tiny(tap, 'TAP TO START', 0, 0, hex('#fdf0dc'));

    return {
      W, H, stars, ghana: land.ghana.map(Math.round),
      bg: toCanvas(bg), map: toCanvas(map, 30), logo: toCanvas(logo, 0), stripe: toCanvas(stripe, 0), tap: toCanvas(tap, 0),
    };
  }

  // Plays the opening on `cv` and calls nothing back: the screen simply stays until it is closed.
  // t is the time in milliseconds since the opening began. Pass Infinity for the finished picture.
  function drawTitle(cv, T, t) {
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(T.bg, 0, 0);
    // The continent appears as a pixel dissolve, row band by row band from the north.
    const p = clamp(t / 1300);
    if (p >= 1) ctx.drawImage(T.map, 0, 0);
    else if (p > 0) {
      if (!T.mapData) T.mapData = T.map.getContext('2d').getImageData(0, 0, T.W, T.H);
      const src = T.mapData.data, out = ctx.getImageData(0, 0, T.W, T.H), o = out.data;
      for (let y = 0; y < T.H; y++) for (let x = 0; x < T.W; x++) {
        const i = (y * T.W + x) * 4;
        if (!src[i + 3]) continue;
        const gate = (y / 150) * 0.7 + (BAYER[(y & 3) * 4 + (x & 3)] / 16) * 0.3;
        if (gate < p * 1.05) { o[i] = src[i]; o[i + 1] = src[i + 1]; o[i + 2] = src[i + 2]; }
      }
      ctx.putImageData(out, 0, 0);
    }
    // Stars twinkle.
    T.stars.forEach(([x, y], n) => {
      const phase = Number.isFinite(t) ? Math.sin(t / 380 + n * 1.9) : 1;
      ctx.fillStyle = phase > 0.2 ? '#fdf0dc' : phase > -0.5 ? '#5a58b8' : '#2b2869';
      ctx.fillRect(x, y, 1, 1);
    });
    // A gold spark marks Ghana, the home of Oware.
    if (t > 1300) {
      const [gx, gy] = T.ghana, big = !Number.isFinite(t) || Math.floor(t / 420) % 2 === 0;
      ctx.fillStyle = '#07060f';
      ctx.fillRect(gx - 1, gy - 1, 3, 3);
      ctx.fillStyle = '#ffd75a';
      ctx.fillRect(gx - (big ? 2 : 1), gy, big ? 5 : 3, 1);
      ctx.fillRect(gx, gy - (big ? 2 : 1), 1, big ? 5 : 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(gx, gy, 1, 1);
    }
    // The two words drop in, one after the other, and settle with a small bounce.
    const drop = (start) => {
      const k = clamp((t - start) / 420);
      return k >= 1 ? 0 : Math.round(-70 * (1 - k) ** 2 + (k > 0.75 ? Math.sin((k - 0.75) * 4 * Math.PI) * -3 : 0));
    };
    if (t > 1100) ctx.drawImage(T.logo, 0, 0, T.W, 44, 0, 150 + drop(1100), T.W, 44);
    if (t > 1450) ctx.drawImage(T.logo, 0, 44, T.W, 52, 0, 194 + drop(1450), T.W, 52);
    if (t > 1900) ctx.drawImage(T.stripe, 24, 246);
    if (t > 2200 && (!Number.isFinite(t) || Math.floor(t / 520) % 2 === 0)) ctx.drawImage(T.tap, 57, 258);
  }

  return { W, H, title, drawTitle, logoCanvas };
})();

if (typeof module !== 'undefined') module.exports = Pixel;
