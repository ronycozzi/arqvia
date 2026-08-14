import { NextResponse } from "next/server";
import {
  readLeadAutomationConfig,
  verifyAutomationBearerToken,
} from "@/lib/lead-automation-config";
import { processLeadAutomationBatch } from "@/lib/lead-automation";
import { logServerError } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const noStoreHeaders = { "cache-control": "no-store" };

async function processAutomationRequest(request: Request) {
  const config = readLeadAutomationConfig();
  if (!config.cronReady) {
    return NextResponse.json(
      { ok: false, message: "Automatización no configurada" },
      { status: 503, headers: noStoreHeaders },
    );
  }
  if (
    !verifyAutomationBearerToken(
      request.headers.get("authorization"),
      config.cronSecret,
    )
  ) {
    return NextResponse.json(
      { ok: false, message: "No autorizado" },
      { status: 401, headers: noStoreHeaders },
    );
  }

  try {
    const result = await processLeadAutomationBatch(5);
    return NextResponse.json(
      { ok: true, ...result },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    logServerError("lead_automation.cron_failed", error);
    return NextResponse.json(
      { ok: false, message: "No se pudo procesar la cola" },
      { status: 500, headers: noStoreHeaders },
    );
  }
}

export const GET = processAutomationRequest;
export const POST = processAutomationRequest;
