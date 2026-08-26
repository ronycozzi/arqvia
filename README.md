# Arqvia

Sitio web comercial para arquitectura, obra e interiores en Córdoba, Argentina.

La implementación incluye páginas públicas orientadas a conversión, portfolio con casos de estudio, servicios, formulario de presupuesto, WhatsApp, guardado de consultas, panel administrativo con Auth.js, Prisma y una base preparada para crecer con más gestión de contenido.

## Features

- Home premium y breve con hero arquitectónico, métricas, servicios, proyectos destacados, antes/después, proceso resumido, prueba social y cierre comercial. Equipo, zonas y contenido profundo viven en páginas específicas.
- Motion editorial de una sola entrada, sin seguimiento del cursor ni desplazamiento forzado: un observador compartido activa secciones, cards y proceso, con contraste constante y salida completa para `prefers-reduced-motion`.
- Portfolio con filtros y detalle de proyecto como caso de estudio.
- Servicios con páginas individuales, proceso, FAQ, proyectos relacionados y mensajes de WhatsApp por servicio.
- Formulario progresivo con seis datos esenciales visibles, calificación opcional, Zod, React Hook Form, honeypot, validación server-side, same-origin check, rate limiting y adjuntos privados.
- Guardado de cada consulta como expediente independiente en Prisma; coincidencias de email y teléfono se señalan como posible reconsulta sin alterar el historial anterior.
- Admin con Auth.js Credentials y separación de responsabilidades: Admin opera consultas y sistema, Editor publica contenido y Viewer revisa contenido con información comercial enmascarada.
- Exportación auditada de consultas y actividad sobre snapshots privados paginados, sin cargar todos los identificadores en memoria.
- Listados administrativos paginados con URLs canónicas, filtros preservados y corrección automática de páginas inexistentes.
- Actividad comercial de leads basada en el último contacto real, notas, adjuntos, visitas y cambios de estado, con backfill idempotente para instalaciones existentes.
- CRM con responsable, próximo seguimiento, filtros de vencidos/asignación, monto presupuestado, valor ganado, motivo de pérdida e historial comercial tipado por consulta.
- Contactos por WhatsApp y email abiertos desde el CRM con registro auditado del canal y actualización de la última actividad.
- Estimador Premium de inversión con rangos en USD, supuestos versionados, instantánea por lead y configuración exclusiva para Admin.
- Módulo Premium de visitas técnicas con preferencias públicas, agenda operativa Admin-only, responsables, estados y exportación de calendario `.ics`.
- Automatización de leads con outbox persistente, webhook firmado, reintentos controlados y monitoreo administrativo, sin acoplar Arqvia a un proveedor.
- PWA instalable con iconos Arqvia, safe areas móviles y fallback offline sin cachear páginas, APIs, formularios ni datos personales.
- Panel para marca, contacto, home, páginas institucionales, proyectos, servicios, categorías, testimonios, equipo, áreas de trabajo, FAQ, blog y documentos legales.
- Tracking de eventos para envíos de formulario y clics estratégicos de WhatsApp mediante `window.dataLayer`.
- Blog, páginas locales, FAQ, legales, sitemap, robots.txt y JSON-LD.
- Proyectos y servicios con estado Borrador/Publicado para preparar contenido sin exponerlo en la web ni en el sitemap.
- Redirecciones permanentes administradas para conservar URLs anteriores cuando cambia el slug de proyectos, servicios, publicaciones o zonas.
- Mutaciones editoriales y cambios de usuarios transaccionados junto con su registro de auditoría.
- Control de concurrencia optimista en proyectos, servicios, publicaciones, testimonios, equipo, FAQ, áreas y configuración para evitar que dos editores sobrescriban cambios silenciosamente.
- Gestión visual de galerías con vista previa, tipo, texto alternativo, descripción, orden y selección desde la biblioteca aprobada.
- Revocación reversible de accesos internos sin eliminar autoría histórica, con cierre inmediato de sesiones.
- Eliminación Admin-only de consultas por privacidad, incluyendo adjuntos privados, relaciones y auditorías vinculadas, con constancia mínima sin PII.
- Retención programable y apagada por defecto para eliminar únicamente consultas `LOST` vencidas, en lotes acotados y con auditoría sin PII.
- Especificaciones del estimador, automatizaciones y PWA en `docs/ESTIMATOR.md`, `docs/AUTOMATIONS.md` y `docs/PWA.md`, contrato de medición en `docs/ANALYTICS.md`, checklist de salida en `docs/LAUNCH_CHECKLIST.md` y runbook en `docs/OPERATIONS.md`.
- Vitest, Playwright y GitHub Actions.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Prisma
- SQLite local mediante `DATABASE_URL`
- Variante PostgreSQL aislada, migración base reproducible y cliente Prisma específico para producción.
- Auth.js / NextAuth Credentials
- Zod
- React Hook Form
- Vitest
- Playwright

## Setup

Requisitos:

- Node.js `>=24.15.0 <25`
- npm `>=11.12.1 <12`

1. Instalar dependencias:

```bash
npm install
```

2. Crear archivo de entorno:

```bash
cp .env.example .env
```

En Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Generar Prisma y crear base local:

```bash
npm run db:generate
npm run db:init
npm run db:seed
```

4. Iniciar desarrollo:

```bash
npm run dev
```

Abrir `http://localhost:3000`.

Los iconos PWA están incluidos. Después de cambiar la identidad visual,
regenerarlos con `npm run assets:pwa` y revisar los cuatro PNG de
`public/icons/`.

