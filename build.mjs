// Joins the source files into one page: dist/index.html. Run: node build.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const read = (f) => readFileSync(new URL('./src/' + f, import.meta.url), 'utf8');
const page = read('index.html')
  .replace('/*CSS*/', () => read('style.css'))
  .replace('/*BRAND*/', () => read('brand.js'))
  .replace('/*PIXEL*/', () => read('pixel.js'))
  .replace('/*ENGINE*/', () => read('engine.js'))
  .replace('/*APP*/', () => read('app.js'));

// dist/index.html is a complete web page for hosting. dist-artifact/index.html is the same page
// without the outer document tags, which is the form the Claude preview link needs.
const full = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#14110e"><style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}</style></head><body>
${page}</body></html>
`;
mkdirSync(new URL('./dist/', import.meta.url), { recursive: true });
mkdirSync(new URL('./dist-artifact/', import.meta.url), { recursive: true });
writeFileSync(new URL('./dist/index.html', import.meta.url), full);
writeFileSync(new URL('./dist-artifact/index.html', import.meta.url), page);
console.log('built dist/index.html', (page.length / 1024).toFixed(1) + ' KB');
