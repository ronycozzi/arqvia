import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { getLatestLeadActivityAt } from "../src/lib/lead-activity";

const prisma = new PrismaClient();
const batchSize = 100;

async function main() {
  let cursor: string | undefined;
  let updated = 0;

  while (true) {
    const leads = await prisma.lead.findMany({
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { id: "asc" },
      select: {
        attachments: {
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
          take: 1,
        },
        createdAt: true,
        id: true,
        lastActivityAt: true,
        notes: {
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
          take: 1,
        },
        technicalVisit: { select: { updatedAt: true } },
        updatedAt: true,
      },
      take: batchSize,
    });

    if (!leads.length) break;

    const updates = leads.flatMap((lead) => {
      const lastActivityAt = getLatestLeadActivityAt([
        lead.createdAt,
        lead.updatedAt,
        lead.notes[0]?.createdAt,
        lead.attachments[0]?.createdAt,
        lead.technicalVisit?.updatedAt,
      ]);

      if (lead.lastActivityAt.getTime() === lastActivityAt.getTime()) {
        return [];
      }

      return [
        prisma.lead.update({
          where: { id: lead.id },
          data: {
            lastActivityAt,
            updatedAt: lead.updatedAt,
          },
          select: { id: true },
        }),
      ];
    });

    if (updates.length) {
      await prisma.$transaction(updates);
      updated += updates.length;
    }

    cursor = leads.at(-1)?.id;
    if (leads.length < batchSize) break;
  }

  console.log(`Lead activity backfill complete. Updated ${updated} lead(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
