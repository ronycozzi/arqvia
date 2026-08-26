function normalizeLocalValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function locationMatchesArea(location: string, area: string) {
  const normalizedLocation = normalizeLocalValue(location);
  const normalizedArea = normalizeLocalValue(area);

  if (!normalizedLocation || !normalizedArea) return false;
  if (normalizedArea === "cordoba") {
    return normalizedLocation.includes("cordoba");
  }

  return (
    normalizedLocation === normalizedArea ||
    normalizedLocation.includes(normalizedArea)
  );
}

export function projectMatchesLocalService({
  area,
  location,
  projectServiceSlug,
  serviceSlug,
}: {
  area: string;
  location: string;
  projectServiceSlug: string;
  serviceSlug: string | null;
}) {
  return Boolean(
    serviceSlug &&
      projectServiceSlug === serviceSlug &&
      locationMatchesArea(location, area),
  );
}
