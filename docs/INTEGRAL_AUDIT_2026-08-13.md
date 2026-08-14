# Auditoria integral de Arqvia

Fecha: 2026-08-13
Alcance: sitio publico, panel administrativo, autenticacion, datos, formularios, SEO, analitica, seguridad, pruebas y operacion.

## 1. Resumen ejecutivo

Arqvia es un sitio comercial para arquitectura, obra e interiores en Cordoba. La conversion principal es una solicitud de presupuesto persistida como lead; WhatsApp y la visita tecnica son conversiones secundarias. La aplicacion local quedo compilable, probada y operable, pero no debe publicarse hasta completar los controles externos y comerciales del gate de lanzamiento.

Estado verificable:

- `BUILD_PASSES`: si, Next.js 16.3.0 genero 82 rutas.
- `UNIT_TESTED`: si, 444 pruebas en 92 archivos.
- `E2E_VERIFIED`: si, 252 pruebas aprobadas y 38 omisiones intencionales.
- `STAGING_VERIFIED`: no ejecutado; no existe staging autorizado.
- `PRODUCTION_VERIFIED`: no ejecutado; no se desplego.
- Gate tecnico ejecutable: aprobado.
- Gate de lanzamiento: 3 de 14 controles aprobados y 11 bloqueados.

## 2. Estado inicial encontrado

- Repositorio con cambios previos del usuario, preservados durante toda la intervencion.
- Next.js 16.2.10, dependencias de autenticacion y transitivas con avisos de seguridad.
- La hoja global era un artefacto CSS compilado de aproximadamente 109 KB; clases nuevas no se generaban de forma confiable.
- El ciclo de vida administrativo llamaba `revalidatePath` desde `after()`, incompatible con Next.js 16.3 durante el render.
- La actualizacion de notificaciones podia reemplazar el layout y ocultar la accion de deshacer.
- Eventos de conversion y origen de formulario necesitaban limites mas estrictos para evitar PII y URLs arbitrarias.
- Faltaba un recurso del inventario de medios y habia imagenes publicas sin uso.

## 3. Hallazgos y correcciones prioritarias

