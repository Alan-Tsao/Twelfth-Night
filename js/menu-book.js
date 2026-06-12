(() => {
  const book = document.getElementById("menuBookApp");
  const spreads = Array.from(document.querySelectorAll("[data-menu-spread]"));
  const prevBtn = document.getElementById("menuPrevBtn");
  const nextBtn = document.getElementById("menuNextBtn");
  const dots = document.getElementById("menuBookDots");
  const status = document.getElementById("menuBookStatus");

  if (!book || !spreads.length) return;

  let index = 0;

  function renderDots() {
    if (!dots) return;

    dots.innerHTML = spreads
      .map((_, i) => `<span class="menu-book-dot ${i === index ? "active" : ""}" aria-hidden="true"></span>`)
      .join("");
  }

  function show(nextIndex, direction = "next") {
    const max = spreads.length - 1;
    index = Math.max(0, Math.min(max, nextIndex));

    book.classList.remove("is-flipping-next", "is-flipping-prev");
    void book.offsetWidth;
    book.classList.add(direction === "prev" ? "is-flipping-prev" : "is-flipping-next");

    spreads.forEach((spread, i) => {
      spread.classList.toggle("active", i === index);
    });

    if (prevBtn) prevBtn.disabled = index === 0;
    if (nextBtn) nextBtn.disabled = index === max;
    if (status) status.textContent = spreads[index]?.dataset.title || "";

    renderDots();

    window.setTimeout(() => {
      book.classList.remove("is-flipping-next", "is-flipping-prev");
    }, 560);
  }

  prevBtn?.addEventListener("click", () => show(index - 1, "prev"));
  nextBtn?.addEventListener("click", () => show(index + 1, "next"));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      const lightbox = document.getElementById("menuLightbox");
      if (lightbox?.classList.contains("show")) {
        document.querySelector("[data-menu-lightbox-close]")?.click();
        return;
      }
    }

    if (event.key === "ArrowLeft") show(index - 1, "prev");
    if (event.key === "ArrowRight") show(index + 1, "next");
  });

  document.querySelectorAll("[data-menu-image]").forEach((img) => {
    img.addEventListener("error", () => {
      img.classList.add("is-missing");
      img.nextElementSibling?.classList.add("show");
    });
  });


  const lightbox = document.getElementById("menuLightbox");
  const lightboxImage = document.getElementById("menuLightboxImage");
  const lightboxCaption = document.getElementById("menuLightboxCaption");

  const zoomState = {
    scale: 1,
    x: 0,
    y: 0,
    dragging: false,
    startX: 0,
    startY: 0,
    baseX: 0,
    baseY: 0
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function applyZoomTransform() {
    if (!lightboxImage) return;

    lightboxImage.style.transform = `translate(${zoomState.x}px, ${zoomState.y}px) scale(${zoomState.scale})`;
    lightboxImage.classList.toggle("is-zoomed", zoomState.scale > 1.01);
  }

  function resetZoom() {
    zoomState.scale = 1;
    zoomState.x = 0;
    zoomState.y = 0;
    zoomState.dragging = false;

    if (lightboxImage) {
      lightboxImage.classList.remove("is-dragging");
    }

    applyZoomTransform();
  }

  function openLightbox(img) {
    if (!lightbox || !lightboxImage || !img || img.classList.contains("is-missing")) return;

    resetZoom();

    lightboxImage.src = img.currentSrc || img.src;
    lightboxImage.alt = img.alt || "菜單圖片";
    if (lightboxCaption) lightboxCaption.textContent = img.alt || "點擊空白處或按 Esc 關閉";

    lightbox.classList.add("show");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("menu-lightbox-open");
  }

  function closeLightbox() {
    if (!lightbox || !lightboxImage) return;

    lightbox.classList.remove("show");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.classList.remove("menu-lightbox-open");
    resetZoom();

    window.setTimeout(() => {
      if (!lightbox.classList.contains("show")) {
        lightboxImage.removeAttribute("src");
      }
    }, 160);
  }

  lightboxImage?.addEventListener("wheel", (event) => {
    if (!lightbox?.classList.contains("show")) return;

    event.preventDefault();

    const beforeScale = zoomState.scale;
    const delta = event.deltaY < 0 ? 0.18 : -0.18;
    zoomState.scale = clamp(zoomState.scale + delta, 1, 4);

    if (zoomState.scale <= 1.01) {
      zoomState.scale = 1;
      zoomState.x = 0;
      zoomState.y = 0;
    } else if (beforeScale <= 1.01 && zoomState.scale > 1.01) {
      zoomState.x = 0;
      zoomState.y = 0;
    }

    applyZoomTransform();
  }, { passive: false });

  lightboxImage?.addEventListener("pointerdown", (event) => {
    if (zoomState.scale <= 1.01) return;

    event.preventDefault();

    zoomState.dragging = true;
    zoomState.startX = event.clientX;
    zoomState.startY = event.clientY;
    zoomState.baseX = zoomState.x;
    zoomState.baseY = zoomState.y;

    lightboxImage.classList.add("is-dragging");
    lightboxImage.setPointerCapture?.(event.pointerId);
  });

  lightboxImage?.addEventListener("pointermove", (event) => {
    if (!zoomState.dragging) return;

    zoomState.x = zoomState.baseX + (event.clientX - zoomState.startX);
    zoomState.y = zoomState.baseY + (event.clientY - zoomState.startY);
    applyZoomTransform();
  });

  function endDrag(event) {
    if (!zoomState.dragging) return;

    zoomState.dragging = false;
    lightboxImage?.classList.remove("is-dragging");
    if (event?.pointerId !== undefined) {
      lightboxImage?.releasePointerCapture?.(event.pointerId);
    }
  }

  lightboxImage?.addEventListener("pointerup", endDrag);
  lightboxImage?.addEventListener("pointercancel", endDrag);
  lightboxImage?.addEventListener("dblclick", (event) => {
    event.preventDefault();
    resetZoom();
  });

  document.addEventListener("click", (event) => {
    const img = event.target.closest("[data-menu-image]");
    if (img) {
      openLightbox(img);
      return;
    }

    if (event.target.closest("[data-menu-lightbox-close]")) {
      closeLightbox();
    }
  });

  show(0);
})();
