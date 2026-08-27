import { promises as fs } from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const sourceRoot = path.join(root, "src");
const seededContentPath = path.join(root, "prisma", "seed.ts");
const outputPath = path.join(root, "src", "i18n", "generated", "en.json");
const singleWordAllowList = new Set([
  "Actividad",
  "Administrador",
  "Áreas",
  "Antes",
  "Automatizaciones",
  "Buscar",
  "Cancelar",
  "Categorías",
  "Contenido",
  "Cookies",
  "Dashboard",
  "Después",
  "Editar",
  "Eliminar",
  "Equipo",
  "Estado",
  "FAQ",
  "Filtros",
  "Guardar",
  "Imágenes",
  "Inicio",
  "Alcance",
  "Contacto",
  "Mensaje",
  "Obra",
  "Leads",
  "Legales",
  "Nosotros",
  "Operación",
  "Páginas",
  "Privacidad",
  "Proceso",
  "Proyectos",
  "Recursos",
  "Reportes",
  "Salir",
  "Servicios",
  "Sistema",
  "Sitio",
  "Términos",
  "Testimonios",
  "Todos",
  "Usuarios",
  "Visitas",
]);

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function looksLikeClassList(value: string) {
  const tokens = value.split(/\s+/);
  return (
    tokens.length > 2 &&
    tokens.filter((token) =>
      /^(?:[a-z]+:|!?-?\[|bg-|text-|border-|flex$|grid$|items-|justify-|gap-|p[trblxy]?-|m[trblxy]?-|w-|h-|size-|max-|min-|overflow-|transition|hover:|focus:|md:|lg:|xl:|sm:)/.test(
        token,
      ),
    ).length >= Math.ceil(tokens.length * 0.45)
  );
}

function isCandidate(rawValue: string) {
  const value = normalize(rawValue);
  if (value.length < 2 || value.length > 5_000) return false;
  if (!/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(value)) return false;
  if (/^(?:https?:|mailto:|tel:|\/|#|\.|@|--)/.test(value)) return false;
  if (/^[A-Z0-9_]+$/.test(value)) return false;
  if (/^[a-z0-9_-]+\.(?:png|jpe?g|webp|avif|svg|pdf|json|csv)$/i.test(value)) {
    return false;
  }
  if (looksLikeClassList(value)) return false;

  const words = value.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+/g) || [];
  return (
    words.length >= 2 ||
    /[ÁÉÍÓÚÜÑáéíóúüñ¿¡]/.test(value) ||
    singleWordAllowList.has(value)
  );
}

async function listSourceFiles(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) return listSourceFiles(target);
      if (!/\.(?:ts|tsx)$/.test(entry.name) || /\.(?:test|spec)\./.test(entry.name)) {
        return [];
      }
      return [target];
    }),
  );
  return files.flat();
}

function collectText(source: string, fileName: string, catalog: Set<string>) {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const add = (value: string) => {
    const normalized = normalize(value);
    if (isCandidate(normalized)) catalog.add(normalized);

    for (const paragraph of value.split(/\r?\n\s*\r?\n/)) {
      const normalizedParagraph = normalize(paragraph);
      if (normalizedParagraph !== normalized && isCandidate(normalizedParagraph)) {
        catalog.add(normalizedParagraph);
      }
    }
  };

  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node)) add(node.text);
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      add(node.text);
    }
    if (ts.isTemplateExpression(node)) {
      add(node.head.text);
      for (const span of node.templateSpans) add(span.literal.text);
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function decodeXml(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

async function translateBatch(values: string[], attempt = 1) {
  const source = values
    .map((value, index) => `<x id="${index}">${escapeXml(value)}</x>`)
    .join("\n");
  const body = new URLSearchParams({
    client: "gtx",
    dt: "t",
    q: source,
    sl: "es",
    tl: "en",
  });

  try {
    const response = await fetch(
      "https://translate.googleapis.com/translate_a/single",
      {
        body,
        headers: { "content-type": "application/x-www-form-urlencoded" },
        method: "POST",
      },
    );
    if (!response.ok) throw new Error(`Translation request failed: ${response.status}`);

    const data = (await response.json()) as Array<unknown>;
    const segments = data[0] as Array<[string]>;
    const translatedDocument = segments.map((segment) => segment[0]).join("");
    const translated = new Map<number, string>();
    const pattern = /<x id="(\d+)">([\s\S]*?)<\/x>/g;
    for (const match of translatedDocument.matchAll(pattern)) {
      translated.set(Number(match[1]), normalize(decodeXml(match[2])));
    }

    if (translated.size !== values.length) {
      throw new Error(`Expected ${values.length} translations, received ${translated.size}`);
    }

    return values.map((_, index) => translated.get(index) || values[index]);
  } catch (error) {
    if (attempt >= 5) throw error;
    await new Promise((resolve) => setTimeout(resolve, 1_500 * attempt * attempt));
    return translateBatch(values, attempt + 1);
  }
}

function createBatches(values: string[]) {
  const batches: string[][] = [];
  let batch: string[] = [];
  let size = 0;

  for (const value of values) {
    if (batch.length >= 16 || (batch.length && size + value.length > 3_600)) {
      batches.push(batch);
      batch = [];
      size = 0;
    }
    batch.push(value);
    size += value.length;
  }
  if (batch.length) batches.push(batch);
  return batches;
}

async function main() {
  const files = await listSourceFiles(sourceRoot);
  files.push(seededContentPath);
  const sourceCatalog = new Set<string>();
  for (const file of files) {
    collectText(await fs.readFile(file, "utf8"), file, sourceCatalog);
  }

  const values = [...sourceCatalog].sort((left, right) => left.localeCompare(right, "es"));
  let existingTranslations: Record<string, string> = {};
  try {
    existingTranslations = JSON.parse(
      await fs.readFile(outputPath, "utf8"),
    ) as Record<string, string>;
  } catch {
    // The first generation starts without a catalog to reuse.
  }

  const missingValues = values.filter((value) => !existingTranslations[value]);
  const batches = createBatches(missingValues);
  const translations: Record<string, string> = Object.fromEntries(
    values
      .filter((value) => existingTranslations[value])
      .map((value) => [value, existingTranslations[value]]),
  );

  for (let index = 0; index < batches.length; index += 1) {
    const batch = batches[index];
    const translated = await translateBatch(batch);
    for (let itemIndex = 0; itemIndex < batch.length; itemIndex += 1) {
      translations[batch[itemIndex]] = translated[itemIndex];
    }
    process.stdout.write(`\rTranslated ${index + 1}/${batches.length} batches`);
    await new Promise((resolve) => setTimeout(resolve, 120));
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(translations, null, 2)}\n`, "utf8");
  process.stdout.write(
    `\nWrote ${values.length} translations (${missingValues.length} new) to ${path.relative(root, outputPath)}\n`,
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
