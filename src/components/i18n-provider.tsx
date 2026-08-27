"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { englishContentTranslations } from "@/i18n/content-en";
import { manualEnglishTranslations } from "@/i18n/manual-en";
import type { AppLocale } from "@/lib/locale";

type TranslationDictionary = Record<string, string>;

const I18nContext = createContext<{ locale: AppLocale }>({ locale: "es" });
const translatedAttributes = [
  "alt",
  "aria-description",
  "aria-label",
  "aria-valuetext",
  "content",
  "placeholder",
  "title",
] as const;
const skippedSelector =
  '[data-no-translate], [translate="no"], .notranslate, code, pre, script, style, noscript, textarea, [contenteditable="true"]';
const adminItemLabels: Record<string, string> = {
  "áreas": "areas",
  consultas: "inquiries",
  entregas: "deliveries",
  imágenes: "images",
  integrantes: "team members",
  movimientos: "events",
  preguntas: "questions",
  proyectos: "projects",
  publicaciones: "posts",
  servicios: "services",
  testimonios: "testimonials",
  usuarios: "users",
  visitas: "visits",
};
const spanishMonths: Record<string, string> = {
  abr: "Apr",
  ago: "Aug",
  dic: "Dec",
  ene: "Jan",
  feb: "Feb",
  jul: "Jul",
  jun: "Jun",
  mar: "Mar",
  may: "May",
  nov: "Nov",
  oct: "Oct",
  sep: "Sep",
};

