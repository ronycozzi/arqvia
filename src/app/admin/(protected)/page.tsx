import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  canViewLeadPII,
  requireVerifiedAdminSession,
  type AdminRole,
} from "@/lib/admin-auth";
import {
  adminNavigationGroups,
  canAccessAdminHref as roleCanAccessAdminHref,
  getAdminPermissionHint,
  getVisibleAdminNavigation,
} from "@/lib/admin-navigation";
import { buildAdminReadiness } from "@/lib/admin-readiness";
import { getClientConfig } from "@/lib/client-config";
import { prisma } from "@/lib/db";
import { getInfrastructureReadiness } from "@/lib/infrastructure-readiness";
import { buildLaunchReadiness } from "@/lib/launch-readiness";
import { summarizeLeadCommercialReport } from "@/lib/lead-reporting";
import {
  leadStatusClassNames,
  leadStatusLabels,
} from "@/lib/lead-utils";
import { evaluateProjectQuality } from "@/lib/project-quality";
import { evaluateServiceQuality } from "@/lib/service-quality";
import { getAvailableServiceProjectSlugs } from "@/lib/service-project-mapping";
import { siteConfig } from "@/lib/site-config";
import { formatDate } from "@/lib/utils";
import { AdminUnreadLeadBadge } from "@/components/admin/unread-lead-badge";
import { AdminMobileDisclosure } from "@/components/admin/admin-mobile-disclosure";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

const roleLabels: Record<AdminRole, string> = {
  ADMIN: "Administrador",
  EDITOR: "Editor",
  VIEWER: "Solo lectura",
};

const roleGuidance: Record<AdminRole, string> = {
  ADMIN:
    "Podés operar el CRM, publicar contenido, ajustar configuración y administrar usuarios.",
  EDITOR:
    "Podés publicar y mantener proyectos, servicios, artículos y contenido institucional. La operación comercial queda reservada para Admin.",
  VIEWER:
    "Podés revisar contenido y estado comercial sin editar información sensible ni operar configuración.",
};

const panelLinkClassName =
  "inline-flex min-h-11 items-center justify-center gap-2 border border-ink/12 bg-white/75 px-4 text-sm font-semibold text-ink transition hover:-translate-y-0.5 hover:border-bronze hover:text-bronze focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze";

const darkPanelLinkClassName =
  "inline-flex min-h-11 items-center justify-center gap-2 border border-paper/18 bg-paper/[0.04] px-4 text-sm font-semibold text-paper transition hover:-translate-y-0.5 hover:border-bronze-light hover:text-bronze-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze-light";

type StatTone = "attention" | "neutral" | "positive";

type DashboardStat = {
  description: string;
  href?: string;
  label: string;
  tone?: StatTone;
  value: number;
};

const statToneClassNames: Record<StatTone, string> = {
  attention: "border-bronze/35 bg-bronze-light/18",
  neutral: "border-ink/10 bg-paper",
  positive: "border-olive/25 bg-olive/8",
};

function formatCount(value: number) {
  return new Intl.NumberFormat("es-AR").format(value);
}

function statusTone(ok: boolean) {
  return ok
    ? "border-olive/20 bg-olive/10 text-olive"
    : "border-bronze/25 bg-bronze-light/25 text-ink";
}

