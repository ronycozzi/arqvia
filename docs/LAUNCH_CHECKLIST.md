# Arqvia Launch Checklist

Checklist para pasar de una versión con los módulos Premium de estimación y visitas validados localmente a una entrega publicada para cliente.

## Contenido y marca

- Confirmar nombre comercial, logo final, claim, tono de voz y paleta.
- Reemplazar fotos por material autorizado del cliente o imagenes con licencia clara.
- Revisar `docs/MEDIA_RIGHTS.md` y completar origen, nota y aprobación individual
  de cada recurso usado por contenido público.
- Confirmar que ningún hero, logo, proyecto/galería, servicio, artículo,
  integrante activo o testimonio destacado quede sin ficha en la biblioteca.
- Registrar `ARQVIA_MEDIA_RIGHTS_APPROVED_BY` y
  `ARQVIA_MEDIA_RIGHTS_APPROVED_AT` sólo después de cerrar la revisión por recurso.
- Revisar proyectos: categoria, ubicacion, superficie, anio, estado, historia, materiales y alt text.
- Revisar servicios: alcance real, inclusiones, limites, FAQ, SEO title y SEO description.
- Revisar testimonios y credenciales. No publicar nombres, fotos, matriculas o marcas sin permiso.
- Revisar areas de trabajo y paginas locales con ubicaciones reales.

## Bloqueo comercial obligatorio del estimador

- Tratar todos los rangos y multiplicadores de migración/seed como supuestos no aprobados.
- Mantener apagado `Mostrar el estimador en el sitio público` hasta completar el sign-off.
- Validar alcance, mínimo y máximo por m², mínimo de proyecto y los tres multiplicadores para cada categoría activa.
- Revisar al menos un caso chico, uno medio y uno grande por categoría con una persona responsable comercial de Arqvia.
- Registrar nombre del aprobador, fecha, fuente, moneda, vigencia, versión aprobada y próxima revisión.
- Configurar `ARQVIA_ESTIMATOR_APPROVED_VERSION` con la versión exacta aprobada; cualquier edición posterior debe bloquear nuevamente el release.
- Aprobar el disclaimer como orientación no contractual y alinear el guion de seguimiento comercial.
- Archivar la evidencia de aprobación con el release. Sin evidencia, no publicar el estimador.

## Conversion

- Configurar WhatsApp real en `NEXT_PUBLIC_WHATSAPP_NUMBER`.
- Revisar mensajes prellenados por servicio, proyecto y contacto general.
- Configurar email, telefono, direccion/zona y horarios.
- Probar formulario corto y formulario profesional.
- Marcar `Necesito visita técnica` y comprobar fecha preferida, franja Mañana/Tarde/Indistinto, dirección y notas en desktop y mobile.
- Confirmar que el formulario presente esos datos como preferencias y no como una reserva ya confirmada.
- Probar adjunto válido de imagen y PDF, rechazo por formato/tamaño y descarga autenticada desde el lead.
- Probar guardado de leads en admin.
- Probar export CSV, notas internas, estados y seguimiento.
- Configurar `NEXT_PUBLIC_ANALYTICS_PROVIDER` como `ga4` o `gtm` y cargar un identificador válido en `NEXT_PUBLIC_ANALYTICS_ID`.
- Comprobar que no exista ninguna solicitud a Google antes del consentimiento, que `Solo esenciales` mantenga la medición apagada y que `Permitir medición` active page views, formulario, WhatsApp y estimador sin PII.
- Verificar que `Preferencias de cookies` permita cambiar la decisión después y revisar la política con asesoramiento legal.

## Estimador Premium

- Revisar `docs/ESTIMATOR.md` y confirmar que fórmula, redondeo y valores aprobados coincidan con la versión desplegada.
- Probar `/estimador` con el switch global encendido y apagado. Confirmar en
  ambos estados que home, header, footer y sitemap no promocionen la herramienta;
  apagado debe mostrar la alternativa de contacto en la ruta directa.
- Probar superficies 10 y 2.000 m², rechazo de 9 y 2.001 m², ingreso directo mayor a 500 m² y los niveles Esencial, Equilibrado y Superior.
- Verificar mínimo de proyecto dominante y redondeos alrededor de USD 30.000 y USD 100.000.
- Confirmar que el resultado muestre USD, categoría, superficie, nivel y disclaimer, sin presentarse como cotización contractual.
- Continuar al formulario y verificar que categoría, superficie, nivel, tasas, totales y versión queden en la instantánea del lead.
- Manipular o eliminar datos ocultos del cálculo y confirmar que el servidor rechace la entrada incompleta o recalcule sin confiar en totales del navegador.
- Cambiar la versión o desactivar la regla antes de enviar y confirmar respuesta `409` sin crear una estimación obsoleta.
- Confirmar eventos `estimate_view`, `estimate_start`, `estimate_calculated` y `estimate_continue` sin PII ni importes exactos.
- Usar el switch global como kill switch. Confirmar además que cero categorías activas cierre la herramienta sin publicar fallbacks.

