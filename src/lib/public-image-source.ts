export function isAllowedPublicImageSource(
  value: string,
  configuredBaseUrl = process.env.S3_PUBLIC_BASE_URL,
) {
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  if (!configuredBaseUrl) return false;

  try {
    const source = new URL(value);
    const base = new URL(configuredBaseUrl);
    if (source.protocol !== "https:" || base.protocol !== "https:") return false;
    if (source.origin !== base.origin) return false;

    const basePath = base.pathname.replace(/\/+$/, "");
    return !basePath || source.pathname === basePath || source.pathname.startsWith(`${basePath}/`);
  } catch {
    return false;
  }
}
