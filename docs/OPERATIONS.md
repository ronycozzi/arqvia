# Operación de Arqvia

Runbook para publicar, observar, respaldar y recuperar el sitio sin depender de conocimiento informal.

## Señales de servicio

- `GET /api/health`: liveness del proceso. Responde `200` con `{"status":"ok"}` y no consulta dependencias.
- `GET /api/ready`: disponibilidad real. Consulta la base con timeout de 2,5 segundos; responde `503` si no está accesible.
- El monitor externo debe consultar `/api/health` cada minuto. El balanceador o la verificación posterior a un deploy debe consultar `/api/ready`.
- Los logs de aplicación son JSON estructurado. No registrar cuerpos de formularios, teléfonos, emails, contraseñas ni URLs firmadas.

### Estado interno del sistema

`/admin/system` ofrece a usuarios Admin una lectura complementaria de conexión
de base, proveedor de persistencia, storage, rate limit, proxy, guardia de URL
pública, analítica, automatizaciones, retención y aprobación de backup/restore.
También resume la cola de entregas, conteos operativos y, en SQLite, el último
manifiesto local verificado sin revelar ruta ni checksum. No muestra secretos,
URLs de conexión ni credenciales.

La vista sirve para diagnóstico inicial y para ubicar el módulo donde resolver
cada alerta. No reemplaza monitores externos, logs centralizados, alertas del
proveedor ni los smoke tests posteriores al despliegue.

## Objetivos de recuperación

Para una instalación de Arqvia con PostgreSQL administrado:

- RPO objetivo: 1 hora como máximo. Activar point-in-time recovery cuando el proveedor lo ofrezca.
- RTO objetivo: 4 horas como máximo para restaurar base, variables, storage y última versión estable.
- Retención mínima: 14 días de backups diarios y 3 copias mensuales.
- Ensayo de restauración: trimestral y antes de una campaña que aumente considerablemente el tráfico.

SQLite es solo para desarrollo local. `npm run db:backup:sqlite` crea una copia consistente mediante `VACUUM INTO`, ejecuta `PRAGMA integrity_check`, abre la copia con Prisma, cuenta entidades críticas, copia los adjuntos locales a un directorio asociado y genera un manifiesto con SHA-256 para la base y cada archivo. No usar SQLite como base de producción distribuida.

## Operación de automatizaciones de leads

El contrato completo está en `docs/AUTOMATIONS.md`. La automatización usa un
outbox persistente: el lead se conserva aunque el receptor esté lento, caído o
rechace la solicitud. La entrega externa es al menos una vez y el destino debe
deduplicar por identificador de evento. Sólo el cron autenticado llama al
webhook; ni la respuesta pública ni las acciones Admin realizan entregas.

Activación controlada:

1. Mantener `LEAD_AUTOMATION_ENABLED=false` mientras se aplican migraciones y se
   configuran `LEAD_WEBHOOK_URL`, `LEAD_WEBHOOK_ALLOWED_HOSTS`, `LEAD_WEBHOOK_SECRET`,
   `LEAD_WEBHOOK_TIMEOUT_MS`, `LEAD_AUTOMATION_MAX_ATTEMPTS` y
   `AUTOMATION_CRON_SECRET`. Una vez verificado el outbox, habilitar
   `LEAD_AUTOMATION_CAPTURE_ENABLED=true` sin activar todavía el despacho.
2. Usar HTTPS, una allowlist de host exacta y secretos independientes de al
   menos 32 caracteres. No registrar secretos, firmas, cuerpos completos ni
   PII. IPs, localhost y dominios internos deben quedar rechazados.
3. Configurar el scheduler para invocar `GET` o
   `POST /api/cron/automations` con
   `Authorization: Bearer <AUTOMATION_CRON_SECRET>`. Una llamada no autorizada
   debe fallar sin procesar el outbox.
4. Confirmar que `dispatchReady` exija el switch de despacho, URL, hostname autorizado, secreto HMAC y secreto cron, y que
   cada ejecución procese como máximo cinco eventos concurrentes dentro de 30
   segundos.
5. Probar en staging snapshot inmutable, `claimToken`, recepción `2xx`, firma
   HMAC, timeout, respuestas `4xx`/`5xx`, límite de intentos, idempotencia y
   reencolado manual desde
   `/admin/automations`.
