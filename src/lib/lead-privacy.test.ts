// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const transactionClient = {
    auditLog: { create: vi.fn(), deleteMany: vi.fn() },
    lead: { delete: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() },
    leadAutomationDelivery: { updateMany: vi.fn() },
  };

  return {
    dispatchDeletion: vi.fn(),
    enqueueDeletion: vi.fn(),
    transaction: vi.fn(),
    transactionClient,
  };
});

vi.mock("@/lib/db", () => ({
  prisma: { $transaction: mocks.transaction },
}));

vi.mock("@/lib/private-object-deletion", () => ({
  dispatchPrivateObjectDeletion: mocks.dispatchDeletion,
  enqueuePrivateObjectDeletion: mocks.enqueueDeletion,
}));

import {
  eraseLeadForPrivacy,
  leadPrivacyAudit,
  LeadPrivacyAutomationBusyError,
} from "@/lib/lead-privacy";

function privacySnapshot({
  fenced = false,
  processing = false,
}: {
  fenced?: boolean;
  processing?: boolean;
} = {}) {
  return {
    attachments: [
      { id: "attachment-1", storageKey: "local:opaque-1.pdf" },
      { id: "attachment-2", storageKey: "s3:lead-attachments/opaque-2.jpg" },
    ],
    automationDeliveries: [
      {
        id: "delivery-1",
        lastAttemptAt: processing ? new Date() : null,
        status: processing ? "PROCESSING" : "PENDING",
      },
    ],
    estimate: { id: "estimate-1" },
    id: "lead-1",
    lastActivityAt: new Date("2026-07-01T12:00:00.000Z"),
    notes: [{ id: "note-1" }],
    privacyErasureRequestedAt: fenced ? new Date() : null,
    status: "LOST",
    technicalVisit: { id: "visit-1" },
    updatedAt: new Date("2026-07-16T12:00:00.000Z"),
  };
}

function arrangeSuccessfulTransactions() {
  const initial = privacySnapshot();
  const fenced = privacySnapshot({ fenced: true });
  mocks.transactionClient.lead.findUnique
    .mockResolvedValueOnce(initial)
    .mockResolvedValueOnce(fenced)
    .mockResolvedValueOnce(fenced);
}

describe("eraseLeadForPrivacy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(
      (callback: (tx: typeof mocks.transactionClient) => Promise<unknown>) =>
        callback(mocks.transactionClient),
    );
    mocks.transactionClient.lead.updateMany.mockResolvedValue({ count: 1 });
    mocks.transactionClient.lead.delete.mockResolvedValue({ id: "lead-1" });
    mocks.transactionClient.leadAutomationDelivery.updateMany.mockResolvedValue({
      count: 1,
    });
    mocks.transactionClient.auditLog.deleteMany.mockResolvedValue({ count: 6 });
    mocks.transactionClient.auditLog.create.mockResolvedValue({ id: "audit-1" });
    mocks.enqueueDeletion
      .mockResolvedValueOnce({ id: "deletion-1" })
      .mockResolvedValueOnce({ id: "deletion-2" });
    mocks.dispatchDeletion.mockResolvedValue("deleted");
  });

  it("fences automation, deletes PII transactionally, then processes durable object jobs", async () => {
    arrangeSuccessfulTransactions();

    await expect(
      eraseLeadForPrivacy({ actorUserId: "admin-1", leadId: "lead-1" }),
    ).resolves.toEqual({
      deletedObjects: 2,
      pendingObjectDeletions: 0,
      queuedObjectDeletions: 2,
    });

    expect(mocks.transactionClient.lead.updateMany).toHaveBeenCalledWith({
      data: { privacyErasureRequestedAt: expect.any(Date) },
      where: {
        id: "lead-1",
        privacyErasureRequestedAt: null,
        updatedAt: new Date("2026-07-16T12:00:00.000Z"),
      },
    });
    expect(mocks.enqueueDeletion.mock.calls.map(([, key]) => key)).toEqual([
      "local:opaque-1.pdf",
      "s3:lead-attachments/opaque-2.jpg",
    ]);
    expect(mocks.transactionClient.lead.delete).toHaveBeenCalledWith({
      where: { id: "lead-1" },
    });
    expect(mocks.dispatchDeletion.mock.calls.map(([id]) => id)).toEqual([
      "deletion-1",
      "deletion-2",
    ]);
    expect(mocks.transactionClient.auditLog.create).toHaveBeenCalledWith({
      data: { ...leadPrivacyAudit, entityId: null, userId: "admin-1" },
    });
  });

  it("keeps a privacy fence and waits while an already claimed delivery finishes", async () => {
    const initial = privacySnapshot({ processing: true });
    const fenced = privacySnapshot({ fenced: true, processing: true });
    mocks.transactionClient.lead.findUnique
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce(fenced);

    await expect(
      eraseLeadForPrivacy({ actorUserId: "admin-1", leadId: "lead-1" }),
    ).rejects.toBeInstanceOf(LeadPrivacyAutomationBusyError);

    expect(mocks.transactionClient.lead.updateMany).toHaveBeenCalledOnce();
    expect(mocks.transactionClient.lead.delete).not.toHaveBeenCalled();
    expect(mocks.dispatchDeletion).not.toHaveBeenCalled();
  });

  it("finishes database erasure while a failed storage operation remains retryable", async () => {
    arrangeSuccessfulTransactions();
    mocks.dispatchDeletion
      .mockResolvedValueOnce("deleted")
      .mockResolvedValueOnce("failed");

    await expect(
      eraseLeadForPrivacy({ actorUserId: "admin-1", leadId: "lead-1" }),
    ).resolves.toEqual({
      deletedObjects: 1,
      pendingObjectDeletions: 1,
      queuedObjectDeletions: 2,
    });

    expect(mocks.transactionClient.lead.delete).toHaveBeenCalledOnce();
  });
});