## Automatización de leads

- Revisar `docs/AUTOMATIONS.md`, mantener `LEAD_AUTOMATION_ENABLED=false` durante
  la migración y habilitar `LEAD_AUTOMATION_CAPTURE_ENABLED=true` sólo después de
  verificar el outbox.
- Configurar `LEAD_WEBHOOK_URL` con un endpoint HTTPS real del CRM, Google Sheets mediante un intermediario, Make, Zapier o servicio propio.
- Configurar `LEAD_WEBHOOK_ALLOWED_HOSTS` con el hostname exacto del receptor y comprobar que IPs, localhost y dominios internos sean rechazados.
- Generar secretos privados distintos para `LEAD_WEBHOOK_SECRET` y `AUTOMATION_CRON_SECRET`; ambos deben tener al menos 32 caracteres.
- Confirmar que ninguno de los secretos use prefijo `NEXT_PUBLIC_`, quede en el repositorio, aparezca en logs o sea compartido entre staging y producción.
- Configurar `LEAD_WEBHOOK_TIMEOUT_MS` y `LEAD_AUTOMATION_MAX_ATTEMPTS` con valores aprobados por operaciones.
- Aplicar `prisma/postgresql/migrations/20260714500000_add_lead_automation_outbox/migration.sql` antes de habilitar la automatización y verificar que no se inventen entregas exitosas para leads históricos.
- Configurar el scheduler contra `GET` o `POST /api/cron/automations` con `Authorization: Bearer <AUTOMATION_CRON_SECRET>` y confirmar rechazo cuando el secreto falta o es incorrecto.
- Confirmar que la configuración sólo informe `ready` con switch, URL, hostname autorizado, secreto HMAC y secreto cron válidos.
- Crear un lead con el cron detenido y comprobar que la respuesta pública sólo persista el outbox: no debe ejecutar ninguna solicitud externa.
- Verificar que `payloadJson` permanezca inmutable aunque el lead cambie antes del cron, use `newAttachmentCount` del envío y no incorpore timestamps de estado actual ni estado/horario posterior de visita.
- Ejecutar un cron con más de cinco elegibles y comprobar un máximo de cinco entregas concurrentes dentro del límite de 30 segundos.
- Forzar un lease vencido y confirmar que `claimToken` impida al worker anterior cerrar el evento reclamado por otro proceso.
- Verificar en staging `x-arqvia-signature` con formato `t=<unix>,v1=<hex>` y HMAC-SHA-256 sobre `timestamp + "." + cuerpo`; probar firma alterada y tratar sólo respuestas `2xx` como éxito.
- Simular timeout, respuesta `4xx` y respuesta `5xx`; comprobar intentos acotados, último error observable y ausencia de pérdida silenciosa.
- Confirmar en `/admin/automations` estados, detalle de intentos y reencolado manual; sólo Admin debe acceder y Editor/Viewer deben quedar fuera.
- Reencolar un evento y comprobar que permanezca pendiente sin llamar al webhook hasta la siguiente ejecución autenticada del cron.
- Enviar dos veces el mismo evento al receptor y comprobar deduplicación por identificador estable. El contrato es de entrega al menos una vez.
- Revisar el mapeo y minimización de datos personales en el destino, su retención, accesos y mecanismo de borrado.
- Habilitar `LEAD_AUTOMATION_ENABLED=true` sólo después del smoke test end-to-end
  y conservar evidencia del evento recibido; la captura puede seguir activa
  durante toda la pausa de despacho.
- Registrar esa evidencia con `ARQVIA_AUTOMATION_APPROVED_BY` y `ARQVIA_AUTOMATION_APPROVED_AT`; el release gate bloquea automatizaciones encendidas sin ese control.
- Estado actual: entrega externa real `NOT RUN`; faltan credenciales y endpoint reales, por lo que no corresponde marcar esta sección como aprobada todavía.

## Admin

- Cambiar `ADMIN_EMAIL` y `ADMIN_PASSWORD` iniciales.
- Configurar `AUTH_SECRET` fuerte y privado.
- Configurar `TRUST_PROXY_PROVIDER` según el hosting y confirmar que la IP cliente no pueda falsificarse.
- Crear usuarios reales desde `/admin/users`.
- Revisar permisos Admin, Editor y Viewer.
- Abrir `/admin/system` con Admin y confirmar conexión de base, PostgreSQL,
  storage persistente, rate limit distribuido, proxy, URL pública e
  integraciones, retención y evidencia de backup/restore. Editor y Viewer deben
  quedar fuera.
