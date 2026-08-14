import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { LeadStatus, Prisma } from "@prisma/client";
import { BellDot, Download, MessageCircle, Search, SlidersHorizontal } from "lucide-react";
import { AdminPaginationControls } from "@/components/admin/pagination-controls";
import { LeadListActions } from "@/components/admin/lead-list-actions";
import { LeadStatusSelect } from "@/components/admin/lead-status-select";
import { LeadContactLink } from "@/components/admin/lead-contact-link";
import { AdminUnreadLeadBadge } from "@/components/admin/unread-lead-badge";
import {
  canContactLead,
  canManageCommercial,
  canViewLeadPII,
  requireVerifiedAdminSession,
} from "@/lib/admin-auth";
import {
  buildAdminPaginationHref,
  resolveAdminPagination,
} from "@/lib/admin-pagination";
import {
  buildLeadMailtoUrl,
  buildLeadWhatsAppUrl,
  getLeadCommercialReading,
  getLeadPriority,
  leadStatusClassNames,
  leadStatusLabels,
  leadStatusOptions,
} from "@/lib/lead-utils";
import { prisma } from "@/lib/db";
import { formatUsd } from "@/lib/estimator";
import { buildLeadInactivityWhere } from "@/lib/lead-activity";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Leads",
  robots: { index: false, follow: false },
};

type LeadsPageProps = {
  searchParams: Promise<{
    q?: string;
    estado?: string;
    orden?: string;
    seguimiento?: string;
    page?: string;
  }>;
};

const pageSize = 25;
const staleLeadMs = 48 * 60 * 60 * 1000;

type FollowUpFilter =
  | "vencidos"
  | "mios"
  | "sin-responsable"
  | "sin-notas"
  | "reconsultas"
  | "sin-contactar";

type LeadSort = "antiguas" | "proximo-seguimiento" | "recientes";

const leadSortOptions: Array<{ label: string; value: LeadSort }> = [
  { label: "Más recientes", value: "recientes" },
  { label: "Más antiguas", value: "antiguas" },
  { label: "Próximo seguimiento", value: "proximo-seguimiento" },
];

const roleLabels = {
  ADMIN: "Administrador",
  EDITOR: "Editor",
  VIEWER: "Solo lectura",
} as const;

