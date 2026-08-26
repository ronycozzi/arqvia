import "server-only";

import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { deletePrivateMediaObject } from "@/lib/media-storage";

const maxAttempts = 10;
const processingLeaseMs = 10 * 60_000;

export type PrivateObjectDeletionOutcome =
  | "deleted"
  | "failed"
  | "skipped";

function retryDelayMs(attempts: number) {
  return Math.min(24 * 60 * 60_000, 60_000 * 2 ** Math.max(0, attempts - 1));
}

export async function enqueuePrivateObjectDeletion(
  tx: Prisma.TransactionClient,
  storageKey: string,
) {
  return tx.privateObjectDeletion.upsert({
    where: { storageKey },
    create: { storageKey },
    update: {
      claimToken: null,
      deletedAt: null,
      lastErrorCode: null,
      nextAttemptAt: new Date(),
      status: "PENDING",
    },
    select: { id: true },
  });
}

async function failPrivateObjectDeletion(
  id: string,
  claimToken: string,
  attempts: number,
) {
  const updated = await prisma.privateObjectDeletion.updateMany({
    where: { claimToken, id, status: "PROCESSING" },
    data: {
      claimToken: null,
      lastErrorCode: "STORAGE_DELETE_FAILED",
      nextAttemptAt: new Date(Date.now() + retryDelayMs(attempts)),
      status: "FAILED",
    },
  });
  return updated.count === 1;
}

export async function dispatchPrivateObjectDeletion(
  id: string,
): Promise<PrivateObjectDeletionOutcome> {
  const claimToken = randomUUID();
  const now = new Date();
  const claimed = await prisma.privateObjectDeletion.updateMany({
    where: {
      attempts: { lt: maxAttempts },
      id,
      nextAttemptAt: { lte: now },
      status: { in: ["PENDING", "FAILED"] },
    },
    data: {
      attempts: { increment: 1 },
      claimToken,
      lastAttemptAt: now,
      lastErrorCode: null,
      status: "PROCESSING",
    },
  });
  if (claimed.count !== 1) return "skipped";

  const deletion = await prisma.privateObjectDeletion.findUnique({
    where: { id },
    select: { attempts: true, claimToken: true, storageKey: true },
  });
  if (!deletion || deletion.claimToken !== claimToken) return "skipped";

  try {
    await deletePrivateMediaObject(deletion.storageKey);
    const completed = await prisma.privateObjectDeletion.updateMany({
      where: { claimToken, id, status: "PROCESSING" },
      data: {
        claimToken: null,
        deletedAt: new Date(),
        lastErrorCode: null,
        status: "DELETED",
      },
    });
    return completed.count === 1 ? "deleted" : "skipped";
  } catch {
    const failed = await failPrivateObjectDeletion(
      id,
      claimToken,
      deletion.attempts,
    );
    return failed ? "failed" : "skipped";
  }
}

async function recoverExpiredDeletionLeases(now: Date) {
  await prisma.privateObjectDeletion.updateMany({
    where: {
      lastAttemptAt: {
        lt: new Date(now.getTime() - processingLeaseMs),
      },
      status: "PROCESSING",
    },
    data: {
      claimToken: null,
      lastErrorCode: "LEASE_EXPIRED",
      nextAttemptAt: now,
      status: "FAILED",
    },
  });
}

export async function processPrivateObjectDeletionBatch(
  limit = 25,
  now = new Date(),
) {
  await recoverExpiredDeletionLeases(now);
  const rows = await prisma.privateObjectDeletion.findMany({
    where: {
      attempts: { lt: maxAttempts },
      nextAttemptAt: { lte: now },
      status: { in: ["PENDING", "FAILED"] },
    },
    orderBy: [{ nextAttemptAt: "asc" }, { createdAt: "asc" }],
    select: { id: true },
    take: Math.min(100, Math.max(1, limit)),
  });
  const results = await Promise.all(
    rows.map(({ id }) => dispatchPrivateObjectDeletion(id)),
  );

  return {
    deleted: results.filter((result) => result === "deleted").length,
    failed: results.filter((result) => result === "failed").length,
    processed: results.filter((result) => result !== "skipped").length,
  };
}
