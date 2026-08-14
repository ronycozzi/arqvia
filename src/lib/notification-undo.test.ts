import { describe, expect, it } from "vitest";
import { isNotificationUndoMatch } from "@/lib/notification-undo";

const markedAt = new Date("2026-07-15T15:00:00.000Z");
const previousReadAt = new Date("2026-07-14T12:00:00.000Z");

describe("notification undo integrity", () => {
  it("accepts the exact server-recorded undo state", () => {
    expect(
      isNotificationUndoMatch({
        currentReadAt: markedAt,
        requestedMarkedAt: markedAt,
        requestedPreviousReadAt: previousReadAt,
        undoAt: previousReadAt,
        undoFor: markedAt,
      }),
    ).toBe(true);
  });

  it("rejects a forged previous timestamp", () => {
    expect(
      isNotificationUndoMatch({
        currentReadAt: markedAt,
        requestedMarkedAt: markedAt,
        requestedPreviousReadAt: new Date("2030-01-01T00:00:00.000Z"),
        undoAt: previousReadAt,
        undoFor: markedAt,
      }),
    ).toBe(false);
  });

  it("rejects undoing an older bulk-read operation", () => {
    expect(
      isNotificationUndoMatch({
        currentReadAt: new Date("2026-07-15T16:00:00.000Z"),
        requestedMarkedAt: markedAt,
        requestedPreviousReadAt: previousReadAt,
        undoAt: markedAt,
        undoFor: new Date("2026-07-15T16:00:00.000Z"),
      }),
    ).toBe(false);
  });

  it("supports the first bulk read with no previous timestamp", () => {
    expect(
      isNotificationUndoMatch({
        currentReadAt: markedAt,
        requestedMarkedAt: markedAt,
        requestedPreviousReadAt: null,
        undoAt: null,
        undoFor: markedAt,
      }),
    ).toBe(true);
  });
});
