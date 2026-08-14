import { NextResponse } from "next/server";
import {
  AUDIT_EXPORT_BATCH_SIZE,
  auditExportOrderBy,
  buildAuditExportFilename,
  buildAuditLogWhere,
  createAuditExportStream,
  parseAuditLogFilters,
} from "@/lib/audit-export";
import { adminOnlyRoles, getVerifiedAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { isSameOriginRequest } from "@/lib/request-security";
import { createExportIdSnapshot } from "@/lib/export-snapshot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isSameOriginRequest(request, { requireSource: true })) {
    return NextResponse.json({ message: "Origen no permitido" }, { status: 403 });
  }

  const session = await getVerifiedAdminSession(adminOnlyRoles);
  if (!session) {
    return NextResponse.json({ message: "Permisos insuficientes" }, { status: 403 });
  }

  const filters = parseAuditLogFilters(new URL(request.url).searchParams);
  const where = buildAuditLogWhere(filters);
  const snapshot = await createExportIdSnapshot({
    fetchPage: (args) => prisma.auditLog.findMany(args),
    orderBy: auditExportOrderBy,
    prefix: "activity",
    where,
  });
  const snapshotRowCount = snapshot.rowCount;

  try {
    await prisma.auditLog.create({
      data: {
        action: "EXPORT_ACTIVITY",
        entity: "AuditLog",
        summary: `Exportó ${snapshotRowCount} movimiento${snapshotRowCount === 1 ? "" : "s"} del historial.`,
        userId: session.user.id,
      },
    });
  } catch (error) {
    await snapshot.dispose();
    throw error;
  }

  return new Response(
    createAuditExportStream({
      snapshotIds: [],
      snapshotBatches: () => snapshot.openBatches(AUDIT_EXPORT_BATCH_SIZE),
      onComplete: snapshot.dispose,
      fetchPage: (args) => prisma.auditLog.findMany(args),
    }),
    {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="${buildAuditExportFilename(filters)}"`,
        "Content-Type": "text/csv; charset=utf-8",
        "X-Arqvia-Export-Batch-Size": String(AUDIT_EXPORT_BATCH_SIZE),
        "X-Arqvia-Export-Row-Count": String(snapshotRowCount),
        "X-Arqvia-Export-Truncated": "false",
      },
    },
  );
}