function translateSpanishDate(value: string) {
  const match = value.match(/^(\d{1,2}) de ([a-záéíóú]+) de (\d{4})$/i);
  if (!match) return value;

  const month = spanishMonths[match[2].toLocaleLowerCase("es")] || match[2];
  return `${month} ${Number(match[1])}, ${match[3]}`;
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function preserveOuterWhitespace(source: string, translated: string) {
  const leading = source.match(/^\s*/)?.[0] || "";
  const trailing = source.match(/\s*$/)?.[0] || "";
  return `${leading}${translated}${trailing}`;
}

function translateDynamicText(
  value: string,
  dictionary: TranslationDictionary,
) {
  const areaTitleMatch = value.match(
    /^Arquitectura, construcción y remodelaciones en (.+) \| Arqvia$/i,
  );
  if (areaTitleMatch) {
    return `Architecture, construction and renovations in ${areaTitleMatch[1]} | Arqvia`;
  }

  const areaDescriptionMatch = value.match(
    /^(.+\.) Servicios de arquitectura, construcción, remodelaciones e interiores en (.+)\.$/i,
  );
  if (areaDescriptionMatch) {
    const introduction =
      dictionary[areaDescriptionMatch[1]] || areaDescriptionMatch[1];
    return `${introduction} Architecture, construction, renovation and interior services in ${areaDescriptionMatch[2]}.`;
  }

  const serviceLabelMatch = value.match(/^Ver servicio: (.+)$/i);
  if (serviceLabelMatch) {
    const serviceName =
      dictionary[serviceLabelMatch[1]] ||
      dictionary[serviceLabelMatch[1].toLocaleLowerCase("es")] ||
      serviceLabelMatch[1];
    return `View service: ${serviceName}`;
  }

  const showingMatch = value.match(/^Mostrando (\d+) (.+)\.$/i);
  if (showingMatch) {
    const label =
      adminItemLabels[showingMatch[2].toLocaleLowerCase("es")] || showingMatch[2];
    return `Showing ${showingMatch[1]} ${label}.`;
  }

  const paginationMatch = value.match(/^Paginación de (.+)$/i);
  if (paginationMatch) {
    const label =
      adminItemLabels[paginationMatch[1].toLocaleLowerCase("es")] ||
      paginationMatch[1];
    return `${label} pagination`;
  }

  const pageMatch = value.match(/^Página (\d+) de (\d+) · (\d+) (.+)$/i);
  if (pageMatch) {
    const label =
      adminItemLabels[pageMatch[4].toLocaleLowerCase("es")] || pageMatch[4];
    return `Page ${pageMatch[1]} of ${pageMatch[2]} · ${pageMatch[3]} ${label}`;
  }

  const datedItemMatch = value.match(
    /^(.+?) · (.+?) · (\d{1,2}) de ([a-záéíóú]+) de (\d{4})$/i,
  );
  if (datedItemMatch) {
    const projectTypes: Record<string, string> = {
      "obra nueva": "New construction",
      remodelación: "Renovation",
    };
    const type =
      projectTypes[datedItemMatch[1].toLocaleLowerCase("es")] ||
      datedItemMatch[1];
    return `${type} · ${datedItemMatch[2]} · ${translateSpanishDate(
      `${datedItemMatch[3]} de ${datedItemMatch[4]} de ${datedItemMatch[5]}`,
    )}`;
  }

  const latestActivityMatch = value.match(
    /^Última actividad registrada el (\d{1,2} de [a-záéíóú]+ de \d{4}): (.+)$/i,
  );
  if (latestActivityMatch) {
    const summaryRules: Array<[RegExp, string]> = [
      [/^Exportó (\d+) leads en CSV\.$/i, "Exported $1 leads to CSV."],
      [/^Configuración de marca actualizada por (.+)$/i, "Brand settings updated by $1"],
      [/^Eliminó categoría de proyectos: (.+)$/i, "Deleted project category: $1"],
      [/^Creó categoría de proyectos: (.+)$/i, "Created project category: $1"],
      [/^Cerró todas las sesiones de (.+)$/i, "Signed out all sessions for $1"],
    ];
    let summary = latestActivityMatch[2];
    for (const [pattern, replacement] of summaryRules) {
      if (pattern.test(summary)) {
        summary = summary.replace(pattern, replacement);
        break;
      }
    }
    return `Latest activity recorded on ${translateSpanishDate(latestActivityMatch[1])}: ${summary}`;
  }

  const visitSummaryMatch = value.match(
    /^Visita: (Sí|No) · Planos\/fotos: (Sí|No)$/i,
  );
  if (visitSummaryMatch) {
    const yesNo = (answer: string) => (/^sí$/i.test(answer) ? "Yes" : "No");
    return `Visit: ${yesNo(visitSummaryMatch[1])} · Plans/photos: ${yesNo(visitSummaryMatch[2])}`;
  }

  const readinessMatch = value.match(
    /^(Publicacion lista|Faltan ajustes de publicacion|No publicar todavia|Listo para venta activa|Buen avance, faltan ajustes|Requiere carga comercial) · (?:(\d+) pendientes?|Sin pendientes)$/i,
  );
  if (readinessMatch) {
    const labels: Record<string, string> = {
      "faltan ajustes de publicacion": "Publication settings pending",
      "buen avance, faltan ajustes": "Good progress, adjustments pending",
      "listo para venta activa": "Ready for active sales",
      "no publicar todavia": "Do not publish yet",
      "publicacion lista": "Publication ready",
      "requiere carga comercial": "Commercial content required",
    };
    const label = labels[readinessMatch[1].toLocaleLowerCase("es")];
    return readinessMatch[2]
      ? `${label} · ${readinessMatch[2]} pending items`
      : `${label} · No pending items`;
  }

  const rules: Array<[RegExp, string]> = [
    [/^Página (\d+) de (\d+)$/i, "Page $1 of $2"],
    [/^(\d+) módulos$/i, "$1 modules"],
    [/^Galería de (.+)$/i, "$1 gallery"],
    [/^Editar (.+)$/i, "Edit $1"],
    [/^Eliminar (.+)$/i, "Delete $1"],
    [/^Volver a (.+)$/i, "Back to $1"],
    [/^Consulta (.+)$/i, "Inquiry $1"],
    [/^(\d+)% antes \/ (\d+)% después$/i, "$1% before / $2% after"],
    [/^¿Arqvia evalúa proyectos en (.+)\?$/i, "Does Arqvia assess projects in $1?"],
    [
      /^Sí\. Primero revisamos ubicación, tipo de proyecto, superficie, etapa actual y alcance para confirmar disponibilidad de trabajo en (.+)\.$/i,
      "Yes. We first review the location, project type, area, current stage and scope to confirm availability in $1.",
    ],
    [
      /^¿Cómo empieza una consulta para una obra en (.+)\?$/i,
      "How does a construction consultation in $1 begin?",
    ],
    [/^Solicitar presupuesto en (.+)$/i, "Request a quote in $1"],
    [/^(\d+) usuarios activos?$/i, "$1 active users"],
    [/^(\d+) módulos disponibles$/i, "$1 available modules"],
    [/^1 visita$/i, "1 visit"],
    [/^(\d+) visitas$/i, "$1 visits"],
    [/^(\d+) usuario activo puede operar el panel\.$/i, "$1 active user can operate the admin panel."],
    [/^(\d+) usuarios activos pueden operar el panel\.$/i, "$1 active users can operate the admin panel."],
    [
      /^(\d+) casos listos para mostrar alcance, técnica y resultado\.$/i,
      "$1 case studies are ready to show scope, technical decisions and results.",
    ],
    [
      /^(\d+) servicios tienen copy, SEO, FAQ y prueba suficiente\.$/i,
      "$1 services have complete copy, SEO, FAQs and supporting proof.",
    ],
    [
      /^(\d+) preguntas ayudan a reducir dudas antes de consultar\.$/i,
      "$1 questions help resolve concerns before an inquiry.",
    ],
    [/^Mostrando (\d+) consultas?\.$/i, "Showing $1 inquiries."],
    [/^(\d+) resultados$/i, "$1 results"],
    [/^CSV completo: 1 consulta, sin recorte\.$/i, "Full CSV: 1 inquiry, no truncation."],
    [/^CSV completo: (\d+) consultas, sin recorte\.$/i, "Full CSV: $1 inquiries, no truncation."],
    [
      /^Revisión comercial: Listo para venta activa$/i,
      "Commercial review: Ready for active sales",
    ],
    [
      /^CTAs activos: Solicitar presupuesto \/ Ver proyectos\.$/i,
      "Active CTAs: Request a quote / View projects.",
    ],
    [
      /^El proveedor actual es ([^;]+); los archivos locales no sobreviven a todos los despliegues\.$/i,
      "The current provider is $1; local files do not persist across every deployment.",
    ],
    [
      /^(\d+) control(?:es)? requiere(?:n)? atención antes de publicar\.$/i,
      "$1 controls require attention before publishing.",
    ],
  ];

  for (const [pattern, replacement] of rules) {
    if (pattern.test(value)) return value.replace(pattern, replacement);
  }

  return value;
}

function matchSourceCase(source: string, translated: string) {
  const letters = source.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g)?.join("") || "";
  if (letters && letters === letters.toLocaleUpperCase("es")) {
    return translated.toLocaleUpperCase("en");
  }

  const firstLetter = source.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/)?.[0];
  if (firstLetter && firstLetter === firstLetter.toLocaleLowerCase("es")) {
    return translated.replace(/[A-Za-z]/, (letter) => letter.toLocaleLowerCase("en"));
  }

  return translated;
}

