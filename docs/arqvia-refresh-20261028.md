# Arqvia · mejora pública y funcional · 28/10/2026

## Alcance vigente

Rony pidió mejorar frontend, UX/UI, textos, imágenes y backend; corrigió luego el alcance: el hero y el video de construcción/dron quedan a cargo de Tomás. El archivo `src/components/hero/arqvia-architectural-hero.tsx` se conserva sin cambios. No se generó video ni se contrataron servicios.

## Entregado en código

- Comparador antes/después: una sola interacción controla el recorte; CSS actualiza la posición sin renderizar ambas imágenes en cada movimiento. Rango 0–100, teclado y separación de gestos horizontal/vertical.
- Inicio: accesos a secciones, orientación de proyecto (tipo/etapa/zona), selección de proyectos en dossiers y un proceso por etapas con imágenes, contenido y navegación por teclado.
- Servicios y proyectos: nuevos componentes editoriales con fotografías, entregables, materiales y fichas; tamaños de imagen corregidos para las distintas composiciones.
- Galería: leyendas visibles sin depender del hover, controles de ampliación y manejo correcto de cancelación táctil.
- Consulta: preselección validada desde la orientación, editable y sin sobreescribir el borrador; confirmación tolerante a storage bloqueado; respuestas sin `ok:true` no muestran éxito.
- Visita técnica: al desmarcarla se descartan los campos ocultos.
- Estimador/backend: una versión que cambia después de la validación libera los cupos reservados para permitir un nuevo intento.
- Traducciones inglesas para los nuevos bloques y controles. El selector de idioma valida el origen contra el Host real, sin confundir la dirección interna de Next; conserva el rechazo de orígenes externos. Los selectores mantienen valores canónicos aunque se traduzcan sus etiquetas.

## Verificación

- Suite completa: 117 archivos y 584 pruebas, PASS.
- ESLint y TypeScript: PASS.
- `npm run build`: PASS.
- Integridad de contenido: 4 proyectos, 11 servicios, 10 guías y 19 assets, PASS.
- Escaneo de secretos: 536 archivos de texto, PASS.
- Cinco rutas públicas locales: HTTP 200.
- Consulta sintética enviada a API local y registro comprobado en una copia SQLite aislada. Automatizaciones y analítica desactivadas; no se enviaron correos ni webhooks.
- Navegador: preselecciones correctas en Contacto; diseño a 390 px y escritorio; arrastre con mouse y táctil y extremos por teclado del comparador comprobados. Cambio a inglés y nuevos títulos traducidos comprobados. Las verificaciones visuales son de desarrollo local, no de una publicación productiva.

La compilación productiva pasó. El arranque de `next start` fue rechazado por el control automático sin un motivo específico; la vista de desarrollo local se inició correctamente como alternativa. No se afirmó verificar el runtime del build compilado.

## Archivos y colaboración

- Repositorio local: `C:/Users/Usuario/Desktop/PORTFOLIO-WEBS/Arquitecto`.
- Repositorio GitHub: `https://github.com/ronycozzi/arqvia`.
- Previsualización: `http://127.0.0.1:3127/`.
- Código nuevo de experiencia: `src/components/project-start.tsx`, `project-journey.tsx`, `arqvia-public-refresh.css`.
- Datos de la orientación: `src/lib/consultation-context.ts`.
- Evidencia y logs: `.codex-artifacts/arqvia-refresh-20261028/`.
- Copia SQLite de QA: `.codex-runtime/arqvia-refresh-20261028.db` (privada, fuera de Git).
- Backup de código base: `.codex-artifacts/arqvia-refresh-20261028/source-before.zip`.
- Tomiabalos recibió invitación de ampliación a escritura (340198016); hasta que acepte conserva su acceso previo de lectura. No se agregó un asiento pago en Vercel.

## Pendiente de publicación

Los cambios están en el worktree local, sin commit, push ni deploy. Se requiere revisión visual del usuario antes de decidir publicación. La preferencia visual no se da por aprobada a partir de pruebas automáticas. El hero/video está expresamente reservado para Tomás.
