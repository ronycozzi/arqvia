// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteObject: vi.fn(),
  findMany: vi.fn(),
  findUnique: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  prisma: {
    privateObjectDeletion: {
      findMany: mocks.findMany,
      findUnique: mocks.findUnique,
      updateMany: mocks.updateMany,
    },
  },
}));
vi.mock("@/lib/media-storage", () => ({
  deletePrivateMediaObject: mocks.deleteObject,
}));

import {
  dispatchPrivateObjectDeletion,
  processPrivateObjectDeletionBatch,
} from "@/lib/private-object-deletion";

describe("private object deletion outbox", () => {
  beforeEach(() => vi.clearAllMocks());

  it("claims, deletes and completes an opaque storage job", async () => {
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.findUnique.mockImplementation(async () => ({
      attempts: 1,
      claimToken: mocks.updateMany.mock.calls[0][0].data.claimToken,
      storageKey: "local:6fc6cc99-6df3-4afb-9558-a966524a21bc.pdf",
    }));
    mocks.deleteObject.mockResolvedValue(undefined);

    await expect(dispatchPrivateObjectDeletion("delete-1")).resolves.toBe(
      "deleted",
    );

    expect(mocks.deleteObject).toHaveBeenCalledOnce();
    expect(mocks.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          claimToken: null,
          deletedAt: expect.any(Date),
          status: "DELETED",
        }),
        where: expect.objectContaining({
          id: "delete-1",
          status: "PROCESSING",
        }),
      }),
    );
  });

  it("keeps a sanitized retry record when storage is unavailable", async () => {
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.findUnique.mockImplementation(async () => ({
      attempts: 2,
      claimToken: mocks.updateMany.mock.calls[0][0].data.claimToken,
      storageKey: "s3:lead-attachments/opaque.jpg",
    }));
    mocks.deleteObject.mockRejectedValue(new Error("provider secret details"));

    await expect(dispatchPrivateObjectDeletion("delete-2")).resolves.toBe(
      "failed",
    );

    const failure = mocks.updateMany.mock.calls.at(-1)?.[0];
    expect(failure.data.lastErrorCode).toBe("STORAGE_DELETE_FAILED");
    expect(JSON.stringify(failure)).not.toContain("provider secret details");
  });

  it("recovers expired leases and reports only jobs actually processed", async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 });
    mocks.findMany.mockResolvedValue([{ id: "delete-3" }]);

    await expect(
      processPrivateObjectDeletionBatch(25, new Date("2026-08-20T12:00:00Z")),
    ).resolves.toEqual({ deleted: 0, failed: 0, processed: 0 });

    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lastErrorCode: "LEASE_EXPIRED",
          status: "FAILED",
        }),
      }),
    );
  });
});
