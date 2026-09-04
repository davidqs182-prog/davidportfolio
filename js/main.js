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
    // El video de preview de "YouTube Compass" tampoco pasa por acá —
    // su carga y su play() están encadenados a la salida del título
    // (ver "Cover animada de YouTube Compass" más abajo), no a la
    // visibilidad genérica.
    if (video.closest(".project-card__ytd-hero")) return;
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

// ===== Flechas de carrusel (reusado por Testimonials y Behind the
// scenes) =====
// Los botones son sobre todo un indicador visual de "acá se puede
// hacer swipe" — el scroll nativo con snap ya funciona sin esto. Pero
// como son <button> reales (necesario para accesibilidad, con su
// aria-label), también navegan de verdad: cada clic avanza/retrocede
// UN item, a diferencia de los dots de "Behind the scenes" que
// agrupan de a 2 (itemsPerDot). Mismo mecanismo de "item más visible"
// que initCarouselDots, pero sin agrupar.
function initCarouselArrows(trackSelector, itemSelector, prevSelector, nextSelector) {
  var track = document.querySelector(trackSelector);
  if (!track) return;

  var items = Array.prototype.slice.call(track.querySelectorAll(itemSelector));
  var prevBtn = document.querySelector(prevSelector);
  var nextBtn = document.querySelector(nextSelector);
  if (!items.length || (!prevBtn && !nextBtn)) return;

  var currentIndex = 0;

  function goTo(index) {
    var item = items[index];
    if (!item) return;
    item.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", function () {
      goTo(Math.max(currentIndex - 1, 0));
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", function () {
      goTo(Math.min(currentIndex + 1, items.length - 1));
    });
  }

  if (!("IntersectionObserver" in window)) return;

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
      if (activeIndex !== -1) currentIndex = activeIndex;
    },
    { root: track, threshold: 0.6 }
  );

  items.forEach(function (item) {
    observer.observe(item);
  });
}

initCarouselArrows(
  ".project-testimonial__track",
  ".project-testimonial__slide",
  ".project-testimonial__arrow--prev",
  ".project-testimonial__arrow--next"
);
initCarouselArrows(
  ".project-process__track",
  ".project-process__item",
  ".project-process__arrow--prev",
  ".project-process__arrow--next"
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

// ===== Cover animada de "YouTube Compass" (tarjeta de Work en la home) =====
// Mismo truco 3D "flyIn" que project-youtube-discovery.html (ver ese CSS
// para la explicación completa de la técnica perspective/translateZ), pero
// acá NO dispara al cargar la página — David pidió que dispare recién
// cuando la tarjeta está 70% visible en pantalla, para que se vea "entrar"
// justo cuando el usuario llega a ella haciendo scroll. Es una animación
// de entrada de una sola vez: se agrega .is-inview (la clase que activa
// la animación por CSS) y se deja de observar.
//
// Ciclo continuo, cada 4s, alternando título → video 1 → título →
// video 2 → título → video 1 → ... (David pidió específicamente que
// el título+compás aparezcan siempre entre medio de los dos videos,
// nunca un video seguido de otro):
// - título+compás entran, se quedan 4s, salen hacia arriba (.is-leaving
//   en .project-card__ytd-hero-flip — flyOut, ver styles.css) Y EN EL
//   MISMO INSTANTE entra el video que le toca (.is-inview en su propio
//   .project-card__ytd-hero-video-flip) — se cruzan, no hay espera en
//   blanco entre los dos.
// - 4s después, se repite en reversa: ese video sale (mismo flyOut) y
//   el título vuelve a entrar, otra vez en el mismo instante — y la
//   próxima vez que el título salga, le toca entrar al OTRO video.
// - así indefinidamente mientras la tarjeta siga en pantalla.
//
// Reiniciar una animación de "entrada" ya jugada no alcanza con sacar y
// volver a poner la misma clase en el mismo tick — el navegador no
// detecta el cambio y no la vuelve a reproducir. Por eso enter() fuerza
// un reflow (leer offsetWidth) entre sacar las clases viejas y poner
// is-inview de nuevo.
//
// prefers-reduced-motion: no se arranca el ciclo — el título se queda
// asentado (ver la regla ya existente en styles.css) y los videos ni
// se cargan, para no generar un loop de movimiento continuo a alguien
// que pidió lo contrario.
(function () {
  var cover = document.querySelector(".project-card__ytd-hero");
  if (!cover) return;

  var flip = cover.querySelector(".project-card__ytd-hero-flip");
  if (!flip) return;

  // Los dos videos comparten exactamente las mismas clases (mismo
  // markup, mismo estilo) — se distinguen acá solo por el orden en que
  // aparecen en el HTML, no por una clase o id distinta.
  var videoFlips = Array.prototype.slice.call(
    cover.querySelectorAll(".project-card__ytd-hero-video-flip")
  );

  var SWAP_INTERVAL_MS = 4000;
  var prefersReducedMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function loadVideo(videoFlip) {
    var video = videoFlip.querySelector(".project-card__ytd-hero-video");
    if (!video) return;
    var pendingSources = video.querySelectorAll("source[data-src]");
    if (!pendingSources.length) return;
    pendingSources.forEach(function (source) {
      source.src = source.dataset.src;
      source.removeAttribute("data-src");
    });
    video.load();
  }

  function enter(el) {
    if (!el) return;
    el.classList.remove("is-leaving");
    el.classList.remove("is-inview");
    void el.offsetWidth; // forzar reflow para poder re-disparar la animación
    el.classList.add("is-inview");
  }

  function leave(el) {
    if (el) el.classList.add("is-leaving");
  }

  var showingTitle = true;
  var activeVideoFlip = null;
  var nextVideoIndex = 0;

  function swap() {
    if (showingTitle) {
      var videoFlip = videoFlips[nextVideoIndex];
      leave(flip);
      enter(videoFlip);
      var video = videoFlip.querySelector(".project-card__ytd-hero-video");
      if (video) {
        video.play().catch(function () {
          // Autoplay bloqueado: el poster se queda como imagen estática.
        });
      }
      activeVideoFlip = videoFlip;
      nextVideoIndex = (nextVideoIndex + 1) % videoFlips.length;
    } else {
      leave(activeVideoFlip);
      enter(flip);
      activeVideoFlip = null;
    }
    showingTitle = !showingTitle;
  }

  function start() {
    flip.classList.add("is-inview");
    if (prefersReducedMotion) return;
    videoFlips.forEach(loadVideo);
    setInterval(swap, SWAP_INTERVAL_MS);
  }

  if (!("IntersectionObserver" in window)) {
    start();
    return;
  }

  var coverObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        start();
        coverObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.7 }
  );
  coverObserver.observe(cover);
})();

