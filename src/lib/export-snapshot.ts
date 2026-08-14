import { createReadStream } from "node:fs";
import { mkdir, open, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline";

export const EXPORT_SNAPSHOT_PAGE_SIZE = 1_000;

export type IdSnapshotPageRequest<TWhere, TOrderBy> = {
  orderBy: TOrderBy;
  select: { createdAt: true; id: true };
  take: number;
  where: TWhere;
};

export type ExportIdSnapshot = {
  dispose: () => Promise<void>;
  openBatches: (batchSize: number) => AsyncGenerator<string[]>;
  rowCount: number;
};

export async function createExportIdSnapshot<TWhere, TOrderBy>({
  fetchPage,
  orderBy,
  prefix,
  where,
}: {
  fetchPage: (
    request: IdSnapshotPageRequest<TWhere, TOrderBy>,
  ) => Promise<Array<{ createdAt: Date; id: string }>>;
  orderBy: TOrderBy;
  prefix: string;
  where: TWhere;
}): Promise<ExportIdSnapshot> {
  const directory = path.join(os.tmpdir(), "arqvia-export-snapshots");
  await mkdir(directory, { recursive: true });
  const filePath = path.join(
    directory,
    `${prefix.replace(/[^a-z0-9-]/gi, "-")}-${randomUUID()}.ids`,
  );
  const handle = await open(filePath, "wx", 0o600);
  let pageWhere = where;
  let rowCount = 0;

  try {
    while (true) {
      const rows = await fetchPage({
        orderBy,
        select: { createdAt: true, id: true },
        take: EXPORT_SNAPSHOT_PAGE_SIZE,
        where: pageWhere,
      });
      if (rows.length) {
        await handle.writeFile(`${rows.map(({ id }) => id).join("\n")}\n`);
        rowCount += rows.length;
      }
      if (rows.length < EXPORT_SNAPSHOT_PAGE_SIZE) break;
      const cursor = rows.at(-1);
      if (!cursor) break;
      pageWhere = {
        AND: [
          where,
          {
            OR: [
              { createdAt: { lt: cursor.createdAt } },
              {
                createdAt: cursor.createdAt,
                id: { lt: cursor.id },
              },
            ],
          },
        ],
      } as TWhere;
    }
  } catch (error) {
    await handle.close().catch(() => undefined);
    await rm(filePath, { force: true }).catch(() => undefined);
    throw error;
  }

  await handle.close();
  let disposed = false;

  return {
    rowCount,
    async dispose() {
      if (disposed) return;
      disposed = true;
      await rm(filePath, { force: true });
    },
    async *openBatches(batchSize: number) {
      if (!Number.isInteger(batchSize) || batchSize < 1) {
        throw new RangeError("Snapshot batch size must be a positive integer");
      }
      const lines = createInterface({
        crlfDelay: Infinity,
        input: createReadStream(filePath, { encoding: "utf8" }),
      });
      let batch: string[] = [];
      try {
        for await (const line of lines) {
          if (!line) continue;
          batch.push(line);
          if (batch.length === batchSize) {
            yield batch;
            batch = [];
          }
        }
        if (batch.length) yield batch;
      } finally {
        lines.close();
      }
    },
  };
}
