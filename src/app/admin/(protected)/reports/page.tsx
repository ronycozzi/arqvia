import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { LeadStatus, Prisma } from "@prisma/client";
import { ArrowUpRight, Download, TrendingUp } from "lucide-react";
import { commercialManagerRoles, getVerifiedAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { formatUsd } from "@/lib/estimator";
import { buildLeadInactivityWhere } from "@/lib/lead-activity";
import { summarizeLeadCommercialReport } from "@/lib/lead-reporting";
import {
  leadStatusClassNames,
  leadStatusLabels,
  leadStatusOptions,
} from "@/lib/lead-utils";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Reportes",
  robots: { index: false, follow: false },
};

const reportWindowOptions = [7, 30, 90] as const;
const defaultReportWindowDays = 30;

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string; estado?: string }>;
}) {
  const session = await getVerifiedAdminSession(commercialManagerRoles);
  if (!session) redirect("/admin");

  const { dias, estado } = await searchParams;
  const parsedDays = Number(dias);
  const reportWindowDays = reportWindowOptions.includes(
    parsedDays as (typeof reportWindowOptions)[number],
  )
    ? parsedDays
    : defaultReportWindowDays;
  const selectedStatus = isLeadStatus(estado) ? estado : "";

  const reportGeneratedAt = new Date();
  const since = new Date(reportGeneratedAt);
  since.setDate(since.getDate() - reportWindowDays);
  const reportWhere: Prisma.LeadWhereInput = {
    createdAt: { gte: since, lte: reportGeneratedAt },
    ...(selectedStatus ? { status: selectedStatus } : {}),
  };
  const statusWhere: Prisma.LeadWhereInput = {
    createdAt: { gte: since, lte: reportGeneratedAt },
  };
  const openCommercialStatuses: LeadStatus[] = [
    "NEW",
    "CONTACTED",
    "QUALIFIED",
    "QUOTED",
  ];
  const openReportWhere: Prisma.LeadWhereInput = {
    AND: [reportWhere, { status: { in: openCommercialStatuses } }],
  };

  const staleSince = new Date();
  staleSince.setDate(staleSince.getDate() - 3);

  const [
    totalLeads,
    attentionLeads,
    leadsByStatus,
    leadsByProjectType,
    leadsByCity,
    leadsByBudget,
    leadsBySource,
    wonCount,
    qualifiedCount,
    quotedCount,
    historicalLeads,
    periodLeads,
    commercialSummary,
    commercialValues,
    overdueFollowUpCount,
  ] = await Promise.all([
    prisma.lead.count({ where: reportWhere }),
    prisma.lead.findMany({
      where: {
        AND: [openReportWhere, buildLeadInactivityWhere(staleSince)],
      },
      orderBy: { lastActivityAt: "asc" },
      take: 5,
    }),
    prisma.lead.groupBy({
      by: ["status"],
      where: statusWhere,
      _count: { _all: true },
      orderBy: { status: "asc" },
    }),
    groupLeadsBy("projectType", reportWhere),
    groupLeadsBy("city", reportWhere),
    groupLeadsBy("budgetRange", reportWhere),
    groupLeadsBy("sourcePage", reportWhere),
    prisma.lead.count({ where: { ...reportWhere, status: "WON" } }),
    prisma.lead.count({ where: { ...reportWhere, status: "QUALIFIED" } }),
    prisma.lead.count({ where: { ...reportWhere, status: "QUOTED" } }),
    prisma.lead.count(),
    prisma.lead.count({ where: statusWhere }),
    summarizeLeadCommercialReport({
      where: openReportWhere,
      fetchPage: (args) => prisma.lead.findMany(args),
    }),
    prisma.lead.aggregate({
      where: reportWhere,
      _sum: { quotedAmountUsd: true, wonAmountUsd: true },
    }),
    prisma.lead.count({
      where: {
        AND: [
          openReportWhere,
          { nextFollowUpAt: { lte: reportGeneratedAt } },
        ],
      },
    }),
  ]);

  const conversionRate = totalLeads ? Math.round((wonCount / totalLeads) * 100) : 0;
  const qualifiedRate = totalLeads
    ? Math.round(((qualifiedCount + quotedCount + wonCount) / totalLeads) * 100)
    : 0;

  const countByStatus = new Map<LeadStatus, number>(
    leadsByStatus.map((item) => [item.status, item._count._all]),
  );
  const statusRows = Object.entries(leadStatusLabels).map(([status, label]) => {
    const typedStatus = status as LeadStatus;
    const value = countByStatus.get(typedStatus) || 0;
    return {
      label,
      status: typedStatus,
      value,
      percent: periodLeads ? Math.round((value / periodLeads) * 100) : 0,
    };
  });

  const topProjectType = leadsByProjectType[0]?.label || "Sin datos";
  const topCity = leadsByCity[0]?.label || "Sin datos";
  const {
    averageScore,
    evaluatedCount,
    highPriorityCount,
    highPriorityLeads: topHighPriorityLeads,
    topReasons: topCommercialReasons,
  } = commercialSummary;
  const filterHref = (days = reportWindowDays, status = selectedStatus) => {
    const params = new URLSearchParams();
    params.set("dias", String(days));
    if (status) params.set("estado", status);
    return `/admin/reports?${params.toString()}`;
  };
  const exportParams = new URLSearchParams();
  exportParams.set("dias", String(reportWindowDays));
  if (selectedStatus) exportParams.set("estado", selectedStatus);
  const exportHref = `/api/admin/leads/export?${exportParams.toString()}`;

  return (
    <section className="grid gap-6">
      <div className="premium-card p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
              Reportes comerciales
            </p>
            <h2 className="mt-2 font-serif text-4xl text-ink">
              Lectura clara de consultas, zonas y oportunidades.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-ink/75">
              Revisá qué servicios generan más interés, de dónde llegan las
              consultas y qué oportunidades necesitan seguimiento comercial.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {reportWindowOptions.map((days) => (
                <Link
                  key={days}
                  href={filterHref(days)}
                  className={`inline-flex h-10 items-center border px-4 text-xs font-semibold transition hover:border-bronze hover:text-bronze ${
                    reportWindowDays === days
                      ? "border-ink bg-ink text-paper"
                      : "border-ink/12 bg-white text-ink"
                  }`}
                >
                  {days} días
                </Link>
              ))}
            </div>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              <Link
                href={filterHref(reportWindowDays, "")}
                className={`shrink-0 border px-3 py-2 text-xs font-semibold transition hover:border-bronze ${
                  selectedStatus
                    ? "border-ink/10 bg-white text-ink"
                    : "border-ink bg-ink text-paper"
                }`}
              >
                Todos los estados
              </Link>
              {leadStatusOptions.map((item) => (
                <Link
                  key={item.value}
                  href={filterHref(reportWindowDays, item.value)}
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
          </div>
          <div className="lg:max-w-64">
            <Link
              href={exportHref}
              className="inline-flex h-12 w-full items-center justify-center gap-2 border border-ink/15 px-5 text-sm font-semibold text-ink transition hover:border-bronze hover:text-bronze"
            >
              <Download className="size-4" />
              Exportar vista
            </Link>
            <p className="mt-2 text-xs leading-5 text-ink/60 lg:text-right">
              CSV completo: {totalLeads}{" "}
              {totalLeads === 1 ? "consulta" : "consultas"}, sin recorte.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Base histórica"
          value={historicalLeads}
          detail="Todas las consultas guardadas"
        />
        <MetricCard
          label={`Vista ${reportWindowDays} días`}
          value={totalLeads}
          detail={selectedStatus ? `Filtrada por ${leadStatusLabels[selectedStatus]}` : "Todos los estados"}
        />
        <MetricCard
          label="Tasa de calificación"
          value={`${qualifiedRate}%`}
          detail="Dentro de la vista actual"
        />
        <MetricCard label="Cierre ganado" value={`${conversionRate}%`} detail="Dentro de la vista actual" />
        <MetricCard
          label="Presupuestado"
          value={formatUsd(commercialValues._sum.quotedAmountUsd || 0)}
          detail="Suma de propuestas registradas en la vista"
        />
        <MetricCard
          label="Valor ganado"
          value={formatUsd(commercialValues._sum.wonAmountUsd || 0)}
          detail={`${overdueFollowUpCount} seguimiento${overdueFollowUpCount === 1 ? "" : "s"} vencido${overdueFollowUpCount === 1 ? "" : "s"}`}
        />
      </div>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="premium-card-dark p-6 text-paper">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze-light">
            Inteligencia comercial
          </p>
          <h3 className="mt-2 font-serif text-3xl">
            Calidad de oportunidades
          </h3>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="border border-paper/12 bg-paper/[0.045] p-4">
              <p className="font-sans text-4xl font-semibold tabular-nums">
                {averageScore}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-paper/62">
                Score promedio
              </p>
            </div>
            <div className="border border-paper/12 bg-paper/[0.045] p-4">
              <p className="font-sans text-4xl font-semibold tabular-nums">
                {highPriorityCount}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-paper/62">
                Prioridad alta
              </p>
            </div>
            <div className="border border-paper/12 bg-paper/[0.045] p-4">
              <p className="font-sans text-4xl font-semibold tabular-nums">
                {evaluatedCount}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-paper/62">
                Evaluadas
              </p>
            </div>
          </div>
          <div className="mt-6 border-t border-paper/12 pt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bronze-light">
              Señales que más se repiten
            </p>
            {topCommercialReasons.length ? (
              <div className="mt-4 grid gap-2">
                {topCommercialReasons.map((reason) => (
                  <div
                    key={reason.label}
                    className="flex items-center justify-between gap-3 border border-paper/10 bg-paper/[0.04] px-3 py-2 text-sm"
                  >
                    <span className="text-paper/78">{reason.label}</span>
                    <span className="font-semibold text-bronze-light">
                      {reason.value}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-paper/68">
                Todavía no hay señales suficientes en esta vista.
              </p>
            )}
          </div>
        </div>

        <div className="premium-card p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
            Prioridad alta
          </p>
          <h3 className="mt-2 font-serif text-3xl text-ink">
            Consultas para responder primero
          </h3>
          <div className="mt-6 grid gap-3">
            {topHighPriorityLeads.length ? (
              topHighPriorityLeads.map(({ lead, reading }) => (
                <Link
                  key={lead.id}
                  href={`/admin/leads/${lead.id}`}
                  className="grid gap-3 border border-ink/10 bg-mist p-4 transition hover:-translate-y-0.5 hover:border-bronze md:grid-cols-[1fr_auto]"
                >
                  <div>
                    <p className="font-semibold text-ink">{lead.name}</p>
                    <p className="mt-1 text-sm text-ink/70">
                      {lead.projectType} · {lead.city}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink/65">
                      {reading.reasons.join(" · ")}
                    </p>
                  </div>
                  <div className="md:text-right">
                    <span
                      className={`inline-flex px-3 py-1 text-xs font-semibold ${reading.className}`}
                    >
                      {reading.label} · {reading.score}
                    </span>
                    <p className="mt-2 text-xs text-ink/60">
                      {lead.budgetRange || "Presupuesto a definir"}
                    </p>
                  </div>
                </Link>
              ))
            ) : (
              <EmptyReport message="No hay consultas de prioridad alta en esta vista." />
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="premium-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
                Embudo
              </p>
              <h3 className="mt-2 font-serif text-3xl text-ink">
                Estado de oportunidades
              </h3>
            </div>
            <TrendingUp className="size-5 text-bronze" />
          </div>
          <div className="mt-6 grid gap-3">
            {statusRows.map((item) => (
              <Link
                key={item.status}
                href={`/admin/leads?estado=${item.status}`}
                className="grid gap-2 border border-ink/10 bg-mist p-4 transition hover:border-bronze"
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`px-3 py-1 text-xs font-semibold ${leadStatusClassNames[item.status]}`}
                  >
                    {item.label}
                  </span>
                  <span className="text-sm font-semibold text-ink">
                    {item.value} · {item.percent}%
                  </span>
                </div>
                <div className="h-2 bg-ink/8">
                  <div
                    className="h-full bg-bronze"
                    style={{ width: `${Math.max(item.percent, item.value ? 4 : 0)}%` }}
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <InsightCard
            title="Servicio con más demanda"
            value={topProjectType}
            href={`/admin/leads?q=${encodeURIComponent(topProjectType)}`}
          />
          <InsightCard
            title="Zona con más consultas"
            value={topCity}
            href={`/admin/leads?q=${encodeURIComponent(topCity)}`}
          />
          <RankedList title="Tipos de proyecto" rows={leadsByProjectType} />
          <RankedList title="Zonas / ciudades" rows={leadsByCity} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <RankedList title="Rangos de presupuesto" rows={leadsByBudget} />
        <RankedList title="Páginas de origen" rows={leadsBySource} />
      </section>

      <section className="premium-card-dark p-6 text-paper">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze-light">
              Seguimiento
            </p>
            <h3 className="mt-2 font-serif text-3xl">
              Consultas que conviene reactivar
            </h3>
          </div>
          <p className="max-w-xl text-sm leading-6 text-paper/68">
            Muestra oportunidades abiertas sin actualización reciente para
            evitar que consultas valiosas se enfríen.
          </p>
        </div>
        {attentionLeads.length ? (
          <div className="mt-6 grid gap-3">
            {attentionLeads.map((lead) => (
              <Link
                key={lead.id}
                href={`/admin/leads/${lead.id}`}
                className="grid gap-2 border border-paper/12 bg-paper/[0.045] p-4 transition hover:-translate-y-0.5 hover:border-bronze-light md:grid-cols-[1fr_auto]"
              >
                <div>
                  <p className="font-semibold text-paper">{lead.name}</p>
                  <p className="mt-1 text-sm text-paper/68">
                    {lead.projectType} · {lead.city}
                  </p>
                </div>
                <div className="text-sm text-paper/68 md:text-right">
                  <span
                    className={`inline-flex px-3 py-1 text-xs font-semibold ${leadStatusClassNames[lead.status]}`}
                  >
                    {leadStatusLabels[lead.status]}
                  </span>
                  <p className="mt-2">
                    Última actividad {formatDate(lead.lastActivityAt)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-6 border border-dashed border-paper/18 p-6 text-sm text-paper/68">
            No hay consultas abiertas vencidas. El seguimiento comercial está al día.
          </div>
        )}
      </section>
    </section>
  );
}

async function groupLeadsBy(
  field: "projectType" | "city" | "budgetRange" | "sourcePage",
  where: Prisma.LeadWhereInput,
) {
  if (field === "projectType") {
    const rows = await prisma.lead.groupBy({
      by: ["projectType"],
      where,
      _count: { _all: true },
      orderBy: [{ _count: { projectType: "desc" } }, { projectType: "asc" }],
      take: 6,
    });
    return toRankedRows(
      rows.map((row) => ({ label: row.projectType, value: row._count._all })),
    );
  }

  if (field === "city") {
    const rows = await prisma.lead.groupBy({
      by: ["city"],
      where,
      _count: { _all: true },
      orderBy: [{ _count: { city: "desc" } }, { city: "asc" }],
      take: 6,
    });
    return toRankedRows(
      rows.map((row) => ({ label: row.city, value: row._count._all })),
    );
  }

  if (field === "budgetRange") {
    const rows = await prisma.lead.groupBy({
      by: ["budgetRange"],
      where,
      _count: { _all: true },
      orderBy: [{ _count: { budgetRange: "desc" } }, { budgetRange: "asc" }],
      take: 6,
    });
    return toRankedRows(
      rows.map((row) => ({ label: row.budgetRange, value: row._count._all })),
    );
  }

  const rows = await prisma.lead.groupBy({
    by: ["sourcePage"],
    where,
    _count: { _all: true },
    orderBy: [{ _count: { sourcePage: "desc" } }, { sourcePage: "asc" }],
    take: 6,
  });
  return toRankedRows(
    rows.map((row) => ({ label: row.sourcePage, value: row._count._all })),
  );
}

function toRankedRows(rows: Array<{ label: string | null; value: number }>) {
  return rows.map((row) => ({
    label: row.label || "Sin especificar",
    value: row.value,
  }));
}

function isLeadStatus(value?: string | null): value is LeadStatus {
  return Boolean(value && value in leadStatusLabels);
}

function MetricCard({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: number | string;
}) {
  return (
    <article className="premium-card p-5">
      <p className="font-sans text-4xl font-semibold tabular-nums text-ink">{value}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{label}</p>
      <p className="mt-2 text-xs leading-5 text-ink/65">{detail}</p>
    </article>
  );
}

function InsightCard({
  href,
  title,
  value,
}: {
  href: string;
  title: string;
  value: string;
}) {
  return (
    <Link
      href={href}
      className="premium-card group p-5 transition hover:-translate-y-0.5 hover:border-bronze"
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bronze">
          {title}
        </p>
        <ArrowUpRight className="size-4 text-ink/40 transition group-hover:text-bronze" />
      </div>
      <p className="mt-4 font-sans text-3xl font-semibold leading-tight tabular-nums text-ink">
        {value}
      </p>
    </Link>
  );
}

function RankedList({
  rows,
  title,
}: {
  rows: { label: string; value: number }[];
  title: string;
}) {
  const max = Math.max(...rows.map((row) => row.value), 1);

  return (
    <article className="premium-card p-5">
      <h3 className="font-serif text-3xl text-ink">{title}</h3>
      <div className="mt-5 grid gap-3">
        {rows.length ? (
          rows.map((row) => (
            <div key={row.label} className="grid gap-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-ink">{row.label}</span>
                <span className="text-ink/65">{row.value}</span>
              </div>
              <div className="h-2 bg-ink/8">
                <div
                  className="h-full bg-bronze"
                  style={{ width: `${Math.max((row.value / max) * 100, 6)}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <EmptyReport message="Sin datos suficientes todavía." />
        )}
      </div>
    </article>
  );
}

function EmptyReport({ message }: { message: string }) {
  return (
    <div className="border border-dashed border-ink/20 p-6 text-sm text-ink/65">
      {message}
    </div>
  );
}
