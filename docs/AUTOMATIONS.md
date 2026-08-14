# Automatizaciones de leads

Contrato funcional y operativo para entregar nuevos leads desde Arqvia a un
sistema externo sin acoplar el formulario público a un proveedor específico.

## Estado operativo

La captura y el outbox pueden verificarse localmente con un receptor simulado,
pero una simulación no prueba la integración final.

**Entrega externa real: `NOT RUN`.** Este workspace no dispone de una URL ni de
credenciales reales. Aplicar primero la migración del outbox; después se puede
habilitar `LEAD_AUTOMATION_CAPTURE_ENABLED=true` y mantener
`LEAD_AUTOMATION_ENABLED=false` hasta registrar un smoke test end-to-end.

## Alcance y garantías

- El destino puede ser un CRM, Google Sheets mediante un endpoint intermediario,
  Make, Zapier o un servicio propio.
- Cuando la captura está habilitada, la creación o reconsulta guarda un
  `payloadJson` inmutable en el outbox dentro de la transacción del lead.
- La ruta pública nunca llama al proveedor. Toda solicitud webhook sale
  exclusivamente desde el cron autenticado.
- Un timeout o error externo no elimina el lead ni el evento pendiente.
- Sólo una respuesta HTTP `2xx` confirma la entrega. Los demás resultados deben
  quedar visibles con el intento y el último error sanitizado.
- La entrega es al menos una vez. El receptor debe ser idempotente y deduplicar
  por el identificador estable del evento.
- Al alcanzar el máximo de intentos, el evento queda disponible para diagnóstico
  y reencolado administrativo; esa acción no entrega ni llama al proveedor.

## Variables de entorno

| Variable | Contrato |
| --- | --- |
| `LEAD_AUTOMATION_CAPTURE_ENABLED` | Switch de captura durable. `false` por defecto; cuando está en `true`, las altas y reconsultas crean eventos en el outbox aunque el despacho esté pausado. Si la variable no existe, hereda `LEAD_AUTOMATION_ENABLED` por compatibilidad con despliegues anteriores. |
| `LEAD_AUTOMATION_ENABLED` | Kill switch del despacho externo. `false` por defecto; el worker no reclama ni entrega eventos, pero la captura puede seguir acumulándolos en el outbox. |
| `LEAD_WEBHOOK_URL` | URL HTTPS del receptor. En desarrollo se admite HTTP sólo para localhost. No colocar credenciales en la URL. |
| `LEAD_WEBHOOK_ALLOWED_HOSTS` | Hostnames exactos autorizados, separados por comas. Es obligatorio en producción; no admite IPs, localhost ni dominios internos. Antes de cada salida también se resuelve DNS y se rechazan destinos privados o reservados. |
| `LEAD_WEBHOOK_SECRET` | Secreto privado de al menos 32 caracteres usado para HMAC. Debe ser distinto por entorno. |
| `LEAD_WEBHOOK_TIMEOUT_MS` | Timeout de cada intento, entre 1.000 y 20.000 ms. Default: `8000`. |
| `LEAD_AUTOMATION_MAX_ATTEMPTS` | Máximo de intentos entre 1 y 10. Default: `5`. |
| `AUTOMATION_CRON_SECRET` | Secreto privado e independiente, de al menos 32 caracteres, para autorizar el procesador cron. |

Ninguna de estas variables es pública. No usar prefijo `NEXT_PUBLIC_`, no
persistir sus valores en la base y no exponerlos en logs, errores o capturas.
Cuando el despacho está deshabilitado, URL y secretos pueden permanecer vacíos;
la captura no depende de ellos. Habilitar el despacho con configuración
incompleta debe fallar de forma cerrada. `dispatchReady` está activo únicamente
cuando `LEAD_AUTOMATION_ENABLED=true`, la URL usa un hostname público incluido exactamente en
`LEAD_WEBHOOK_ALLOWED_HOSTS` y `LEAD_WEBHOOK_SECRET` y
`AUTOMATION_CRON_SECRET` son válidos.

Valores iniciales de `.env.example`:

