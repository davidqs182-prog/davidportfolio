// ===== Animación de scroll (hero) =====
// Comportamiento: el scroll actúa como "disparador" de dirección, no como
// control de posición exacta. Al detectar scroll hacia abajo, la animación
// se reproduce hacia adelante como un video (30fps) hasta llegar al último
// frame; scroll hacia arriba la reproduce en reversa hasta el frame 0.
(function () {
  var stageImg = document.getElementById("stageImg");

  // Si esta página no tiene el stage de animación, no hacemos nada.
  if (!stageImg) return;

  var FRAME_COUNT = 121;
  var FRAME_DIR = "assets/animations/hero-guitar-scroll/frames/";
  var FPS_MS = 1000 / 30;

  function framePath(index) {
    return FRAME_DIR + "frame_" + String(index).padStart(5, "0") + ".png";
  }

  // Precargamos todos los frames para que la reproducción sea fluida
  // (si los cargáramos uno por uno durante el scroll, se verían saltos).
  var preloadedImages = [];
  for (var i = 0; i < FRAME_COUNT; i++) {
    var img = new Image();
    img.src = framePath(i);
    preloadedImages.push(img);
  }

  var currentFrame = 0;
  var direction = 0;
  var isPlaying = false;
  var lastScrollY = window.scrollY;

  function setFrame(nextFrame) {
    nextFrame = Math.min(FRAME_COUNT - 1, Math.max(0, nextFrame));
    currentFrame = nextFrame;
    stageImg.src = framePath(currentFrame);
  }

  function tick() {
    if (!isPlaying) return;

    var nextFrame = currentFrame + direction;
    if (nextFrame < 0 || nextFrame > FRAME_COUNT - 1) {
      isPlaying = false;
      return;
    }

    setFrame(nextFrame);
    setTimeout(tick, FPS_MS);
  }

  function startPlaying(newDirection) {
    direction = newDirection;
    if (!isPlaying) {
      isPlaying = true;
      tick();
    }
  }

  function onScroll() {
    var y = window.scrollY;
    var delta = y - lastScrollY;
    lastScrollY = y;

    if (Math.abs(delta) < 1) return;
    startPlaying(delta > 0 ? 1 : -1);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
})();

// ===== Lazy-load de videos de proyecto =====
// Los <video> de las tarjetas de "Work" tienen adentro <source data-src>
// en vez de "src" (ni en el video ni en los source), así que el navegador
// no descarga nada al cargar la página. El navegador elige la primera
// <source> que pueda reproducir (WebM primero, MP4 como respaldo).
// Recién cuando la tarjeta está por entrar en pantalla, copiamos
// data-src -> src en cada <source> y arrancamos la reproducción.
(function () {
  var lazyVideos = document.querySelectorAll("video");
  var videosToLoad = [];
  lazyVideos.forEach(function (video) {
    if (video.querySelector("source[data-src]")) {
      videosToLoad.push(video);
    }
  });
  if (!videosToLoad.length) return;

  function loadVideo(video) {
    video.querySelectorAll("source[data-src]").forEach(function (source) {
      source.src = source.dataset.src;
      source.removeAttribute("data-src");
    });
    video.load();
    video.play().catch(function () {
      // Si el navegador bloquea el autoplay, no pasa nada: el
      // poster se queda visible como imagen estática.
    });
  }

  if (!("IntersectionObserver" in window)) {
    // Navegadores muy viejos: cargamos todo de una, sin lazy-load.
    videosToLoad.forEach(loadVideo);
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        loadVideo(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "200px" }
  );

  videosToLoad.forEach(function (video) {
    observer.observe(video);
  });
})();
