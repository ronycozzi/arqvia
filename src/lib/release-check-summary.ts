type ReleaseCheckLike = {
  id: string;
  ok: boolean;
};

const environmentReleaseEquivalents = new Map<string, string>([
  ["ENV-URL-001", "RG-ENV-001"],
  ["ENV-AUTH-001", "RG-SECRET-001"],
  ["ENV-DB-001", "RG-DB-001"],
  ["ENV-CONTACT-001", "RG-CONTACT-001"],
  ["ENV-STORAGE-001", "RG-STORAGE-001"],
  ["ENV-ANALYTICS-001", "RG-ANALYTICS-001"],
  ["ENV-ABUSE-001", "RG-ABUSE-001"],
]);

export function countUniqueReleaseFailures({
  configExists,
  environmentChecks,
  releaseChecks,
}: {
  configExists: boolean;
  environmentChecks: ReleaseCheckLike[];
  releaseChecks: ReleaseCheckLike[];
}) {
  const failedReleaseIds = new Set(
    releaseChecks.filter((item) => !item.ok).map((item) => item.id),
  );
  const unmatchedEnvironmentFailures = environmentChecks.filter((item) => {
    if (item.ok) return false;
    const equivalentReleaseId = environmentReleaseEquivalents.get(item.id);
    return !equivalentReleaseId || !failedReleaseIds.has(equivalentReleaseId);
  });

  return (
    failedReleaseIds.size +
    unmatchedEnvironmentFailures.length +
    (configExists ? 0 : 1)
  );
}