```env
LEAD_AUTOMATION_CAPTURE_ENABLED="false"
LEAD_AUTOMATION_ENABLED="false"
LEAD_WEBHOOK_URL=""
LEAD_WEBHOOK_ALLOWED_HOSTS=""
LEAD_WEBHOOK_SECRET=""
LEAD_WEBHOOK_TIMEOUT_MS="8000"
LEAD_AUTOMATION_MAX_ATTEMPTS="5"
AUTOMATION_CRON_SECRET=""
```

## Flujo de entrega

1. Arqvia valida y guarda un lead nuevo. Si email y teléfono coinciden con un
   expediente anterior, sólo queda relacionado como posible reconsulta.
2. Si `LEAD_AUTOMATION_CAPTURE_ENABLED=true`, registra `LEAD_CREATED` o
   `LEAD_RECONSULTED` en el outbox dentro de la misma transacción y guarda el
   `payloadJson` inmutable, sin depender del estado del despacho.
3. La ruta pública responde sin intentar ninguna entrega externa.
4. El cron autenticado selecciona hasta cinco eventos elegibles y los procesa
   concurrentemente dentro de su límite total de 30 segundos.
5. Cada worker reclama su evento con un `claimToken`. Las transiciones de éxito
   o fallo exigen ese mismo token, por lo que un worker con lease vencido no puede
   sobrescribir el resultado de un reclamo posterior. Un lease `PROCESSING`
   abandonado se recupera a los 10 minutos.
6. El worker serializa el snapshot, calcula HMAC sobre
   `timestamp + "." + cuerpo`, resuelve DNS y rechaza cualquier IP privada,
   loopback o reservada antes de enviar el webhook con las cabeceras Arqvia.
7. Una respuesta `2xx` marca el evento como `DELIVERED`. Timeout, error de red,
   `4xx` o `5xx` lo dejan `FAILED` o `DEAD` si agotó los intentos.
8. El Admin puede reencolar un fallo después de corregir la causa. La acción sólo
   vuelve el evento a `PENDING`; el envío espera al próximo cron autenticado.

No borrar eventos pendientes para destrabar una cola. Tampoco crear otro lead,
cambiar el identificador ni reconstruir el payload durante un reencolado.

La allowlist y el chequeo DNS reducen SSRF, pero una aplicación no controla la
red del proveedor ni elimina por sí sola todo riesgo de DNS rebinding. En
producción, limitar además el egress a los destinos aprobados mediante firewall,
proxy de salida o controles equivalentes del hosting.

Con `LEAD_AUTOMATION_CAPTURE_ENABLED=true` y
`LEAD_AUTOMATION_ENABLED=false`, las nuevas altas y reconsultas quedan
`PENDING` en el outbox y se entregan cuando el despacho vuelva a habilitarse.
Con ambos switches en `false`, no se crean eventos y cualquier conciliación
posterior es manual. Omitir el nuevo switch conserva el comportamiento legacy:
la captura hereda el valor de `LEAD_AUTOMATION_ENABLED`.

## Payload versión 1

El webhook usa `Content-Type: application/json` y envía:

```json
{
  "schemaVersion": 1,
  "event": "lead.created",
  "deliveryId": "identificador-estable-del-outbox",
  "occurredAt": "2026-07-14T17:00:00.000Z",
  "lead": {
    "id": "identificador-del-lead",
    "newAttachmentCount": 2
  },
  "estimate": null,
  "technicalVisit": null
}
```

`event` puede ser `lead.created` o `lead.reconsulted`. `lead` contiene la ficha
enviada en esa solicitud, ya validada y normalizada, junto con el identificador
y estado del lead. No se vuelve a leer el estado actual durante la entrega.
`estimate` y `technicalVisit` son snapshots opcionales de esa misma solicitud.
El receptor debe tolerar campos aditivos compatibles y usar `schemaVersion` para
cambios incompatibles. `deliveryId`, no el email ni el teléfono, es la clave de
idempotencia.

| Objeto | Campos de versión 1 |
| --- | --- |
| `lead` | `id`, `name`, `email`, `phone`, `city`, `clientType`, `projectType`, `currentStatus`, `areaM2`, `budgetRange`, `startDate`, `needsVisit`, `hasPlans`, `referenceLinks`, `message`, `sourcePage`, `status`, `newAttachmentCount` |
| `estimate` | `ruleId`, `projectTypeKey`, `projectTypeLabel`, `finishTier`, `areaM2`, `rateMinUsdM2`, `rateMaxUsdM2`, `totalMinUsd`, `totalMaxUsd`, `configVersion` |
| `technicalVisit` | `requestedDate`, `preferredWindow`, `address`, `requestNotes` |

