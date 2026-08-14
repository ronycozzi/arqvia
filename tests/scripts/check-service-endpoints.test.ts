import {
  resolveServiceOrigin,
  serviceOrigin,
  validateServiceResponse,
} from "../../scripts/check-service-endpoints";
import { describe, expect, it } from "vitest";

function response(status: number, payload: unknown, contentType = "application/json; charset=utf-8") {
  return new Response(JSON.stringify(payload), {
    headers: { "content-type": contentType },
    status,
  });
}

describe("service endpoint checks", () => {
  it("uses the explicit command-line origin before the environment", () => {
    expect(
      resolveServiceOrigin(
        ["--url", "http://localhost:3110"],
        "http://localhost:3000",
      ),
    ).toBe("http://localhost:3110");
    expect(resolveServiceOrigin(["--url=https://arqvia.example"])).toBe(
      "https://arqvia.example",
    );
  });

  it("rejects malformed origins and unknown arguments", () => {
    expect(() => serviceOrigin("https://arqvia.example/path")).toThrow();
    expect(() => resolveServiceOrigin(["--url"])).toThrow();
    expect(() => resolveServiceOrigin(["--port", "3110"])).toThrow();
  });

  it("accepts the expected health and readiness contracts", () => {
    expect(validateServiceResponse("health", response(200, { status: "ok" }), { status: "ok" }).ok).toBe(true);
    expect(validateServiceResponse("ready", response(200, { status: "ready" }), { status: "ready" }).ok).toBe(true);
  });

  it("blocks non-200, non-JSON, and wrong-status responses", () => {
    expect(validateServiceResponse("ready", response(503, { status: "unavailable" }), { status: "unavailable" }).ok).toBe(false);
    expect(validateServiceResponse("health", response(200, { status: "ok" }, "text/plain"), { status: "ok" }).ok).toBe(false);
    expect(validateServiceResponse("health", response(200, { status: "ready" }), { status: "ready" }).ok).toBe(false);
  });
});
