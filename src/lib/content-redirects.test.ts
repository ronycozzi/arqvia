// @vitest-environment node

import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import {
  buildContentPath,
  ContentPathConflictError,
  deleteContentRedirects,
  syncContentRedirects,
} from "@/lib/content-redirects";
import { prisma } from "@/lib/db";

const resourceIds: string[] = [];

afterAll(async () => {
  await prisma.contentRedirect.deleteMany({
    where: { resourceId: { in: resourceIds } },
  });
});

describe("content redirect paths", () => {
  it.each([
    ["PROJECT", "casa-patio", "/proyectos/casa-patio"],
    ["SERVICE", "obra-llave-en-mano", "/servicios/obra-llave-en-mano"],
    ["BLOG_POST", "guia-de-obra", "/blog/guia-de-obra"],
    ["AREA", "villa-allende", "/zonas/villa-allende"],
  ] as const)("builds the canonical %s path", (resourceType, slug, expected) => {
    expect(buildContentPath(resourceType, slug)).toBe(expected);
  });

  it("flattens redirect chains and avoids a loop when a slug is reused", async () => {
    const resourceId = randomUUID();
    resourceIds.push(resourceId);

    await prisma.$transaction((tx) =>
      syncContentRedirects(tx, {
        currentPath: "/proyectos/casa-b",
        previousPath: "/proyectos/casa-a",
        resourceId,
        resourceType: "PROJECT",
      }),
    );
    await prisma.$transaction((tx) =>
      syncContentRedirects(tx, {
        currentPath: "/proyectos/casa-c",
        previousPath: "/proyectos/casa-b",
        resourceId,
        resourceType: "PROJECT",
      }),
    );

    await expect(
      prisma.contentRedirect.findMany({
        where: { resourceId },
        orderBy: { sourcePath: "asc" },
        select: { destinationPath: true, sourcePath: true },
      }),
    ).resolves.toEqual([
      {
        destinationPath: "/proyectos/casa-c",
        sourcePath: "/proyectos/casa-a",
      },
      {
        destinationPath: "/proyectos/casa-c",
        sourcePath: "/proyectos/casa-b",
      },
    ]);

    await prisma.$transaction((tx) =>
      syncContentRedirects(tx, {
        currentPath: "/proyectos/casa-a",
        previousPath: "/proyectos/casa-c",
        resourceId,
        resourceType: "PROJECT",
      }),
    );

    await expect(
      prisma.contentRedirect.findMany({
        where: { resourceId },
        orderBy: { sourcePath: "asc" },
        select: { destinationPath: true, sourcePath: true },
      }),
    ).resolves.toEqual([
      {
        destinationPath: "/proyectos/casa-a",
        sourcePath: "/proyectos/casa-b",
      },
      {
        destinationPath: "/proyectos/casa-a",
        sourcePath: "/proyectos/casa-c",
      },
    ]);
  });

  it("reserves aliases for their original content and deletes them atomically", async () => {
    const firstResourceId = randomUUID();
    const secondResourceId = randomUUID();
    resourceIds.push(firstResourceId, secondResourceId);

    await prisma.$transaction((tx) =>
      syncContentRedirects(tx, {
        currentPath: "/servicios/servicio-nuevo",
        previousPath: "/servicios/servicio-reservado",
        resourceId: firstResourceId,
        resourceType: "SERVICE",
      }),
    );

    await expect(
      prisma.$transaction((tx) =>
        syncContentRedirects(tx, {
          currentPath: "/servicios/servicio-reservado",
          resourceId: secondResourceId,
          resourceType: "SERVICE",
        }),
      ),
    ).rejects.toBeInstanceOf(ContentPathConflictError);

    await prisma.$transaction((tx) =>
      deleteContentRedirects(tx, "SERVICE", firstResourceId),
    );
    await expect(
      prisma.contentRedirect.count({ where: { resourceId: firstResourceId } }),
    ).resolves.toBe(0);
  });
});
