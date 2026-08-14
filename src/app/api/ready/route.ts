import { prisma } from "@/lib/db";
import { withTimeout } from "@/lib/promise-timeout";

export const dynamic = "force-dynamic";

const responseHeaders = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
};

export async function GET() {
  let databaseConnected = false;

  try {
    await withTimeout(
      (async () => {
        await prisma.$queryRaw`SELECT 1`;
        databaseConnected = true;
        await Promise.all([
          prisma.clientConfig.findFirst({ select: { id: true } }),
          prisma.lead.findFirst({ select: { id: true } }),
          prisma.user.findFirst({ select: { id: true } }),
        ]);
      })(),
      2_500,
    );

    return Response.json(
      {
        status: "ready",
        checks: { database: "ok", essentialTables: "ok" },
      },
      { headers: responseHeaders },
    );
  } catch {
    return Response.json(
      {
        status: "unavailable",
        checks: {
          database: databaseConnected ? "ok" : "unavailable",
          essentialTables: "unavailable",
        },
      },
      { headers: responseHeaders, status: 503 },
    );
  }
}
