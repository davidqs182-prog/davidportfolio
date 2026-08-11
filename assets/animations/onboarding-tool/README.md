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