6. Habilitar el despacho sólo en una ventana monitoreada, crear un evento,
   ejecutar el cron autenticado y confirmarlo extremo a extremo antes de abrir
   el flujo general.

Rutina diaria:

- Revisar pendientes, en proceso, entregados y fallos terminales en
  `/admin/automations`.
- Confirmar que los eventos `PROCESSING` tengan un `claimToken`; un resultado de
  worker sólo es válido mientras conserva ese token.
- Investigar primero URL, DNS/TLS, autorización del proveedor, timeout, firma y
  límites del receptor. No reintentar en masa antes de corregir la causa.
- El reencolado manual debe reutilizar el mismo identificador y payload. Sólo
  cambia el estado para que el cron lo tome; nunca llama al webhook ni debe
  duplicar el lead.
- Rotar un secreto con una ventana coordinada en la que emisor y receptor
  compartan la configuración correcta; después ejecutar un smoke test y retirar
  el secreto anterior.

Respuesta a incidentes:

1. Poner `LEAD_AUTOMATION_ENABLED=false` para detener nuevas entregas sin borrar
   el outbox y mantener `LEAD_AUTOMATION_CAPTURE_ENABLED=true`.
   Los leads recibidos durante la pausa siguen generando eventos pendientes.
2. Registrar hora, alcance, último evento correcto y estados HTTP/timeout sin
   copiar datos personales al incidente.
3. Corregir el receptor o la configuración y validar con un evento controlado.
4. Reencolar una muestra desde el admin, ejecutar el cron autenticado, confirmar
   deduplicación y luego recuperar el backlog por lotes observables.
5. Reactivar el despacho y vigilar backlog, tasa de error y latencia.

**Estado actual:** entrega externa real `NOT RUN`. No hay credenciales ni
endpoint externo real disponibles en este workspace; una prueba local o simulada
no autoriza a declarar la integración operativa.

## Operación del estimador Premium

El contrato completo está en `docs/ESTIMATOR.md`. Para la operación diaria:

1. Sólo Admin ingresa a `/admin/estimador`. Editor y Viewer no pueden consultar
   ni modificar supuestos.
2. Antes de cambiar un valor, registrar fuente, fecha, alcance y aprobador
   comercial. Los límites técnicos del formulario no validan la corrección
   comercial.
3. Replicar y probar los cambios en staging privado con casos chico, medio y
   grande por cada categoría afectada.
4. En producción, apagar primero el switch público, guardar los valores
   aprobados, anotar la nueva versión y repetir el smoke test sin tráfico real.
5. Habilitar después de la aprobación. Cada guardado se publica de inmediato,
   incrementa la versión y crea auditoría; no hay borrador separado.
6. Si otra sesión cambió la versión, recargar y reconciliar los valores. No
   repetir el guardado a ciegas.
7. Ante un rango incorrecto, apagar `Mostrar el estimador en el sitio público`,
   guardar y verificar `/estimador` antes de investigar. La home no promociona
   esta herramienta.

El switch global es el kill switch operativo recomendado. Si no existen reglas
activas, el cargador público devuelve una lista vacía y también cierra la
herramienta; no publica rangos fallback.

Un lead originado en el estimador conserva categoría, nivel, superficie, tasas,
totales y versión como `LeadEstimate`. El endpoint vuelve a calcular con la
configuración vigente; si la versión cambió, responde `409` y no guarda un rango
obsoleto. Un nuevo envío siempre crea otro lead y otra instantánea. Si coincide
email y teléfono, sólo queda relacionado como posible reconsulta; la estimación
anterior no cambia.

Los valores seed son sólo supuestos de arranque. El estimador no puede exponerse
a tráfico real sin evidencia escrita de validación comercial que incluya
aprobador, fecha, fuente, versión, moneda, vigencia y escenarios revisados.

## Operación de visitas técnicas Premium

1. La persona marca `Necesito visita técnica` en el formulario público y puede
   dejar fecha preferida, franja, dirección o referencia y notas. Son
   preferencias, no una cita confirmada.
2. El sistema crea una visita `Solicitada` vinculada uno a uno con el nuevo
   lead. Si email y teléfono coinciden, el panel muestra una posible reconsulta,
   pero ambos expedientes siguen separados. El envío público nunca reabre ni
   modifica la visita anterior: estado, horario, responsable, dirección y notas
   internas sólo cambian desde el panel autorizado.
