param([int]$Port = 8080, [string]$Root = (Get-Location).Path)

# Si el harness asigna un puerto distinto (porque 8080 ya está en uso
# por otra sesión), lo pasa por la variable de entorno PORT — la
# preferimos sobre el default/param cuando esté presente.
if ($env:PORT) { $Port = [int]$env:PORT }

Add-Type -AssemblyName System.Net.HttpListener -ErrorAction SilentlyContinue
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Output "Serving $Root at http://localhost:$Port/"

$mime = @{
  ".html" = "text/html"; ".css" = "text/css"; ".js" = "application/javascript"
  ".png" = "image/png"; ".jpg" = "image/jpeg"; ".jpeg" = "image/jpeg"
  ".svg" = "image/svg+xml"; ".gif" = "image/gif"; ".ico" = "image/x-icon"
  ".woff" = "font/woff"; ".woff2" = "font/woff2"; ".json" = "application/json"
  ".mp4" = "video/mp4"; ".webm" = "video/webm"; ".mov" = "video/quicktime"
}

# ===== Por qué esto ya no es un simple `while` secuencial =====
# Versión anterior: un solo hilo, un `while` que atendía UNA request a
# la vez de punta a punta (incluyendo `ReadAllBytes` completo de
# archivos grandes antes de escribir el primer byte de respuesta) y
# encima mandaba `Connection: close` en cada respuesta — forzando un
# handshake TCP nuevo por cada request. Un navegador real abre varias
# conexiones en paralelo por página (CSS, JS, fuentes, íconos, cada
# imagen, cada video); acá TODAS esperaban en fila detrás de la que
# el hilo único estuviera sirviendo en ese momento — si le tocaba
# justo a un webm de ~20MB, la página entera se sentía trabada hasta
# que ese archivo terminara. David lo notó en vivo ("mi versión local
# dura en cargar... en general la página").
#
# Fix: cada conexión aceptada se despacha a un runspace del pool (hasta
# 8 en simultáneo) y el `while` principal vuelve enseguida a aceptar la
# siguiente — así un archivo grande ya no bloquea al resto. Sumado a
# habilitar keep-alive (antes forzado a `false`), el navegador puede
# reusar la misma conexión para varios requests seguidos en vez de
# pagar un handshake nuevo por cada uno.
$runspacePool = [runspacefactory]::CreateRunspacePool(1, 8)
$runspacePool.Open()

