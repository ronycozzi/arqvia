# Estimador Premium de inversión

Documento operativo y funcional del estimador público de Arqvia. La referencia
canónica de fórmula, datos, permisos, migración, pruebas y rollout está en este
archivo; el README y los runbooks sólo resumen este contrato.

## Alcance y superficies

- El estimador sólo aparece al ingresar directamente en `/estimador` cuando la
  configuración global está habilitada. No se promociona en home, navegación,
  footer ni sitemap, y la ruta permanece `noindex`.
- Combina tipo de proyecto, superficie entera y nivel de terminación para
  mostrar un rango orientativo en USD.
- El resultado no es una cotización, una reserva ni un precio contractual. El
  disclaimer público debe conservar esta distinción.
- Al continuar, el rango se asocia al formulario de consulta. El servidor lo
  recalcula antes de guardar el lead.
- La configuración se administra en `/admin/estimador`.

## Gate comercial obligatorio

Los valores incluidos por la migración y por `prisma/seed.ts` son supuestos de
arranque. **No están aprobados para producción por el solo hecho de estar en el
repositorio.** No se puede habilitar el estimador con tráfico real hasta que una
persona responsable del área comercial de Arqvia valide por escrito:

1. El alcance incluido en cada categoría.
2. Los mínimos y máximos por m² y el mínimo de proyecto.
3. Los multiplicadores Esencial, Equilibrado y Superior.
4. Al menos un caso chico, uno medio y uno grande por categoría activa.
5. El disclaimer y la forma en que ventas explicará el rango.
6. La moneda, la fecha de vigencia y la próxima fecha de revisión.

Registrar como evidencia el nombre del aprobador, fecha, versión aprobada,
fuente de valores y observaciones. Si falta cualquiera de esos datos, el switch
`Mostrar el estimador en el sitio público` debe permanecer apagado.

## Datos y valores seed

`EstimateConfig` mantiene una única configuración con id
`arqvia-estimator`: estado público, versión, textos y multiplicadores.
`EstimateRule` mantiene las categorías, valores por m², mínimo de proyecto,
orden y estado activo. `LeadEstimate` guarda una instantánea uno a uno con el
lead.

Valores iniciales que requieren la validación comercial anterior:

| Clave | Categoría | USD/m² mínimo | USD/m² máximo | Mínimo de proyecto | Orden |
| --- | --- | ---: | ---: | ---: | ---: |
| `obra-nueva` | Obra nueva | 850 | 1.350 | USD 80.000 | 10 |
| `remodelacion-integral` | Remodelación integral | 450 | 900 | USD 15.000 | 20 |
| `ampliacion` | Ampliación | 700 | 1.150 | USD 25.000 | 30 |
| `diseno-interior` | Diseño interior | 180 | 420 | USD 6.000 | 40 |
| `local-comercial` | Local comercial | 500 | 950 | USD 15.000 | 50 |
| `oficina` | Oficina | 450 | 850 | USD 12.000 | 60 |

Multiplicadores seed:

| Nivel | Valor | Interpretación pública |
| --- | ---: | --- |
| `ESSENTIAL` | 0,90 | Esencial |
| `BALANCED` | 1,00 | Equilibrado |
| `PREMIUM` | 1,25 | Superior |

La migración PostgreSQL inserta estos registros con el estimador deshabilitado.
El seed conserva los rangos existentes, pero fuerza `enabled=false` como medida
de seguridad cada vez que se ejecuta. Por eso no debe correrse sobre producción
sin planificar la interrupción y la posterior reaprobación comercial.

## Fórmula y redondeo

Para una regla con tasa mínima `rMin`, tasa máxima `rMax`, mínimo de proyecto
`P`, superficie ingresada `a` y multiplicador `m`:

```text
A = a, validado previamente como entero entre 10 y 2000
minCrudo = max(A * rMin * m, P * m)
maxCrudo = max(A * rMax * m, P * m * 1,15)
totalMin = redondearInversion(minCrudo)
maxRedondeado = redondearInversion(max(maxCrudo, minCrudo))
totalMax = maxRedondeado, si maxRedondeado > totalMin
           totalMin + paso(totalMin), en caso contrario
```

`redondearInversion` redondea al múltiplo más cercano del paso que corresponde
al valor evaluado:

