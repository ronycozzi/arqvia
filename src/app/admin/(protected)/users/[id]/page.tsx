import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { RevokeUserSessionsButton } from "@/components/admin/revoke-user-sessions-button";
import { UserForm, type AdminUserFormValue } from "@/components/admin/user-form";
import { adminOnlyRoles, getVerifiedAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sessions?: string }>;
};

export const metadata: Metadata = {
  title: "Editar usuario",
  robots: { index: false, follow: false },
};

export default async function EditUserPage({ params, searchParams }: PageProps) {
  const session = await getVerifiedAdminSession(adminOnlyRoles);
  if (!session) redirect("/admin");

  const { id } = await params;
  const query = await searchParams;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      active: true,
      email: true,
      id: true,
      name: true,
      role: true,
      updatedAt: true,
    },
  });

  if (!user) notFound();

  const canEdit = true;
  const isSelf = session.user.id === user.id;
  const formUser: AdminUserFormValue = {
    id: user.id,
    name: user.name || "",
    email: user.email || "",
    role: user.role,
    active: user.active,
    updatedAt: user.updatedAt.toISOString(),
  };

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
          Editar acceso
        </p>
        <h2 className="mt-2 font-serif text-4xl text-ink">
          {user.name || user.email}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-ink/75">
          Modificá rol, estado y contraseña de acceso al panel administrativo.
        </p>
        {!canEdit ? (
          <p className="mt-4 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            Solo un Admin puede modificar usuarios.
          </p>
        ) : null}
      </div>
      {query.sessions === "revoked" ? (
        <p role="status" className="border border-olive/35 bg-olive/10 px-4 py-3 text-sm text-ink">
          Las sesiones activas se cerraron correctamente. El usuario conserva su cuenta y puede volver a ingresar.
        </p>
      ) : null}
      {query.sessions === "failed" ? (
        <p role="alert" className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          No se pudieron cerrar las sesiones. Revisá el registro técnico e intentá nuevamente.
        </p>
      ) : null}
      {query.sessions === "self" ? (
        <p role="alert" className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          No podés cerrar tu propia sesión desde esta pantalla. Usá “Cerrar sesión” en el menú del panel.
        </p>
      ) : null}
      <UserForm canEdit={canEdit} isSelf={isSelf} user={formUser} />
      <section className="premium-panel p-6" aria-labelledby="user-session-security-title">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
          Seguridad de acceso
        </p>
        <h3 id="user-session-security-title" className="mt-2 font-serif text-3xl text-ink">
          Sesiones abiertas
        </h3>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-ink/75">
          Cerrá los accesos existentes sin desactivar la cuenta. El próximo ingreso requerirá nuevamente email y contraseña.
        </p>
        <div className="mt-5">
          <RevokeUserSessionsButton
            disabled={isSelf || !user.active}
            id={user.id}
            label={user.email || user.name || "este usuario"}
          />
        </div>
        {isSelf ? (
          <p className="mt-3 text-xs leading-5 text-ink/60">
            Para proteger la sesión administrativa actual, esta acción se deshabilita sobre tu propio usuario.
          </p>
        ) : null}
      </section>
    </section>
  );
}