## Admin

Credenciales iniciales configurables por entorno:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `AUTH_SECRET`

Para desarrollo local, `.env.example` incluye credenciales de arranque. En producción, `prisma/seed.ts` se bloquea por completo salvo que una carga inicial controlada habilite explícitamente `ARQVIA_ALLOW_PRODUCTION_SEED=true`. PostgreSQL exige credenciales explícitas fuertes, rechaza los valores bootstrap conocidos y no continúa si la cuenta local predeterminada está activa. Una carga productiva autorizada reemplaza el hash del administrador indicado por la contraseña explícita.

Rutas:

- `/admin/login`
- `/admin`
- `/admin/leads`
- `/admin/automations`
- `/admin/estimador`
- `/admin/visitas`
- `/admin/reports`
- `/admin/activity`
- `/admin/system`
- `/admin/settings`
- `/admin/home`
- `/admin/pages`
- `/admin/projects`
- `/admin/services`
- `/admin/categories`
- `/admin/media`
- `/admin/testimonials`
- `/admin/team`
- `/admin/areas`
- `/admin/faq`
- `/admin/blog`
- `/admin/legal`
- `/admin/users`

`/admin/home` centraliza el contenido comercial de la portada sin mezclarlo con
la identidad global. Admin y Editor pueden gestionar el contexto del hero, sus
señales de confianza, cuatro métricas, títulos y bajadas de proyectos,
servicios y antes/después, el proceso de cuatro pasos, tres diferenciales, el
cierre comercial y los metadatos SEO. Viewer dispone de lectura sin controles
de escritura. Cada guardado valida la estructura completa, evita sobrescrituras
desde pestañas antiguas, registra auditoría y actualiza la home pública después
del commit. Nombre, colores, imagen, titular principal y CTAs continúan en
`/admin/settings`.

`/admin/pages` gobierna las páginas públicas `/nosotros` y `/proceso`. Las dos
rutas son fijas: este módulo no permite crear, eliminar ni publicar rutas
institucionales arbitrarias. Admin y Editor pueden abrir, editar y guardar ambas
páginas; Viewer puede revisarlas en modo de sólo lectura, sin controles de
escritura.

Cada página se almacena como un registro `InstitutionalPage` identificado por su
`slug` único. Los campos comunes incluyen encabezado, introducción, cierre
comercial, etiquetas de CTA, mensaje contextual de WhatsApp y metadatos SEO. El
campo `payloadJson` conserva la estructura específica de cada ruta: decisiones,
filosofía y presentación del equipo para Nosotros; siete etapas ordenadas para
Proceso. Los payloads se validan con contratos distintos por slug antes de
persistirse. El guardado usa concurrencia optimista, auditoría transaccional y
revalidación posterior al commit; si todavía no existe un registro válido, la
página pública conserva su contenido base protegido.

El seed crea los registros iniciales de `nosotros` y `proceso` mediante upsert,
pero no reemplaza cambios guardados previamente. Para inicializar o sincronizar
una instalación local después de incorporar el módulo:

```bash
npm run db:generate
npm run db:init
npm run db:seed
```

Para verificar el contrato de contenido y la integración completa sin atribuir
resultados antes de ejecutarlos:

```bash
npm run content:check
npm run verify
npm run verify:e2e
```

La revisión manual debe incluir `/admin/pages`, los editores de Nosotros y
Proceso para cada rol, y las páginas públicas `/nosotros` y `/proceso`. Las
cifras históricas de la sección **Verificación local registrada** sólo deben
actualizarse después de una medición completa.

`/admin/legal` está reservado a Admin y administra únicamente las cuatro rutas
institucionales previstas: privacidad, términos, cookies y aviso de
presupuestos. Cada documento admite borrador o publicación, contenido por
párrafos, metadatos SEO y evidencia de revisión. Publicar exige identificar a
la persona responsable, usa control de concurrencia y registra auditoría. Un
borrador nunca reemplaza la versión pública vigente; si todavía no existe una
versión publicada, el sitio conserva el contenido base protegido.

`/admin/system` ofrece una lectura Admin-only de conexión de base, persistencia,
almacenamiento, protección antiabuso, URL pública, analítica, automatizaciones,
retención y evidencia de backup/restore. En SQLite puede mostrar fecha y tamaño
del último manifiesto local verificado, nunca su ruta o checksum. La vista
muestra únicamente estados y proveedores; nunca imprime secretos, credenciales
ni cadenas de conexión.

### Estimador Premium de inversión

La herramienta se conserva en `/estimador` para uso directo cuando su switch
global está habilitado, pero no se promociona en la home, navegación, footer ni
sitemap. El cálculo combina categoría, superficie de 10 a 2.000 m² y nivel
Esencial/Equilibrado/Superior. Usa el mayor valor entre costo por superficie y
mínimo de proyecto, aplica el multiplicador del nivel y redondea el rango a
pasos de USD 500, USD 2.500 o USD 5.000 según el importe.

Sólo Admin puede modificar textos, multiplicadores, categorías, rangos y estado
público desde `/admin/estimador`. La herramienta no ocupa la navegación diaria:
se accede desde `Estado` cuando hace falta administrarla. Cada guardado incrementa la versión y genera
auditoría. El formulario no confía en totales del navegador: al crear el lead,
el servidor exige la versión vigente, una regla activa y el estimador habilitado,
y vuelve a calcular la instantánea persistida. Un cálculo obsoleto se rechaza
con `409`.

