import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { publicEnv } from "@/lib/public-env";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function buildWhatsAppUrl(message: string, explicitNumber?: string) {
  const number = normalizeWhatsAppNumber(
    explicitNumber || publicEnv.NEXT_PUBLIC_WHATSAPP_NUMBER,
  );
  if (!number) return "/contacto";
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function normalizeWhatsAppNumber(value: string) {
  if (!/^\+?[0-9\s().-]+$/.test(value.trim())) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

export function buildContextualWhatsAppMessage({
  companyName,
  fallback,
  pathname,
}: {
  companyName: string;
  fallback: string;
  pathname?: string | null;
}) {
  const cleanPath = pathname?.split(/[?#]/)[0] || "/";
  if (cleanPath === "/" || cleanPath === "/contacto" || cleanPath === "/gracias") {
    return fallback;
  }

  const context = cleanPath.startsWith("/proyectos/")
    ? "un proyecto"
    : cleanPath.startsWith("/servicios/")
      ? "un servicio"
      : cleanPath.startsWith("/blog/")
        ? "una guía"
        : cleanPath.startsWith("/zonas/")
          ? "la cobertura en mi zona"
          : cleanPath === "/estimador"
            ? "el estimador de inversión"
            : "información del sitio";

  return `Hola, vi ${context} de ${companyName} y quiero recibir orientación. Referencia: ${cleanPath}`;
}

export function buildContactHref(pathname?: string | null) {
  const cleanPathname = pathname?.split(/[?#]/)[0] || "";
  if (
    !cleanPathname ||
    cleanPathname === "/" ||
    cleanPathname === "/contacto" ||
    cleanPathname === "/gracias" ||
    cleanPathname.startsWith("/admin")
  ) {
    return "/contacto";
  }

  return `/contacto?origen=${encodeURIComponent(cleanPathname)}`;
}

export function getBaseUrl() {
  return publicEnv.NEXT_PUBLIC_SITE_URL;
}

export function absoluteUrl(pathOrUrl: string, base = getBaseUrl()) {
  return new URL(pathOrUrl, base).toString();
}

export function metadataTitle(title: string, companyName = "Arqvia") {
  const separatorIndex = title.lastIndexOf(" | ");

  if (separatorIndex > 0) {
    return { absolute: `${title.slice(0, separatorIndex)} | ${companyName}` };
  }

  return title;
}
