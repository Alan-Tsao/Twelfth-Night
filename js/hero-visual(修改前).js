// hero-visual.js
// 首頁主視覺：點擊開啟大圖懸浮視窗

(function () {
  const trigger = document.querySelector(".hero-visual-trigger");
  if (!trigger) return;

  const imageSrc = trigger.dataset.heroImage || "images/main-visual.jpg";
  const imageAlt = trigger.dataset.heroAlt || "第十二夜店內主視覺";

  let modal = null;

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
        <img class="hero-visual-modal-img" src="${imageSrc}" alt="${imageAlt}">
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
    el.classList.add("show");
    document.body.classList.add("hero-visual-modal-open");

    const closeButton = el.querySelector(".hero-visual-close");
    if (closeButton) closeButton.focus({ preventScroll: true });
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("show");
    document.body.classList.remove("hero-visual-modal-open");
    trigger.focus({ preventScroll: true });
  }

  trigger.addEventListener("click", openModal);

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && modal && modal.classList.contains("show")) {
      closeModal();
    }
  });
})();
