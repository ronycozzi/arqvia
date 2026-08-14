import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma, UserRole } from "@prisma/client";
import { ShieldCheck, UserPlus } from "lucide-react";
import { AdminPaginationControls } from "@/components/admin/pagination-controls";
import { DeleteUserButton } from "@/components/admin/delete-user-button";
import { adminOnlyRoles, getVerifiedAdminSession } from "@/lib/admin-auth";
import {
  buildAdminPaginationHref,
  resolveAdminPagination,
} from "@/lib/admin-pagination";
import { prisma } from "@/lib/db";

type PageProps = {
  searchParams: Promise<{
    activo?: string;
    error?: string;
    page?: string;
    q?: string;
    rol?: string;
  }>;
};

const roleLabels = {
  ADMIN: "Admin",
  EDITOR: "Editor",
  VIEWER: "Viewer",
};

const statusLabels = {
  active: "Activos",
  inactive: "Inactivos",
};

const pageSize = 20;

export const metadata: Metadata = {
  title: "Usuarios",
  robots: { index: false, follow: false },
};

export default async function UsersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = params.q?.trim() || "";
  const selectedRole = isUserRole(params.rol) ? params.rol : "";
  const selectedStatus =
    params.activo === "active" || params.activo === "inactive"
      ? params.activo
      : "";
  const session = await getVerifiedAdminSession(adminOnlyRoles);
  if (!session) redirect("/admin");
  const canManage = true;

  const where: Prisma.UserWhereInput = {
    ...(selectedRole ? { role: selectedRole } : {}),
    ...(selectedStatus ? { active: selectedStatus === "active" } : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query } },
            { email: { contains: query } },
          ],
        }
      : {}),
  };

  const filteredUsers = await prisma.user.count({ where });
  const pagination = resolveAdminPagination(params.page, filteredUsers, pageSize);
  const paginationParams = new URLSearchParams();
  if (query) paginationParams.set("q", query);
  if (selectedRole) paginationParams.set("rol", selectedRole);
  if (selectedStatus) paginationParams.set("activo", selectedStatus);
  const pageHref = (nextPage: number) =>
    buildAdminPaginationHref("/admin/users", paginationParams, nextPage);

  if (pagination.shouldRedirect) {
    redirect(pageHref(pagination.currentPage));
  }

  const [users, totalUsers, adminCount, editorCount, viewerCount] =
    await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          active: true,
          email: true,
          id: true,
          name: true,
          role: true,
        },
        orderBy: [{ active: "desc" }, { role: "asc" }, { email: "asc" }],
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.user.count(),
      prisma.user.count({ where: { role: "ADMIN", active: true } }),
      prisma.user.count({ where: { role: "EDITOR", active: true } }),
      prisma.user.count({ where: { role: "VIEWER", active: true } }),
    ]);
  const { currentPage, totalPages } = pagination;

  const stats = [
    { label: "Usuarios totales", value: totalUsers },
    { label: "Resultado actual", value: filteredUsers },
    { label: "Admins activos", value: adminCount },
    { label: "Editores activos", value: editorCount },
    { label: "Viewers activos", value: viewerCount },
  ];

  return (
    <section className="grid gap-6">
      <div className="admin-stat-grid grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-5">
        {stats.map((stat) => (
          <article key={stat.label} className="premium-card p-4 sm:p-5">
            <p className="font-sans text-3xl font-semibold tabular-nums text-ink sm:text-4xl">
              {stat.value}
            </p>
            <p className="mt-1 text-sm text-ink/75">{stat.label}</p>
          </article>
        ))}
      </div>

      <div className="premium-panel p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
              Seguridad
            </p>
            <h2 className="mt-2 font-serif text-4xl text-ink">
              Usuarios del panel
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-ink/75">
              Gestioná quién puede entrar al panel, cargar contenido, revisar
              consultas y modificar configuración crítica de Arqvia.
            </p>
          </div>
          {canManage ? (
            <Link
              href="/admin/users/new"
              className="inline-flex h-12 items-center justify-center gap-2 bg-ink px-5 text-sm font-semibold text-paper transition hover:bg-bronze"
            >
              <UserPlus className="size-4" />
              Nuevo usuario
            </Link>
          ) : null}
        </div>

        <form
          className="mt-6 grid gap-3 lg:grid-cols-[1fr_180px_180px_auto]"
          action="/admin/users"
        >
          <label className="sr-only" htmlFor="q">
            Buscar usuario
          </label>
          <input
            id="q"
            name="q"
            defaultValue={query}
            placeholder="Buscar por nombre o email"
            className="h-12 flex-1 border border-ink/12 bg-white px-4 text-sm text-ink outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/20"
          />
          <label className="sr-only" htmlFor="rol">
            Filtrar por rol
          </label>
          <select
            id="rol"
            name="rol"
            defaultValue={selectedRole}
            className="h-12 border border-ink/12 bg-white px-4 text-sm text-ink outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/20"
          >
            <option value="">Todos los roles</option>
            {Object.entries(roleLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="activo">
            Filtrar por estado
          </label>
          <select
            id="activo"
            name="activo"
            defaultValue={selectedStatus}
            className="h-12 border border-ink/12 bg-white px-4 text-sm text-ink outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/20"
          >
            <option value="">Todos</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button className="h-12 border border-ink/15 px-5 text-sm font-semibold text-ink transition hover:border-bronze hover:text-bronze">
            Filtrar
          </button>
        </form>

        {params.error === "self-delete" ? (
          <p className="mt-4 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            No podés revocar tu propio acceso desde la sesión activa.
          </p>
        ) : null}
      </div>

      {params.error === "delete-failed" ? (
        <p className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          No se pudo revocar el acceso. Revisá si el usuario sigue existiendo o intentá nuevamente.
        </p>
      ) : null}

      <div className="grid gap-4">
        {users.length ? (
          users.map((user) => {
            const isSelf = user.id === session?.user?.id;

            return (
              <article key={user.id} className="premium-card p-5">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-serif text-3xl text-ink">
                        {user.name || user.email}
                      </h3>
                      {isSelf ? (
                        <span className="inline-flex items-center gap-1 bg-mist px-3 py-1 text-xs font-semibold text-ink">
                          <ShieldCheck className="size-3" />
                          Sesión actual
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 break-all text-sm text-ink/75">
                      {user.email}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.12em]">
                      <span className="bg-ink px-3 py-1 text-paper">
                        {roleLabels[user.role]}
                      </span>
                      <span
                        className={
                          user.active
                            ? "bg-olive px-3 py-1 text-paper"
                            : "bg-red-100 px-3 py-1 text-red-700"
                        }
                      >
                        {user.active ? "Activo" : "Inactivo"}
                      </span>
                      <span className="border border-ink/10 px-3 py-1 text-ink/65">
                        Acceso interno
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="inline-flex h-10 items-center justify-center border border-ink/15 px-3 text-xs font-semibold text-ink transition hover:border-bronze hover:text-bronze"
                    >
                      Editar
                    </Link>
                    <DeleteUserButton
                      disabled={!canManage || isSelf || !user.active}
                      id={user.id}
                      label={user.email || user.name || "usuario"}
                    />
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="premium-card p-10 text-center">
            <p className="font-serif text-3xl text-ink">No hay usuarios.</p>
            <p className="mt-2 text-sm text-ink/70">
              Probá con otra búsqueda o creá un usuario nuevo.
            </p>
          </div>
        )}
      </div>
      <AdminPaginationControls
        currentPage={currentPage}
        itemLabel="usuarios"
        pageHref={pageHref}
        totalPages={totalPages}
        totalResults={filteredUsers}
      />
    </section>
  );
}

function isUserRole(value?: string): value is UserRole {
  return value === "ADMIN" || value === "EDITOR" || value === "VIEWER";
}
