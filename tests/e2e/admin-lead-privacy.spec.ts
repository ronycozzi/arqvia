import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { access, mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);

const prisma = new PrismaClient();
const testOrigin =
  process.env.PLAYWRIGHT_BASE_URL ||
  `http://localhost:${process.env.PLAYWRIGHT_PORT || "3100"}`;
const privateStorageDir = path.join(
  process.cwd(),
  "storage",
  "lead-attachments",
);

async function cleanupPrivacyFixtures() {
  await prisma.privateObjectDeletion.deleteMany({
    where: { storageKey: { startsWith: "local:privacy-" } },
  });
  const users = await prisma.user.findMany({
    where: { email: { startsWith: "privacy-" } },
    select: { id: true },
  });
  const leads = await prisma.lead.findMany({
    where: { email: { startsWith: "privacy-holder-" } },
    select: {
      attachments: { select: { id: true } },
      automationDeliveries: { select: { id: true } },
      estimate: { select: { id: true } },
      id: true,
      notes: { select: { id: true } },
      technicalVisit: { select: { id: true } },
    },
  });
  const userIds = users.map(({ id }) => id);
  const entityIds = leads.flatMap((lead) => [
    lead.id,
    ...lead.attachments.map(({ id }) => id),
    ...lead.automationDeliveries.map(({ id }) => id),
    ...lead.notes.map(({ id }) => id),
    ...(lead.estimate ? [lead.estimate.id] : []),
    ...(lead.technicalVisit ? [lead.technicalVisit.id] : []),
  ]);

  if (entityIds.length || userIds.length) {
    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          ...(entityIds.length ? [{ entityId: { in: entityIds } }] : []),
          ...(userIds.length ? [{ userId: { in: userIds } }] : []),
        ],
      },
    });
  }
  await prisma.lead.deleteMany({
    where: { email: { startsWith: "privacy-holder-" } },
  });
  await prisma.user.deleteMany({
    where: { email: { startsWith: "privacy-" } },
  });

  const files = await readdir(privateStorageDir).catch(() => [] as string[]);
  await Promise.all(
    files
      .filter((filename) => filename.startsWith("privacy-"))
      .map((filename) =>
        unlink(path.join(privateStorageDir, filename)).catch(() => undefined),
      ),
  );
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/admin/login?switch=1");
  await expect(page.locator("#admin-email")).toBeVisible();
  await page.locator("#admin-email").fill(email);
  await page.locator("#admin-password").fill(password);
  await page.getByRole("button", { name: /entrar al panel/i }).click();
  await expect(page.getByRole("heading", { name: /panel arqvia/i })).toBeVisible();
}

test.beforeAll(cleanupPrivacyFixtures);

test.afterAll(async () => {
  await cleanupPrivacyFixtures();
  await prisma.$disconnect();
});

