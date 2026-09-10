// Captura de página completa HONESTA: recorre la página de arriba a abajo
// para que disparen los IntersectionObserver de los reveals, vuelve arriba y
// recién ahí saca la captura. Sin esto, todo lo que aparece "al entrar en
// pantalla" queda invisible y parece una sección vacía.
// Uso: node captura_scroll.mjs <url> <salidaSinExtension> [ancho]
import { chromium } from 'playwright';

const [url, salida, anchoArg] = process.argv.slice(2);
const ancho = Number(anchoArg ?? 1440);
const navegador = await chromium.launch();
const ctx = await navegador.newContext({ viewport: { width: ancho, height: 900 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
await p.goto(url, { waitUntil: 'load', timeout: 60_000 });
await p.waitForTimeout(1200);

const alto = await p.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < alto; y += 600) {
  await p.evaluate((yy) => window.scrollTo(0, yy), y);
  await p.waitForTimeout(220);
}
await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
await p.waitForTimeout(800);
await p.evaluate(() => window.scrollTo(0, 0));
await p.waitForTimeout(600);

const secciones = await p.evaluate(() =>
  [...document.querySelectorAll('main > section, main > div > section, body > section, section[id]')]
    .slice(0, 30)
    .map((s) => {
      const r = s.getBoundingClientRect();
      const texto = (s.innerText || '').trim().replace(/\s+/g, ' ');
      return `${s.id || s.tagName.toLowerCase()} alto=${Math.round(r.height)} texto=${texto.length} "${texto.slice(0, 60)}"`;
    }),
);
console.log(`alto total ${alto}px`);
for (const s of secciones) console.log('  ' + s);

await p.screenshot({ path: `${salida}.png`, fullPage: true });
console.log(`${salida}.png`);
await navegador.close();
