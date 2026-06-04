// hero-visual.js
// 首頁主視覺：3～4 張店內照輪播 + 點擊開啟大圖

(function () {
  const trigger = document.querySelector(".hero-visual-trigger");
  if (!trigger) return;

  const fallbackImages = [
    "images/main-visual.jpg",
    "images/main-visual-02.jpg",
    "images/main-visual-03.jpg",
    "images/main-visual-04.jpg"
  ];

  const rawImages = trigger.dataset.heroImages || trigger.dataset.heroImage || "";
  const configuredImages = rawImages
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  let images = configuredImages.length ? configuredImages : fallbackImages.slice();
  const imageAlt = trigger.dataset.heroAlt || "第十二夜店內主視覺";

  let currentIndex = 0;
  let timer = null;
  let modal = null;
  let slidesWrap = null;
  let dotsWrap = null;

  function escapeAttr(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function setupSlides() {
    slidesWrap = document.createElement("div");
    slidesWrap.className = "hero-visual-slides";

    dotsWrap = document.createElement("div");
    dotsWrap.className = "hero-visual-dots";
    dotsWrap.setAttribute("aria-label", "主視覺圖片切換");

    images.forEach((src, index) => {
      const slide = document.createElement("div");
      slide.className = `hero-visual-slide ${index === 0 ? "is-active" : ""}`;

      const img = document.createElement("img");
      img.src = src;
      img.alt = `${imageAlt} ${index + 1}`;
      img.loading = index === 0 ? "eager" : "lazy";

      img.addEventListener("error", function () {
        removeBrokenImage(src);
      }, { once: true });

      slide.appendChild(img);
      slidesWrap.appendChild(slide);

      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = `hero-visual-dot ${index === 0 ? "is-active" : ""}`;
      dot.setAttribute("aria-label", `切換到第 ${index + 1} 張圖片`);
      dot.addEventListener("click", function (event) {
        event.stopPropagation();
        goToSlide(index, true);
      });
      dotsWrap.appendChild(dot);
    });

    trigger.prepend(slidesWrap);
    if (images.length > 1) {
      const caption = trigger.querySelector(".hero-visual-caption");
      trigger.insertBefore(dotsWrap, caption || null);
    }
  }

  function removeBrokenImage(src) {
    const nextImages = images.filter((item) => item !== src);
    if (!nextImages.length || nextImages.length === images.length) return;

    images = nextImages;
    currentIndex = Math.min(currentIndex, images.length - 1);

    if (slidesWrap) slidesWrap.remove();
    if (dotsWrap) dotsWrap.remove();

    setupSlides();
    goToSlide(currentIndex, false);
    startAutoPlay();
  }

  function getSlides() {
    return Array.from(trigger.querySelectorAll(".hero-visual-slide"));
  }

  function getDots() {
    return Array.from(trigger.querySelectorAll(".hero-visual-dot"));
  }

  function goToSlide(index, userAction) {
    if (!images.length) return;

    currentIndex = (index + images.length) % images.length;

    getSlides().forEach((slide, slideIndex) => {
      slide.classList.toggle("is-active", slideIndex === currentIndex);
    });

    getDots().forEach((dot, dotIndex) => {
      dot.classList.toggle("is-active", dotIndex === currentIndex);
    });

    if (userAction) restartAutoPlay();
  }

  function nextSlide() {
    if (images.length <= 1) return;
    goToSlide(currentIndex + 1, false);
  }

  function startAutoPlay() {
    stopAutoPlay();
    if (images.length <= 1) return;
    timer = window.setInterval(nextSlide, 5200);
  }

  function stopAutoPlay() {
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  function restartAutoPlay() {
    stopAutoPlay();
    startAutoPlay();
  }

  function createModal() {
    if (modal) return modal;

    modal = document.createElement("div");
    modal.className = "hero-visual-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "店內大圖");

    modal.innerHTML = `
      <div class="hero-visual-dialog">
        <button class="hero-visual-close" type="button" aria-label="關閉大圖">×</button>
        <img class="hero-visual-modal-img" src="${escapeAttr(images[currentIndex] || images[0] || "images/main-visual.jpg")}" alt="${escapeAttr(imageAlt)}">
        <div class="hero-visual-modal-caption">
          <strong>第十二夜｜店內主視覺</strong>
          <span>點擊背景、按 ESC 或右上角 × 可關閉。</span>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector(".hero-visual-close").addEventListener("click", closeModal);
    modal.addEventListener("click", function (event) {
      if (event.target === modal) closeModal();
    });

    return modal;
  }

  function openModal() {
    const el = createModal();
    const img = el.querySelector(".hero-visual-modal-img");
    if (img) {
      img.src = images[currentIndex] || images[0] || "images/main-visual.jpg";
      img.alt = `${imageAlt} ${currentIndex + 1}`;
    }

    el.classList.add("show");
    document.body.classList.add("hero-visual-modal-open");
    stopAutoPlay();

    const closeButton = el.querySelector(".hero-visual-close");
    if (closeButton) closeButton.focus({ preventScroll: true });
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("show");
    document.body.classList.remove("hero-visual-modal-open");
    trigger.focus({ preventScroll: true });
    startAutoPlay();
  }

  setupSlides();
  startAutoPlay();

  trigger.addEventListener("click", openModal);
  trigger.addEventListener("mouseenter", stopAutoPlay);
  trigger.addEventListener("mouseleave", startAutoPlay);
  trigger.addEventListener("focusin", stopAutoPlay);
  trigger.addEventListener("focusout", startAutoPlay);

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && modal && modal.classList.contains("show")) {
      closeModal();
    }
  });
})();
