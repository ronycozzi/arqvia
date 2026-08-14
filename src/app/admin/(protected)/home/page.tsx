import type { Metadata } from "next";
import { Eye, LayoutTemplate, ShieldCheck } from "lucide-react";
import { HomeContentForm } from "@/components/admin/home-content-form";
import { canManageContent, requireVerifiedAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import {
  fallbackHomeContent,
  HOME_CONTENT_ID,
  toPublicHomeContent,
} from "@/lib/home-content";

export const metadata: Metadata = {
  title: "Contenido de la home | Admin",
  robots: { follow: false, index: false },
};

export default async function AdminHomeContentPage() {
  const session = await requireVerifiedAdminSession();
  const storedContent = await prisma.homeContent.findUnique({
    where: { id: HOME_CONTENT_ID },
  });
  const content = storedContent
    ? toPublicHomeContent(storedContent) || fallbackHomeContent
    : fallbackHomeContent;
  const canEdit = canManageContent(session.user.role);

  return (
    <section className="grid gap-6">
      <header className="premium-card p-6 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
              Recorrido comercial
            </p>
            <h2 className="mt-3 font-serif text-4xl text-ink md:text-5xl">
              Contenido comercial de la home
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-ink/72">
              Controlá el mensaje inicial, las pruebas de confianza, las
              secciones principales, el proceso y el cierre de conversión desde
              una sola pantalla.
            </p>
          </div>
          <div className="flex items-center gap-3 border-l-2 border-bronze pl-5">
            {canEdit ? (
              <ShieldCheck className="size-6 text-bronze" aria-hidden="true" />
            ) : (
              <Eye className="size-6 text-bronze" aria-hidden="true" />
            )}
            <div>
              <p className="text-sm font-semibold text-ink">
                {canEdit ? "Edición habilitada" : "Modo lectura"}
              </p>
              <p className="text-xs text-ink/68">
                {session.user.role === "ADMIN"
                  ? "Admin"
                  : session.user.role === "EDITOR"
                    ? "Editor"
                    : "Viewer"}
              </p>
            </div>
          </div>
        </div>
      </header>

      {!storedContent ? (
        <aside className="flex gap-4 border border-bronze/25 bg-bronze-light/18 p-5 text-sm leading-7 text-ink/75">
          <LayoutTemplate className="mt-1 size-5 shrink-0 text-bronze" aria-hidden="true" />
          <p>
            Se está mostrando el contenido base de Arqvia. Al guardar se creará
            la versión administrable en la base de datos.
          </p>
        </aside>
      ) : null}

      <HomeContentForm
        canEdit={canEdit}
        content={content}
        expectedUpdatedAt={storedContent?.updatedAt.toISOString()}
      />
    </section>
  );
}
