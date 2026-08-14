import { describe, expect, it } from "vitest";
import {
  calculateEstimate,
  formatUsd,
  validateEstimateArea,
  type PublicEstimateConfig,
  type PublicEstimateRule,
} from "../src/lib/estimator";

const multipliers = {
  ESSENTIAL: 0.8,
  BALANCED: 1,
  PREMIUM: 1.25,
} satisfies PublicEstimateConfig["multipliers"];

const rule = {
  id: "rule-remodel",
  key: "remodelacion",
  label: "Remodelacion",
  description: "A representative estimator rule for unit tests.",
  minUsdPerM2: 780,
  maxUsdPerM2: 1260,
  minimumProjectUsd: 25_000,
} satisfies PublicEstimateRule;

describe("calculateEstimate", () => {
  it("formats commercial ranges with an explicit USD prefix", () => {
    expect(formatUsd(45_000)).toBe("USD 45.000");
  });

  it("calculates and rounds a deterministic estimate", () => {
    expect(calculateEstimate(rule, 123, "BALANCED", multipliers)).toEqual({
      areaM2: 123,
      rateMinUsdM2: 780,
      rateMaxUsdM2: 1260,
      totalMinUsd: 95_000,
      totalMaxUsd: 155_000,
    });
  });

  it("keeps a visible range when the commercial minimum rounds both ends equally", () => {
    const minimumRule = {
      ...rule,
      minUsdPerM2: 50,
      maxUsdPerM2: 50,
      minimumProjectUsd: 1_000,
    };

    const result = calculateEstimate(
      minimumRule,
      10,
      "BALANCED",
      multipliers,
    );

    expect(result.totalMinUsd).toBe(1_000);
    expect(result.totalMaxUsd).toBe(1_500);
    expect(result.totalMaxUsd).toBeGreaterThan(result.totalMinUsd);
  });

  it("is monotonic as the requested area increases", () => {
    const areas = [10, 11, 25, 50, 99, 100, 101, 250, 500, 1_000, 1_999, 2_000];
    const estimates = areas.map((area) =>
      calculateEstimate(rule, area, "BALANCED", multipliers),
    );

    for (let index = 1; index < estimates.length; index += 1) {
      expect(estimates[index].totalMinUsd).toBeGreaterThanOrEqual(
        estimates[index - 1].totalMinUsd,
      );
      expect(estimates[index].totalMaxUsd).toBeGreaterThanOrEqual(
        estimates[index - 1].totalMaxUsd,
      );
    }
  });

  it("applies the configured tier multipliers", () => {
    const tierRule = {
      ...rule,
      minUsdPerM2: 500,
      maxUsdPerM2: 1_000,
      minimumProjectUsd: 0,
    };

    expect(
      (["ESSENTIAL", "BALANCED", "PREMIUM"] as const).map((tier) =>
        calculateEstimate(tierRule, 100, tier, multipliers),
      ),
    ).toEqual([
      {
        areaM2: 100,
        rateMinUsdM2: 400,
        rateMaxUsdM2: 800,
        totalMinUsd: 40_000,
        totalMaxUsd: 80_000,
      },
      {
        areaM2: 100,
        rateMinUsdM2: 500,
        rateMaxUsdM2: 1_000,
        totalMinUsd: 50_000,
        totalMaxUsd: 100_000,
      },
      {
        areaM2: 100,
        rateMinUsdM2: 625,
        rateMaxUsdM2: 1_250,
        totalMinUsd: 62_500,
        totalMaxUsd: 125_000,
      },
    ]);
  });

  it("rejects areas outside the supported boundaries and decimal values", () => {
    expect(() => calculateEstimate(rule, 9, "BALANCED", multipliers)).toThrow(
      /entre 10 y 2\.000 m²/,
    );
    expect(() => calculateEstimate(rule, 2_001, "BALANCED", multipliers)).toThrow(
      /entre 10 y 2\.000 m²/,
    );
    expect(() => calculateEstimate(rule, 123.4, "BALANCED", multipliers)).toThrow(
      /metros cuadrados enteros/,
    );
    expect(validateEstimateArea(10)).toBeNull();
    expect(validateEstimateArea(2_000)).toBeNull();
  });
});
