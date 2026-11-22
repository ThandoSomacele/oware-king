// Pixel art drawn in code, in the style of 16-bit console title screens:
// a small fixed palette, ordered dithering, one light from the top left, dark outlines.
// Everything is computed (no image files): the relief map of Africa, the bevelled logo, the seed borders.
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
  // The map uses only outline, sand and forest colours, so no grey or logo gold creeps into the land.
  const MAP_PAL = ['#07060f', '#fff3b0', '#f7e3b4', '#ecc98a', '#d6a35e', '#b47a3c', '#8a5426', '#5a3218', '#a9cf6e', '#6dbb5e', '#2f9a58', '#1f6e46', '#14472f', '#0c2a1c'].map(hex);
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
  // spread: strength of the all-over dither. band: if set, colours stay flat and are dithered
  // only in a narrow band where two palette colours meet (cleaner for skies).
  function toCanvas(b, spread = 26, pal = PAL, band = 0) {
    const cv = document.createElement('canvas');
    cv.width = b.w; cv.height = b.h;
    const ctx = cv.getContext('2d'), img = ctx.createImageData(b.w, b.h), o = img.data;
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
      const i = (y * b.w + x) * 4;
      if (b.d[i + 3] <= 0) continue;
      const bay = BAYER[(y & 3) * 4 + (x & 3)], t = (bay / 16 - 0.47) * spread;
      const r = b.d[i] + t, g = b.d[i + 1] + t, bl = b.d[i + 2] + t;
      let best = 0, bd = 1e9, next = 0, nd = 1e9;
      for (let k = 0; k < pal.length; k++) {
        const q = pal[k], d = (q[0] - r) ** 2 + (q[1] - g) ** 2 + (q[2] - bl) ** 2;
        if (d < bd) { nd = bd; next = best; bd = d; best = k; } else if (d < nd) { nd = d; next = k; }
      }
      if (band) {
        const p0 = pal[best], p1 = pal[next], e = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
        const f = ((r - p0[0]) * e[0] + (g - p0[1]) * e[1] + (bl - p0[2]) * e[2]) / (e[0] ** 2 + e[1] ** 2 + e[2] ** 2 || 1);
        if ((f - 0.5 + band) / (2 * band) > (bay + 0.5) / 16) best = next;
      }
      o[i] = pal[best][0]; o[i + 1] = pal[best][1]; o[i + 2] = pal[best][2]; o[i + 3] = 255;
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
    const segs = [];
    let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
    for (const p of polys) {
      const sg = new Float64Array(p.length * 5);
      for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
        const x1 = p[i][0], y1 = p[i][1], dx = p[j][0] - x1, dy = p[j][1] - y1;
        sg.set([x1, y1, dx, dy, 1 / (dx * dx + dy * dy)], i * 5);
        bx0 = Math.min(bx0, x1); bx1 = Math.max(bx1, x1); by0 = Math.min(by0, y1); by1 = Math.max(by1, y1);
      }
      segs.push(sg);
    }
    // Distance to the coast: positive on land, negative at sea.
    const dist = (x, y) => {
      if (x < bx0 - 8 || x > bx1 + 8 || y < by0 - 8 || y > by1 + 8) return -8; // open sea, far from land
      let dm = 1e18, inside = false;
      for (const sg of segs) {
        let c = false;
        for (let k = 0; k < sg.length; k += 5) {
          const x1 = sg[k], y1 = sg[k + 1], dx = sg[k + 2], dy = sg[k + 3], px = x - x1, py = y - y1;
          if ((y1 > y) !== (y1 + dy > y) && x < (dx * py) / dy + x1) c = !c;
          let t = (px * dx + py * dy) * sg[k + 4];
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const ex = px - t * dx, ey = py - t * dy, d2 = ex * ex + ey * ey;
          if (d2 < dm) dm = d2;
        }
        inside = inside || c;
      }
      dm = Math.sqrt(dm);
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
    G: ['.####', '#....', '#....', '#..##', '#...#', '#...#', '.###.'],
    I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
    K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
    N: ['#...#', '##..#', '##..#', '#.#.#', '#..##', '#..##', '#...#'],
    O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
    W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'],
  };
  const TINY = {
    A: ['.#.', '#.#', '###', '#.#', '#.#'], O: ['###', '#.#', '#.#', '#.#', '###'], P: ['###', '#.#', '###', '#..', '#..'],
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
  // a face in three flat tones, one thin glint, a dark outline and a soft cast shadow.
  // Every O is a carved pit with one seed resting in it.
  function drawWord(b, text, ox, oy, cell, gap, ramp, seed) {
    const w = text.length * (5 * cell + gap) - gap, h = 7 * cell, pitch = 5 * cell + gap, big = cell > 3;
    const m = new Uint8Array(w * h), on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && m[y * w + x] === 1;
    const pits = [];
    [...text].forEach((ch, n) => {
      const x0 = n * pitch, g = (r, c) => (G[ch][r] || '')[c] === '#';
      for (let ry = 0; ry < 7; ry++) for (let cx = 0; cx < 5; cx++) {
        const px = x0 + cx * cell, py = ry * cell;
        for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) {
          if (g(ry, cx)) { m[(py + y) * w + px + x] = 1; continue; }
          // Where two blocks of a slanted stroke touch only at a corner, fill the step between them,
          // so the stroke is one solid diagonal and not a string of beads.
          const X = cell - 1 - x, Y = cell - 1 - y;
          if ((g(ry, cx - 1) && g(ry - 1, cx) && !g(ry - 1, cx - 1) && x + y < cell)
            || (g(ry, cx + 1) && g(ry - 1, cx) && !g(ry - 1, cx + 1) && X + y < cell)
            || (g(ry, cx - 1) && g(ry + 1, cx) && !g(ry + 1, cx - 1) && x + Y < cell)
            || (g(ry, cx + 1) && g(ry + 1, cx) && !g(ry + 1, cx + 1) && X + Y < cell)) m[(py + y) * w + px + x] = 1;
        }
      }
      if (ch === 'O') pits.push(x0 + Math.floor(2.5 * cell));
    });
    // Knock one pixel off every outside corner so the blocks look cut, not printed.
    const cutList = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!on(x, y)) continue;
      const l = on(x - 1, y), r = on(x + 1, y), u = on(x, y - 1), d = on(x, y + 1);
      if ((!l && !u && !on(x - 1, y - 1)) || (!r && !u && !on(x + 1, y - 1)) || (!l && !d && !on(x - 1, y + 1)) || (!r && !d && !on(x + 1, y + 1))) cutList.push(y * w + x);
    }
    if (cell > 2) cutList.forEach((i) => { m[i] = 0; });
    const sh = Math.max(1, Math.round(cell * 0.5));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!on(x, y)) continue;
      // The cast shadow is a checker pattern, so the sky shows through it. Small logos have none.
      if (big && ((ox + x + oy + y) & 1)) for (let k = 1; k <= sh; k++) put(b, ox + x + k, oy + y + k + 1, OUTLINE);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) put(b, ox + x + dx, oy + y + dy, OUTLINE);
    }
    const [hi, light, mid, dark, lo] = ramp;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!on(x, y)) continue;
      const f = Math.min((y / (h - 1)) * 2, 1.999), bandN = f | 0, seam = (f - bandN - 0.3) / 0.4;
      let c = [light, mid, dark][bandN + (seam > (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16 ? 1 : 0)];
      const gl = Math.floor((x % pitch) + y * 0.7 - cell * 3.4);
      if (big && (gl === 0 || gl === 1)) c = hi; // one thin glint per letter
      else if (big && gl === 2 && bandN > 0) c = light;
      if (!on(x - 1, y) || !on(x, y - 1)) c = hi;
      else if (!on(x + 1, y) || !on(x, y + 1)) c = lo;
      put(b, ox + x, oy + y, c);
    }
    const WOOD = hex('#5a3218'), WALL = hex('#2b1605'), RIM = hex('#b47a3c');
    pits.forEach((px) => {
      const x1 = px - Math.floor(1.5 * cell) + 1, x2 = x1 + 3 * cell - 3, y1 = cell + 1, y2 = 6 * cell - 2;
      for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) {
        if ((x === x1 || x === x2) && (y === y1 || y === y2) && cell > 2) continue;
        const wall = Math.min(x - x1, y - y1), rim = Math.min(x2 - x, y2 - y);
        put(b, ox + x, oy + y, wall < Math.max(1, cell - 3) ? WALL : rim === 0 ? RIM : WOOD);
      }
      const r = Math.max(2, Math.round(cell * (big ? 0.8 : 0.7))), sy = y2 - r - 2;
      for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (Math.hypot(x, y) <= r + 0.2) put(b, ox + px + x + 1, oy + sy + y + 2, WALL);
      sphere(b, ox + px, oy + sy, r, seed);
    });
    return { w, h };
  }

  function tiny(b, text, ox, oy, c, s = 1) {
    [...text].forEach((ch, n) => (TINY[ch] || []).forEach((row, y) => [...row].forEach((p, x) => {
      if (p === '#') for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) put(b, ox + (n * 4 + x) * s + i, oy + y * s + j, c);
    })));
  }

  // A row of Oware seeds, each one a small lit ball.
  const SEEDS = ['#f2b01e', '#fdf0dc', '#2f9a58', '#f2b01e', '#d2532f', '#c9b99c'].map(hex);
  function seedRow(b, cy, r, step) {
    const count = Math.floor(b.w / step), x0 = Math.floor((b.w - (count - 1) * step) / 2); // centred, never cut off
    for (let x = x0, n = 0; n < count; x += step, n++) sphere(b, x, cy, r, SEEDS[n % SEEDS.length]);
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

  // The picture is composed on a 160 x 284 grid. On a larger canvas the same picture sits in the
  // middle and the sky, stars and seed borders run on to the edges.
  const AW = 160, AH = 284;
  function title(W = AW, H = AH) {
    const ox = (W - AW) >> 1, oy = (H - AH) >> 1;
    const mapScale = 1.62, mapX = 23 + ox, mapY = 22 + oy, cx = mapX + 35 * mapScale + 2, cy = mapY + 34 * mapScale;
    const land = landMap(mapX, mapY, mapScale, W, H);
    const at = (a, x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : a[y * W + x]);
    const NIGHT = hex('#0e0c20'), INDIGO = hex('#1f1c4d'), PLUM = hex('#5c2a66'), ROSE = hex('#b8505a'), SURF = hex('#5a58b8');

    // Background: night sky, a dusk glow behind the continent, stars, the continent's shadow.
    const bg = buf(W, H);
    const stars = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const t = y / H;
      let c = t < 0.5 ? mix(NIGHT, INDIGO, t / 0.5) : mix(INDIGO, NIGHT, (t - 0.5) / 0.5);
      const g = Math.exp(-(((x - cx) / 62) ** 2 + ((y - cy) / 70) ** 2));
      c = mix(c, PLUM, clamp(g * 1.1));
      c = mix(c, ROSE, clamp((g - 0.5) * 2.4));
      if (at(land.D, x - 4, y - 6) > 0) c = mix(c, NIGHT, 0.7); // the shadow stays in the night blues
      const surf = at(land.D, x, y);
      if (surf < 0 && surf > -3.2) c = mix(c, SURF, 0.55 * (1 + surf / 3.2));
      if (y < 13 || y >= H - 13) c = mul(c, 0.5); // a darker band for the seed borders
      put(bg, x, y, c);
      if (hash(x * 1.7, y * 2.3) > 0.9925 && g < 0.35 && y > 16 && (y < oy + 150 || x < ox || x >= ox + AW) && y < H - 16) stars.push([x, y]);
    }
    // The border seeds are on their own layer so the sky's dither never dirties them.
    const border = buf(W, H);
    seedRow(border, 6, 4, 10);
    seedRow(border, H - 7, 4, 10);
    const bgCv = toCanvas(bg, 0, PAL, 0.14);
    bgCv.getContext('2d').drawImage(toCanvas(border, 0), 0, 0);

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

    // The logo, the line of seeds under it and the prompt.
    const logo = buf(AW, 96);
    drawWord(logo, 'OWARE', 12, 2, 5, 3, RAMPS.gold, hex('#2f9a58'));
    drawWord(logo, 'KING', 26, 46, 5, 3, RAMPS.cream, hex('#d2532f'));
    const stripe = buf(112, 7);
    seedRow(stripe, 3, 2, 8);
    const tap = buf(97, 13);
    for (let dy = 0; dy <= 3; dy++) for (let dx = 0; dx <= 3; dx++) tiny(tap, 'TAP TO START', dx, dy, OUTLINE, 2); // outline and shadow
    tiny(tap, 'TAP TO START', 1, 1, hex('#fdf0dc'), 2);

    return {
      W, H, ox, oy, stars, ghana: land.ghana.map(Math.round),
      bg: bgCv, map: toCanvas(map, 30, MAP_PAL), logo: toCanvas(logo, 0), stripe: toCanvas(stripe, 0), tap: toCanvas(tap, 0),
    };
  }

  // Draws the title screen on `cv` as it looks t milliseconds after it opened.
  // Pass Infinity for the finished picture.
  function drawTitle(cv, T, t) {
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(T.bg, 0, 0);
    // The continent appears as a pixel dissolve, row band by row band from the north.
    const p = clamp(t / 1300);
    if (p >= 1) ctx.drawImage(T.map, 0, 0);
    else if (p > 0) {
      if (!T.mapData) T.mapData = T.map.getContext('2d').getImageData(0, 0, T.W, T.H);
      const src = T.mapData.data, x0 = Math.max(0, T.ox), y0 = Math.max(0, T.oy), w = Math.min(AW, T.W), h = Math.min(170, T.H);
      const out = ctx.getImageData(x0, y0, w, h), o = out.data;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = ((y + y0) * T.W + x + x0) * 4, j = (y * w + x) * 4;
        if (!src[i + 3]) continue;
        const gate = (y / 150) * 0.7 + (BAYER[(y & 3) * 4 + (x & 3)] / 16) * 0.3;
        if (gate < p * 1.05) { o[j] = src[i]; o[j + 1] = src[i + 1]; o[j + 2] = src[i + 2]; }
      }
      ctx.putImageData(out, x0, y0);
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
    if (t > 1100) ctx.drawImage(T.logo, 0, 0, AW, 44, T.ox, T.oy + 150 + drop(1100), AW, 44);
    if (t > 1450) ctx.drawImage(T.logo, 0, 44, AW, 52, T.ox, T.oy + 194 + drop(1450), AW, 52);
    if (t > 1900) ctx.drawImage(T.stripe, T.ox + 24, T.oy + 242);
    if (t > 2200 && (!Number.isFinite(t) || Math.floor(t / 520) % 2 === 0)) ctx.drawImage(T.tap, T.ox + 32, T.oy + 254);
  }

  // ---------- app icon ----------
  const WOOD_PAL = ['#07060f', '#2b1605', '#4a2a0c', '#5a3218', '#7a4510', '#8a5426', '#b47a3c', '#d6a35e', '#ecc98a'].map(hex);
  const SEED_PAL = ['#ffffff', '#fdf0dc', '#c9b99c', '#8f8068', '#fff3b0', '#ffd75a', '#f2b01e', '#a8620f', '#2f9a58', '#1f6e46', '#6dbb5e'].map(hex);
  const W_DARK = hex('#2b1605'), W_DEEP = hex('#5a3218'), W_MID = hex('#7a4510'), W_WARM = hex('#b47a3c'), W_LIGHT = hex('#ecc98a'), W_RIM = hex('#d6a35e');
  // Wood: long streaks of grain, a little lighter toward the top where the light falls.
  function woodAt(x, y, H) {
    const g = fbm(x * 0.045 + 7, y * 0.55) + 0.25 * vnoise(x * 0.3, y * 1.7);
    let c = mix(W_MID, W_WARM, clamp((g - 0.3) * 1.7));
    if (vnoise(x * 0.02 + 3, y * 0.9 + 11) > 0.7) c = mix(c, W_DEEP, 0.5);
    return mul(c, 1.1 - 0.24 * (y / H));
  }
  // One pixel of a carved pit. Light from the top left falls on the far, lower-right wall.
  function pitPixel(dx, dy, R) {
    const d = Math.hypot(dx, dy);
    if (d > R + 0.7) return null;
    const side = (dx + dy) / (R * 1.42); // -1 upper left ... +1 lower right
    if (d > R - 0.4) return side < 0 ? W_DARK : W_RIM; // the cut edge: shaded on one side, lit on the other
    const t = clamp((side + 1) / 2);
    return side < -0.72 ? mul(W_DARK, 0.7) : mix(W_DARK, W_MID, t * t * 0.9);
  }
  // App icon, 64 x 64: a plain gold crown above a carved pit with three seeds.
  function icon() {
    const S = 64, b = buf(S, S), GROUND = hex('#14110e');
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const ex = Math.min(x, S - 1 - x), ey = Math.min(y, S - 1 - y);
      if (ex < 9 && ey < 9 && Math.hypot(9 - ex, 9 - ey) > 9.3) continue; // rounded corners
      put(b, x, y, GROUND);
    }
    // Crown: a band with three points.
    const inCrown = (x, y) => x >= 17 && x <= 46 && y >= 8 && y <= 25 && (y >= 19 || [17, 31.5, 46].some((px) => Math.abs(x - px) <= (y - 8) * 0.62 + 0.6));
    const [hi, light, mid, dark, lo] = RAMPS.gold;
    for (let y = 6; y < 28; y++) for (let x = 15; x < 49; x++) {
      if (inCrown(x, y)) continue;
      if ([-1, 0, 1].some((dy) => [-1, 0, 1].some((dx) => inCrown(x + dx, y + dy)))) put(b, x, y, OUTLINE);
    }
    for (let y = 8; y <= 25; y++) for (let x = 17; x <= 46; x++) {
      if (!inCrown(x, y)) continue;
      let c = y < 14 ? light : y < 21 ? mid : dark;
      if (!inCrown(x - 1, y) || !inCrown(x, y - 1)) c = hi;
      else if (!inCrown(x + 1, y) || !inCrown(x, y + 1)) c = lo;
      put(b, x, y, c);
    }
    // Plank and pit.
    for (let y = 31; y <= 57; y++) for (let x = 8; x <= 55; x++) {
      const ex = Math.min(x - 8, 55 - x), ey = Math.min(y - 31, 57 - y);
      if (ex < 3 && ey < 3 && Math.hypot(3 - ex, 3 - ey) > 3.4) continue;
      let c = woodAt(x, y - 31, 27);
      if (y >= 55) c = mul(c, 0.5);
      else if (y === 31 || x === 8) c = mix(c, W_LIGHT, 0.65);
      put(b, x, y, c);
    }
    for (let y = 31; y <= 55; y++) for (let x = 19; x <= 45; x++) {
      const c = pitPixel(x + 0.5 - 32, y + 0.5 - 43, 11);
      if (c) put(b, x, y, c);
    }
    sphere(b, 27, 41, 4, hex('#fdf0dc'));
    sphere(b, 37, 41, 4, hex('#f2b01e'));
    sphere(b, 32, 48, 4, hex('#2f9a58'));
    return toCanvas(b, 0, [...WOOD_PAL, ...SEED_PAL, ...RAMPS.gold, GROUND]);
  }

  return { AW, AH, title, drawTitle, logoCanvas, icon };
})();

if (typeof module !== 'undefined') module.exports = Pixel;
