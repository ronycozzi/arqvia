import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type {
  LeadAutomationEvent,
  LeadAutomationStatus,
} from "@prisma/client";
import {
  ArrowUpRight,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FilterX,
  Inbox,
  RadioTower,
  Search,
} from "lucide-react";
import { AutomationErrorGuidance } from "@/components/admin/automation-error-guidance";
import {
  AutomationRequeueAction,
  AutomationRequeueBatchAction,
} from "@/components/admin/automation-delivery-actions";
import { AdminPaginationControls } from "@/components/admin/pagination-controls";
import { adminOnlyRoles, getVerifiedAdminSession } from "@/lib/admin-auth";
import {
  buildAdminPaginationHref,
  resolveAdminPagination,
} from "@/lib/admin-pagination";
import {
  automationEventValues,
  automationRecoveryValues,
  automationResultValues,
  automationStatusValues,
  buildAdminAutomationSearchParams,
  buildAdminAutomationWhere,
  buildManualAutomationBatchWhere,
  hasAdminAutomationFilters,
  hasInvalidAutomationDateRange,
  parseAdminAutomationFilters,
} from "@/lib/admin-automation-investigation";
import { readLeadAutomationConfig } from "@/lib/lead-automation-config";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Automatizaciones de leads",
  robots: { index: false, follow: false },
};

const pageSize = 20;
const statusMeta: Record<
  LeadAutomationStatus,
  { label: string; description: string; className: string }
> = {
  PENDING: {
    label: "Pendientes",
    description: "En cola",
    className: "border-amber-300 bg-amber-50 text-amber-800",
  },
  PROCESSING: {
    label: "Procesando",
    description: "En curso",
    className: "border-sky-300 bg-sky-50 text-sky-800",
  },
  DELIVERED: {
    label: "Entregadas",
    description: "Confirmadas",
    className: "border-emerald-300 bg-emerald-50 text-emerald-800",
  },
  FAILED: {
    label: "Fallidas",
    description: "Lista para reencolar",
    className: "border-red-300 bg-red-50 text-red-700",
  },
  DEAD: {
    label: "Agotadas",
    description: "Revisión manual",
    className: "border-ink/35 bg-ink text-paper",
  },
};

const eventLabels: Record<LeadAutomationEvent, string> = {
  LEAD_CREATED: "Lead creado",
  LEAD_RECONSULTED: "Lead reconsultó",
};

const resultLabels = {
  ERROR: "Cualquier error",
  HTTP_4XX: "Respuesta HTTP 4xx",
  HTTP_5XX: "Respuesta HTTP 5xx",
  NO_RESPONSE: "Sin respuesta HTTP",
} as const;

const recoveryLabels = {
  EXHAUSTED: "Intentos agotados",
  READY: "Lista para recuperar",
  SCHEDULED: "Reintento programado",
} as const;

const statusItemLabels: Record<LeadAutomationStatus, string> = {
  DEAD: "Agotada",
  DELIVERED: "Entregada",
  FAILED: "Fallida",
  PENDING: "Pendiente",
  PROCESSING: "Procesando",
};

type AutomationsPageProps = {
  searchParams: Promise<{
    desde?: string | string[];
    entrega?: string | string[];
    estado?: string | string[];
    evento?: string | string[];
    hasta?: string | string[];
    page?: string | string[];
    q?: string | string[];
    recuperacion?: string | string[];
    resultado?: string | string[];
  }>;
};

