// Auditoría técnica de un sitio publicado: rastrea la portada y sus enlaces
// internos, y por página mide accesibilidad (axe), errores de consola,
// peticiones fallidas, metadatos SEO, imágenes, desborde en móvil, objetivos
// táctiles, encabezados y peso. Escribe un JSON por sitio y capturas.
//
// Uso: node auditoria.mjs <nombre> <url> <carpetaSalida> [maxPaginas]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

const [nombre, base, salida, maxArg] = process.argv.slice(2);
const MAX_PAGINAS = Number(maxArg ?? 10);
if (!nombre || !base || !salida) {
  console.error('uso: node auditoria.mjs <nombre> <url> <carpetaSalida> [maxPaginas]');
  process.exit(2);
}
fs.mkdirSync(salida, { recursive: true });

const origen = new URL(base).origin;
const navegador = await chromium.launch();

async function fetchEstado(url) {
  try {
    const r = await fetch(url, { method: 'GET', redirect: 'follow' });
    return r.status;
  } catch {
    return 0;
  }
}

async function auditarPagina(url, esPortada) {
  const contexto = await navegador.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const pagina = await contexto.newPage();
  const consola = [];
  const fallidas = [];
  const transferencias = [];
  pagina.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') consola.push(`${m.type()}: ${m.text().slice(0, 240)}`);
  });
  pagina.on('pageerror', (e) => consola.push(`pageerror: ${String(e.message).slice(0, 240)}`));
  pagina.on('response', async (r) => {
    const st = r.status();
    const u = r.url();
    if (st >= 400) fallidas.push(`${st} ${u.slice(0, 160)}`);
    try {
      const h = r.headers();
      const len = Number(h['content-length'] ?? 0);
      transferencias.push({ url: u, tipo: h['content-type'] ?? '', bytes: len });
    } catch {}
  });

  const t0 = Date.now();
  let estado = 0;
  try {
    const resp = await pagina.goto(url, { waitUntil: 'load', timeout: 60_000 });
    estado = resp?.status() ?? 0;
  } catch (e) {
    await contexto.close();
    return { url, estado: 0, error: String(e.message).slice(0, 200) };
  }
  await pagina.waitForTimeout(1500);
  const cargaMs = Date.now() - t0;

  const meta = await pagina.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const attr = (s, a) => q(s)?.getAttribute(a) ?? null;
    const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => Number(h.tagName[1]));
    const saltos = [];
    for (let i = 1; i < hs.length; i += 1) if (hs[i] - hs[i - 1] > 1) saltos.push(`${hs[i - 1]}→${hs[i]}`);
    const imgs = [...document.images].map((img) => {
      const r = img.getBoundingClientRect();
      return {
        src: (img.currentSrc || img.src || '').slice(0, 160),
        alt: img.getAttribute('alt'),
        natural: [img.naturalWidth, img.naturalHeight],
        render: [Math.round(r.width), Math.round(r.height)],
        visible: r.width > 0 && r.height > 0,
        lazy: img.loading,
      };
    });
    const sinAlt = imgs.filter((i) => i.alt === null && i.visible).length;
    const sobredimensionadas = imgs.filter(
      (i) => i.visible && i.render[0] > 0 && i.natural[0] > i.render[0] * 2.2 && i.natural[0] > 600,
    );
    const enlaces = [...document.querySelectorAll('a[href]')].map((a) => a.href);
    const internos = [...new Set(enlaces.filter((h) => h.startsWith(location.origin) && !h.includes('#') && !h.match(/\.(pdf|jpg|png|svg|webp|zip)$/i)))];
    const externos = [...new Set(enlaces.filter((h) => /^https?:/.test(h) && !h.startsWith(location.origin)))];
    const jsonld = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => {
      try { const j = JSON.parse(s.textContent); return Array.isArray(j) ? j.map((x) => x['@type']).join(',') : (j['@type'] ?? j['@graph']?.map((x) => x['@type']).join(',')); } catch { return 'INVALIDO'; }
    });
    const objetivosChicos = [...document.querySelectorAll('main a, main button, header a, header button, nav a, footer a')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && (r.height < 24 || r.width < 24);
      })
      .map((el) => `${el.tagName.toLowerCase()} "${(el.textContent || '').trim().slice(0, 40)}" ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`)
      .slice(0, 12);
    return {
      titulo: document.title,
      tituloLen: document.title.length,
      descripcion: attr('meta[name="description"]', 'content'),
      canonical: attr('link[rel="canonical"]', 'href'),
      ogTitle: attr('meta[property="og:title"]', 'content'),
      ogImage: attr('meta[property="og:image"]', 'content'),
      twitterCard: attr('meta[name="twitter:card"]', 'content'),
      robots: attr('meta[name="robots"]', 'content'),
      lang: document.documentElement.lang,
      viewport: attr('meta[name="viewport"]', 'content'),
      favicon: Boolean(q('link[rel~="icon"]')),
      jsonld,
      h1: document.querySelectorAll('h1').length,
      saltosEncabezado: saltos,
      imagenes: imgs.length,
      imagenesSinAlt: sinAlt,
      imagenesSobredimensionadas: sobredimensionadas.map((i) => `${i.src} natural=${i.natural.join('x')} render=${i.render.join('x')}`).slice(0, 8),
      enlacesInternos: internos,
      enlacesExternosSinRel: [...document.querySelectorAll('a[target="_blank"]')].filter((a) => !/noopener|noreferrer/.test(a.rel)).length,
      externos: externos.length,
      objetivosChicos,
      fuentes: performance.getEntriesByType('resource').filter((r) => /\.(woff2?|ttf|otf)(\?|$)/.test(r.name)).length,
      recursos: performance.getEntriesByType('resource').length,
      bytesTransferidos: performance.getEntriesByType('resource').reduce((s, r) => s + (r.transferSize || 0), 0),
      lcp: null,
    };
  });

  // Accesibilidad con axe.
  let axe = { violaciones: [], error: null };
  try {
    const res = await new AxeBuilder({ page: pagina }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice']).analyze();
    axe.violaciones = res.violations.map((v) => ({
      id: v.id,
      impacto: v.impact,
      ayuda: v.help,
      nodos: v.nodes.length,
      ejemplos: v.nodes.slice(0, 3).map((n) => (n.target?.[0] ?? '').toString().slice(0, 120)),
    }));
  } catch (e) {
    axe.error = String(e.message).slice(0, 200);
  }

  if (esPortada) {
    await pagina.screenshot({ path: path.join(salida, `${nombre}-escritorio.png`), fullPage: true });
  }
  await contexto.close();

  // Móvil: desborde, objetivos táctiles y captura.
  const movil = {};
  for (const w of [320, 390]) {
    const ctx = await navegador.newContext({ viewport: { width: w, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
    const p = await ctx.newPage();
    try {
      await p.goto(url, { waitUntil: 'load', timeout: 60_000 });
      await p.waitForTimeout(1200);
      movil[w] = await p.evaluate(() => {
        const doc = document.documentElement;
        const desborde = doc.scrollWidth > doc.clientWidth + 1;
        const culpables = desborde
          ? [...document.querySelectorAll('body *')].filter((el) => el.getBoundingClientRect().right > doc.clientWidth + 2).slice(0, 5).map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 50)}`)
          : [];
        const chicos = [...document.querySelectorAll('main a, main button, header a, header button, nav a')].filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && (r.height < 44 || r.width < 44);
        }).length;
        return { desborde, culpables, objetivosMenoresA44: chicos, altoDocumento: doc.scrollHeight };
      });
      if (esPortada && w === 390) await p.screenshot({ path: path.join(salida, `${nombre}-telefono.png`), fullPage: true });
    } catch (e) {
      movil[w] = { error: String(e.message).slice(0, 160) };
    }
    await ctx.close();
  }

  return { url, estado, cargaMs, consola: consola.slice(0, 20), fallidas: fallidas.slice(0, 20), meta, axe, movil };
}

const portada = await auditarPagina(base, true);
const resultados = [portada];
const vistas = new Set([portada.url, base]);
const cola = (portada.meta?.enlacesInternos ?? []).filter((u) => !vistas.has(u));

for (const u of cola) {
  if (resultados.length >= MAX_PAGINAS) break;
  if (vistas.has(u)) continue;
  vistas.add(u);
  resultados.push(await auditarPagina(u, false));
}

// Enlaces internos rotos (todas las páginas que se vieron y sus enlaces).
const todosEnlaces = new Set();
for (const r of resultados) for (const l of r.meta?.enlacesInternos ?? []) todosEnlaces.add(l);
const rotos = [];
for (const l of todosEnlaces) {
  const st = await fetchEstado(l);
  if (st >= 400 || st === 0) rotos.push(`${st} ${l}`);
}

// robots y sitemap
const robots = await fetchEstado(`${origen}/robots.txt`);
let sitemap = { estado: await fetchEstado(`${origen}/sitemap.xml`), urls: 0 };
if (sitemap.estado === 200) {
  try {
    const xml = await (await fetch(`${origen}/sitemap.xml`)).text();
    sitemap.urls = (xml.match(/<loc>/g) || []).length;
  } catch {}
}

const informe = { nombre, base, generado: new Date().toISOString(), robots, sitemap, enlacesRotos: rotos, paginas: resultados };
fs.writeFileSync(path.join(salida, `${nombre}.json`), JSON.stringify(informe, null, 1));

// Resumen legible
const lineas = [];
lineas.push(`# ${nombre} — ${base}`);
lineas.push(`robots.txt ${robots} · sitemap ${sitemap.estado} (${sitemap.urls} urls) · páginas auditadas ${resultados.length}`);
if (rotos.length) lineas.push(`ENLACES ROTOS: ${rotos.join(' | ')}`);
for (const r of resultados) {
  lineas.push(`\n## ${r.url} → ${r.estado} en ${r.cargaMs}ms`);
  if (r.error) { lineas.push(`  ERROR: ${r.error}`); continue; }
  const m = r.meta;
  const faltan = [];
  if (!m.descripcion) faltan.push('description');
  if (!m.canonical) faltan.push('canonical');
  if (!m.ogImage) faltan.push('og:image');
  if (!m.ogTitle) faltan.push('og:title');
  if (!m.twitterCard) faltan.push('twitter:card');
  if (!m.favicon) faltan.push('favicon');
  if (!m.jsonld.length) faltan.push('json-ld');
  lineas.push(`  título(${m.tituloLen}): ${m.titulo}`);
  if (m.descripcion && (m.descripcion.length < 70 || m.descripcion.length > 165)) lineas.push(`  description largo raro (${m.descripcion.length})`);
  if (faltan.length) lineas.push(`  SEO faltante: ${faltan.join(', ')}`);
  if (m.robots && /noindex/.test(m.robots)) lineas.push(`  robots: ${m.robots}`);
  if (m.h1 !== 1) lineas.push(`  h1 = ${m.h1}`);
  if (m.saltosEncabezado.length) lineas.push(`  saltos de encabezado: ${m.saltosEncabezado.join(', ')}`);
  if (m.imagenesSinAlt) lineas.push(`  imágenes sin alt: ${m.imagenesSinAlt}/${m.imagenes}`);
  if (m.imagenesSobredimensionadas.length) lineas.push(`  imágenes sobredimensionadas: ${m.imagenesSobredimensionadas.join(' | ')}`);
  if (m.enlacesExternosSinRel) lineas.push(`  target=_blank sin rel: ${m.enlacesExternosSinRel}`);
  if (m.objetivosChicos.length) lineas.push(`  objetivos < 24px (escritorio): ${m.objetivosChicos.join(' | ')}`);
  lineas.push(`  peso: ${(m.bytesTransferidos / 1024).toFixed(0)} KB en ${m.recursos} recursos · fuentes ${m.fuentes} · jsonld ${m.jsonld.join('/') || '-'}`);
  if (r.consola.length) lineas.push(`  consola: ${r.consola.join(' || ')}`);
  if (r.fallidas.length) lineas.push(`  peticiones fallidas: ${r.fallidas.join(' | ')}`);
  const graves = r.axe.violaciones.filter((v) => v.impacto === 'critical' || v.impacto === 'serious');
  const leves = r.axe.violaciones.filter((v) => v.impacto !== 'critical' && v.impacto !== 'serious');
  if (r.axe.error) lineas.push(`  axe error: ${r.axe.error}`);
  for (const v of graves) lineas.push(`  AXE ${v.impacto} ${v.id} (${v.nodos}): ${v.ayuda} — ${v.ejemplos.join(' ; ')}`);
  for (const v of leves) lineas.push(`  axe ${v.impacto} ${v.id} (${v.nodos}): ${v.ayuda}`);
  for (const w of [320, 390]) {
    const mv = r.movil[w];
    if (!mv) continue;
    if (mv.error) lineas.push(`  móvil ${w}: ERROR ${mv.error}`);
    else if (mv.desborde) lineas.push(`  móvil ${w}: DESBORDE horizontal — ${mv.culpables.join(', ')}`);
    if (mv && !mv.error && mv.objetivosMenoresA44) lineas.push(`  móvil ${w}: ${mv.objetivosMenoresA44} objetivos < 44px`);
  }
}
fs.writeFileSync(path.join(salida, `${nombre}.md`), lineas.join('\n'));
console.log(lineas.join('\n'));
await navegador.close();