Los valores incluidos por migración y seed son supuestos iniciales. La
validación y aprobación escrita de una persona responsable comercial de Arqvia
es obligatoria antes de habilitarlos en producción. Fórmula completa, tabla seed,
versionado, permisos, migración, pruebas y rollout: `docs/ESTIMATOR.md`.

### Visitas técnicas Premium

Cuando una persona marca `Necesito visita técnica` en el formulario público,
puede informar una fecha preferida, franja (`Mañana`, `Tarde` o `Indistinto`),
dirección o referencia y notas de contexto. Estos datos expresan una
preferencia: el equipo debe confirmar el día y el horario antes de la visita.
Cada nuevo envío crea una consulta y, cuando corresponde, una visita
`Solicitada` independientes. Si coinciden email y teléfono con una consulta
anterior, el panel muestra una relación de posible reconsulta para revisión
humana, pero nunca modifica su estimación, visita, notas, adjuntos o estado. La
respuesta pública no informa si la identidad ya existía.

La ruta `/admin/visitas` está reservada al rol Admin. La agenda
incluye búsqueda, filtro por estado, paginación y vistas de pendientes,
próximas, historial y todas. La coordinación se edita desde
`/admin/leads/[id]#visita-tecnica`: fecha y hora confirmadas, duración,
responsable activo, dirección y notas internas. Editor y Viewer no acceden a la
agenda, la dirección, la coordinación ni las notas de visita.

Estados disponibles:

- `REQUESTED`: Solicitada.
- `SCHEDULED`: Agendada.
- `CONFIRMED`: Confirmada.
- `COMPLETED`: Realizada.
- `CANCELLED`: Cancelada.

Los estados Agendada, Confirmada y Realizada requieren fecha y hora. La agenda
interpreta la coordinación en `America/Argentina/Cordoba`. Una visita con fecha
y hora puede descargarse como archivo `.ics` desde la agenda o el detalle del
lead. El endpoint autenticado
`/api/admin/visitas/[id]/calendar` también exige rol Admin, responde sin
caché e incluye horario, duración, cliente, tipo de proyecto, ubicación y notas
internas. Es una exportación puntual para importar en un calendario; no mantiene
sincronización bidireccional con Arqvia.

### Automatización de leads

Cada alta o reconsulta puede generar un evento en un outbox persistente con un
`payloadJson` inmutable creado dentro de la misma transacción. La ruta pública
nunca llama al webhook. Toda entrega externa ocurre exclusivamente cuando el
cron autenticado procesa la cola. Cada intento aplica timeout y límite de
reintentos, y firma `timestamp + "." + cuerpo` con HMAC-SHA-256. Sólo una
respuesta `2xx` confirma la entrega; los fallos permanecen observables y pueden
reencolarse desde `/admin/automations`, reservado al rol Admin. Reencolar no
envía: la siguiente ejecución del cron realiza el intento.

El scheduler llama `GET` o `POST /api/cron/automations` con
`Authorization: Bearer <AUTOMATION_CRON_SECRET>`; cada ejecución procesa hasta
5 eventos en paralelo dentro de un máximo de 30 segundos y responde sin caché.
Cada lease usa `claimToken` para impedir que un worker vencido confirme o falle
un evento reclamado después por otro proceso.

El webhook es neutral respecto del destino. El receptor puede ser un CRM, una
automatización que agregue filas a Google Sheets, Make, Zapier o un servicio
propio. La entrega es al menos una vez, por lo que el receptor debe deduplicar
por el identificador estable del evento y verificar la firma antes de procesar
datos personales.

La captura durable se controla con `LEAD_AUTOMATION_CAPTURE_ENABLED` y puede
permanecer activa mientras `LEAD_AUTOMATION_ENABLED=false` pausa el despacho.
Si el nuevo switch no está definido, hereda el valor del switch legacy para no
cambiar despliegues existentes. El despacho sólo está listo cuando también
existen una URL HTTPS real, una allowlist exacta en
`LEAD_WEBHOOK_ALLOWED_HOSTS`, `LEAD_WEBHOOK_SECRET` y
`AUTOMATION_CRON_SECRET` privados de al menos 32 caracteres cada uno. El
contrato, payload, rollout y runbook específico están en
`docs/AUTOMATIONS.md`.

**Estado de entrega externa:** `NOT RUN`. Este workspace no contiene
credenciales ni un endpoint externo real; no se debe habilitar ni declarar una
entrega exitosa hasta configurarlos y registrar un smoke test real.

En proyectos, la galería acepta una imagen por línea. Para casos de estudio
con mejor SEO y accesibilidad, usar:

```txt
/images/proyecto.webp | final | Alt text descriptivo | Caption visible en galería
/images/proceso.webp | process | Alt text descriptivo | Etapa de obra o decisión técnica
```

Tipos admitidos: `final`, `before`, `after`, `process`, `render` y `plan`.

La biblioteca visual del admin permite subir JPG, PNG, WebP y AVIF de hasta 5 MB,
buscar por título, alt text, ruta, procedencia o derechos, copiar la URL pública y
eliminar recursos con confirmación. Cada recurso admite URL de origen, nota de
licencia y aprobación sellada por el servidor con responsable y fecha. La API
valida tipo MIME, firma real del archivo,
categoría, tamaño, origen de la petición y aplica rate limit por usuario/IP. En
desarrollo guarda archivos en `public/uploads/media`. En producción puede usar
AWS S3, Cloudflare R2 o cualquier storage S3 compatible mediante
`MEDIA_STORAGE_PROVIDER=s3`; la subida, el borrado y las URLs públicas estables
quedan gestionados por el mismo flujo del admin.

