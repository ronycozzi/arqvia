import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type {
  LeadAutomationStatus,
  PrivateObjectDeletionStatus,
} from "@prisma/client";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  CircleMinus,
  Database,
  Gauge,
  HardDrive,
  RadioTower,
  ShieldCheck,
} from "lucide-react";
import { adminOnlyRoles, getVerifiedAdminSession } from "@/lib/admin-auth";
import { readLeadAutomationConfig } from "@/lib/lead-automation-config";
import { readLeadRetentionConfig } from "@/lib/lead-retention-config";
import { getLatestVerifiedLocalBackup } from "@/lib/local-backup-status";
import { getMediaStorageStatus } from "@/lib/media-storage";
import { prisma } from "@/lib/db";
import {
  buildSystemReadiness,
  type SystemReadinessState,
} from "@/lib/system-readiness";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Estado del sistema",
  robots: { index: false, follow: false },
};

const stateMeta: Record<
  SystemReadinessState,
  {
    className: string;
    icon: typeof CheckCircle2;
    label: string;
  }
> = {
  ready: {
    className: "border-olive/25 bg-olive/10 text-olive",
    icon: CheckCircle2,
    label: "Listo",
  },
  attention: {
    className: "border-bronze/35 bg-bronze-light/22 text-ink",
    icon: AlertTriangle,
    label: "Requiere atención",
  },
  disabled: {
    className: "border-ink/12 bg-white/55 text-ink/72",
    icon: CircleMinus,
    label: "Desactivado",
  },
};

const automationStatusLabels: Record<LeadAutomationStatus, string> = {
  PENDING: "Pendientes",
  PROCESSING: "Procesando",
  DELIVERED: "Entregadas",
  FAILED: "Fallidas",
  DEAD: "Agotadas",
};

const operationalLinks = [
  {
    href: "/admin/settings",
    label: "Configuración",
    description: "Dominio, contacto y variables globales",
  },
  {
    href: "/admin/media",
    label: "Biblioteca visual",
    description: "Archivos, derechos y persistencia",
  },
  {
    href: "/admin/automations",
    label: "Automatizaciones",
    description: "Cola, errores y reintentos",
  },
  {
    href: "/admin/estimador",
    label: "Estimador opcional",
    description: "Rangos en USD y publicación controlada",
  },
  {
    href: "/admin/activity",
    label: "Actividad",
    description: "Trazabilidad de cambios administrativos",
  },
];

