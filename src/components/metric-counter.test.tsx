import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatMetricValue,
  MetricCounter,
  parseMetricValue,
} from "./metric-counter";

describe("MetricCounter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses and formats editable metric values in Spanish", () => {
    const metric = parseMetricValue("+18.000");

    expect(metric).toMatchObject({
      decimalDigits: 0,
      prefix: "+",
      suffix: "",
      target: 18_000,
    });
    expect(metric && formatMetricValue(metric, 9_000)).toBe("+9.000");
    expect(parseMetricValue("7 zonas")).toMatchObject({
      prefix: "",
      suffix: " zonas",
      target: 7,
    });
  });

  it("keeps the final value static when reduced motion is requested", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });

    render(<MetricCounter value="+45" />);

    expect(screen.getByText("+45", { selector: "span[aria-hidden='true']" })).toBeVisible();
    expect(screen.getByText("+45", { selector: ".sr-only" })).toBeInTheDocument();
  });
});