3. Admin revisa `/admin/visitas`. La vista inicial muestra pendientes;
   también hay vistas de próximas, historial y todas, búsqueda, filtro por estado
   y paginación de 20 registros.
4. La coordinación se completa en el detalle del lead, sección
   `#visita-tecnica`, con estado, fecha, hora, duración, responsable, dirección y
   notas internas. Solo pueden asignarse usuarios activos Admin o Editor.
5. Editor y Viewer no pueden abrir la agenda ni consultar dirección, horario o
   notas de visita. La acción de guardado y la descarga de calendario vuelven a
   validar el rol Admin en el servidor.

Estados operativos:

- `REQUESTED` / Solicitada: preferencia recibida, todavía sin coordinación cerrada.
- `SCHEDULED` / Agendada: fecha y hora cargadas.
- `CONFIRMED` / Confirmada: fecha y hora confirmadas con la persona.
- `COMPLETED` / Realizada: visita ya realizada; requiere conservar fecha y hora.
- `CANCELLED` / Cancelada: visita cancelada.

Agendada, Confirmada y Realizada requieren fecha y hora. Arqvia interpreta la
coordinación con zona horaria `America/Argentina/Cordoba`; el archivo ICS expresa
los tiempos en UTC. La interfaz ofrece duraciones de 30, 45, 60, 90, 120 y 180
minutos, dentro de la validación de 30 a 240 minutos.

La exportación `.ics` aparece cuando la visita tiene fecha y hora. Se descarga
desde la agenda o el detalle mediante
`GET /api/admin/visitas/[id]/calendar`, accesible solo para Admin. El
evento incluye cliente, tipo de proyecto, ubicación, duración y notas internas;
por eso el archivo debe tratarse como información privada. La descarga no crea
sincronización posterior: si Arqvia cambia, hay que generar e importar un nuevo
archivo.

## Setup y migraciones del estimador

En SQLite local:

```bash
npm run db:generate
npm run db:init
```

El schema crea `EstimateConfig`, `EstimateRule` y `LeadEstimate`. No hay
backfill: los leads históricos quedan sin estimación. `npm run db:seed` crea los
supuestos iniciales sólo si no existen y no reemplaza valores editados.

En PostgreSQL, la migración incremental es
`prisma/postgresql/migrations/20260714400000_add_investment_estimator/migration.sql`.
Crea enum, tablas, índices y relaciones, e inserta seis reglas y una
configuración deshabilitada. Validar los supuestos y habilitar el switch desde
`/admin/estimador` únicamente después del sign-off comercial.

Aplicar con:

```bash
npm run db:postgres:deploy
npm run build:postgres
```

No usar `db push` en producción, no editar una migración aplicada y no ejecutar
el seed para actualizar precios. El módulo no requiere variables nuevas ni un
backfill. Verificar después un registro `EstimateConfig`, seis reglas seed en una
instalación nueva y cero `LeadEstimate` inventados para leads históricos.

## Setup y migraciones de visitas

En SQLite local, después de actualizar el repositorio:

```bash
npm run db:generate
npm run db:init
```

`db:init` sincroniza el schema de forma no destructiva mediante `prisma db push`
y ejecuta `db:backfill:visits`. No usar este flujo en producción.

En PostgreSQL, la incorporación del módulo está en
`prisma/postgresql/migrations/20260714300000_add_technical_visits/migration.sql`.
Aplicar todas las migraciones pendientes con:

```bash
npm run db:postgres:deploy
npm run build:postgres
```

`db:postgres:deploy` también genera el cliente y ejecuta los backfills de
actividad, identidad de leads y solicitudes históricas de visita. No editar la migración
ya aplicada ni usar `db push` sobre PostgreSQL de producción. El módulo no
requiere variables de entorno adicionales.

## Actividad comercial de leads

`Lead.lastActivityAt` evita inferir seguimiento desde `updatedAt`, que también
puede cambiar por tareas administrativas. Se actualiza al cambiar estado,
agregar una nota o adjunto y coordinar una visita. Una posible reconsulta crea
otro lead y no mueve la fecha de actividad del expediente anterior.

En PostgreSQL aplicar:

`prisma/postgresql/migrations/20260715210000_add_lead_last_activity/migration.sql`

y ejecutar:

```bash
npm run db:backfill:activity
```

