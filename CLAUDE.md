# Portafolio de David Quirós — convenciones del proyecto

Sitio estático (HTML/CSS/JS puro, sin frameworks) — elección deliberada
para aprender los fundamentos. Servidor local: `.claude/serve.ps1`
(configuración `portfolio-static` en `.claude/launch.json`, puerto 8080).

## Proceso: el sistema de diseño siempre queda al día

Cada vez que se agrega algo nuevo al sistema de diseño — un color, un
tamaño de tipografía, una variable de espaciado (`--space-*`), una
variante de componente, un ícono — hay que reflejarlo en
`design-system.html` (+ `css/design-system.css` si hace falta estilo
nuevo para mostrarlo) en el mismo cambio, no después. `design-system.html`
es el catálogo vivo: si algo existe en el sitio pero no aparece ahí,
se considera un cambio incompleto.

Fuente de los tokens: `css/tokens.css` (colores, tipografía, grid,
espaciado). Componentes reutilizables: `css/components.css`.

## Íconos: siempre Google Material Symbols

Todos los íconos del sitio usan la fuente de íconos de Google
(**Material Symbols Rounded** — `fonts.google.com/icons`), nunca SVG
inline dibujado a mano ni otra librería de íconos. Convención:

- Cargar la fuente vía Google Fonts en el `<head>` de cada página que
  use íconos (ya está en `index.html` y `design-system.html`).
- Marcado: `<span class="material-symbols-rounded" aria-hidden="true">nombre_del_icono</span>`
  (el nombre es el identificador de Google, ej. `arrow_forward`). Si el
  ícono es puramente decorativo (acompaña texto visible, como en un
  botón), lleva `aria-hidden="true"`; si es el único contenido
  significativo de un control, el control necesita su propio
  `aria-label`.
- Clase base `.material-symbols-rounded` vive en `css/components.css`
  (sección "Icons").
- Cada ícono nuevo que se use se agrega a la sección "Íconos" de
  `design-system.html` — nombre del ícono, dónde se usa en el sitio.
- Micro-animaciones de ícono (ej. deslizar en hover) van en una clase
  opt-in aparte (ej. `.icon-forward`), nunca en `.material-symbols-rounded`
  directo — así un ícono nuevo no hereda un movimiento que no le
  corresponde (un ícono de "eliminar" no debería deslizarse como uno
  de "avanzar").
- En `design-system.html`, todas las variantes de un componente (con
  ícono, sin ícono, tamaños, estados) van juntas en el mismo bloque/tabla,
  en el orden ya establecido — nunca en secciones separadas por
  "tiene X" vs "no tiene X".

## Otras convenciones ya establecidas

- Un commit por cambio lógico, mensaje explicando el *por qué*.
- Verificar cambios visuales en el navegador (in-app Browser pane, y
  cross-check en Chrome real si algo se ve raro) antes de darlos por
  terminados — ver skill `ui-qa-check`.
- Medir, no opinar a ojo: `getBoundingClientRect()` / `getComputedStyle()`
  vía `javascript_tool`, o sampleo de píxeles contra capturas de Figma,
  en vez de estimar visualmente.
