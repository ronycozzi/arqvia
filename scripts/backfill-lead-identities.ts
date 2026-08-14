import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import {
  normalizeLeadEmail,
  normalizeLeadPhone,
} from "../src/lib/lead-identity";

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
        email: true,
        id: true,
        normalizedEmail: true,
        normalizedPhone: true,
        phone: true,
        updatedAt: true,
      },
      take: batchSize,
    });

    if (!leads.length) break;

    const updates = leads.flatMap((lead) => {
        const normalizedEmail = normalizeLeadEmail(lead.email);
        const normalizedPhone = normalizeLeadPhone(lead.phone) || null;

        if (
          lead.normalizedEmail === normalizedEmail &&
          lead.normalizedPhone === normalizedPhone
        ) {
          return [];
        }

        updated += 1;
        return [
          prisma.lead.update({
            where: { id: lead.id },
            data: {
              normalizedEmail,
              normalizedPhone,
              updatedAt: lead.updatedAt,
            },
          }),
        ];
      });

    if (updates.length) await prisma.$transaction(updates);

    cursor = leads.at(-1)?.id;
    if (leads.length < batchSize) break;
  }

  console.log(`Lead identity backfill complete. Updated ${updated} lead(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
