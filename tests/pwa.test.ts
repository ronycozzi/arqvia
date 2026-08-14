import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Script } from "node:vm";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import manifest from "../src/app/manifest";

const workspaceRoot = process.cwd();

function loadServiceWorkerFetchListener() {
  const source = readFileSync(join(workspaceRoot, "public", "sw.js"), "utf8");
  const listeners = new Map<string, (event: never) => void>();
  const fetchMock = vi.fn().mockResolvedValue({ ok: true });
  const workerScope = {
    addEventListener: (
      type: string,
      listener: (event: never) => void,
    ) => listeners.set(type, listener),
    clients: { claim: vi.fn() },
    location: { origin: "https://arqvia.test" },
    skipWaiting: vi.fn(),
  };

  new Script(source).runInNewContext({
    caches: {},
    fetch: fetchMock,
    self: workerScope,
    URL,
  });

  const fetchListener = listeners.get("fetch");
  if (!fetchListener) throw new Error("Service worker fetch listener not found");

  return { fetchListener, fetchMock };
}

function navigationEvent(pathname: string) {
  return {
    request: {
      headers: { has: () => false },
      method: "GET",
      mode: "navigate",
      url: `https://arqvia.test${pathname}`,
    },
    respondWith: vi.fn(),
  };
}

describe("Arqvia PWA", () => {
  it("publishes an installable, branded manifest without private shortcuts", async () => {
    const definition = await manifest();

    expect(definition).toMatchObject({
      short_name: "Arqvia",
      start_url: "/",
      scope: "/",
      display: "standalone",
      lang: "es-AR",
    });
    expect(definition.name).toContain("Arqvia");
    expect(definition.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sizes: "192x192", purpose: "any" }),
        expect.objectContaining({ sizes: "512x512", purpose: "any" }),
        expect.objectContaining({ sizes: "512x512", purpose: "maskable" }),
      ]),
    );

    const shortcutUrls = definition.shortcuts?.map((shortcut) => shortcut.url);
    expect(shortcutUrls).toEqual(["/proyectos", "/servicios", "/contacto"]);
    expect(JSON.stringify(definition)).not.toMatch(/\/admin|\/api/);
  });

  it.each([
    ["arqvia-192.png", 192],
    ["arqvia-512.png", 512],
    ["arqvia-maskable-512.png", 512],
    ["arqvia-apple-180.png", 180],
  ])("keeps %s as a valid square PNG", async (fileName, size) => {
    const metadata = await sharp(
      join(workspaceRoot, "public", "icons", fileName),
    ).metadata();

    expect(metadata.format).toBe("png");
    expect(metadata.width).toBe(size);
    expect(metadata.height).toBe(size);
  });

  it("keeps the service worker syntactically valid and privacy scoped", () => {
    const source = readFileSync(join(workspaceRoot, "public", "sw.js"), "utf8");

    expect(() => new Script(source)).not.toThrow();
    expect(source).toContain('const PRIVATE_PATH_PREFIXES = ["/admin", "/api"]');
    expect(source).toContain('const OFFLINE_URL = "/offline.html"');
    expect(source).toContain('const RECOVERY_SCRIPT_URL = "/offline-recovery.js"');
    expect(source).toContain("event.respondWith(cacheFirst(request))");
    expect(source).toContain("await delay(650)");
    expect(source).not.toContain("cache.put(");
    expect(source).not.toContain("localStorage");
    expect(source).not.toContain("indexedDB");
  });

  it.each(["/admin", "/admin/users", "/api", "/api/leads"])(
    "does not intercept private navigation to %s",
    (pathname) => {
      const { fetchListener, fetchMock } = loadServiceWorkerFetchListener();
      const event = navigationEvent(pathname);

      fetchListener(event as never);

      expect(event.respondWith).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it.each(["/", "/administracion", "/apiarios"])(
    "continues intercepting public navigation to %s",
    async (pathname) => {
      const { fetchListener, fetchMock } = loadServiceWorkerFetchListener();
      const event = navigationEvent(pathname);

      fetchListener(event as never);

      expect(event.respondWith).toHaveBeenCalledOnce();
      await event.respondWith.mock.calls[0][0];
      expect(fetchMock).toHaveBeenCalledOnce();
    },
  );

  it("ships an offline page with automatic same-origin recovery", () => {
    const source = readFileSync(
      join(workspaceRoot, "public", "offline.html"),
      "utf8",
    );

    expect(source).toContain("Volvamos a conectar.");
    expect(source).toContain("El sitio no pudo responder en este momento.");
    expect(source).toContain('data-recovery-status');
    expect(source).toContain('src="/offline-recovery.js"');
    expect(source).toContain('method="get"');
    expect(source).not.toMatch(/<script(?![^>]+src=)|onclick=/i);
  });

  it("keeps the recovery helper syntactically valid and same-origin", () => {
    const source = readFileSync(
      join(workspaceRoot, "public", "offline-recovery.js"),
      "utf8",
    );

    expect(() => new Script(source)).not.toThrow();
    expect(source).toContain('fetch(`/api/health?recovery=${Date.now()}`');
    expect(source).toContain("window.location.replace(targetPath)");
    expect(source).not.toMatch(/https?:\/\//i);
  });
});
