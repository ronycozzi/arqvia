# Arqvia — revisión de identidad y contenido

Objetivo: una experiencia de arquitectura reconocible por sus decisiones espaciales y la claridad del encargo, sin pretender atribuir autoría humana ni ocultar herramientas.

Modo: mejora del sistema público existente. Preservar proyectos, navegación, formularios, SEO, idiomas y backend; no publicar ni modificar la base de datos. Video del hero reservado a Tomás.

Alternativas evaluadas: portada cinematográfica (depende del video pendiente); revista de arquitectura (más lectura y fotografías repetidas); archivo de proyectos + mesa de trabajo (seleccionada: conecta obras, alcance y consulta sin duplicación).

Contrato visual: índice oscuro de proyectos, directorio claro de servicios con una lámina grande por selección, comparador como demostración material, formulario breve como inicio del encargo. No repetir tres tarjetas con iconos, imágenes de proyectos como relleno, cifras sin respaldo, retratos/personas semilla como equipo real, ni animar cada párrafo.

Sistema: conservar DM Sans y colores sobrios aprobados; titulares contenidos, texto de lectura hasta 60 caracteres por línea, etiquetas discretas, líneas de separación funcionales. Movimiento reservado a selección de obra/servicio, apertura de detalles y comparador; sin desplazamientos decorativos del cuerpo de texto. Sin numeración ornamental.

Responsive: selector de servicios lateral en escritorio y arriba de la lámina en móvil; contenido operativo visible sin hover; controles de 44px y foco perceptible. El selector debe responder a teclado y actualizar enlace, descripción e imagen juntos. Reducir movimiento respeta prefers-reduced-motion.

Evidencia prevista: lint, tipos, pruebas de selección/teclado, revisión visual escritorio/móvil, navegación de fichas y ausencia de desplazamiento horizontal. Las imágenes existentes son visualizaciones de la demo; no se certifican obras reales ni resultados comerciales.

## Implementación y verificación

- Inicio: servicios mediante selector de alcance (imagen, descripción, entregables y enlace coordinados), sin cuadrícula duplicada de tarjetas. Teclado con flechas, Home/End y foco; selección explícita, sin cambios por hover. Copys de portada y comparador más específicos. Se respetan textos personalizados del CMS distintos de los predeterminados.
- Servicios/proyectos: directorio y láminas editoriales, fichas con lectura abierta y tabs subrayados. Se conserva el catálogo y el recorrido a consulta.
- Nosotros/proceso/blog: textos concretos y menos paneles decorativos; personas semilla se reemplazan por disciplinas, testimonios semilla se excluyen también de las fichas. No se borraron registros.
- Movimiento: transiciones para selecciones y medios; el cuerpo de lectura ya no se desplaza decorativamente. Reduced motion preservado.
- ESLint de archivos afectados y TypeScript sin errores. Suite completa: 124 archivos, 603 pruebas aprobadas. Compilación Next completada.
- Navegador: selector en escritorio y 390px; imagen/destino de servicio cambian juntos; enlace a ficha de Diseño interior funciona; páginas Nosotros y Proyectos revisadas visualmente en escritorio. Sin overflow horizontal del inicio en 320/375/390/430/768/1024/1280/1440/1536/1920/2560px (medición DOM, no revisión visual exhaustiva en cada tamaño).
- Capturas en Business/outputs/arqvia-refinement-20261028: servicios-editorial-desktop.png, servicios-editorial-mobile.png, estudio-editorial-desktop.png, proyectos-editorial-desktop.png.
- Solo local. Sin deploy, envíos, pruebas de correo ni cambios de DB. Video de Tomás pendiente. La percepción estética sigue pendiente de validación del usuario; no se afirma que una web pueda certificar apariencia o autoría humana.
