import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import { SettingsForm } from "@/components/admin/settings-form";
import { adminOnlyRoles, getVerifiedAdminSession } from "@/lib/admin-auth";
import { getAdminMediaOptions } from "@/lib/admin-media-options";
import { CLIENT_CONFIG_ID, getClientConfig } from "@/lib/client-config";
import { prisma } from "@/lib/db";
import { getInfrastructureReadiness } from "@/lib/infrastructure-readiness";
import { buildLaunchReadiness } from "@/lib/launch-readiness";
import { siteConfig } from "@/lib/site-config";
import { buildWhatsAppUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Configuración",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const session = await getVerifiedAdminSession(adminOnlyRoles);
  if (!session) redirect("/admin");

  const [
    config,
    mediaAssets,
    configVersion,
    legalPageCount,
    homeContentCount,
    institutionalPageCount,
  ] = await Promise.all([
    getClientConfig(),
    getAdminMediaOptions(),
    prisma.clientConfig.findUnique({
      where: { id: CLIENT_CONFIG_ID },
      select: { updatedAt: true },
    }),
    prisma.legalPage.count({ where: { status: "PUBLISHED" } }),
    prisma.homeContent.count(),
    prisma.institutionalPage.count(),
  ]);
  const canEdit = true;
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

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div>
        <div className="premium-panel mb-6 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
            Configuración global
          </p>
          <h2 className="mt-2 font-serif text-4xl text-ink">
            Marca, contacto y primera pantalla.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-ink/75">
            La home, el header, el footer y los enlaces de WhatsApp consumen
            estos datos para mantener la identidad y el contacto alineados.
          </p>
          {!canEdit ? (
            <p className="mt-4 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              Tu rol puede ver esta pantalla, pero solo Admin puede guardar
              cambios.
            </p>
          ) : null}
        </div>
        <SettingsForm
          canEdit={canEdit}
          config={config}
          expectedUpdatedAt={configVersion?.updatedAt.toISOString()}
          mediaAssets={mediaAssets}
        />
      </div>

      <aside className="h-fit overflow-hidden border border-ink/10 bg-ink text-paper shadow-premium lg:sticky lg:top-28">
        <div className="relative aspect-[4/3] overflow-hidden bg-paper/8">
          {config.heroImage ? (
            <Image
              src={config.heroImage}
              alt={`Imagen principal de ${config.companyName}`}
              fill
              sizes="360px"
              className="object-cover opacity-[0.82]"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/35 to-transparent" />
          <div className="absolute left-5 top-5 border border-paper/18 bg-ink/70 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] backdrop-blur">
            Preview de venta
          </div>
          <div className="absolute bottom-5 left-5 right-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bronze-light">
              {config.companyName}
            </p>
            <h3 className="mt-2 font-serif text-3xl leading-tight">
              {config.heroTitle}
            </h3>
          </div>
        </div>

        <div className="p-6">
          <p className="text-sm leading-7 text-paper/78">{config.heroSubtitle}</p>
          <div className="mt-5 grid gap-3">
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center gap-2 bg-paper px-4 text-sm font-semibold text-ink transition hover:bg-bronze"
            >
              <ArrowUpRight className="size-4" />
              {config.primaryCtaLabel || siteConfig.ctas.primary}
            </Link>
            <Link
              href={buildWhatsAppUrl(siteConfig.whatsappMessage, config.whatsapp)}
              className="inline-flex h-11 items-center justify-center gap-2 border border-paper/20 px-4 text-sm font-semibold text-paper transition hover:border-bronze hover:text-bronze-light"
            >
              <MessageCircle className="size-4" />
              WhatsApp
            </Link>
          </div>

          <div className="mt-6 space-y-3 border-t border-paper/15 pt-5 text-sm text-paper/78">
            <p>{config.phone}</p>
            <p>{config.email}</p>
            <p>{config.address}</p>
            <p>{config.businessHours}</p>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-2">
            {[
              config.primaryColor,
              config.secondaryColor,
              config.accentColor,
            ].map((color) => (
              <div key={color}>
                <div
                  className="h-12 border border-paper/20"
                  style={{ backgroundColor: color }}
                />
                <p className="mt-2 truncate text-xs text-paper/78">{color}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-paper/15 pt-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bronze-light">
                  Publicacion
                </p>
                <p className="mt-2 text-sm font-semibold text-paper">
                  {launchReadiness.label}
                </p>
              </div>
              <p className="text-right font-sans text-2xl font-semibold tabular-nums">
                {launchReadiness.checks.filter((check) => check.ok).length}/
                {launchReadiness.checks.length}
                <span className="mt-1 block text-xs font-medium text-paper/62">
                  controles aprobados
                </span>
              </p>
            </div>
            <p className="mt-3 text-xs leading-6 text-paper/68">
              {launchReadiness.summary}
            </p>
            <div className="mt-4 space-y-2">
              {launchReadiness.checks.map((check) => (
                <div
                  key={check.label}
                  className="border border-paper/12 bg-paper/[0.04] px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-paper">
                        {check.label}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-paper/62">
                        {check.detail}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                        check.ok
                          ? "border border-olive/60 bg-paper/10 text-paper"
                          : "border border-bronze/60 bg-paper/10 text-paper"
                      }`}
                    >
                      {check.ok ? "OK" : "Revisar"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
