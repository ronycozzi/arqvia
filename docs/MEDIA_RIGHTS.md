# Procedencia y derechos de medios

La biblioteca visual conserva evidencia por recurso. Estos datos son internos
del panel administrativo y no se muestran en el frontend público.

## Datos registrados

Cada `MediaAsset` puede guardar:

- `sourceUrl`: URL HTTP(S) del autor, proveedor, banco o documento de origen.
- `rightsNote`: autoría, licencia, cesión, permiso o restricción aplicable.
- `rightsApprovedAt`: fecha en que se confirmó el uso público.
- `rightsApprovedBy`: nombre, email o identificador estable de la cuenta que aprobó.

Los cuatro campos son nullable para permitir una carga pendiente. Una aprobación
válida exige una nota de al menos 10 caracteres, responsable y fecha no futura.
El responsable y la fecha se completan en el servidor desde la sesión verificada;
el navegador no puede elegirlos. Desmarcar la autorización conserva procedencia
y nota, pero elimina responsable y fecha.

## Flujo administrativo

1. En `/admin/media`, cargar el archivo, alt text, categoría y evidencia disponible.
2. Marcar `Autorizar para uso público` sólo cuando la nota respalde el uso.
3. Para un recurso existente, abrir `Editar procedencia y derechos` en su tarjeta.
4. Revisar el estado visible: `Aprobada para uso público` o `Pendiente para uso público`.
5. Consultar `/admin/activity` para la auditoría de aprobación o revocación.

Admin y Editor pueden modificar estos datos. Viewer puede ver el estado y la
evidencia, pero no alterarlos.

## Release gate

`npm run release:check` reúne las URLs usadas por:

- configuración pública (hero y logo);
- proyectos publicados y sus galerías;
- servicios y artículos publicados;
- integrantes activos;
- testimonios destacados.

Las URLs se deduplican. `RG-MEDIA-001` bloquea el release cuando una referencia
pública no tiene ficha en `MediaAsset`, cuando su ficha no tiene una aprobación
válida o cuando falta la revisión global `ARQVIA_MEDIA_RIGHTS_APPROVED_BY` /
`ARQVIA_MEDIA_RIGHTS_APPROVED_AT`.

La revisión global es un segundo control y no reemplaza las aprobaciones por
recurso. Los borradores y recursos de biblioteca que todavía no se usan en una
superficie pública pueden permanecer pendientes sin bloquear el release.

## Migración

PostgreSQL incorpora las columnas nullable y el índice de revisión mediante:

`prisma/postgresql/migrations/20260715220000_add_media_rights_provenance/migration.sql`

No hay backfill automático. Los recursos existentes quedan pendientes hasta que
una persona revise evidencia y los apruebe en el admin. En desarrollo SQLite,
`npm run db:init` sincroniza el schema mediante `prisma db push`; no usar ese
comando en producción.

## Verificación enfocada

```bash
npm run db:generate
npm run db:postgres:generate
npm run test -- src/lib/media-rights.test.ts tests/admin-media-rights-actions.test.ts src/lib/release-readiness.test.ts
npm run typecheck
npm run lint
npm run release:check
```

Un `release:check` local debe seguir bloqueado por la configuración deliberada de
desarrollo. Para esta funcionalidad, verificar que el resultado incluya
`RG-MEDIA-001` y cantidades accionables cuando haya recursos públicos pendientes.
