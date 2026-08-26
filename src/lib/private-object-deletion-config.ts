const blockedSecretFragments = ["change-me", "changeme", "replace-with"];

export function readPrivateObjectDeletionConfig(
  env: Record<string, string | undefined> = process.env,
) {
  const cronSecret = env.PRIVATE_OBJECT_DELETION_CRON_SECRET?.trim() || "";
  const normalized = cronSecret.toLowerCase();
  const ready =
    cronSecret.length >= 32 &&
    !blockedSecretFragments.some((fragment) => normalized.includes(fragment));

  return { cronSecret, ready };
}