function translateValue(value: string, dictionary: TranslationDictionary) {
  const normalized = normalizeText(value);
  if (!normalized) return value;

  const exactTranslation = dictionary[normalized];
  const caseInsensitiveTranslation = dictionary[normalized.toLocaleLowerCase("es")];
  const translated =
    exactTranslation ||
    (caseInsensitiveTranslation
      ? matchSourceCase(normalized, caseInsensitiveTranslation)
      : translateDynamicText(normalized, dictionary));
  return translated === normalized
    ? value
    : preserveOuterWhitespace(value, translated);
}

function shouldSkip(element: Element | null) {
  return Boolean(element?.closest(skippedSelector));
}

function translateTextNode(node: Text, dictionary: TranslationDictionary) {
  if (!node.nodeValue || shouldSkip(node.parentElement)) return;

  const translated = translateValue(node.nodeValue, dictionary);
  if (translated !== node.nodeValue) node.nodeValue = translated;
}

function translateElementAttributes(
  element: Element,
  dictionary: TranslationDictionary,
) {
  if (shouldSkip(element)) return;

  for (const attribute of translatedAttributes) {
    const value = element.getAttribute(attribute);
    if (!value) continue;

    const translated = translateValue(value, dictionary);
    if (translated !== value) element.setAttribute(attribute, translated);
  }

  if (
    element instanceof HTMLInputElement &&
    (element.type === "button" || element.type === "submit")
  ) {
    element.value = translateValue(element.value, dictionary);
  }
}

