import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { UserForm, type AdminUserFormValue } from "@/components/admin/user-form";
import { adminOnlyRoles, getVerifiedAdminSession } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Nuevo usuario",
  robots: { index: false, follow: false },
};

const blankUser: AdminUserFormValue = {
  name: "",
  email: "",
  role: "EDITOR",
  active: true,
};

export default async function NewUserPage() {
  const session = await getVerifiedAdminSession(adminOnlyRoles);
  if (!session) redirect("/admin");
  const canEdit = true;

  return (
    <section className="grid gap-6">
      <div className="premium-panel p-6">
        <Link
          href="/admin/users"
          className="text-sm font-semibold text-ink underline decoration-bronze underline-offset-4"
        >
          Volver a usuarios
        </Link>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
          Nuevo acceso
        </p>
        <h2 className="mt-2 font-serif text-4xl text-ink">
          Crear usuario del panel.
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-ink/75">
          Agregá editores para contenido, viewers para lectura comercial o admins
          para configuración completa.
        </p>
        {!canEdit ? (
          <p className="mt-4 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            Solo un Admin puede crear usuarios.
          </p>
        ) : null}
      </div>
      <UserForm canEdit={canEdit} isSelf={false} user={blankUser} />
    </section>
  );
}
