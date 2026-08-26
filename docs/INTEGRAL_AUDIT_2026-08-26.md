# Auditoría integral de Arqvia

Fecha: 2026-08-26

## Alcance

La revisión cubrió el sitio público, el panel administrativo, autenticación,
roles, formularios, archivos, datos, SEO, PWA, analítica, accesibilidad,
seguridad, rendimiento, pruebas, operación local y preview de Vercel.

Superficies verificadas:

- 55 rutas públicas descubiertas desde sitemap y enlaces internos.
- Home, portfolio, detalle de obra, servicios, contacto, blog, páginas locales,
  legales, FAQ, proceso, nosotros, agradecimiento y 404.
- 21 rutas principales del panel en escritorio y cinco superficies críticas en
  móvil.
- Roles Admin, Editor y Viewer, revocación de sesiones y ausencia de registro
  público.
- Altas y publicaciones de proyectos, servicios, blog, FAQ, testimonios,
  equipo, zonas y páginas institucionales.
- Consultas, visitas técnicas, adjuntos, exportaciones, automatizaciones,
  concurrencia editorial y privacidad.

## Correcciones realizadas

### Interfaz y marca

- Se eliminó un desborde horizontal móvil de 6 px causado por transformaciones
  laterales de scroll reveal antes de hacerse visibles.
- El movimiento lateral se conserva sólo desde 768 px; móvil usa entrada
  vertical y mantiene `prefers-reduced-motion`.
- Se reforzó el contraste de los indicadores de confianza del hero.
- Todos los títulos de navegador incorporan Arqvia una sola vez, incluso cuando
  la página define un título absoluto.
- Los títulos de Open Graph y Twitter de proyectos, servicios, artículos,
  zonas y páginas locales también incorporan Arqvia de forma consistente.
- Los estados de carga dejaron de emitir un segundo H1 en el HTML inicial y se
  anuncian mediante `role=status` sin competir con el encabezado definitivo.
- El hero mantiene la imagen 4K, sin seguimiento del cursor, con prioridad de
  carga, recorte responsive y sin imágenes rotas.

### Contenido, SEO y datos públicos

- Se corrigió la configuración canónica del preview para que las rutas
  dinámicas no expongan un email reservado ni un teléfono incompleto.
- Se agregó una compuerta de integridad para email, teléfono, WhatsApp, zona y
  horarios. El build PostgreSQL ejecuta esa validación antes de compilar.
- Se agregó `audit:public`, que recorre sitemap y rutas enlazadas, valida 404,
  títulos, H1, canonical, enlaces internos, contacto, copy interno y
  duplicados.
- GitHub Actions levanta el build y ejecuta ese auditor antes del build estricto,
  por lo que estas garantías forman parte del control de cada push.
- Se comprobó LocalBusiness/HomeAndConstructionBusiness en home y los schemas
  de Service, FAQ, Article, Breadcrumb y proyectos en sus rutas.

### Toolchain y operación

- `test` y `build` regeneran el cliente Prisma local antes de ejecutarse para
  evitar mezclar clientes generados desde SQLite y PostgreSQL.
- El control de health/readiness usa 15 segundos por defecto, configurable y
  acotado, para tolerar cold starts reales sin ocultar fallos.
- Se actualizó `deepmerge-ts` mediante override a una versión sin la
  vulnerabilidad detectada. El audit productivo informa cero vulnerabilidades.
- El build de PostgreSQL ahora incluye control de integridad editorial.

## Evidencia de verificación

- `npm run verify`: PASS.
- Secret scan: 506 archivos de texto, PASS.
- Vitest: 108 archivos, 544 pruebas, PASS.
- Integridad editorial: 4 proyectos, 11 servicios, 10 guías y 19 medios, PASS.
- Build Next.js: 82 páginas/rutas, PASS.
- Playwright: 302 escenarios; 264 PASS, 38 SKIP intencionales, 0 FAIL. Luego se
  repitieron 24 casos de regresión de portfolio y Axe en desktop y mobile,
  también aprobados.
- Residuo E2E en base y uploads: PASS.
- Auditor público local: 55 rutas, sitemap y 404, PASS.
- Health y readiness locales: HTTP 200 y contrato JSON, PASS.
- Health, readiness y login administrativo en Preview: PASS; se verificaron el
  dashboard, la ruta protegida de Estado y el viewport móvil sin overflow.
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilidades.
- Navegador a 1440 px y 390 px: 0 overflow, 0 imágenes rotas, 0 errores de
  consola, un H1 por ruta y títulos con Arqvia.
- Lighthouse desktop: Performance 99, Accessibility 100, Best Practices 100,
  SEO 100.
- Lighthouse móvil, mediana de tres corridas: Performance 85, Accessibility
  100, Best Practices 100, SEO 100; FCP 1,25 s, LCP 4,22 s, TBT 121 ms, CLS 0.
- Lighthouse móvil sobre el preview HTTPS, sin la Toolbar externa de Vercel:
  Performance 92, Accessibility 100, Best Practices 100, SEO 100; FCP 1,0 s,
  LCP 3,1 s, TBT 130 ms, CLS 0.
- Restore SQLite: integridad, checksum, tablas y 22 conteos sobre una copia de
  1.396.736 bytes, PASS.
- Schema PostgreSQL generado y validado. Las 20 migraciones están aplicadas en
  Preview; la base productiva continúa sin promoverse.

Durante la navegación automatizada, Next 16.3.3 registró cierres tempranos de
streams RSC cuando Playwright canceló navegaciones. No hubo respuesta fallida,
error de cliente, prueba fallida ni residuo. El comportamiento coincide con el
bug abierto de Next.js `vercel/next.js#96704`; no se silenció ni se trató como
un fallo de aplicación.

## Estado de lanzamiento

El preview técnico está disponible en `https://arqvia-preview.vercel.app`.
Producción comercial permanece bloqueada por 13 controles reales:

1. Dominio HTTPS final y orígenes coincidentes.
2. Secretos finales y retiro del bootstrap administrativo.
3. WhatsApp y datos comerciales definitivos con aprobación.
4. PostgreSQL productivo y migraciones aplicadas.
5. Storage persistente S3 compatible y prueba de ciclo completo.
6. Worker protegido para borrado físico de objetos privados.
7. Analítica GA4 o GTM configurada bajo consentimiento.
8. Rate limiting distribuido y proveedor de proxy confiable.
9. Aprobación editorial del contenido definitivo.
10. Derechos y trazabilidad de cada recurso visual.
11. Publicación y revisión profesional de documentos legales.
12. Política y scheduler de retención aprobados.
13. Evidencia operativa de restore y PWA sobre HTTPS/dispositivos reales.

Estos bloqueos no indican funciones faltantes del código. Evitan presentar como
producción una instalación que todavía usa datos comerciales genéricos y no
cuenta con aprobaciones o infraestructura definitiva.