El backfill toma la actividad más reciente conocida entre la consulta y sus
relaciones. Es idempotente: una segunda ejecución sin cambios debe informar
cero actualizaciones. Registrar conteos antes/después y no sustituir este paso
por una modificación manual de fechas.

## Setup y migraciones de automatizaciones

En SQLite local:

```bash
npm run db:generate
npm run db:init
```

Esto crea `LeadAutomationDelivery` mediante el flujo local de `db push`. No crea
entregas para leads históricos. Las nuevas altas y reconsultas generan eventos
cuando `LEAD_AUTOMATION_CAPTURE_ENABLED=true`, aun si
`LEAD_AUTOMATION_ENABLED=false` mantiene pausado el despacho.

En PostgreSQL, aplicar:

`prisma/postgresql/migrations/20260714500000_add_lead_automation_outbox/migration.sql`

con:

```bash
npm run db:postgres:deploy
npm run build:postgres
```

La migración crea los enums de evento/estado, la tabla
`LeadAutomationDelivery` con `payloadJson` y `claimToken`, índices de
procesamiento y la relación con `Lead`. No
editar una migración aplicada, no usar `db push` en producción y no habilitar el
webhook hasta verificar la tabla, el cron protegido y el admin. Incluir la tabla
en backups, conteos y ensayos de restauración; no hay backfill automático.

## Retención de consultas

La retención automática está deshabilitada por defecto y no debe habilitarse
sin una política legal aprobada, prueba en staging y restore verificado. Sólo
selecciona leads con estado `LOST` cuya `lastActivityAt` sea anterior al plazo.
No procesa consultas nuevas, contactadas, calificadas, cotizadas o ganadas.

Variables:

- `LEAD_RETENTION_ENABLED=false`: kill switch principal.
- `LEAD_RETENTION_DAYS=730`: plazo entre 90 y 3.650 días.
- `LEAD_RETENTION_BATCH_SIZE=25`: lote entre 1 y 100 expedientes.
- `DATA_RETENTION_CRON_SECRET`: secreto dedicado de al menos 32 caracteres.
- `PRIVATE_OBJECT_DELETION_CRON_SECRET`: secreto dedicado de al menos 32 caracteres para la cola de archivos privados.

El scheduler autorizado llama `GET` o `POST /api/cron/retention` con
`Authorization: Bearer <DATA_RETENTION_CRON_SECRET>`. Cada eliminación reutiliza
el flujo de privacidad: borra adjuntos privados, relaciones y PII, y deja una
constancia mínima `RETENTION_ERASURE` sin identificar a la persona. Los fallos
se contabilizan por lote y no detienen el resto.

La eliminación de adjuntos usa un outbox independiente. Configurar otro
scheduler contra `GET` o `POST /api/cron/private-object-deletions` con
`Authorization: Bearer <PRIVATE_OBJECT_DELETION_CRON_SECRET>`. La metadata del
lead se retira transaccionalmente y el objeto se elimina con reintentos; alertar
si el panel muestra trabajos `FAILED` o pendientes durante más de una ejecución.

Antes de activarla:

1. Definir plazo, responsable, excepciones y tratamiento de backups.
2. Restaurar una copia reciente en staging y preparar leads `LOST` controlados.
3. Ejecutar un lote pequeño, comparar conteos y revisar `/admin/activity`.
4. Probar restore y sistemas externos vinculados.
5. Registrar `ARQVIA_RETENTION_APPROVED_BY` y
   `ARQVIA_RETENTION_APPROVED_AT`; después habilitar el cron en una ventana
   monitoreada.

## Despliegue

1. Confirmar que la checklist de lanzamiento no tenga bloqueos críticos.
2. Crear un backup y verificar que el proveedor informe estado correcto.
3. Ejecutar migraciones con `npm run db:postgres:deploy`, incluidas las migraciones incrementales de visitas técnicas y estimador. No usar `db push` en producción.
   Confirmar también la migración
   `20260714500000_add_lead_automation_outbox` antes de habilitar el webhook.
   Confirmar `20260715170000_add_content_redirects`,
   `20260715190000_secure_notification_undo` y
   `20260715200000_add_area_timestamps` antes de abrir tráfico.
   Confirmar también `20260715210000_add_lead_last_activity` y
   `20260715220000_add_media_rights_provenance`; ejecutar el backfill de
   actividad y revisar derechos recurso por recurso.
   Confirmar `20260826230000_add_private_object_deletion_outbox` y configurar
   su worker antes de recibir adjuntos reales.
   Confirmar `20260716170000_add_admin_concurrency_and_operational_indexes` y
   `20260716180000_isolate_possible_lead_duplicates` antes de abrir formularios
   y administración al equipo.
