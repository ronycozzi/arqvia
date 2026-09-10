# Arqvia Release Gate

`npm run release:check` es el control obligatorio previo a un despliegue de
producción. Está separado de `npm run verify`: una instalación local debe poder
compilar y probarse aunque todavía no tenga dominio, infraestructura o
aprobaciones finales.

## Qué bloquea

- Dominio y `AUTH_URL` HTTPS finales, coincidentes y con modo estricto activo.
- `AUTH_SECRET` débil, bootstrap productivo habilitado o `ADMIN_PASSWORD` en runtime.
- Datos de contacto provisionales o sin aprobación comercial.
- Base distinta de PostgreSQL.
- Medios sin storage S3 compatible, región, worker de borrado privado, smoke test real o referencias locales en `/uploads/`.
- Analítica sin proveedor/identificador válido. El frontend no carga medición antes del consentimiento.
- Rate limiting no distribuido o proxy no declarado.
- Menos de 3 proyectos, 4 servicios, 3 artículos, 5 FAQ, 1 área, 1 integrante o 1 testimonio publicados.
- Medios con `source=seed` o contenido sin aprobación editorial.
- Falta de la única configuración de marca o del único registro administrable
  de la home. El gate exige ambos singletons para evitar una portada dependiente
  de contenido de reserva.
- Referencias visuales públicas sin ficha en la biblioteca, sin evidencia por
  recurso o sin aprobación global de derechos (`RG-MEDIA-001`).
- Alguno de los cuatro documentos legales sin publicar desde `/admin/legal` o
  sin revisión final registrada mediante `ARQVIA_LEGAL_APPROVED_BY` y
  `ARQVIA_LEGAL_APPROVED_AT`.
- Estimador público encendido sin aprobación comercial de la versión exacta configurada.
- Despacho de automatizaciones encendido sin webhook, secretos, cron y smoke
  test aprobados. La captura durable puede permanecer activa con el despacho
  pausado.
- Variables de retención omitidas o inválidas. Incluso apagada, la política debe
  declarar explícitamente `LEAD_RETENTION_ENABLED`, `LEAD_RETENTION_DAYS`,
  `LEAD_RETENTION_BATCH_SIZE` y `DATA_RETENTION_CRON_SECRET`; el secreto puede
  quedar vacío mientras el switch esté en `false`.
- Retención de datos encendida sin secreto de cron fuerte y aprobación legal y
  operativa registrada.
- Falta de ensayo de restauración o validación PWA real.

## Evidencia de aprobación

Cada aprobación requiere dos variables: `*_APPROVED_BY` identifica a la persona
o área responsable y `*_APPROVED_AT` registra una fecha ISO 8601 no futura. El
gate no inventa ni completa esos valores. La lista está documentada en
`.env.example`.

La aprobación global `ARQVIA_MEDIA_RIGHTS_*` no reemplaza la trazabilidad de cada
`MediaAsset`. El gate considera hero/logo, proyectos y galerías publicados,
servicios y artículos publicados, integrantes activos y testimonios destacados.
Cada URL debe existir en la biblioteca y tener nota de derechos, responsable y
fecha no futura. Los recursos sin uso público pueden permanecer pendientes. Ver
`docs/MEDIA_RIGHTS.md`.

`ARQVIA_ESTIMATOR_APPROVED_VERSION` debe coincidir con la versión activa del
estimador. Cada edición incrementa esa versión e invalida la aprobación previa.
La evidencia de storage exige una operación real de subida, lectura y borrado;
el entorno también debe incluir `PRIVATE_OBJECT_DELETION_CRON_SECRET` para que
los fallos de borrado físico sigan siendo reintentables después de eliminar PII.
la evidencia de automatización exige un evento firmado recibido por el destino
antes de habilitar `LEAD_AUTOMATION_ENABLED`. La captura en outbox se controla
por separado con `LEAD_AUTOMATION_CAPTURE_ENABLED`.

`LEAD_RETENTION_ENABLED=false` es el estado inicial. Para habilitarlo,
`DATA_RETENTION_CRON_SECRET` debe tener al menos 32 caracteres y la aprobación
`ARQVIA_RETENTION_*` debe identificar responsable y fecha. El gate no valida la
corrección jurídica del plazo: esa decisión sigue siendo humana y documentada.

## Uso

```bash
npm run verify
npm run build:release
```

`build:release` es el único comando de build autorizado para publicación. Primero
genera el cliente PostgreSQL para no depender del cliente Prisma creado durante
la instalación, y luego valida
el ambiente y el estado actual de PostgreSQL antes de compilar, vuelve a ejecutar
el gate al terminar y rechaza el artefacto si el estado cambió. También exige que
el SHA del proveedor coincida con el checkout (o un worktree Git limpio en una
ejecución local) y escribe `.next/release-gate.json` con el SHA y la huella del
estado aprobado. `build` y `build:postgres` siguen disponibles para pruebas y no
constituyen autorización de despliegue.

En desarrollo, `release:check` debe terminar bloqueado porque SQLite, localhost,
medios seed y credenciales iniciales son deliberadamente insuficientes para
publicar. Aun cuando falle la configuracion de ambiente, el comando continua con
los controles de contenido y operacion para entregar una lista completa en una
sola corrida. Un resultado bloqueado local no invalida las pruebas de producto.

El gate valida condiciones deterministas, pero no reemplaza `prisma migrate
status`, el smoke test post-deploy, la revisión humana del contenido ni la
prueba física de la PWA.

El workflow manual verifica lint, tipos, tests, build y Playwright contra un
PostgreSQL efímero. Después consulta la base productiva sin escribir, construye
el artefacto con `build:release` desde ese estado y conserva el recibo del gate.
Vercel usa el mismo comando mediante `vercel.json`, de modo que su build no puede
omitir estos controles.

`scripts/vercel-build-policy.ts` decide cuándo se exige el gate en Production, y
lo hace mirando el dominio publicado. La compuerta verifica lo que hace falta
para entregarle el sitio a un cliente —dominio propio, S3, analítica con
consentimiento, retención declarada, revisión legal aprobada—, y nada de eso
existe mientras el proyecto vive en su subdominio de Vercel: ahí la compuerta
sólo bloquea cada despliegue sin proteger nada. Por eso, con
`NEXT_PUBLIC_SITE_URL` apuntando a un `*.vercel.app`, Production compila con
`build:postgres`; con cualquier otro host —o sin host reconocible, que falla
cerrado— vuelve a `build:release`. No hay variable que activar el día del
lanzamiento: configurar el dominio final ES activar la compuerta.