| Nivel | Evidencia y condicion | Impacto y causa raiz | Solucion, riesgo y validacion |
| --- | --- | --- | --- |
| CRITICO | Acciones en `src/app/admin/(protected)/**/actions.ts` revalidaban dentro de `after()` | Fallos de runtime al guardar desde el panel; uso incompatible con el ciclo de render de Next.js 16.3 | Revalidacion sincrona despues de persistir. Riesgo medio por alcance transversal. Cubierto por unitarias, build y E2E. |
| ALTO | `src/app/globals.css` era salida compilada y no la fuente Tailwind | Estilos nuevos ausentes y regresiones visuales silenciosas | Fuente limpia en `src/app/styles.css` e import unico desde el layout. Riesgo medio. Validado en build y responsive visual. |
| ALTO | Marcar notificaciones y refrescar competian por el layout | La accion de deshacer desaparecia de forma intermitente | Estado local y evento interno; persistencia sin revalidar el layout. Riesgo bajo. Cinco repeticiones y suite E2E aprobadas. |
| ALTO | Analitica aceptaba parametros demasiado amplios | Riesgo de enviar PII y registrar conversiones antes de persistir el lead | Allowlist cerrada y `generate_lead` solo tras respuesta 2xx confirmada. Riesgo bajo. Pruebas unitarias aprobadas. |
| ALTO | `sourcePage` podia conservar query o hash arbitrarios | Datos de origen ruidosos o sensibles en leads | Normalizacion a rutas internas permitidas. Riesgo bajo. Pruebas y E2E aprobados. |
| MEDIO | El login privado no declaraba un `main` | Semantica incompleta para tecnologias de asistencia | Contenedor principal semantico. Riesgo minimo. Lint, tipos y build aprobados. |
| MEDIO | Contrastes de textos secundarios por debajo del objetivo | Lectura dificil en superficies claras y oscuras | Opacidades elevadas conservando la jerarquia. Riesgo visual bajo. Axe en escritorio y mobile aprobado. |
| MEDIO | Cada reveal creaba estado React y un observador propio; la opacidad temporal reducia contraste | Trabajo repetido durante scroll y texto transitoriamente fuera de WCAG | Un `IntersectionObserver` compartido, reveals por transformacion sin atenuar texto, delays acotados y fallback visible. Riesgo bajo. Unitarias, Axe y E2E desktop/mobile aprobados. |
| MEDIO | El control central del antes/despues parecia arrastrable pero la entrada real estaba limitada a una barra inferior | Interaccion visual y comportamiento no coincidian | El `range` accesible cubre toda la imagen, conserva teclado y foco visible, y mueve el manejador central sin tapar etiquetas. Riesgo bajo. E2E geometrico e inspeccion mobile aprobados. |
| MEDIO | Playwright fijaba un puerto ocupado por otra aplicacion | Suite bloqueada o apuntando al servidor equivocado | Puerto validable mediante `PLAYWRIGHT_PORT` y origen compartido por specs. Riesgo bajo. E2E en 3110 aprobado. |
| MEDIO | El escaner de secretos fallaba con archivos tracked eliminados | Falso bloqueo del gate en worktrees con cambios | `lstatSync` tolerante a ausencias y solo archivos regulares. Riesgo bajo. Escaneo de 463 archivos aprobado. |
| MEDIO | El panel mostraba porcentajes heurísticos como si midieran avance exacto | Lectura engañosa de preparación comercial y técnica | Se reemplazaron por estados y conteos verificables de controles aprobados y pendientes. Riesgo bajo. Unitarias, E2E y revisión visual aprobadas. |
| MEDIO | Las fichas administrativas contaban solo relaciones de FAQ y proyecto directas | El CMS mostraba cero aunque la página pública ya tuviera preguntas y evidencia editorial | Conteo unificado de FAQs propias y casos públicos relacionados, con deduplicación y filtro de publicación. Riesgo bajo. Pruebas unitarias y E2E aprobadas. |
| MEDIO | La galería pública abría una imagen aislada sin recorrido completo | La visita perdía contexto y no podía avanzar con teclado entre evidencias del caso | Lightbox con anterior/siguiente, flechas de teclado, contador, leyenda, bloqueo de scroll, foco contenido y restaurado. Riesgo bajo. Unitarias, E2E y revisión visual aprobadas. |
| MEDIO | Auth.js procesaba cookies de sesión también en rutas públicas dinámicas | Cookies antiguas generaban ruido de descifrado y trabajo innecesario en páginas públicas | Proxy dividido: SEO/404 público sin sesión y autenticación solo para Admin/API. Riesgo medio por enrutado. Se verificaron rutas válidas, inexistentes y slugs malformados en desktop/mobile. |
| MEDIO | Cuatro endpoints administrativos leían JSON sin límite previo | Un cuerpo excesivo podía consumir memoria antes de llegar a Zod | Lector acotado por 16 KiB y 5 s, con respuestas 400/413; las notas se crean dentro de transacción serializable. Riesgo bajo. Unitarias y E2E aprobadas. |
| MEDIO | El formulario publico JSON compartia el limite de 13 MB reservado para adjuntos multipart | Un cuerpo JSON innecesariamente grande podia consumir memoria antes de Zod | Limite independiente de 64 KiB para JSON, manteniendo 13 MB solo para solicitudes con archivos. Riesgo bajo. E2E de rechazo 413 aprobado. |
| BAJO | El estimador opcional ocupaba espacio permanente en la navegación Admin | Distracción en la operación diaria del CMS | Se retiró del menú y se mantuvo accesible para Admin desde Estado. Riesgo mínimo. Permisos y acceso directo verificados. |
| BAJO | `ops:check -- --url` ignoraba el argumento y consultaba el puerto por defecto | Podía dar un falso PASS o BLOCK contra otra aplicación local | Parser explícito de `--url`, prioridad sobre entorno y rechazo de flags desconocidos. Riesgo mínimo. Cuatro pruebas y smoke test real aprobados. |
| BAJO | Recursos publicos grandes y componentes sin referencias | Peso, ruido y mantenimiento innecesarios | Se eliminaron dos imagenes y un componente sin uso. Riesgo bajo tras busqueda de referencias, build y E2E. |
| CONSERVAR | Hero editorial, CTA, portfolio, comparador y arquitectura del panel | Diferenciacion de marca y recorrido comercial ya coherentes | Se mantuvieron estructura, Arqvia, USD y conversiones. Validacion visual en 1440 y 390 px. |

## 4. Frontend y React

- Se mantuvieron Server Components por defecto y Client Components solo para interaccion, formularios, navegacion y panel.
- El hero conserva imagen protagonista, una sola jerarquia H1, callouts de escritorio y version movil simplificada.
- La imagen del hero permanece estatica: no hay parallax, seguimiento del cursor ni transformacion por movimiento del mouse.
- El motion usa una sola entrada por seccion, progreso tecnico en el proceso, hover y foco equivalentes en cards, y un unico observador compartido sin renders React por interseccion.
- Se ajusto el alto a `92svh` para mostrar continuidad con la siguiente seccion sin comprometer legibilidad.
- El comparador usa el mismo espacio antes y despues, tiene rango accesible sobre toda la imagen, foco visible y etiquetas separadas del control.
- No se encontraron `any`, `ts-ignore`, listeners sin limpieza ni errores de hidratacion en la verificacion final.

