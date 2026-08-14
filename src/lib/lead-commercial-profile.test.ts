import { describe, expect, it } from "vitest";
import { buildLeadCommercialActivities } from "@/lib/lead-commercial-profile";

const emptySnapshot = {
  assignedUserId: null,
  lostReason: null,
  nextFollowUpAt: null,
  quotedAmountUsd: null,
  wonAmountUsd: null,
};

describe("buildLeadCommercialActivities", () => {
  it("creates typed activities only for changed commercial fields", () => {
    const activities = buildLeadCommercialActivities({
      assignedUserLabel: "Ana Arquitecta",
      current: emptySnapshot,
      next: {
        assignedUserId: "user-1",
        lostReason: null,
        nextFollowUpAt: new Date("2026-07-20T15:00:00.000Z"),
        quotedAmountUsd: 85_000,
        wonAmountUsd: null,
      },
    });

    expect(activities.map((activity) => activity.type)).toEqual([
      "ASSIGNED",
      "FOLLOW_UP_CHANGED",
      "COMMERCIAL_VALUE_UPDATED",
    ]);
    expect(activities[0]?.summary).toContain("Ana Arquitecta");
    expect(activities[2]?.summary).toContain("85.000");
  });

  it("does not emit activity when the profile did not change", () => {
    expect(
      buildLeadCommercialActivities({
        assignedUserLabel: null,
        current: emptySnapshot,
        next: emptySnapshot,
      }),
    ).toEqual([]);
  });

  it("records clearing assignment and follow-up", () => {
    const activities = buildLeadCommercialActivities({
      assignedUserLabel: null,
      current: {
        ...emptySnapshot,
        assignedUserId: "user-1",
        nextFollowUpAt: new Date("2026-07-20T15:00:00.000Z"),
      },
      next: emptySnapshot,
    });

    expect(activities).toHaveLength(2);
    expect(activities[0]?.summary).toContain("sin responsable");
    expect(activities[1]?.summary).toContain("Retiró");
  });
});
