---
name: codificar-video-alpha-safari
description: >-
  Genera la versión .mp4 (HEVC con canal alpha) que Safari / iOS necesitan
  para reproducir un video con transparencia. Usar cuando David reporte que
  un video con fondo transparente del portafolio se ve con caja negra o
  verde en iPhone / iPad / Safari, o cuando se agregue un video nuevo con
  transparencia y haya que dejarlo funcionando también en iOS. El .webm
  VP9+alpha que ya existe NO se toca — esto solo agrega el gemelo .mp4.
---

# Codificar video con transparencia para Safari / iOS

## El problema que resuelve

Los videos con fondo transparente del sitio son `.webm` VP9 con canal
alpha. Eso anda en Chrome, Firefox y Android. **Safari no soporta alpha en
VP9/WebM** — y en iOS *todos* los navegadores (incluído "Chrome for iOS")
usan el motor de Safari, así que el problema es de todo iPhone/iPad. Ahí el
video se ve con el fondo real que el alpha tapaba: **negro** (la mayoría) o
**verde** (los que vienen de un green-screen sin kear del todo).

El único formato con transparencia que Safari reproduce y sirve para web es
**HEVC (H.265) con canal alpha**, en `.mp4`, con el tag de códec `hvc1`.

## Por qué hace falta un runner de macOS (y no se puede local)

El único encoder que produce "HEVC con alpha" que Safari después sabe leer
es **`hevc_videotoolbox`**, que es parte de macOS (framework de Apple). No
existe en Windows ni en Linux:

- `libx265` (el encoder HEVC estándar) **no soporta canal alpha**, punto.
- Los encoders de hardware (NVIDIA / AMD / Intel) tampoco.
- El iPad / iPhone tampoco sirven para codificar esto de forma confiable.
- WebP animado con alpha se probó: `hands-tablet-mockup.webm` (2.5 MB) daba
  un `.webp` de **19 MB**. Inviable para los clips largos.

La salida sin comprar una Mac: **GitHub Actions con un runner `macos-latest`**
(gratis / minutos incluidos). El workflow
`.github/workflows/encode-alpha-hevc.yml` hace exactamente eso.

## Qué hace el workflow

1. Corre en `macos-latest`, instala `ffmpeg` por Homebrew (viene con
   VideoToolbox).
2. Recorre todos los `.webm` bajo `assets/animations/`.
3. Para cada uno que tenga canal alpha (`alpha_mode=1` en los metadatos),
   genera `<nombre>-alpha.mp4` al lado, con este comando:

   ```bash
   ffmpeg -y -c:v libvpx-vp9 -i "<src>.webm" \
     -an \
     -c:v hevc_videotoolbox -alpha_quality 0.95 -q:v 65 \
     -pix_fmt yuva420p -tag:v hvc1 \
     -movflags +faststart \
     "<src>-alpha.mp4"
   ```

4. Verifica cada salida con `ffprobe` — tiene que dar exactamente
   `hevc,hvc1`. Si da `hev1`, Safari NO lo reproduce (falla el build).
5. Commitea solo los `*-alpha.mp4` nuevos a la branch desde la que se
   corrió.

Por default **no regenera** un `-alpha.mp4` que ya existe (para no rehacer
todo cada vez). Para forzar: correr el workflow con el input `force` en
`true`.

### Por qué cada flag

- **`-c:v libvpx-vp9` antes de `-i`**: fuerza el decoder que entrega el
  alpha del `.webm` como `yuva420p`. Sin esto el alpha se puede perder en
  la decodificación.
- **`-alpha_quality 0.95` + `-q:v 65`**: calidad alta a propósito. Es un
  portafolio — mejor que pese de más a que se vea blando (mismo criterio
  que el skill `compress-portfolio-video`, que llegó a CRF 10). Si un
  archivo puntual queda demasiado pesado, bajar el `-q:v` de **ese**
  archivo, no de todos. Si `-q:v` no es aceptado por la versión de
  ffmpeg del runner, la alternativa es `-b:v` (bitrate objetivo, ej.
  `-b:v 6M`).
- **`-tag:v hvc1`**: OBLIGATORIO. Safari solo reproduce HEVC en `.mp4` si
  el tag del stream es `hvc1`. Con `hev1` (el otro tag posible) no hace
  nada — sin error, simplemente no reproduce.
- **`-pix_fmt yuva420p`**: la `a` es el canal alpha.
- **`-movflags +faststart`**: mueve el índice al principio del archivo
  para que empiece a reproducir sin bajar todo primero.
- **`-an`**: los videos del sitio son mudos.

