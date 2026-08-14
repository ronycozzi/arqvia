// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import {
  createExportIdSnapshot,
  EXPORT_SNAPSHOT_PAGE_SIZE,
} from "./export-snapshot";

describe("export ID snapshots", () => {
  it("captures large datasets in bounded cursor pages and replays batches", async () => {
    const rows = Array.from({ length: 2_105 }, (_, index) => ({
      createdAt: new Date(Date.UTC(2026, 6, 16, 12, 0, Math.floor(index / 2))),
      id: `row-${String(index).padStart(5, "0")}`,
    })).reverse();
    const orderBy = [{ createdAt: "desc" as const }, { id: "desc" as const }];
    let offset = 0;
    const fetchPage = vi.fn(async ({ take, orderBy: receivedOrder }) => {
      expect(take).toBe(EXPORT_SNAPSHOT_PAGE_SIZE);
      expect(receivedOrder).toEqual(orderBy);
      const page = rows.slice(offset, offset + take);
      offset += page.length;
      return page;
    });
    const snapshot = await createExportIdSnapshot({
      fetchPage,
      orderBy,
      prefix: "test",
      where: { status: "NEW" },
    });

    try {
      const batches: string[][] = [];
      for await (const batch of snapshot.openBatches(137)) batches.push(batch);

      expect(snapshot.rowCount).toBe(2_105);
      expect(fetchPage).toHaveBeenCalledTimes(3);
      expect(batches.flat()).toEqual(rows.map(({ id }) => id));
      expect(Math.max(...batches.map((batch) => batch.length))).toBe(137);
      const firstCursor = rows[EXPORT_SNAPSHOT_PAGE_SIZE - 1];
      expect(fetchPage.mock.calls[1]?.[0].where).toEqual({
        AND: [
          { status: "NEW" },
          {
            OR: [
              { createdAt: { lt: firstCursor.createdAt } },
              {
                createdAt: firstCursor.createdAt,
                id: { lt: firstCursor.id },
              },
            ],
          },
        ],
      });
    } finally {
      await snapshot.dispose();
      await snapshot.dispose();
    }

    await expect(async () => {
      for await (const _batch of snapshot.openBatches(10)) {
        void _batch;
      }
    }).rejects.toThrow();
  });
});
