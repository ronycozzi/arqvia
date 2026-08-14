import {
  Activity,
  BarChart3,
  BookOpenText,
  Building2,
  CalendarDays,
  Calculator,
  ClipboardList,
  FileText,
  Gauge,
  HelpCircle,
  Home,
  ImageIcon,
  LayoutTemplate,
  Layers3,
  MapPin,
  MessageSquareQuote,
  Scale,
  Settings,
  ShieldCheck,
  Users,
  Webhook,
  type LucideIcon,
} from "lucide-react";
import {
  adminOnlyRoles,
  contentManagerRoles,
  signedInAdminRoles,
  type AdminRole,
} from "@/lib/admin-role-policy";

export const adminNavigationGroups = [
  "Operación",
  "Contenido",
  "Sistema",
] as const;

export type AdminNavigationGroup = (typeof adminNavigationGroups)[number];

export type AdminNavigationItem = {
  description: string;
  group: AdminNavigationGroup;
  hiddenFromMenu?: boolean;
  href: string;
  icon: LucideIcon;
  label: string;
  manageRoles: readonly AdminRole[];
  roles: readonly AdminRole[];
};

export const adminNavigationItems: readonly AdminNavigationItem[] = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: Home,
    group: "Operación",
    description: "Resumen comercial y actividad reciente",
    manageRoles: [],
    roles: signedInAdminRoles,
  },
  {
    label: "Leads",
    href: "/admin/leads",
    icon: Users,
    group: "Operación",
    description: "Consultas, estados y seguimiento",
    manageRoles: adminOnlyRoles,
    roles: signedInAdminRoles,
  },
  {
    label: "Visitas",
    href: "/admin/visitas",
    icon: CalendarDays,
    group: "Operación",
    description: "Agenda, responsables y confirmaciones",
    manageRoles: adminOnlyRoles,
    roles: adminOnlyRoles,
  },
  {
    label: "Reportes",
    href: "/admin/reports",
    icon: BarChart3,
    group: "Operación",
    description: "Lectura de oportunidades y fuentes",
    manageRoles: adminOnlyRoles,
    roles: adminOnlyRoles,
  },
  {
    label: "Estimador",
    href: "/admin/estimador",
    icon: Calculator,
    group: "Operación",
    description: "Rangos, mínimos y niveles de inversión",
    hiddenFromMenu: true,
    manageRoles: adminOnlyRoles,
    roles: adminOnlyRoles,
  },
  {
    label: "Proyectos",
    href: "/admin/projects",
    icon: Building2,
    group: "Contenido",
    description: "Portfolio y casos de estudio",
    manageRoles: contentManagerRoles,
    roles: signedInAdminRoles,
  },
  {
    label: "Home",
    href: "/admin/home",
    icon: LayoutTemplate,
    group: "Contenido",
    description: "Mensaje comercial, métricas y recorrido principal",
    manageRoles: contentManagerRoles,
    roles: signedInAdminRoles,
  },
  {
    label: "Páginas",
    href: "/admin/pages",
    icon: FileText,
    group: "Contenido",
    description: "Nosotros, proceso y contenido institucional",
    manageRoles: contentManagerRoles,
    roles: signedInAdminRoles,
  },
  {
    label: "Servicios",
    href: "/admin/services",
    icon: ClipboardList,
    group: "Contenido",
    description: "Páginas comerciales y SEO",
    manageRoles: contentManagerRoles,
    roles: signedInAdminRoles,
  },
  {
    label: "Categorías",
    href: "/admin/categories",
    icon: Layers3,
    group: "Contenido",
    description: "Orden para servicios y obras",
    manageRoles: contentManagerRoles,
    roles: signedInAdminRoles,
  },
  {
    label: "Imágenes",
    href: "/admin/media",
    icon: ImageIcon,
    group: "Contenido",
    description: "Biblioteca visual y recursos",
    manageRoles: contentManagerRoles,
    roles: signedInAdminRoles,
  },
  {
    label: "Testimonios",
    href: "/admin/testimonials",
    icon: MessageSquareQuote,
    group: "Contenido",
    description: "Prueba social publicada",
    manageRoles: contentManagerRoles,
    roles: signedInAdminRoles,
  },
  {
    label: "Equipo",
    href: "/admin/team",
    icon: Users,
    group: "Contenido",
    description: "Perfiles visibles en el sitio",
    manageRoles: contentManagerRoles,
    roles: signedInAdminRoles,
  },
  {
    label: "Áreas",
    href: "/admin/areas",
    icon: MapPin,
    group: "Contenido",
    description: "Zonas locales y SEO",
    manageRoles: contentManagerRoles,
    roles: signedInAdminRoles,
  },
  {
    label: "FAQ",
    href: "/admin/faq",
    icon: HelpCircle,
    group: "Contenido",
    description: "Objeciones y respuestas",
    manageRoles: contentManagerRoles,
    roles: signedInAdminRoles,
  },
  {
    label: "Blog",
    href: "/admin/blog",
    icon: BookOpenText,
    group: "Contenido",
    description: "Guías y autoridad local",
    manageRoles: contentManagerRoles,
    roles: signedInAdminRoles,
  },
  {
    label: "Legales",
    href: "/admin/legal",
    icon: Scale,
    group: "Sistema",
    description: "Privacidad, términos, cookies y presupuestos",
    manageRoles: adminOnlyRoles,
    roles: adminOnlyRoles,
  },
  {
    label: "Estado",
    href: "/admin/system",
    icon: Gauge,
    group: "Sistema",
    description: "Infraestructura e integraciones",
    manageRoles: adminOnlyRoles,
    roles: adminOnlyRoles,
  },
  {
    label: "Actividad",
    href: "/admin/activity",
    icon: Activity,
    group: "Sistema",
    description: "Historial de cambios",
    manageRoles: adminOnlyRoles,
    roles: adminOnlyRoles,
  },
  {
    label: "Automatizaciones",
    href: "/admin/automations",
    icon: Webhook,
    group: "Sistema",
    description: "Entregas a CRM y sistemas externos",
    manageRoles: adminOnlyRoles,
    roles: adminOnlyRoles,
  },
  {
    label: "Usuarios",
    href: "/admin/users",
    icon: ShieldCheck,
    group: "Sistema",
    description: "Roles y accesos",
    manageRoles: adminOnlyRoles,
    roles: adminOnlyRoles,
  },
  {
    label: "Configuración",
    href: "/admin/settings",
    icon: Settings,
    group: "Sistema",
    description: "Marca, contacto y WhatsApp",
    manageRoles: adminOnlyRoles,
    roles: adminOnlyRoles,
  },
] as const;

