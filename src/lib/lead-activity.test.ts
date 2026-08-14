import type { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import {
  buildLeadInactivityWhere,
  getLatestLeadActivityAt,
  touchLeadActivity,
} from "./lead-activity";

describe("lead activity", () => {
  it("uses the newest timestamp across lead data and related activity", () => {
    const latest = getLatestLeadActivityAt([
      new Date("2026-07-10T12:00:00.000Z"),
      new Date("2026-07-12T09:00:00.000Z"),
      null,
      new Date("2026-07-11T18:00:00.000Z"),
    ]);

    expect(latest).toEqual(new Date("2026-07-12T09:00:00.000Z"));
  });

  it("requires at least one historical timestamp", () => {
    expect(() => getLatestLeadActivityAt([null, undefined])).toThrow(
      RangeError,
    );
  });

  it("builds inactivity filters exclusively from lastActivityAt", () => {
    const staleSince = new Date("2026-07-13T12:00:00.000Z");

    expect(buildLeadInactivityWhere(staleSince)).toEqual({
      lastActivityAt: { lte: staleSince },
    });
  });

  it("touches the lead through the supplied transaction client", async () => {
    const update = vi.fn().mockResolvedValue({ id: "lead-1" });
    const tx = {
      lead: { update },
    } as unknown as Pick<Prisma.TransactionClient, "lead">;
    const lastActivityAt = new Date("2026-07-15T14:30:00.000Z");

    await touchLeadActivity(tx, "lead-1", lastActivityAt);

    expect(update).toHaveBeenCalledWith({
      where: { id: "lead-1" },
      data: { lastActivityAt },
      select: { id: true },
    });
  });
});
