// @vitest-environment node

import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import { localeBootstrapScript } from "@/lib/locale-bootstrap";

describe("language preference before hydration", () => {
  it.each([
    "arqvia_locale=en",
    "consent=accepted; arqvia_locale=en",
    "consent=accepted; arqvia_locale=en; theme=light",
  ])("restores English from %s", (cookie) => {
    const element = { dataset: { locale: "es" }, lang: "es-AR", classList: { add: vi.fn() } };
    runInNewContext(localeBootstrapScript, { document: { cookie, documentElement: element } });
    expect(element.dataset.locale).toBe("en");
    expect(element.lang).toBe("en");
    expect(element.classList.add).toHaveBeenCalledWith("i18n-pending");
  });

  it.each(["", "arqvia_locale=es", "other_arqvia_locale=en", "arqvia_locale=en-US"])(
    "keeps Spanish for a missing or unsupported preference: %s", (cookie) => {
      const element = { dataset: { locale: "es" }, lang: "es-AR", classList: { add: vi.fn() } };
      runInNewContext(localeBootstrapScript, { document: { cookie, documentElement: element } });
      expect(element.lang).toBe("es-AR");
      expect(element.classList.add).not.toHaveBeenCalled();
    },
  );
});
