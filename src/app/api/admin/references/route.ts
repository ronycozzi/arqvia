import { NextResponse } from "next/server";
import {
  adminReferenceSearchSchema,
  findAdminReferenceOptions,
} from "@/lib/admin-reference-options";
import { getVerifiedAdminSession } from "@/lib/admin-auth";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const session = await getVerifiedAdminSession();
  if (!session) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  const searchParams = new URL(request.url).searchParams;
  const parsed = adminReferenceSearchSchema.safeParse({
    q: searchParams.get("q") || undefined,
    selectedId: searchParams.get("selectedId") || undefined,
    take: searchParams.get("take") || undefined,
    type: searchParams.get("type"),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Revisá los parámetros de búsqueda." },
      { status: 400 },
    );
  }

  const searchLimit = await rateLimit(
    `admin-reference-search:${session.user.id}:${getClientIp(request)}`,
    90,
    5 * 60_000,
  );
  if (!searchLimit.allowed) {
    return NextResponse.json(
      { message: "Esperá un momento antes de volver a buscar." },
      {
        headers: {
          "Retry-After": String(
            Math.max(Math.ceil((searchLimit.resetAt - Date.now()) / 1000), 1),
          ),
        },
        status: 429,
      },
    );
  }

  const result = await findAdminReferenceOptions(parsed.data);
  return NextResponse.json(result);
}
