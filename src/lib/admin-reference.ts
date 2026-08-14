export const adminReferenceKinds = ["projects", "services"] as const;
export type AdminReferenceKind = (typeof adminReferenceKinds)[number];

export type AdminReferenceOption = {
  id: string;
  label: string;
  meta?: string;
};

export function deduplicateAdminReferenceOptions(
  options: AdminReferenceOption[],
) {
  return [...new Map(options.map((option) => [option.id, option])).values()];
}