// ===== Animación de "El problema" (project-youtube-discovery.html) =====
// El video (anotaciones a mano dibujándose sobre el screenshot del feed
// de YouTube) arranca solo cuando la sección entra en pantalla, no al
// cargar la página — misma idea que el resto de los videos con lazy-load
// del sitio, pero acá el trigger es visibilidad de la SECCIÓN entera
// (40%), no de la tarjeta específica. Sin loop: es una revelación de una
// sola vez, se queda asentada en el frame final (mismo criterio que un
// video "explicativo" en vez de uno "de fondo" en loop).
(function () {
  var section = document.querySelector(".ytd-problem");
  var video = document.querySelector(".ytd-problem__video");
  if (!section || !video) return;

  function loadAndPlay() {
    var pendingSources = video.querySelectorAll("source[data-src]");
    pendingSources.forEach(function (source) {
      source.src = source.dataset.src;
      source.removeAttribute("data-src");
    });
    video.load();
    video.play().catch(function () {
      // Autoplay bloqueado: el poster (primer frame, sin anotaciones)
      // se queda como imagen estática.
    });
  }

  if (!("IntersectionObserver" in window)) {
    loadAndPlay();
    return;
  }

  var problemObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        loadAndPlay();
        problemObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.4 }
  );
  problemObserver.observe(section);
})();

// ===== Videos de "Insight clave" (project-youtube-discovery.html) =====
// Mismo criterio que el de "El problema" arriba (arranca solo al 40%
// visible de la SECCIÓN, no de la tarjeta), pero estos SÍ tienen loop —
// son los videos de fondo/ambiente que se turnan por opacidad según la
// barrita activa (ver .ytd-insight__card-media--1/--2 en
// project-youtube-discovery.css). Los DOS arrancan a reproducirse
// juntos, aunque solo uno se vea a la vez — es opacidad, no display,
// la que los intercala, así que ambos necesitan estar corriendo de
// fondo para que el que "entra" ya esté en marcha, no arrancando desde
// cero. querySelectorAll en vez de querySelector porque ahora hay más
// de un <video> con esta clase base.
(function () {
  var section = document.querySelector(".ytd-insight");
  var videos = Array.prototype.slice.call(
    document.querySelectorAll(".ytd-insight__card-media")
  );
  if (!section || !videos.length) return;

  function loadAndPlay(video) {
    var pendingSources = video.querySelectorAll("source[data-src]");
    pendingSources.forEach(function (source) {
      source.src = source.dataset.src;
      source.removeAttribute("data-src");
    });
    video.load();
    video.play().catch(function () {
      // Autoplay bloqueado: el poster se queda como imagen estática.
    });
  }

  function loadAndPlayAll() {
    videos.forEach(loadAndPlay);
  }

  if (!("IntersectionObserver" in window)) {
    loadAndPlayAll();
    return;
  }

  var insightObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        loadAndPlayAll();
        insightObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.4 }
  );
  insightObserver.observe(section);
})();

// ===== Video de "The solution" (project-youtube-discovery.html) =====
// Mismo criterio que el video de "El problema" (arranca solo al 40%
// visible de la SECCIÓN, en loop) — mockup de TV con la grabación de
// pantalla de David.
(function () {
  var section = document.querySelector(".ytd-solution");
  var video = document.querySelector(".ytd-solution__video");
  if (!section || !video) return;

  function loadAndPlay() {
    var pendingSources = video.querySelectorAll("source[data-src]");
    pendingSources.forEach(function (source) {
      source.src = source.dataset.src;
      source.removeAttribute("data-src");
    });
    video.load();
    video.play().catch(function () {
      // Autoplay bloqueado: el poster se queda como imagen estática.
    });
  }

  if (!("IntersectionObserver" in window)) {
    loadAndPlay();
    return;
  }

  var solutionObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        loadAndPlay();
        solutionObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.4 }
  );
  solutionObserver.observe(section);
})();
