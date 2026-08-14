import { describe, expect, it } from "vitest";
import { getAuthErrorType, isExpiredAuthSessionError } from "./auth-error";

describe("auth error classification", () => {
  it("recognizes a stale encrypted session without inspecting its cause", () => {
    const error = Object.assign(new Error("session failed"), {
      type: "JWTSessionError",
    });

    expect(getAuthErrorType(error)).toBe("JWTSessionError");
    expect(isExpiredAuthSessionError(error)).toBe(true);
  });

  it("keeps unrelated authentication failures distinct", () => {
    expect(isExpiredAuthSessionError({ type: "CredentialsSignin" })).toBe(false);
    expect(getAuthErrorType(null)).toBe("UnknownAuthError");
  });
});
