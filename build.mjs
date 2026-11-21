// Joins the source files into one page: dist/index.html. Run: node build.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const read = (f) => readFileSync(new URL('./src/' + f, import.meta.url), 'utf8');
const page = read('index.html')
  .replace('/*CSS*/', () => read('style.css'))
  .replace('/*BRAND*/', () => read('brand.js'))
  .replace('/*ENGINE*/', () => read('engine.js'))
  .replace('/*APP*/', () => read('app.js'));

mkdirSync(new URL('./dist/', import.meta.url), { recursive: true });
writeFileSync(new URL('./dist/index.html', import.meta.url), page);
console.log('built dist/index.html', (page.length / 1024).toFixed(1) + ' KB');
