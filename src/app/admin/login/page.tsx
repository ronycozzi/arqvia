import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/admin/login-form";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getVerifiedAdminSession } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Acceso al panel",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ callbackUrl?: string; switch?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const session = await getVerifiedAdminSession();
  const callbackUrl = resolveAdminCallbackUrl(params.callbackUrl);
  if (session?.user && params.switch !== "1") redirect(callbackUrl);

  return (
    <main className="admin-shell min-h-screen overflow-x-clip bg-[#141815] px-4 py-5 text-paper sm:px-6 md:px-8 md:py-7">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-6xl flex-col md:min-h-[calc(100vh-3.5rem)]">
        <header className="flex items-center justify-between gap-4 border-b border-paper/10 pb-5">
          <Link
            href="/"
            className="inline-flex h-11 items-center gap-2 border border-paper/14 px-3 text-sm font-semibold text-paper/78 transition hover:border-bronze hover:bg-paper/[0.04] hover:text-bronze-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze sm:px-4"
          >
            <ArrowLeft className="size-4" />
            Volver al sitio
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher compact theme="dark" />
            <span className="grid size-10 place-items-center border border-bronze/45 bg-bronze/12 text-sm font-bold text-bronze-light">
              AV
            </span>
            <span className="hidden text-sm font-semibold text-paper/75 sm:block">
              Arqvia Admin
            </span>
          </div>
        </header>

        <div className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)] lg:gap-16 lg:py-12">
          <div className="order-2 max-w-2xl lg:order-1">
            <p className="text-xs font-semibold uppercase text-bronze-light">
              Acceso privado
            </p>
            <h1 className="mt-3 max-w-xl font-serif text-4xl font-semibold leading-[1.08] text-paper sm:text-5xl lg:text-6xl">
              Gestión privada de Arqvia.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-paper/66">
              Acceso interno para administrar consultas, proyectos, servicios y
              contenido comercial desde un entorno protegido.
            </p>

            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 border-y border-paper/10 py-4 text-sm font-semibold text-paper/72">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="size-4 text-bronze-light" aria-hidden="true" />
                Roles protegidos
              </span>
              <span className="inline-flex items-center gap-2">
                <LockKeyhole className="size-4 text-bronze-light" aria-hidden="true" />
                Sin registro público
              </span>
            </div>
            <p className="mt-4 max-w-xl text-sm leading-6 text-paper/55">
              Este acceso es exclusivo para administradores y empleados
              habilitados. No se pueden crear cuentas desde esta pantalla.
            </p>
          </div>

          <div className="order-1 min-w-0 lg:order-2">
            <LoginForm callbackUrl={callbackUrl} />
          </div>
        </div>
      </div>
    </main>
  );
}

function resolveAdminCallbackUrl(value?: string) {
  if (
    value &&
    value.startsWith("/admin") &&
    !value.startsWith("//") &&
    !value.startsWith("/admin/login")
  ) {
    return value;
  }

  return "/admin";
}
