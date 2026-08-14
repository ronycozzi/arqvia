import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourcePath = path.join(root, "prisma", "schema.prisma");
const targetPath = path.join(root, "prisma", "postgresql", "schema.prisma");

const source = await readFile(sourcePath, "utf8");

if (!source.includes('provider = "sqlite"')) {
  throw new Error(
    'Expected prisma/schema.prisma to use provider = "sqlite" before generating PostgreSQL schema.',
  );
}

const generated = [
  "// Generated from prisma/schema.prisma.",
  "// Run `npm run db:postgres:schema` after schema changes.",
  source.replace('provider = "sqlite"', 'provider = "postgresql"'),
].join("\n");

await mkdir(path.dirname(targetPath), { recursive: true });
await writeFile(targetPath, generated, "utf8");

console.log(`Generated ${path.relative(root, targetPath)} from prisma/schema.prisma`);