## 5. Backend, APIs y datos

- Leads validados con Zod en servidor, proteccion same-origin, JSON limitado a 64 KiB, multipart limitado a 13 MB, rate limiting y transacciones.
- Adjuntos privados protegidos por rol; imagenes decodificadas y reserializadas con Sharp.
- Auth.js Credentials con Prisma, sesion acotada, usuario activo y version de sesion verificadas contra base.
- No existe registro publico; solo Admin puede crear usuarios y los roles Admin, Editor y Viewer se hacen cumplir.
- SQLite queda para desarrollo. El esquema equivalente de PostgreSQL genera correctamente para produccion.

## 6. Visual y responsive

- Direccion: arquitectura premium con estructura tecnica y acentos calidos.
- Header sticky, seccion activa, foco visible, CTA claros y acceso administrativo relegado al footer.
- Verificacion automatizada sin overflow en 320, 375, 390, 430, 768, 1024, 1280, 1440, 1536, 1920 y 2560 px.
- Revision manual final en 1440 x 900 y 390 x 844: titular en dos lineas a escritorio, imagen nitida y estatica, sin imagenes rotas, sin overflow y con hero legible.

## 7. Contenido e identidad verbal

- Marca unificada como Arqvia y registro rioplatense consistente.
- Hero final: `Arquitectura pensada para construirse bien.`
- Se retiro del frontend publico el lenguaje interno sobre plantillas, campos, conceptos y reemplazos.
- Las cifras, testimonios, contacto y proyectos siguen sujetos a validacion comercial antes de publicar.

## 8. SEO y CRO

- Metadata, canonicals, robots, sitemap, Open Graph, schema y breadcrumbs implementados.
- Servicios, proyectos, blog y zonas tienen rutas limpias e interlinking contextual.
- La home prioriza hero, prueba, servicios, proyectos, transformacion, proceso y contacto; el estimador no se promociona ni indexa.
- No se promete ranking, indexacion ni uplift de conversion.

## 9. Imagenes y recursos

- Inventario coherente: 14 recursos registrados y ningun archivo publico sin seguimiento.
- Hero servido con `next/image`, preload y `sizes`; galerias se cargan de forma diferida.
- Casa Patio Norte, Oficina Umbral y Local Sierra incorporan una segunda vista coherente del mismo proyecto, generada desde su referencia, convertida a WebP y documentada con alt y pie descriptivos.
- Se eliminaron `home-design.jpg` y el boceto hero antiguo porque no tenian referencias.
- Los 14 recursos carecen de aprobacion documental de derechos: es un bloqueo de lanzamiento, no un fallo de codigo.

## 10. Accesibilidad y rendimiento

- Skip links, landmarks, foco, labels, errores de formularios, menu con focus trap y `prefers-reduced-motion` cubiertos.
- `prefers-reduced-motion` deja hero, secciones y proceso en su estado final sin animacion; el contraste no cambia durante los reveals normales.
- Axe E2E aprobado en paginas publicas representativas, escritorio y mobile.
- Medicion local de produccion en 1440 px: HTTP 200, DCL 80 ms, load 257 ms, LCP observado 340 ms, CLS 0, 41 recursos y 595 KiB transferidos.
- Estas cifras son una muestra local, no Core Web Vitals de usuarios reales ni Lighthouse de produccion.

## 11. Seguridad

- `npm audit --audit-level=low`: 0 vulnerabilidades.
- Escaner de secretos: 466 archivos aprobados.
- Headers, CSP, validacion server-side, proteccion de rutas, CSRF/same-origin y minimizacion de PII revisados.
- Produccion exige secret robusto, sin password bootstrap, PostgreSQL, storage persistente y rate limit distribuido.

## 12. Analitica

- Embudo: CTA -> intento de formulario -> error o lead confirmado; WhatsApp se mide por separado.
- Los eventos solo admiten parametros no identificables y no envian nombre, email, telefono ni mensaje libre.
- El documento `docs/ANALYTICS.md` define taxonomia, fuentes de verdad, consentimiento y validacion.

## 13. Produccion y operaciones

- Health y readiness devuelven HTTP 200 con estados `ok` y `ready`.
- Backup SQLite e intento real de restore aprobados con checksum, integridad y tablas verificadas.
- Runbooks, checklist, release gate, PWA, privacidad y automatizaciones estan documentados en `docs/`.
- No se desplego, no se modifico DNS y no se tocaron credenciales externas.

## 14. Elementos eliminados