- Confirmar que sólo Admin pueda abrir `/admin/estimador` y guardar textos, multiplicadores, rangos o estado público; Editor y Viewer deben quedar fuera.
- Probar dos sesiones Admin sobre la misma versión: el segundo guardado debe exigir recarga y no pisar el primero.
- Confirmar que cada cambio del estimador incremente la versión y cree un registro en `/admin/activity`.
- Confirmar que sólo Admin pueda abrir `/admin/visitas`, coordinar desde el detalle del lead y asignar usuarios activos Admin/Editor.
- Confirmar que Editor y Viewer no vean el acceso a `/admin/visitas` ni la dirección, agenda o notas internas de una visita.
- Probar las vistas Pendientes, Próximas, Historial y Todas; búsqueda, filtro por estado y paginación.
- Recorrer los estados Solicitada, Agendada, Confirmada, Realizada y Cancelada. Agendada, Confirmada y Realizada deben exigir fecha y hora.
- Verificar la coordinación en zona `America/Argentina/Cordoba` con una fecha y hora conocidas.
- Descargar el `.ics` desde la agenda y desde el detalle del lead; confirmar que sólo Admin acceda y que no aparezca sin fecha y hora.
- Importar el `.ics` en un calendario de prueba y revisar inicio, fin según duración, cliente, proyecto, ubicación y notas. Recordar que la exportación no sincroniza cambios posteriores.
- Confirmar que Viewer no vea datos personales completos ni acciones de contacto/exportacion.
- Configurar `MEDIA_STORAGE_PROVIDER=s3` y validar una subida/borrado real en el proveedor elegido.
- Buscar desde un formulario CMS una imagen aprobada que no esté entre las 80
  más recientes; confirmar que Admin, Editor y Viewer puedan obtener sus campos
  públicos mediante la búsqueda global, sin procedencia ni notas de derechos.
- Confirmar que una sesión anónima reciba `403` en `GET /api/admin/media` y que
  Viewer continúe sin permisos de subida, aprobación o borrado.
- Confirmar una lectura del objeto subido y registrar el smoke de subida/lectura/borrado con `ARQVIA_STORAGE_APPROVED_BY` y `ARQVIA_STORAGE_APPROVED_AT`.

## SEO

- Configurar `NEXT_PUBLIC_SITE_URL` con dominio final HTTPS.
- Activar `ARQVIA_STRICT_PUBLIC_URL=true` en hosting.
- Revisar metadata, Open Graph, canonical, sitemap y robots.
- Revisar JSON-LD de Organization, LocalBusiness, Service, FAQ y Article.
- Validar alt text de imagenes principales.
- Cargar Google Search Console despues del despliegue.

## Legal

- Revisar privacidad, terminos, cookies y disclaimer de presupuestos con asesoramiento legal.
- Definir el canal para pedidos de titulares y ensayar en staging el flujo Admin-only de `docs/PRIVACY_ERASURE.md`, incluyendo adjuntos, relaciones, sistemas externos y retención de backups.
- Confirmar consentimiento de analytics/cookies si corresponde.
- Revisar politica de tratamiento de datos de leads.
- Definir por escrito el plazo de retención, alcance, responsable y excepciones.
  Mantener `LEAD_RETENTION_ENABLED=false` hasta completar esa aprobación.
- Ensayar en staging un lote de retención con consultas `LOST` controladas,
  confirmar que no afecta estados activos y registrar conteos, auditoría y restore.

## Infraestructura