export default async function AdminPage() {
  const session = await requireVerifiedAdminSession();
  const role = session.user.role;
  const canSeeLeadPII = canViewLeadPII(role);
  const leadNotificationsReadAt = session.user.leadNotificationsReadAt;
  const publicNow = new Date();
  const [
    leadCount,
    projectCount,
    serviceCount,
    blogCount,
    faqCount,
    testimonialCount,
    teamCount,
    areaCount,
    projectCategoryCount,
    serviceCategoryCount,
    userCount,
    leadStatusRows,
    overdueFollowUpCount,
    unassignedLeadCount,
    recentLeads,
    priorityLeadRows,
    projectQualityRows,
    serviceQualityRows,
    legalPageCount,
    homeContentCount,
    institutionalPageCount,
    config,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.project.count({
      where: { publicationStatus: "PUBLISHED", publishedAt: { lte: publicNow } },
    }),
    prisma.service.count({
      where: { publicationStatus: "PUBLISHED", publishedAt: { lte: publicNow } },
    }),
    prisma.blogPost.count({
      where: { status: "PUBLISHED", publishedAt: { lte: publicNow } },
    }),
    prisma.faq.count({ where: { active: true } }),
    prisma.testimonial.count({ where: { featured: true } }),
    prisma.teamMember.count({ where: { active: true } }),
    prisma.area.count({ where: { active: true } }),
    prisma.projectCategory.count(),
    prisma.serviceCategory.count(),
    prisma.user.count({ where: { active: true } }),
    prisma.lead.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.lead.count({
      where: {
        nextFollowUpAt: { lte: publicNow },
        status: { in: ["NEW", "CONTACTED", "QUALIFIED", "QUOTED"] },
      },
    }),
    prisma.lead.count({
      where: {
        assignedUserId: null,
        status: { in: ["NEW", "CONTACTED", "QUALIFIED", "QUOTED"] },
      },
    }),
    prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        city: true,
        createdAt: true,
        id: true,
        name: true,
        projectType: true,
        status: true,
      },
    }),
    role === "ADMIN"
      ? summarizeLeadCommercialReport({
          where: {
            status: { in: ["NEW", "CONTACTED", "QUALIFIED", "QUOTED"] },
          },
          fetchPage: (args) => prisma.lead.findMany(args),
        })
      : Promise.resolve({
          averageScore: 0,
          evaluatedCount: 0,
          highPriorityCount: 0,
          highPriorityLeads: [],
          topReasons: [],
        }),
    prisma.project.findMany({
      where: { publicationStatus: "PUBLISHED", publishedAt: { lte: publicNow } },
      include: {
        category: true,
        images: { select: { altText: true, caption: true, type: true } },
      },
    }),
    prisma.service.findMany({
      where: { publicationStatus: "PUBLISHED", publishedAt: { lte: publicNow } },
      include: {
        category: true,
        _count: { select: { faqs: true, projects: true } },
        projects: {
          where: {
            publicationStatus: "PUBLISHED",
            publishedAt: { lte: publicNow },
          },
          select: { slug: true },
        },
      },
    }),
    prisma.legalPage.count({ where: { status: "PUBLISHED" } }),
    prisma.homeContent.count(),
    prisma.institutionalPage.count(),
    getClientConfig(),
  ]);

  const leadCountsByStatus = new Map(
    leadStatusRows.map((row) => [row.status, row._count._all]),
  );
  const newCount = leadCountsByStatus.get("NEW") ?? 0;
  const contactedCount = leadCountsByStatus.get("CONTACTED") ?? 0;
  const quotedCount = leadCountsByStatus.get("QUOTED") ?? 0;
  const wonCount = leadCountsByStatus.get("WON") ?? 0;

  const projectQuality = projectQualityRows.map((project) =>
    evaluateProjectQuality({
      ...project,
      categoryName: project.category.name,
    }),
  );
  const readyProjects = projectQuality.filter(
    (item) => item.status === "strong",
  ).length;
  const reviewProjects = projectQuality.length - readyProjects;
  const availableProjectSlugs = projectQualityRows.map((project) => project.slug);
  const serviceQuality = serviceQualityRows.map((service) =>
    evaluateServiceQuality({
      ...service,
      categoryName: service.category.name,
      faqCount: service._count.faqs,
      projectCount: getAvailableServiceProjectSlugs({
        availableProjectSlugs,
        directProjectSlugs: service.projects.map((project) => project.slug),
        serviceSlug: service.slug,
      }).length,
    }),
  );
  const readyServices = serviceQuality.filter(
    (item) => item.status === "strong",
  ).length;
  const reviewServices = serviceQuality.length - readyServices;

  const crmStats: DashboardStat[] = role === "ADMIN" ? [
    {
      description: "Total recibido desde formularios públicos.",
      href: "/admin/leads",
      label: "Consultas guardadas",
      tone: newCount > 0 ? "attention" : "neutral",
      value: leadCount,
    },
    {
      description: "Esperan primer contacto o clasificación.",
      href: "/admin/leads?estado=NEW",
      label: "Nuevas",
      tone: newCount > 0 ? "attention" : "positive",
      value: newCount,
    },
    {
      description: "Próximas acciones que ya requieren atención.",
      href: "/admin/leads?seguimiento=vencidos",
      label: "Seguimientos vencidos",
      tone: overdueFollowUpCount > 0 ? "attention" : "positive",
      value: overdueFollowUpCount,
    },
    {
      description: "Oportunidades abiertas todavía sin asignación.",
      href: "/admin/leads?seguimiento=sin-responsable",
      label: "Sin responsable",
      tone: unassignedLeadCount > 0 ? "attention" : "positive",
      value: unassignedLeadCount,
    },
    {
      description: "Tienen propuesta enviada.",
      href: "/admin/leads?estado=QUOTED",
      label: "Presupuestadas",
      value: quotedCount,
    },
    {
      description: "Oportunidades cerradas a favor de Arqvia.",
      href: "/admin/leads?estado=WON",
      label: "Ganadas",
      tone: wonCount > 0 ? "positive" : "neutral",
      value: wonCount,
    },
  ] : [
    {
      description: "Total recibido desde formularios públicos.",
      href: "/admin/leads",
      label: "Consultas guardadas",
      value: leadCount,
    },
    {
      description: "Esperan primer contacto o clasificación.",
      href: "/admin/leads?estado=NEW",
      label: "Nuevas",
      value: newCount,
    },
    {
      description: "Ya recibieron respuesta inicial.",
      href: "/admin/leads?estado=CONTACTED",
      label: "Contactadas",
      value: contactedCount,
    },
    {
      description: "Tienen propuesta enviada.",
      href: "/admin/leads?estado=QUOTED",
      label: "Presupuestadas",
      value: quotedCount,
    },
  ];

  const contentStats: DashboardStat[] = [
    {
      description: "Nosotros y Proceso administrados desde el panel.",
      href: "/admin/pages",
      label: "Páginas institucionales",
      tone: institutionalPageCount === 2 ? "positive" : "attention",
      value: institutionalPageCount,
    },
    {
      description: `${reviewProjects} necesitan mejora de evidencia, SEO o galería.`,
      href: "/admin/projects",
      label: "Casos listos",
      tone: reviewProjects > 0 ? "attention" : "positive",
      value: readyProjects,
    },
    {
      description: `${reviewServices} necesitan copy, FAQ o prueba comercial.`,
      href: "/admin/services",
      label: "Servicios listos",
      tone: reviewServices > 0 ? "attention" : "positive",
      value: readyServices,
    },
    {
      description: "Guías publicadas para búsquedas informativas.",
      href: "/admin/blog",
      label: "Guías",
      value: blogCount,
    },
    {
      description: "Preguntas visibles para reducir objeciones.",
      href: "/admin/faq",
      label: "FAQ",
      value: faqCount,
    },
  ];

  const proofStats: DashboardStat[] = [
    ...(role === "ADMIN"
      ? [
          {
            description: "Documentos institucionales revisados y publicados.",
            href: "/admin/legal",
            label: "Legales publicados",
            tone: legalPageCount === 4 ? ("positive" as const) : ("attention" as const),
            value: legalPageCount,
          },
        ]
      : []),
    {
      description: "Testimonios visibles como prueba social.",
      href: "/admin/testimonials",
      label: "Testimonios",
      value: testimonialCount,
    },
    {
      description: "Perfiles activos publicados en el sitio.",
      href: "/admin/team",
      label: "Equipo visible",
      value: teamCount,
    },
    {
      description: "Zonas activas para SEO local.",
      href: "/admin/areas",
      label: "Áreas publicadas",
      value: areaCount,
    },
    {
      description: "Categorías de proyectos y servicios.",
      href: "/admin/categories",
      label: "Categorías",
      value: projectCategoryCount + serviceCategoryCount,
    },
  ];

  const pipeline = [
    { label: "Nuevas", value: newCount, status: "NEW" as const },
    { label: "Contactadas", value: contactedCount, status: "CONTACTED" as const },
    { label: "Presupuestadas", value: quotedCount, status: "QUOTED" as const },
    { label: "Ganadas", value: wonCount, status: "WON" as const },
  ];
  const priorityLeads = priorityLeadRows.highPriorityLeads.slice(0, 4);
  const readiness = buildAdminReadiness({
    areaCount,
    blogCount,
    contactedCount,
    faqCount,
    leadCount,
    newCount,
    projectCount,
    quotedCount,
    readyProjects,
    readyServices,
    reviewProjects,
    reviewServices,
    serviceCount,
    teamCount,
    testimonialCount,
    userCount,
    wonCount,
  });
  const infrastructure = getInfrastructureReadiness();
  const launchReadiness = buildLaunchReadiness({
    config,
    ...infrastructure,
    homeContentReady: homeContentCount === 1,
    institutionalPagesReady: institutionalPageCount === 2,
    legalPagesReady: legalPageCount === 4,
    siteUrl: siteConfig.url,
    strictPublicUrlEnabled: process.env.ARQVIA_STRICT_PUBLIC_URL === "true",
  });
  const visibleNavigation = getVisibleAdminNavigation(role);
  const visibleModules = visibleNavigation.filter(
    (module) => module.href !== "/admin",
  );
  const visibleModuleGroups = adminNavigationGroups
    .map((group) => ({
      group,
      modules: visibleModules.filter((module) => module.group === group),
    }))
    .filter((entry) => entry.modules.length > 0);
  const canAccessAdminHref = (href: string) =>
    roleCanAccessAdminHref(href, role);
  const visibleNextActions = readiness.nextActions.filter((item) =>
    canAccessAdminHref(item.href),
  );
  const visibleLaunchNextActions = launchReadiness.nextActions.filter((item) =>
    canAccessAdminHref(item.href),
  );
  const canViewReports = canAccessAdminHref("/admin/reports");
  const canManageSettings = canAccessAdminHref("/admin/settings");
  const topPriorityLabel =
    priorityLeads.length > 0
      ? `${priorityLeads.length} oportunidad${
          priorityLeads.length === 1 ? "" : "es"
        } para responder hoy`
      : "Sin oportunidades urgentes";
  const operationalSignalLabel =
    role !== "ADMIN"
      ? `${newCount} consulta${newCount === 1 ? "" : "s"} nueva${newCount === 1 ? "" : "s"} para revisar`
      : overdueFollowUpCount > 0
        ? `${overdueFollowUpCount} seguimiento${overdueFollowUpCount === 1 ? "" : "s"} vencido${overdueFollowUpCount === 1 ? "" : "s"}`
        : topPriorityLabel;
  const operationalSignalHref =
    role !== "ADMIN"
      ? "/admin/leads?estado=NEW"
      : overdueFollowUpCount > 0
        ? "/admin/leads?seguimiento=vencidos"
        : "/admin/leads";

  return (
    <div className="grid gap-6">
      <section
        aria-labelledby="dashboard-overview-title"
        className="premium-card overflow-hidden p-0"
      >
        <div className="grid gap-px bg-ink/10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="bg-paper p-6 md:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
              Resumen operativo
            </p>
            <h2
              id="dashboard-overview-title"
              className="mt-2 font-serif text-4xl leading-tight text-ink"
            >
              Qué conviene mirar hoy
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-ink/72">
              {roleGuidance[role]} El panel prioriza consultas, calidad
              comercial, publicación y contenido para que cada rol encuentre su
              siguiente acción sin revisar todo el sistema.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex min-h-9 items-center border border-bronze/25 bg-bronze-light/20 px-3 text-xs font-semibold text-ink">
                Rol: {roleLabels[role]}
              </span>
              <span className="inline-flex min-h-9 items-center border border-ink/10 bg-white px-3 text-xs font-semibold text-ink/70">
                {`${visibleModules.length} módulos disponibles`}
              </span>
              <span className="inline-flex min-h-9 items-center border border-ink/10 bg-white px-3 text-xs font-semibold text-ink/70">
                {`${userCount} ${userCount === 1 ? "usuario activo" : "usuarios activos"}`}
              </span>
            </div>
          </div>
          <div className="grid gap-px bg-ink/10 sm:grid-cols-3 lg:grid-cols-1">
            <DashboardSignal
              description={
                overdueFollowUpCount > 0
                  ? "Próximas acciones que ya necesitan atención."
                  : "Consultas con lectura comercial alta."
              }
              href={operationalSignalHref}
              icon={<Clock3 className="size-4" aria-hidden="true" />}
              label={operationalSignalLabel}
            />
            <DashboardSignal
              description={readiness.summary}
              href={visibleNextActions[0]?.href || "/admin/projects"}
              icon={<CheckCircle2 className="size-4" aria-hidden="true" />}
              label={`Revisión comercial: ${readiness.label}`}
            />
            <DashboardSignal
              description={launchReadiness.summary}
              href={canManageSettings ? "/admin/settings" : undefined}
              icon={<ShieldCheck className="size-4" aria-hidden="true" />}
              label={`Salida a producción: ${launchReadiness.label}`}
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="dashboard-metrics-title" className="grid gap-4">
        <div className="flex flex-col justify-between gap-2 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
              Métricas
            </p>
            <h2
              id="dashboard-metrics-title"
              className="font-serif text-3xl text-ink"
            >
              Lectura rápida del negocio
            </h2>
          </div>
          <p className="text-sm leading-6 text-ink/65">
            Cada tarjeta abre la sección correspondiente cuando tu rol lo permite.
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <StatGroup
            icon={<BarChart3 className="size-4" aria-hidden="true" />}
            label="CRM"
            stats={crmStats}
          />
          <StatGroup
            icon={<Sparkles className="size-4" aria-hidden="true" />}
            label="Contenido comercial"
            stats={contentStats}
          />
          <StatGroup
            icon={<CheckCircle2 className="size-4" aria-hidden="true" />}
            label="Confianza y SEO local"
            stats={proofStats}
          />
        </div>
      </section>

      <AdminMobileDisclosure
        description={`${visibleModules.length} módulos disponibles según tu rol`}
        label="Accesos y herramientas"
      >
      <section className="premium-card p-6" aria-labelledby="admin-modules-title">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
              Accesos por rol
            </p>
            <h2 id="admin-modules-title" className="mt-2 font-serif text-3xl text-ink">
              Herramientas de trabajo
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-ink/65">
            Sólo aparecen los módulos habilitados para {roleLabels[role].toLocaleLowerCase("es")}.
            Cada acceso indica si permite operar o únicamente revisar.
          </p>
        </div>
        <div className="mt-6 grid gap-px overflow-hidden border border-ink/10 bg-ink/10">
          {visibleModuleGroups.map(({ group, modules }) => (
            <div
              key={group}
              className="grid gap-4 bg-paper p-4 md:grid-cols-[140px_minmax(0,1fr)] md:p-5"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-bronze">
                  {group}
                </p>
                <p className="mt-1 text-xs text-ink/55">
                  {modules.length} {modules.length === 1 ? "módulo" : "módulos"}
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {modules.map((module) => {
                  const Icon = module.icon;
                  return (
                    <Link
                      key={module.href}
                      href={module.href}
                      className="group flex min-h-14 items-center gap-3 border border-ink/10 bg-white/80 px-3 py-2 text-sm font-semibold text-ink transition hover:border-bronze hover:text-bronze focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze"
                    >
                      <span className="grid size-9 shrink-0 place-items-center bg-mist text-bronze transition group-hover:bg-bronze group-hover:text-paper">
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate">{module.label}</span>
                        <span className="block truncate text-[0.68rem] font-medium text-ink/55">
                          {getAdminPermissionHint(module, role)}
                        </span>
                      </span>
                      <ArrowRight className="ml-auto size-3.5 shrink-0 opacity-45 transition group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden="true" />
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
      </AdminMobileDisclosure>

      <section className="premium-card p-6" aria-labelledby="recent-leads-title">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
                CRM
              </p>
              <h2 id="recent-leads-title" className="mt-2 font-serif text-3xl text-ink">
                Últimas consultas
              </h2>
              <p className="mt-2 text-sm leading-6 text-ink/65">
                Entradas recientes con estado visible para decidir el próximo
                seguimiento.
              </p>
            </div>
            <Link href="/admin/leads" className={panelLinkClassName}>
              Ver todas <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          {recentLeads.length ? (
            <div className="mt-5 divide-y divide-ink/10">
              {recentLeads.map((lead) => {
                const isUnread =
                  !leadNotificationsReadAt ||
                  lead.createdAt > leadNotificationsReadAt;

                return (
                  <Link
                    key={lead.id}
                    href={`/admin/leads/${lead.id}`}
                    className={`group block border-l-2 py-4 pl-3 transition hover:text-bronze focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze ${
                      isUnread ? "border-bronze bg-bronze-light/8" : "border-transparent"
                    }`}
                  >
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-ink">
                            {canSeeLeadPII ? lead.name : "Consulta reciente"}
                          </p>
                          <AdminUnreadLeadBadge
                            createdAt={lead.createdAt.toISOString()}
                            initialReadAt={leadNotificationsReadAt?.toISOString() ?? null}
                          />
                        </div>
                        <p className="mt-1 text-sm leading-6 text-ink/75">
                          {canSeeLeadPII
                            ? `${lead.projectType} · ${lead.city} · ${formatDate(lead.createdAt)}`
                            : `Datos protegidos · ${formatDate(lead.createdAt)}`}
                        </p>
                      </div>
                      <span
                        className={`w-fit shrink-0 px-3 py-1 text-xs font-semibold ${leadStatusClassNames[lead.status]}`}
                      >
                        {lead.status === "NEW"
                          ? "Sin contactar"
                          : leadStatusLabels[lead.status]}
                      </span>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-bronze opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                      Abrir consulta
                    </p>
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyState
              description="Cuando alguien envíe el formulario, aparecerá en este panel con estado y fecha de ingreso."
              title="Todavía no hay consultas."
            />
          )}
      </section>

      {role === "ADMIN" ? (
      <section className="premium-card p-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
              Responder primero
            </p>
            <h2 className="mt-2 font-serif text-3xl text-ink">
              Oportunidades calientes
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-ink/70">
              Consultas abiertas con señales de presupuesto, etapa, visita o
              documentación suficiente para avanzar rápido.
            </p>
          </div>
          {canViewReports ? (
            <Link href="/admin/reports" className={panelLinkClassName}>
              Ver reportes <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          ) : (
            <AccessNote text="Los reportes comerciales están disponibles para Admin." />
          )}
        </div>
        {priorityLeads.length ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {priorityLeads.map(({ lead, reading }) => (
              <Link
                key={lead.id}
                href={`/admin/leads/${lead.id}`}
                className="group border border-ink/10 bg-mist p-4 transition hover:-translate-y-0.5 hover:border-bronze focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">
                      {canSeeLeadPII ? lead.name : "Consulta prioritaria"}
                    </p>
                    <p className="mt-1 text-sm text-ink/70">
                      {canSeeLeadPII
                        ? `${lead.projectType} · ${lead.city}`
                        : "Información comercial protegida"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 px-3 py-1 text-xs font-semibold ${reading.className}`}
                  >
                    {canSeeLeadPII
                      ? `${reading.label} · ${reading.score}`
                      : "Datos protegidos"}
                  </span>
                </div>
                {canSeeLeadPII ? (
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink/65">
                    {reading.summary}
                  </p>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-ink/65">
                    El detalle y las señales comerciales están reservados para Admin.
                  </p>
                )}
                <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-bronze">
                  Abrir consulta <ArrowRight className="size-3.5" aria-hidden="true" />
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            description="El CRM no detecta consultas de prioridad alta abiertas en este momento."
            title="Sin oportunidades urgentes."
          />
        )}
      </section>
      ) : null}

      <ReadinessPanel
        actions={visibleNextActions}
        canOpenActivity={canAccessAdminHref("/admin/activity")}
        canOpenHref={canAccessAdminHref}
        checks={readiness.checks}
        description="Lectura rápida para saber si Arqvia tiene suficiente prueba, confianza, SEO local y seguimiento comercial antes de empujar nuevas consultas."
        emptyAction={
          canViewReports
            ? {
                href: "/admin/reports",
                label: "Ver reportes comerciales",
              }
            : undefined
        }
        eyebrow="Puesta a punto comercial"
        statusLabel={readiness.label}
        summary={readiness.summary}
        title="Checklist de venta del sitio"
      />

      <ReadinessPanel
        actions={visibleLaunchNextActions}
        canOpenActivity={canManageSettings}
        canOpenHref={canAccessAdminHref}
        checks={launchReadiness.checks}
        dark
        description="Controla dominio público, WhatsApp, datos de contacto, primera pantalla y guardrails para que el sitio no salga con URLs de desarrollo."
        emptyAction={
          canManageSettings
            ? {
                href: "/admin/settings",
                label: "Revisar configuración",
              }
            : undefined
        }
        eyebrow="Publicación"
        statusLabel={launchReadiness.label}
        summary={launchReadiness.summary}
        title="Checklist técnico antes de publicar"
      />

      <section className="premium-card-dark p-6 text-paper">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze-light">
              Pipeline comercial
            </p>
            <h2 className="mt-2 font-serif text-3xl">
              Estado de las oportunidades
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-paper/70">
            Lectura rápida de consultas que requieren contacto, propuesta o
            cierre. Cada estado abre la bandeja filtrada.
          </p>
        </div>
        <div className="touch-scroll-row -mx-1 mt-6 flex snap-x gap-3 overflow-x-auto px-1 pb-2 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0 md:pb-0">
          {pipeline.map((item) => (
            <Link
              key={item.label}
              href={`/admin/leads?estado=${item.status}`}
              className="group min-w-[min(15rem,78vw)] snap-start border border-paper/12 bg-paper/[0.04] p-4 transition hover:-translate-y-0.5 hover:border-bronze-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze-light md:min-w-0"
            >
              <p className="font-sans text-4xl font-semibold tabular-nums text-bronze-light">
                {formatCount(item.value)}
              </p>
              <p className="mt-1 text-sm font-semibold text-paper/82">
                {item.label}
              </p>
              <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-paper/62 group-hover:text-bronze-light">
                Ver consultas <ArrowRight className="size-3.5" aria-hidden="true" />
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function DashboardSignal({
  description,
  href,
  icon,
  label,
}: {
  description: string;
  href?: string;
  icon: ReactNode;
  label: string;
}) {
  const content = (
    <div className="flex h-full items-start gap-3 bg-mist p-5">
      <span className="grid size-10 shrink-0 place-items-center border border-bronze/25 bg-bronze-light/20 text-bronze">
        {icon}
      </span>
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-ink/62">
          {description}
        </span>
      </span>
    </div>
  );

  return href ? (
    <Link
      href={href}
      className="group block transition hover:bg-bronze-light/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze"
    >
      {content}
    </Link>
  ) : (
    <div>{content}</div>
  );
}

function StatGroup({
  icon,
  label,
  stats,
}: {
  icon: ReactNode;
  label: string;
  stats: DashboardStat[];
}) {
  return (
    <div className="premium-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid size-9 place-items-center bg-ink text-paper">
          {icon}
        </span>
        <h3 className="text-sm font-semibold text-ink">{label}</h3>
      </div>
      <div className="touch-scroll-row -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0">
        {stats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </div>
    </div>
  );
}

function StatCard({ stat }: { stat: DashboardStat }) {
  const tone = stat.tone || "neutral";
  const className = `block min-w-[min(14rem,82vw)] snap-start border p-4 transition hover:-translate-y-0.5 hover:border-bronze focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze sm:min-w-0 ${statToneClassNames[tone]}`;
  const content = (
    <>
      <p className="font-sans text-4xl font-semibold leading-none tabular-nums text-ink">
        {formatCount(stat.value)}
      </p>
      <p className="mt-2 text-sm font-semibold text-ink">{stat.label}</p>
      <p className="mt-1 text-xs leading-5 text-ink/62">{stat.description}</p>
    </>
  );

  return stat.href ? (
    <Link href={stat.href} className={className}>
      {content}
    </Link>
  ) : (
    <article className={className}>{content}</article>
  );
}

function EmptyState({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="mt-5 border border-dashed border-ink/20 bg-white/55 p-8 text-center">
      <p className="font-serif text-2xl text-ink">{title}</p>
      <p className="mt-2 text-sm leading-6 text-ink/70">{description}</p>
    </div>
  );
}

function AccessNote({ text }: { text: string }) {
  return (
    <p className="inline-flex min-h-11 items-center gap-2 border border-ink/10 bg-mist px-4 text-sm font-medium text-ink/70">
      <LockKeyhole className="size-4 text-bronze" aria-hidden="true" />
      {text}
    </p>
  );
}

function ReadinessPanel({
  actions,
  canOpenActivity,
  canOpenHref,
  checks,
  dark = false,
  description,
  emptyAction,
  eyebrow,
  statusLabel,
  summary,
  title,
}: {
  actions: Array<{ action: string; href: string; label: string }>;
  canOpenActivity: boolean;
  canOpenHref: (href: string) => boolean;
  checks: Array<{
    action: string;
    detail: string;
    href: string;
    label: string;
    ok: boolean;
  }>;
  dark?: boolean;
  description: string;
  emptyAction?: { href: string; label: string };
  eyebrow: string;
  statusLabel: string;
  summary: string;
  title: string;
}) {
  const approvedCount = checks.filter((check) => check.ok).length;
  const pendingCount = checks.length - approvedCount;

  return (
    <AdminMobileDisclosure
      description={`${approvedCount}/${checks.length} controles aprobados`}
      label={title}
      testId={dark ? "admin-launch-readiness-panel" : "admin-readiness-panel"}
    >
    <section className="premium-card p-6">
      <div className="grid gap-6 lg:grid-cols-[0.62fr_1.38fr]">
        <div
          className={
            dark
              ? "border border-ink/10 bg-ink p-5 text-paper"
              : "border border-ink/10 bg-mist/45 p-5"
          }
        >
          <p
            className={
              dark
                ? "text-xs font-semibold uppercase tracking-[0.2em] text-bronze-light"
                : "text-xs font-semibold uppercase tracking-[0.2em] text-bronze"
            }
          >
            {eyebrow}
          </p>
          <div className="mt-5 flex items-end gap-3">
            <p
              className={
                dark
                  ? "font-sans text-6xl font-semibold leading-none tabular-nums"
                  : "font-sans text-6xl font-semibold leading-none tabular-nums text-ink"
              }
            >
              {approvedCount}/{checks.length}
            </p>
            <p
              className={
                dark
                  ? "pb-2 text-sm font-semibold text-paper/75"
                  : "pb-2 text-sm font-semibold text-ink/70"
              }
            >
              controles aprobados
            </p>
          </div>
          <p
            className={
              dark
                ? "mt-3 text-sm font-semibold text-paper"
                : "mt-3 text-sm font-semibold text-ink"
            }
          >
            {`${statusLabel}${
              pendingCount > 0
                ? ` · ${pendingCount} pendiente${pendingCount === 1 ? "" : "s"}`
                : " · Sin pendientes"
            }`}
          </p>
          <p
            className={
              dark
                ? "mt-4 text-sm leading-7 text-paper/75"
                : "mt-4 text-sm leading-7 text-ink/75"
            }
          >
            {summary}
          </p>
          {actions.length ? (
            <div className="mt-5 space-y-2">
              <p
                className={
                  dark
                    ? "text-xs font-semibold uppercase tracking-[0.16em] text-paper/55"
                    : "text-xs font-semibold uppercase tracking-[0.16em] text-ink/55"
                }
              >
                Prioridad inmediata
              </p>
              {actions.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={dark ? darkPanelLinkClassName : panelLinkClassName}
                >
                  <span>{item.action}</span>
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              ))}
            </div>
          ) : emptyAction ? (
            <Link
              href={emptyAction.href}
              className={`mt-5 ${dark ? darkPanelLinkClassName : panelLinkClassName}`}
            >
              {emptyAction.label}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          ) : (
            <p
              className={
                dark
                  ? "mt-5 border border-paper/12 bg-paper/[0.04] px-4 py-3 text-sm text-paper/70"
                  : "mt-5 border border-ink/10 bg-white/70 px-4 py-3 text-sm text-ink/70"
              }
            >
              No hay acciones disponibles para tu rol en este bloque.
            </p>
          )}
        </div>

        <div>
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <h2 className="font-serif text-3xl text-ink">{title}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-ink/70">
                {description}
              </p>
            </div>
            {canOpenActivity ? (
              <Link
                href={dark ? "/admin/settings" : "/admin/activity"}
                className={panelLinkClassName}
              >
                {dark ? "Configuración" : "Ver actividad"}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            ) : (
              <AccessNote
                text={
                  dark
                    ? "La configuración está reservada para Admin."
                    : "La actividad está reservada para Admin."
                }
              />
            )}
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {checks.map((check) => {
              const canOpenCheck = canOpenHref(check.href);
              const cardContent = (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        {check.label}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-ink/65">
                        {check.detail}
                      </p>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 border px-2.5 py-1 text-xs font-semibold ${statusTone(check.ok)}`}
                    >
                      {check.ok ? (
                        <CheckCircle2 className="size-3.5" aria-hidden="true" />
                      ) : (
                        <AlertTriangle className="size-3.5" aria-hidden="true" />
                      )}
                      {check.ok ? "OK" : "Revisar"}
                    </span>
                  </div>
                  {canOpenCheck ? (
                    <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-bronze">
                      {check.action}
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </p>
                  ) : (
                    <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-ink/68">
                      <LockKeyhole className="size-3.5" aria-hidden="true" />
                      Requiere rol Admin
                    </p>
                  )}
                </>
              );

              return canOpenCheck ? (
                <Link
                  key={check.label}
                  href={check.href}
                  className="group border border-ink/10 p-4 transition hover:-translate-y-0.5 hover:border-bronze focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze"
                >
                  {cardContent}
                </Link>
              ) : (
                <div key={check.label} className="border border-ink/10 p-4">
                  {cardContent}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
    </AdminMobileDisclosure>
  );
}
