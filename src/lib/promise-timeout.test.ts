import { describe, expect, it } from "vitest";
import { OperationTimeoutError, withTimeout } from "./promise-timeout";

describe("withTimeout", () => {
  it("returns an operation that completes before the deadline", async () => {
    await expect(withTimeout(Promise.resolve("ready"), 50)).resolves.toBe("ready");
  });

  it("rejects stalled operations with a typed timeout", async () => {
    await expect(withTimeout(new Promise(() => undefined), 5)).rejects.toBeInstanceOf(
      OperationTimeoutError,
    );
  });
});
