# leo-linkedin-video — video en la sección naranja de project-leo.html

Video real (con audio) de Leo Software, bajado manualmente por David
desde el navegador ("Guardar video como...", LinkedIn no da una URL de
video descargable directa — el player carga el stream vía
`MediaSource`/blob interno). Va en `.project-leo__section-orange`, a 6
columnas de ancho.

**Reemplaza** al primer intento (`leo-linkedin-post.mp4`, carpeta
`leo-linkedin-post/`, ya borrada) — David corrigió al video correcto
("linkedin-video (1).mp4") y de 5 a 6 columnas.

A diferencia del resto de los videos del sitio (decorativos, mudos, en
loop, sin controles) **este lleva audio real y controles nativos
visibles** (`controls`, sin `muted`, sin `loop`) — David pidió
específicamente que se pueda reproducir/detener y controlar el
volumen. Por eso tampoco usa el patrón de lazy-load con `data-src` del
resto (`IntersectionObserver` en `js/main.js`): ese patrón está pensado
para autoplay silencioso al entrar en pantalla, no aplica a un video
con sonido que el usuario dispara a mano.

Fuente: "linkedin-video (1).mp4" (`Downloads/`) — H.264/AAC, 1280×720,
30fps, 2:20 (140.65s), 9.77MB.

```bash
ffmpeg -i "linkedin-video (1).mp4" \
  -vf "fps=30" \
  -c:v libx264 -profile:v high -level 4.2 -preset veryslow -crf 10 -pix_fmt yuv420p \
  -c:a aac -b:a 160k -movflags +faststart \
  leo-linkedin-video.mp4

ffmpeg -i "linkedin-video (1).mp4" \
  -vf "fps=30" \
  -c:v libvpx-vp9 -crf 24 -b:v 0 -deadline good -cpu-used 2 -pix_fmt yuv420p \
  -c:a libopus -b:a 128k \
  leo-linkedin-video.webm

ffmpeg -y -ss 3 -i leo-linkedin-video.mp4 -update 1 -frames:v 1 -q:v 2 leo-linkedin-video-poster.jpg
```

- Con audio: **no** se usa `-an` en ninguno de los dos encodes (a
  diferencia del resto del preset "V0.1" en este sitio) — el audio es
  parte del contenido real, no algo para descartar. AAC 160k para el
  MP4, Opus 128k para el WebM.
- `-level 4.2`: igual de obligatorio que siempre — ver el resto de
  READMEs de esta carpeta de assets para el bug real que causa
  omitirlo. Verificado: `42`.
- Poster: frame 0 es negro (el video abre con un fade-in) — se usó el
  frame en `t=3s` en su lugar (toma aérea de los edificios con paneles
  solares, representativa del contenido real).
- **Peso — a tener en cuenta.** A diferencia del primer clip corto
  (18s → WebM de 96KB), este es 2:20 de video real a 720p con
  `-crf 10 -preset veryslow`: MP4 **40MB**, WebM (el que se sirve
  primero) **21.7MB**. Es el mismo trade-off ya documentado en este
  README (nitidez sobre peso) pero acá el archivo es sensiblemente más
  pesado por la duración — el `<video>` usa `preload="metadata"` (no
  descarga el archivo completo hasta que el usuario le da play), así
  que no pega en la carga inicial de la página, pero si en algún
  momento el peso importa más que la nitidez máxima para un video de
  esta duración, avisar antes de bajar el CRF — no asumir.
- Resolución nativa (1280×720) sin escalar — a 6 columnas (~570px a
  1440px de referencia) da margen de sobra para Retina/HiDPI.