`newAttachmentCount` cuenta sólo los adjuntos nuevos de esa alta o reconsulta;
no es el total histórico del lead y no incluye los archivos. El snapshot no
contiene `createdAt`/`updatedAt` del estado actual ni estado, horario o duración
posterior de una visita. `occurredAt` es la fecha del evento de outbox. El mismo
`payloadJson` se reutiliza en todos los intentos y reencolados.

## Firma HMAC

- Arqvia envía `x-arqvia-signature: t=<unix>,v1=<hex>`,
  `x-arqvia-delivery: <deliveryId>` y `x-arqvia-event: <event>`.
- `v1` es HMAC-SHA-256 de `<timestamp>.<cuerpo-exacto>` con
  `LEAD_WEBHOOK_SECRET`; `timestamp` es el valor decimal `t`.
- El receptor debe extraer `t`, reconstruir esa cadena con los bytes recibidos y
  comparar `v1` en tiempo constante antes de procesar el payload.
- Aplicar una tolerancia temporal documentada para reducir replay sin rechazar
  reintentos legítimos, que generan una firma y timestamp nuevos.
- Rechazar firma ausente o inválida. HTTPS sigue siendo obligatorio: la firma no
  reemplaza el cifrado de transporte.
- Nunca registrar el secreto, el valor completo de la firma ni el cuerpo íntegro
  del lead.

## Cron protegido

- El scheduler debe invocar `GET` o `POST /api/cron/automations` con
  `Authorization: Bearer <AUTOMATION_CRON_SECRET>`.
- Secreto ausente o incorrecto debe responder sin procesar eventos.
- Usar una frecuencia que recupere la cola con holgura sin superar límites del
  receptor. Empezar con una frecuencia conservadora y observar duración,
  backlog y tasa de error.
- Las invocaciones concurrentes deben reclamar trabajo de forma segura. No
  compensar una ejecución lenta lanzando cron duplicados sin diagnóstico.

Cada invocación procesa hasta cinco eventos elegibles concurrentemente dentro de
un máximo de 30 segundos, responde JSON con conteos de procesados, entregados y
fallidos, y usa `Cache-Control: no-store`. Si el secreto cron no está configurado
responde `503`; si el bearer es inválido, `401`. Configuración incompleta de URL,
secreto webhook o secreto cron nunca queda `ready` para entregar.

Los reintentos automáticos esperan 1, 5, 15, 60 y 360 minutos después de cada
fallo; si se permiten más intentos, el último intervalo se mantiene. Un
reencolado manual reinicia el contador, limpia el lease y conserva `deliveryId`
y `payloadJson`. No ejecuta una entrega.

## Admin, estados y reencolado

`/admin/automations` está reservada al rol Admin y es la superficie operativa
para revisar como mínimo:

- identificador del evento y lead relacionado;
- estado actual y cantidad de intentos;
- fechas de creación, próximo intento y última entrega;
- código HTTP o error sanitizado más reciente;
- acción de reencolado manual para roles autorizados.

Estados persistidos: `PENDING`, `PROCESSING`, `DELIVERED`, `FAILED` y `DEAD`.

El reencolado manual cambia un evento `FAILED` o `DEAD` a `PENDING`; no ejecuta
HTTP ni significa entrega exitosa. Sólo un cron autenticado posterior puede
entregarlo y confirmarlo con una respuesta `2xx`. Editor y Viewer no deben
acceder a la pantalla ni reencolar.

## Receptores neutrales

- **CRM:** mapear el identificador de evento como clave idempotente y conservar
  el identificador de lead de Arqvia para conciliación.
- **Google Sheets:** usar Apps Script o una plataforma intermedia que pueda
  verificar HMAC, deduplicar y escribir la fila. No enviar directamente a una
  hoja pública.
- **Make o Zapier:** colocar la verificación de firma y deduplicación antes de
  acciones con efectos externos. Revisar límites, historial y retención del plan.