test("privacy erasure is Admin-only and removes private data end to end", async ({
  browser,
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Avoid duplicate destructive DB writes");

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const password = "PrivacyE2E123!";
  const editorEmail = `privacy-editor-${suffix}@arqvia.local`;
  const adminEmail = `privacy-admin-${suffix}@arqvia.local`;
  const privateFilename = `privacy-${suffix}.txt`;
  const privateFilePath = path.join(
    process.cwd(),
    "storage",
    "lead-attachments",
    privateFilename,
  );
  const startedAt = new Date();

  const [editor, admin] = await Promise.all([
    prisma.user.create({
      data: {
        active: true,
        email: editorEmail,
        name: `Privacy Editor ${suffix}`,
        passwordHash: await hash(password, 10),
        role: "EDITOR",
      },
    }),
    prisma.user.create({
      data: {
        active: true,
        email: adminEmail,
        name: `Privacy Admin ${suffix}`,
        passwordHash: await hash(password, 10),
        role: "ADMIN",
      },
    }),
  ]);

  await mkdir(path.dirname(privateFilePath), { recursive: true });
  await writeFile(privateFilePath, "private attachment", { flag: "wx" });

  const lead = await prisma.lead.create({
    data: {
      city: "Córdoba",
      email: `privacy-holder-${suffix}@example.com`,
      message: `Mensaje privado ${suffix}`,
      name: `Titular Privacidad ${suffix}`,
      phone: `351${Date.now().toString().slice(-7)}`,
      projectType: "Vivienda",
      sourcePage: "/contacto",
      attachments: {
        create: {
          fileName: privateFilename,
          mimeType: "text/plain",
          originalName: `documento-${suffix}.txt`,
          sizeBytes: 18,
          storageKey: `local:${privateFilename}`,
        },
      },
      notes: {
        create: {
          body: `Nota con PII ${suffix}`,
          userId: editor.id,
        },
      },
      technicalVisit: {
        create: {
          address: `Dirección privada ${suffix}`,
          requestNotes: `Indicaciones privadas ${suffix}`,
        },
      },
      estimate: {
        create: {
          areaM2: 120,
          calculatedAt: new Date(),
          configVersion: 1,
          finishTier: "BALANCED",
          projectTypeKey: "vivienda",
          projectTypeLabel: "Vivienda",
          rateMaxUsdM2: 1400,
          rateMinUsdM2: 1100,
          totalMaxUsd: 168000,
          totalMinUsd: 132000,
        },
      },
      automationDeliveries: {
        create: {
          event: "LEAD_CREATED",
          payloadJson: JSON.stringify({ email: `privacy-holder-${suffix}@example.com` }),
        },
      },
    },
    include: {
      attachments: true,
      automationDeliveries: true,
      estimate: true,
      notes: true,
      technicalVisit: true,
    },
  });

  const relatedEntityIds = [
    lead.id,
    lead.attachments[0].id,
    lead.automationDeliveries[0].id,
    lead.estimate!.id,
    lead.notes[0].id,
    lead.technicalVisit!.id,
  ];

  await prisma.auditLog.createMany({
    data: [
      {
        action: "CREATE",
        entity: "Lead",
        entityId: lead.id,
        summary: `Consulta de ${lead.name} (${lead.email})`,
      },
      {
        action: "REQUEUE",
        entity: "LeadAutomationDelivery",
        entityId: lead.automationDeliveries[0].id,
        summary: `Entrega vinculada a ${lead.phone}`,
      },
    ],
  });

  const editorContext = await browser.newContext({ baseURL: testOrigin });
  const editorPage = await editorContext.newPage();
  await login(editorPage, editorEmail, password);
    await editorPage.goto(`/admin/leads/${lead.id}`);
    await expect(
      editorPage.getByRole("heading", { name: /privacidad y datos personales/i }),
    ).toHaveCount(0);

    const denied = await editorPage.request.delete(
      `/api/admin/leads/${lead.id}/privacy`,
      {
        data: { confirmation: "ELIMINAR" },
        headers: { Origin: testOrigin },
      },
    );
    expect(denied.status()).toBe(403);
    await expect
      .poll(() => prisma.lead.count({ where: { id: lead.id } }))
      .toBe(1);
    await editorContext.close();

    await login(page, adminEmail, password);
    await page.goto(`/admin/leads/${lead.id}`);

    await page.getByRole("button", { name: /eliminar por privacidad/i }).click();
    const dialog = page.getByRole("dialog", {
      name: /eliminar definitivamente la consulta/i,
    });
    await expect(dialog).toBeVisible();

    const confirmButton = dialog.getByRole("button", {
      name: /eliminar definitivamente/i,
    });
    await expect(confirmButton).toBeDisabled();
    await dialog.getByRole("checkbox").check();
    await dialog.getByLabel(/para confirmar, escribí eliminar/i).fill("ELIMINAR");
    await expect(confirmButton).toBeEnabled();

    const erasureResponse = await page.request.delete(
      `/api/admin/leads/${lead.id}/privacy`,
      {
        data: { confirmation: "ELIMINAR" },
        headers: { Origin: testOrigin },
      },
    );
    if (erasureResponse.status() !== 200) {
      throw new Error(
        `Privacy erasure returned ${erasureResponse.status()}: ${await erasureResponse.text()}`,
      );
    }

    await page.goto("/admin/leads");
    await expect(page).toHaveURL(/\/admin\/leads$/);
    await expect
      .poll(() => prisma.lead.count({ where: { id: lead.id } }))
      .toBe(0);

    const [attachments, notes, visits, estimates, deliveries, oldAudits] =
      await Promise.all([
        prisma.leadAttachment.count({ where: { leadId: lead.id } }),
        prisma.leadNote.count({ where: { leadId: lead.id } }),
        prisma.technicalVisit.count({ where: { leadId: lead.id } }),
        prisma.leadEstimate.count({ where: { leadId: lead.id } }),
        prisma.leadAutomationDelivery.count({ where: { leadId: lead.id } }),
        prisma.auditLog.count({
          where: { entityId: { in: relatedEntityIds } },
        }),
      ]);

    expect({ attachments, deliveries, estimates, notes, oldAudits, visits }).toEqual({
      attachments: 0,
      deliveries: 0,
      estimates: 0,
      notes: 0,
      oldAudits: 0,
      visits: 0,
    });

    const privacyAudit = await prisma.auditLog.findFirstOrThrow({
      where: {
        action: "PRIVACY_ERASURE",
        createdAt: { gte: startedAt },
        userId: admin.id,
      },
    });
    expect(privacyAudit).toMatchObject({
      action: "PRIVACY_ERASURE",
      entity: "PrivacyRequest",
      entityId: null,
      summary: "Consulta eliminada por solicitud del titular.",
      userId: admin.id,
    });

    const minimalAuditText = JSON.stringify(privacyAudit);
    for (const pii of [lead.id, lead.name, lead.email, lead.phone]) {
      expect(minimalAuditText).not.toContain(pii);
    }

    let privateObjectExists = true;
    try {
      await access(privateFilePath);
    } catch {
      privateObjectExists = false;
    }
    expect(privateObjectExists).toBe(false);
});
