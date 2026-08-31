// ===== Animación de scroll (hero) =====
// Comportamiento: el scroll actúa como "disparador" de dirección, no como
// control de posición exacta. Al detectar scroll hacia abajo, la animación
// se reproduce hacia adelante como un video (30fps) hasta llegar al último
// frame; scroll hacia arriba la reproduce en reversa hasta el frame 0.
//
// Solo reacciona mientras el personaje está visible en pantalla (usamos un
// IntersectionObserver para saberlo). Al cargar la página el hero ya está
// a la vista, así que el primer scroll hacia abajo la activa igual que
// antes — lo que cambia es que si scrolleás mucho más abajo (por ejemplo
// hasta "Work") y de ahí subís, la animación ya no salta de frame sin que
// la estés viendo.
(function () {
  var stageImg = document.getElementById("stageImg");

  // Si esta página no tiene el stage de animación, no hacemos nada.
  if (!stageImg) return;

  var heroStage = document.querySelector(".hero__stage") || stageImg;

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
  // Al cargar la página el hero está a la vista, así que arrancamos
  // asumiendo visible=true en vez de esperar al primer callback del
  // observer (que llega un instante después del load).
  var isStageVisible = true;

  if ("IntersectionObserver" in window) {
    var visibilityObserver = new IntersectionObserver(function (entries) {
      isStageVisible = entries[0].isIntersecting;
    });
    visibilityObserver.observe(heroStage);
  }

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

  // ===== Texto de presentación (máquina de escribir) =====
  // Arranca una sola vez, junto con el primer scroll que pone a andar
  // la animación del avatar. El texto real y completo (ya "corregido",
  // sin el chiste del tachado) vive en el aria-label del <p> (ver
  // index.html); acá solo llenamos los <span> visuales letra por
  // letra — son aria-hidden, no los lee un lector de pantalla.
  // Se tipea en 5 tramos: "David Quirós" va en medium (.hero__intro-name,
  // el resto en regular) y "Costa Rica" va tachado (.hero__intro-strike).
  var introSegEls = document.querySelectorAll(".hero__intro-seg");
  var introCursorEl = document.querySelector(".hero__intro-cursor");
  var INTRO_SEGMENTS = [
    "Hi! I am ",
    "David Quirós",
    ", a product designer based in ",
    "Costa Rica",
    " Germany.",
  ];
  var INTRO_TYPE_SPEED_MS = 35;
  var introTriggered = false;

  function typeIntroText() {
    if (!introSegEls.length) return;
    if (introCursorEl) introCursorEl.classList.add("is-active");
    var segIndex = 0;
    var charIndex = 0;

    function typeChar() {
      if (segIndex >= INTRO_SEGMENTS.length) {
        // El cursor se queda parpadeando (ver @keyframes hero-intro-blink,
        // ya es infinite) en vez de desaparecer al terminar de tipear.
        return;
      }

      var segText = INTRO_SEGMENTS[segIndex];
      introSegEls[segIndex].textContent = segText.slice(0, charIndex);

      if (charIndex >= segText.length) {
        segIndex++;
        charIndex = 0;
      } else {
        charIndex++;
      }

      setTimeout(typeChar, INTRO_TYPE_SPEED_MS);
    }
    typeChar();
  }

  function startPlaying(newDirection) {
    if (!introTriggered) {
      introTriggered = true;
      typeIntroText();
    }

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
    if (!isStageVisible) return;
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
    // Los videos del carrusel de testimonios NO pasan por acá — tienen
    // su propio disparador (40% de la sección visible para el primero,
    // volverse la slide activa del swipe para el resto). Ver "Carrusel
    // de testimonios (video)" más abajo.
    if (video.closest(".project-testimonial__track")) return;
    if (video.querySelector("source[data-src]")) {
      videosToLoad.push(video);
    }
  });
  if (!videosToLoad.length) return;

  function tryPlay(video) {
    video.play().catch(function () {
      // Si el navegador bloquea el autoplay, no pasa nada: el
      // poster se queda visible como imagen estática.
    });
  }

  function loadVideo(video) {
    video.querySelectorAll("source[data-src]").forEach(function (source) {
      source.src = source.dataset.src;
      source.removeAttribute("data-src");
    });
    video.load();
    // Los videos con "data-play-at" arrancan la descarga acá (para que
    // estén listos a tiempo) pero el play() lo dispara el bloque de
    // abajo, en el punto exacto que pide ese atributo — no apenas cargan.
    if (!video.dataset.playAt) {
      tryPlay(video);
    }
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

// ===== Reproducción en un punto exacto de la pantalla =====
// Algunos videos tienen "data-play-at" (un número entre 0 y 1): la
// fracción de la altura del video donde hay una línea o quiebre visual
// que nos interesa como disparador. En vez de reproducir apenas el video
// entra en pantalla, esperamos a que esa línea puntual llegue al borde
// inferior del viewport. Como se calcula con getBoundingClientRect() en
// cada scroll, funciona igual sin importar el tamaño de la pantalla —
// no son píxeles fijos, es la posición real del elemento en ese momento.
(function () {
  var timedVideos = document.querySelectorAll("video[data-play-at]");
  if (!timedVideos.length) return;

  var pending = Array.prototype.map.call(timedVideos, function (video) {
    return { video: video, fraction: parseFloat(video.dataset.playAt), triggered: false };
  });

  function checkTriggers() {
    var viewportBottom = window.innerHeight;

    pending.forEach(function (entry) {
      if (entry.triggered) return;

      var rect = entry.video.getBoundingClientRect();
      var lineY = rect.top + entry.fraction * rect.height;

      if (lineY <= viewportBottom) {
        entry.triggered = true;
        entry.video.play().catch(function () {
          // Autoplay bloqueado: el poster se queda como imagen estática
          // hasta que el usuario interactúe con la página.
        });
      }
    });

    pending = pending.filter(function (entry) {
      return !entry.triggered;
    });

    if (!pending.length) {
      window.removeEventListener("scroll", checkTriggers);
      window.removeEventListener("resize", checkTriggers);
    }
  }

  window.addEventListener("scroll", checkTriggers, { passive: true });
  window.addEventListener("resize", checkTriggers);
  checkTriggers(); // por si ya arranca visible (pantallas muy altas)
})();

// ===== Dots de carrusel (reusado por Testimonials y Behind the scenes) =====
// El scroll horizontal con snap ya funciona solo (CSS puro) — esta
// función solo sincroniza los dots de abajo con el item visible: clic
// en un dot desliza hasta ese item, y el dot activo cambia solo según
// cuál item está más visible DENTRO DEL TRACK (IntersectionObserver
// con el track como root, no con el viewport — si no, con items
// full-bleed casi siempre "visibles" a la vez según scroll vertical).
// Misma función para las dos secciones que la usan (mismo
// comportamiento, a pedido de David) — evita repetir esta lógica dos
// veces casi idéntica.
//
// itemsPerDot: cuántos items representa cada dot (default 1, un dot
// por item — así funciona el carrusel de Testimonials, 1 slide = 1
// dot). "Behind the scenes" pidió solo 2 dots para 4 tarjetas, así
// que ahí cada dot agrupa 2 items — clic en el dot N desliza al
// primer item de ese grupo, y el dot activo se calcula agrupando el
// item más visible (Math.floor(index / itemsPerDot)).
function initCarouselDots(trackSelector, itemSelector, dotSelector, itemsPerDot) {
  itemsPerDot = itemsPerDot || 1;

  var track = document.querySelector(trackSelector);
  if (!track) return;

  var items = Array.prototype.slice.call(track.querySelectorAll(itemSelector));
  var dots = Array.prototype.slice.call(document.querySelectorAll(dotSelector));
  if (!items.length || !dots.length) return;

  function setActive(index) {
    dots.forEach(function (dot, i) {
      var isActive = i === index;
      dot.classList.toggle("is-active", isActive);
      dot.setAttribute("aria-selected", isActive ? "true" : "false");
    });
  }

  dots.forEach(function (dot, dotIndex) {
    dot.addEventListener("click", function () {
      var item = items[dotIndex * itemsPerDot];
      if (!item) return;
      item.scrollIntoView({
        behavior: "smooth",
        inline: "start",
        block: "nearest",
      });
    });
  });

  if (!("IntersectionObserver" in window)) return;

  // visible[i] guarda si ese item está actualmente >=60% visible.
  // Con carruseles donde se ve más de un item a la vez (ej. "Behind
  // the scenes", con 2-3 tarjetas simultáneas en pantallas anchas),
  // puede haber más de un item pasando el threshold al mismo tiempo —
  // se elige el de MENOR índice (el más a la izquierda) como activo,
  // en vez de "el último que avisó el observer" (que dependía del
  // orden de entrega de IntersectionObserver, no del orden real de
  // las tarjetas, y daba un dot activo inconsistente).
  var visible = items.map(function () {
    return false;
  });

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        var index = items.indexOf(entry.target);
        if (index === -1) return;
        visible[index] = entry.isIntersecting;
      });
      var activeIndex = visible.indexOf(true);
      if (activeIndex !== -1) setActive(Math.floor(activeIndex / itemsPerDot));
    },
    { root: track, threshold: 0.6 }
  );

  items.forEach(function (item) {
    observer.observe(item);
  });
}