export function canAccessAdminItem(
  item: AdminNavigationItem,
  role: AdminRole,
) {
  return item.roles.includes(role);
}

export function canManageAdminItem(
  item: AdminNavigationItem,
  role: AdminRole,
) {
  return item.manageRoles.includes(role);
}

export function getVisibleAdminNavigation(role: AdminRole) {
  return adminNavigationItems.filter(
    (item) => !item.hiddenFromMenu && canAccessAdminItem(item, role),
  );
}

export function canAccessAdminHref(href: string, role: AdminRole) {
  const pathname = href.split(/[?#]/, 1)[0];
  if (!pathname.startsWith("/admin")) return true;

  const item = [...adminNavigationItems]
    .sort((left, right) => right.href.length - left.href.length)
    .find(
      (candidate) =>
        pathname === candidate.href ||
        (candidate.href !== "/admin" &&
          pathname.startsWith(`${candidate.href}/`)),
    );

  return item ? canAccessAdminItem(item, role) : false;
}

export function canManageAdminHref(href: string, role: AdminRole) {
  const item = getAdminNavigationItem(href);
  return item ? canManageAdminItem(item, role) : false;
}

function getAdminNavigationItem(href: string) {
  const pathname = href.split(/[?#]/, 1)[0];
  return [...adminNavigationItems]
    .sort((left, right) => right.href.length - left.href.length)
    .find(
      (candidate) =>
        pathname === candidate.href ||
        (candidate.href !== "/admin" && pathname.startsWith(`${candidate.href}/`)),
    );
}

export function getAdminPermissionHint(
  item: AdminNavigationItem,
  role: AdminRole,
) {
  if (item.href === "/admin/leads") {
    return role === "ADMIN" ? "Gestionar consultas" : "Lectura protegida";
  }

  if (!canManageAdminItem(item, role)) return "Lectura disponible";
  if (item.group === "Contenido") {
    return "Crear y editar";
  }

  if (item.href === "/admin/activity") return "Historial completo";
  if (item.group === "Sistema") return "Gestión completa";
  return "Acción operativa";
}
