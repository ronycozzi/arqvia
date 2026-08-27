import { NextResponse } from "next/server";
import {
  APP_LOCALE_COOKIE,
  APP_LOCALE_MAX_AGE,
  isAppLocale,
} from "@/lib/locale";

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin && origin !== requestUrl.origin) {
    return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const locale =
    body && typeof body === "object" && "locale" in body
      ? (body as { locale?: unknown }).locale
      : undefined;
  if (!isAppLocale(locale)) {
    return NextResponse.json({ error: "Idioma no permitido" }, { status: 400 });
  }

  const response = NextResponse.json({ locale });
  response.cookies.set({
    name: APP_LOCALE_COOKIE,
    value: locale,
    httpOnly: false,
    maxAge: APP_LOCALE_MAX_AGE,
    path: "/",
    priority: "medium",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