- Migrar Prisma a PostgreSQL para produccion.
- Ejecutar `npm run db:postgres:schema` y revisar `prisma/postgresql/schema.prisma`.
- Generar y revisar la migracion inicial con `npm run db:postgres:baseline` antes del primer deploy.
- Confirmar que `prisma/postgresql/migrations/20260714300000_add_technical_visits/migration.sql` esté incluida entre las migraciones pendientes del entorno que aún no tenga el módulo.
- Confirmar que `prisma/postgresql/migrations/20260714400000_add_investment_estimator/migration.sql` esté incluida en entornos que aún no tengan el estimador.
- Confirmar que `prisma/postgresql/migrations/20260714500000_add_lead_automation_outbox/migration.sql` esté incluida en entornos que aún no tengan el outbox.
- Confirmar que `prisma/postgresql/migrations/20260715170000_add_content_redirects/migration.sql` esté aplicada antes de cambiar slugs en contenido publicado.
- Confirmar que `prisma/postgresql/migrations/20260715190000_secure_notification_undo/migration.sql` esté aplicada antes de habilitar marcar/restaurar notificaciones.
- Confirmar que `prisma/postgresql/migrations/20260715200000_add_area_timestamps/migration.sql` esté aplicada para conservar fechas reales de zonas en sitemap y metadatos.
- Aplicar `prisma/postgresql/migrations/20260715210000_add_lead_last_activity/migration.sql` y ejecutar `npm run db:backfill:activity`; una segunda ejecución sin cambios debe actualizar cero registros.
- Aplicar `prisma/postgresql/migrations/20260715220000_add_media_rights_provenance/migration.sql`; los medios existentes quedan pendientes y deben revisarse, no aprobarse mediante backfill.
- Aplicar `prisma/postgresql/migrations/20260716170000_add_admin_concurrency_and_operational_indexes/migration.sql` antes de habilitar la gestión de usuarios concurrente.
- Aplicar `prisma/postgresql/migrations/20260716180000_isolate_possible_lead_duplicates/migration.sql` antes de recibir nuevos formularios con la política de expedientes independientes.
- Cambiar de forma controlada un slug de proyecto, servicio, publicación y zona; verificar HTTP 308, destino canónico exacto y ausencia de la URL anterior en sitemap.
- La migración inserta seis reglas seed y una configuración inicialmente deshabilitada. No encenderla sin sign-off comercial.
- Verificar un `EstimateConfig`, seis `EstimateRule` en una instalación nueva y ningún `LeadEstimate` agregado a leads históricos.
- Ejecutar migraciones reales, no `db push`, sobre el entorno final.
- Configurar backups automaticos de base de datos.
- Ejecutar `npm run release:env` con las variables del entorno final antes de abrir el gate; conservar solo el resumen PASS/BLOCK, nunca una copia de secretos.
- Definir retención, RPO y RTO, y completar el ensayo de restauración de `docs/OPERATIONS.md`.
- En SQLite local ejecutar `npm run db:backup:sqlite` y luego `npm run db:verify-restore:sqlite`; en producción repetir el procedimiento equivalente del proveedor sobre una base aislada.
- Configurar las variables S3/R2 y `S3_PUBLIC_BASE_URL` si se van a subir imagenes desde admin.
- Confirmar que el bucket bloquea acceso público a `lead-attachments/` y que Admin/Editor pueden descargar desde la ruta autenticada.
- Confirmar que el proveedor de storage conserve URLs publicas estables para
  proyectos, servicios, hero, equipo y blog.
- Usar `RATE_LIMIT_STORE=database` para compartir limites entre instancias.
- Ejecutar `npm run db:backfill:leads` despues de migrar datos existentes.
- Definir variables de entorno en hosting.
- Definir todas las variables de automatización en hosting, mantener el despacho
  apagado hasta completar su checklist y conservar la captura durable una vez
  verificado el outbox.
- Configurar el cron protegido, alertas por backlog/fallos terminales y acceso operativo a `/admin/automations`.
- Si la política de retención fue aprobada, configurar por separado el cron de `/api/cron/retention`, su secreto, frecuencia, alertas y límite por ejecución. No reutilizar el secreto de automatizaciones.
- Confirmar headers de seguridad y CSP.
- Configurar el monitor externo sobre `/api/health` y el chequeo de disponibilidad sobre `/api/ready`.
- Usar `/admin/system` como resumen interno, no como sustituto del monitoreo
  externo ni de los smoke tests reales del proveedor.
- Despues de desplegar, ejecutar `SERVICE_BASE_URL=https://dominio-final.example npm run ops:check`; deben pasar ambos endpoints con HTTP 200 y JSON. Registrar el resultado y la hora; no usar `/api/health` como sustituto de `/api/ready`.

## PWA

- Confirmar manifest con nombre Arqvia, `start_url`, scope `/`, modo standalone e iconos 192/512 más maskable.
- Confirmar `Cache-Control: no-store`, `Service-Worker-Allowed: /`, tipo JavaScript y CSP propia en `/sw.js`.
- Inspeccionar Cache Storage: sólo debe contener `offline.html` e iconos; no páginas, imágenes, `/api`, `/admin`, RSC, formularios o datos personales.
- Cortar la red en home y contacto; comprobar fallback Arqvia y conservación del formulario sólo mientras la pantalla permanezca abierta.
- Recuperar la red y enviar manualmente una única consulta; confirmar que no exista reenvío automático ni duplicado.
- Instalar en Android/Chrome y iPhone/Safari reales sobre HTTPS; revisar icono, nombre, standalone, safe areas, actualización y desinstalación.
- Estado local actual: manifest, worker y flujos offline automatizados. Instalación física y actualización sobre dominio final: `NOT RUN` hasta disponer del despliegue HTTPS.

