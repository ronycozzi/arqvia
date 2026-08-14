// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const transactionClient = {
    auditLog: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    lead: {
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
  };

  return {
    deletePrivateMediaObject: vi.fn(),
    leadFindUnique: vi.fn(),
    transaction: vi.fn(),
    transactionClient,
  };
});

vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: mocks.transaction,
    lead: { findUnique: mocks.leadFindUnique },
  },
}));

vi.mock("@/lib/media-storage", () => ({
  deletePrivateMediaObject: mocks.deletePrivateMediaObject,
}));

import {
  eraseLeadForPrivacy,
  leadPrivacyAudit,
  LeadPrivacyStorageError,
} from "@/lib/lead-privacy";

function privacySnapshot(
  attachments: Array<{ id: string; storageKey: string }> = [
    { id: "attachment-1", storageKey: "local:plan-1.pdf" },
    { id: "attachment-2", storageKey: "s3:lead-attachments/photo-2.jpg" },
  ],
) {
  return {
    id: "lead-1",
    attachments,
    notes: [{ id: "note-1" }],
    technicalVisit: { id: "visit-1" },
    estimate: { id: "estimate-1" },
    automationDeliveries: [{ id: "delivery-1" }],
  };
}

describe("eraseLeadForPrivacy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(
      (callback: (tx: typeof mocks.transactionClient) => Promise<unknown>) =>
        callback(mocks.transactionClient),
    );
    mocks.transactionClient.lead.delete.mockResolvedValue({ id: "lead-1" });
    mocks.transactionClient.auditLog.deleteMany.mockResolvedValue({ count: 6 });
    mocks.transactionClient.auditLog.create.mockResolvedValue({ id: "audit-1" });
    mocks.deletePrivateMediaObject.mockResolvedValue(undefined);
  });

  it("deletes every private object before the transactional cascade and PII audit purge", async () => {
    const order: string[] = [];
    const snapshot = privacySnapshot();
    mocks.leadFindUnique.mockResolvedValue(snapshot);
    mocks.transactionClient.lead.findUnique.mockResolvedValue(snapshot);
    mocks.deletePrivateMediaObject.mockImplementation(async (storageKey) => {
      order.push(`storage:${storageKey}`);
    });
    mocks.transaction.mockImplementation(async (callback) => {
      order.push("transaction");
      return callback(mocks.transactionClient);
    });

    await eraseLeadForPrivacy({ actorUserId: "admin-1", leadId: "lead-1" });

    expect(order).toEqual([
      "storage:local:plan-1.pdf",
      "storage:s3:lead-attachments/photo-2.jpg",
      "transaction",
    ]);
    expect(mocks.transactionClient.lead.delete).toHaveBeenCalledWith({
      where: { id: "lead-1" },
    });
    expect(mocks.transactionClient.auditLog.deleteMany).toHaveBeenCalledWith({
      where: {
        entityId: {
          in: [
            "lead-1",
            "attachment-1",
            "attachment-2",
            "note-1",
            "delivery-1",
            "visit-1",
            "estimate-1",
          ],
        },
      },
    });
    expect(mocks.transactionClient.auditLog.create).toHaveBeenCalledWith({
      data: {
        ...leadPrivacyAudit,
        entityId: null,
        userId: "admin-1",
      },
    });

    const minimalAudit = mocks.transactionClient.auditLog.create.mock.calls[0][0]
      .data;
    expect(JSON.stringify(minimalAudit)).not.toContain("lead-1");
  });

  it("leaves database metadata untouched when a private object cannot be deleted", async () => {
    mocks.leadFindUnique.mockResolvedValue(privacySnapshot());
    mocks.deletePrivateMediaObject.mockRejectedValueOnce(
      new Error("storage unavailable"),
    );

    await expect(
      eraseLeadForPrivacy({ actorUserId: "admin-1", leadId: "lead-1" }),
    ).rejects.toBeInstanceOf(LeadPrivacyStorageError);

    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.transactionClient.lead.delete).not.toHaveBeenCalled();
    expect(mocks.transactionClient.auditLog.create).not.toHaveBeenCalled();
  });

  it("retries idempotent storage deletion when a new attachment appears", async () => {
    const initial = privacySnapshot([
      { id: "attachment-1", storageKey: "local:plan-1.pdf" },
    ]);
    const concurrent = privacySnapshot([
      { id: "attachment-1", storageKey: "local:plan-1.pdf" },
      { id: "attachment-2", storageKey: "local:photo-2.jpg" },
    ]);
    mocks.leadFindUnique
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce(concurrent);
    mocks.transactionClient.lead.findUnique.mockResolvedValue(concurrent);

    await eraseLeadForPrivacy({ actorUserId: "admin-1", leadId: "lead-1" });

    expect(mocks.deletePrivateMediaObject.mock.calls.map(([key]) => key)).toEqual([
      "local:plan-1.pdf",
      "local:plan-1.pdf",
      "local:photo-2.jpg",
    ]);
    expect(mocks.transaction).toHaveBeenCalledTimes(2);
    expect(mocks.transactionClient.lead.delete).toHaveBeenCalledTimes(1);
    expect(mocks.transactionClient.auditLog.create).toHaveBeenCalledTimes(1);
  });
});
