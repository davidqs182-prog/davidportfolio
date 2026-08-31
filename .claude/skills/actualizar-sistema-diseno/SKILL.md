---
name: actualizar-sistema-diseno
description: Barrido completo de design-system.html contra el uso real del sitio — elimina del catálogo lo que ya no se usa en ninguna página real (ej. una tipografía, color o ícono que se dejó de usar) y agrega lo que sí se usa pero no está documentado. Usar SIEMPRE que David escriba "actualiza el sistema de diseño" (o variantes cercanas: "actualizá el design system", "limpiá el sistema de diseño", "el sistema de diseño está sucio/desactualizado") — esa frase sola ya dispara el barrido completo, no hace falta que especifique qué está mal.
---

# Barrido de design-system.html contra el uso real

`design-system.html` es el catálogo vivo del sitio (ver `CLAUDE.md`): todo lo
que existe en el sitio real debe aparecer ahí, y todo lo que aparece ahí debe
seguir existiendo en el sitio real. Este skill formaliza el chequeo en las dos
direcciones, en vez de confiar en acordarse de actualizarlo cambio a cambio.

Caso que motivó este skill: la tipografía DIN Next LT Pro se cargó para el
título de `project-onboarding.html`, después el título se reemplazó por el
logo de Fischbach (imagen), y la entrada de DIN Next LT Pro se quedó
documentada en `design-system.html` sin que nada en el sitio la siga usando.

## Qué es "uso real" y qué no cuenta

- **Cuenta**: cualquier archivo HTML del sitio que NO sea `design-system.html`
  (hoy: `index.html`, `project-onboarding.html`, y las páginas de proyecto que
  se sumen después) y el CSS que esos archivos cargan
  (`tokens.css`, `components.css`, `styles.css`, `project-*.css`).
- **No cuenta**: que algo aparezca solo dentro de `design-system.html` /
  `design-system.css` — esos son la vitrina, no el uso real. Si un token solo
  vive ahí, está desactualizado, no "en uso".

## Pasos

1. **Inventariar lo catalogado.** Recorrer `design-system.html` sección por
   sección (Colores, Tipografía, Espaciado, Botones, Íconos) y listar cada
   entrada individual: cada variable de color, cada fila de tipografía, cada
   variante de botón, cada ícono documentado.

2. **Para cada entrada, buscar uso real fuera del catálogo:**
   - Colores (`--color-*`): `grep` de la variable en todos los `.css` del
     sitio EXCEPTO `design-system.css`.
   - Tipografía (`--text-*-size`/`-line`, `--font-*`): mismo criterio —
     `grep` fuera de `design-system.css`. Ojo con fuentes cargadas vía
     `@font-face` en `components.css`: si la variable/familia no aparece en
     ningún `font-family` de un CSS de página real, está sin uso aunque el
     `@font-face` siga ahí.
   - Espaciado (`--space-*`): `grep` fuera de `design-system.css`.
   - Componentes (`.btn--*`, `.eyebrow`, clases de ícono como `.icon-forward`/
     `.icon-back`, etc.): `grep` de la clase en los `.html` reales.
   - Íconos (Material Symbols, ej. `arrow_forward`): `grep` del nombre del
     ícono en los `.html` reales.

3. **Si una entrada no tiene ningún uso real:**
   - Quitarla de `design-system.html` (la fila/swatch/card completa).
   - Dejar el token/regla en `tokens.css`/`components.css` tal cual —
     **no borrar del código fuente sin confirmar antes con David**: quitar
     algo del catálogo es reversible y de bajo riesgo, borrar una variable o
     un `@font-face` (y sus archivos de fuente asociados) es más invasivo.
     Reportarlo como "candidato a borrar de verdad" en el resumen final, no
     hacerlo solo.

4. **Buscar lo real que falta en el catálogo:** grep inverso — tokens,
   clases o íconos que sí se usan en las páginas reales pero no tienen
   entrada en `design-system.html`. Agregarlos siguiendo el formato ya
   establecido en cada sección (mismo patrón de swatch/fila/card que las
   entradas vecinas — no inventar un formato nuevo).

5. **Verificar en el navegador** (`design-system.html` recargado) que el
   catálogo sigue renderizando bien después de los cambios — nada roto, nada
   con estilos inline huérfanos por una clase que se quitó.

6. **Reportar un resumen corto**: qué se quitó del catálogo, qué se agregó,
   y qué queda flotando en el código fuente sin uso real (candidatos a
   limpieza más profunda, pendientes de que David confirme).
