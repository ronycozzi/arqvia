import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Calculator, Pencil, Plus, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { EstimatorConfigForm } from "@/components/admin/estimator-forms";
import { adminOnlyRoles, getVerifiedAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { fallbackEstimateConfig } from "@/lib/estimator-data";
import { formatUsd } from "@/lib/estimator";

export const metadata: Metadata = {
  title: "Estimador de inversión",
  robots: { index: false, follow: false },
};

export default async function AdminEstimatorPage() {
  const session = await getVerifiedAdminSession(adminOnlyRoles);
  if (!session) redirect("/admin");

  const [configRecord, rules, estimateCount] = await Promise.all([
    prisma.estimateConfig.findUnique({ where: { id: "arqvia-estimator" } }),
    prisma.estimateRule.findMany({
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    }),
    prisma.leadEstimate.count(),
  ]);
  const config = configRecord || {
    id: "arqvia-estimator",
    version: fallbackEstimateConfig.version,
    enabled: fallbackEstimateConfig.enabled,
    headline: fallbackEstimateConfig.headline,
    description: fallbackEstimateConfig.description,
    disclaimer: fallbackEstimateConfig.disclaimer,
    essentialMultiplier: fallbackEstimateConfig.multipliers.ESSENTIAL,
    balancedMultiplier: fallbackEstimateConfig.multipliers.BALANCED,
    premiumMultiplier: fallbackEstimateConfig.multipliers.PREMIUM,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };

  return (
    <div className="grid gap-6">
      <section className="premium-panel p-6 md:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
              Configuración comercial
            </p>
            <h2 className="mt-2 font-serif text-4xl text-ink md:text-5xl">
              Rangos orientativos de inversión.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-ink/72">
              Administrá valores por m², mínimos de proyecto, niveles de terminación y el aviso que acompaña cada resultado público.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/estimador"
              className="inline-flex min-h-11 items-center justify-center gap-2 border border-ink/15 px-4 text-sm font-semibold text-ink transition hover:border-bronze hover:text-bronze"
            >
              Ver estimador <ArrowUpRight className="size-4" />
            </Link>
            <Link
              href="/admin/estimador/new"
              className="inline-flex min-h-11 items-center justify-center gap-2 bg-ink px-4 text-sm font-semibold text-paper transition hover:bg-bronze"
            >
              <Plus className="size-4" /> Nueva categoría
            </Link>
          </div>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          <Metric icon={Calculator} label="Versión publicada" value={`v${config.version}`} />
          <Metric icon={Calculator} label="Categorías activas" value={String(rules.filter((rule) => rule.active).length)} />
          <Metric icon={Users} label="Leads con estimación" value={String(estimateCount)} />
        </div>
      </section>

      {!configRecord ? (
        <p role="alert" className="border border-red-300 bg-red-50 px-5 py-4 text-sm text-red-700">
          La tabla del estimador todavía no fue inicializada. Ejecutá las migraciones y el seed antes de guardar cambios.
        </p>
      ) : null}

      <section className="premium-panel p-6 md:p-8">
        <div className="mb-6 border-b border-ink/10 pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bronze">
            Presentación y multiplicadores
          </p>
          <h3 className="mt-2 font-serif text-3xl text-ink">
            Configuración general
          </h3>
        </div>
        <EstimatorConfigForm config={config} />
      </section>

      <section className="overflow-hidden border border-ink/10 bg-paper shadow-premium">
        <div className="flex flex-col justify-between gap-4 border-b border-ink/10 px-5 py-5 sm:flex-row sm:items-end md:px-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bronze">
              Matriz de cálculo
            </p>
            <h3 className="mt-2 font-serif text-3xl text-ink">
              Categorías y valores por m²
            </h3>
          </div>
          <p className="text-xs leading-5 text-ink/55">
            Cada cambio incrementa la versión publicada.
          </p>
        </div>

        {rules.length ? (
          <div className="divide-y divide-ink/10">
            {rules.map((rule) => (
              <article
                key={rule.id}
                className="grid gap-4 px-5 py-5 transition hover:bg-mist/65 md:grid-cols-[1fr_auto] md:items-center md:px-7"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-serif text-2xl text-ink">{rule.label}</h4>
                    <span className={`px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${rule.active ? "bg-olive/15 text-olive" : "bg-ink/8 text-ink/55"}`}>
                      {rule.active ? "Activo" : "Oculto"}
                    </span>
                  </div>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65">
                    {rule.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-ink/62">
                    <span>{formatUsd(rule.minUsdPerM2)}–{formatUsd(rule.maxUsdPerM2)} / m²</span>
                    <span>Mínimo {formatUsd(rule.minimumProjectUsd)}</span>
                    <span>Orden {rule.sortOrder}</span>
                  </div>
                </div>
                <Link
                  href={`/admin/estimador/${rule.id}`}
                  className="inline-flex min-h-11 items-center justify-center gap-2 border border-ink/15 px-4 text-sm font-semibold text-ink transition hover:border-bronze hover:text-bronze"
                >
                  <Pencil className="size-4" /> Editar
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-sm text-ink/65">Todavía no hay categorías de cálculo.</p>
            <Link href="/admin/estimador/new" className="mt-4 inline-flex min-h-11 items-center gap-2 bg-ink px-5 text-sm font-semibold text-paper">
              <Plus className="size-4" /> Crear primera categoría
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="border border-ink/10 bg-white/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/55">{label}</p>
        <Icon className="size-4 text-bronze" aria-hidden="true" />
      </div>
      <p className="mt-3 font-serif text-4xl text-ink">{value}</p>
    </div>
  );
}
