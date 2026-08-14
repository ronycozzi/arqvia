import type { Metadata } from "next";
import type { Prisma, TechnicalVisitStatus } from "@prisma/client";
import {
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  MapPin,
  Search,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminPaginationControls } from "@/components/admin/pagination-controls";
import { commercialManagerRoles, getVerifiedAdminSession } from "@/lib/admin-auth";
import {
  buildAdminPaginationHref,
  resolveAdminPagination,
} from "@/lib/admin-pagination";
import { prisma } from "@/lib/db";
import {
  formatRequestedVisitDate,
  formatTechnicalVisitDateTime,
  technicalVisitStatusClassNames,
  technicalVisitStatusLabels,
  technicalVisitStatusValues,
  visitWindowLabels,
} from "@/lib/technical-visit-config";

export const metadata: Metadata = {
  title: "Agenda de visitas técnicas",
  robots: { index: false, follow: false },
};

const pageSize = 20;
const viewValues = ["pendientes", "proximas", "historial", "todas"] as const;
type VisitView = (typeof viewValues)[number];

export default async function TechnicalVisitsPage({
  searchParams,
}: {
  searchParams: Promise<{
    estado?: string;
    page?: string;
    q?: string;
    vista?: string;
  }>;
}) {
  const session = await getVerifiedAdminSession(commercialManagerRoles);
  if (!session) redirect("/admin");

  const params = await searchParams;
  const query = params.q?.trim().slice(0, 120) || "";
  const selectedStatus = isTechnicalVisitStatus(params.estado)
    ? params.estado
    : "";
  const selectedView = viewValues.includes(params.vista as VisitView)
    ? (params.vista as VisitView)
    : "pendientes";
  const now = new Date();

  const viewWhere: Prisma.TechnicalVisitWhereInput =
    selectedView === "proximas"
      ? {
          scheduledAt: { gte: now },
          status: { in: ["SCHEDULED", "CONFIRMED"] },
        }
      : selectedView === "historial"
        ? {
            OR: [
              { status: { in: ["COMPLETED", "CANCELLED"] } },
              { scheduledAt: { lt: now } },
            ],
          }
        : selectedView === "todas"
          ? {}
          : { status: { in: ["REQUESTED", "SCHEDULED", "CONFIRMED"] } };

  const where: Prisma.TechnicalVisitWhereInput = {
    AND: [
      viewWhere,
      selectedStatus ? { status: selectedStatus } : {},
      query
        ? {
            OR: [
              { lead: { name: { contains: query } } },
              { lead: { email: { contains: query } } },
              { lead: { phone: { contains: query } } },
              { lead: { city: { contains: query } } },
              { lead: { projectType: { contains: query } } },
              { address: { contains: query } },
            ],
          }
        : {},
    ],
  };

  const [filteredCount, requestedCount, upcomingCount, completedCount] =
    await Promise.all([
      prisma.technicalVisit.count({ where }),
      prisma.technicalVisit.count({ where: { status: "REQUESTED" } }),
      prisma.technicalVisit.count({
        where: {
          scheduledAt: { gte: now },
          status: { in: ["SCHEDULED", "CONFIRMED"] },
        },
      }),
      prisma.technicalVisit.count({ where: { status: "COMPLETED" } }),
    ]);

  const pagination = resolveAdminPagination(
    params.page,
    filteredCount,
    pageSize,
  );
  const { currentPage, totalPages } = pagination;
  const buildHref = (overrides: Record<string, string | number | undefined>) => {
    const next = new URLSearchParams();
    const values = {
      estado: selectedStatus,
      q: query,
      vista: selectedView,
      ...overrides,
    };
    Object.entries(values).forEach(([key, value]) => {
      if (key !== "page" && value) next.set(key, String(value));
    });
    const targetPage =
      typeof overrides.page === "number" ? overrides.page : 1;
    return buildAdminPaginationHref("/admin/visitas", next, targetPage);
  };

  if (pagination.shouldRedirect) {
    redirect(buildHref({ page: currentPage }));
  }

  const visits = await prisma.technicalVisit.findMany({
    where,
    orderBy: [
      { scheduledAt: { sort: "asc", nulls: "last" } },
      { createdAt: "desc" },
    ],
    skip: pagination.skip,
    take: pagination.take,
    include: {
      assignedUser: { select: { name: true, email: true } },
      lead: {
        select: {
          city: true,
          email: true,
          id: true,
          name: true,
          phone: true,
          projectType: true,
        },
      },
    },
  });

  return (
    <div className="grid gap-6">
      <section className="premium-card-dark overflow-hidden p-6 text-paper md:p-8">
        <div className="grid gap-7 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze-light">
              Operación comercial
            </p>
            <h2 className="mt-2 max-w-3xl font-serif text-4xl leading-tight md:text-5xl">
              Agenda de visitas técnicas
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-paper/72 md:text-base">
              Organizá solicitudes, confirmaciones y recorridos de obra sin
              perder el vínculo con la consulta, el responsable y el contexto.
            </p>
          </div>
          <Link
            href="/admin/leads?seguimiento=sin-contactar"
            className="inline-flex h-12 items-center justify-center gap-2 bg-bronze px-5 text-sm font-semibold text-paper transition hover:bg-paper hover:text-ink"
          >
            <CalendarClock className="size-4" aria-hidden="true" />
            Revisar consultas abiertas
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <VisitMetric
          icon={Clock3}
          label="Esperan coordinación"
          value={requestedCount}
        />
        <VisitMetric
          icon={CalendarCheck2}
          label="Próximas agendadas"
          value={upcomingCount}
        />
        <VisitMetric
          icon={CheckCircle2}
          label="Visitas realizadas"
          value={completedCount}
        />
      </section>

      <section className="premium-card p-5 md:p-6">
        <form className="grid gap-3 lg:grid-cols-[1fr_190px_auto]" method="get">
          <label className="relative block">
            <span className="sr-only">Buscar visitas</span>
            <Search
              className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink/45"
              aria-hidden="true"
            />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Nombre, email, zona, proyecto o dirección"
              className="h-12 w-full border border-ink/12 bg-white pl-11 pr-4 text-sm text-ink outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/20"
            />
          </label>
          <label>
            <span className="sr-only">Filtrar por estado</span>
            <select
              name="estado"
              defaultValue={selectedStatus}
              className="h-12 w-full border border-ink/12 bg-white px-4 text-sm text-ink outline-none focus:border-bronze"
            >
              <option value="">Todos los estados</option>
              {technicalVisitStatusValues.map((status) => (
                <option key={status} value={status}>
                  {technicalVisitStatusLabels[status]}
                </option>
              ))}
            </select>
          </label>
          <input type="hidden" name="vista" value={selectedView} />
          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center bg-ink px-6 text-sm font-semibold text-paper transition hover:bg-bronze"
          >
            Aplicar filtros
          </button>
        </form>

        <nav className="mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="Vista de agenda">
          {[
            ["pendientes", "Pendientes"],
            ["proximas", "Próximas"],
            ["historial", "Historial"],
            ["todas", "Todas"],
          ].map(([value, label]) => (
            <Link
              key={value}
              href={buildHref({ vista: value, page: undefined })}
              aria-current={selectedView === value ? "page" : undefined}
              className={`inline-flex h-10 shrink-0 items-center border px-4 text-xs font-semibold transition ${
                selectedView === value
                  ? "border-bronze bg-bronze-light text-ink"
                  : "border-ink/10 text-ink/65 hover:border-bronze hover:text-bronze"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </section>

      <section className="premium-card overflow-hidden">
        <div className="flex flex-col justify-between gap-3 border-b border-ink/10 p-5 sm:flex-row sm:items-end md:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bronze">
              Resultado actual
            </p>
            <h2 className="mt-2 font-serif text-3xl text-ink">
              {filteredCount} {filteredCount === 1 ? "visita" : "visitas"}
            </h2>
          </div>
          {(query || selectedStatus) && (
            <Link
              href={buildHref({ estado: undefined, page: undefined, q: undefined })}
              className="text-sm font-semibold text-ink underline decoration-bronze underline-offset-4"
            >
              Limpiar búsqueda
            </Link>
          )}
        </div>

        {visits.length ? (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[980px] border-collapse text-left">
                <thead className="bg-mist text-xs uppercase tracking-[0.14em] text-ink/55">
                  <tr>
                    <th className="px-6 py-4">Consulta</th>
                    <th className="px-6 py-4">Agenda</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4">Responsable</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((visit) => (
                    <tr key={visit.id} className="border-t border-ink/8 align-top">
                      <td className="px-6 py-5">
                        <Link
                          href={`/admin/leads/${visit.lead.id}#visita-tecnica`}
                          className="font-semibold text-ink underline decoration-bronze/50 underline-offset-4 hover:text-bronze"
                        >
                          {visit.lead.name}
                        </Link>
                        <p className="mt-2 text-xs text-ink/55">
                          {visit.lead.projectType} · {visit.lead.city}
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        <VisitSchedule visit={visit} />
                      </td>
                      <td className="px-6 py-5">
                        <VisitStatus status={visit.status} />
                      </td>
                      <td className="px-6 py-5 text-sm text-ink/70">
                        {visit.assignedUser?.name ||
                          visit.assignedUser?.email ||
                          "Sin asignar"}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex justify-end gap-2">
                          {visit.scheduledAt &&
                          ["SCHEDULED", "CONFIRMED", "COMPLETED"].includes(
                            visit.status,
                          ) ? (
                            <a
                              href={`/api/admin/visitas/${visit.id}/calendar`}
                              className="grid size-10 place-items-center border border-ink/12 text-ink transition hover:border-bronze hover:text-bronze"
                              aria-label={`Descargar calendario de ${visit.lead.name}`}
                              title="Descargar calendario"
                            >
                              <Download className="size-4" aria-hidden="true" />
                            </a>
                          ) : null}
                          <Link
                            href={`/admin/leads/${visit.lead.id}#visita-tecnica`}
                            className="inline-flex h-10 items-center border border-ink/12 px-3 text-xs font-semibold text-ink transition hover:border-bronze hover:text-bronze"
                          >
                            Coordinar
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 p-4 lg:hidden">
              {visits.map((visit) => (
                <article key={visit.id} className="border border-ink/10 bg-mist p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{visit.lead.name}</p>
                      <p className="mt-1 text-xs leading-5 text-ink/55">
                        {visit.lead.projectType} · {visit.lead.city}
                      </p>
                    </div>
                    <VisitStatus status={visit.status} />
                  </div>
                  <div className="mt-4 border-t border-ink/10 pt-4">
                    <VisitSchedule visit={visit} />
                    <p className="mt-3 inline-flex items-center gap-2 text-xs text-ink/60">
                      <UserRound className="size-3.5 text-bronze" aria-hidden="true" />
                      {visit.assignedUser?.name ||
                        visit.assignedUser?.email ||
                        "Sin asignar"}
                    </p>
                  </div>
                  <Link
                    href={`/admin/leads/${visit.lead.id}#visita-tecnica`}
                    className="mt-4 inline-flex h-10 w-full items-center justify-center bg-ink px-4 text-xs font-semibold text-paper"
                  >
                    Abrir coordinación
                  </Link>
                  {visit.scheduledAt &&
                  ["SCHEDULED", "CONFIRMED", "COMPLETED"].includes(
                    visit.status,
                  ) ? (
                    <a
                      href={`/api/admin/visitas/${visit.id}/calendar`}
                      className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 border border-ink/12 bg-paper px-4 text-xs font-semibold text-ink"
                    >
                      <Download className="size-4" aria-hidden="true" />
                      Descargar calendario
                    </a>
                  ) : null}
                </article>
              ))}
            </div>
          </>
        ) : (
          <div className="p-10 text-center md:p-14">
            <CalendarDays className="mx-auto size-10 text-bronze" aria-hidden="true" />
            <h3 className="mt-4 font-serif text-2xl text-ink">
              No hay visitas en esta vista
            </h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-ink/65">
              Ajustá los filtros o coordiná una visita desde el detalle de una
              consulta que necesite evaluación en sitio.
            </p>
          </div>
        )}

        <div className="p-5 md:p-6">
          <AdminPaginationControls
            currentPage={currentPage}
            itemLabel="visitas"
            pageHref={(page) => buildHref({ page })}
            totalPages={totalPages}
            totalResults={filteredCount}
          />
        </div>
      </section>
    </div>
  );
}

function VisitMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock3;
  label: string;
  value: number;
}) {
  return (
    <article className="premium-card flex min-h-32 items-center gap-4 p-5">
      <span className="grid size-11 shrink-0 place-items-center bg-ink text-bronze-light">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div>
        <p className="font-serif text-4xl leading-none text-ink">{value}</p>
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink/55">
          {label}
        </p>
      </div>
    </article>
  );
}

