export type AdminReadinessInput = {
  areaCount: number;
  blogCount: number;
  contactedCount: number;
  faqCount: number;
  leadCount: number;
  newCount: number;
  projectCount: number;
  quotedCount: number;
  readyProjects: number;
  readyServices: number;
  reviewProjects: number;
  reviewServices: number;
  serviceCount: number;
  teamCount: number;
  testimonialCount: number;
  userCount: number;
  wonCount: number;
};

export type AdminReadinessCheck = {
  action: string;
  detail: string;
  href: string;
  label: string;
  ok: boolean;
  weight: number;
};

export type AdminReadinessResult = {
  checks: AdminReadinessCheck[];
  label: string;
  nextActions: AdminReadinessCheck[];
  score: number;
  status: "strong" | "review" | "weak";
  summary: string;
};

function ratioScore(checks: AdminReadinessCheck[]) {
  const total = checks.reduce((sum, check) => sum + check.weight, 0);
  const passed = checks.reduce(
    (sum, check) => sum + (check.ok ? check.weight : 0),
    0,
  );

  return total ? Math.round((passed / total) * 100) : 0;
}

export function buildAdminReadiness(
  input: AdminReadinessInput,
): AdminReadinessResult {
  const checks: AdminReadinessCheck[] = [
    {
      label: "Portfolio con prueba comercial",
      ok: input.readyProjects >= 3,
      detail:
        input.readyProjects >= 3
          ? `${input.readyProjects} casos listos para mostrar alcance, técnica y resultado.`
          : `Hay ${input.readyProjects} casos listos. Conviene llegar a 3 o más para sostener confianza.`,
      href: "/admin/projects",
      action: "Revisar proyectos",
      weight: 18,
    },
    {
      label: "Servicios con páginas completas",
      ok: input.readyServices >= 4,
      detail:
        input.readyServices >= 4
          ? `${input.readyServices} servicios tienen copy, SEO, FAQ y prueba suficiente.`
          : `Hay ${input.readyServices} servicios listos. Priorizá los servicios que más consultas generan.`,
      href: "/admin/services",
      action: "Mejorar servicios",
      weight: 16,
    },
    {
      label: "Confianza visible",
      ok: input.testimonialCount >= 3 && input.teamCount >= 1,
      detail:
        input.testimonialCount >= 3 && input.teamCount >= 1
          ? "El sitio muestra equipo y testimonios suficientes para una decision de alto valor."
          : `Testimonios: ${input.testimonialCount}. Equipo visible: ${input.teamCount}.`,
      href: input.testimonialCount < 3 ? "/admin/testimonials" : "/admin/team",
      action: "Fortalecer confianza",
      weight: 14,
    },
    {
      label: "Cobertura local",
      ok: input.areaCount >= 5,
      detail:
        input.areaCount >= 5
          ? `${input.areaCount} zonas activas cubren busquedas locales clave.`
          : `Hay ${input.areaCount} zonas activas. Sumá áreas reales de trabajo para SEO local.`,
      href: "/admin/areas",
      action: "Completar zonas",
      weight: 12,
    },
    {
      label: "Objeciones cubiertas",
      ok: input.faqCount >= 8,
      detail:
        input.faqCount >= 8
          ? `${input.faqCount} preguntas ayudan a reducir dudas antes de consultar.`
          : `Hay ${input.faqCount} preguntas. Agregá respuestas sobre tiempos, presupuesto, visitas y alcance.`,
      href: "/admin/faq",
      action: "Ampliar FAQ",
      weight: 10,
    },
    {
      label: "Autoridad editorial",
      ok: input.blogCount >= 3,
      detail:
        input.blogCount >= 3
          ? `${input.blogCount} guías publicadas apoyan búsquedas informativas.`
          : `Hay ${input.blogCount} guias. Publicá contenidos sobre costos, proceso y decisiones previas.`,
      href: "/admin/blog",
      action: "Publicar guias",
      weight: 8,
    },
    {
      label: "CRM en movimiento",
      ok: input.leadCount === 0 || input.newCount < input.leadCount,
      detail:
        input.leadCount === 0
          ? "Todavia no hay consultas para gestionar."
          : `${input.newCount} nuevas, ${input.contactedCount} contactadas, ${input.quotedCount} presupuestadas y ${input.wonCount} ganadas.`,
      href: "/admin/leads",
      action: "Gestionar consultas",
      weight: 14,
    },
    {
      label: "Equipo operativo del panel",
      ok: input.userCount >= 1,
      detail:
        input.userCount >= 1
          ? `${input.userCount} usuario activo puede operar el panel.`
          : "Creá al menos un usuario activo para operar el panel con trazabilidad.",
      href: "/admin/users",
      action: "Revisar usuarios",
      weight: 8,
    },
  ];

  const score = ratioScore(checks);
  const status = score >= 82 ? "strong" : score >= 58 ? "review" : "weak";
  const nextActions = checks.filter((check) => !check.ok).slice(0, 4);

  return {
    checks,
      label:
      status === "strong"
        ? "Listo para venta activa"
        : status === "review"
          ? "Buen avance, faltan ajustes"
          : "Requiere carga comercial",
    nextActions,
    score,
    status,
    summary:
      status === "strong"
        ? "La base comercial cubre prueba de trabajo, servicios, confianza, SEO local y seguimiento de consultas."
        : status === "review"
          ? "El sitio ya puede presentarse, pero conviene cerrar los puntos pendientes antes de empujar campañas."
          : "Faltan piezas importantes para sostener confianza y convertir consultas calificadas.",
  };
}
