import { PrismaClient, Prisma } from "@prisma/client";
import { serverEnv } from "@/lib/server-env";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const prismaLog: Prisma.PrismaClientOptions["log"] =
  serverEnv.PRISMA_LOG_QUERIES === "true"
    ? ["query", "error", "warn"]
    : ["error", "warn"];

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: prismaLog,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
