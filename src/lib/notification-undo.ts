type NotificationUndoState = {
  currentReadAt: Date | null;
  requestedMarkedAt: Date;
  requestedPreviousReadAt: Date | null;
  undoAt: Date | null;
  undoFor: Date | null;
};

function sameInstant(left: Date | null, right: Date | null) {
  return left?.getTime() === right?.getTime();
}

export function isNotificationUndoMatch(state: NotificationUndoState) {
  return (
    sameInstant(state.currentReadAt, state.requestedMarkedAt) &&
    sameInstant(state.undoFor, state.requestedMarkedAt) &&
    sameInstant(state.undoAt, state.requestedPreviousReadAt)
  );
}
