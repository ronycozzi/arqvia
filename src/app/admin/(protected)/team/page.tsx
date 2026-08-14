import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { Edit3, Plus } from "lucide-react";
import { AdminPaginationControls } from "@/components/admin/pagination-controls";
import { DeleteTeamMemberButton } from "@/components/admin/delete-team-member-button";
import { canManageContent, requireVerifiedAdminSession } from "@/lib/admin-auth";
import {
  buildAdminPaginationHref,
  resolveAdminPagination,
} from "@/lib/admin-pagination";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Admin equipo",
  robots: { index: false, follow: false },
};

const pageSize = 25;

export default async function AdminTeamPage({
  searchParams,
}: {
  searchParams: Promise<{ activo?: string; error?: string; page?: string; q?: string }>;
}) {
  const session = await requireVerifiedAdminSession();
  const { activo, error, page, q } = await searchParams;
  const canManage = canManageContent(session.user.role);
  const query = q?.trim();
  const selectedStatus = activo === "visible" || activo === "oculto" ? activo : "";

  const where: Prisma.TeamMemberWhereInput = {
    ...(selectedStatus
      ? { active: selectedStatus === "visible" }
      : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query } },
            { role: { contains: query } },
            { specialty: { contains: query } },
          ],
        }
      : {}),
  };

  const filteredMembers = await prisma.teamMember.count({ where });
  const pagination = resolveAdminPagination(page, filteredMembers, pageSize);
  const paginationParams = new URLSearchParams();
  if (query) paginationParams.set("q", query);
  if (selectedStatus) paginationParams.set("activo", selectedStatus);
  const pageHref = (targetPage: number) =>
    buildAdminPaginationHref("/admin/team", paginationParams, targetPage);

  if (pagination.shouldRedirect) {
    redirect(pageHref(pagination.currentPage));
  }

  const [members, totalMembers, activeCount] = await Promise.all([
    prisma.teamMember.findMany({
      where,
      orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.teamMember.count(),
    prisma.teamMember.count({ where: { active: true } }),
  ]);
  const { currentPage, totalPages } = pagination;
  const inactiveCount = Math.max(totalMembers - activeCount, 0);

  return (
    <section className="grid gap-6">
      <div className="premium-card p-6">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
              Equipo CMS
            </p>
            <h2 className="mt-2 font-serif text-4xl text-ink">
              Responsables visibles y credenciales
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-ink/75">
              Gestioná las personas que aparecen en home y nosotros para reforzar
              confianza, especialidades y dirección técnica.
            </p>
          </div>
          {canManage ? (
            <Link
              href="/admin/team/new"
              className="inline-flex h-12 items-center justify-center gap-2 bg-ink px-5 text-sm font-semibold text-paper transition hover:-translate-y-0.5 hover:bg-bronze"
            >
              <Plus className="size-4" />
              Nuevo integrante
            </Link>
          ) : null}
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Integrantes totales", totalMembers],
            ["Resultado actual", filteredMembers],
            ["Visibles", activeCount],
            ["Ocultos", inactiveCount],
          ].map(([label, value]) => (
            <div key={label} className="border border-ink/10 bg-paper/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">
                {label}
              </p>
              <p className="mt-2 font-sans text-3xl font-semibold tabular-nums text-ink">
                {value}
              </p>
            </div>
          ))}
        </div>
        <form className="mt-6 grid gap-3 lg:grid-cols-[1fr_220px_auto]">
          <label className="sr-only" htmlFor="team-search">
            Buscar equipo
          </label>
          <input
            id="team-search"
            name="q"
            defaultValue={query || ""}
            placeholder="Buscar por nombre, rol o especialidad"
            className="h-12 border border-ink/12 bg-white px-4 text-sm text-ink outline-none focus:border-bronze focus:ring-2 focus:ring-bronze/20"
          />
          <label className="sr-only" htmlFor="team-status">
            Filtrar por visibilidad
          </label>
          <select
            id="team-status"
            name="activo"
            defaultValue={selectedStatus}
            className="h-12 border border-ink/12 bg-white px-4 text-sm font-semibold text-ink outline-none focus:border-bronze focus:ring-2 focus:ring-bronze/20"
          >
            <option value="">Todos los estados</option>
            <option value="visible">Visibles</option>
            <option value="oculto">Ocultos</option>
          </select>
          <button
            type="submit"
            className="h-12 border border-ink/15 px-5 text-sm font-semibold text-ink transition hover:border-bronze hover:text-bronze"
          >
            Filtrar
          </button>
        </form>
        {error === "delete-failed" ? (
          <p className="mt-4 border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            No se pudo eliminar el integrante. Revisá si sigue existiendo o intentá nuevamente.
          </p>
        ) : null}
      </div>

      {members.length ? (
        <>
          <div className="grid gap-4">
            {members.map((member) => (
              <article
                key={member.id}
                className="premium-card grid gap-4 p-4 md:grid-cols-[140px_1fr_auto]"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-stone md:aspect-square">
                  <Image
                    src={member.imageUrl}
                    alt={`Retrato de ${member.name}`}
                    fill
                    sizes="140px"
                    className="object-cover"
                  />
                </div>
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-mist px-3 py-1 text-xs font-semibold text-ink">
                      {member.role}
                    </span>
                    <span
                      className={
                        member.active
                          ? "bg-olive px-3 py-1 text-xs font-semibold text-paper"
                          : "bg-ink/8 px-3 py-1 text-xs font-semibold text-ink/65"
                      }
                    >
                      {member.active ? "Visible" : "Oculto"}
                    </span>
                    {member.licenseNumber ? (
                      <span className="border border-ink/10 px-3 py-1 text-xs font-semibold text-ink/60">
                        {member.licenseNumber}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-3 font-serif text-3xl text-ink">
                    {member.name}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-bronze">
                    {member.specialty}
                  </p>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/75">
                    {member.bio}
                  </p>
                </div>
                {canManage ? (
                  <div className="flex flex-wrap items-start gap-2 md:justify-end">
                    <Link
                      href={`/admin/team/${member.id}`}
                      className="inline-flex h-10 items-center gap-2 bg-ink px-4 text-xs font-semibold text-paper transition hover:-translate-y-0.5 hover:bg-bronze"
                    >
                      <Edit3 className="size-4" />
                      Editar
                    </Link>
                    <DeleteTeamMemberButton id={member.id} name={member.name} />
                  </div>
                ) : null}
              </article>
            ))}
          </div>
          <AdminPaginationControls
            currentPage={currentPage}
            itemLabel="integrantes"
            pageHref={pageHref}
            totalPages={totalPages}
            totalResults={filteredMembers}
          />
        </>
      ) : (
        <div className="premium-card border-dashed p-10 text-center">
          <h3 className="font-serif text-3xl text-ink">No hay integrantes para mostrar.</h3>
          <p className="mt-2 text-sm text-ink/75">Cargá el equipo para reforzar confianza y responsabilidad técnica.</p>
        </div>
      )}
    </section>
  );
}
