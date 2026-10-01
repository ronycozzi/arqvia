import type { MetadataRoute } from "next";
import { withBasePath } from "@/lib/base-path";
import { buildBrandTheme } from "@/lib/brand-theme";
import { getClientConfig } from "@/lib/client-config";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const config = await getClientConfig();
  const theme = buildBrandTheme(config);

  return {
    name: `${config.companyName} - Arquitectura, obra e interiores`,
    short_name: config.companyName,
    description: config.heroSubtitle,
    // Under a base path the app must never claim the whole host: scope and
    // start URL stay inside the prefix.
    start_url: withBasePath("/"),
    scope: withBasePath("/"),
    display: "standalone",
    background_color: theme.background,
    theme_color: theme.graphite,
    lang: "es-AR",
    categories: ["business", "design", "productivity"],
    icons: [
      {
        src: withBasePath("/icons/arqvia-192.png"),
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: withBasePath("/icons/arqvia-512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: withBasePath("/icons/arqvia-maskable-512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Ver proyectos",
        short_name: "Proyectos",
        description: `Abrir el portfolio de obras de ${config.companyName}.`,
        url: withBasePath("/proyectos"),
      },
      {
        name: "Explorar servicios",
        short_name: "Servicios",
        description: "Revisar servicios de arquitectura, obra e interiores.",
        url: withBasePath("/servicios"),
      },
      {
        name: "Solicitar presupuesto",
        short_name: "Presupuesto",
        description: "Contar los datos iniciales de un proyecto.",
        url: withBasePath("/contacto"),
      },
    ],
  };
}