- **Servicio propio:** responder `2xx` sólo después de aceptar durablemente el
  evento; un procesamiento interno posterior puede usar su propia cola.

El proveedor no cambia las garantías de Arqvia. Toda integración debe documentar
propietario, mapeo de campos, datos personales transferidos, retención, límites,
alertas y procedimiento de borrado.

## Rollout

1. Aplicar
   `prisma/postgresql/migrations/20260714500000_add_lead_automation_outbox/migration.sql`
   y verificar `LeadAutomationDelivery` en backups y restore.
2. Configurar URL y secretos distintos en staging; dejar el despacho apagado.
3. Validar autorización del cron y rechazo de credenciales incorrectas.
4. Habilitar sólo la captura, crear un evento y comprobar que la ruta pública no
   llame al receptor; cambiar
   luego el lead y confirmar que el cron entregue el `payloadJson` original.
5. Verificar firma válida e inválida, `claimToken`, máximo de cinco envíos
   concurrentes, límite de 30 segundos, `2xx`, `4xx`, `5xx`, timeout, límite de
   intentos e idempotencia con un receptor controlado.
6. Revisar estados y reencolado manual en `/admin/automations`; confirmar que no
   haya HTTP externo hasta ejecutar el cron.
7. Configurar producción sin reutilizar secretos de staging.
8. Habilitar el despacho durante una ventana monitoreada, crear un lead de prueba autorizado
   y conciliar el mismo evento entre outbox, admin y receptor.
9. Registrar fecha, responsable, destino, identificador del evento y evidencia
   del resultado sin copiar PII ni secretos.

Hasta completar el paso 9 con credenciales reales, conservar el estado
`NOT RUN` y `LEAD_AUTOMATION_ENABLED=false`. La captura puede permanecer activa
después de verificar la migración y el guardado transaccional del outbox.

## Monitoreo e incidentes

Monitorear backlog pendiente, edad del evento más antiguo, tasa de `2xx`,
timeouts, intentos agotados y latencia del receptor. Alertar antes de que el
backlog supere la capacidad normal de recuperación.

Ante un incidente:

1. Apagar `LEAD_AUTOMATION_ENABLED` sin borrar el outbox y mantener
   `LEAD_AUTOMATION_CAPTURE_ENABLED=true`. Los leads recibidos durante la pausa
   siguen generando eventos pendientes y no requieren conciliación manual.
2. Determinar si la causa es DNS/TLS, credenciales, firma, timeout, límite del
   proveedor, formato o indisponibilidad.
3. Corregir y probar un evento controlado.
4. Reencolar una muestra, ejecutar el cron autenticado, confirmar idempotencia y
   recuperar el resto por lotes.
5. Documentar impacto, eventos afectados, recuperación y prevención sin PII.

La rotación de `LEAD_WEBHOOK_SECRET` o `AUTOMATION_CRON_SECRET` requiere una
ventana coordinada, actualización segura en ambos extremos y un nuevo smoke
test. Ante sospecha de exposición, pausar el despacho y rotar de inmediato; no
deshabilitar la captura salvo que el outbox mismo sea la causa del incidente.

## Backup y restauración

`LeadAutomationDelivery` forma parte del estado comercial durable. Los backups
y ensayos de restore deben conservar identificadores, `payloadJson`,
`claimToken`, estados, intentos, próximas fechas, respuestas y relación con
`Lead`.

Después de restaurar:

1. Mantener `LEAD_AUTOMATION_ENABLED=false` y
   `LEAD_AUTOMATION_CAPTURE_ENABLED=true` sólo después de confirmar que la tabla
   restaurada está disponible.
2. Comparar conteos y estados con el origen o manifiesto.
3. Revisar eventos `PROCESSING`; el lease los recupera como `FAILED` después de
   10 minutos, o como `DEAD` si agotaron intentos. Deben evaluarse por posible
   entrega previa y ningún worker antiguo debe poder cerrarlos sin su
   `claimToken` vigente.
4. Confirmar idempotencia del receptor antes de recuperar pendientes.
5. Reencolar una muestra, ejecutar el cron autenticado y drenar el backlog de
   forma observada.