## Qué necesita hacer David (una sola vez de setup, después es un botón)

**Setup, una vez:**

1. En GitHub → repo **Settings → Actions → General** → abajo, en
   **"Workflow permissions"**, marcar **"Read and write permissions"** →
   Save. (Sin esto el workflow no puede commitear los `.mp4` de vuelta.)
2. Pushear la branch que tiene el workflow nuevo
   (`.github/workflows/encode-alpha-hevc.yml`) a GitHub.

**Cada vez que haya que generar / regenerar los mp4:**

3. GitHub → pestaña **Actions** → workflow **"Encode HEVC+alpha MP4
   (Safari)"** → botón **"Run workflow"** → elegir la branch → Run.
   (Tildar `force` solo si querés regenerar los que ya existen.)
4. Esperar ~5–10 min. Al terminar, el workflow hace **un commit solo** con
   los `*-alpha.mp4` a esa branch.
5. En la compu: `git pull`.
6. Avisarle a Claude que los `-alpha.mp4` ya están en el repo.

**Verificación final (David, en su iPhone):** abrir el sitio ya con los
`<source>` nuevos puestos y confirmar que los mockups se ven con
transparencia real, sin negro ni verde.

### Mejor calidad: fuente con alpha original

El workflow se alimenta del `.webm` VP9+alpha que ya existe — funciona,
pero es "comprimir algo ya comprimido". Si David guarda los **renders
originales con alpha** (comp de After Effects, ProRes 4444, o secuencia
PNG), conviene commitear ESE como fuente y apuntar el workflow ahí, para
que el HEVC salga de material sin pérdida previa. (Hoy el workflow busca
`.webm`; si se suman fuentes en otro formato, ajustar el `find`.)

## Cómo lo integra Claude en el HTML (después de `git pull`)

Por cada `<video>` que hoy tiene solo el `<source>` `.webm` con alpha,
agregar el `.mp4` HEVC **antes** del webm:

```html
<video muted loop playsinline preload="none">
  <source src="assets/animations/<carpeta>/<nombre>-alpha.mp4" type='video/mp4; codecs="hvc1"'>
  <source data-src="assets/animations/<carpeta>/<nombre>.webm" type="video/webm">
</video>
```

Notas:

- El `type='video/mp4; codecs="hvc1"'` es lo que hace que Chrome / Firefox
  / Android **salteen** el mp4 sin intentar descargarlo (no reconocen
  `hvc1`) y sigan usando el `.webm` de siempre. Para ellos no cambia nada.
- **Ojo con el lazy-load.** El sitio carga los videos en diferido: los
  `<source>` llevan `data-src` (no `src`) y un `IntersectionObserver` en
  `js/main.js` copia `data-src` → `src` recién cuando la tarjeta entra en
  pantalla. El `<source>` HEVC nuevo tiene que seguir la MISMA convención
  (`data-src`, no `src`) en los videos lazy, o se descarga de entrada y
  rompe la optimización. Revisar en `js/main.js` que el observer procese
  TODOS los `<source>` del `<video>`, no solo el primero.
- **El avatar del hero (`#stageImg`) es distinto**: no es un loop, es
  scroll-scrubbed (`currentTime` según el scroll, ver `js/main.js`). El
  `<source>` HEVC se agrega igual, pero además conviene el "priming play":
  tras `loadedmetadata`, un `play()` + `pause()` mudo — fuerza a Chrome al
  modo de composición con alpha y evita el frame negro intermitente que
  también aparece en Chrome desktop.
- Verificar cada `-alpha.mp4` con:
  ```bash
  ffprobe -v error -select_streams v:0 \
    -show_entries stream=codec_name,codec_tag_string,pix_fmt \
    -of default=noprint_wrappers=1 <archivo>-alpha.mp4
  ```
  Tiene que decir `codec_name=hevc`, `codec_tag_string=hvc1`.

## Estado actual (2026-09-10)

Videos `.webm` con alpha que necesitan su `-alpha.mp4` (aún no generados):

- `assets/animations/hero-guitar-scroll/hero-guitar-scroll-v2.webm` (hero)
- `assets/animations/onboarding-tool/hands-tablet-mockup.webm`
- `assets/animations/onboarding-tool/order.webm`
- `assets/animations/onboarding-tool/macbook-order.webm`
- `assets/animations/youtube-compass-card/comments-tv-mockup.webm`
- `assets/animations/youtube-compass-card/collections-laptop-mockup.webm`

`collections-laptop-mockup` es el que en iOS se ve **verde** (green-screen);
el resto se ven **negros**.