Los formularios de proyectos y servicios reciben una selección inicial acotada
de recursos recientes. Si una imagen aprobada no aparece, el selector consulta
la biblioteca completa mediante `GET /api/admin/media`, con sesión interna,
límite por usuario/IP y respuesta minimizada a id, título, categoría, alt text y
URL. Viewer puede buscar y seleccionar para lectura, pero no subir, aprobar ni
eliminar recursos.

Las relaciones entre proyectos, servicios, preguntas frecuentes y testimonios
también usan una selección inicial acotada. Al escribir dos caracteres, el campo
consulta `GET /api/admin/references`, autenticado y limitado por usuario/IP. La
respuesta contiene únicamente identificador, etiqueta y contexto breve; al editar,
la relación actual se conserva aunque ya no esté entre los primeros resultados.
Viewer puede consultar opciones para sostener las vistas de sólo lectura, pero las
acciones de guardado continúan restringidas a Admin y Editor.

La navegación administrativa mantiene una única matriz tipada de acceso y gestión.
Cada módulo declara qué roles pueden verlo y cuáles pueden operarlo. Una prueba de
inventario compara esa matriz con todas las rutas protegidas de primer nivel para
evitar que un módulo nuevo quede fuera de la política y de la navegación.

El control `RG-MEDIA-001` bloquea el release si una imagen usada por contenido
público no tiene ficha o aprobación individual válida. El contrato y el flujo de
revisión están en `docs/MEDIA_RIGHTS.md`.

El formulario de presupuesto admite hasta 3 fotos o planos en PDF, JPG, PNG,
WebP o AVIF, con un máximo de 5 MB por archivo y 12 MB en total. Las imágenes
se decodifican, rotan y normalizan a WebP para eliminar metadatos innecesarios;
los PDF se validan por firma. En local se guardan fuera de `public`, dentro de
`storage/lead-attachments`. En S3/R2 se crean como objetos privados y solo se
pueden descargar desde la ruta autenticada del lead. Solo Admin puede ver,
descargar y borrar adjuntos; Editor y Viewer no acceden a su contenido ni metadatos.
El borrado retira los metadatos en una transacción y crea, en la misma operación,
un trabajo durable para eliminar el objeto privado. El worker reintenta fallos del
proveedor sin dejar archivos sensibles fuera de seguimiento ni referencias rotas
en el lead.

## Environment Variables

Ver `.env.example`.

Requeridas:

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_URL`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_WHATSAPP_NUMBER`
- `NEXT_PUBLIC_WHATSAPP_MESSAGE`
- `NEXT_PUBLIC_ANALYTICS_PROVIDER`: `none`, `ga4` o `gtm`.
- `NEXT_PUBLIC_ANALYTICS_ID`: identificador `G-...` o `GTM-...` compatible con el proveedor.
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `PRISMA_LOG_QUERIES` opcional, usar `true` solo para depurar SQL.
- `RATE_LIMIT_STORE`: `memory` en local o `database` para compartir límites entre instancias.
- `TRUST_PROXY_PROVIDER`: `none` en local; `vercel` o `cloudflare` según la infraestructura pública. No se aceptan proxies genéricos porque no permiten distinguir cabeceras verificadas de valores enviados por el cliente.
- `MEDIA_STORAGE_PROVIDER`: `local` en desarrollo o `s3` en producción.
- `S3_BUCKET`, `S3_REGION`, `S3_PUBLIC_BASE_URL`, `S3_ACCESS_KEY_ID` y `S3_SECRET_ACCESS_KEY` cuando se usa S3.
- `S3_ENDPOINT` y `S3_FORCE_PATH_STYLE` opcionales para R2 u otros proveedores compatibles.
- `ARQVIA_STRICT_PUBLIC_URL` opcional, usar `true` en hosting para bloquear despliegues con `NEXT_PUBLIC_SITE_URL` apuntando a `localhost`.
- `LEAD_AUTOMATION_CAPTURE_ENABLED`: captura altas y reconsultas en el outbox aunque el despacho esté pausado; si se omite, hereda `LEAD_AUTOMATION_ENABLED` por compatibilidad.
- `LEAD_AUTOMATION_ENABLED`: kill switch del despacho externo; con `false` el worker no reclama eventos pendientes.
- `LEAD_WEBHOOK_URL`: URL HTTPS del receptor neutral (CRM, Google Sheets mediante un intermediario, Make, Zapier o servicio propio).
- `LEAD_WEBHOOK_ALLOWED_HOSTS`: lista separada por comas de hostnames exactos autorizados; es obligatoria cuando la automatización se habilita en producción.
- `LEAD_WEBHOOK_SECRET`: secreto privado de al menos 32 caracteres para firmar el cuerpo con HMAC.
- `LEAD_WEBHOOK_TIMEOUT_MS`: timeout por intento entre 1.000 y 20.000 ms; default `8000`.
- `LEAD_AUTOMATION_MAX_ATTEMPTS`: máximo entre 1 y 10 intentos antes de requerir revisión o reencolado administrativo; default `5`.
- `AUTOMATION_CRON_SECRET`: secreto privado e independiente, de al menos 32 caracteres, que protege la ejecución del cron.
- `LEAD_RETENTION_ENABLED`: activa la eliminación programada; debe permanecer en `false` hasta tener aprobación legal y operativa.
- `LEAD_RETENTION_DAYS`: antigüedad mínima de la última actividad de una consulta `LOST`, entre 90 y 3.650 días; default `730`.
- `LEAD_RETENTION_BATCH_SIZE`: máximo de consultas por ejecución, entre 1 y 100; default `25`.
- `DATA_RETENTION_CRON_SECRET`: secreto privado de al menos 32 caracteres para `GET` o `POST /api/cron/retention`.
- `PRIVATE_OBJECT_DELETION_CRON_SECRET`: secreto privado de al menos 32 caracteres para `GET` o `POST /api/cron/private-object-deletions`.

