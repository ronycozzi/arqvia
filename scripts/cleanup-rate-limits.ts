import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const retentionHours = 24;

async function main() {
  const cutoff = new Date(Date.now() - retentionHours * 60 * 60 * 1000);
  const result = await prisma.rateLimitBucket.deleteMany({
    where: { resetAt: { lt: cutoff } },
  });

  console.log(
    `Rate-limit cleanup complete: removed ${result.count} bucket(s) expired before ${cutoff.toISOString()}.`,
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.name : "Unknown cleanup error");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
