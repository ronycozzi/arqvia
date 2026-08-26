import { describe, expect, it } from "vitest";
import {
  adminUserFormSchema,
  clientConfigSchema,
  leadCommercialProfileSchema,
  leadSchema,
  loginSchema,
} from "./validations";

describe("clientConfigSchema", () => {
  const config = {
    accentColor: "#b8864b",
    address: "Córdoba, Argentina",
    businessHours: "Lunes a viernes de 9 a 18",
    companyName: "Arqvia",
    email: "estudio@arqvia.com.ar",
    fontBody: "Inter",
    fontHeading: "Cormorant Garamond",
    heroImage: "/images/hero.webp",
    heroSubtitle: "Diseñamos y construimos espacios con una dirección clara.",
    heroTitle: "Arquitectura pensada para construirse bien.",
    logoUrl: "/images/logo.svg",
    phone: "+54 351 555 1234",
    primaryColor: "#181815",
    primaryCtaLabel: "Solicitar presupuesto",
    secondaryColor: "#f4f0e8",
    secondaryCtaLabel: "Ver proyectos",
    whatsapp: "5493515551234",
  };

  it("preserves supported legacy fonts until an explicit migration", () => {
    const parsed = clientConfigSchema.parse(config);

    expect(parsed.fontHeading).toBe("Cormorant Garamond");
    expect(parsed.fontBody).toBe("Inter");
  });
});

describe("leadCommercialProfileSchema", () => {
  it("normalizes optional USD amounts and a local follow-up date", () => {
    const result = leadCommercialProfileSchema.parse({
      leadId: "lead-1",
      assignedUserId: "admin-1",
      nextFollowUpAt: "2026-07-20T10:30",
      quotedAmountUsd: "85000",
      wonAmountUsd: "",
      lostReason: "",
    });

    expect(result.quotedAmountUsd).toBe(85_000);
    expect(result.wonAmountUsd).toBeUndefined();
  });

  it("rejects negative or unrealistic commercial amounts", () => {
    const result = leadCommercialProfileSchema.safeParse({
      leadId: "lead-1",
      quotedAmountUsd: "-10",
      wonAmountUsd: "100000001",
    });

    expect(result.success).toBe(false);
  });
});