## Verificacion antes de publicar

El release queda bloqueado hasta que el gate determinista apruebe dominio,
contacto, infraestructura, contenido, derechos, legales, estimador y evidencia
operativa. Ver `docs/RELEASE_GATE.md`.

Ejecutar:

```bash
npm ci
npm run db:generate
npm run lint
npm run typecheck
npm run test
npm run test -- tests/pwa.test.ts
npm run verify
npm run security:scan
npm run release:env
npm run release:check
npm run audit:production
npm run build
npm run e2e
npm run verify:e2e
npm run test:e2e-residue
npm run e2e -- tests/e2e/public.spec.ts --project=chromium --grep "PWA|offline"
npm run e2e -- tests/e2e/public.spec.ts --project=mobile --grep "PWA|offline"
```

El flujo de visitas también dispone de verificaciones enfocadas:

```bash
npm run test -- tests/technical-visit.test.ts
npm run e2e -- --project=chromium --workers=1 --grep "technical visit"
```

Para el estimador no asumir cobertura por el sólo resultado de la suite general:
ejecutar y registrar también la matriz manual de fórmula, versionado, permisos,
seguridad, migración y kill switch de `docs/ESTIMATOR.md`.

Para automatizaciones, registrar por separado las pruebas de outbox persistente,
firma HMAC, autorización del cron, timeout, límite de intentos, idempotencia y
reencolado administrativo sin entrega directa descritas en
`docs/AUTOMATIONS.md`. Incluir snapshot inmutable, `claimToken`, cinco envíos
concurrentes y límite de 30 segundos. Una prueba con un receptor local o
simulado no cambia el estado de entrega externa real `NOT RUN`.

Para una base SQLite local existente, preparar el módulo antes de la prueba
manual con:

```bash
npm run db:generate
npm run db:init
```

Para staging o producción PostgreSQL, aplicar migraciones con
`npm run db:postgres:deploy`; no ejecutar `db:init` ni `db push` en ese entorno.
Registrar los resultados reales de cada comando y cualquier omisión o bloqueo.

Medir Lighthouse solo sobre una URL real o un servidor local estable y reportar el resultado real.

## Post-deploy

- Abrir home, proyectos, detalle de proyecto, servicios, detalle de servicio, blog, contacto, FAQ y legales.
- Enviar un lead real de prueba y confirmar guardado en admin.
- Adjuntar una foto o plano de prueba, descargarlo desde admin, eliminarlo y confirmar que el objeto también desapareció del storage.
- Probar WhatsApp desde mobile y desktop.
- Probar login admin, cambio de estado de lead, nota interna y export.
- Calcular un rango aprobado desde `/estimador`, enviar el lead y comparar la instantánea Admin con el cálculo esperado y la versión aprobada.
- Ingresar como Editor y Viewer y confirmar que `/admin/estimador` y sus escrituras permanezcan inaccesibles.
- Confirmar en `/admin/activity` los registros generados durante la carga y aprobación controlada; no modificar producción sólo para crear una auditoría de prueba.
- Durante las primeras 24 horas revisar errores `409`, errores del endpoint de leads y el embudo `estimate_view -> estimate_calculated -> estimate_continue`.
- Enviar una preferencia real de visita y confirmar que aparece como Solicitada en `/admin/visitas`.
- Coordinar fecha, hora, duración y responsable; descargar e importar el `.ics` y comparar sus datos con el lead.
- Ingresar como Viewer y confirmar que la agenda y los datos operativos de la visita permanezcan inaccesibles.
- Crear un lead real controlado, ejecutar el cron y confirmar el mismo identificador de evento en outbox, receptor y admin antes de declarar la entrega externa operativa.
- Revisar durante las primeras 24 horas el backlog, intentos agotados, latencia y reintentos manuales de `/admin/automations`.
- Revisar sitemap publicado.
- Revisar que no haya URLs `localhost` en canonical, Open Graph o JSON-LD.
- Revisar logs del hosting y errores de runtime.
- Ejecutar nuevamente `SERVICE_BASE_URL=https://dominio-final.example npm run ops:check` en la ventana post-deploy y ante cada rollback; conservar la salida sin incluir headers, cookies ni valores de entorno.
- Instalar o actualizar la PWA en dispositivos reales, activar modo avión y confirmar recuperación al volver la red.