const followUpFilters: Array<{
  value: FollowUpFilter;
  label: string;
  description: string;
}> = [
  {
    value: "vencidos",
    label: "Seguimientos vencidos",
    description: "Próximas acciones que ya requieren atención",
  },
  {
    value: "mios",
    label: "Mis consultas",
    description: "Oportunidades asignadas a tu usuario",
  },
  {
    value: "sin-responsable",
    label: "Sin responsable",
    description: "Consultas abiertas que todavía no tienen dueño",
  },
  {
    value: "sin-contactar",
    label: "Nuevas sin contacto",
    description: "Consultas nuevas con mas de 48 h",
  },
  {
    value: "sin-notas",
    label: "Sin notas",
    description: "Oportunidades sin seguimiento interno",
  },
  {
    value: "reconsultas",
    label: "Reconsultas",
    description: "Contactos que volvieron a escribir",
  },
];

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const { q, estado, orden, seguimiento, page } = await searchParams;
  const session = await requireVerifiedAdminSession();
  const canManage = canManageCommercial(session.user.role);
  const canViewContactData = canViewLeadPII(session.user.role);
  const canContact = canContactLead(session.user.role);
  const leadNotificationsReadAt = session.user.leadNotificationsReadAt;
  const query = q?.trim();
  const selectedStatus = isLeadStatus(estado) ? estado : "";
  const selectedFollowUp =
    canManage && isFollowUpFilter(seguimiento) ? seguimiento : "";
  const selectedSort = isLeadSort(orden) ? orden : "recientes";
  const staleSince = new Date();
  staleSince.setTime(staleSince.getTime() - staleLeadMs);
  const snapshotAt = new Date();

  const whereClauses: Prisma.LeadWhereInput[] = [];
  if (selectedStatus) {
    whereClauses.push({ status: selectedStatus });
  }
  if (query) {
    const searchableFields: Prisma.LeadWhereInput[] = [
      { projectType: { contains: query } },
      { sourcePage: { contains: query } },
    ];

    if (canViewContactData) {
      searchableFields.push(
        { name: { contains: query } },
        { city: { contains: query } },
        { message: { contains: query } },
        { email: { contains: query } },
        { phone: { contains: query } },
      );
    }

    whereClauses.push({
      OR: searchableFields,
    });
  }
  const followUpWhere = getFollowUpWhere(
    selectedFollowUp,
    staleSince,
    snapshotAt,
    session.user.id,
  );
  if (followUpWhere) {
    whereClauses.push(followUpWhere);
  }

  const where: Prisma.LeadWhereInput = whereClauses.length
    ? { AND: whereClauses }
    : {};
  const defaultOrderBy: Prisma.LeadOrderByWithRelationInput[] =
    selectedSort === "antiguas"
      ? [{ createdAt: "asc" }]
      : selectedSort === "proximo-seguimiento"
        ? [{ nextFollowUpAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }]
        : [{ createdAt: "desc" }];
  const leadOrderBy: Prisma.LeadOrderByWithRelationInput[] =
    selectedFollowUp === "vencidos"
      ? [{ nextFollowUpAt: "asc" }, { createdAt: "asc" }]
      : selectedFollowUp === "sin-contactar"
      ? [{ lastActivityAt: "asc" }]
      : selectedFollowUp === "sin-notas"
      ? [{ createdAt: "asc" }]
      : defaultOrderBy;

  const filteredCount = await prisma.lead.count({ where });
  const pagination = resolveAdminPagination(page, filteredCount, pageSize);
  const paginationParams = new URLSearchParams();
  if (query) paginationParams.set("q", query);
  if (selectedStatus) paginationParams.set("estado", selectedStatus);
  if (selectedFollowUp) paginationParams.set("seguimiento", selectedFollowUp);
  if (selectedSort !== "recientes") paginationParams.set("orden", selectedSort);
  const pageHref = (nextPage: number) =>
    buildAdminPaginationHref("/admin/leads", paginationParams, nextPage);

  if (pagination.shouldRedirect) {
    redirect(pageHref(pagination.currentPage));
  }

  const [
    leads,
    totalCount,
    newCount,
    qualifiedCount,
    wonCount,
    staleNewCount,
    overdueFollowUpCount,
    unassignedCount,
  ] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: leadOrderBy,
        skip: pagination.skip,
        take: pagination.take,
        include: {
          estimate: true,
          notes: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          assignedUser: {
            select: { email: true, name: true },
          },
          _count: {
            select: { notes: true },
          },
        },
      }),
      prisma.lead.count(),
      prisma.lead.count({ where: { status: "NEW" } }),
      prisma.lead.count({ where: { status: "QUALIFIED" } }),
      prisma.lead.count({ where: { status: "WON" } }),
      canManage
        ? prisma.lead.count({
            where: {
              ...buildLeadInactivityWhere(staleSince),
              status: "NEW",
            },
          })
        : Promise.resolve(0),
      canManage
        ? prisma.lead.count({
            where: {
              nextFollowUpAt: { lte: snapshotAt },
              status: { in: ["NEW", "CONTACTED", "QUALIFIED", "QUOTED"] },
            },
          })
        : Promise.resolve(0),
      canManage
        ? prisma.lead.count({
            where: {
              assignedUserId: null,
              status: { in: ["NEW", "CONTACTED", "QUALIFIED", "QUOTED"] },
            },
          })
        : Promise.resolve(0),
    ]);
  const { currentPage, totalPages } = pagination;

  const stats = [
    { label: "Consultas totales", value: totalCount },
    { label: "Resultado actual", value: filteredCount },
    { label: "Nuevas", value: newCount },
    { label: "Calificadas", value: qualifiedCount },
    { label: "Ganadas", value: wonCount },
  ];

  const statusHref = (status?: LeadStatus) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (selectedFollowUp) params.set("seguimiento", selectedFollowUp);
    if (selectedSort !== "recientes") params.set("orden", selectedSort);
    if (status) params.set("estado", status);
    const search = params.toString();
    return search ? `/admin/leads?${search}` : "/admin/leads";
  };

  const followUpHref = (filter?: FollowUpFilter) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (selectedStatus) params.set("estado", selectedStatus);
    if (selectedSort !== "recientes") params.set("orden", selectedSort);
    if (filter) params.set("seguimiento", filter);
    const search = params.toString();
    return search ? `/admin/leads?${search}` : "/admin/leads";
  };

  const exportParams = new URLSearchParams();
  if (query) exportParams.set("q", query);
  if (selectedStatus) exportParams.set("estado", selectedStatus);
  if (selectedFollowUp) exportParams.set("seguimiento", selectedFollowUp);
  const exportHref = `/api/admin/leads/export${
    exportParams.toString() ? `?${exportParams.toString()}` : ""
  }`;
  const hasActiveFilters = Boolean(
    query || selectedStatus || selectedFollowUp || selectedSort !== "recientes",
  );

  const followUpStats = [
    {
      value: "vencidos" as const,
      count: overdueFollowUpCount,
      label: "Seguimientos vencidos",
      description: "La próxima acción ya necesita atención",
    },
    {
      value: "sin-responsable" as const,
      count: unassignedCount,
      label: "Sin responsable",
      description: "Oportunidades abiertas sin asignación",
    },
    {
      value: "sin-contactar" as const,
      count: staleNewCount,
      label: "Nuevas sin contacto",
      description: "Mas de 48 h sin actividad",
    },
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

      <div className="premium-card p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-bronze">
              CRM inicial
            </p>
            <h2 className="font-serif text-4xl text-ink">Consultas recibidas</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-ink/75">
              {canContact
                ? "Filtrá consultas, revisá prioridad comercial y contactá por WhatsApp o email sin salir del panel."
                : "Revisá el estado de las consultas con los datos personales y comerciales protegidos."}
            </p>
            <p className="mt-3 inline-flex min-h-9 items-center border border-ink/10 bg-mist px-3 text-xs font-semibold text-ink/70">
              Acceso: {roleLabels[session.user.role]} · {canManage
                ? "gestión comercial completa"
                : "consulta sin edición ni datos personales"}
            </p>
          </div>
          {canManage ? (
            <a
              href={exportHref}
              className="inline-flex h-12 items-center justify-center gap-2 border border-ink/15 px-5 text-sm font-semibold text-ink transition hover:border-bronze hover:text-bronze"
            >
              <Download className="size-4" />
              Exportar CSV
            </a>
          ) : (
            <p className="border border-ink/10 bg-mist px-4 py-3 text-sm font-medium text-ink/70">
              Modo lectura: tu rol permite revisar consultas sin editar estados.
            </p>
          )}
        </div>

        {canManage ? (
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {followUpStats.map((item) => (
              <Link
                key={item.value}
                href={followUpHref(item.value)}
                className={`group border p-4 transition hover:-translate-y-0.5 hover:border-bronze hover:bg-bronze-light/20 ${
                  selectedFollowUp === item.value
                    ? "border-bronze bg-bronze-light/25"
                    : "border-ink/10 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-bronze">
                      Seguimiento
                    </p>
                    <h3 className="mt-2 font-serif text-2xl text-ink">
                      {item.label}
                    </h3>
                  </div>
                  <span className="inline-flex size-10 items-center justify-center border border-ink/10 bg-paper text-sm font-semibold text-ink transition group-hover:border-bronze">
                    {item.count}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-ink/70">
                  {item.description}
                </p>
              </Link>
            ))}
          </div>
        ) : null}

        <form className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(18rem,1fr)_210px_220px_auto]">
          <label className="sr-only" htmlFor="lead-search">
            Buscar consultas
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink/45" />
            <input
              id="lead-search"
              name="q"
              defaultValue={query || ""}
              placeholder={
                canViewContactData
                  ? "Buscar por nombre, zona, teléfono o proyecto"
                  : "Buscar por proyecto u origen"
              }
              className="h-12 w-full border border-ink/12 bg-white pl-11 pr-4 text-sm text-ink outline-none transition hover:border-ink/25 focus:border-bronze focus:ring-2 focus:ring-bronze/20"
            />
          </div>
          <label className="sr-only" htmlFor="lead-status">
            Filtrar por estado
          </label>
          <select
            id="lead-status"
            name="estado"
            defaultValue={selectedStatus}
            className="h-12 border border-ink/12 bg-white px-4 text-sm text-ink outline-none transition hover:border-ink/25 focus:border-bronze focus:ring-2 focus:ring-bronze/20"
          >
            <option value="">Todos los estados</option>
            {leadStatusOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="lead-sort">
            Ordenar consultas
          </label>
          <div className="relative">
            <SlidersHorizontal className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink/45" />
            <select
              id="lead-sort"
              name="orden"
              defaultValue={selectedSort}
              className="h-12 w-full appearance-none border border-ink/12 bg-white pl-11 pr-4 text-sm text-ink outline-none transition hover:border-ink/25 focus:border-bronze focus:ring-2 focus:ring-bronze/20"
            >
              {leadSortOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          {selectedFollowUp ? (
            <input type="hidden" name="seguimiento" value={selectedFollowUp} />
          ) : null}
          <button
            type="submit"
            className="h-12 bg-ink px-6 text-sm font-semibold text-paper transition hover:-translate-y-0.5 hover:bg-bronze"
          >
            Filtrar
          </button>
        </form>

        {hasActiveFilters ? (
          <div className="mt-4 flex flex-col justify-between gap-3 border border-ink/10 bg-mist px-4 py-3 sm:flex-row sm:items-center">
            <p className="text-xs font-medium leading-5 text-ink/65">
              Vista filtrada: {filteredCount} de {totalCount} consultas.
            </p>
            <Link
              href="/admin/leads"
              className="text-xs font-semibold text-bronze underline decoration-bronze/45 underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze"
            >
              Limpiar búsqueda y filtros
            </Link>
          </div>
        ) : null}

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {canManage ? (
            <>
              <Link
                href={followUpHref()}
                className={`shrink-0 border px-3 py-2 text-xs font-semibold transition hover:border-bronze ${
                  selectedFollowUp
                    ? "border-ink/10 bg-white text-ink"
                    : "border-bronze bg-bronze-light text-ink"
                }`}
              >
                Seguimiento: todos
              </Link>
              {followUpFilters.map((item) => (
                <Link
                  key={item.value}
                  href={followUpHref(item.value)}
                  title={item.description}
                  className={`shrink-0 border px-3 py-2 text-xs font-semibold transition hover:border-bronze ${
                    selectedFollowUp === item.value
                      ? "border-bronze bg-bronze-light text-ink"
                      : "border-ink/10 bg-white text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </>
          ) : null}
          <Link
            href={statusHref()}
            className={`shrink-0 border px-3 py-2 text-xs font-semibold transition hover:border-bronze ${
              selectedStatus ? "border-ink/10 bg-white text-ink" : "border-ink bg-ink text-paper"
            }`}
          >
            Todos
          </Link>
          {leadStatusOptions.map((item) => (
            <Link
              key={item.value}
              href={statusHref(item.value)}
              className={`shrink-0 border px-3 py-2 text-xs font-semibold transition hover:border-bronze ${
                selectedStatus === item.value
                  ? "border-ink bg-ink text-paper"
                  : "border-ink/10 bg-white text-ink"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {leads.length ? (
          <>
            <div className="mt-6 grid gap-3 lg:hidden">
              {leads.map((lead) => {
                const sensitiveLead = canViewContactData ? lead : null;
                const priority = sensitiveLead
                  ? getLeadPriority(sensitiveLead)
                  : null;
                const reading = sensitiveLead
                  ? getLeadCommercialReading(sensitiveLead)
                  : null;
                const followUpFlags = sensitiveLead
                  ? getLeadFollowUpFlags(sensitiveLead, staleSince, snapshotAt)
                  : [];
                const contactEmail = sensitiveLead
                  ? sensitiveLead.email
                  : "Email reservado";
                const contactPhone = sensitiveLead
                  ? sensitiveLead.phone
                  : "WhatsApp reservado";
                const displayName = sensitiveLead
                  ? sensitiveLead.name
                  : `Consulta ${lead.id.slice(-6).toUpperCase()}`;
                const displayMessage = sensitiveLead
                  ? sensitiveLead.message
                  : "Detalle reservado para Admin.";
                const displayCity = sensitiveLead
                  ? sensitiveLead.city
                  : "Zona reservada";
                const isUnread =
                  !leadNotificationsReadAt ||
                  lead.createdAt > leadNotificationsReadAt;

                return (
                  <article
                    key={lead.id}
                    className={`border bg-white p-4 ${
                      isUnread ? "border-bronze/55" : "border-ink/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/admin/leads/${lead.id}`}
                            className="font-semibold text-ink underline decoration-bronze underline-offset-4"
                          >
                            {displayName}
                          </Link>
                          <AdminUnreadLeadBadge
                            createdAt={lead.createdAt.toISOString()}
                            initialReadAt={leadNotificationsReadAt?.toISOString() ?? null}
                          />
                        </div>
                        <p className="mt-1 break-words text-sm text-ink/70">
                          {contactEmail}
                        </p>
                        <p className="text-sm text-ink/70">{contactPhone}</p>
                      </div>
                      <span
                        className={`shrink-0 px-2.5 py-1 text-[11px] font-semibold ${leadStatusClassNames[lead.status]}`}
                      >
                        {lead.status === "NEW"
                          ? "Sin contactar"
                          : leadStatusLabels[lead.status]}
                      </span>
                    </div>

                    {followUpFlags.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {followUpFlags.map((flag) => (
                          <span
                            key={flag}
                            className="inline-flex items-center gap-1 border border-bronze/25 bg-bronze-light/30 px-2.5 py-1 text-[11px] font-semibold text-ink"
                          >
                            <BellDot className="size-3 text-bronze" />
                            {flag}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {sensitiveLead?.estimate ? (
                      <p className="mt-3 inline-flex border border-olive/25 bg-olive/10 px-2.5 py-1 text-[11px] font-semibold text-olive">
                        Estimación {formatUsd(sensitiveLead.estimate.totalMinUsd)}–{formatUsd(sensitiveLead.estimate.totalMaxUsd)}
                      </p>
                    ) : null}

                    <div className="mt-4 grid gap-3 border-t border-ink/10 pt-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-bronze">
                          Proyecto
                        </p>
                        <p className="mt-1 text-sm font-medium text-ink">
                          {lead.projectType}
                        </p>
                        <p className="mt-1 line-clamp-3 text-sm leading-6 text-ink/72">
                          {displayMessage}
                        </p>
                        {sensitiveLead?.referenceLinks ? (
                          <p className="mt-2 line-clamp-2 text-xs leading-5 text-ink/60">
                            Referencias: {sensitiveLead.referenceLinks}
                          </p>
                        ) : null}
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs text-ink/70">
                        <div>
                          <p className="font-semibold uppercase tracking-[0.12em] text-ink/45">
                            Zona
                          </p>
                          <p className="mt-1">{displayCity}</p>
                        </div>
                        <div>
                          <p className="font-semibold uppercase tracking-[0.12em] text-ink/45">
                            Fecha
                          </p>
                          <p className="mt-1">{formatDate(lead.createdAt)}</p>
                        </div>
                        <div>
                          <p className="font-semibold uppercase tracking-[0.12em] text-ink/45">
                            Responsable
                          </p>
                          <p className="mt-1">
                            {lead.assignedUser?.name ||
                              lead.assignedUser?.email ||
                              "Sin asignar"}
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold uppercase tracking-[0.12em] text-ink/45">
                            Próxima acción
                          </p>
                          <p className="mt-1">
                            {lead.nextFollowUpAt
                              ? formatDate(lead.nextFollowUpAt)
                              : "Sin fecha"}
                          </p>
                        </div>
                        {priority ? (
                          <div>
                            <p className="font-semibold uppercase tracking-[0.12em] text-ink/45">
                              Prioridad
                            </p>
                            <span
                              className={`mt-1 inline-flex px-2.5 py-1 text-[11px] font-semibold ${priority.className}`}
                            >
                              {priority.label} · {priority.score}
                            </span>
                          </div>
                        ) : null}
                        <div>
                          <p className="font-semibold uppercase tracking-[0.12em] text-ink/45">
                            Presupuesto
                          </p>
                          <p className="mt-1">
                            {sensitiveLead
                              ? sensitiveLead.budgetRange || "A definir"
                              : "Información reservada"}
                          </p>
                        </div>
                      </div>

                      {reading ? (
                        <div className="border-t border-ink/10 pt-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-bronze">
                            Lectura comercial
                          </p>
                          <p className="mt-1 text-sm font-medium text-ink">
                            {reading.summary}
                          </p>
                          <ul className="mt-2 grid gap-1 text-xs leading-5 text-ink/65">
                            {reading.reasons.slice(0, 2).map((reason) => (
                              <li key={reason}>- {reason}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {canManage ? (
                        <div>
                          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-bronze">
                            Cambiar estado
                          </label>
                          <LeadStatusSelect
                            leadId={lead.id}
                            initialStatus={lead.status}
                          />
                        </div>
                      ) : null}

                      {canContact && sensitiveLead ? (
                        <div className="flex flex-wrap items-start gap-2">
                          <LeadContactLink
                            channel="WHATSAPP"
                            leadId={lead.id}
                            href={buildLeadWhatsAppUrl(sensitiveLead)}
                            className="inline-flex h-11 flex-1 items-center justify-center gap-2 bg-olive px-3 text-xs font-semibold text-paper transition hover:-translate-y-0.5 hover:bg-ink"
                          >
                            <MessageCircle className="size-4" />
                            WhatsApp
                          </LeadContactLink>
                          <LeadListActions
                            emailHref={buildLeadMailtoUrl(sensitiveLead)}
                            leadId={lead.id}
                            leadLabel={displayName}
                            whatsappHref={buildLeadWhatsAppUrl(sensitiveLead)}
                          />
                        </div>
                      ) : (
                        <p className="border border-ink/10 bg-mist px-3 py-2 text-xs font-medium text-ink/65">
                          Datos de contacto reservados para Admin.
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-6 hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1020px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-xs uppercase tracking-[0.14em] text-ink/75">
                  <th className="py-3 pr-4">Consulta</th>
                  <th className="py-3 pr-4">Proyecto</th>
                  {canManage ? (
                    <th className="py-3 pr-4">Prioridad</th>
                  ) : null}
                  <th className="py-3 pr-4">Origen</th>
                  <th className="py-3 pr-4">Estado</th>
                  <th className="py-3 pr-4">Acciones</th>
                  <th className="py-3 pr-4">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {leads.map((lead) => {
                  const sensitiveLead = canViewContactData ? lead : null;
                  const priority = sensitiveLead
                    ? getLeadPriority(sensitiveLead)
                    : null;
                  const reading = sensitiveLead
                    ? getLeadCommercialReading(sensitiveLead)
                    : null;
                  const followUpFlags = sensitiveLead
                    ? getLeadFollowUpFlags(sensitiveLead, staleSince, snapshotAt)
                    : [];
                  const contactEmail = sensitiveLead
                    ? sensitiveLead.email
                    : "Email reservado";
                  const contactPhone = sensitiveLead
                    ? sensitiveLead.phone
                    : "WhatsApp reservado";
                  const displayName = sensitiveLead
                    ? sensitiveLead.name
                    : `Consulta ${lead.id.slice(-6).toUpperCase()}`;
                  const displayMessage = sensitiveLead
                    ? sensitiveLead.message
                    : "Detalle reservado para Admin.";
                  const displayCity = sensitiveLead
                    ? sensitiveLead.city
                    : "Zona reservada";
                  const isUnread =
                    !leadNotificationsReadAt ||
                    lead.createdAt > leadNotificationsReadAt;

                  return (
                    <tr
                      key={lead.id}
                      className={`align-top transition hover:bg-mist/70 ${
                        isUnread ? "bg-bronze-light/8" : ""
                      }`}
                    >
                      <td className="py-4 pr-4">
                        <div className="flex max-w-[220px] flex-wrap items-center gap-2">
                          <Link
                            href={`/admin/leads/${lead.id}`}
                            className="font-semibold text-ink underline decoration-bronze underline-offset-4"
                          >
                            {displayName}
                          </Link>
                          <AdminUnreadLeadBadge
                            createdAt={lead.createdAt.toISOString()}
                            initialReadAt={leadNotificationsReadAt?.toISOString() ?? null}
                          />
                        </div>
                        <p className="text-ink/75">{contactEmail}</p>
                        <p className="text-ink/75">{contactPhone}</p>
                        <p className="text-ink/75">{displayCity}</p>
                        <p className="mt-2 text-xs font-medium text-ink/65">
                          Responsable: {lead.assignedUser?.name || lead.assignedUser?.email || "Sin asignar"}
                        </p>
                        <p className="text-xs text-ink/65">
                          Próxima acción: {lead.nextFollowUpAt ? formatDate(lead.nextFollowUpAt) : "Sin fecha"}
                        </p>
                        {followUpFlags.length ? (
                          <div className="mt-3 flex max-w-[220px] flex-wrap gap-1.5">
                            {followUpFlags.map((flag) => (
                              <span
                                key={flag}
                                className="inline-flex items-center gap-1 border border-bronze/25 bg-bronze-light/30 px-2 py-1 text-[11px] font-semibold text-ink"
                              >
                                <BellDot className="size-3 text-bronze" />
                                {flag}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-4 pr-4">
                        <p className="font-medium text-ink">{lead.projectType}</p>
                        <p className="line-clamp-2 max-w-sm text-ink/75">
                          {displayMessage}
                        </p>
                        {sensitiveLead?.referenceLinks ? (
                          <p className="mt-2 line-clamp-2 max-w-sm text-xs leading-5 text-ink/60">
                            Referencias: {sensitiveLead.referenceLinks}
                          </p>
                        ) : null}
                        {sensitiveLead ? (
                          <p className="mt-2 text-xs text-ink/75">
                            Visita: {sensitiveLead.needsVisit ? "Sí" : "No"} · Planos/fotos:{" "}
                            {sensitiveLead.hasPlans ? "Sí" : "No"}
                          </p>
                        ) : null}
                      </td>
                      {priority && reading ? (
                        <td className="py-4 pr-4">
                          <span
                            className={`inline-flex px-3 py-1 text-xs font-semibold ${priority.className}`}
                          >
                            {priority.label} · {priority.score}
                          </span>
                          <p className="mt-2 max-w-[190px] text-xs font-medium text-ink">
                            {reading.summary}
                          </p>
                          <ul className="mt-2 grid max-w-[220px] gap-1 text-xs leading-5 text-ink/65">
                            {reading.reasons.slice(0, 2).map((reason) => (
                              <li key={reason}>- {reason}</li>
                            ))}
                          </ul>
                        </td>
                      ) : null}
                      <td className="py-4 pr-4 text-ink/75">{lead.sourcePage}</td>
                      <td className="py-4 pr-4">
                        <div className="mb-2">
                          <span
                            className={`inline-flex px-3 py-1 text-xs font-semibold ${leadStatusClassNames[lead.status]}`}
                          >
                            {lead.status === "NEW"
                              ? "Sin contactar"
                              : leadStatusLabels[lead.status]}
                          </span>
                        </div>
                        {canManage ? (
                          <LeadStatusSelect
                            leadId={lead.id}
                            initialStatus={lead.status}
                          />
                        ) : null}
                      </td>
                      <td className="py-4 pr-4">
                        <LeadListActions
                          emailHref={
                            canContact && sensitiveLead
                              ? buildLeadMailtoUrl(sensitiveLead)
                              : undefined
                          }
                          leadId={lead.id}
                          leadLabel={displayName}
                          whatsappHref={
                            canContact && sensitiveLead
                              ? buildLeadWhatsAppUrl(sensitiveLead)
                              : undefined
                          }
                        />
                      </td>
                      <td className="py-4 pr-4 text-ink/75">
                        {formatDate(lead.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              </table>
            </div>
            <AdminPaginationControls
              currentPage={currentPage}
              itemLabel="consultas"
              pageHref={pageHref}
              totalPages={totalPages}
              totalResults={filteredCount}
            />
          </>
        ) : (
          <div className="mt-6 border border-dashed border-ink/20 p-10 text-center">
            <h3 className="font-serif text-3xl text-ink">
              No encontramos consultas con esos filtros.
            </h3>
            <p className="mt-2 text-sm text-ink/75">
              Probá con otro estado, ciudad, teléfono o tipo de proyecto.
            </p>
            {hasActiveFilters ? (
              <Link
                href="/admin/leads"
                className="mt-5 inline-flex min-h-11 items-center justify-center border border-ink/15 px-5 text-sm font-semibold text-ink transition hover:border-bronze hover:text-bronze focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze"
              >
                Ver todas las consultas
              </Link>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

function isLeadStatus(value?: string): value is LeadStatus {
  return Boolean(value && value in leadStatusLabels);
}

function isFollowUpFilter(value?: string): value is FollowUpFilter {
  return Boolean(value && followUpFilters.some((item) => item.value === value));
}

function isLeadSort(value?: string): value is LeadSort {
  return Boolean(value && leadSortOptions.some((item) => item.value === value));
}

function getFollowUpWhere(
  filter: FollowUpFilter | "",
  staleSince: Date,
  snapshotAt: Date,
  currentUserId: string,
): Prisma.LeadWhereInput | null {
  const openStatuses: LeadStatus[] = ["NEW", "CONTACTED", "QUALIFIED", "QUOTED"];

  if (filter === "vencidos") {
    return {
      nextFollowUpAt: { lte: snapshotAt },
      status: { in: openStatuses },
    };
  }

  if (filter === "mios") {
    return {
      assignedUserId: currentUserId,
      status: { in: openStatuses },
    };
  }

  if (filter === "sin-responsable") {
    return {
      assignedUserId: null,
      status: { in: openStatuses },
    };
  }

  if (filter === "sin-notas") {
    return { notes: { none: {} } };
  }

  if (filter === "reconsultas") {
    return { possibleDuplicateOfId: { not: null } };
  }

  if (filter === "sin-contactar") {
    return {
      ...buildLeadInactivityWhere(staleSince),
      status: "NEW",
    };
  }

  return null;
}

function getLeadFollowUpFlags(
  lead: {
    createdAt: Date;
    lastActivityAt: Date;
    possibleDuplicateOfId: string | null;
    assignedUserId: string | null;
    nextFollowUpAt: Date | null;
    status: LeadStatus;
    notes: Array<{ body: string }>;
    _count: { notes: number };
  },
  staleSince: Date,
  snapshotAt: Date,
) {
  const flags: string[] = [];

  if (lead.status === "NEW" && lead.lastActivityAt <= staleSince) {
    flags.push("Sin contacto 48 h");
  }

  if (lead._count.notes === 0) {
    flags.push("Sin notas");
  }

  if (lead.possibleDuplicateOfId) {
    flags.push("Posible reconsulta");
  }

  if (
    lead.nextFollowUpAt &&
    lead.nextFollowUpAt <= snapshotAt &&
    !["WON", "LOST"].includes(lead.status)
  ) {
    flags.unshift("Seguimiento vencido");
  }

  if (!lead.assignedUserId && !["WON", "LOST"].includes(lead.status)) {
    flags.push("Sin responsable");
  }

  return flags;
}
