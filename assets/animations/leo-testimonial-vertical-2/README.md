# leo-testimonial-vertical-2 — testimonio de Jaqueline Krott (Strack GmbH)

Segundo testimonio vertical 9:16, para la segunda sección de
project-leo/index.html (fondo #CC6633). Mismo layout, mismo
comportamiento y misma codificación que `leo-testimonial-vertical`
(ver su README): vista previa en silencio y en loop; al activar el
audio o tocar play/pausa reinicia desde 0, con sonido y sin loop
(script al final del HTML, uno por video).

Fuente: "Video Project.mp4" (Desktop/Figma Test/Leo/) — H.264/AAC,
1080×1920, 30fps, 15.57s, 39.5MB.

Preset "V0.1" con audio (AAC 160k / Opus 128k). Level MP4 verificado: `42`.

```bash
ffmpeg -i "Video Project.mp4" -vf "fps=30" \
  -c:v libx264 -profile:v high -level 4.2 -preset veryslow -crf 10 -pix_fmt yuv420p \
  -c:a aac -b:a 160k -movflags +faststart leo-testimonial-vertical-2.mp4

ffmpeg -i "Video Project.mp4" -vf "fps=30" \
  -c:v libvpx-vp9 -crf 24 -b:v 0 -deadline good -cpu-used 2 -pix_fmt yuv420p \
  -c:a libopus -b:a 128k leo-testimonial-vertical-2.webm

ffmpeg -y -ss 2 -i leo-testimonial-vertical-2.mp4 -update 1 -frames:v 1 -q:v 2 leo-testimonial-vertical-2-poster.jpg
```

**Peso:** MP4 42.7MB (más pesado que la fuente, 39.5MB — mismo caso que
el primer testimonio: CRF 10 infla metraje con mucho detalle fino);
WebM 4.5MB, el que casi todos los navegadores usan. Si importa el peso
del MP4 de respaldo, hay que subir el CRF a propósito (no se hizo sin
preguntar).
