# Onboarding tool — video de la tarjeta "Work"

Video corto en loop (mockup de celular animando entre pantallas de producto)
para la segunda tarjeta de la sección Work.

Fuente actual: recording de David a **1920×2160px nativos** ("Onboarding
animation 02.mp4" — reemplazó a la primera entrega, que era 1300×1462px).

## Preset de compresión "V0.1"

```bash
ffmpeg -i "<fuente>.mp4" \
  -vf "fps=30" \
  -c:v libx264 -profile:v high -level 4.2 -preset veryslow -crf 10 -pix_fmt yuv420p \
  -an -movflags +faststart \
  onboarding-demo.mp4

ffmpeg -i "<fuente>.mp4" \
  -vf "fps=30" \
  -c:v libvpx-vp9 -crf 24 -b:v 0 -deadline good -cpu-used 2 -pix_fmt yuv420p \
  -an \
  onboarding-demo.webm
```

- `fps=30`: la fuente venía a 60fps: innecesario para una animación de UI, reduce peso a la mitad sin pérdida visible.
- `-crf 10 -preset veryslow`: calidad casi sin pérdida. Usar `-crf 16` a `20` si el peso del archivo importa más que la nitidez máxima.
- **`-level 4.2`: OBLIGATORIO, no omitir.** Sin esto, x264 auto-selecciona el level según resolución/bitrate — con esta resolución + `-crf 10` + `veryslow`, eligió **Level 6.0** (pensado para 8K), que la mayoría de los decodificadores de hardware (los que usan los navegadores) no soportan bien. Eso causaba un glitch visual reproducible (bloques blancos) siempre en el mismo punto, en cualquier navegador — el video "se veía bien" en ffmpeg/reproductores de software porque esos son mucho más tolerantes que un decoder de hardware. `4.2` cubre esta resolución sin problema y es ampliamente compatible.
- Se probó agregar `unsharp` (realce de bordes) pero no mejoró la nitidez percibida en la práctica — se descartó del preset.
- `-pix_fmt yuv420p` (no `yuv444p`): mantiene compatibilidad amplia con Safari/iOS.
- WebM (VP9) como formato preferido (mejor compresión que H.264 a igual calidad), con el MP4 de arriba como `<source>` de respaldo — así se sirve en el HTML.
- Poster (`onboarding-poster.jpg`): frame 0 del MP4 ya comprimido, extraído con `-q:v 2` (alta calidad JPEG).

## Sobre la nitidez

Con la fuente de 1920×2160 la nitidez ya es buena incluso en pantallas
Retina/HiDPI a los tamaños que ocupa esta tarjeta (~1300px de ancho en
desktop). Si en algún momento el video se ve borroso de nuevo, lo primero a
revisar es si la fuente sigue siendo esta resolución o si se usó una fuente
más chica.

## Si vuelve a aparecer un glitch/corrupción visual

1. Verificar el level del H.264 exportado: `ffprobe -v error -select_streams v:0 -show_entries stream=level -of default=noprint_wrappers=0 onboarding-demo.mp4` — debe dar `42` (Level 4.2), no `60`.
2. Si el glitch es reproducible siempre en el mismo punto y en cualquier navegador → problema de compatibilidad de decodificador (como el de arriba). Si es intermitente o solo en un navegador → más probable que sea un problema de reproducción puntual, no del archivo.

---

# hands-tablet-mockup.webm — video del hero en project-onboarding.html

Video de manos sosteniendo una tablet (mockup de la app), con **canal
alpha/transparencia** — se ve directo sobre el fondo `#EBEBEB` del hero
de la página de proyecto, sin recuadro. Por eso es **WebM-only, sin
respaldo MP4**: H.264/MP4 no soporta transparencia en navegadores, así
que el preset "V0.1" de arriba no aplica tal cual (esa receta es para
video opaco).

Fuente: "HandsHoldingTabletProMockup.webm" de David, VP9/WebM con
`alpha_mode:1`, ~1844px de ancho (el alto varió entre entregas),
~60fps, 8-13s según la entrega (~10-17MB). Pasó por 4 rondas: 868×578
(se veía borroso — resolución casi 1:1 contra el ancho real de
display, 860px/8 columnas, sin margen para Retina/HiDPI) → 1844×1156
recomprimido (pero con el bug del decoder de abajo, salió con fondo
negro opaco en vez de transparente) → 1844×1156 recomprimido bien, con
transparencia real → **1844×962** (actual), mismo ancho pero con
menos alto, a pedido de David.

```bash
ffmpeg -c:v libvpx-vp9 -i "<fuente>.webm" \
  -vf "fps=30" \
  -c:v libvpx-vp9 -crf 24 -b:v 0 -deadline good -cpu-used 2 -pix_fmt yuva420p \
  -an \
  hands-tablet-mockup.webm
```

- **`-c:v libvpx-vp9` ANTES de `-i` (como decodificador de entrada):
  OBLIGATORIO, no omitir.** Sin esto, ffmpeg usa su decodificador VP9
  nativo/interno para leer la fuente, que **no extrae el canal alpha
  de este contenedor** — el video sale con fondo negro **opaco**
  (alpha=255 en vez de 0) aunque el metadata siga diciendo
  `alpha_mode:1` (ese tag se copia igual, sin importar si el canal se
  decodificó bien o no — no sirve para detectar el problema). Mismo
  patrón que el bug del `-level 4.2` de arriba: el archivo "parece"
  estar bien por sus metadatos, pero el contenido real está roto.
  Forzar `libvpx-vp9` como decoder sí lee el canal alpha correctamente.
- **Cómo verificarlo de verdad** (no confiar solo en el tag): extraer
  un frame a PNG con el decoder correcto y mirar el valor alpha real
  de una esquina que debería ser transparente:
  ```bash
  ffmpeg -c:v libvpx-vp9 -ss 2 -i hands-tablet-mockup.webm -update 1 -frames:v 1 -pix_fmt rgba frame.png
  ffmpeg -i frame.png -vf "crop=10:10:5:5" -f rawvideo -pix_fmt rgba corner.raw
  xxd corner.raw | head -1
  ```
  El último byte de cada píxel es el alpha — debe ser `00` (transparente) en una esquina de fondo, no `ff` (opaco).
- `-pix_fmt yuva420p` (no `yuv420p`) en la salida: sin esto tampoco se
  codifica el canal alpha, aunque la entrada se haya decodificado bien.
- `fps=30`: mismo criterio que el video de arriba — la fuente venía a
  ~60fps, innecesario para este tipo de contenido.
- Resolución nativa (1844×1156) sin escalar: ya da ~2.1x el ancho real
  de display (860px), suficiente margen para Retina sin pasarse de la
  fuente.
- Resultado: ~17MB → ~2.6MB.
- Sin poster: como el fondo de la página ya es del mismo tono que el
  video, y el video carga rápido (lazy-load + tamaño chico), no hace
  falta un placeholder — además un poster en JPG no podría mantener la
  transparencia (habría que generarlo en PNG si en algún momento se
  necesita).

---

# bento-sketching.webm / .mp4 — casilla alta del bento grid en project-onboarding.html

Video de David sosteniendo/escribiendo en un flip chart (proceso de
research), para la casilla `.project-bento__tile--tall` de la sección
"Behind the scenes". A diferencia del video del hero, **sin canal
alpha** — es un video normal, opaco, así que sí aplica el preset "V0.1"
(MP4 + WebM, ver arriba) tal cual.

Fuente: "WhatsApp Video 2026-08-07 at 12.54.24.mp4" de David — grabado
en vertical con el celular (viene con metadata de rotación -90°, no en
píxeles físicos portrait; ffmpeg la aplica solo al recodificar), 576×1024
efectivos, ~30fps, 15.1s, 3.2MB con audio.

```bash
ffmpeg -i "<fuente>.mp4" \
  -vf "fps=30" \
  -c:v libx264 -profile:v high -level 4.2 -preset veryslow -crf 10 -pix_fmt yuv420p \
  -an -movflags +faststart \
  bento-sketching.mp4

ffmpeg -i "<fuente>.mp4" \
  -vf "fps=30" \
  -c:v libvpx-vp9 -crf 24 -b:v 0 -deadline good -cpu-used 2 -pix_fmt yuv420p \
  -an \
  bento-sketching.webm

ffmpeg -y -ss 0 -i bento-sketching.mp4 -update 1 -frames:v 1 -q:v 2 bento-sketching-poster.jpg
```

- `-an`: el video se usa muted en el sitio (mismo criterio que el resto
  de los videos de proyecto), así que se descarta el audio de la fuente
  al codificar en vez de cargarlo sin usarlo.
- Con `-crf 10 -preset veryslow` el MP4 (6.5MB) termina pesando más que
  la fuente original (3.2MB) — mismo trade-off ya documentado en este
  README: acá se prioriza nitidez sobre peso. El WebM (1.8MB) es el que
  realmente se sirve primero.
- Resultado: MP4 6.5MB, WebM 1.8MB, poster JPG 58KB.

---

# order.webm — animación de teléfono en la sección "Testimonial" de project-onboarding.html

Screen recording de una interacción dentro de la app (flujo de "order"),
para el lado izquierdo de la sección de testimonio con fondo rojo
`#E0232A`.

**Ronda 1** — fuente `order.mp4` (ya estaba en
`assets/images/onboarding-tool/`): h264, 288×602, 60fps, 14.68s, 6.7MB,
sin alpha. Preset "V0.1" tal cual (MP4+WebM). Resultado: MP4 1.4MB,
WebM 736KB.

**Ronda 2** — David pasó `Screen.mp4` (`Desktop/Figma Test/`), 2x la
resolución de la ronda 1 (576×1204, mismo mockup, sin alpha tampoco).
Mismo preset "V0.1". El negro del bisel del celular (fuera del contorno
redondeado, el video no tenía transparencia) se intentó tapar con
`border-radius` en `.project-testimonial__video` — David lo probó en
vivo y no le gustó el resultado, se sacó.

**Ronda 3 (actual)** — David re-exportó el mismo video con **canal
alpha real** (`order.webm`, `Desktop/Figma Test/`): VP9/WebM,
576×1204, 60fps, 14.68s, 7.17MB, con `alpha_mode:1`. Con esto el fondo
negro desaparece de verdad (transparencia real, no un recorte
aproximado) — mismo criterio que `hands-tablet-mockup.webm` más abajo:
**WebM-only, sin respaldo MP4** (H.264 no soporta alpha), sin poster
(la sección ya es del mismo rojo `#E0232A` de fondo, no hace falta
placeholder).

```bash
ffmpeg -c:v libvpx-vp9 -i "<fuente>.webm" \
  -vf "fps=30" \
  -c:v libvpx-vp9 -crf 24 -b:v 0 -deadline good -cpu-used 2 -pix_fmt yuva420p \
  -an \
  order.webm
```

- **`-c:v libvpx-vp9` antes de `-i`: obligatorio** — mismo motivo que
  `hands-tablet-mockup.webm` (ver más abajo): sin forzar el decoder de
  entrada, ffmpeg no extrae bien el canal alpha del contenedor.
- Verificado de verdad (no solo el tag `alpha_mode`): se extrajo un
  frame con `-pix_fmt rgba` y se leyó el byte de alpha de una esquina
  con `xxd` — dio `00` (transparente) en la esquina y `ff` (opaco) en
  el centro de la pantalla del celular, confirmando que el canal alpha
  quedó bien decodificado y codificado, no solo etiquetado.
- Resultado: fuente 7.17MB → WebM 1.72MB.
- `order.mp4` y `order-poster.jpg` de la ronda 2 se borraron — ya no
  se usan (no tiene sentido un fallback MP4 sin transparencia para un
  video pensado para verse sin fondo).

**Poster (`order-poster.png`)** — agregado después, cuando el
carrusel de testimonios pasó a cargar/reproducir cada video recién en
un punto específico (40% de la sección visible, o al hacer swipe —
ver "Carrusel de testimonios (video)" en `js/main.js`): sin poster, el
`<video>` se veía vacío hasta ese momento, y David no quería ese hueco
en blanco. **PNG, no JPG** — el video tiene canal alpha real, y un
JPG no puede guardar transparencia (saldría con fondo negro/opaco
detrás del bisel, el mismo bug que ya arreglamos antes). Extraído con
el mismo decoder forzado (`-c:v libvpx-vp9`) para que el frame
exportado conserve el alpha:

```bash
ffmpeg -c:v libvpx-vp9 -ss 1 -i order.webm -update 1 -frames:v 1 order-poster.png
```

Verificado con `ffprobe -show_entries stream=pix_fmt` sobre el PNG
resultante — debe decir `rgba`, no `rgb24` (que perdería el alpha).

---

# macbook-order.webm — animación de laptop en la segunda sección de testimonio de project-onboarding.html

Mockup de MacBook (mismo tipo de animación que `order.webm`, pero de
una laptop en vez de un celular), para el lado izquierdo (6 columnas)
de la segunda sección de testimonio, roja, al final de la página.
Con canal alpha real — mismo criterio que `order.webm`/
`hands-tablet-mockup.webm`: WebM-only, sin respaldo MP4.

Fuente: `MacBook.webm` de David (`Downloads/`) — VP9/WebM,
3580×2160, 60fps, 6.63s, 28MB, `alpha_mode:1`. Resolución nativa muy
por encima de lo que hace falta para mostrarse en 6 columnas
(~640px a 1440px de referencia), así que se bajó a 1800px de ancho
(~2.8x ese ancho de display, margen de sobra para retina) en vez de
usarla tal cual — bajar la resolución de una fuente con alpha antes
de codificar no afecta la transparencia, solo el tamaño del archivo.

```bash
ffmpeg -c:v libvpx-vp9 -i "<fuente>.webm" \
  -vf "fps=30,scale=1800:-2:flags=lanczos" \
  -c:v libvpx-vp9 -crf 24 -b:v 0 -deadline good -cpu-used 2 -pix_fmt yuva420p \
  -an \
  macbook-order.webm
```

- `-c:v libvpx-vp9` antes de `-i`: obligatorio, mismo motivo ya
  documentado arriba (si no, ffmpeg no decodifica bien el alpha del
  contenedor de origen).
- `scale=1800:-2`: el `-2` calcula el alto automático manteniendo la
  proporción real del mockup, redondeado a un número par (obligatorio
  para `yuv420p`/`yuva420p`, que necesita dimensiones pares).
- Verificado con el mismo método que `order.webm`: frame extraído con
  `-pix_fmt rgba`, esquina revisada con `xxd` — dio prácticamente 0
  de alpha (transparente), no 255.
- Resultado: fuente 28MB (3580×2160) → WebM 978KB (1800×1086).

**Poster (`macbook-order-poster.png`)** — mismo motivo y mismo método
que el de `order.webm` arriba: PNG (no JPG) para conservar el alpha,
extraído con el decoder VP9 forzado.

```bash
ffmpeg -c:v libvpx-vp9 -ss 1 -i macbook-order.webm -update 1 -frames:v 1 macbook-order-poster.png
```
