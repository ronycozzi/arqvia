# Arqvia · revisión estructural y editorial

Fecha: 28/10/2026. Estado: implementado en la copia local, sin commit, push ni deploy.

## Criterio del cambio

El rechazo señalaba portadas demasiado grandes, fichas que obligaban a buscar los datos, repetición de estructuras, tipografía inadecuada y animaciones abruptas. Se eligió un catálogo editorial compacto: información esencial junto a la imagen, detalles a demanda y recorridos con propósito. Se descartaron tanto reducir todo mediante zoom como conservar los mismos bloques cambiando sólo colores.

Público: personas que evalúan arquitectura, remodelación u obra y necesitan identificar un servicio, ver un proyecto y consultar. Colores existentes conservados; DM Sans sustituye la serif en el sitio público. Admin conserva su sistema. Hero de video/construcción reservado para Tomás; sólo se corrigieron la transición y las numeraciones del índice de obras existente.

## Cambios implementados

- Inicio: catálogo compacto interactivo con cambio de imagen, descripción y enlace coordinados. Orientación del proyecto después de los servicios y el antes/después. Se eliminó la repetición del proceso y del cierre comercial.
- Índice de obra construida: apertura y cierre con altura animada, fundido y movimiento leve de imagen; paneles cerrados inert, semántica de botones expandibles y movimiento reducido. Sin números decorativos.
- Proyectos: listados apaisados; fotografía y diez datos principales juntos al entrar. Historia con pestañas accesibles, galería y casos relacionados.
- Servicios: directorio por categorías; alcance y siguiente paso visibles al abrir cada ficha.
- Proceso: página independiente; Idea → Obra → Proyecto → Entrega como temas, aclarando que el proyecto se define antes de ejecutar. Plano vectorial conceptual detallado y vista de la casa completa en entrega.
- Nosotros: presentación compacta, forma de trabajo y equipo. Se eliminó un bloque de argumentos que repetía el anterior.
- Opiniones y guías: experiencias administradas y artículos conservados. Testimonios semilla excluidos, sin estrellas inventadas. El enlace para compartir experiencia usa contacto y requiere revisión editorial manual; no es un sistema de comentarios públicos automáticos.
- Footer: contactos, accesos y legales agrupados, sin párrafo y botones repetidos; grupos desplegables en celular.
- Tipografía y carga: títulos reducidos también en estados de carga y páginas auxiliares; diccionarios ingleses integrados.
- SEO: metadatos sociales y canónicos preservados/mejorados; datos de publicación de artículos; sitemap sin fechas estáticas ficticias; local y preview no indexables; producción mantiene indexación y vista previa grande de imagen. No se garantiza posicionamiento ni se hizo alta en Search Console.

## Verificación

- Suite: 123 archivos, 600 pruebas aprobadas.
- Footer/proceso tras compactación: 6 pruebas adicionales aprobadas.
- ESLint global aprobado y verificación de archivos finales; TypeScript aprobado.
- Compilación Next aprobada. El prebuild intentó regenerar Prisma y encontró la DLL bloqueada por el servidor local de Windows: no se modificó schema y se compiló con el cliente generado existente, sin detener servicios del usuario.
- Navegador: apertura de obras, catálogo → ficha, pestañas, menú móvil, proceso y entrega, Nosotros, blog. Vistas de escritorio y 390 px sin desborde en superficies comprobadas. Agente revisor verificó fichas/servicios a 390×844; capturas en outputs/arqvia-refinement-20261028.
- Las transiciones verificadas conservan paneles para animar el cierre y retiran interacción a los ocultos. Movimiento reducido contemplado en CSS.
- Sin envíos externos ni pruebas de correo, sin cambios en la base original, sin recargas de servicios, sin publicación.

## Límites y continuidad

La aceptación estética corresponde a Rony. La prueba de navegador fue con desarrollo local; no se publicó ni se ejecutó esta revisión en Vercel. Los datos y las imágenes de los proyectos existentes se conservaron; no se certificó su condición de obras reales. El plano nuevo es una ilustración conceptual, no documentación ejecutiva. El video pendiente de Tomás no forma parte de esta entrega.

Vista: http://127.0.0.1:3127/

## Ajuste posterior: evitar obras duplicadas
Se retiró ProjectSelection del inicio. Obras construidas queda como única selección de proyectos; Ver proyectos lleva al catálogo. El ancla home-projects apunta al hero. Verificado en navegador y ESLint de ambos archivos sin errores. Cambio local, sin deploy.

