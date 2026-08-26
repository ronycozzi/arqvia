type SeedEnvironment = Record<string, string | undefined>;

export const defaultAdminEmail = "admin@arqvia.local";
export const defaultAdminPassword = "ChangeMe123!";

const blockedAdminEmails = new Set([
  defaultAdminEmail,
  "admin@example.com",
]);

const blockedAdminPasswords = new Set([
  defaultAdminPassword.toLowerCase(),
  "admin123",
  "password",
  "password123",
]);

export function isProductionSeedTarget(env: SeedEnvironment) {
  const databaseUrl = env.DATABASE_URL?.trim() || "";

  return (
    /^(?:postgres|postgresql):\/\//i.test(databaseUrl) ||
    env.NODE_ENV === "production" ||
    env.VERCEL_ENV === "production" ||
    env.RENDER === "true" ||
    env.RAILWAY_ENVIRONMENT === "production" ||
    (env.NETLIFY === "true" && env.CONTEXT === "production")
  );
}

export function resolveSeedAdminCredentials(env: SeedEnvironment = process.env) {
  const production = isProductionSeedTarget(env);
  const explicitEmail = env.ADMIN_EMAIL?.trim();
  const explicitPassword = env.ADMIN_PASSWORD?.trim();
  const email = explicitEmail || defaultAdminEmail;
  const password = explicitPassword || defaultAdminPassword;

  if (!production) return { email, password, production };

  if (env.ARQVIA_ALLOW_PRODUCTION_SEED !== "true") {
    throw new Error(
      "Production seeding is disabled. Set ARQVIA_ALLOW_PRODUCTION_SEED=true only for a reviewed first-time initialization.",
    );
  }

  if (!explicitEmail || !explicitPassword) {
    throw new Error(
      "Production seeding requires explicit ADMIN_EMAIL and ADMIN_PASSWORD values.",
    );
  }

  const normalizedEmail = explicitEmail.toLowerCase();
  const normalizedPassword = explicitPassword.toLowerCase();
  if (
    blockedAdminEmails.has(normalizedEmail) ||
    blockedAdminPasswords.has(normalizedPassword) ||
    normalizedPassword.includes("changeme") ||
    normalizedPassword.includes("change-me")
  ) {
    throw new Error(
      "Known default or placeholder admin credentials are forbidden for production seeding.",
    );
  }

  if (explicitPassword.length < 16) {
    throw new Error(
      "ADMIN_PASSWORD must be at least 16 characters for production seeding.",
    );
  }

  return { email: explicitEmail, password: explicitPassword, production };
}
