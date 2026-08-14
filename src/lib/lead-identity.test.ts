import { describe, expect, it } from "vitest";
import {
  hasUsableLeadPhone,
  normalizeLeadEmail,
  normalizeLeadPhone,
} from "./lead-identity";

describe("lead identity normalization", () => {
  it("normalizes email case and surrounding whitespace", () => {
    expect(normalizeLeadEmail("  Cliente@Arqvia.COM  ")).toBe(
      "cliente@arqvia.com",
    );
  });

  it("normalizes WhatsApp numbers across common display formats", () => {
    expect(normalizeLeadPhone("+54 (351) 555-1212")).toBe("543515551212");
    expect(hasUsableLeadPhone("351 555 1212")).toBe(true);
    expect(hasUsableLeadPhone("123")).toBe(false);
  });
});
