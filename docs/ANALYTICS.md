# Medicion de Arqvia

## Fuente de verdad

La conversion principal es un lead persistido por `POST /api/leads`. El frontend
emite `generate_lead` unicamente despues de recibir una respuesta exitosa del
servidor. Un clic, el inicio del formulario o un intento de envio no cuentan como
conversion.

La base de datos y el panel admin son la referencia operativa para cantidad y
estado de leads. GA4 o GTM sirven para analizar adquisicion y recorrido, no para
reemplazar esa fuente.

## Embudo

| Etapa | Evento | Condicion |
| --- | --- | --- |
| Visita | `page_view` | Navegacion con consentimiento concedido |
| Interes | `whatsapp_click`, `phone_click`, `email_click` | Clic en el canal correspondiente |
| Inicio | `quote_form_start` | Primer foco dentro del formulario |
| Intento | `quote_form_submit` con `status=attempt` | Envio solicitado por la persona |
| Error | `quote_form_submit` con `status=offline`, `network_error` o `error` | El lead no fue confirmado |
| Conversion | `generate_lead` | El servidor persistio el lead y respondio con exito |
| Confirmacion | `thank_you_view` | Vista del resumen posterior al envio con estimacion |

Los eventos del estimador (`estimate_view`, `estimate_start`,
`estimate_calculated`, `estimate_continue`) describen uso de la herramienta y no
son conversiones por si solos.

## Privacidad

La medicion es opt-in. Sin consentimiento no se cargan scripts del proveedor ni
se despachan eventos. Al revocar el consentimiento se eliminan cookies conocidas
de Google Analytics y se bloquean nuevos eventos.

`trackEvent` aplica una lista cerrada de parametros. No se permite enviar nombre,
email, telefono, WhatsApp, direccion, mensaje libre, archivos, identificadores de
lead, credenciales ni tokens. Los parametros admitidos describen pagina, ubicacion
del CTA, estado tecnico y categorias no identificatorias.

## Configuracion

- `NEXT_PUBLIC_ANALYTICS_PROVIDER`: `none`, `ga4` o `gtm`.
- `NEXT_PUBLIC_ANALYTICS_ID`: identificador compatible con el proveedor.
- Staging debe usar una propiedad o contenedor separado de produccion.
- En GA4, marcar `generate_lead` como evento clave solamente despues de validar
  una recepcion real de punta a punta.

## Preguntas del tablero

1. Que paginas originan leads persistidos?
2. Donde se abandona el recorrido entre inicio e intento de formulario?
3. Que proporciones terminan en WhatsApp, telefono o formulario confirmado?
4. Que estados de error aumentan por dispositivo o pagina?
5. Que contenidos generan consultas calificadas segun el panel comercial?

No se deben presentar uplift, atribucion causal ni calidad comercial basandose
solo en eventos del navegador.
