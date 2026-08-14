import { NextResponse } from "next/server";
import { commercialManagerRoles, getVerifiedAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import {
  buildLeadExportFilename,
  buildLeadExportWhere,
  createLeadExportStream,
  LEAD_EXPORT_BATCH_SIZE,
  leadExportOrderBy,
  parseLeadExportFilters,
} from "@/lib/lead-export";
import { isSameOriginRequest } from "@/lib/request-security";
import { createExportIdSnapshot } from "@/lib/export-snapshot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isSameOriginRequest(request, { requireSource: true })) {
    return NextResponse.json({ message: "Origen no permitido" }, { status: 403 });
  }

  const session = await getVerifiedAdminSession();
  if (!session?.user || !commercialManagerRoles.includes(session.user.role)) {
    return NextResponse.json({ message: "Permisos insuficientes" }, { status: 403 });
  }

  const filters = parseLeadExportFilters(new URL(request.url).searchParams);
  const where = buildLeadExportWhere(filters, session.user.id);
  const snapshot = await createExportIdSnapshot({
    fetchPage: (args) => prisma.lead.findMany(args),
    orderBy: leadExportOrderBy,
    prefix: "leads",
    where,
  });
  const snapshotRowCount = snapshot.rowCount;

  try {
    await prisma.auditLog.create({
      data: {
        action: "EXPORT_LEADS",
        entity: "Lead",
        summary: `Exportó ${snapshotRowCount} lead${snapshotRowCount === 1 ? "" : "s"} en CSV.`,
        userId: session.user.id,
      },
    });
  } catch (error) {
    await snapshot.dispose();
    throw error;
  }

  const stream = createLeadExportStream({
    where,
    snapshotBatches: () => snapshot.openBatches(LEAD_EXPORT_BATCH_SIZE),
    onComplete: snapshot.dispose,
    fetchPage: (args) => prisma.lead.findMany(args),
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${buildLeadExportFilename(filters)}"`,
      "Cache-Control": "no-store",
      "X-Arqvia-Export-Batch-Size": String(LEAD_EXPORT_BATCH_SIZE),
      "X-Arqvia-Export-Limit": "none",
      "X-Arqvia-Export-Row-Count": String(snapshotRowCount),
      "X-Arqvia-Export-Truncated": "false",
    },
  });
}
