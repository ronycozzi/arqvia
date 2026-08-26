import { NextResponse } from "next/server";
import { verifyAutomationBearerToken } from "@/lib/lead-automation-config";
import {
  processPrivateObjectDeletionBatch,
} from "@/lib/private-object-deletion";
import { readPrivateObjectDeletionConfig } from "@/lib/private-object-deletion-config";
import { logServerError } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStoreHeaders = { "Cache-Control": "no-store" };

async function run(request: Request) {
  const config = readPrivateObjectDeletionConfig();
  if (!config.ready) {
    return NextResponse.json(
      { message: "Procesador no configurado", ok: false },
      { headers: noStoreHeaders, status: 503 },
    );
  }
  if (
    !verifyAutomationBearerToken(
      request.headers.get("authorization"),
      config.cronSecret,
    )
  ) {
    return NextResponse.json(
      { message: "No autorizado", ok: false },
      { headers: noStoreHeaders, status: 401 },
    );
  }

  try {
    const result = await processPrivateObjectDeletionBatch();
    return NextResponse.json(
      { ok: result.failed === 0, ...result },
      {
        headers: noStoreHeaders,
        status: result.failed > 0 ? 503 : 200,
      },
    );
  } catch (error) {
    logServerError("private_object_deletion.cron_failed", error);
    return NextResponse.json(
      { message: "No se pudo procesar la cola", ok: false },
      { headers: noStoreHeaders, status: 500 },
    );
  }
}

export const GET = run;
export const POST = run;