function VisitStatus({ status }: { status: TechnicalVisitStatus }) {
  return (
    <span
      className={`inline-flex border px-2.5 py-1 text-xs font-semibold ${technicalVisitStatusClassNames[status]}`}
    >
      {technicalVisitStatusLabels[status]}
    </span>
  );
}

function VisitSchedule({
  visit,
}: {
  visit: {
    address: string | null;
    preferredWindow: keyof typeof visitWindowLabels;
    requestedDate: string | null;
    scheduledAt: Date | null;
  };
}) {
  return (
    <div className="text-sm text-ink/72">
      <p className="inline-flex items-center gap-2 font-medium text-ink">
        <CalendarDays className="size-4 text-bronze" aria-hidden="true" />
        {visit.scheduledAt
          ? formatTechnicalVisitDateTime(visit.scheduledAt)
          : formatRequestedVisitDate(visit.requestedDate)}
      </p>
      {!visit.scheduledAt ? (
        <p className="mt-1 text-xs text-ink/55">
          {visitWindowLabels[visit.preferredWindow]}
        </p>
      ) : null}
      {visit.address ? (
        <p className="mt-2 inline-flex items-start gap-2 text-xs leading-5 text-ink/55">
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-bronze" aria-hidden="true" />
          {visit.address}
        </p>
      ) : null}
    </div>
  );
}

function isTechnicalVisitStatus(value?: string): value is TechnicalVisitStatus {
  return technicalVisitStatusValues.includes(value as TechnicalVisitStatus);
}