| Valor evaluado | Paso de redondeo |
| --- | ---: |
| Menor a USD 30.000 | USD 500 |
| Desde USD 30.000 y menor a USD 100.000 | USD 2.500 |
| Desde USD 100.000 | USD 5.000 |

Las tasas efectivas que se guardan en el lead se calculan como
`round(tasaBase * multiplicador)`. Todos los importes persistidos son enteros en
USD. La fórmula no aplica tipo de cambio ni modela por separado impuestos,
permisos, honorarios, ubicación, estado previo, estructura o selección final de
materiales; esos límites deben quedar cubiertos por categoría, alcance y
disclaimer.

## Rangos de entrada y configuración

- Superficie pública: entero entre 10 y 2.000 m². El slider llega a 500 m² y el
  campo numérico permite escribir hasta 2.000 m².
- Multiplicadores: entre 0,5 y 3, con
  `Esencial <= Equilibrado <= Superior`.
- Tasas mínima y máxima: enteros entre 1 y 10.000 USD/m², con mínima menor o
  igual a máxima.
- Mínimo de proyecto: entero entre 0 y USD 10.000.000.
- Orden: entero entre 0 y 9.999.
- La clave de categoría debe ser única, de 3 a 80 caracteres y usar minúsculas,
  números y guiones.

Estos límites son defensas técnicas, no aprobación comercial. Un valor puede
ser válido para Zod y aun así ser incorrecto para publicar.

## Versionado e instantáneas

- La configuración comienza en versión 1.
- Cada guardado exitoso de configuración general y cada creación o edición de
  una categoría reserva la versión esperada y la incrementa en uno dentro de la
  misma transacción.
- Si dos administradores editan la misma versión, el segundo guardado se
  rechaza y exige recargar. No se pisan cambios silenciosamente.
- El formulario público envía id de regla, nivel, superficie y versión. Al
  guardar el lead, el servidor exige que el estimador siga habilitado, la regla
  siga activa y la versión siga vigente; después recalcula el rango con datos
  de base. Un cálculo obsoleto responde `409` y pide calcular nuevamente.
- `LeadEstimate` conserva regla, etiqueta y clave de proyecto, nivel, superficie,
  tasas efectivas, totales, versión y fecha. Cambios posteriores de configuración
  no recalculan instantáneas existentes.
- Cada nuevo envío crea otro lead y otra instantánea. Una coincidencia de email
  y teléfono sólo registra una posible reconsulta y no reemplaza ni anota la
  instantánea anterior. La versión no es un historial completo de
  configuraciones; es un identificador monotónico y un control de concurrencia.

## Permisos Admin

- Sólo el rol `ADMIN` puede abrir `/admin/estimador`, crear o editar categorías,
  cambiar multiplicadores, textos o estado público.
- `EDITOR` y `VIEWER` no tienen acceso de lectura ni escritura a esa superficie.
- Las acciones vuelven a verificar la sesión y el rol en el servidor.
- Cada guardado genera un `AuditLog` con usuario, entidad, acción y nueva
  versión.
- Los cambios se publican al guardar y revalidan `/estimador` y admin. No existe
  una etapa de borrador separada.

El switch global es el kill switch operativo. Para retirar la herramienta,
desmarcar `Mostrar el estimador en el sitio público` y guardar. Si no hay reglas
activas, la herramienta también queda cerrada y nunca publica rangos fallback.

## Seguridad y privacidad

- El cliente nunca decide los totales persistidos. El endpoint consulta la
  configuración actual y recalcula dentro de la transacción del lead.
- La entrada pasa por Zod y el endpoint conserva las defensas del formulario:
  same-origin, honeypot, límites de tamaño y rate limiting por IP e identidad.
- La consulta se rechaza si la regla está oculta, el estimador está apagado o la
  versión cambió.
- Las escrituras Admin requieren sesión vigente, rol `ADMIN`, versión esperada
  y transacción. Los conflictos no producen actualizaciones parciales.
- Los valores publicados no son secretos. Credenciales, datos de contacto y
  adjuntos del lead siguen las políticas privadas del admin.
- Los eventos `estimate_*` usan ubicación de la herramienta, clave de regla,
  nivel, bucket de superficie y versión; no deben ampliarse con PII ni importes
  exactos sin revisión de privacidad y consentimiento.
