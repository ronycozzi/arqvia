import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const batchSize = 100;

async function main() {
  let ensured = 0;

  while (true) {
    const leads = await prisma.lead.findMany({
      where: {
        needsVisit: true,
        technicalVisit: null,
      },
      orderBy: { id: "asc" },
      select: { id: true, lastActivityAt: true },
      take: batchSize,
    });

    if (!leads.length) break;

    await prisma.$transaction(
      leads.map((lead) =>
        prisma.technicalVisit.upsert({
          where: { leadId: lead.id },
          create: {
            id: `visit_${lead.id}`,
            leadId: lead.id,
            preferredWindow: "FLEXIBLE",
            status: "REQUESTED",
            createdAt: lead.lastActivityAt,
            updatedAt: lead.lastActivityAt,
          },
          update: {},
        }),
      ),
    );
    ensured += leads.length;
  }

  console.log(`Technical visit backfill complete. Ensured ${ensured} visit(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
