import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { contentManagerRoles, getVerifiedAdminSession } from "@/lib/admin-auth";
import { readBoundedRequest } from "@/lib/bounded-request";
import { prisma } from "@/lib/db";
import {
  cleanMediaText,
  createMediaAssetFromFile,
} from "@/lib/media-upload";
import { formatMediaBytes, mediaUploadMaxRequestBytes } from "@/lib/media";
import { getMediaApproverLabel } from "@/lib/media-rights";
import { revalidateMediaSurfaces } from "@/lib/media-revalidation";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { isMultipartRequest, isSameOriginRequest } from "@/lib/request-security";

const mediaSearchSchema = z.object({
  category: z.string().trim().max(80).optional().default(""),
  q: z.string().trim().max(120).optional().default(""),
  take: z.coerce.number().int().min(1).max(50).optional().default(36),
});

export async function GET(request: Request) {
  const session = await getVerifiedAdminSession();
  if (!session) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  const searchParams = new URL(request.url).searchParams;
  const parsed = mediaSearchSchema.safeParse({
    category: searchParams.get("category") || undefined,
    q: searchParams.get("q") || undefined,
    take: searchParams.get("take") || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Revisá los filtros de búsqueda." },
      { status: 400 },
    );
  }

  const searchLimit = await rateLimit(
    `admin-media-search:${session.user.id}:${getClientIp(request)}`,
    60,
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

  const { category, q, take } = parsed.data;
  const where: Prisma.MediaAssetWhereInput = {
    rightsApprovedAt: { not: null },
    ...(category ? { category } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q } },
            { altText: { contains: q } },
            { category: { contains: q } },
            { url: { contains: q } },
          ],
        }
      : {}),
  };
  const rows = await prisma.mediaAsset.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      altText: true,
      category: true,
      id: true,
      title: true,
      url: true,
    },
    take: take + 1,
  });

  return NextResponse.json({
    assets: rows.slice(0, take),
    hasMore: rows.length > take,
  });
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request, { requireSource: true })) {
    return NextResponse.json({ message: "Origen no permitido" }, { status: 403 });
  }

  if (!isMultipartRequest(request)) {
    return NextResponse.json(
      { message: "Usá un formulario de subida válido." },
      { status: 415 },
    );
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > mediaUploadMaxRequestBytes) {
    return NextResponse.json(
      {
        errors: {
          file: [
            `El archivo es demasiado pesado. Máximo ${formatMediaBytes(mediaUploadMaxRequestBytes)} incluyendo datos del formulario.`,
          ],
        },
        message: "La imagen supera el máximo permitido.",
        ok: false,
      },
      { status: 413 },
    );
  }

  const session = await getVerifiedAdminSession(contentManagerRoles);
  if (!session) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  const uploadLimit = await rateLimit(
    `admin-media:${session.user.id}:${getClientIp(request)}`,
    12,
    10 * 60_000,
  );
  if (!uploadLimit.allowed) {
    return NextResponse.json(
      {
        message:
          "Se alcanzó el límite de subidas por unos minutos. Esperá y volvé a intentar.",
        ok: false,
      },
      {
        headers: {
          "Retry-After": String(
            Math.max(Math.ceil((uploadLimit.resetAt - Date.now()) / 1000), 1),
          ),
        },
        status: 429,
      },
    );
  }

  const boundedRequest = await readBoundedRequest(
    request,
    mediaUploadMaxRequestBytes,
  );
  if (!boundedRequest) {
    return NextResponse.json(
      {
        message: "La imagen supera el máximo permitido.",
        ok: false,
      },
      { status: 413 },
    );
  }

  const formData = await boundedRequest.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json(
      { message: "No se pudo leer el formulario de subida.", ok: false },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      {
        errors: { file: ["Seleccioná una imagen."] },
        message: "Revisá los campos marcados.",
      },
      { status: 400 },
    );
  }

  const result = await createMediaAssetFromFile({
    approvedBy: getMediaApproverLabel(session.user),
    altText: cleanMediaText(formData.get("altText")),
    category: cleanMediaText(formData.get("category")) || "Proyecto",
    file,
    rightsApproved: cleanMediaText(formData.get("rightsApproved")) === "true",
    rightsNote: cleanMediaText(formData.get("rightsNote")),
    sourceUrl: cleanMediaText(formData.get("sourceUrl")),
    title: cleanMediaText(formData.get("title")),
    userId: session.user.id,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: result.status || 400 });
  }

  revalidateMediaSurfaces();
  return NextResponse.json(
    {
      asset: result.asset,
      message: `Imagen subida correctamente. Ruta: ${result.asset.url}`,
      ok: true,
    },
    { status: 201 },
  );
}
