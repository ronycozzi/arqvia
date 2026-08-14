const serviceProjectSlugs: Record<string, readonly string[]> = {
  ampliaciones: ["casa-patio-norte"],
  "construccion-llave-en-mano": ["casa-patio-norte"],
  "direccion-administracion-obra": ["local-sierra", "casa-patio-norte"],
  "diseno-arquitectonico": ["casa-patio-norte"],
  "diseno-interior": ["oficina-umbral", "cocina-terracota"],
  "documentacion-tecnica": ["casa-patio-norte", "local-sierra"],
  "locales-comerciales": ["local-sierra"],
  oficinas: ["oficina-umbral"],
  "relevamiento-diagnostico": ["casa-patio-norte", "cocina-terracota"],
  "remodelaciones-integrales": ["cocina-terracota"],
  "renders-visualizacion": ["casa-patio-norte", "oficina-umbral"],
};

export function getRecommendedProjectSlugs(serviceSlug: string) {
  return serviceProjectSlugs[serviceSlug] ?? [];
}

export function getAvailableServiceProjectSlugs({
  availableProjectSlugs,
  directProjectSlugs,
  serviceSlug,
}: {
  availableProjectSlugs: readonly string[];
  directProjectSlugs: readonly string[];
  serviceSlug: string;
}) {
  const available = new Set(availableProjectSlugs);
  const candidates = new Set([
    ...directProjectSlugs,
    ...getRecommendedProjectSlugs(serviceSlug),
  ]);

  return [...candidates].filter((slug) => available.has(slug));
}
