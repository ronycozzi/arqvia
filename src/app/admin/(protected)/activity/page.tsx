import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  Download,
  FilterX,
  UserRound,
} from "lucide-react";
import { AdminPaginationControls } from "@/components/admin/pagination-controls";
import { adminOnlyRoles, getVerifiedAdminSession } from "@/lib/admin-auth";
import {
  buildAdminActivitySearchParams,
  buildAdminActivityScopedWhere,
  buildAdminActivityWhere,
  getAdminAuditResourceTarget,
  hasAdminActivityFilters,
  hasInvalidDateRange,
  parseAdminActivityFilters,
  systemActorValue,
} from "@/lib/admin-activity-investigation";
import {
  buildAdminPaginationHref,
  resolveAdminPagination,
} from "@/lib/admin-pagination";
import {
  auditActionLabels,
  auditActionOptions,
  auditEntityLabels,
  auditEntityOptions,
} from "@/lib/audit-export";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Actividad",
  robots: { index: false, follow: false },
};

const pageSize = 40;

type ActivityPageProps = {
  searchParams: Promise<{
    accion?: string | string[];
    actor?: string | string[];
    desde?: string | string[];
    entidad?: string | string[];
    hasta?: string | string[];
    page?: string | string[];
    q?: string | string[];
  }>;
};

