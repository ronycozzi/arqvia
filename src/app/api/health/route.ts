const responseHeaders = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
};

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ status: "ok" }, { headers: responseHeaders });
}
