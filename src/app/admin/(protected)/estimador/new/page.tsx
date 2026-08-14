import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { EstimatorRuleForm } from "@/components/admin/estimator-forms";
import { adminOnlyRoles, getVerifiedAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Nueva categoría del estimador",
  robots: { index: false, follow: false },
};

export default async function NewEstimateRulePage() {
  const session = await getVerifiedAdminSession(adminOnlyRoles);
  if (!session) redirect("/admin");
  const config = await prisma.estimateConfig.findUnique({
    where: { id: "arqvia-estimator" },
    select: { version: true },
  });
  if (!config) redirect("/admin/estimador");

  return (
    <section className="mx-auto max-w-4xl">
      <Link href="/admin/estimador" className="inline-flex items-center gap-2 text-sm font-semibold text-ink underline decoration-bronze underline-offset-4">
        <ArrowLeft className="size-4" /> Volver al estimador
      </Link>
      <div className="premium-panel mt-6 p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bronze">Nueva categoría</p>
        <h2 className="mt-2 font-serif text-4xl text-ink">Agregar un tipo de proyecto.</h2>
        <p className="mt-3 text-sm leading-7 text-ink/70">Definí el rango base por m² y la inversión mínima antes de habilitarlo públicamente.</p>
        <div className="mt-7">
          <EstimatorRuleForm
            configVersion={config.version}
            rule={{
              key: "",
              label: "",
              description: "",
              minUsdPerM2: 500,
              maxUsdPerM2: 900,
              minimumProjectUsd: 10000,
              active: false,
              sortOrder: 100,
            }}
          />
        </div>
      </div>
    </section>
  );
}