function translateElement(element: Element, dictionary: TranslationDictionary) {
  if (shouldSkip(element)) return;

  translateElementAttributes(element, dictionary);
  for (const descendant of element.querySelectorAll("*")) {
    translateElementAttributes(descendant, dictionary);
  }

  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    translateTextNode(current as Text, dictionary);
    current = walker.nextNode();
  }
}

function revealDocument(locale: AppLocale) {
  document.documentElement.lang = locale === "en" ? "en" : "es-AR";
  document.documentElement.dataset.locale = locale;
  document.documentElement.classList.remove("i18n-pending");
  document.documentElement.classList.add("i18n-ready");
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<AppLocale>("es");

  useEffect(() => {
    const requestedLocale =
      document.documentElement.dataset.locale === "en" ? "en" : "es";

    if (requestedLocale === "es") {
      revealDocument("es");
      return;
    }

    let observer: MutationObserver | null = null;
    let revealFrame = 0;
    let startTimer = 0;
    let cancelled = false;

    const startTranslation = () => {
      startTimer = window.setTimeout(() => {
        void import("@/i18n/generated/en.json")
          .then((module) => {
            if (cancelled) return;

            const exactDictionary: TranslationDictionary = {
              ...(module.default as TranslationDictionary),
              ...englishContentTranslations,
              ...manualEnglishTranslations,
            };
            const dictionary: TranslationDictionary = { ...exactDictionary };
            for (const [source, translated] of Object.entries(exactDictionary)) {
              const normalizedSource = source.toLocaleLowerCase("es");
              if (!dictionary[normalizedSource]) dictionary[normalizedSource] = translated;
            }
            translateElement(document.documentElement, dictionary);
            setLocale("en");

            observer = new MutationObserver((mutations) => {
              for (const mutation of mutations) {
                if (mutation.type === "characterData") {
                  translateTextNode(mutation.target as Text, dictionary);
                  continue;
                }

                if (mutation.type === "attributes") {
                  translateElementAttributes(
                    mutation.target as Element,
                    dictionary,
                  );
                  continue;
                }

                for (const node of mutation.addedNodes) {
                  if (node.nodeType === Node.TEXT_NODE) {
                    translateTextNode(node as Text, dictionary);
                  } else if (node instanceof Element) {
                    translateElement(node, dictionary);
                  }
                }
              }
            });
            observer.observe(document.documentElement, {
              attributeFilter: [...translatedAttributes],
              attributes: true,
              characterData: true,
              childList: true,
              subtree: true,
            });

            revealFrame = window.requestAnimationFrame(() => revealDocument("en"));
          })
          .catch(() => {
            revealDocument("es");
          });
      }, 500);
    };

    if (document.readyState === "complete") {
      startTranslation();
    } else {
      window.addEventListener("load", startTranslation, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", startTranslation);
      observer?.disconnect();
      window.clearTimeout(startTimer);
      window.cancelAnimationFrame(revealFrame);
    };
  }, []);

  const context = useMemo(() => ({ locale }), [locale]);

  return <I18nContext.Provider value={context}>{children}</I18nContext.Provider>;
}

export function useAppLocale() {
  return useContext(I18nContext).locale;
}