`NEXT_PUBLIC_SITE_URL` alimenta canonical URLs, Open Graph, JSON-LD y sitemap. En local puede usar `http://localhost:3000`; antes de publicar debe usar el dominio final del cliente, por ejemplo `https://arqvia.com.ar`.

La analítica permanece desactivada con `NEXT_PUBLIC_ANALYTICS_PROVIDER=none`.
Cuando se configura GA4 o GTM, el script externo se inserta únicamente después
de que la persona elige `Permitir medición`. Los eventos descartan parámetros
indefinidos, limitan texto y no deben incluir datos personales ni contenido de
formularios.

El proveedor S3 configurado también aloja los adjuntos privados de consultas.
El bucket debe bloquear acceso público por defecto; `S3_PUBLIC_BASE_URL` se usa
únicamente para la biblioteca visual pública del CMS.

En producción, `AUTH_SECRET` debe ser único, privado y tener al menos 32 caracteres. Siempre que `NODE_ENV=production`, el build y el runtime bloquean secretos placeholder como `replace-with-a-long-random-secret`, independientemente del proveedor de hosting.

## Commands

```bash
npm ci
npm run dev
npm run lint
npm run typecheck
npm run test
npm run test:e2e-residue
npm run content:check
npm run verify
npm run release:check
npm run build:release
npm run audit:critical
npm run audit:production
npm run audit:public -- --url http://localhost:3110
npm run security:scan
npm run ops:check -- --url http://localhost:3110
npm run build
npm run e2e
npm run verify:e2e
npm run assets:pwa
npm run db:generate
npm run db:migrate
npm run db:deploy
npm run db:postgres:schema
npm run db:postgres:baseline
npm run db:postgres:generate
npm run db:postgres:migrate
npm run db:postgres:deploy
npm run db:backfill:activity
npm run db:backfill:leads
npm run db:backfill:visits
npm run db:backup:sqlite
npm run db:verify-restore:sqlite
npm run db:cleanup:rate-limits
npm run build:postgres
npm run build:release
npm run build:vercel
npm run db:push
npm run db:init
npm run db:seed
npm run db:studio
```

Para ejecutar Playwright por superficie:

```bash
npm run e2e -- --project=chromium --workers=1
npm run e2e -- --project=mobile --workers=1
npm run verify:e2e
```

La suite usa el puerto `3100` por defecto. Si está ocupado por otro servicio,
se puede elegir un puerto local libre sin cambiar archivos: en PowerShell,
`$env:PLAYWRIGHT_PORT='3110'; npm run e2e`.

`npm run verify:e2e` ejecuta Chromium y mobile y, al terminar, comprueba que no
queden usuarios, leads, contenido, auditorías, rate limits ni archivos
reservados para Playwright. CI aplica el mismo control después de ambos
proyectos.

Comandos disponibles para verificar el módulo junto con el resto de la
aplicación, sin asumir resultados previos:

```bash
npm run lint
npm run typecheck
npm run test -- tests/technical-visit.test.ts
npm run build
npm run e2e -- --project=chromium --workers=1 --grep "technical visit"
```

## Database

SQLite local:

```env
DATABASE_URL="file:./dev.db"
```

`npm run db:init` ejecuta `prisma db push` de forma no destructiva para crear o sincronizar la base local. No borra consultas, usuarios ni contenido existente. También crea las tablas del estimador; no genera estimaciones para leads históricos.

Después de incorporar el módulo de visitas en una instalación SQLite existente,
ejecutar `npm run db:generate` y `npm run db:init` para generar el cliente,
sincronizar `TechnicalVisit` y recuperar solicitudes históricas marcadas con
`needsVisit`. El backfill también puede ejecutarse de forma aislada con
`npm run db:backfill:visits`. No se agregan variables de entorno específicas
para este módulo.

El mismo `npm run db:init` crea `LeadAutomationDelivery` para el outbox local.
No genera eventos para leads históricos ni para leads recibidos mientras
`LEAD_AUTOMATION_CAPTURE_ENABLED=false`.

Si la base SQLite está bloqueada, detener el servidor Next o Prisma Studio y volver a ejecutar el comando.

Para PostgreSQL en producción, usar la variante aislada en
`prisma/postgresql/schema.prisma`. Esto evita mezclar migraciones SQLite y
PostgreSQL y permite generar el cliente Prisma con el proveedor correcto.

Flujo recomendado para preparar PostgreSQL:

1. Configurar `DATABASE_URL` con la conexión de Neon, Supabase, Railway, Render u otro proveedor PostgreSQL.
2. Generar el schema PostgreSQL desde el schema local:

```bash
npm run db:postgres:schema
```

3. Crear la migración base antes del primer despliegue:

```bash
npm run db:postgres:baseline
```

4. Revisar `prisma/postgresql/migrations/20260713000000_init/migration.sql`.
   El comando protege la migración existente contra sobrescritura. Solo antes
   del primer despliegue puede regenerarse explícitamente con
   `ARQVIA_REGENERATE_BASELINE=true`.
