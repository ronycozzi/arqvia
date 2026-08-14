export const projectGalleryTypes = [
  "final",
  "before",
  "after",
  "process",
  "render",
  "plan",
] as const;

export type ProjectGalleryType = (typeof projectGalleryTypes)[number];

export type ProjectGalleryEditorItem = {
  altText: string;
  caption: string;
  id: string;
  type: ProjectGalleryType;
  url: string;
};

const galleryTypeAliases: Record<string, ProjectGalleryType> = {
  after: "after",
  antes: "before",
  before: "before",
  final: "final",
  plan: "plan",
  plano: "plan",
  process: "process",
  proceso: "process",
  render: "render",
};

function normalizeGalleryType(value: string): ProjectGalleryType {
  return galleryTypeAliases[value.trim().toLowerCase()] ?? "process";
}

export function sanitizeGallerySegment(value: string) {
  return value.replace(/[|\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

export function parseProjectGallery(
  value: string,
): ProjectGalleryEditorItem[] {
  return value.split(/\r?\n/).flatMap((line, index) => {
    const normalizedLine = line.trim();
    if (!normalizedLine) return [];

    const [url = "", type = "", altText = "", ...captionSegments] =
      normalizedLine.split("|").map((segment) => segment.trim());
    const caption = captionSegments.join(" | ");

    return [
      {
        altText,
        caption,
        id: `gallery-item-${index + 1}`,
        type: normalizeGalleryType(type),
        url,
      },
    ];
  });
}

export function serializeProjectGallery(items: ProjectGalleryEditorItem[]) {
  return items
    .map((item) =>
      [
        sanitizeGallerySegment(item.url),
        item.type,
        sanitizeGallerySegment(item.altText),
        sanitizeGallerySegment(item.caption),
      ].join(" | "),
    )
    .join("\n");
}
