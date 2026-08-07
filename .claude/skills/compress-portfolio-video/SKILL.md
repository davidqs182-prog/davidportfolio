---
name: compress-portfolio-video
description: Comprime y optimiza para la web cualquier video que el usuario entregue para el portafolio de David Quirós (por ejemplo, para una tarjeta de proyecto en la sección "Work"). Usar SIEMPRE que el usuario mencione, adjunte o pida usar un archivo de video para el sitio — un demo de app, una animación de producto, un mockup, una grabación de pantalla — incluso si no dice explícitamente "comprime" u "optimiza". También usar si el usuario reporta que un video ya existente en el sitio se ve borroso, pesado, tarda en cargar, o tiene glitches/artefactos visuales al reproducirse.
---

# Comprimir video para el portafolio

Aplica el preset **"V0.1"**, validado en este proyecto tras varias rondas de
prueba con el usuario (ver historial en
`assets/animations/onboarding-tool/README.md`). No re-derivar esto desde
cero — seguir los pasos de acá.

## Por qué existe cada decisión

- **MP4 (H.264) + WebM (VP9), no GIF.** Un GIF del mismo clip pesa varias
  veces más a menor calidad. WebM/VP9 comprime mejor que H.264 a igual
  calidad, así que va primero como `<source>` preferido; el MP4 queda como
  respaldo para navegadores que no soporten WebM.
- **CRF 10, preset `veryslow`.** El usuario probó desde CRF 28 (se veía
  borroso) hasta acá, priorizando nitidez sobre peso del archivo porque
  esto es un portafolio profesional — verse borroso resta más que un
  archivo pesado. Si en algún momento el peso vuelve a importar más que la
  nitidez máxima, preguntá antes de bajar la calidad — no asumas.
- **Nunca subir la resolución más allá de la fuente.** La nitidez real
  tiene un techo: la resolución del archivo que te dieron. Si un video
  se ve borroso incluso con este preset, la solución es pedir una
  grabación de mayor resolución, no exprimir más la compresión.
- **`unsharp` (realce de bordes) se probó y se descartó** — no mejoró la
  nitidez percibida en la práctica. No lo agregues de nuevo salvo que el
  usuario lo pida explícitamente.
- **`yuv420p`, no `yuv444p`.** yuv444p da algo más de calidad de color pero
  tiene soporte irregular en Safari/iOS — no vale el riesgo de
  compatibilidad en un sitio público.

## El bug que ya nos mordió una vez (leer antes de codificar)

**`-level 4.2` no es opcional.** Sin especificar `-level`, x264 elige uno
automáticamente según resolución/bitrate — con resoluciones altas y
`-crf 10 -preset veryslow` puede elegir **Level 6.0** (pensado para
contenido 8K). La mayoría de los decodificadores de hardware — que es lo
que usan los navegadores para reproducir video — no manejan bien ese
level, y el resultado es un glitch de bloques de corrupción visual que se
reproduce siempre, igual, en cualquier navegador, en el mismo punto del
video.

Lo insidioso: los decodificadores de **software** (como el mismo ffmpeg,
que uno usaría para revisar el archivo) toleran Level 6.0 sin problema, así
que extraer frames y mirarlos no revela el bug — hay que revisar el level
explícitamente.

**Por eso, después de codificar el MP4, siempre correr:**

```bash
ffprobe -v error -select_streams v:0 -show_entries stream=level -of default=noprint_wrappers=0 "<nombre>.mp4"
```

Debe imprimir `42` (Level 4.2). Si imprime otra cosa (sobre todo algo
más alto, como `60`), algo salió mal — no lo ignores ni sigas adelante
igual.

## Ubicar ffmpeg

Puede no estar en el PATH de toda terminal. Primero probar:

```bash
ffmpeg -version
```

Si falla, usar la ruta completa (instalado vía winget en esta máquina):

```
C:\Users\d.quiros\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0-full_build\bin\ffmpeg.exe
```

(`ffprobe.exe` vive en la misma carpeta.)

## Flujo de trabajo

1. **Ubicar y revisar la fuente.** Confirmar resolución/duración con
   `ffprobe -i "<fuente>"`.

2. **Elegir carpeta de destino.** `assets/animations/<nombre-kebab-case-del-proyecto>/`
   — crearla si no existe. Seguir la convención ya usada en
   `assets/animations/hero-guitar-scroll/` y `assets/animations/onboarding-tool/`:
   cada proyecto tiene su propia carpeta con un `README.md` corto
   documentando cómo se codificó ese video en particular.

3. **Codificar el MP4** (fallback de compatibilidad):

   ```bash
   ffmpeg -i "<fuente>" -vf "fps=30" \
     -c:v libx264 -profile:v high -level 4.2 -preset veryslow -crf 10 -pix_fmt yuv420p \
     -an -movflags +faststart \
     "<nombre>.mp4"
   ```

4. **Verificar el level** con el comando de `ffprobe` de la sección
   anterior. No seguir si no da `42`.

5. **Codificar el WebM** (preferido):

   ```bash
   ffmpeg -i "<fuente>" -vf "fps=30" \
     -c:v libvpx-vp9 -crf 24 -b:v 0 -deadline good -cpu-used 2 -pix_fmt yuv420p \
     -an \
     "<nombre>.webm"
   ```

6. **Generar el poster** (frame 0 del MP4 ya comprimido, para el atributo
   `poster` y como placeholder mientras el video no cargó):

   ```bash
   ffmpeg -y -ss 0 -i "<nombre>.mp4" -update 1 -frames:v 1 -q:v 2 "<nombre>-poster.jpg"
   ```

7. **Reportar al usuario:** peso de la fuente vs. MP4 vs. WebM, y
   resolución final. Esto es información que el usuario claramente quiere
   ver (lo pidió en cada iteración anterior).

8. **No tocar el HTML/CSS todavía.** Comprimir es el trabajo de este
   skill; dónde y cómo se inserta el video en la página es una decisión de
   diseño del usuario. Preguntar antes de editar `index.html`.

## Cómo se integra en el HTML (cuando el usuario pida insertarlo)

```html
<video
  class="project-card__video"
  poster="assets/animations/<carpeta>/<nombre>-poster.jpg"
  width="<ancho-real>"
  height="<alto-real>"
  muted
  loop
  playsinline
  preload="none"
>
  <source data-src="assets/animations/<carpeta>/<nombre>.webm" type="video/webm">
  <source data-src="assets/animations/<carpeta>/<nombre>.mp4" type="video/mp4">
</video>
```

Notas importantes:

- **`data-src`, no `src`**, en cada `<source>`. El sitio carga los videos
  de forma diferida (lazy-load) con un `IntersectionObserver` en
  `js/main.js` que recién copia `data-src` → `src` y llama `.load()` +
  `.play()` cuando la tarjeta está por entrar en pantalla. Si se pone
  `src` directo, el video se descarga apenas carga la página, arruinando
  la optimización.
- `width`/`height` deben ser las dimensiones **reales** del video
  codificado (`ffprobe -show_entries stream=width,height`), no las de la
  fuente — evita saltos de layout mientras carga.
- Si es la primera vez que se usa `IntersectionObserver` para lazy-load en
  esta página, revisar que `js/main.js` ya tenga esa lógica genérica (debería,
  ya se implementó para la tarjeta de Fischbach) antes de asumir que "simplemente
  funciona".