4. Construir con `npm run build:postgres`.
5. Confirmar que el estimador esté apagado hasta completar migración, pruebas y validación comercial obligatoria; registrar la versión aprobada.
6. Mantener `LEAD_AUTOMATION_ENABLED=false` hasta validar el receptor, la firma,
   el cron y el acceso Admin. Después de verificar la tabla, usar
   `LEAD_AUTOMATION_CAPTURE_ENABLED=true` para no perder eventos durante esa pausa.
7. Mantener `LEAD_RETENTION_ENABLED=false` hasta completar aprobación, staging,
   restore y monitoreo. Automatización y retención usan secretos y crons separados.
8. Publicar una versión inmutable y conservar el identificador de la versión anterior.
9. Consultar `/api/health` y `/api/ready`.
10. Probar home, la ruta directa `/estimador`, un cálculo por nivel, persistencia de la instantánea, un proyecto, un servicio, contacto, login, guardado de una consulta con adjunto, preferencia pública de visita, coordinación desde admin y descarga `.ics`.
   En staging, ejecutar también un caso controlado de eliminación por privacidad
   y verificar base, storage y constancia mínima según `docs/PRIVACY_ERASURE.md`.
11. Habilitar el estimador sólo en una ventana monitoreada y revisar logs, errores `409` y tasa de errores durante al menos 15 minutos.
12. Sólo con endpoint y credenciales reales, habilitar automatizaciones en una
    ventana monitoreada, crear un evento, ejecutar el cron autenticado y
    conciliarlo entre outbox, admin y receptor. Si faltan, conservar `NOT RUN` y
    el switch apagado.
13. Verificar `/manifest.webmanifest`, `/sw.js`, iconos y fallback offline; luego
    completar la instalación en Android y iPhone sobre el dominio HTTPS final.

## Operación de la PWA

La política completa está en `docs/PWA.md`. El service worker sólo precarga la
pantalla offline y los iconos; no guarda páginas, imágenes, APIs ni datos de
personas. Una consulta sin conexión permanece únicamente en la memoria de la
página y nunca se reenvía de forma automática.

Para una actualización visual ejecutar `npm run assets:pwa`, revisar los PNG y
publicar junto con el manifest. Para un cambio de política, incrementar
`CACHE_VERSION` y verificar que la activación retire los cachés anteriores.

Si aparecen páginas antiguas, respuestas privadas en Cache Storage o reenvíos
automáticos, tratarlo como incidente: detener el rollout, restaurar el worker
estable y comprobar tanto una sesión nueva como una instalación existente.

El seed de producción está deshabilitado. Sólo para una carga inicial deliberada se puede usar `ARQVIA_ALLOW_PRODUCTION_SEED=true`; retirar la variable inmediatamente después. PostgreSQL exige credenciales admin explícitas de al menos 16 caracteres, rechaza valores conocidos o placeholder y se detiene si encuentra activa la cuenta `admin@arqvia.local`. En una carga productiva autorizada, la contraseña del admin indicado se reemplaza por el valor explícito para no conservar un hash bootstrap anterior. El seed no actualiza rangos existentes y nunca reemplaza la validación comercial.

## Rollback

1. Detener nuevas publicaciones y registrar la hora del incidente.
2. Si el incidente afecta rangos o envíos del estimador, apagar primero el switch global y verificar la alternativa de contacto en `/estimador`. Conservar las instantáneas existentes.
3. Si afecta automatizaciones, poner `LEAD_AUTOMATION_ENABLED=false`, conservar
   `LeadAutomationDelivery` y mantener `LEAD_AUTOMATION_CAPTURE_ENABLED=true`
   para que los leads nuevos queden pendientes. Deshabilitar también la captura
   sólo si el incidente afecta el outbox; en ese caso no existe backfill automático.