5. Para cambios posteriores, crear migraciones incrementales contra una base de desarrollo:

```bash
npm run db:postgres:migrate -- --name nombre_del_cambio
```

6. En hosting, ejecutar:

```bash
npm run db:postgres:deploy
npm run build:postgres
```

`npm run db:postgres:deploy` genera el cliente PostgreSQL, aplica las migraciones
pendientes y luego ejecuta los backfills de actividad, identidad de leads y
visitas técnicas. Para una base que
ya estaba desplegada, la agenda se incorpora mediante
`prisma/postgresql/migrations/20260714300000_add_technical_visits/migration.sql`.
El estimador se incorpora mediante
`prisma/postgresql/migrations/20260714400000_add_investment_estimator/migration.sql`;
esa migración inserta valores seed con el estimador deshabilitado; deben permanecer sin tráfico
público hasta completar la validación comercial obligatoria. No usar `db push`
para estos cambios en producción.

El outbox de automatización se incorpora mediante
`prisma/postgresql/migrations/20260714500000_add_lead_automation_outbox/migration.sql`.
Aplicarlo antes de habilitar el webhook y verificar que
`LeadAutomationDelivery` quede incluido en backups y restauraciones.

El historial de URLs publicadas requiere además
`prisma/postgresql/migrations/20260715170000_add_content_redirects/migration.sql`.
Aplicarla antes de modificar slugs en producción para conservar las redirecciones
permanentes de proyectos, servicios, publicaciones y zonas.

El undo seguro de notificaciones y las fechas canónicas de zonas requieren:

- `prisma/postgresql/migrations/20260715190000_secure_notification_undo/migration.sql`
- `prisma/postgresql/migrations/20260715200000_add_area_timestamps/migration.sql`

Aplicarlas antes de desplegar esta versión. La primera conserva en servidor el
estado que puede restaurarse; la segunda evita fechas sintéticas en sitemap y
metadatos de zonas.

La actividad comercial real y la procedencia individual de medios requieren:

- `prisma/postgresql/migrations/20260715210000_add_lead_last_activity/migration.sql`
- `prisma/postgresql/migrations/20260715220000_add_media_rights_provenance/migration.sql`

Después de la primera, ejecutar `npm run db:backfill:activity`. La segunda no
autoriza recursos existentes: cada imagen pública debe revisarse y aprobarse
individualmente desde la biblioteca visual.

La concurrencia de usuarios, los índices operativos y el aislamiento de
reconsultas requieren además:

- `prisma/postgresql/migrations/20260716170000_add_admin_concurrency_and_operational_indexes/migration.sql`
- `prisma/postgresql/migrations/20260716180000_isolate_possible_lead_duplicates/migration.sql`
- `prisma/postgresql/migrations/20260716200000_add_lead_commercial_workflow/migration.sql`
- `prisma/postgresql/migrations/20260720180000_add_legal_pages/migration.sql`
- `prisma/postgresql/migrations/20260720210000_add_home_content/migration.sql`
- `prisma/postgresql/migrations/20260720230000_add_institutional_pages/migration.sql`

La primera evita que un formulario de usuario obsoleto reactive accesos
revocados y agrega índices para sesiones y auditoría. La segunda hace que cada
envío público conserve su propio expediente y sólo registre una relación de
posible duplicado con la consulta anterior. La tercera incorpora asignación,
seguimientos, valores comerciales, motivos de pérdida, actividad tipada y las
versiones editoriales que faltaban. La cuarta incorpora los cuatro documentos
legales versionados, su estado de publicación y la evidencia de revisión. La
quinta incorpora el contenido estructurado de la home para que la portada sea
administrable sin modificar código. La sexta crea `InstitutionalPage`, su índice
único por slug y el índice de actualización usados por Nosotros y Proceso. Debe
aplicarse antes de habilitar `/admin/pages` contra PostgreSQL; el seed posterior
completa los dos registros iniciales sin sobrescribir contenido existente.

7. Ejecutar `npm run db:seed` solo para la carga inicial controlada.
8. Probar login admin, guardado de leads, detección de posibles reconsultas, media library y CRUD principal.
9. Configurar backups automáticos del proveedor y hacer al menos una prueba de restore antes de publicar campañas pagas.

## Security Notes

