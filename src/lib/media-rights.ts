import { z } from "zod";

const formBoolean = z.preprocess((value) => {
  if (value === true || value === "true" || value === "1" || value === "on") {
    return true;
  }
  if (
    value === false ||
    value === "false" ||
    value === "0" ||
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return false;
  }
  return value;
}, z.boolean());

const optionalRightsNote = z.preprocess(
  (value) => {
    const normalized = typeof value === "string" ? value.trim() : value;
    return normalized === "" || normalized === undefined ? null : normalized;
  },
  z
    .string()
    .max(1_000, "La nota de derechos no puede superar 1.000 caracteres.")
    .nullable(),
);

const optionalSourceUrl = z.preprocess(
  (value) => {
    const normalized = typeof value === "string" ? value.trim() : value;
    return normalized === "" || normalized === undefined ? null : normalized;
  },
  z
    .string()
    .max(2_048, "La URL de origen es demasiado larga.")
    .url("Ingresá una URL de origen válida.")
    .refine((value) => {
      const url = new URL(value);
      return (
        (url.protocol === "https:" || url.protocol === "http:") &&
        !url.username &&
        !url.password
      );
    }, "Usá una URL HTTP(S) sin credenciales.")
    .nullable(),
);

export const mediaRightsSchema = z
  .object({
    id: z.string().trim().min(1).max(191).optional(),
    rightsApproved: formBoolean,
    rightsNote: optionalRightsNote,
    sourceUrl: optionalSourceUrl,
  })
  .superRefine((value, context) => {
    if (value.rightsApproved && (value.rightsNote?.length || 0) < 10) {
      context.addIssue({
        code: "custom",
        message: "Describí la licencia, autoría o autorización antes de aprobar.",
        path: ["rightsNote"],
      });
    }
  });

export type MediaRightsInput = z.infer<typeof mediaRightsSchema>;
export type MediaRightsFieldErrors = Partial<
  Record<"id" | "rightsApproved" | "rightsNote" | "sourceUrl", string[]>
>;

export type MediaRightsRecord = {
  rightsApprovedAt: Date | string | null;
  rightsApprovedBy: string | null;
  rightsNote: string | null;
  url: string;
};

export type PublicMediaRightsSnapshot = {
  publicMedia: number;
  unapprovedPublicMedia: number;
  untrackedPublicMedia: number;
};

export function getMediaApproverLabel(user: {
  email: string | null;
  id: string;
  name: string | null;
}) {
  return user.name?.trim() || user.email?.trim() || user.id;
}

export function buildMediaRightsData(
  input: Pick<
    MediaRightsInput,
    "rightsApproved" | "rightsNote" | "sourceUrl"
  >,
  approvedBy: string,
  approvedAt = new Date(),
) {
  return {
    rightsApprovedAt: input.rightsApproved ? approvedAt : null,
    rightsApprovedBy: input.rightsApproved ? approvedBy.trim() : null,
    rightsNote: input.rightsNote,
    sourceUrl: input.sourceUrl,
  };
}

export function isMediaRightsApproved(
  asset: Pick<
    MediaRightsRecord,
    "rightsApprovedAt" | "rightsApprovedBy" | "rightsNote"
  >,
  now = new Date(),
) {
  const timestamp = asset.rightsApprovedAt
    ? new Date(asset.rightsApprovedAt).getTime()
    : Number.NaN;

  return (
    (asset.rightsApprovedBy?.trim().length || 0) >= 3 &&
    (asset.rightsNote?.trim().length || 0) >= 10 &&
    Number.isFinite(timestamp) &&
    timestamp <= now.getTime()
  );
}

export function evaluatePublicMediaRights(
  publicUrls: readonly (string | null | undefined)[],
  assets: readonly MediaRightsRecord[],
  now = new Date(),
): PublicMediaRightsSnapshot {
  const urls = [
    ...new Set(
      publicUrls
        .map((url) => url?.trim() || "")
        .filter((url): url is string => Boolean(url)),
    ),
  ];
  const assetsByUrl = new Map(assets.map((asset) => [asset.url, asset]));
  let unapprovedPublicMedia = 0;
  let untrackedPublicMedia = 0;

  for (const url of urls) {
    const asset = assetsByUrl.get(url);
    if (!asset) {
      unapprovedPublicMedia += 1;
      untrackedPublicMedia += 1;
    } else if (!isMediaRightsApproved(asset, now)) {
      unapprovedPublicMedia += 1;
    }
  }

  return {
    publicMedia: urls.length,
    unapprovedPublicMedia,
    untrackedPublicMedia,
  };
}