4. Si el error es sólo de aplicación y la migración es compatible, volver a desplegar la última versión estable.
5. Si la migración es incompatible, no improvisar SQL destructivo. Crear una base nueva desde el punto de restauración anterior a la migración, validar conteos y apuntar la aplicación restaurada a esa base.
6. Verificar `/api/ready`, login, cantidad de usuarios, consultas, estimaciones, visitas técnicas, eventos del outbox, adjuntos, proyectos, servicios y últimas fechas de creación.
7. Validar que las URLs de imágenes sigan disponibles en el storage persistente.
8. Abrir el tráfico y documentar causa, impacto, recuperación y acción preventiva. No volver a habilitar el estimador sin repetir pruebas y sign-off cuando cambien los valores, ni la automatización sin validar firma, idempotencia y un evento controlado.
9. Si el incidente afectó la PWA, verificar también una instalación existente,
   el fallback offline y que no haya respuestas de `/api` ni `/admin` en Cache
   Storage.

## Ensayo de restauración PostgreSQL

1. Restaurar el backup elegido en una base aislada, nunca sobre la base activa.
2. Ejecutar `prisma migrate status` con el schema PostgreSQL y confirmar que no haya migraciones fallidas.
3. Comparar conteos de `User`, `Lead`, `EstimateConfig`, `EstimateRule`, `LeadEstimate`, `TechnicalVisit`, `LeadAutomationDelivery`, `LeadAttachment`, `Project`, `Service`, `MediaAsset` y `AuditLog` contra el origen o el manifiesto operativo.
4. Iniciar una instancia temporal contra la base restaurada.
5. Probar login, lectura de consultas, contenido público, creación/eliminación de una consulta de prueba y apertura de la agenda de visitas.
6. Eliminar la consulta de prueba de acuerdo con la política interna y registrar el resultado del ensayo.

## Ensayo de restauración SQLite local

SQLite no es la base productiva distribuida, pero el flujo local debe ser
reproducible:

```bash
npm run db:backup:sqlite
npm run db:verify-restore:sqlite
```

El primer comando crea una copia consistente con `VACUUM INTO`, ejecuta
`PRAGMA integrity_check` y escribe un manifiesto con SHA-256 y conteos críticos.
El segundo copia el backup más reciente y sus adjuntos a un directorio aislado, vuelve a
validar checksum, integridad, tablas y conteos, y elimina el restore temporal.
También acepta la ruta explícita de un manifiesto como argumento.

## Tareas programadas

- Ejecutar `npm run db:cleanup:rate-limits` una vez por día para retirar buckets expirados.
- Ejecutar el cron protegido de automatizaciones con la frecuencia operativa definida y alertar si crece el backlog o aparecen fallos terminales.
- Ejecutar el cron de retención sólo después de su aprobación; alertar por fallos, registrar conteos y revisar periódicamente que el plazo siga vigente.
- Revisar errores de aplicación y readiness diariamente durante la primera semana posterior al lanzamiento.
- Revisar mensualmente fuentes, vigencia, aprobación y versión de los rangos del estimador; adelantar la revisión ante cambios relevantes de costos.
- Revisar dependencias y ejecutar `npm audit` al menos una vez por mes, sin aplicar actualizaciones mayores automáticas.
- Verificar trimestralmente restore de base y acceso a los objetos del storage.

## Validacion de entorno y smoke post-deploy

El chequeo reproducible de liveness y readiness es:

```bash
SERVICE_BASE_URL=https://dominio-final.example npm run ops:check
```

`ops:check` exige HTTP 200, `Content-Type: application/json` y los estados
`ok`/`ready`. No autentica ni modifica datos. Un timeout, una respuesta HTML o
un `503` deben detener el rollout; readiness no reemplaza liveness.

Antes de consultar la base, el release gate ejecuta:

```bash
npm run release:env
```

El control no imprime valores de variables. Bloquea origenes no HTTPS o
desparejos, secretos debiles, `ADMIN_PASSWORD` en runtime, seed productivo,
SQLite, storage local, analytics sin identificador valido, rate limiting en
memoria, proxy no declarado y una política de retención no declarada de forma
explícita. Un resultado local bloqueado es esperado cuando
se usa `.env.example`; no completar valores con datos inventados.

En SQLite, el manifiesto es evidencia de integridad y consistencia local, no
una firma criptografica ni prueba de autenticidad frente a un atacante con
acceso al directorio. El restore rechaza manifiestos sin evidencia `ok`,
archivos que no sean regulares, enlaces simbolicos y rutas fuera de
`backups/`. Conservar `.db`, `.db.json` y `.db.attachments/` como una unidad y registrar
fecha, operador, tamano y resultado.