export default async function AdminSystemPage() {
  const session = await getVerifiedAdminSession(adminOnlyRoles);
  if (!session) redirect("/admin");

  let databaseConnected = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseConnected = true;
  } catch {
    databaseConnected = false;
  }

  const [
    leadCount,
    activeUserCount,
    mediaCount,
    automationGroups,
    privateDeletionGroups,
    lastAudit,
  ] =
    databaseConnected
      ? await Promise.all([
          prisma.lead.count(),
          prisma.user.count({ where: { active: true } }),
          prisma.mediaAsset.count(),
          prisma.leadAutomationDelivery.groupBy({
            by: ["status"],
            _count: { _all: true },
          }),
          prisma.privateObjectDeletion.groupBy({
            by: ["status"],
            _count: { _all: true },
          }),
          prisma.auditLog.findFirst({
            orderBy: { createdAt: "desc" },
            select: { createdAt: true, summary: true },
          }),
        ])
      : [0, 0, 0, [], [], null];

  const readiness = buildSystemReadiness({ databaseConnected });
  const storage = getMediaStorageStatus();
  const automation = readLeadAutomationConfig();
  const retention = readLeadRetentionConfig();
  const latestLocalBackup = await getLatestVerifiedLocalBackup();
  const automationCounts = new Map<LeadAutomationStatus, number>(
    automationGroups.map((item) => [item.status, item._count._all]),
  );
  const privateDeletionCounts = new Map<PrivateObjectDeletionStatus, number>(
    privateDeletionGroups.map((item) => [item.status, item._count._all]),
  );
  const pendingPrivateDeletions =
    (privateDeletionCounts.get("PENDING") || 0) +
    (privateDeletionCounts.get("PROCESSING") || 0) +
    (privateDeletionCounts.get("FAILED") || 0);
  const databaseUrl = process.env.DATABASE_URL?.trim().toLowerCase() || "";
  const databaseLocation = databaseUrl.startsWith("file:")
    ? "Archivo local"
    : readiness.databaseProvider;
  const analyticsProvider =
    process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER?.trim().toUpperCase() || "NONE";
  const backupLabel =
    readiness.databaseProvider === "SQLite"
      ? latestLocalBackup
        ? `${formatDate(latestLocalBackup.createdAt)} · ${(
            latestLocalBackup.sizeBytes /
            1024 /
            1024
          ).toFixed(1)} MB`
        : "Sin copia local verificada"
      : "Gestionado por proveedor";

  return (
    <div className="space-y-7">
      <section className="border border-ink/10 bg-white/72 p-6 shadow-[0_22px_60px_rgb(28_27_23/0.06)] md:p-8">
        <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
              Operación técnica
            </p>
            <h2 className="mt-3 font-serif text-4xl leading-tight text-ink md:text-5xl">
              Estado del sistema
            </h2>
            <p className="mt-4 text-base leading-7 text-ink/68">
              Una lectura segura de infraestructura, integraciones y persistencia.
              Este panel nunca expone contraseñas, tokens ni secretos de entorno.
            </p>
          </div>
          <div className="grid min-w-[250px] grid-cols-2 border border-ink/10 bg-paper">
            <div className="border-r border-ink/10 p-4">
              <p className="text-3xl font-semibold text-olive">
                {readiness.readyCount}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink/70">
                Controles listos
              </p>
            </div>
            <div className="p-4">
              <p className="text-3xl font-semibold text-bronze">
                {readiness.attentionCount}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink/70">
                Por resolver
              </p>
            </div>
          </div>
        </div>

        <div
          className={`mt-6 flex items-start gap-3 border p-4 ${
            readiness.attentionCount
              ? "border-bronze/30 bg-bronze-light/18"
              : "border-olive/25 bg-olive/10"
          }`}
          role="status"
        >
          {readiness.attentionCount ? (
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-bronze" />
          ) : (
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-olive" />
          )}
          <div>
            <p className="font-semibold text-ink">{readiness.summary}</p>
            <p className="mt-1 text-sm leading-6 text-ink/72">
              Entorno: {readiness.environmentLabel} · Base: {readiness.databaseProvider}
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="system-checks-title">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bronze">
              Diagnóstico
            </p>
            <h2 id="system-checks-title" className="mt-2 font-serif text-3xl text-ink">
              Controles de publicación
            </h2>
          </div>
          <Gauge className="hidden size-8 text-bronze/55 sm:block" aria-hidden="true" />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {readiness.checks.map((check) => {
            const meta = stateMeta[check.state];
            const StatusIcon = meta.icon;

            return (
              <article
                key={check.id}
                className="group flex min-h-56 flex-col border border-ink/10 bg-white/75 p-5 transition duration-300 hover:-translate-y-1 hover:border-bronze/45 hover:shadow-[0_18px_50px_rgb(28_27_23/0.08)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`inline-flex items-center gap-2 border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${meta.className}`}
                  >
                    <StatusIcon className="size-3.5" aria-hidden="true" />
                    {meta.label}
                  </span>
                  <ShieldCheck className="size-5 text-ink/22 transition group-hover:text-bronze" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-ink">{check.label}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-ink/72">
                  {check.detail}
                </p>
                <Link
                  href={check.href}
                  className="mt-5 inline-flex min-h-11 items-center justify-between border-t border-ink/10 pt-3 text-sm font-semibold text-ink transition hover:text-bronze"
                >
                  Resolver en el panel
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="border border-ink/10 bg-ink p-6 text-paper md:p-7">
          <div className="flex items-center gap-3">
            <RadioTower className="size-5 text-bronze-light" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bronze-light">
                Cola comercial
              </p>
              <h2 className="mt-1 font-serif text-3xl">Automatizaciones</h2>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-px bg-paper/10 sm:grid-cols-5">
            {(Object.keys(automationStatusLabels) as LeadAutomationStatus[]).map(
              (status) => (
                <div key={status} className="bg-ink px-4 py-5">
                  <p className="text-2xl font-semibold text-paper">
                    {automationCounts.get(status) || 0}
                  </p>
                  <p className="mt-1 text-xs text-paper/55">
                    {automationStatusLabels[status]}
                  </p>
                </div>
              ),
            )}
          </div>
          <p className="mt-5 text-sm leading-6 text-paper/74">
            {automation.dispatchReady
              ? `Envíos listos${automation.endpointHost ? ` hacia ${automation.endpointHost}` : ""}.`
              : automation.captureEnabled
                ? "Las consultas se guardan en cola; la entrega externa está pausada o incompleta."
                : "La captura de entregas externas está desactivada."}
          </p>
          <Link
            href="/admin/automations"
            className="mt-5 inline-flex min-h-11 items-center gap-2 border border-paper/20 px-4 text-sm font-semibold text-paper transition hover:border-bronze-light hover:text-bronze-light"
          >
            Revisar entregas <ArrowUpRight className="size-4" />
          </Link>
        </div>

        <div className="border border-ink/10 bg-white/75 p-6 md:p-7">
          <div className="flex items-center gap-3">
            <Database className="size-5 text-bronze" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bronze">
                Instantánea
              </p>
              <h2 className="mt-1 font-serif text-3xl text-ink">Datos operativos</h2>
            </div>
          </div>
          <dl className="mt-6 divide-y divide-ink/10 border-y border-ink/10">
            <SystemDatum label="Consultas guardadas" value={String(leadCount)} />
            <SystemDatum label="Usuarios activos" value={String(activeUserCount)} />
            <SystemDatum label="Recursos visuales" value={String(mediaCount)} />
            <SystemDatum
              label="Borrados privados pendientes"
              value={String(pendingPrivateDeletions)}
            />
            <SystemDatum label="Base de datos" value={databaseLocation} />
            <SystemDatum
              label="Almacenamiento"
              value={storage.provider === "s3" ? "S3 persistente" : "Disco local"}
            />
            <SystemDatum label="Analítica" value={analyticsProvider} />
            <SystemDatum
              label="Retención"
              value={
                retention.enabled
                  ? retention.ready
                    ? `${retention.days} días · lote ${retention.batchSize}`
                    : "Configuración incompleta"
                  : "Apagada"
              }
            />
            <SystemDatum label="Último backup local" value={backupLabel} />
          </dl>
          <div className="mt-5 flex items-start gap-3 text-sm text-ink/72">
            <Activity className="mt-0.5 size-4 shrink-0 text-bronze" />
            <p>
              {lastAudit
                ? `Última actividad registrada el ${formatDate(lastAudit.createdAt)}: ${lastAudit.summary}`
                : "Todavía no hay actividad administrativa registrada."}
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="system-links-title">
        <div className="flex items-center gap-3">
          <HardDrive className="size-5 text-bronze" aria-hidden="true" />
          <h2 id="system-links-title" className="font-serif text-3xl text-ink">
            Accesos operativos
          </h2>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {operationalLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group min-h-32 border border-ink/10 bg-white/65 p-5 transition hover:-translate-y-1 hover:border-bronze/45 hover:bg-white"
            >
              <span className="flex items-center justify-between gap-3 font-semibold text-ink">
                {item.label}
                <ArrowUpRight className="size-4 text-ink/35 transition group-hover:text-bronze" />
              </span>
              <span className="mt-2 block text-sm leading-6 text-ink/70">
                {item.description}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function SystemDatum({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 text-sm">
      <dt className="text-ink/70">{label}</dt>
      <dd className="text-right font-semibold text-ink">{value}</dd>
    </div>
  );
}
