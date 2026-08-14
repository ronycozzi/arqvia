import { describe, expect, it } from "vitest";
import { fallbackClientConfig } from "./client-config";
import { buildLaunchReadiness } from "./launch-readiness";

describe("buildLaunchReadiness", () => {
  it("marks a fully configured production launch as ready", () => {
    const result = buildLaunchReadiness({
      config: {
        ...fallbackClientConfig,
        email: "hola@arqvia.com.ar",
        phone: "+54 351 555 1234",
        whatsapp: "5493517778899",
      },
      distributedRateLimitReady: true,
      homeContentReady: true,
      institutionalPagesReady: true,
      legalPagesReady: true,
      persistentMediaStorageReady: true,
      productionDatabaseReady: true,
      trustedProxyReady: true,
      siteUrl: "https://arqvia.com.ar",
      strictPublicUrlEnabled: true,
    });

    expect(result.status).toBe("ready");
    expect(result.score).toBe(100);
    expect(result.nextActions).toHaveLength(0);
  });

  it("flags local domains, missing strict guard and placeholder WhatsApp", () => {
    const result = buildLaunchReadiness({
      config: {
        ...fallbackClientConfig,
        email: "admin@arqvia.local",
        whatsapp: "5493510000000",
      },
      siteUrl: "http://localhost:3000",
      strictPublicUrlEnabled: false,
    });

    expect(result.status).not.toBe("ready");
    expect(
      result.checks.filter((item) => !item.ok).map((item) => item.label),
    ).toEqual(
      expect.arrayContaining([
        "Dominio publico",
        "Bloqueo anti-localhost",
        "WhatsApp comercial",
        "Email de contacto",
        "Base de datos de produccion",
        "Imagenes persistentes",
        "Proteccion antiabuso distribuida",
        "Proxy de confianza",
      ]),
    );
  });
});