export default async function AutomationsPage({
  searchParams,
}: AutomationsPageProps) {
  const session = await getVerifiedAdminSession(adminOnlyRoles);
  if (!session) redirect("/admin");

  const params = await searchParams;
  const rawFilters = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    const normalizedValue = Array.isArray(value) ? value[0] : value;
    if (normalizedValue) rawFilters.set(key, normalizedValue);
  });
  const filters = parseAdminAutomationFilters(rawFilters);
  const selectedStatus = filters.status || "";
  const hasFilters = hasAdminAutomationFilters(filters);
  const invalidDateRange = hasInvalidAutomationDateRange(
    filters.fromDate,
    filters.toDate,
  );
  const config = readLeadAutomationConfig();
  const automationOperational =
    config.captureEnabled &&
    (!config.dispatchEnabled || config.dispatchReady);
  const automationStatusLabel = config.captureEnabled
    ? config.dispatchReady
      ? "Captura y envíos habilitados"
      : config.dispatchEnabled
        ? "Configuración de envío incompleta"
        : "Captura activa · envíos pausados"
    : config.dispatchReady
      ? "Captura pausada · envíos habilitados"
      : config.dispatchEnabled
        ? "Captura pausada · configuración incompleta"
       : "Captura y envíos pausados";
  const now = new Date();
  const where = buildAdminAutomationWhere(filters, now);
  const statusCountWhere = buildAdminAutomationWhere(
    { ...filters, status: null },
    now,
  );

  const [filteredCount, groupedCounts, requeueableCount] = await Promise.all([
    prisma.leadAutomationDelivery.count({ where }),
    prisma.leadAutomationDelivery.groupBy({
      by: ["status"],
      where: statusCountWhere,
      _count: { _all: true },
    }),
    prisma.leadAutomationDelivery.count({
      where: buildManualAutomationBatchWhere(now),
    }),
  ]);

  const pagination = resolveAdminPagination(
    Array.isArray(params.page) ? params.page[0] : params.page,
    filteredCount,
    pageSize,
  );
  const paginationParams = buildAdminAutomationSearchParams(filters);
  const pageHref = (page: number) =>
    buildAdminPaginationHref("/admin/automations", paginationParams, page);

  if (pagination.shouldRedirect) {
    redirect(pageHref(pagination.currentPage));
  }

  const counts = new Map<LeadAutomationStatus, number>(
    groupedCounts.map((item) => [item.status, item._count._all]),
  );
  const totalCount = automationStatusValues.reduce(
    (total, status) => total + (counts.get(status) || 0),
    0,
  );
  const { currentPage, totalPages } = pagination;
  const deliveries = await prisma.leadAutomationDelivery.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: pagination.skip,
    take: pagination.take,
    select: {
      attempts: true,
      createdAt: true,
      deliveredAt: true,
      event: true,
      id: true,
      lastAttemptAt: true,
      lastErrorCode: true,
      lead: {
        select: {
          city: true,
          id: true,
          name: true,
          projectType: true,
        },
      },
      nextAttemptAt: true,
      responseStatus: true,
      status: true,
      updatedAt: true,
    },
  });

  const statusHref = (status?: LeadAutomationStatus) => {
    const next = buildAdminAutomationSearchParams(filters, {
      status: status || null,
    });
    return `/admin/automations${next.size ? `?${next.toString()}` : ""}`;
  };
  const clearDeliveryParams = buildAdminAutomationSearchParams(filters, {
    deliveryId: null,
  });
  const clearDeliveryHref = `/admin/automations${
    clearDeliveryParams.size ? `?${clearDeliveryParams.toString()}` : ""
  }`;

  return (
    <section className="grid gap-6">
      <section className="premium-card-dark overflow-hidden p-6 text-paper md:p-8">
        <div className="grid gap-7 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <div className="flex items-center gap-2 text-bronze-light">
              <RadioTower className="size-4" aria-hidden="true" />
              <p className="text-xs font-semibold uppercase tracking-[0.2em]">
                Integraciones
              </p>
            </div>
            <h2 className="mt-3 max-w-3xl font-serif text-4xl leading-tight md:text-5xl">
              Entregas de automatización
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-paper/70">
              Este panel solo reencola entregas. El envío externo se ejecuta
              exclusivamente desde el cron autenticado.
            </p>
          </div>
          <AutomationRequeueBatchAction
            disabled={requeueableCount === 0}
            requeueableCount={requeueableCount}
          />
        </div>
      </section>

      <section
        className="border border-ink/10 bg-paper"
        aria-labelledby="automation-readiness-title"
      >
        <div className="flex flex-col justify-between gap-3 border-b border-ink/10 px-5 py-4 md:flex-row md:items-center md:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bronze">
              Preparación segura
            </p>
            <h3
              id="automation-readiness-title"
              className="mt-1 font-serif text-2xl text-ink"
            >
              Configuración de ejecución
            </h3>
          </div>
          <ReadinessBadge
            label={automationStatusLabel}
            ready={automationOperational}
          />
        </div>

        <dl className="grid gap-px bg-ink/10 md:grid-cols-2 xl:grid-cols-3">
          <ReadinessItem
            label="Captura en outbox"
            value={config.captureEnabled ? "Activa" : "Pausada"}
            ready={config.captureEnabled}
          />
          <ReadinessItem
            label="Despacho externo"
            value={
              config.dispatchReady
                ? "Activo"
                : config.dispatchEnabled
                  ? "Incompleto"
                  : "Pausado"
            }
            ready={!config.dispatchEnabled || config.dispatchReady}
          />
          <ReadinessItem
            label="Webhook"
            value={config.webhookReady ? "Listo" : "Pendiente"}
            ready={config.webhookReady}
          />
          <ReadinessItem
            label="Procesador programado"
            value={config.cronReady ? "Listo" : "Pendiente"}
            ready={config.cronReady}
          />
          <ReadinessItem
            label="Host de destino"
            value={config.endpointHost || "No configurado"}
            ready={Boolean(config.endpointHost)}
            mono
          />
          <div className="bg-paper px-5 py-4 md:px-6">
            <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/68">
              Política
            </dt>
            <dd className="mt-2 text-sm font-semibold text-ink">
              {config.maxAttempts} intentos · {formatDuration(config.timeoutMs)} de espera
            </dd>
          </div>
        </dl>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6" aria-label="Conteos de entregas">
        <MetricCard
          active={!selectedStatus}
          href={statusHref()}
          label="Total"
          value={totalCount}
        />
        {automationStatusValues.map((status) => (
          <MetricCard
            key={status}
            active={selectedStatus === status}
            href={statusHref(status)}
            label={statusMeta[status].label}
            value={counts.get(status) || 0}
          />
        ))}
      </section>

      <section className="border border-ink/10 bg-paper p-5 md:p-6" aria-labelledby="automation-filters-title">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-2 text-bronze">
              <Search className="size-4" aria-hidden="true" />
              <p className="text-xs font-semibold uppercase tracking-[0.18em]">
                Investigación
              </p>
            </div>
            <h3 id="automation-filters-title" className="mt-1 font-serif text-2xl text-ink">
              Encontrar una entrega
            </h3>
          </div>
          {hasFilters ? (
            <Link
              href="/admin/automations"
              className="inline-flex h-10 items-center justify-center gap-2 border border-ink/15 px-3 text-xs font-semibold text-ink transition hover:border-bronze hover:text-bronze"
            >
              <FilterX className="size-4" aria-hidden="true" />
              Limpiar filtros
            </Link>
          ) : null}
        </div>

        {filters.deliveryId ? (
          <div className="mt-4 flex flex-col justify-between gap-3 border-l-2 border-bronze bg-mist px-4 py-3 sm:flex-row sm:items-center">
            <p className="min-w-0 text-xs text-ink/65">
              Entrega exacta: <span className="break-all font-mono font-semibold text-ink">{filters.deliveryId}</span>
            </p>
            <Link
              href={clearDeliveryHref}
              className="shrink-0 text-xs font-semibold text-bronze underline decoration-bronze/40 underline-offset-4 hover:decoration-bronze"
            >
              Quitar entrega exacta
            </Link>
          </div>
        ) : null}

        <form className="mt-5 grid gap-4" aria-label="Filtrar entregas de automatización">
          {filters.deliveryId ? (
            <input type="hidden" name="entrega" value={filters.deliveryId} />
          ) : null}
          <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_180px_200px_210px]">
            <AutomationFilterField label="Buscar" htmlFor="automation-search">
              <input
                id="automation-search"
                name="q"
                defaultValue={filters.query || ""}
                placeholder="Lead, ciudad, entrega o error"
                className={automationInputClassName}
              />
            </AutomationFilterField>
            <AutomationFilterField label="Estado" htmlFor="automation-status">
              <select
                id="automation-status"
                name="estado"
                defaultValue={filters.status || ""}
                className={automationInputClassName}
              >
                <option value="">Todos</option>
                {automationStatusValues.map((status) => (
                  <option key={status} value={status}>
                    {statusMeta[status].label}
                  </option>
                ))}
              </select>
            </AutomationFilterField>
            <AutomationFilterField label="Evento" htmlFor="automation-event">
              <select
                id="automation-event"
                name="evento"
                defaultValue={filters.event || ""}
                className={automationInputClassName}
              >
                <option value="">Todos los eventos</option>
                {automationEventValues.map((event) => (
                  <option key={event} value={event}>
                    {eventLabels[event]}
                  </option>
                ))}
              </select>
            </AutomationFilterField>
            <AutomationFilterField label="Resultado técnico" htmlFor="automation-result">
              <select
                id="automation-result"
                name="resultado"
                defaultValue={filters.result || ""}
                className={automationInputClassName}
              >
                <option value="">Cualquier resultado</option>
                {automationResultValues.map((result) => (
                  <option key={result} value={result}>
                    {resultLabels[result]}
                  </option>
                ))}
              </select>
            </AutomationFilterField>
          </div>

          <div className="grid gap-3 md:grid-cols-[220px_190px_190px_1fr] md:items-end">
            <AutomationFilterField label="Recuperación" htmlFor="automation-recovery">
              <select
                id="automation-recovery"
                name="recuperacion"
                defaultValue={filters.recovery || ""}
                className={automationInputClassName}
              >
                <option value="">Cualquier situación</option>
                {automationRecoveryValues.map((recovery) => (
                  <option key={recovery} value={recovery}>
                    {recoveryLabels[recovery]}
                  </option>
                ))}
              </select>
            </AutomationFilterField>
            <AutomationFilterField label="Creada desde" htmlFor="automation-from">
              <input
                id="automation-from"
                type="date"
                name="desde"
                defaultValue={filters.fromDate || ""}
                aria-describedby={invalidDateRange ? "automation-date-error" : undefined}
                aria-invalid={invalidDateRange}
                className={automationInputClassName}
              />
            </AutomationFilterField>
            <AutomationFilterField label="Creada hasta" htmlFor="automation-to">
              <input
                id="automation-to"
                type="date"
                name="hasta"
                defaultValue={filters.toDate || ""}
                aria-describedby={invalidDateRange ? "automation-date-error" : undefined}
                aria-invalid={invalidDateRange}
                className={automationInputClassName}
              />
            </AutomationFilterField>
            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center bg-ink px-6 text-sm font-semibold text-paper transition hover:bg-bronze focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bronze focus-visible:ring-offset-2 md:justify-self-end"
            >
              Aplicar filtros
            </button>
          </div>
        </form>

        {invalidDateRange ? (
          <p
            id="automation-date-error"
            className="mt-4 border-l-2 border-red-600 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
            role="alert"
          >
            La fecha inicial debe ser anterior o igual a la fecha final.
          </p>
        ) : null}
      </section>

      <section className="border-y border-ink/10 bg-paper px-5 py-4 md:px-6">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bronze">
              Cola de entregas
            </p>
            <p className="mt-1 text-sm text-ink/65">
              {filteredCount} {filteredCount === 1 ? "registro" : "registros"} en la vista actual
            </p>
          </div>
          <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Filtrar por estado">
            <StatusFilter
              active={!selectedStatus}
              count={totalCount}
              href={statusHref()}
              label="Todos"
            />
            {automationStatusValues.map((status) => (
              <StatusFilter
                key={status}
                active={selectedStatus === status}
                count={counts.get(status) || 0}
                href={statusHref(status)}
                label={statusMeta[status].label}
              />
            ))}
          </nav>
        </div>
      </section>

      {deliveries.length ? (
        <div className="grid gap-4">
          {deliveries.map((delivery) => (
            <article key={delivery.id} className="premium-card overflow-hidden">
              <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] lg:p-6">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={delivery.status} />
                    <span className="border border-ink/10 bg-mist px-2.5 py-1 text-xs font-semibold text-ink/70">
                      {eventLabels[delivery.event]}
                    </span>
                    <span className="font-mono text-[11px] text-ink/45">
                      {delivery.id}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <Link
                        href={`/admin/leads/${delivery.lead.id}`}
                        className="group inline-flex items-center gap-2 font-serif text-3xl leading-tight text-ink transition hover:text-bronze"
                      >
                        {delivery.lead.name}
                        <ArrowUpRight
                          className="size-4 shrink-0 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </Link>
                      <p className="mt-1 text-sm text-ink/65">
                        {delivery.lead.projectType} · {delivery.lead.city}
                      </p>
                    </div>
                    <div className="shrink-0 sm:text-right">
                      <p className="font-sans text-2xl font-semibold tabular-nums text-ink">
                        {delivery.attempts}/{config.maxAttempts}
                      </p>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/68">
                        Intentos
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-px overflow-hidden border border-ink/10 bg-ink/10 sm:grid-cols-2">
                    <TimingCell label="Creada" value={delivery.createdAt} />
                    <TimingCell label="Último intento" value={delivery.lastAttemptAt} />
                    <TimingCell label="Próximo intento" value={delivery.nextAttemptAt} />
                    <TimingCell label="Entregada" value={delivery.deliveredAt} />
                  </div>
                </div>

                <div className="flex min-w-0 flex-col justify-between gap-5 border-t border-ink/10 pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                  <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <DetailField
                      label="Respuesta"
                      value={
                        delivery.responseStatus !== null
                          ? `HTTP ${delivery.responseStatus}`
                          : "Sin respuesta"
                      }
                    />
                    <DetailField
                      label="Código de error"
                      value={delivery.lastErrorCode || "Sin error"}
                      mono={Boolean(delivery.lastErrorCode)}
                      danger={Boolean(delivery.lastErrorCode)}
                    />
                    <DetailField
                      label="Actualizada"
                      value={formatAutomationDate(delivery.updatedAt)}
                    />
                    <DetailField
                      label="Estado operativo"
                      value={statusMeta[delivery.status].description}
                    />
                  </dl>

                  <AutomationErrorGuidance
                    errorCode={delivery.lastErrorCode}
                    responseStatus={delivery.responseStatus}
                  />

                  <Link
                    href={`/admin/activity?entidad=LeadAutomationDelivery&q=${encodeURIComponent(delivery.id)}`}
                    className="inline-flex items-center gap-2 justify-self-start text-xs font-semibold text-ink/60 underline decoration-ink/20 underline-offset-4 transition hover:text-bronze hover:decoration-bronze"
                  >
                    Revisar trazabilidad de la entrega
                    <ArrowUpRight className="size-3.5" aria-hidden="true" />
                  </Link>

                  {delivery.status === "FAILED" || delivery.status === "DEAD" ? (
                    <AutomationRequeueAction
                      deliveryId={delivery.id}
                      disabled={false}
                      errorCode={delivery.lastErrorCode}
                      responseStatus={delivery.responseStatus}
                    />
                  ) : (
                    <p className="text-xs leading-5 text-ink/68 lg:text-right">
                      {delivery.status === "DELIVERED"
                        ? "Entrega confirmada por el destino."
                        : delivery.status === "PROCESSING"
                          ? "Procesamiento exclusivo del cron protegido en curso."
                          : "En espera del cron protegido."}
                    </p>
                  )}
                </div>
              </div>
            </article>
          ))}

          <div className="pt-2">
            <AdminPaginationControls
              currentPage={currentPage}
              itemLabel="entregas"
              pageHref={pageHref}
              totalPages={totalPages}
              totalResults={filteredCount}
            />
          </div>
        </div>
      ) : (
        <EmptyState filtered={hasFilters} />
      )}
    </section>
  );
}

