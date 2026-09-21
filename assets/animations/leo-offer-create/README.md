# leo-offer-create — demo "Angebot anlegen" en la 2ª sección de project-leo/index.html

Grabación de pantalla del flujo "Angebot anlegen" de la app Leo (con el
mockup de tablet incluido), como último hijo de la segunda
`.project-leo__section-inner` (fondo #CC6633).

Fuente: "Angfebote anlegen 2.mp4" (Desktop/Figma Test/Leo/) — H.264,
2836×2176, 30fps, 13.07s, sin audio. **Grabada sobre fondo verde
(≈ rgb 16,252,41)** para quitarle el fondo por chroma key (una versión
anterior con fondo naranja dejaba un rectángulo visible en las esquinas).

## Chroma key

`colorkey=0x10FC29:0.18:0.05` — similitud 0.18, NO más: con 0.30 el key
se come los círculos verdes "1" y "2" de la UI (verde oscuro real de la
interfaz). `despill=type=green` se probó y se descartó: oscurece ese mismo
verde de la UI (círculos y bordes de tarjeta quedan marrón/gris). El
halo verde de 1px que queda en el borde del bisel se elimina erosionando
el alfa 3 veces (`erosion` x3 sobre `alphaextract`, luego `alphamerge`) —
achica el contorno ~1.5px a 1484 de ancho, imperceptible. (`erode` no
existe en ffmpeg; el filtro se llama `erosion`.)

## Dos archivos, dos estrategias

- **WebM VP9 con alpha** (`yuva420p`, `-auto-alt-ref 0` obligatorio para
  alpha; verificado `alpha_mode=1`): transparente de verdad — Chrome /
  Firefox / Edge. Se sirve primero.
- **MP4 H.264 opaco, ya compuesto sobre #CC6633**: respaldo para
  Safari/iOS (que no decodifican VP9+alpha). Como el fondo de la sección
  es ese mismo color, se ve igual sin necesitar HEVC+alpha. Ojo: tras
  el pase YUV el fondo decodifica a ≈ rgb(202,100,48), 2-3 niveles por
  debajo de #CC6633 (204,102,51) — imperceptible a simple vista.
  Si esta sección algún día cambia de color, este MP4 hay que
  regenerarlo con el color nuevo.

Reescalado a 1484×1138: 2836×2176 excede los macrobloques del level 4.2
del preset V0.1 (ver skill compress-portfolio-video). Level MP4
verificado: `42`.

```bash
KEY="format=rgba,colorkey=0x10FC29:0.18:0.05,split[a][b];[a]alphaextract,erosion,erosion,erosion[m];[b][m]alphamerge[k]"

ffmpeg -i "Angfebote anlegen 2.mp4" -filter_complex "[0:v]$KEY;[k]scale=1484:-2:flags=lanczos,fps=30,format=yuva420p[o]" \
  -map "[o]" -c:v libvpx-vp9 -crf 24 -b:v 0 -deadline good -cpu-used 2 -pix_fmt yuva420p -auto-alt-ref 0 -an leo-offer-create.webm

ffmpeg -i "Angfebote anlegen 2.mp4" -f lavfi -i "color=c=0xCC6633:s=2836x2176:r=30" \
  -filter_complex "[0:v]$KEY;[1:v][k]overlay=shortest=1:format=auto,scale=1484:-2:flags=lanczos:out_color_matrix=bt709:out_range=tv,fps=30,format=yuv420p[o]" \
  -map "[o]" -c:v libx264 -profile:v high -level 4.2 -preset veryslow -crf 10 -pix_fmt yuv420p \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv -an -movflags +faststart leo-offer-create.mp4

ffmpeg -y -ss 3 -i leo-offer-create.mp4 -update 1 -frames:v 1 -q:v 2 leo-offer-create-poster.jpg
```

Resultado: 1484×1138. WebM 1.9MB, MP4 3.2MB.

## Safari / iOS (HEVC + alpha)

Safari no compone el alpha de un WebM VP9: con el WebM solo se ve un
rectángulo negro en las esquinas. Para Safari hace falta un
`leo-offer-create-alpha.mp4` (HEVC con alpha, `hvc1`), que se genera con
el workflow de GitHub Actions "Encode HEVC+alpha MP4 (Safari)" (ver
`.claude/skills/codificar-video-alpha-safari/SKILL.md`).

Archivos que dejan listo el workflow:
- `leo-offer-create-premul.webm`: el mismo video con el RGB
  PREMULTIPLICADO por el alpha (Safari compone premultiplicado). Hecho
  local, ~1.3 MB. Verificado: un píxel transparente pasa de (14,249,39)
  —el verde del chroma— a (1,1,1); sin esto Safari mostraría verde.
- `leo-offer-create-poster.png` (antes `.jpg`): el workflow trata como
  OPACO cualquier video con `-poster.jpg` al lado y lo salta; la
  convención es que un video transparente lleve poster `.png`.

Orden de `<source>` en el HTML una vez generado el `-alpha.mp4`:
1. `-alpha.mp4` con `type='video/mp4; codecs="hvc1"'` (Safari; Chrome y
   Firefox lo saltean),
2. `.webm` con alpha (Chrome/Firefox),
3. `leo-offer-create.mp4` opaco sobre #CC6633 (último recurso).
