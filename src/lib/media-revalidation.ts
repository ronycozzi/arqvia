import { revalidatePath } from "next/cache";

export function revalidateMediaSurfaces() {
  revalidatePath("/admin");
  revalidatePath("/admin/media");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/projects");
  revalidatePath("/admin/services");
  revalidatePath("/admin/blog");
  revalidatePath("/admin/team");
  revalidatePath("/admin/activity");
}