describe("bcrypt password validation", () => {
  const adminUser = {
    active: true,
    email: "editor@example.com",
    name: "Editor",
    role: "EDITOR" as const,
  };

  it("accepts passwords up to 72 UTF-8 bytes", () => {
    const password = `${"A\u00e11!".repeat(14)}Aa`;

    expect(
      loginSchema.safeParse({ email: "admin@example.com", password }).success,
    ).toBe(true);
    expect(
      adminUserFormSchema.safeParse({ ...adminUser, password }).success,
    ).toBe(true);
  });

  it.each([
    ["lowercase", "ADMINISTRADOR123!"],
    ["uppercase", "administrador123!"],
    ["number", "AdministradorSeguro!"],
    ["symbol", "Administrador1234"],
  ])("rejects a new admin password without %s", (_requirement, password) => {
    expect(
      adminUserFormSchema.safeParse({ ...adminUser, password }).success,
    ).toBe(false);
  });

  it("parses an explicit false account state without coercing it to true", () => {
    const result = adminUserFormSchema.parse({
      ...adminUser,
      active: "false",
      password: "Administrador123!",
    });

    expect(result.active).toBe(false);
  });

  it("rejects login passwords over 72 UTF-8 bytes", () => {
    const result = loginSchema.safeParse({
      email: "admin@example.com",
      password: `${"\u00e1".repeat(36)}a`,
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((issue) => issue.path[0])).toContain(
      "password",
    );
  });

  it.each([
    ["creation", {}],
    ["password change", { id: "user-1" }],
  ])("rejects admin user %s passwords over 72 UTF-8 bytes", (_label, identity) => {
    const result = adminUserFormSchema.safeParse({
      ...adminUser,
      ...identity,
      password: "a".repeat(73),
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((issue) => issue.path[0])).toContain(
      "password",
    );
  });
});

describe("leadSchema", () => {
  it("accepts a qualified professional quote request", () => {
    const result = leadSchema.safeParse({
      name: "Cliente Demo",
      email: "cliente@example.com",
      phone: "+54 351 555 1212",
      city: "Córdoba Capital",
      projectType: "Remodelación",
      message: "Quiero remodelar una cocina y necesito orientación inicial.",
      sourcePage: "/contacto",
      needsVisit: true,
      hasPlans: false,
    });

    expect(result.success).toBe(true);
  });

  it("rejects short messages and invalid email", () => {
    const result = leadSchema.safeParse({
      name: "A",
      email: "mal",
      phone: "123",
      city: "",
      projectType: "",
      message: "hola",
      sourcePage: "/",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a phone made only of formatting characters", () => {
    const result = leadSchema.safeParse({
      name: "Cliente Demo",
      email: "cliente@example.com",
      phone: "() + --",
      city: "Cordoba Capital",
      projectType: "Remodelacion",
      message: "Quiero remodelar una cocina y necesito orientacion inicial.",
      sourcePage: "/contacto",
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((issue) => issue.path[0])).toContain("phone");
  });

  it.each(["351555121", "+54 351 555 1212 9999"])(
    "rejects a phone outside the supported international length: %s",
    (phone) => {
      const result = leadSchema.safeParse({
        name: "Cliente Demo",
        email: "cliente@example.com",
        phone,
        city: "Cordoba Capital",
        projectType: "Remodelacion",
        message: "Quiero remodelar una cocina y necesito orientacion inicial.",
        sourcePage: "/contacto",
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.issues.map((issue) => issue.path[0])).toContain("phone");
    },
  );

  it("accepts complete estimator metadata and normalizes numeric fields", () => {
    const result = leadSchema.safeParse({
      name: "Cliente Demo",
      email: "cliente@example.com",
      phone: "+54 351 555 1212",
      city: "Cordoba Capital",
      projectType: "Remodelacion",
      message: "Quiero remodelar una cocina y necesito orientacion inicial.",
      sourcePage: "/estimador",
      estimateRuleId: "rule-remodel",
      estimateTier: "BALANCED",
      estimateAreaM2: "120",
      estimateConfigVersion: "3",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toMatchObject({
      estimateRuleId: "rule-remodel",
      estimateTier: "BALANCED",
      estimateAreaM2: 120,
      estimateConfigVersion: 3,
    });
  });

  it("treats blank optional estimator fields as absent", () => {
    const result = leadSchema.safeParse({
      name: "Cliente Demo",
      email: "cliente@example.com",
      phone: "+54 351 555 1212",
      city: "Cordoba Capital",
      projectType: "Remodelacion",
      message: "Quiero remodelar una cocina y necesito orientacion inicial.",
      sourcePage: "/contacto",
      estimateRuleId: "",
      estimateTier: "",
      estimateAreaM2: "",
      estimateConfigVersion: "",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.estimateTier).toBeUndefined();
    expect(result.data.estimateAreaM2).toBeUndefined();
    expect(result.data.estimateConfigVersion).toBeUndefined();
  });

  it.each([
    [
      "rule",
      {
        estimateTier: "BALANCED",
        estimateAreaM2: "120",
        estimateConfigVersion: "3",
      },
      "estimateRuleId",
    ],
    [
      "tier",
      {
        estimateRuleId: "rule-remodel",
        estimateAreaM2: "120",
        estimateConfigVersion: "3",
      },
      "estimateTier",
    ],
    [
      "area",
      {
        estimateRuleId: "rule-remodel",
        estimateTier: "BALANCED",
        estimateConfigVersion: "3",
      },
      "estimateAreaM2",
    ],
    [
      "config version",
      {
        estimateRuleId: "rule-remodel",
        estimateTier: "BALANCED",
        estimateAreaM2: "120",
      },
      "estimateConfigVersion",
    ],
  ])("rejects partial estimator metadata without its %s", (_label, estimate, path) => {
    const result = leadSchema.safeParse({
      name: "Cliente Demo",
      email: "cliente@example.com",
      phone: "+54 351 555 1212",
      city: "Cordoba Capital",
      projectType: "Remodelacion",
      message: "Quiero remodelar una cocina y necesito orientacion inicial.",
      sourcePage: "/estimador",
      ...estimate,
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((issue) => issue.path[0])).toContain(path);
  });

  it("parses explicit string booleans without treating false as true", () => {
    const result = leadSchema.parse({
      name: "Consulta Validación",
      email: "consulta@example.com",
      phone: "+54 351 555 1212",
      city: "Córdoba Capital",
      projectType: "Remodelación",
      message: "Necesito ordenar el alcance de una remodelación integral.",
      sourcePage: "/contacto",
      needsVisit: "false",
      hasPlans: "0",
    });

    expect(result.needsVisit).toBe(false);
    expect(result.hasPlans).toBe(false);
  });

  it("rejects past preferred visit dates", () => {
    const yesterday = new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      month: "2-digit",
      timeZone: "America/Argentina/Cordoba",
      year: "numeric",
    }).format(new Date(Date.now() - 86_400_000));
    const result = leadSchema.safeParse({
      name: "Consulta Validación",
      email: "consulta@example.com",
      phone: "+54 351 555 1212",
      city: "Córdoba Capital",
      projectType: "Remodelación",
      message: "Necesito ordenar el alcance de una remodelación integral.",
      sourcePage: "/contacto",
      needsVisit: true,
      visitPreferredDate: yesterday,
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.flatten().fieldErrors.visitPreferredDate).toContain(
      "Elegí una fecha de hoy en adelante",
    );
  });
});
