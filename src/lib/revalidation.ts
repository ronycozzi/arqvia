import { revalidatePath } from "next/cache";

export function revalidateLeadSurfaces(leadId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/leads");
  revalidatePath("/admin/visitas");
  revalidatePath("/admin/reports");
  revalidatePath("/admin/activity");
  if (leadId) revalidatePath(`/admin/leads/${leadId}`);
}

export function revalidateAreaSurfaces(extraSlugs: string[] = []) {
  revalidatePath("/", "layout");
  revalidatePath("/zonas");
  revalidatePath("/zonas/[slug]", "page");
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin");
  revalidatePath("/admin/areas");

  for (const slug of new Set(extraSlugs)) {
    if (slug) revalidatePath(`/zonas/${slug}`);
  }
}

export function revalidateFaqSurfaces() {
  revalidatePath("/");
  revalidatePath("/faq");
  revalidatePath("/zonas/[slug]", "page");
  revalidatePath("/admin");
  revalidatePath("/admin/faq");
}

export function revalidateLegalSurfaces(slug: string) {
  revalidatePath(`/${slug}`);
  revalidatePath(`/legal/${slug}`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin");
  revalidatePath("/admin/legal");
  revalidatePath(`/admin/legal/${slug}`);
}

export function revalidateHomeContentSurfaces() {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/home");
  revalidatePath("/sitemap.xml");
}

export function revalidateInstitutionalPageSurfaces(slug: string) {
  revalidatePath(`/${slug}`);
  revalidatePath("/admin");
  revalidatePath("/admin/pages");
  revalidatePath(`/admin/pages/${slug}`);
  revalidatePath("/sitemap.xml");
}
