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
