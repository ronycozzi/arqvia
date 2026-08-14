// @vitest-environment node

import { describe, expect, it } from "vitest";
import { readBoundedJson, readBoundedRequest } from "@/lib/bounded-request";

describe("readBoundedRequest", () => {
  it("preserves a request that stays within the real byte limit", async () => {
    const request = new Request("https://arqvia.test/api/upload", {
      body: "contenido",
      headers: { "content-type": "text/plain", "x-request-id": "arqvia" },
      method: "POST",
    });

    const bounded = await readBoundedRequest(request, 9);

    expect(bounded).not.toBeNull();
    expect(bounded?.method).toBe("POST");
    expect(bounded?.headers.get("x-request-id")).toBe("arqvia");
    await expect(bounded?.text()).resolves.toBe("contenido");
  });

  it("accepts a body exactly at the limit", async () => {
    const request = new Request("https://arqvia.test/api/upload", {
      body: "12345",
      method: "POST",
    });

    const bounded = await readBoundedRequest(request, 5);

    await expect(bounded?.text()).resolves.toBe("12345");
  });

  it("rejects a declared oversized body before consuming it", async () => {
    const request = new Request("https://arqvia.test/api/upload", {
      body: "small",
      headers: { "content-length": "100" },
      method: "POST",
    });

    await expect(readBoundedRequest(request, 10)).resolves.toBeNull();
    await expect(request.text()).resolves.toBe("small");
  });

  it("rejects an oversized streamed body without trusting headers", async () => {
    const request = new Request("https://arqvia.test/api/upload", {
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("1234"));
          controller.enqueue(new TextEncoder().encode("5678"));
          controller.close();
        },
      }),
      duplex: "half",
      method: "POST",
    } as RequestInit & { duplex: "half" });

    await expect(readBoundedRequest(request, 7)).resolves.toBeNull();
  });

  it("cancels a body that does not arrive before the deadline", async () => {
    let cancelled = false;
    const request = new Request("https://arqvia.test/api/upload", {
      body: new ReadableStream({
        cancel() {
          cancelled = true;
        },
      }),
      duplex: "half",
      method: "POST",
    } as RequestInit & { duplex: "half" });

    await expect(readBoundedRequest(request, 100, 5)).resolves.toBeNull();
    expect(cancelled).toBe(true);
  });
});

describe("readBoundedJson", () => {
  it("parses JSON only after enforcing the byte limit", async () => {
    const valid = new Request("https://arqvia.test/api/admin", {
      body: JSON.stringify({ status: "NEW" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    await expect(readBoundedJson(valid, 64)).resolves.toEqual({
      ok: true,
      value: { status: "NEW" },
    });

    const oversized = new Request("https://arqvia.test/api/admin", {
      body: JSON.stringify({ body: "x".repeat(200) }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    await expect(readBoundedJson(oversized, 64)).resolves.toEqual({
      ok: false,
      status: 413,
    });
  });

  it("returns a controlled error for malformed JSON", async () => {
    const request = new Request("https://arqvia.test/api/admin", {
      body: "{invalid",
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    await expect(readBoundedJson(request, 64)).resolves.toEqual({
      ok: false,
      status: 400,
    });
  });
});
