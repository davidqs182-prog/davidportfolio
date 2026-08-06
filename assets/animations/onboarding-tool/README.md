# Onboarding tool — video de la tarjeta "Work"

Video corto en loop (mockup de celular animando entre pantallas de producto)
para la segunda tarjeta de la sección Work.

## Preset de compresión "V0.1"

Comando de ffmpeg usado para comprimir el video fuente que entregó David,
manteniendo la resolución nativa del recording (no es posible generar más
detalle del que tiene el archivo original) y priorizando nitidez sobre peso:

```bash
ffmpeg -i "<fuente>.mp4" \
  -vf "fps=30,unsharp=5:5:1.5:5:5:0.0" \
  -c:v libx264 -profile:v high -preset veryslow -crf 10 -pix_fmt yuv420p \
  -an -movflags +faststart \
  onboarding-demo.mp4
```

- `fps=30`: la fuente venía a 60fps: innecesario para una animación de UI, reduce peso a la mitad sin pérdida visible.
- `unsharp=5:5:1.5:5:5:0.0`: realza el contraste de los bordes (texto, íconos) para compensar el suavizado natural de la compresión. No agrega detalle real, pero mejora la nitidez percibida.
- `-crf 10 -preset veryslow`: calidad casi sin pérdida. Usar `-crf 16` a `20` si el peso del archivo importa más que la nitidez máxima.
- `-pix_fmt yuv420p` (no `yuv444p`): mantiene compatibilidad amplia con Safari/iOS.
- Poster (`onboarding-poster.jpg`): frame 0 del video ya comprimido, extraído con `-q:v 2` (alta calidad JPEG).

## Sobre la nitidez

El archivo fuente que dio David es de **1300×1462px nativos**. Ese es el techo
real de detalle disponible — ninguna compresión (por más liviana o pesada que
sea) puede mostrar más nitidez que la que tiene el recording original. En
pantallas Retina/HiDPI, el navegador tiene que estirar esos píxeles para
mostrar el video a más de ~1300px de ancho, lo cual se percibe como algo de
suavizado incluso con este preset. Si en algún momento hay un recording de
mayor resolución disponible, vale la pena re-exportar con el mismo preset.
