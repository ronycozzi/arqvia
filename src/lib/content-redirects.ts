import type { Prisma, RedirectResourceType } from "@prisma/client";
import { prisma } from "@/lib/db";

const resourceBasePaths: Record<RedirectResourceType, string> = {
  PROJECT: "/proyectos/",
  SERVICE: "/servicios/",
  BLOG_POST: "/blog/",
  AREA: "/zonas/",
};

type RedirectMutation = {
  currentPath: string;
  previousPath?: string | null;
  resourceId: string;
  resourceType: RedirectResourceType;
};

export class ContentPathConflictError extends Error {
  constructor(path: string) {
    super(`The public path ${path} is reserved by another content item.`);
    this.name = "ContentPathConflictError";
  }
}

export function buildContentPath(
  resourceType: RedirectResourceType,
  slug: string,
) {
  return `${resourceBasePaths[resourceType]}${slug}`;
}

function isValidResourcePath(
  path: string,
  resourceType: RedirectResourceType,
) {
  const basePath = resourceBasePaths[resourceType];
  return path.startsWith(basePath) && path.length > basePath.length;
}

export async function syncContentRedirects(
  tx: Prisma.TransactionClient,
  mutation: RedirectMutation,
) {
  const { currentPath, previousPath, resourceId, resourceType } = mutation;

  if (!isValidResourcePath(currentPath, resourceType)) {
    throw new Error("Invalid destination path for content redirect.");
  }

  const pathsToCheck = Array.from(
    new Set([currentPath, previousPath].filter((path): path is string => Boolean(path))),
  );
  const conflicts = await tx.contentRedirect.findMany({
    where: {
      sourcePath: { in: pathsToCheck },
      NOT: { resourceType, resourceId },
    },
    select: { sourcePath: true },
  });

  if (conflicts.length) {
    throw new ContentPathConflictError(conflicts[0].sourcePath);
  }

  await tx.contentRedirect.deleteMany({
    where: { sourcePath: currentPath, resourceType, resourceId },
  });

  if (!previousPath || previousPath === currentPath) return;
  if (!isValidResourcePath(previousPath, resourceType)) {
    throw new Error("Invalid source path for content redirect.");
  }

  await tx.contentRedirect.updateMany({
    where: { resourceType, resourceId },
    data: { destinationPath: currentPath },
  });

  await tx.contentRedirect.upsert({
    where: { sourcePath: previousPath },
    create: {
      sourcePath: previousPath,
      destinationPath: currentPath,
      resourceType,
      resourceId,
    },
    update: {
      destinationPath: currentPath,
      resourceType,
      resourceId,
    },
  });
}

export async function deleteContentRedirects(
  tx: Prisma.TransactionClient,
  resourceType: RedirectResourceType,
  resourceId: string,
) {
  await tx.contentRedirect.deleteMany({ where: { resourceType, resourceId } });
}

export async function getContentRedirectDestination(
  sourcePath: string,
  resourceType: RedirectResourceType,
) {
  if (!isValidResourcePath(sourcePath, resourceType)) return null;

  try {
    const entry = await prisma.contentRedirect.findUnique({
      where: { sourcePath },
      select: { destinationPath: true, resourceType: true },
    });

    if (
      !entry ||
      entry.resourceType !== resourceType ||
      entry.destinationPath === sourcePath ||
      !isValidResourcePath(entry.destinationPath, resourceType)
    ) {
      return null;
    }

    return entry.destinationPath;
  } catch {
    return null;
  }
}
