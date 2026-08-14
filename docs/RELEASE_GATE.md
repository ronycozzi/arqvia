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
- Medios sin storage S3 compatible, región, smoke test real o referencias locales en `/uploads/`.
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
- Retención de datos encendida sin secreto de cron fuerte y aprobación legal y
  operativa registrada. Puede permanecer apagada sin bloquear el release.
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
npm run release:check
npm run build:postgres
```

En desarrollo, `release:check` debe terminar bloqueado porque SQLite, localhost,
medios seed y credenciales iniciales son deliberadamente insuficientes para
publicar. Aun cuando falle la configuracion de ambiente, el comando continua con
los controles de contenido y operacion para entregar una lista completa en una
sola corrida. Un resultado bloqueado local no invalida las pruebas de producto.

El gate valida condiciones deterministas, pero no reemplaza `prisma migrate
status`, el smoke test post-deploy, la revisión humana del contenido ni la
prueba física de la PWA.

El workflow manual verifica lint, tipos, tests, build y Playwright contra un
PostgreSQL efímero. La base productiva se usa después únicamente para
`prisma migrate status` y para las consultas de solo lectura del release gate.
