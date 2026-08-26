const staticSourceLabels = new Map<string, string>([
  ["/", "inicio"],
  ["/proyectos", "portfolio de proyectos"],
  ["/servicios", "servicios"],
  ["/proceso", "proceso de trabajo"],
  ["/nosotros", "estudio"],
  ["/blog", "guías"],
  ["/faq", "preguntas frecuentes"],
  ["/estimador", "estimador de inversión"],
]);

const sourceWithSectionLabels = new Map<string, string>([
  ["/#home-before-after", "comparador antes y después"],
]);

export type ContactSource = {
  label: string;
  sourcePage: string;
};

export function resolveContactSource(
  value: string | undefined,
  dynamicLabels: ReadonlyMap<string, string>,
): ContactSource {
  const candidate = value?.trim() || "";

  if (sourceWithSectionLabels.has(candidate)) {
    return {
      label: sourceWithSectionLabels.get(candidate) || "",
      sourcePage: candidate,
    };
  }

  const pathname = candidate.split(/[?#]/, 1)[0] || "";
  const label = staticSourceLabels.get(pathname) || dynamicLabels.get(pathname);

  if (label) return { label, sourcePage: pathname };
  return { label: "", sourcePage: "/contacto" };
}