- Validación server-side con Zod.
- Rate limiting en formulario.
- Same-origin check en envíos de consulta.
- Honeypot antispam.
- Admin protegido con Auth.js.
- Roles: Admin, Editor, Viewer.
- Headers de seguridad en `next.config.ts`.
- Admin y APIs internas con `Cache-Control: no-store` y `X-Robots-Tag: noindex`.
- Validación de variables privadas en `src/lib/server-env.ts`.
- En modo estricto, `AUTH_SECRET` debe ser unico, fuerte y no puede usar placeholders.
- Las sesiones incluyen una versión persistida y quedan revocadas cuando un administrador cambia la contraseña del usuario.
- Las cabeceras de IP reenviada solo se aceptan cuando `TRUST_PROXY_PROVIDER` declara un proxy de confianza.
- Validacion de URL publica en `src/lib/public-env.ts`; en produccion o con `ARQVIA_STRICT_PUBLIC_URL=true` bloquea `localhost`, `127.0.0.1` y dominios `.local`.
- El rate limit usa memoria en local y puede persistirse en PostgreSQL con `RATE_LIMIT_STORE=database` para compartir límites entre instancias.
- La media library usa disco local en desarrollo y un adaptador S3 compatible en producción.
- Las imágenes subidas se decodifican, limitan por dimensiones y píxeles, normalizan a WebP y eliminan metadatos antes de persistirlas.
- Las solicitudes con archivos tienen lectura acotada por bytes y tiempo; las imágenes de leads no pueden superar 8.000 px por lado ni 24 megapíxeles.
- La eliminación de adjuntos confirma primero metadatos y auditoría y luego limpia el objeto privado, para impedir referencias rotas; la eliminación de medios públicos conserva su estrategia transaccional con recuperación compensatoria.
- Los leads guardan email y teléfono normalizados e indexados para detectar posibles reconsultas sin recorrer todo el CRM.
- Cada envío público crea un lead independiente. Una coincidencia sólo establece `possibleDuplicateOfId`; el expediente anterior no recibe notas, adjuntos, estimaciones ni cambios de visita.
- El cambio de estado de leads y su auditoría usan transacciones serializables; el undo de notificaciones sólo acepta el estado previo emitido y guardado por el servidor.
- Los estados Presupuestado, Ganado y Perdido exigen primero el monto o motivo correspondiente; cada transición y cambio de responsable, seguimiento o valor deja actividad comercial tipada.
- El estimador recalcula cada rango en el servidor y rechaza configuración deshabilitada, categoría inactiva o versión obsoleta; los totales enviados por el navegador no son fuente de verdad.
- GA4 y GTM permanecen denegados hasta el consentimiento y reciben una actualización explícita a `denied` cuando la persona revoca la medición.
- Los webhooks de leads salen exclusivamente desde el cron autenticado, usando el snapshot inmutable del outbox, `claimToken` y HMAC; la ruta pública y el Admin nunca entregan. Los secretos no son variables `NEXT_PUBLIC_*` ni deben incluirse en logs.
- El dispatcher resuelve DNS antes de cada salida y rechaza direcciones privadas, loopback y rangos reservados; en producción debe complementarse con una política de egress del proveedor para reducir riesgo de DNS rebinding.
- La retención automática sólo considera leads `LOST` cuya última actividad superó el plazo configurado. Está apagada por defecto y el release gate exige secreto fuerte y aprobación fechada antes de activarla.
- CI ejecuta `npm run audit:production` para bloquear vulnerabilidades altas o críticas en dependencias de producción antes de publicar.
- `npm run security:scan` revisa archivos versionables en busca de claves privadas, tokens de alta confianza y asignaciones sensibles antes de lint, tests y build.
- Sin secretos de producción hardcodeados.
- `npm run audit:production` revisa dependencias de producción sin forzar actualizaciones mayores; la pasada registrada no reporta vulnerabilidades.

## Accessibility Notes

- HTML semántico, headings y landmarks.
- Navegación, formularios, filtros y acordeones accesibles por teclado.
- Focus visible.
- Labels y errores accesibles.
- Soporte `prefers-reduced-motion`.
- Alt text en imágenes principales.

## Performance Notes

- `next/image` en imágenes relevantes.
- Carga lazy en imágenes no prioritarias.
- JavaScript acotado a componentes interactivos.
- Estructura de datos lista para paginación en portfolio y admin.

## Deployment

Recomendado: Vercel para el sitio y Neon, Supabase, Railway o Render PostgreSQL para base de datos cuando se migre el datasource desde SQLite.

Pasos:

1. Crear PostgreSQL.
2. Configurar `DATABASE_URL` y usar los comandos `db:postgres:*`; no editar manualmente el schema generado.
3. Configurar variables de entorno en hosting.
4. Definir `NEXT_PUBLIC_SITE_URL` con el dominio publico final.
5. Activar `ARQVIA_STRICT_PUBLIC_URL=true` para evitar sitemap/canonical de desarrollo.
6. En previews automatizados de Vercel, definir `VERCEL_PREVIEW_FEEDBACK_ENABLED=0` sólo para Preview para evitar que la Toolbar externa altere CSP y mediciones.
7. Mantener `LEAD_AUTOMATION_ENABLED=false` hasta configurar y validar los dos secretos, la URL HTTPS y el cron protegido; después de verificar el outbox, `LEAD_AUTOMATION_CAPTURE_ENABLED=true` permite conservar eventos durante esa pausa.
8. Ejecutar `npm run db:postgres:deploy`.
9. Cargar contenido.
10. Completar las aprobaciones de `.env.example`; declarar explícitamente las cuatro variables `LEAD_RETENTION_*`/`DATA_RETENTION_CRON_SECRET`; y ejecutar `npm run release:check`. El procedimiento y cada bloqueo están en `docs/RELEASE_GATE.md`.
11. Probar manifest, instalación y fallback offline sobre HTTPS según `docs/PWA.md`.
12. Vercel usa `npm run build:vercel`: los previews ejecutan el build PostgreSQL
    técnico y el destino Production deriva obligatoriamente a `build:release`.
    El build productivo queda ligado al SHA y al estado aprobado de PostgreSQL:

```bash
npm run build:release
```

13. Start:

```bash
npm run start
```

Preview técnico: `https://arqvia-preview.vercel.app`.

Producción comercial: `NOT DEPLOYED`. El release gate permanece bloqueado hasta
contar con dominio y contacto definitivos, infraestructura persistente,
aprobaciones de contenido, derechos visuales y revisión legal.

## Verificación local registrada

Última pasada completa: 2026-08-26.

