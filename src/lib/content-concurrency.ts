export const CONTENT_CONCURRENCY_CONFLICT_MESSAGE =
  "Otra persona guardó cambios antes que vos. Recargá la página para ver la versión más reciente antes de volver a editar.";

export class ContentConcurrencyConflictError extends Error {
  constructor() {
    super(CONTENT_CONCURRENCY_CONFLICT_MESSAGE);
    this.name = "ContentConcurrencyConflictError";
  }
}

export function getSubmittedExpectedUpdatedAt(formData: FormData) {
  const value = formData.get("expectedUpdatedAt");
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function requireExpectedUpdatedAt(formData: FormData) {
  const value = getSubmittedExpectedUpdatedAt(formData);
  const expectedUpdatedAt = value ? new Date(value) : null;

  if (!expectedUpdatedAt || Number.isNaN(expectedUpdatedAt.getTime())) {
    throw new ContentConcurrencyConflictError();
  }

  return expectedUpdatedAt;
}

export function assertContentVersionUpdated(count: number) {
  if (count !== 1) {
    throw new ContentConcurrencyConflictError();
  }
}
