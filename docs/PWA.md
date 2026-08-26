# PWA de Arqvia

## Alcance

Arqvia publica un manifest instalable, iconos propios, colores de sistema y un
service worker mínimo. La experiencia instalada abre como aplicación
independiente y conserva el acceso visual a una pantalla de contingencia cuando
no hay red.

La PWA no convierte el sitio en una aplicación de trabajo offline. Presupuestos,
adjuntos, login, panel, estimaciones y consultas requieren conexión para evitar
datos obsoletos, duplicados o información personal persistida en el dispositivo.

## Contrato de caché

`public/sw.js` precarga exclusivamente:

- `public/offline.html`.
- `public/offline-recovery.js`, que reintenta la navegación sin guardar datos del formulario.
- Iconos Arqvia de 180, 192 y 512 px, incluida la variante maskable.

Las navegaciones usan siempre la red. Ante una falla de conexión reciben la
pantalla offline, pero la respuesta visitada no se guarda. El worker no guarda
HTML público, RSC, `/_next/static`, `/_next/image`, fotografías, uploads ni
respuestas de API.

Nunca deben incorporarse a Cache Storage, IndexedDB o `localStorage`:

- `/api`, `/admin`, Auth.js o Server Actions.
- Formularios, nombres, teléfonos, emails, presupuestos o mensajes.
- Fotos, planos, adjuntos privados, notas internas o exportaciones.
- Webhooks, respuestas del cron o datos del estimador vinculados a una persona.

No se usa Background Sync. Si se corta internet durante una consulta, React
mantiene los valores sólo en memoria mientras la página siga abierta y muestra
un error accesible. La persona vuelve a enviar manualmente al recuperar la red.

## Recursos y actualización

Los iconos se generan de forma determinística con:

```bash
npm run assets:pwa
```

Ejecutar el comando después de cambiar la identidad visual y revisar los cuatro
PNG antes de publicar. El worker se entrega con `no-store`, scope `/`, tipo
JavaScript explícito y CSP propia. El navegador busca una nueva versión en cada
navegación y la activa de inmediato.

Al cambiar la política o la lista precargada, incrementar `CACHE_VERSION` en
`public/sw.js`. La activación elimina cachés anteriores cuyo nombre empiece con
`arqvia-pwa-`. En desarrollo, `PwaManager` desregistra workers previos para que
un build de producción local no controle por accidente `next dev`.

## Verificación

La verificación automatizada cubre manifest, iconos y dimensiones, sintaxis del
worker, ausencia de caché dinámica, headers, fallback offline y conservación del
formulario en memoria:

```bash
npm run test -- tests/pwa.test.ts
npm run build
npm run e2e -- tests/e2e/public.spec.ts --project=chromium --grep "PWA|offline"
npm run e2e -- tests/e2e/public.spec.ts --project=mobile --grep "PWA|offline"
```

Antes de producción también hay que instalarla en Android/Chrome y
iPhone/Safari reales, comprobar icono, nombre, safe areas, apertura standalone,
actualización y recuperación al volver la conexión. Esa comprobación necesita
el dominio HTTPS final; no debe declararse aprobada con una simulación local.

## Incidentes y rollback

Si el worker provoca un incidente, publicar una versión que desregistre el
worker y elimine los cachés `arqvia-pwa-*`, o restaurar la última versión estable
del archivo. No borrar almacenamiento de usuarios desde rutas públicas sin una
causa documentada.

Después del rollback, verificar una sesión nueva y una sesión que ya tuviera la
PWA instalada. Confirmar especialmente que `/api` siga sin caché, que el panel
requiera autenticación online y que una consulta nunca se reenvíe sola.
