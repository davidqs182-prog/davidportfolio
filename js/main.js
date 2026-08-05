// ===== Animación de scroll (hero) =====
// Comportamiento: el scroll actúa como "disparador" de dirección, no como
// control de posición exacta. Al detectar scroll hacia abajo, la animación
// se reproduce hacia adelante como un video (30fps) hasta llegar al último
// frame; scroll hacia arriba la reproduce en reversa hasta el frame 0.
(function () {
  var stageImg = document.getElementById("stageImg");
  var hint = document.getElementById("hint");

  // Si esta página no tiene el stage de animación, no hacemos nada.
  if (!stageImg || !hint) return;

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
  var hasScrolled = false;
  var direction = 0;
  var isPlaying = false;
  var lastScrollY = window.scrollY;

  function setFrame(nextFrame) {
    nextFrame = Math.min(FRAME_COUNT - 1, Math.max(0, nextFrame));
    currentFrame = nextFrame;
    stageImg.src = framePath(currentFrame);

    if (!hasScrolled) {
      hasScrolled = true;
      hint.style.opacity = 0;
    }
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
