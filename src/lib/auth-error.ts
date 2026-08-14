export function getAuthErrorType(error: unknown) {
  if (!error || typeof error !== "object") return "UnknownAuthError";

  const candidate = error as { name?: unknown; type?: unknown };
  if (typeof candidate.type === "string" && candidate.type.trim()) {
    return candidate.type;
  }
  if (typeof candidate.name === "string" && candidate.name.trim()) {
    return candidate.name;
  }

  return "UnknownAuthError";
}

export function isExpiredAuthSessionError(error: unknown) {
  return getAuthErrorType(error) === "JWTSessionError";
}
