import { describe, expect, it } from "vitest";
import { buildAdminReadiness, type AdminReadinessInput } from "./admin-readiness";

const baseInput: AdminReadinessInput = {
  areaCount: 6,
  blogCount: 4,
  contactedCount: 3,
  faqCount: 9,
  leadCount: 8,
  newCount: 2,
  projectCount: 5,
  quotedCount: 2,
  readyProjects: 4,
  readyServices: 5,
  reviewProjects: 1,
  reviewServices: 1,
  serviceCount: 6,
  teamCount: 2,
  testimonialCount: 4,
  userCount: 2,
  wonCount: 1,
};

describe("buildAdminReadiness", () => {
  it("marks a commercially complete admin as strong", () => {
    const result = buildAdminReadiness(baseInput);

    expect(result.status).toBe("strong");
    expect(result.score).toBe(100);
    expect(result.nextActions).toHaveLength(0);
  });

  it("prioritizes missing public proof and local SEO gaps", () => {
    const result = buildAdminReadiness({
      ...baseInput,
      areaCount: 1,
      blogCount: 0,
      faqCount: 2,
      readyProjects: 1,
      readyServices: 2,
      teamCount: 0,
      testimonialCount: 1,
    });

    expect(result.status).not.toBe("strong");
    expect(result.nextActions.map((item) => item.href)).toEqual(
      expect.arrayContaining([
        "/admin/projects",
        "/admin/services",
        "/admin/testimonials",
        "/admin/areas",
      ]),
    );
  });

  it("does not penalize an empty CRM before the first inquiry arrives", () => {
    const result = buildAdminReadiness({
      ...baseInput,
      leadCount: 0,
      newCount: 0,
    });

    const crmCheck = result.checks.find((item) => item.label === "CRM en movimiento");

    expect(crmCheck?.ok).toBe(true);
  });
});
