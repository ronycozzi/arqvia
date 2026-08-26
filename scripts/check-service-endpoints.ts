import { fileURLToPath } from "node:url";
import path from "node:path";

export type ServiceEndpoint = "health" | "ready";

export type ServiceCheckResult = {
  endpoint: ServiceEndpoint;
  detail: string;
  ok: boolean;
};

export function validateServiceResponse(
  endpoint: ServiceEndpoint,
  response: Pick<Response, "headers" | "status" | "json"> & { json: () => Promise<unknown> },
  payload: unknown,
): ServiceCheckResult {
  const expectedStatus = endpoint === "health" ? "ok" : "ready";
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.toLowerCase().includes("application/json");
  const hasExpectedPayload =
    typeof payload === "object" &&
    payload !== null &&
    "status" in payload &&
    payload.status === expectedStatus;

  if (response.status !== 200 || !isJson || !hasExpectedPayload) {
    return {
      endpoint,
      ok: false,
      detail: `Expected HTTP 200 JSON status=${expectedStatus}; received HTTP ${response.status}.`,
    };
  }

  return { endpoint, ok: true, detail: `HTTP 200 JSON status=${expectedStatus}.` };
}

export function serviceOrigin(value: string) {
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.pathname !== "/" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error("SERVICE_BASE_URL must be an HTTP(S) origin without credentials or query strings.");
  }
  return url.origin;
}

export function resolveServiceOrigin(
  args: string[],
  environmentValue?: string,
) {
  let commandLineValue: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === "--url") {
      commandLineValue = args[index + 1];
      if (!commandLineValue || commandLineValue.startsWith("--")) {
        throw new Error("--url requires an HTTP(S) origin.");
      }
      index += 1;
      continue;
    }

    if (argument.startsWith("--url=")) {
      commandLineValue = argument.slice("--url=".length);
      if (!commandLineValue) {
        throw new Error("--url requires an HTTP(S) origin.");
      }
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  return serviceOrigin(
    commandLineValue || environmentValue || "http://localhost:3000",
  );
}

export function resolveServiceCheckTimeout(value?: string) {
  const configuredTimeout = Number(value || 15_000);
  if (
    !Number.isFinite(configuredTimeout) ||
    configuredTimeout < 100 ||
    configuredTimeout > 30_000
  ) {
    throw new Error(
      "SERVICE_CHECK_TIMEOUT_MS must be between 100 and 30000 milliseconds.",
    );
  }

  return configuredTimeout;
}

async function checkEndpoint(origin: string, endpoint: ServiceEndpoint) {
  const controller = new AbortController();
  const configuredTimeout = resolveServiceCheckTimeout(
    process.env.SERVICE_CHECK_TIMEOUT_MS,
  );
  const timeout = setTimeout(
    () => controller.abort(),
    configuredTimeout,
  );
  try {
    const response = await fetch(`${origin}/api/${endpoint}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    return validateServiceResponse(endpoint, response, payload);
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const origin = resolveServiceOrigin(
    process.argv.slice(2),
    process.env.SERVICE_BASE_URL,
  );
  const results = await Promise.all([
    checkEndpoint(origin, "health"),
    checkEndpoint(origin, "ready"),
  ]);
  for (const result of results) {
    console.log(`${result.ok ? "PASS" : "BLOCK"}  /api/${result.endpoint}  ${result.detail}`);
  }
  if (results.some((result) => !result.ok)) process.exitCode = 1;
}

if (path.resolve(process.argv[1] || "") === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    console.error("Service endpoint check could not complete:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
