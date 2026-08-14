export const leadAttachmentMaxFiles = 3;
export const leadAttachmentMaxBytes = 5 * 1024 * 1024;
export const leadAttachmentMaxTotalBytes = 12 * 1024 * 1024;
export const leadAttachmentMaxRequestBytes = 13 * 1024 * 1024;
export const leadAttachmentMaxDimension = 8_000;
export const leadAttachmentMaxPixels = 24_000_000;
export const leadAttachmentAllowedMimeTypes = [
  "application/pdf",
  "image/avif",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export function formatAttachmentBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