function formatAutomationDate(value: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(value);
}

function formatDuration(milliseconds: number) {
  return milliseconds >= 1_000
    ? `${Math.round(milliseconds / 1_000)} s`
    : `${milliseconds} ms`;
}

function ReadinessBadge({
  label,
  ready,
}: {
  label: string;
  ready: boolean;
}) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-2 border px-3 py-2 text-xs font-semibold ${
        ready
          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
          : "border-amber-300 bg-amber-50 text-amber-800"
      }`}
    >
      {ready ? (
        <CheckCircle2 className="size-4" aria-hidden="true" />
      ) : (
        <CircleAlert className="size-4" aria-hidden="true" />
      )}
      {label}
    </span>
  );
}

function ReadinessItem({
  label,
  mono = false,
  ready,
  value,
}: {
  label: string;
  mono?: boolean;
  ready: boolean;
  value: string;
}) {
  return (
    <div className="bg-paper px-5 py-4 md:px-6">
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/68">
        {label}
      </dt>
      <dd
        className={`mt-2 flex min-w-0 items-center gap-2 text-sm font-semibold ${
          ready ? "text-emerald-800" : "text-amber-800"
        }`}
      >
        <span
          className={`size-2 shrink-0 ${ready ? "bg-emerald-500" : "bg-amber-500"}`}
          aria-hidden="true"
        />
        <span className={`${mono ? "break-all font-mono text-xs" : ""}`}>
          {value}
        </span>
      </dd>
    </div>
  );
}

function MetricCard({
  active,
  href,
  label,
  value,
}: {
  active: boolean;
  href: string;
  label: string;
  value: number;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`min-h-28 border p-4 transition hover:-translate-y-0.5 hover:border-bronze ${
        active
          ? "border-ink bg-ink text-paper"
          : "border-ink/10 bg-paper text-ink"
      }`}
    >
      <p className="font-sans text-4xl font-semibold tabular-nums">{value}</p>
      <p className={`mt-2 text-xs font-semibold uppercase tracking-[0.12em] ${active ? "text-paper/65" : "text-ink/70"}`}>
        {label}
      </p>
    </Link>
  );
}

function StatusFilter({
  active,
  count,
  href,
  label,
}: {
  active: boolean;
  count: number;
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex h-10 shrink-0 items-center gap-2 border px-3 text-xs font-semibold transition hover:border-bronze ${
        active
          ? "border-ink bg-ink text-paper"
          : "border-ink/10 bg-white text-ink"
      }`}
    >
      {label}
      <span className={active ? "text-paper/55" : "text-ink/45"}>{count}</span>
    </Link>
  );
}

