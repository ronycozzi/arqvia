import { isStrictPublicUrlContext } from "@/lib/public-env";

type Environment = Record<string, string | undefined>;

export function canUseSeedContent(env: Environment = process.env) {
  return env.NODE_ENV !== "production" && !isStrictPublicUrlContext(env);
}

export function seedCollectionOrEmpty<T>(
  seedItems: readonly T[],
  env: Environment = process.env,
): T[] {
  return canUseSeedContent(env) ? [...seedItems] : [];
}

export function fallbackPublicContent<T>(
  scope: string,
  fallback: T,
  error?: unknown,
  env: Environment = process.env,
): T {
  if (canUseSeedContent(env)) return fallback;

  throw new PublicContentUnavailableError(scope, error);
}

export class PublicContentUnavailableError extends Error {
  constructor(scope: string, cause?: unknown) {
    super(`Public content source unavailable: ${scope}`, { cause });
    this.name = "PublicContentUnavailableError";
  }
}
