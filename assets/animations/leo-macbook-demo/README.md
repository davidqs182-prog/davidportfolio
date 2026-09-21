# leo-macbook-demo — animación de MacBook en la fila de project-leo/index.html

Demo grabada de la app Leo (pantalla "Projekt Details") con el mockup de
MacBook ya compuesto/horneado en el video mismo — no es una grabación
plana de pantalla, el archivo original (`Macbook Leo.mp4`, carpeta
Desktop/Figma Test/ de David) ya incluye el bisel del laptop.

Va en `.project-leo__section-inner` (project-leo/index.html), como tercer
elemento de la fila scrolleable de animaciones — después de
`.project-leo__testimonial-vertical` (se movieron los dos juntos al
principio de la fila, justo después de "My role" — ver el comentario de
`.project-leo__testimonial-vertical` en css/project-leo.css para el
motivo). Corre sola (`autoplay muted loop playsinline`), igual que el
resto de las animaciones vecinas de esa fila — no usa el patrón lazy-load
con `data-src`/IntersectionObserver del resto del sitio, porque esa fila
entera ya corre sin depender de scroll-into-view.

Preset "V0.1" de siempre (ver `assets/animations/onboarding-tool/README.md`
para el detalle completo de por qué cada flag) — MP4 H.264 nivel 4.2
(verificado `42`) + WebM VP9, sin audio (`-an`): la fuente sí traía una
pista de audio real (AAC), pero se descarta a propósito — este video es
una animación de fondo en loop silencioso, igual que sus vecinos en esa
fila, no un video con controles que el usuario dispara a mano (a
diferencia de `leo-testimonial-vertical`, que sí lleva audio real).

Fuente: "Macbook Leo.mp4" (Desktop/Figma Test/) — H.264/AAC, 1920×1080,
30fps, 35.77s, 51MB.

**Recortado horizontalmente a 1788×1080** — a pedido de David: "corta los
espacios sobrantes que tiene el video al lado izquierdo y derecho despues
de los bordes de la computadora sin modificar el tamano que ya tenemos".
El archivo original traía ~66px de fondo gris liso (#f6f6f6) sobrante a
cada lado del bisel del laptop. Medido en vivo, no a ojo: se escaneó
pixel a pixel (System.Drawing, PowerShell) el bounding box real del
contenido no-fondo en 5 timestamps distintos a lo largo de todo el video
(t=1s, 10s, 20s, 30s, 35s) — resultado idéntico en los cinco (la cámara
no se mueve): `minX=68 maxX=1852 minY=0 maxY=1076` sobre un frame de
1920×1080. Sin crop vertical (David pidió explícitamente "al lado
izquierdo y derecho", no arriba/abajo — y de hecho casi no sobraba nada
verticalmente, minY=0 y maxY=1076 de 1080). El recorte se hizo en el
archivo (`crop=1788:1080:66:0`, con ~2px de margen de seguridad sobre el
bbox medido), no con CSS — el ancho angosta la caja en la página, pero el
alto de la fila (552px de referencia) no cambió, tal como pidió.

```bash
ffmpeg -i "Macbook Leo.mp4" -vf "crop=1788:1080:66:0,fps=30" \
  -c:v libx264 -profile:v high -level 4.2 -preset veryslow -crf 10 -pix_fmt yuv420p \
  -an -movflags +faststart \
  leo-macbook-demo.mp4

ffmpeg -i "Macbook Leo.mp4" -vf "crop=1788:1080:66:0,fps=30" \
  -c:v libvpx-vp9 -crf 24 -b:v 0 -deadline good -cpu-used 2 -pix_fmt yuv420p \
  -an \
  leo-macbook-demo.webm

ffmpeg -y -ss 3 -i leo-macbook-demo.mp4 -update 1 -frames:v 1 -q:v 2 leo-macbook-demo-poster.jpg
```

Resultado: 1788×1080 (recortado del 1920×1080 original, sin reescalar).
MP4 ~20MB, WebM (el que se sirve primero) ~12MB.
