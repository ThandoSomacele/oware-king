// Brand drawing code: the name, colours and seed bands. The logo, title screen and app icon are in pixel.js.
// Everything is drawn from the small grids below, so there are no image or font files to copy.
const Brand = (() => {
  const NAME = 'Oware King';
  const C = { gold: '#f2b01e', green: '#1f8a55', red: '#c8452a', black: '#14110e', cream: '#fdf0dc', wood: '#9a6535', bowl: '#4a2a12' };

  // Letters on a 5 x 7 block grid. '#' is a woven block.
  const G = {
    A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
    D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
    E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
    G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
    H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
    K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
    L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
    M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
    N: ['#...#', '##..#', '##..#', '#.#.#', '#..##', '#..##', '#...#'],
    O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
    R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
    S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
    T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
    U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
    Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
    ' ': ['...', '...', '...', '...', '...', '...', '...'],
  };

  // One word as blocks. Every O is a pit that holds a seed.
  function word(text, x0, y0, u, fill, seed) {
    let x = x0, out = '';
    const gap = u * 0.14, r = u * 0.16;
    for (const ch of text.toUpperCase()) {
      const g = G[ch] || G[' '];
      g.forEach((row, ry) => [...row].forEach((c, cx) => {
        if (c !== '#') return;
        out += `<rect x="${(x + cx * u + gap / 2).toFixed(2)}" y="${(y0 + ry * u + gap / 2).toFixed(2)}" width="${(u - gap).toFixed(2)}" height="${(u - gap).toFixed(2)}" rx="${r.toFixed(2)}" fill="${fill}"/>`;
      }));
      if (ch === 'O') out += `<circle cx="${x + 2.5 * u}" cy="${y0 + 3.5 * u}" r="${u * 0.95}" fill="${seed}"/>`;
      x += (g[0].length + 1) * u;
    }
    return { svg: out, width: x - x0 - u };
  }

  // The wordmark: first word gold, second word cream, a woven stripe under both.
  function logo(name, { u = 8, stacked = false } = {}) {
    const [a, b = ''] = name.split(' ');
    const w1 = word(a, 0, 0, u, C.gold, C.green);
    const w2 = b ? word(b, stacked ? 0 : w1.width + 3 * u, stacked ? 9 * u : 0, u, C.cream, C.red) : { svg: '', width: 0 };
    const W = stacked ? Math.max(w1.width, w2.width) : w1.width + (b ? 3 * u + w2.width : 0);
    const H = (stacked && b ? 16 : 7) * u;
    const stripe = pattern('stripe', u / 2, W, H + u);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H + 2.5 * u}" role="img" aria-label="${name}">${w1.svg}${w2.svg}${stripe}</svg>`;
  }

  // Strip-weave tiles. Letters are colours: g gold, n green, r red, c cream, . empty.
  const TILES = {
    stripe: ['ggnnggrrggccggrr', 'ggnnggrrggccggrr', '................'],
    blocks: ['gg..rr..', 'gg..rr..', '..nn..gg', '..nn..gg'],
    zigzag: ['g...g...', '.g.g.g.g', '..g...g.', 'rrrrrrrr', 'n.n.n.n.'],
    steps: ['g.....', 'gg....', 'ggr...', 'ggrr..', 'ggrrn.', 'ggrrnn'],
  };
  const KEY = { g: C.gold, n: C.green, r: C.red, c: C.cream };
  function pattern(kind, px, width, y = 0) {
    const t = TILES[kind];
    let out = '';
    for (let x = 0; x < width; x += px) {
      t.forEach((row, ry) => {
        const c = row[Math.round(x / px) % row.length];
        if (KEY[c]) out += `<rect x="${x.toFixed(2)}" y="${(y + ry * px).toFixed(2)}" width="${(px + 0.3).toFixed(2)}" height="${(px + 0.3).toFixed(2)}" fill="${KEY[c]}"/>`;
      });
    }
    return out;
  }
  function band(kind, px = 6, cols = 96) {
    const h = TILES[kind].length * px;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cols * px} ${h}" preserveAspectRatio="xMinYMid slice" shape-rendering="crispEdges">${pattern(kind, px, cols * px)}</svg>`;
  }

  // A row of seeds for page bands: round, lit from the top left, never square blocks.
  function seedBand(count = 40, r = 9) {
    const cols = [C.gold, C.cream, C.green, C.gold, C.red, '#c9b99c'], step = r * 2 + 6;
    let out = '';
    for (let n = 0; n < count; n++) {
      const x = step / 2 + n * step, y = r + 3;
      out += `<circle cx="${x}" cy="${y}" r="${r}" fill="${cols[n % cols.length]}"/><circle cx="${x + r * 0.2}" cy="${y + r * 0.25}" r="${r}" fill="none" stroke="rgba(0,0,0,.28)" stroke-width="${r * 0.35}" clip-path="circle(${r}px at ${x}px ${y}px)"/><circle cx="${x - r * 0.35}" cy="${y - r * 0.38}" r="${r * 0.28}" fill="rgba(255,255,255,.75)"/>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${count * step} ${r * 2 + 6}" preserveAspectRatio="xMinYMid slice">${out}</svg>`;
  }

  return { NAME, C, logo, band, seedBand, TILES };
})();

if (typeof module !== 'undefined') module.exports = Brand;