export default async function ActivityPage({ searchParams }: ActivityPageProps) {
  const session = await getVerifiedAdminSession(adminOnlyRoles);
  if (!session) redirect("/admin");

  const params = await searchParams;
  const rawFilters = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    const normalizedValue = Array.isArray(value) ? value[0] : value;
    if (normalizedValue) rawFilters.set(key, normalizedValue);
  });
  const filters = parseAdminActivityFilters(rawFilters);
  const where = buildAdminActivityWhere(filters);
  const invalidDateRange = hasInvalidDateRange(
    filters.fromDate,
    filters.toDate,
  );
  const hasFilters = hasAdminActivityFilters(filters);

  const filteredLogs = await prisma.auditLog.count({ where });
  const pagination = resolveAdminPagination(
    Array.isArray(params.page) ? params.page[0] : params.page,
    filteredLogs,
    pageSize,
  );
  const paginationParams = buildAdminActivitySearchParams(filters);
  const pageHref = (targetPage: number) =>
    buildAdminPaginationHref(
      "/admin/activity",
      paginationParams,
      targetPage,
    );

  if (pagination.shouldRedirect) redirect(pageHref(pagination.currentPage));

  const exportParams = buildAdminActivitySearchParams(filters, {
    includeActorAndDates: false,
  });
  const exportHref = `/api/admin/activity/export${
    exportParams.size ? `?${exportParams.toString()}` : ""
  }`;
  const exportHasUnsupportedFilters = Boolean(
    filters.actor || filters.fromDate || filters.toDate,
  );

  const [logs, totalLogs, leadLogs, contentLogs, updateLogs, actors] =
    await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: pagination.skip,
        take: pagination.take,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.auditLog.count(),
      prisma.auditLog.count({
        where: buildAdminActivityScopedWhere(where, {
          entity: {
            in: [
              "Lead",
              "LeadNote",
              "LeadEstimate",
              "LeadAutomationDelivery",
            ],
          },
        }),
      }),
      prisma.auditLog.count({
        where: buildAdminActivityScopedWhere(where, {
          entity: {
            in: [
              "Project",
              "Service",
              "BlogPost",
              "ClientConfig",
              "EstimateConfig",
              "EstimateRule",
            ],
          },
        }),
      }),
      prisma.auditLog.count({
        where: buildAdminActivityScopedWhere(where, { action: "UPDATE" }),
      }),
      prisma.user.findMany({
        where: { auditLogs: { some: {} } },
        orderBy: [{ name: "asc" }, { email: "asc" }],
        select: { email: true, id: true, name: true },
      }),
    ]);

  const totals = {
    content: contentLogs,
    filtered: filteredLogs,
    leads: leadLogs,
    total: totalLogs,
    updates: updateLogs,
  };

  return (
    <section className="grid gap-6">
      <section className="premium-panel p-6 md:p-8">
        <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-bronze">
              Trazabilidad
            </p>
            <h2 className="mt-2 font-serif text-4xl text-ink md:text-5xl">
              Actividad del panel
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-ink/75">
              Investigá cambios por responsable, fecha, recurso y acción, y
              continuá desde el registro hacia su contexto operativo.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold text-ink/60">
            <span className="border border-ink/10 bg-white px-3 py-2">
              {totals.filtered} resultados
            </span>
            {hasFilters ? (
              <Link
                href="/admin/activity"
                className="inline-flex items-center gap-2 border border-ink/15 bg-white px-3 py-2 text-ink transition hover:border-bronze hover:text-bronze"
              >
                <FilterX className="size-4" aria-hidden="true" />
                Limpiar filtros
              </Link>
            ) : null}
          </div>
        </div>

        <form className="mt-7 grid gap-4" aria-label="Investigar actividad">
          <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_200px_220px]">
            <FilterField label="Buscar" htmlFor="activity-search">
              <input
                id="activity-search"
                name="q"
                defaultValue={filters.query || ""}
                placeholder="Resumen, usuario o módulo"
                className={inputClassName}
              />
            </FilterField>
            <FilterField label="Recurso" htmlFor="activity-entity">
              <select
                id="activity-entity"
                name="entidad"
                defaultValue={filters.entity || ""}
                className={inputClassName}
              >
                <option value="">Todos los recursos</option>
                {auditEntityOptions.map((entity) => (
                  <option key={entity} value={entity}>
                    {auditEntityLabels[entity]}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Acción" htmlFor="activity-action">
              <select
                id="activity-action"
                name="accion"
                defaultValue={filters.action || ""}
                className={inputClassName}
              >
                <option value="">Todas las acciones</option>
                {auditActionOptions.map((action) => (
                  <option key={action} value={action}>
                    {auditActionLabels[action]}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Responsable" htmlFor="activity-actor">
              <select
                id="activity-actor"
                name="actor"
                defaultValue={filters.actor || ""}
                className={inputClassName}
              >
                <option value="">Todos los responsables</option>
                <option value={systemActorValue}>Sistema / sitio público</option>
                {actors.map((actor) => (
                  <option key={actor.id} value={actor.id}>
                    {actor.name || actor.email || "Usuario sin nombre"}
                  </option>
                ))}
              </select>
            </FilterField>
          </div>

          <div className="grid gap-3 md:grid-cols-[220px_220px_1fr] md:items-end">
            <FilterField label="Desde" htmlFor="activity-from">
              <input
                id="activity-from"
                type="date"
                name="desde"
                defaultValue={filters.fromDate || ""}
                aria-describedby={invalidDateRange ? "activity-date-error" : undefined}
                aria-invalid={invalidDateRange}
                className={inputClassName}
              />
            </FilterField>
            <FilterField label="Hasta" htmlFor="activity-to">
              <input
                id="activity-to"
                type="date"
                name="hasta"
                defaultValue={filters.toDate || ""}
                aria-describedby={invalidDateRange ? "activity-date-error" : undefined}
                aria-invalid={invalidDateRange}
                className={inputClassName}
              />
            </FilterField>
            <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
              <button
                type="submit"
                className="inline-flex h-12 items-center justify-center bg-ink px-6 text-sm font-semibold text-paper transition hover:bg-bronze focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bronze focus-visible:ring-offset-2"
              >
                Aplicar investigación
              </button>
              {exportHasUnsupportedFilters ? (
                <span
                  aria-describedby="activity-export-disabled-reason"
                  aria-disabled="true"
                  aria-label="Exportar CSV"
                  className="inline-flex h-12 cursor-not-allowed items-center justify-center gap-2 border border-ink/10 bg-mist px-5 text-sm font-semibold text-ink/40"
                  role="link"
                  tabIndex={0}
                  title="La exportación admite búsqueda, recurso y acción. Quitá responsable y fechas para exportar."
                >
                  <Download className="size-4" aria-hidden="true" />
                  Exportar CSV
                  <span id="activity-export-disabled-reason" className="sr-only">
                    No disponible: quitá el responsable y las fechas para
                    exportar.
                  </span>
                </span>
              ) : (
                <Link
                  href={exportHref}
                  prefetch={false}
                  className="inline-flex h-12 items-center justify-center gap-2 border border-ink/15 px-5 text-sm font-semibold text-ink transition hover:border-bronze hover:text-bronze focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bronze focus-visible:ring-offset-2"
                >
                  <Download className="size-4" aria-hidden="true" />
                  Exportar CSV
                </Link>
              )}
            </div>
          </div>
        </form>

        {invalidDateRange ? (
          <p
            id="activity-date-error"
            className="mt-4 border-l-2 border-red-600 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
            role="alert"
          >
            La fecha “Desde” debe ser anterior o igual a la fecha “Hasta”.
          </p>
        ) : null}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Resumen de actividad">
        {[
          ["Movimientos totales", totals.total],
          ["Resultado actual", totals.filtered],
          ["Actividad comercial", totals.leads],
          ["Cambios de contenido", totals.content],
          ["Actualizaciones", totals.updates],
        ].map(([label, value]) => (
          <article key={label} className="premium-card min-h-28 p-5">
            <p className="font-sans text-4xl font-semibold tabular-nums text-ink">
              {value}
            </p>
            <p className="mt-1 text-sm text-ink/70">{label}</p>
          </article>
        ))}
      </section>

      <section className="premium-card p-5 md:p-6" aria-labelledby="activity-results-title">
        <div className="flex items-start gap-3">
          <Activity className="mt-1 size-5 text-bronze" aria-hidden="true" />
          <div>
            <h3 id="activity-results-title" className="font-serif text-3xl text-ink">
              Movimientos encontrados
            </h3>
            <p className="mt-2 text-sm leading-7 text-ink/70">
              Ordenados desde el evento más reciente. Los accesos contextuales
              aparecen cuando el destino puede derivarse con seguridad.
            </p>
          </div>
        </div>

        {logs.length ? (
          <div className="mt-6 grid gap-3">
            {logs.map((log) => {
              const target = getAdminAuditResourceTarget(log);
              const actionLabel =
                auditActionLabels[
                  log.action as keyof typeof auditActionLabels
                ] || log.action;
              const entityLabel =
                auditEntityLabels[
                  log.entity as keyof typeof auditEntityLabels
                ] || log.entity;
              return (
                <article
                  key={log.id}
                  className="grid gap-4 border border-ink/10 bg-mist p-4 transition hover:border-bronze/50 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <span className="border border-ink/10 bg-paper px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/65">
                        {actionLabel}
                      </span>
                      <span className="border border-bronze/20 bg-paper px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-bronze">
                        {entityLabel}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-semibold leading-6 text-ink">
                      {log.summary}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink/55">
                      <time dateTime={log.createdAt.toISOString()} className="inline-flex items-center gap-1.5">
                        <CalendarDays className="size-3.5" aria-hidden="true" />
                        {formatDate(log.createdAt)}
                      </time>
                      <span className="inline-flex items-center gap-1.5">
                        <UserRound className="size-3.5" aria-hidden="true" />
                        {log.user?.name || log.user?.email || "Sistema / sitio público"}
                      </span>
                      {log.entityId ? (
                        <span className="break-all font-mono text-[11px] text-ink/40">
                          {log.entityId}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {target ? (
                    <Link
                      href={target.href}
                      className="inline-flex h-10 items-center justify-center gap-2 border border-ink/15 bg-paper px-3 text-xs font-semibold text-ink transition hover:border-bronze hover:text-bronze focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bronze focus-visible:ring-offset-2"
                    >
                      {target.label}
                      <ArrowUpRight className="size-4" aria-hidden="true" />
                    </Link>
                  ) : null}
                </article>
              );
            })}
            <AdminPaginationControls
              currentPage={pagination.currentPage}
              itemLabel="movimientos"
              pageHref={pageHref}
              totalPages={pagination.totalPages}
              totalResults={filteredLogs}
            />
          </div>
        ) : (
          <div className="mt-6 border border-dashed border-ink/20 p-10 text-center">
            <h3 className="font-serif text-3xl text-ink">
              {hasFilters
                ? "No encontramos movimientos con estos filtros"
                : "Todavía no hay actividad registrada"}
            </h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-ink/70">
              {hasFilters
                ? "Probá ampliar el rango de fechas o quitar alguno de los criterios."
                : "Los cambios del equipo y del sistema aparecerán en este historial."}
            </p>
            {hasFilters ? (
              <Link
                href="/admin/activity"
                className="mt-5 inline-flex h-11 items-center justify-center gap-2 border border-ink/15 px-4 text-sm font-semibold text-ink transition hover:border-bronze hover:text-bronze"
              >
                <FilterX className="size-4" aria-hidden="true" />
                Ver toda la actividad
              </Link>
            ) : null}
          </div>
        )}
      </section>
    </section>
  );
}

const inputClassName =
  "h-12 w-full border border-ink/12 bg-white px-4 text-sm text-ink outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/20";

function FilterField({
  children,
  htmlFor,
  label,
}: {
  children: React.ReactNode;
  htmlFor: string;
  label: string;
}) {
  return (
    <label htmlFor={htmlFor} className="grid gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/55">
        {label}
      </span>
      {children}
    </label>
  );
}