- CSS global compilado: reemplazado por fuente mantenible.
- Dos imagenes publicas sin uso: eliminadas para reducir ruido y peso.
- Componente de formulario diferido sin referencias: eliminado.
- Wrappers `after()` de revalidacion: eliminados por incompatibilidad funcional.

## 15. Elementos conservados

- Marca Arqvia, precios en USD, estructura general, hero fotografico y CTA principales.
- Arquitectura single-client configurable, Prisma y Auth.js.
- Portfolio como casos de estudio, servicios SEO, blog, zonas, WhatsApp y formulario calificado.
- Panel por roles, leads, contenido, legal, medios, visitas, reportes y operaciones.

## 16. Archivos principales modificados

- `src/app/styles.css`, `src/app/layout.tsx`, `src/app/page.tsx`.
- `src/components/hero/arqvia-architectural-hero.tsx`, `src/components/scroll-reveal.tsx`, `src/components/before-after.tsx`.
- `src/components/app-chrome.tsx`, `src/components/quote-form.tsx`.
- `src/lib/analytics.ts`, `src/app/contacto/page.tsx`.
- `src/app/admin/(protected)/**/actions.ts`, `src/components/admin/notification-center.tsx`.
- `playwright.config.ts`, `scripts/check-secrets.ts`, `prisma/seed.ts`.
- `package.json`, `package-lock.json`, `README.md` y documentacion de `docs/`.

## 17. Comandos y resultados

- `npm run verify`: PASS.
- `npm run security:scan`: PASS, 471 archivos.
- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- `npm run test`: PASS, 444/444 en 92 archivos.
- `npm run content:check`: PASS, 4 proyectos, 11 servicios, 10 guias y 14 medios.
- `npm run build`: PASS, 82 rutas.
- `npm run verify:e2e`: PASS, 252 aprobadas, 38 omitidas, residuo limpio.
- E2E focalizado previo a la corrida completa: PASS, 10/10 sobre motion, contraste Axe, menu, hero estatico y comparador en desktop y mobile.
- `npm audit --audit-level=low`: PASS, 0 vulnerabilidades.
- `npm run ops:check -- --url http://localhost:3110`: PASS.
- `npm run release:check`: BLOCKED como corresponde, 11 controles pendientes.

## 18. No ejecutado

- Lighthouse: `NO_EJECUTADO`; no se reportan puntajes inventados.
- Staging y produccion: `NO_EJECUTADO`; no hay despliegue autorizado.
- DNS, HTTPS, CDN, correo, GA4/GTM, S3 y PostgreSQL remotos: `NO_EJECUTADO`; faltan servicios y credenciales reales.
- Prueba PWA sobre HTTPS y dispositivos fisicos: `NO_EJECUTADO`.

## 19. Informacion real pendiente

- Dominio final y URLs HTTPS.
- WhatsApp, telefono, email, direccion y horarios reales.
- Contenido, metricas, testimonios, credenciales y proyectos aprobados.
- Derechos y creditos de cada imagen.
- Textos legales revisados por profesional.
- Proveedores y credenciales de PostgreSQL, storage, analitica, email y observabilidad.

## 20. Deuda tecnica y riesgos restantes

- SQLite no es la base de produccion y el rate limit en memoria no escala entre instancias.
- Upload local no persiste en despliegues serverless.
- CSP usa `unsafe-inline` compatible con la estrategia estatica actual; endurecerla con nonce implicaria revisar cache y render dinamico.
- No existen datos RUM para afirmar Core Web Vitals reales.
- Los contenidos visuales y comerciales no pueden considerarse prueba real hasta su aprobacion.
- Next.js puede registrar `The destination stream closed early` cuando Playwright cancela respuestas al navegar o cerrar páginas; la suite, los HTTP directos y el control de residuos aprobaron. No se observó una ruta funcional fallida asociada.

## 21. Proximas acciones de mayor valor

1. Aprobar contenido, contacto, metricas, testimonios y derechos de medios.
2. Crear staging HTTPS con secretos separados y sin password bootstrap.
3. Provisionar PostgreSQL y ejecutar migracion mas smoke test de datos.
4. Provisionar storage S3 compatible y probar subida, lectura y borrado.
5. Activar rate limiting distribuido y configurar el proxy confiable.
6. Configurar GA4 o GTM con consentimiento y validar eventos en DebugView.
7. Configurar correo transaccional y observabilidad con alertas sin PII.
8. Validar PWA, formularios, uploads y restore sobre staging.
9. Ejecutar Lighthouse y WebPageTest sobre la URL HTTPS final.
10. Repetir `npm run verify`, `npm run verify:e2e`, `npm run ops:check` y `npm run release:check` antes del despliegue.