initCarouselDots(
  ".project-testimonial__track",
  ".project-testimonial__slide",
  ".project-testimonial__dot"
);
initCarouselDots(
  ".project-process__track",
  ".project-process__item",
  ".project-process__dot",
  2
);

// ===== Carrusel de testimonios (video) =====
// A pedido de David: el video de la primera slide arranca cuando el
// 40% de TODA la sección (no del video en sí) está visible en
// pantalla — así coincide con el momento en que el usuario realmente
// "llega" a esta parte de la página, no con un punto arbitrario cerca
// del borde. El resto de las slides no cargan ni reproducen su video
// hasta que el usuario hace swipe y esa slide se vuelve la visible
// dentro del carrusel (root: el track, no el viewport) — así no se
// descarga/reproduce de más un video que todavía no se ve. Estos
// videos NO pasan por el lazy-load genérico de más arriba (ver el
// "return" agregado ahí) — este bloque es dueño completo de su carga
// y reproducción.
(function () {
  var section = document.querySelector(".project-testimonial");
  var track = document.querySelector(".project-testimonial__track");
  if (!section || !track) return;

  var slides = Array.prototype.slice.call(
    track.querySelectorAll(".project-testimonial__slide")
  );
  if (!slides.length) return;

  function loadAndPlay(video) {
    if (!video) return;
    // .load() solo la primera vez (cuando había data-src pendiente) —
    // si el usuario hace swipe de ida y vuelta, las llamadas
    // siguientes deben resumir la reproducción donde estaba, no
    // reiniciar el video de cero cada vez que la slide vuelve a
    // quedar visible.
    var pendingSources = video.querySelectorAll("source[data-src]");
    if (pendingSources.length) {
      pendingSources.forEach(function (source) {
        source.src = source.dataset.src;
        source.removeAttribute("data-src");
      });
      video.load();
    }
    video.play().catch(function () {
      // Autoplay bloqueado: el video se queda pausado en su primer
      // frame hasta que el usuario interactúe con la página.
    });
  }

  if (!("IntersectionObserver" in window)) {
    slides.forEach(function (slide) {
      loadAndPlay(slide.querySelector("video"));
    });
    return;
  }

  var sectionObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        loadAndPlay(slides[0].querySelector("video"));
        sectionObserver.disconnect();
      });
    },
    { threshold: 0.4 }
  );
  sectionObserver.observe(section);

  var slideObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        loadAndPlay(entry.target.querySelector("video"));
      });
    },
    { root: track, threshold: 0.6 }
  );
  slides.slice(1).forEach(function (slide) {
    slideObserver.observe(slide);
  });
})();
