import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { EstimatorRuleForm } from "@/components/admin/estimator-forms";
import { adminOnlyRoles, getVerifiedAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Editar categoría del estimador",
  robots: { index: false, follow: false },
};

export default async function EditEstimateRulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getVerifiedAdminSession(adminOnlyRoles);
  if (!session) redirect("/admin");
  const { id } = await params;
  const [rule, config] = await Promise.all([
    prisma.estimateRule.findUnique({ where: { id } }),
    prisma.estimateConfig.findUnique({
      where: { id: "arqvia-estimator" },
      select: { version: true },
    }),
  ]);
  if (!rule || !config) notFound();

  return (
    <section className="mx-auto max-w-4xl">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <Link href="/admin/estimador" className="inline-flex items-center gap-2 text-sm font-semibold text-ink underline decoration-bronze underline-offset-4">
          <ArrowLeft className="size-4" /> Volver al estimador
        </Link>
        <Link href="/estimador" className="inline-flex items-center gap-2 text-sm font-semibold text-bronze">
          Ver herramienta pública <ArrowUpRight className="size-4" />
        </Link>
      </div>
      <div className="premium-panel mt-6 p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bronze">Categoría de cálculo</p>
        <h2 className="mt-2 font-serif text-4xl text-ink">{rule.label}</h2>
        <p className="mt-3 text-sm leading-7 text-ink/70">Los cambios se publican al guardar e incrementan la versión usada por nuevas estimaciones.</p>
        <div className="mt-7">
          <EstimatorRuleForm configVersion={config.version} rule={rule} />
        </div>
      </div>
    </section>
  );
}
