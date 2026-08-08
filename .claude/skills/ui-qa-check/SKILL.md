---
name: ui-qa-check
description: Checklist de control de calidad visual para CUALQUIER cambio de HTML o CSS en el portafolio de David Quirós — colores, tipografía, espaciado, layout, responsive, accesibilidad. Usar SIEMPRE después de editar algo que afecte la interfaz gráfica (clases CSS, estructura HTML, un componente nuevo, un ajuste de espaciado o color), antes de dar el cambio por terminado — incluso si el usuario no pidió explícitamente "revisá" o "validá esto". No usar para cambios que no tocan la interfaz (JS de lógica pura, contenido de texto sin cambios de estilo, config del servidor).
---

# QA visual antes de dar por terminado un cambio de interfaz

Esto formaliza lo que ya veníamos haciendo a mano en el proyecto: medir en
vez de opinar, y separar claramente **lo que es un hecho verificable** de
**lo que es un criterio de diseño**. No mezclar las dos cosas en el mismo
nivel de certeza — confundirlas es el error más común de un QA visual.

## Los dos tipos de hallazgo

1. **Objetivo** — se puede demostrar con una medición o una regla externa.
   No es opinión tuya, es un hecho:
   - No coincide con el archivo de Figma (color, tamaño, tipografía, espaciado exactos)
   - Rompe el sistema de diseño del proyecto (usa un color/tamaño que no está en `css/tokens.css`, en vez del token correspondiente)
   - Falla un estándar de accesibilidad citable (contraste WCAG, `alt` faltante, tamaño de área táctil)
   - Se ve roto/cortado a algún tamaño de pantalla (overflow horizontal, texto solapado, imagen recortada mal)

2. **Sugerencia** — juicio de diseño general (jerarquía visual, ritmo de
   espaciados, proximidad). Es una recomendación profesional razonable,
   no una regla objetiva — presentarla como tal, preguntando al usuario en
   vez de aplicarla sola si es un cambio no trivial.

Al reportar, **etiquetar cada hallazgo con cuál de los dos es**. Nunca
presentar una sugerencia como si fuera un hecho.

## Pasos

1. **Identificar qué cambió.** `git diff` (o `git status` si aún no está
   guardado) para saber exactamente qué CSS/HTML se tocó — no revisar la
   página entera de memoria, enfocarse en lo que cambió.

2. **Capturar la página en 3 anchos** usando las herramientas del Browser
   pane (`resize_window` + `computer` screenshot): ~375px (mobile),
   ~768px (tablet), ~1440px (desktop, el ancho de referencia del Figma).
   Revisar que no haya scroll horizontal, texto cortado, imágenes
   estiradas o elementos solapados en ninguno de los tres.

3. **Si hay una referencia de Figma para esta parte de la página**,
   comparar con medición real, no a ojo — la técnica que usamos en este
   proyecto: `get_screenshot` del nodo, descargar el PNG, y sample de
   píxeles con PowerShell (`System.Drawing.Bitmap.GetPixel`) para colores
   exactos, y `getBoundingClientRect()` vía `javascript_tool` para medir
   el resultado renderizado. No confiar en "se ve parecido".

4. **Revisar consistencia con el sistema de diseño**: `grep` en el CSS
   tocado buscando valores de color (`#`) o tamaños en `px` sueltos que
   deberían ser una variable de `css/tokens.css`. Si hay un color/tamaño
   nuevo que no está en la escala, marcarlo como hallazgo objetivo — no
   asumir que está bien porque "se ve similar".

5. **Accesibilidad básica**: toda `<img>` con `alt` descriptivo (o `alt=""`
   si es puramente decorativa); contraste de texto sobre su fondo
   (herramienta: cualquier calculadora de contraste WCAG, o estimarlo
   con las fórmulas de luminancia relativa si no hay herramienta a mano);
   HTML semántico (no usar `<div>` con `onclick` en vez de `<button>`,
   por ejemplo).

6. **Reportar** en dos bloques separados, "Objetivo" y "Sugerencia", cada
   hallazgo con la medición o el archivo/línea que lo respalda. Si no hay
   nada que reportar en una categoría, decirlo ("sin hallazgos
   objetivos") en vez de omitir la sección.

## Cuándo escalar al agente `design-reviewer`

Este checklist lo seguís vos mismo, en el mismo hilo de conversación —
rápido, pero con el punto ciego de que revisás tu propio trabajo. Para
cambios grandes (una sección nueva, un rediseño de un componente, algo
que toca muchas partes de la página a la vez), además de este checklist
proponé invocar el agente `design-reviewer` (`Agent` tool,
`subagent_type: "design-reviewer"`) — corre en una sesión nueva, sin el
contexto de que vos hiciste el cambio, así que da una segunda opinión
más independiente. No hace falta para un ajuste chico (mover un margin,
cambiar un color puntual).
