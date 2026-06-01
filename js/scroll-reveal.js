// scroll-reveal.js
// 滾動到畫面中才淡入顯示區塊與卡片

(function () {
    const revealItems = document.querySelectorAll(
        "section, .card, .panel, .staff-card, .cast-card-profile, .info-item, .flow-item, .rule"
    );

    if (!revealItems.length) return;

    revealItems.forEach((item, index) => {
        item.classList.add("reveal-item");

        // 小幅錯開卡片出現時間，避免全部同時跳出
        if (
            item.classList.contains("card") ||
            item.classList.contains("staff-card") ||
            item.classList.contains("info-item") ||
            item.classList.contains("flow-item") ||
            item.classList.contains("rule")
        ) {
            item.style.setProperty("--reveal-delay", `${Math.min(index % 6, 5) * 70}ms`);
        }
    });

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;

                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
            });
        },
        {
            threshold: 0.12,
            rootMargin: "0px 0px -8% 0px"
        }
    );

    revealItems.forEach((item) => observer.observe(item));
})();