import { Prisma } from "@prisma/client";
import { createHmac } from "node:crypto";
import { prisma } from "@/lib/db";

type Bucket = {
  count: number;
  resetAt: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
const maxSerializableRetries = 3;
let lastMemoryCleanupAt = 0;

export function buildRateLimitKey(scope: string, value: string) {
  const secret = process.env.AUTH_SECRET || "arqvia-local-rate-limit";
  const digest = createHmac("sha256", secret)
    .update(`${scope}:${value}`)
    .digest("hex");
  return `${scope}:${digest}`;
}

export function usesDistributedRateLimit() {
  return process.env.RATE_LIMIT_STORE === "database";
}

function memoryRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (buckets.size >= 1_000 && now - lastMemoryCleanupAt >= 60_000) {
    for (const [bucketKey, candidate] of buckets) {
      if (candidate.resetAt < now) buckets.delete(bucketKey);
    }
    lastMemoryCleanupAt = now;
  }
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return { allowed: true, remaining: limit - bucket.count, resetAt: bucket.resetAt };
}

async function databaseRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  for (let attempt = 0; attempt < maxSerializableRetries; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const now = new Date();
          const nextResetAt = new Date(now.getTime() + windowMs);
          const bucket = await tx.rateLimitBucket.findUnique({ where: { key } });

          if (!bucket || bucket.resetAt < now) {
            const fresh = await tx.rateLimitBucket.upsert({
              where: { key },
              create: { count: 1, key, resetAt: nextResetAt },
              update: { count: 1, resetAt: nextResetAt },
            });

            return {
              allowed: true,
              remaining: Math.max(limit - fresh.count, 0),
              resetAt: fresh.resetAt.getTime(),
            };
          }

          if (bucket.count >= limit) {
            return {
              allowed: false,
              remaining: 0,
              resetAt: bucket.resetAt.getTime(),
            };
          }

          const updated = await tx.rateLimitBucket.update({
            where: { key },
            data: { count: { increment: 1 } },
          });

          return {
            allowed: true,
            remaining: Math.max(limit - updated.count, 0),
            resetAt: updated.resetAt.getTime(),
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      const retryable =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034";
      if (!retryable || attempt === maxSerializableRetries - 1) throw error;
    }
  }

  throw new Error("Rate limit transaction could not be completed.");
}

export async function rateLimit(
  key: string,
  limit = 5,
  windowMs = 60_000,
): Promise<RateLimitResult> {
  if (usesDistributedRateLimit()) {
    return databaseRateLimit(key, limit, windowMs);
  }

  return memoryRateLimit(key, limit, windowMs);
}

export async function checkRateLimit(key: string, limit = 5) {
  if (usesDistributedRateLimit()) {
    const bucket = await prisma.rateLimitBucket.findUnique({ where: { key } });
    return !bucket || bucket.resetAt < new Date() || bucket.count < limit;
  }

  const bucket = buckets.get(key);
  return !bucket || bucket.resetAt < Date.now() || bucket.count < limit;
}

export async function clearRateLimit(key: string) {
  if (usesDistributedRateLimit()) {
    await prisma.rateLimitBucket.deleteMany({ where: { key } });
    return;
  }

  buckets.delete(key);
}

export async function releaseRateLimitReservation(key: string) {
  if (!usesDistributedRateLimit()) {
    const bucket = buckets.get(key);
    if (!bucket) return;
    if (bucket.resetAt < Date.now() || bucket.count <= 1) {
      buckets.delete(key);
      return;
    }
    bucket.count -= 1;
    return;
  }

  for (let attempt = 0; attempt < maxSerializableRetries; attempt += 1) {
    try {
      await prisma.$transaction(
        async (tx) => {
          const bucket = await tx.rateLimitBucket.findUnique({ where: { key } });
          if (!bucket) return;
          if (bucket.resetAt < new Date() || bucket.count <= 1) {
            await tx.rateLimitBucket.deleteMany({ where: { key } });
            return;
          }
          await tx.rateLimitBucket.update({
            where: { key },
            data: { count: { decrement: 1 } },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      return;
    } catch (error) {
      const retryable =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034";
      if (!retryable || attempt === maxSerializableRetries - 1) throw error;
    }
  }
}

export function getClientIp(request: Request) {
  const provider =
    process.env.TRUST_PROXY_PROVIDER ||
    (process.env.VERCEL ? "vercel" : process.env.CF_PAGES ? "cloudflare" : "none");
  const firstAddress = (value: string | null) =>
    value?.split(",")[0]?.trim() || null;

  if (provider === "cloudflare") {
    return firstAddress(request.headers.get("cf-connecting-ip")) || "unknown";
  }
  if (provider === "vercel") {
    return (
      firstAddress(request.headers.get("x-vercel-forwarded-for")) ||
      firstAddress(request.headers.get("x-forwarded-for")) ||
      "unknown"
    );
  }
  return "untrusted-proxy";
}