- Ante error de base o ausencia de configuración, el fallback general queda
  deshabilitado. El switch global sigue siendo la forma explícita de retirar la
  herramienta.

## Migración

### SQLite local

```bash
npm run db:generate
npm run db:init
```

`db:init` sincroniza el schema local con `prisma db push`. No hay backfill del
estimador: los leads históricos quedan sin `LeadEstimate`. Ejecutar
`npm run db:seed` sólo cuando se necesiten los datos iniciales y recordar que no
reemplaza una configuración existente.

### PostgreSQL

La migración incremental es:

`prisma/postgresql/migrations/20260714400000_add_investment_estimator/migration.sql`

Crea `EstimateTier`, `EstimateConfig`, `EstimateRule` y `LeadEstimate`, sus
índices y relaciones; después inserta la configuración y reglas seed. Para un
entorno ya desplegado:

1. Crear backup y confirmar restore disponible.
2. Mantener el tráfico público bloqueado o la nueva versión de aplicación sin
   publicar mientras se aplica la migración. El registro seed nace
   deshabilitado y debe conservarse así hasta completar la aprobación.
3. Ejecutar `npm run db:postgres:deploy`; no usar `db push` en producción.
4. Construir con `npm run build:postgres`.
5. Abrir `/admin/estimador` y confirmar que continúa deshabilitado antes de
   habilitar tráfico si la aprobación comercial todavía no está registrada.
6. Cargar los valores aprobados, comprobar la versión y ejecutar las pruebas de
   staging.
7. Habilitar sólo después del sign-off.

El módulo no agrega variables de entorno ni necesita backfill. En producción,
`npm run db:seed` continúa sujeto a `ARQVIA_ALLOW_PRODUCTION_SEED=true` y no debe
usarse para actualizar rangos.

## Pruebas obligatorias

La evidencia de release debe incluir los resultados reales de:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run e2e -- --project=chromium --workers=1
npm run e2e -- --project=mobile --workers=1
```

Además, probar y registrar:

- Fórmula con áreas 10, 29, 30, 499, 500 y 2.000 m²; mínimo de proyecto
  dominante; umbrales de redondeo 30.000 y 100.000; y los tres niveles.
- Rechazo de áreas 9 y 2.001, multiplicadores fuera de rango, orden incorrecto
  de multiplicadores, clave duplicada y tasa mínima mayor a máxima.
- Resultado directo en `/estimador`, responsive, teclado, foco del resultado,
  disclaimer y continuidad al formulario; confirmar también que no reaparezca
  en home, header, footer o sitemap.
- Envío válido y persistencia de la instantánea; manipulación de totales del
  cliente sin efecto; regla oculta, configuración apagada o versión obsoleta con
  rechazo.
- Conflicto entre dos sesiones Admin sobre la misma versión y presencia del
  `AuditLog`.
- Acceso de `ADMIN` y denegación de `EDITOR`, `VIEWER` y usuario anónimo.
- Migración sobre copia de staging, conteo de seis reglas seed y confirmación de
  que leads históricos no reciben estimaciones inventadas.
- Kill switch global y recuperación posterior sin alterar instantáneas de leads.

## Rollout y rollback

1. Aplicar migración y validar datos en staging con la herramienta apagada.
2. Completar el gate comercial y guardar la evidencia junto al release.
3. Publicar primero en staging, ejecutar la matriz de pruebas y revisar versión,
   disclaimer y eventos de analítica.
4. Desplegar en producción sin abrir tráfico hasta confirmar migración y acceso
   Admin.
5. Habilitar el switch global en una ventana monitoreada.
6. Durante las primeras 24 horas revisar errores `409`, errores del endpoint de
   leads, conversiones `estimate_view -> estimate_calculated -> estimate_continue`
   y feedback comercial. No interpretar volumen bajo como validación de precios.
7. Revisar valores al menos mensualmente y ante variaciones relevantes de costos;
   cada cambio debe identificar fuente, aprobador y nueva versión.

Ante valores incorrectos o comportamiento dudoso, apagar primero el switch
global y verificar que `/estimador` presente la alternativa de contacto antes
de investigar. No revertir ni borrar
la migración para un rollback funcional: conservar tablas e instantáneas y
volver a una versión estable de la aplicación si fuera necesario.