- `npm run verify`: PASS. Incluye escaneo de secretos sobre 506 archivos de texto, lint, TypeScript, 108 archivos Vitest y 544 pruebas aprobadas. También incluye control de integridad de contenido y build de producción con 82 páginas/rutas generadas.
- `npm run verify:e2e`: PASS. Playwright ejecutó 302 casos en Chromium y mobile: 264 aprobados, 38 omitidos de forma intencional por rol/proyecto para evitar escrituras duplicadas y 0 fallidos; el control posterior confirmó base y uploads sin residuos E2E. Luego se repitieron 24 casos de regresión de portfolio y Axe sobre ambos viewports, también aprobados.
- Accesibilidad automatizada: cubre superficies públicas y los módulos de Home, páginas institucionales, proyectos, servicios, imágenes, áreas, FAQ, blog, categorías, equipo, testimonios, legales, usuarios, automatizaciones, configuración, actividad y Estado por rol, además de validaciones y diálogos en desktop y mobile.
- Exportación de leads: PASS con 1.005 registros, sin truncamiento y sobre un snapshot estable de identificadores.
- Exportación de actividad: PASS con filtros completos, auditoría y snapshot temporal privado; el archivo de identificadores se elimina al completar, cancelar o fallar el stream.
- Verificación visual local: PASS en home, portfolio, proyecto, servicios, contacto y acceso administrativo a 1440 px y 390 px, además de las 21 rutas principales del panel y cinco superficies administrativas móviles. Sin overflow horizontal, errores de consola, imágenes rotas, títulos sin marca, H1 duplicados ni solapamiento en el comparador.
- Auditor público: PASS sobre 55 rutas, sitemap y 404 tanto en local como en el preview; valida estado HTTP, HTML, title, H1, canonical, enlaces internos, contacto visible, copy interno y duplicados SEO.
- Backup y restore SQLite: PASS sobre una copia de 1.396.736 bytes; checksum, `PRAGMA integrity_check`, tablas esenciales y 22 conjuntos indexados coincidieron.
- Schema PostgreSQL generado y validado: PASS. Las 20 migraciones están aplicadas en Preview; la base productiva continúa sin promoverse.
- `npm run audit:production`: PASS. `npm audit --omit=dev --audit-level=high` informa 0 vulnerabilidades.
- `npm run security:scan`: PASS sobre los archivos de texto versionables; no se imprimen valores sensibles durante el control.
- `npm run ops:check`: PASS en local y en el Preview HTTPS. Health y readiness devolvieron HTTP 200 con JSON esperado; `--url` tiene validación y ya no puede consultar silenciosamente otro puerto.
- Login de Preview: PASS con el administrador canónico, dashboard, ruta protegida de Estado y viewport móvil sin overflow.
- `npm run release:check`: BLOCKED por 13 controles externos pendientes. El comando completó tanto ambiente como contenido y operación: dominio, secretos/bootstrap final, contacto real, PostgreSQL, S3 y borrado privado, analítica, antiabuso distribuido, contenido, derechos individuales de medios, publicación y aprobación legal, retención y evidencia operativa. El estimador deshabilitado y las automatizaciones en modo captura segura pasan sus controles.
- Retención programada: `NOT ENABLED`. El código y las pruebas están completos, pero faltan política legal, aprobación, scheduler y ensayo monitoreado en staging.
- Lighthouse local sobre el build final: desktop 99 Performance y 100 en Accessibility, Best Practices y SEO; móvil, mediana de tres corridas, 85 Performance y 100 en las otras tres categorías. En móvil se midieron FCP 1,25 s, LCP 4,22 s, TBT 121 ms y CLS 0 bajo throttling simulado.
- Lighthouse móvil sobre el preview HTTPS actualizado: Performance 92, Accessibility 100, Best Practices 100 y SEO 100; FCP 1,0 s, LCP 3,1 s, TBT 130 ms y CLS 0.
- Preview técnico: `https://arqvia-preview.vercel.app`. Producción comercial: `NOT DEPLOYED` por los bloqueos explícitos del release gate.
- Informe detallado de esta pasada: `docs/INTEGRAL_AUDIT_2026-08-26.md`.

## Project Structure

```text
src/app                 App Router pages, API routes, sitemap and robots
src/components          Shared UI, public components and admin components
src/lib                 Site config, content, db, validation, analytics, utilities
src/types               Shared TypeScript types and NextAuth augmentation
prisma                  Prisma schema and seed
tests/e2e               Playwright E2E tests
docs                    Product plan, launch checklist and implementation notes
.github/workflows       CI configuration
```

## Production Checklist

- Configurar logo, colores, WhatsApp y datos de contacto.
- Configurar `NEXT_PUBLIC_SITE_URL` con el dominio final y activar `ARQVIA_STRICT_PUBLIC_URL=true`.
- Revisar textos legales con asesoría correspondiente.
- Configurar proveedor de analítica y consentimiento si aplica.
- Configurar base de datos y backups.
- Completar la checklist de `docs/AUTOMATIONS.md`; la entrega externa sigue `NOT RUN` mientras falten credenciales reales.
- Validar comercialmente cada valor seed del estimador, registrar aprobador, fecha, fuente y versión, y mantener el switch global apagado hasta obtener el sign-off.
- Ejecutar lint, typecheck, unit tests, build y Playwright antes de publicar.
- Instalar la PWA en Android y iPhone reales y registrar la prueba sobre el dominio HTTPS final.
- Medir Lighthouse solo en navegador real y reportar resultados reales.
