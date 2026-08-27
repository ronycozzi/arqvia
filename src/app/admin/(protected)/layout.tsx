import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  ChevronDown,
  ExternalLink,
  LogOut,
  Menu,
} from "lucide-react";
import { signOut } from "../../../../auth";
import {
  canViewLeadPII,
  getVerifiedAdminSession,
  type AdminRole,
} from "@/lib/admin-auth";
import { AdminNavLink } from "@/components/admin/admin-nav-link";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  AdminNotificationMenu,
  type AdminNotificationItem,
} from "@/components/admin/notification-menu";
import { prisma } from "@/lib/db";
import { leadStatusLabels } from "@/lib/lead-utils";
import { formatDate } from "@/lib/utils";
import {
  adminNavigationGroups,
  getVisibleAdminNavigation,
} from "@/lib/admin-navigation";

const roleLabels: Record<AdminRole, string> = {
  ADMIN: "Administrador",
  EDITOR: "Editor",
  VIEWER: "Solo lectura",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getVerifiedAdminSession();
  if (!session) redirect("/admin/login");

  const role = session.user.role;
  const visibleLinks = getVisibleAdminNavigation(role);
  const quickLinks = visibleLinks.filter(
    (item) => item.href === "/admin" || item.href === "/admin/leads",
  );
  const unreadWhere = session.user.leadNotificationsReadAt
    ? { createdAt: { gt: session.user.leadNotificationsReadAt } }
    : undefined;
  const [unreadNotificationCount, unreadLeads, notificationUndo] =
    await Promise.all([
      prisma.lead.count({ where: unreadWhere }),
      prisma.lead.findMany({
        where: unreadWhere,
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
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          leadNotificationsReadAt: true,
          leadNotificationsUndoAt: true,
          leadNotificationsUndoFor: true,
        },
      }),
    ]);
  const canSeeLeadPII = canViewLeadPII(role);
  const notificationItems: AdminNotificationItem[] = unreadLeads.map((lead) => ({
    createdAt: lead.createdAt.toISOString(),
    createdAtLabel: formatDate(lead.createdAt),
    description: canSeeLeadPII
      ? `${lead.projectType} · ${lead.city}`
      : lead.projectType,
    href: `/admin/leads/${lead.id}`,
    id: lead.id,
    statusLabel:
      lead.status === "NEW" ? "Sin contactar" : leadStatusLabels[lead.status],
    title: canSeeLeadPII
      ? lead.name
      : `Consulta ${lead.id.slice(-6).toUpperCase()}`,
  }));
  const initialUndoPayload =
    notificationUndo?.leadNotificationsUndoFor &&
    notificationUndo.leadNotificationsReadAt?.getTime() ===
      notificationUndo.leadNotificationsUndoFor.getTime()
      ? {
          markedAt: notificationUndo.leadNotificationsUndoFor.toISOString(),
          previousReadAt:
            notificationUndo.leadNotificationsUndoAt?.toISOString() ?? null,
        }
      : null;

  return (
    <section className="admin-shell min-h-screen overflow-x-clip bg-[#141815] text-paper">
      <a
        href="#contenido-admin"
        className="sr-only fixed left-4 top-4 z-[120] bg-paper px-4 py-3 text-sm font-semibold text-ink shadow-premium focus:not-sr-only"
      >
        Saltar al contenido del panel
      </a>
      <div className="grid min-h-screen w-full lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside
          aria-label="Navegación administrativa"
          className="hidden border-r border-paper/10 bg-[#181d19] px-5 py-5 lg:sticky lg:top-0 lg:block lg:h-screen lg:overflow-y-auto xl:px-6"
        >
          <div className="flex items-start justify-between gap-4 lg:block">
            <Link href="/admin" className="group flex items-center gap-3">
              <span className="grid size-10 place-items-center border border-bronze/45 bg-bronze/12 text-sm font-bold text-paper transition group-hover:bg-bronze">
                AV
              </span>
              <span>
                <span className="block font-serif text-2xl leading-none">
                  Arqvia
                </span>
                <span className="text-[11px] font-semibold uppercase text-paper/52">
                  Panel comercial
                </span>
              </span>
            </Link>

            <div className="flex gap-2 lg:mt-5">
              <Link
                href="/"
                className="inline-flex h-10 items-center justify-center gap-2 border border-paper/12 px-3 text-xs font-semibold text-paper/78 transition hover:border-bronze hover:text-bronze-light"
              >
                Sitio <ExternalLink className="size-3.5" />
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 border border-paper/12 px-3 text-xs font-semibold text-paper/78 transition hover:border-bronze hover:text-bronze-light"
                  type="submit"
                >
                  <LogOut className="size-3.5" />
                  Salir
                </button>
              </form>
            </div>
            <div className="mt-4">
              <LanguageSwitcher compact theme="dark" />
            </div>
          </div>

          <div className="mt-5 border-y border-paper/10 py-4">
            <p className="text-xs font-semibold uppercase text-bronze-light">
              Sesión activa
            </p>
            <p className="mt-2 truncate text-sm font-semibold text-paper">
              {session.user.email}
            </p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="border border-bronze/35 bg-bronze/10 px-2.5 py-1 text-xs font-semibold text-bronze-light">
                {roleLabels[role]}
              </span>
              <span className="text-xs text-paper/52">
                {visibleLinks.length - 1} módulos
              </span>
            </div>
          </div>

          <nav className="mt-5 space-y-5" aria-label="Administración">
            {adminNavigationGroups.map((group) => {
              const links = visibleLinks.filter((item) => item.group === group);
              if (!links.length) return null;

              return (
                <div key={group}>
                  <p className="mb-2 text-[11px] font-semibold uppercase text-paper/42">
                    {group}
                  </p>
                  <div className="grid gap-1.5">
                    {links.map((item) => {
                      const Icon = item.icon;
                      return (
                        <AdminNavLink
                          key={item.href}
                          href={item.href}
                          className="group flex items-start gap-3 border px-3 py-2.5 text-sm transition"
                          activeClassName="border-bronze/55 bg-bronze/12 text-paper"
                          inactiveClassName="border-transparent text-paper/78 hover:border-bronze/40 hover:bg-paper/[0.05] hover:text-paper"
                          exact={item.href === "/admin"}
                        >
                          <Icon className="mt-0.5 size-4 text-bronze-light transition group-hover:scale-110" />
                          <span>
                            <span className="block font-semibold">{item.label}</span>
                            <span className="mt-0.5 block text-xs leading-5 text-paper/45">
                              {item.description}
                            </span>
                          </span>
                        </AdminNavLink>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </aside>

        <main
          id="contenido-admin"
          tabIndex={-1}
          className="min-w-0 w-full bg-mist text-ink focus:outline-none"
        >
          <div className="sticky top-0 z-50 border-b border-paper/10 bg-[#181d19]/[0.98] px-4 py-3 text-paper backdrop-blur lg:hidden">
            <div className="flex items-start justify-between gap-3">
              <Link href="/admin" className="group flex items-center gap-3">
                <span className="grid size-10 place-items-center border border-bronze/45 bg-bronze/12 text-sm font-semibold text-paper transition group-hover:bg-bronze">
                  AV
                </span>
                <span>
                  <span className="block font-serif text-xl leading-none">
                    Arqvia
                  </span>
                  <span className="text-[10px] font-semibold uppercase text-paper/55">
                    Panel comercial
                  </span>
                </span>
              </Link>

              <div className="flex shrink-0 gap-2">
                <Link
                  href="/"
                  className="grid size-10 place-items-center border border-paper/12 text-paper/78 transition hover:border-bronze hover:text-bronze-light"
                  aria-label="Ver sitio público"
                >
                  <ExternalLink className="size-4" />
                </Link>
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/" });
                  }}
                >
                  <button
                    className="grid size-10 place-items-center border border-paper/12 text-paper/78 transition hover:border-bronze hover:text-bronze-light"
                    type="submit"
                    aria-label="Cerrar sesión"
                  >
                    <LogOut className="size-4" />
                  </button>
                </form>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 border-y border-paper/10 py-2.5">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase text-paper/70">
                  Sesión activa
                </p>
                <p className="mt-1 truncate text-xs font-semibold text-paper">
                  {session.user.email}
                </p>
              </div>
              <span className="shrink-0 border border-bronze/35 bg-bronze/12 px-2.5 py-1 text-[11px] font-semibold text-paper">
                {roleLabels[role]}
              </span>
            </div>

            <div className="mt-3 border border-paper/12 bg-paper/[0.035] p-2">
              <LanguageSwitcher compact theme="dark" />
            </div>

            <details className="group mt-3 border border-paper/12 bg-paper/[0.035]">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 text-xs font-semibold text-paper transition hover:border-bronze hover:text-bronze-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-bronze [&::-webkit-details-marker]:hidden">
                <span className="inline-flex items-center gap-2">
                  <Menu className="size-4 text-bronze-light" aria-hidden="true" />
                  Abrir módulos del panel
                </span>
                <ChevronDown
                  className="size-4 transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <nav
                className="grid max-h-[min(62vh,560px)] gap-5 overflow-y-auto border-t border-paper/10 p-3"
                aria-label="Administración mobile"
              >
                {adminNavigationGroups.map((group) => {
                  const links = visibleLinks.filter((item) => item.group === group);
                  if (!links.length) return null;

                  return (
                    <div key={group}>
                      <p className="mb-2 text-[10px] font-semibold uppercase text-paper/45">
                        {group}
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {links.map((item) => {
                          const Icon = item.icon;
                          return (
                            <AdminNavLink
                              key={item.href}
                              href={item.href}
                              className="inline-flex min-h-11 items-center gap-2 border px-3 text-xs font-semibold transition"
                              activeClassName="border-bronze bg-bronze/18 text-paper"
                              inactiveClassName="border-paper/12 bg-paper/[0.05] text-paper/78 hover:border-bronze hover:text-bronze-light"
                              exact={item.href === "/admin"}
                            >
                              <Icon className="size-3.5 shrink-0 text-bronze-light" />
                              <span className="min-w-0 break-words">{item.label}</span>
                            </AdminNavLink>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </nav>
            </details>
          </div>

          <header className="relative z-30 border-b border-ink/10 bg-paper/95 px-5 py-4 backdrop-blur md:px-8">
            <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
              <div>
                <p className="text-xs font-semibold uppercase text-bronze">
                  Gestión de arquitectura, obra e interiores
                </p>
                <h1 className="mt-1 font-serif text-2xl font-semibold leading-tight text-ink md:text-3xl">
                  Panel Arqvia
                </h1>
                <p className="mt-1 hidden max-w-3xl text-sm leading-6 text-ink/64 md:block">
                  Administra consultas, obras, servicios, SEO local y contenido
                  comercial desde un panel preparado para venta y seguimiento.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <AdminNotificationMenu
                  key={`${notificationUndo?.leadNotificationsReadAt?.toISOString() ?? "unread"}:${unreadNotificationCount}`}
                  initialUnreadCount={unreadNotificationCount}
                  initialItems={notificationItems}
                  initialUndoPayload={initialUndoPayload}
                />
                {quickLinks.map((item) => (
                  <AdminNavLink
                    key={item.href}
                    href={item.href}
                    className="inline-flex h-10 items-center gap-2 border px-3 text-xs font-semibold transition hover:-translate-y-0.5"
                    activeClassName="border-bronze bg-bronze-light text-ink"
                    inactiveClassName="border-ink/10 bg-white/70 text-ink hover:border-bronze hover:text-bronze"
                    exact={item.href === "/admin"}
                  >
                    <item.icon className="size-3.5" />
                    {item.label}
                  </AdminNavLink>
                ))}
                <Link
                  href="/contacto"
                  className="inline-flex h-10 items-center gap-2 bg-ink px-3 text-xs font-semibold text-paper transition hover:bg-bronze"
                >
                  Ver formulario <ArrowUpRight className="size-3.5" />
                </Link>
              </div>
            </div>
          </header>

          <div className="min-w-0 px-4 py-5 sm:px-5 md:px-8 md:py-7">{children}</div>
        </main>
      </div>
    </section>
  );
}