$handleRequest = {
  param($context, $Root, $mime)
  $request = $context.Request
  $response = $context.Response
  try {
    $path = $request.Url.LocalPath
    if ($path -eq "/") { $path = "/index.html" }
    $filePath = Join-Path $Root ($path.TrimStart("/"))
    # URLs limpias sin .html: si el path pedido no es un archivo pero
    # existe una carpeta del mismo nombre con un index.html adentro
    # (ej. /project-onboarding -> project-onboarding/index.html), la
    # servimos igual que GitHub Pages serviría esa misma estructura de
    # carpetas — así el comportamiento local coincide con el real.
    if (-not (Test-Path $filePath -PathType Leaf)) {
      $indexInFolder = Join-Path $filePath "index.html"
      if (Test-Path $indexInFolder -PathType Leaf) {
        $filePath = $indexInFolder
      }
    }
    if (Test-Path $filePath -PathType Leaf) {
      $ext = [System.IO.Path]::GetExtension($filePath)
      $contentType = $mime[$ext]
      if (-not $contentType) { $contentType = "application/octet-stream" }
      $response.ContentType = $contentType
      $response.Headers.Add("Accept-Ranges", "bytes")
      # Keep-alive probado y revertido: combinado con despachar cada
      # conexión a un runspace del pool (ver más abajo), dos requests
      # que llegan por la MISMA conexión persistente pueden terminar
      # respondidas fuera de orden por runspaces distintos — HTTP/1.1
      # exige que se respondan en el mismo orden en que llegaron por
      # esa conexión, así que el navegador veía la conexión como rota
      # (ERR_CONNECTION_RESET, confirmado en vivo). La concurrencia
      # entre conexiones DISTINTAS (el fix real contra el bloqueo en
      # cascada) no depende de esto — se mantiene con `close` acá.
      $response.KeepAlive = $false
      $response.Headers.Add("Connection", "close")

      $fileInfo = Get-Item $filePath
      $fileLength = $fileInfo.Length
      $lastModified = $fileInfo.LastWriteTimeUtc.ToString("R")
      $response.Headers.Add("Last-Modified", $lastModified)
      # Cache liviano: revalida siempre (por eso `no-cache`, no
      # `max-age`) para nunca servir una versión vieja mientras se
      # sigue editando en vivo, pero permite que el navegador mande
      # If-Modified-Since y se ahorre volver a bajar un archivo que no
      # cambió — sobre todo importa para los videos grandes y las
      # fuentes/íconos que se piden en cada página.
      $response.Headers.Add("Cache-Control", "no-cache")

      $ifModifiedSince = $request.Headers["If-Modified-Since"]
      $notModified = $false
      if ($ifModifiedSince) {
        # DateTimeOffset (no DateTime) parsea bien el formato RFC1123
        # ("Sat, 05 Sep 2026 14:09:51 GMT") que mandan los navegadores;
        # DateTime::TryParse a secas lo probó y fallaba silenciosamente
        # con ese formato. Se trunca a segundos antes de comparar
        # porque el header HTTP no lleva milisegundos y LastWriteTimeUtc
        # sí — sin truncar, la comparación casi nunca daba igual.
        $parsedDate = [DateTimeOffset]::MinValue
        if ([DateTimeOffset]::TryParse($ifModifiedSince, [ref]$parsedDate)) {
          $truncatedTicks = $fileInfo.LastWriteTimeUtc.Ticks - ($fileInfo.LastWriteTimeUtc.Ticks % [TimeSpan]::TicksPerSecond)
          $fileModified = [DateTimeOffset]::new($truncatedTicks, [TimeSpan]::Zero)
          if ($fileModified -le $parsedDate) {
            $notModified = $true
          }
        }
      }

      $rangeHeader = $request.Headers["Range"]

      if ($request.HttpMethod -eq "HEAD") {
        $response.ContentLength64 = $fileLength
      } elseif ($notModified -and -not $rangeHeader) {
        $response.StatusCode = 304
      } elseif ($rangeHeader -and $rangeHeader -match "bytes=(\d*)-(\d*)") {
        $start = if ($matches[1]) { [int64]$matches[1] } else { 0 }
        $end = if ($matches[2]) { [int64]$matches[2] } else { $fileLength - 1 }
        if ($end -ge $fileLength) { $end = $fileLength - 1 }
        $length = $end - $start + 1

        $response.StatusCode = 206
        $response.Headers.Add("Content-Range", "bytes $start-$end/$fileLength")
        $response.ContentLength64 = $length

        $stream = [System.IO.File]::OpenRead($filePath)
        $stream.Seek($start, [System.IO.SeekOrigin]::Begin) | Out-Null
        $buffer = New-Object byte[] 65536
        $remaining = $length
        while ($remaining -gt 0) {
          $toRead = [Math]::Min($buffer.Length, $remaining)
          $read = $stream.Read($buffer, 0, $toRead)
          if ($read -le 0) { break }
          $response.OutputStream.Write($buffer, 0, $read)
          $remaining -= $read
        }
        $stream.Close()
      } else {
        # Streameado en vez de ReadAllBytes: manda el archivo en
        # chunks a medida que lo lee, no todo junto recién al final —
        # para un video grande, esto es la diferencia entre "el
        # navegador ve los primeros bytes casi al instante" y "espera
        # a que el archivo entero esté en memoria antes de recibir
        # nada".
        $response.ContentLength64 = $fileLength
        $stream = [System.IO.File]::OpenRead($filePath)
        $buffer = New-Object byte[] 65536
        while ($true) {
          $read = $stream.Read($buffer, 0, $buffer.Length)
          if ($read -le 0) { break }
          $response.OutputStream.Write($buffer, 0, $read)
        }
        $stream.Close()
      }
    } else {
      $response.StatusCode = 404
      $notFound = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $path")
      $response.OutputStream.Write($notFound, 0, $notFound.Length)
    }
  } catch {
    $response.StatusCode = 500
  } finally {
    $response.OutputStream.Close()
  }
}

# Instancias de [powershell] en vuelo, para poder liberarlas (.Dispose())
# una vez que terminan — si no, cada request dejaría su instancia viva
# en memoria para siempre en una sesión de dev larga.
$pending = New-Object System.Collections.Generic.List[System.Management.Automation.PowerShell]

while ($listener.IsListening) {
  $context = $listener.GetContext()
  $ps = [powershell]::Create()
  $ps.RunspacePool = $runspacePool
  [void]$ps.AddScript($handleRequest).AddArgument($context).AddArgument($Root).AddArgument($mime)
  # BeginInvoke (no Invoke): dispara y no espera — el while vuelve de
  # inmediato a GetContext() para aceptar la próxima conexión mientras
  # esta se sigue sirviendo en su propio runspace.
  $handle = $ps.BeginInvoke()
  $pending.Add($ps)

  # Barrido liviano de las que ya terminaron, antes de volver a
  # esperar la próxima conexión — evita que $pending crezca sin límite.
  for ($i = $pending.Count - 1; $i -ge 0; $i--) {
    if ($pending[$i].InvocationStateInfo.State -in @("Completed", "Failed", "Stopped")) {
      $pending[$i].Dispose()
      $pending.RemoveAt($i)
    }
  }
}
