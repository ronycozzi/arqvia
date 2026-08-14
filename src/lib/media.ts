export const mediaAssetCategories = [
  "Hero",
  "Proyecto",
  "Servicio",
  "Antes y despues",
  "Equipo",
  "Blog",
  "Marca",
] as const;

export const mediaUploadMaxBytes = 5 * 1024 * 1024;
export const mediaUploadMaxRequestBytes = mediaUploadMaxBytes + 512 * 1024;
export const mediaUploadMaxDimension = 12_000;
export const mediaUploadMaxPixels = 40_000_000;
export const allowedMediaMimeTypes = [
  "image/avif",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type MediaAssetCategory = (typeof mediaAssetCategories)[number];
export type AllowedMediaMimeType = (typeof allowedMediaMimeTypes)[number];

export function isMediaAssetCategory(value: string): value is MediaAssetCategory {
  return mediaAssetCategories.includes(value as MediaAssetCategory);
}

export function isAllowedMediaMimeType(
  value: string,
): value is AllowedMediaMimeType {
  return allowedMediaMimeTypes.includes(value as AllowedMediaMimeType);
}

export function formatMediaBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
