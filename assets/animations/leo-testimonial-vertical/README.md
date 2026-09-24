# leo-testimonial-vertical — video vertical en la fila de project-leo/index.html

Testimonio real en cámara (persona hablando, formato vertical 9:16 —
"GWG - Snippet 2_9-16.mp4", carpeta Desktop/Figma Test/Leo/ de David).

Va en `.project-leo__section-inner` (project-leo/index.html), como
séptimo elemento de la fila scrolleable de animaciones — entre
`.project-leo__screen-caption` (el texto "Chat, redesigned...") y
`.project-leo__macbook-demo`, con 2 columnas de espacio antes y 1 columna
de espacio después.

**Con audio real y controles visibles** (`controls`, `preload="metadata"`,
sin `autoplay`/`muted`/`loop`) — mismo patrón que el video de LinkedIn
comentado en el HTML de esta misma página, no el de las animaciones
silenciosas vecinas de esta fila (`leo-macbook-demo`, las imágenes de
crossfade). Primera vuelta lo trató como pieza de fondo silenciosa por
error, asumiendo el mismo criterio que sus vecinos — David corrigió:
"el video se debe escucharse y poder reproducirse". Es un testimonio real
hablado, no una animación de producto en loop; el usuario lo dispara a
mano.

Preset "V0.1" de siempre (ver `assets/animations/onboarding-tool/README.md`),
**con audio** (AAC 160k para el MP4, Opus 128k para el WebM — no se usa
`-an` en ninguno de los dos, a diferencia del resto de animaciones en
loop de este sitio).

Fuente: "GWG - Snippet 2_9-16.mp4" — H.264/AAC, 1080×1920, 25fps, 42.4s,
40MB.

```bash
ffmpeg -i "GWG - Snippet 2_9-16.mp4" -vf "fps=30" \
  -c:v libx264 -profile:v high -level 4.2 -preset veryslow -crf 10 -pix_fmt yuv420p \
  -c:a aac -b:a 160k -movflags +faststart \
  leo-testimonial-vertical.mp4

ffmpeg -i "GWG - Snippet 2_9-16.mp4" -vf "fps=30" \
  -c:v libvpx-vp9 -crf 24 -b:v 0 -deadline good -cpu-used 2 -pix_fmt yuv420p \
  -c:a libopus -b:a 128k \
  leo-testimonial-vertical.webm

ffmpeg -y -ss 2 -i leo-testimonial-vertical.mp4 -update 1 -frames:v 1 -q:v 2 leo-testimonial-vertical-poster.jpg
```

**Peso — a tener en cuenta, distinto al resto de los videos de este
sitio.** El MP4 con CRF 10 dio **53MB, MÁS PESADO que la fuente (40MB)**
— caso atípico: es metraje de mucho detalle fino (piel, pelo, fondo con
profundidad de campo) a 1080×1920/25fps que CRF 10 (casi sin pérdida)
infla en vez de comprimir. El WebM sí comprime bien (**7MB**, el que se
sirve primero) — la mayoría de navegadores nunca tocan el MP4 pesado,
pero igual queda anotado: si el peso del MP4 de respaldo importa, hay que
subir el CRF a propósito (no se hizo acá sin preguntar primero, siguiendo
el criterio ya establecido en este proyecto de no bajar calidad por mi
cuenta). `preload="metadata"` (no `"auto"`) ya evita que el archivo
pesado se descargue completo apenas carga la página — recién se baja del
todo cuando el usuario le da play, mismo criterio que el video de
LinkedIn.

## HEVC para Safari/iOS (2026-09-24)

David reportó que este video "no arranca" en iOS, y funciona bien en
Windows — el peso del MP4 de respaldo (53MB, ver arriba) era justo la
causa que había quedado anotada sin resolver: Safari/iOS no soporta
WebM en absoluto, así que todo visitante de iPhone caía directo en ese
MP4 de 53-55MB intentando autoplay, y la carga se cortaba en silencio
(sin error visible) antes de completarse.

Solución: agregar un tercer `<source>` en HEVC (códec `hvc1`, mismo que
ya usa `leo-offer-create` para su alpha — acá sin alpha, es video
opaco), entre el WebM y el H.264, para que Safari/iOS lo tome a él en
vez de caer en el H.264 pesado. Re-encodado con `libx265` (no
`hevc_videotoolbox` — ese es exclusivo de macOS, este encode se hizo en
Windows) a un CRF más razonable para metraje real (no UI):

```bash
ffmpeg -i leo-testimonial-vertical.mp4 \
  -c:v libx265 -tag:v hvc1 -crf 20 -preset slow -pix_fmt yuv420p \
  -c:a aac -b:a 128k -movflags +faststart \
  leo-testimonial-vertical-hevc.mp4
```

Resultado: **8.3MB** (vs. 55MB del H.264) — Main profile, level 4.0,
sin el problema de nivel que tuvo el H.264 en otros videos de este
sitio. El WebM (7.3MB) sigue siendo el que ve la mayoría de
navegadores; el H.264 de 55MB queda como último respaldo, ya no en la
ruta de iOS.
