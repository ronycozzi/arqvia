import { NextResponse } from "next/server";
import { processLeadRetentionBatch, readLeadRetentionConfig } from "@/lib/lead-retention";
import { verifyAutomationBearerToken } from "@/lib/lead-automation-config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function run(request: Request) {
  const config = readLeadRetentionConfig();
  if (
    !config.ready ||
    !verifyAutomationBearerToken(
      request.headers.get("authorization"),
      config.cronSecret,
    )
  ) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const result = await processLeadRetentionBatch();
  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
    status: result.failed > 0 ? 503 : 200,
  });
}

export const GET = run;
export const POST = run;
