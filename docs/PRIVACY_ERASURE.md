# Eliminación de consultas por privacidad

Este procedimiento se usa únicamente ante un pedido de eliminación del titular de una consulta. La acción está disponible sólo para usuarios con rol `ADMIN` en el detalle del lead.

## Antes de ejecutar

1. Verificar la identidad del titular por un canal confiable y confirmar el alcance del pedido.
2. Registrar el caso en el sistema legal u operativo autorizado. No copiar PII del titular a tickets, chats ni logs generales.
3. Revisar si alguna entrega de automatización figura como enviada. El flujo elimina la copia local y el outbox, pero no puede borrar datos ya recibidos por proveedores externos.
4. Confirmar con el responsable de backups la política vigente de expiración y restauración. Las copias inmutables pueden conservar el dato hasta vencer su retención.

## Ejecución

1. Abrir `Admin > Consultas > Detalle` con una cuenta `ADMIN`.
2. En `Privacidad y datos personales`, elegir `Eliminar por privacidad`.
3. Confirmar que se verificó el pedido, escribir `ELIMINAR` y ejecutar la acción.
4. Esperar la redirección a la lista de consultas. No cerrar la pestaña mientras se muestra `Eliminando datos...`.

El servidor marca primero el lead para impedir nuevos despachos externos. Si ya
existe un envío en curso, conserva el bloqueo y pide reintentar cuando termine.
Después crea trabajos durables para cada adjunto y elimina el `Lead` dentro de
una transacción serializable; las relaciones se eliminan por cascada, se purgan
los `AuditLog` vinculados y se crea esta constancia mínima:

- `action`: `PRIVACY_ERASURE`
- `entity`: `PrivacyRequest`
- `entityId`: `null`
- `summary`: `Consulta eliminada por solicitud del titular.`

La constancia conserva el usuario Admin que ejecutó la operación, pero no identifica al titular ni a la consulta eliminada.

## Errores y reintentos

- Si hay una automatización `PROCESSING`, la API responde `409`; no admite nuevos envíos y el Admin puede reintentar cuando venza o termine la entrega.
- Si falla el storage después del borrado transaccional, la API responde `202` y el objeto permanece en `PrivateObjectDeletion` con una clave opaca y reintentos acotados.
- El scheduler llama `GET` o `POST /api/cron/private-object-deletions` con `Authorization: Bearer <PRIVATE_OBJECT_DELETION_CRON_SECRET>`.
- No borrar manualmente jobs ni objetos: la eliminación es idempotente y el outbox es la evidencia operativa hasta llegar a `DELETED`.

Tras tres conflictos consecutivos, revisar actividad concurrente sobre la consulta y volver a ejecutar cuando haya cesado. Escalar errores persistentes con el evento `admin.lead_privacy_erasure_failed`; ese log técnico no incluye el ID ni PII del titular.

## Verificación y cierre

1. Confirmar que la consulta ya no aparece en Admin y que su URL devuelve no encontrado.
2. Verificar en storage que no queden las claves privadas y que el panel de sistema muestre cero borrados privados pendientes.
3. Verificar que no existan registros hijos ni auditorías antiguas vinculadas y que haya una única constancia mínima `PRIVACY_ERASURE` para la ejecución.
4. Solicitar y documentar la eliminación en cada sistema externo que haya recibido el payload.
5. Cerrar el caso sólo cuando terminen las acciones sobre sistemas externos y quede registrada la fecha de expiración de backups aplicable.

Si se restaura un backup anterior, el pedido debe reaplicarse antes de habilitar el sistema restaurado para uso normal.

## Prueba focalizada

```bash
npx vitest run src/lib/lead-privacy.test.ts src/lib/private-object-deletion.test.ts tests/admin-lead-privacy-route.test.ts tests/private-object-deletion-route.test.ts
npx playwright test tests/e2e/admin-lead-privacy.spec.ts --project=chromium
```