function StatusBadge({ status }: { status: LeadAutomationStatus }) {
  return (
    <span
      className={`inline-flex border px-2.5 py-1 text-xs font-semibold ${statusMeta[status].className}`}
    >
      {statusItemLabels[status]}
    </span>
  );
}

function TimingCell({ label, value }: { label: string; value: Date | null }) {
  return (
    <div className="bg-mist px-3 py-3">
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/45">
        <Clock3 className="size-3.5" aria-hidden="true" />
        {label}
      </p>
      {value ? (
        <time
          className="mt-1 block text-xs font-semibold text-ink/75"
          dateTime={value.toISOString()}
        >
          {formatAutomationDate(value)}
        </time>
      ) : (
        <p className="mt-1 text-xs text-ink/45">Sin registro</p>
      )}
    </div>
  );
}

function DetailField({
  danger = false,
  label,
  mono = false,
  value,
}: {
  danger?: boolean;
  label: string;
  mono?: boolean;
  value: string;
}) {
  return (
    <div className="border-l-2 border-ink/10 pl-3">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/45">
        {label}
      </dt>
      <dd
        className={`mt-1 break-words text-sm font-semibold ${
          danger ? "text-red-700" : "text-ink/75"
        } ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <section className="premium-card grid min-h-80 place-items-center p-8 text-center">
      <div className="max-w-xl">
        <Inbox className="mx-auto size-10 text-bronze" aria-hidden="true" />
        <h3 className="mt-4 font-serif text-3xl text-ink">
          {filtered
            ? "No hay entregas con estos filtros"
            : "Todavía no hay entregas"}
        </h3>
        <p className="mt-2 text-sm leading-7 text-ink/65">
          {filtered
            ? "Probá ampliar las fechas o quitar alguno de los criterios."
            : "La cola de automatización está vacía."}
        </p>
        {filtered ? (
          <Link
            href="/admin/automations"
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 border border-ink/15 px-4 text-sm font-semibold text-ink transition hover:border-bronze hover:text-bronze"
          >
            <FilterX className="size-4" aria-hidden="true" />
            Limpiar filtros
          </Link>
        ) : null}
      </div>
    </section>
  );
}

const automationInputClassName =
  "h-12 w-full border border-ink/12 bg-white px-4 text-sm text-ink outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/20";

function AutomationFilterField({
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
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/70">
        {label}
      </span>
      {children}
    </label>
  );
}
