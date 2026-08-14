import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  adminReferenceKinds,
  deduplicateAdminReferenceOptions,
  type AdminReferenceKind,
  type AdminReferenceOption,
} from "@/lib/admin-reference";
import { prisma } from "@/lib/db";

export const adminReferenceSearchSchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  selectedId: z.string().trim().max(120).optional().default(""),
  take: z.coerce.number().int().min(1).max(50).optional().default(30),
  type: z.enum(adminReferenceKinds),
});

type ReferenceSearchInput = z.infer<typeof adminReferenceSearchSchema>;

export async function findAdminReferenceOptions({
  q,
  selectedId,
  take,
  type,
}: ReferenceSearchInput): Promise<{
  hasMore: boolean;
  options: AdminReferenceOption[];
}> {
  const options: AdminReferenceOption[] =
    type === "services"
      ? await findServiceOptions(q, take)
      : await findProjectOptions(q, take);
  const hasMore = options.length > take;
  const limitedOptions = options.slice(0, take);

  if (
    selectedId &&
    !limitedOptions.some((option) => option.id === selectedId)
  ) {
    const selected =
      options.find((option) => option.id === selectedId) ||
      (await findSelectedOption(type, selectedId));
    if (selected) limitedOptions.unshift(selected);
  }

  return {
    hasMore,
    options: deduplicateAdminReferenceOptions(limitedOptions).slice(0, take),
  };
}

async function findServiceOptions(q: string, take: number) {
  const where: Prisma.ServiceWhereInput = q
    ? {
        OR: [
          { title: { contains: q } },
          { slug: { contains: q } },
          { shortDescription: { contains: q } },
        ],
      }
    : {};
  const rows = await prisma.service.findMany({
    orderBy: [{ title: "asc" }, { id: "asc" }],
    select: { id: true, slug: true, title: true },
    take: take + 1,
    where,
  });

  return rows.map((row) => ({
    id: row.id,
    label: row.title,
    meta: row.slug,
  }));
}

async function findProjectOptions(q: string, take: number) {
  const where: Prisma.ProjectWhereInput = q
    ? {
        OR: [
          { title: { contains: q } },
          { slug: { contains: q } },
          { location: { contains: q } },
        ],
      }
    : {};
  const rows = await prisma.project.findMany({
    orderBy: [{ title: "asc" }, { id: "asc" }],
    select: { id: true, location: true, title: true },
    take: take + 1,
    where,
  });

  return rows.map((row) => ({
    id: row.id,
    label: row.title,
    meta: row.location,
  }));
}

async function findSelectedOption(
  type: AdminReferenceKind,
  selectedId: string,
): Promise<AdminReferenceOption | null> {
  if (type === "services") {
    const row = await prisma.service.findUnique({
      select: { id: true, slug: true, title: true },
      where: { id: selectedId },
    });
    return row ? { id: row.id, label: row.title, meta: row.slug } : null;
  }

  const row = await prisma.project.findUnique({
    select: { id: true, location: true, title: true },
    where: { id: selectedId },
  });
  return row ? { id: row.id, label: row.title, meta: row.location } : null;
}
