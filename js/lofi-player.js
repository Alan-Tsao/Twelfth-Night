// lofi-player.js
// 第十二夜共用 Lofi 音樂播放器。
// 功能：自動生成播放器 HTML、多首輪播、展開/收合、桌機拖曳位置記憶、1700px 以下自動回到版面流。
// 歌單請改 js/lofi-playlist.js 的 window.TWELFTH_NIGHT_LOFI_PLAYLIST。

(() => {
  const DEFAULT_PLAYLIST = [
    {
      title: "Twelfth Night Lofi",
      src: "audio/lofi.mp3"
    }
  ];

  function normalizePlaylist(rawList) {
    if (!Array.isArray(rawList)) return [];
    return rawList
      .map((item, index) => {
        if (typeof item === "string") {
          const src = item.trim();
          return src ? { title: `Twelfth Night Lofi ${String(index + 1).padStart(2, "0")}`, src } : null;
        }

        if (!item || typeof item !== "object") return null;

        const src = String(item.src || item.url || "").trim();
        if (!src) return null;

        const title = String(item.title || item.name || `Twelfth Night Lofi ${String(index + 1).padStart(2, "0")}`).trim();

        return { title, src };
      })
      .filter(Boolean);
  }

  function playlistFromDataset(player) {
    const listText = player?.dataset.audioList || player?.dataset.audioSrc || "";
    const titleText = player?.dataset.trackTitles || "";
    const tracks = listText.split(",").map((item) => item.trim()).filter(Boolean);
    const titles = titleText.split(",").map((item) => item.trim()).filter(Boolean);

    return tracks.map((src, index) => ({
      src,
      title: titles[index] || `Twelfth Night Lofi ${String(index + 1).padStart(2, "0")}`
    }));
  }

  function createPlayerHtml() {
    const aside = document.createElement("aside");
    aside.className = "lofi-player";
    aside.setAttribute("aria-label", "第十二夜 Lofi 音樂播放器");

    aside.innerHTML = `
      <div class="lofi-player-main">
        <button class="lofi-toggle" type="button" aria-label="播放 Lofi 音樂">
          <span class="lofi-icon-play" aria-hidden="true">▶</span>
          <span class="lofi-icon-pause" aria-hidden="true">Ⅱ</span>
        </button>

        <div class="lofi-info">
          <div class="lofi-kicker">NOW PLAYING</div>
          <div class="lofi-title"><span>Twelfth Night Lofi</span></div>
        </div>

        <div class="lofi-actions">
          <button class="lofi-mini-btn lofi-next" type="button" aria-label="下一首">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5.5 5.25v13.5L14.25 12 5.5 5.25Z"></path>
              <path d="M14.5 5.25v13.5L22 12 14.5 5.25Z"></path>
            </svg>
          </button>

          <button class="lofi-mini-btn lofi-reset" type="button" aria-label="重置播放器位置">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5.25a6.75 6.75 0 1 1-6.24 4.18"></path>
              <path d="M5.1 4.9v4.65h4.65"></path>
            </svg>
          </button>

          <button class="lofi-mini-btn lofi-collapse" type="button" aria-label="縮小播放器" aria-expanded="true">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6.5 14.5 12 9l5.5 5.5"></path>
            </svg>
          </button>
        </div>

        <div class="lofi-bars" aria-hidden="true">
          <span></span><span></span><span></span><span></span>
        </div>
      </div>

      <div class="lofi-controls">
        <div class="lofi-progress" aria-hidden="true"><span></span></div>
        <input class="lofi-volume" type="range" min="0" max="1" step="0.01" value="0.55" aria-label="調整音量" />
      </div>

      <div class="lofi-note">點一下，讓夢境慢慢開始。</div>
    `;

    return aside;
  }

  function mountPlayer() {
    const existing = document.querySelector(".lofi-player");
    if (existing) return existing;

    const player = createPlayerHtml();
    const hero = document.querySelector(".hero");

    if (hero) {
      hero.prepend(player);
    } else {
      document.body.prepend(player);
    }

    return player;
  }

  function boot() {
    const player = mountPlayer();
    if (!player) return;

    const playlist =
      normalizePlaylist(window.TWELFTH_NIGHT_LOFI_PLAYLIST)
      .concat(playlistFromDataset(player))
      .filter((item, index, array) => array.findIndex((other) => other.src === item.src) === index);

    const tracks = playlist.length ? playlist : DEFAULT_PLAYLIST;

    const audio = new Audio();
    audio.loop = tracks.length <= 1;
    audio.preload = "metadata";
    audio.volume = 0.55;

    const toggle = player.querySelector(".lofi-toggle");
    const next = player.querySelector(".lofi-next");
    const reset = player.querySelector(".lofi-reset");
    const collapse = player.querySelector(".lofi-collapse");
    const volume = player.querySelector(".lofi-volume");
    const progress = player.querySelector(".lofi-progress span");
    const note = player.querySelector(".lofi-note");
    const title = player.querySelector(".lofi-title");
    const titleText = player.querySelector(".lofi-title span");
    const dragHandle = player.querySelector(".lofi-player-main");

    const STORAGE_KEY = "twelfthNightLofiPlayerPosition";
    const COLLAPSE_STORAGE_KEY = "twelfthNightLofiPlayerCollapsed";
    const FLOATING_MIN_WIDTH = 1701;
    let currentIndex = 0;
    let failedSkips = 0;

    function canFloat() {
      return window.innerWidth >= FLOATING_MIN_WIDTH;
    }

    function clamp(value, min, max) {
      return Math.min(Math.max(value, min), max);
    }

    function trackTitle(index) {
      return tracks[index]?.title || `Twelfth Night Lofi ${String(index + 1).padStart(2, "0")}`;
    }

    function trackSrc(index) {
      return tracks[index]?.src || "";
    }

    function updateVolumeVisual() {
      if (!volume) return;
      const pct = `${Number(volume.value || audio.volume || 0) * 100}%`;
      volume.style.setProperty("--volume-pct", pct);
    }

    function setTitleText(text) {
      if (titleText) {
        titleText.textContent = text;
      } else if (title) {
        title.textContent = text;
      }
    }

    function setNoteText(text, marquee = false) {
      if (!note) return;

      if (marquee) {
        note.innerHTML = `<span class="lofi-note-marquee">${text}</span>`;
      } else {
        note.textContent = text;
      }
    }

    function loadTrack(index, shouldPlay = false) {
      if (!tracks.length) return;

      currentIndex = ((index % tracks.length) + tracks.length) % tracks.length;
      audio.src = trackSrc(currentIndex);
      audio.load();

      setTitleText(trackTitle(currentIndex));
      if (progress) progress.style.width = "0%";

      if (note && !player.classList.contains("is-error")) {
        setNoteText(tracks.length > 1
          ? `第 ${currentIndex + 1} 首／共 ${tracks.length} 首。`
          : "點一下，讓夢境慢慢開始。");
      }

      if (shouldPlay) {
        audio.play()
          .then(() => setPlaying(true))
          .catch((error) => {
            console.warn("Lofi 音樂播放失敗。瀏覽器可能阻擋自動播放，或音樂檔路徑不存在。", error);
            setError();
          });
      }
    }

    function nextTrack(shouldPlay = !audio.paused) {
      loadTrack(currentIndex + 1, shouldPlay);
    }

    function setPlaying(isPlaying) {
      player.classList.toggle("is-playing", isPlaying);
      toggle?.setAttribute("aria-label", isPlaying ? "暫停 Lofi 音樂" : "播放 Lofi 音樂");

      if (note && !player.classList.contains("is-error")) {
        if (isPlaying) {
          setNoteText(tracks.length > 1
            ? `播放中：${trackTitle(currentIndex)}｜願這段旋律陪您沉入今夜的夢。`
            : "Lofi 播放中，願這段旋律陪您沉入今夜的夢。", true);
        } else {
          setNoteText(tracks.length > 1
            ? `第 ${currentIndex + 1} 首／共 ${tracks.length} 首。`
            : "點一下，讓夢境慢慢開始。");
        }
      }
    }

    function setError() {
      player.classList.add("is-error");
      setPlaying(false);
      if (note) setNoteText(`找不到音樂檔：${trackSrc(currentIndex) || "未設定"}`);
    }

    function savePosition(left, top) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ left, top }));
    }

    function clearPosition() {
      localStorage.removeItem(STORAGE_KEY);
      player.classList.remove("is-custom-position");
      player.style.left = "";
      player.style.top = "";
    }

    function applySavedPosition() {
      if (!canFloat()) {
        player.classList.remove("is-custom-position");
        player.style.left = "";
        player.style.top = "";
        return;
      }

      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;

        const pos = JSON.parse(raw);
        const rect = player.getBoundingClientRect();
        const left = clamp(Number(pos.left) || 0, 8, window.innerWidth - rect.width - 8);
        const top = clamp(Number(pos.top) || 0, 54, window.innerHeight - rect.height - 8);

        player.classList.add("is-custom-position");
        player.style.left = `${left}px`;
        player.style.top = `${top}px`;
      } catch {
        clearPosition();
      }
    }

    function setCollapsed(isCollapsed, shouldSave = true) {
      player.classList.toggle("is-collapsed", isCollapsed);
      collapse?.setAttribute("aria-expanded", String(!isCollapsed));
      collapse?.setAttribute("aria-label", isCollapsed ? "展開播放器" : "縮小播放器");

      if (shouldSave) {
        localStorage.setItem(COLLAPSE_STORAGE_KEY, isCollapsed ? "true" : "false");
      }

      window.requestAnimationFrame(applySavedPosition);
    }

    function applySavedCollapse() {
      const saved = localStorage.getItem(COLLAPSE_STORAGE_KEY);

      if (saved === "true") {
        setCollapsed(true, false);
        return;
      }

      if (saved === "false") {
        setCollapsed(false, false);
        return;
      }

      setCollapsed(window.innerWidth <= 980, false);
    }

    toggle?.addEventListener("click", async () => {
      try {
        if (audio.paused) {
          await audio.play();
          setPlaying(true);
        } else {
          audio.pause();
          setPlaying(false);
        }
      } catch (error) {
        console.warn("Lofi 音樂播放失敗。瀏覽器可能阻擋自動播放，或音樂檔路徑不存在。", error);
        setError();
      }
    });

    next?.addEventListener("click", () => {
      nextTrack(!audio.paused);
    });

    reset?.addEventListener("click", () => {
      clearPosition();

      if (note && !player.classList.contains("is-error")) {
        setNoteText("位置已重置。");
        window.setTimeout(() => setPlaying(!audio.paused), 1000);
      }
    });

    collapse?.addEventListener("click", () => {
      setCollapsed(!player.classList.contains("is-collapsed"));
    });

    volume?.addEventListener("input", () => {
      audio.volume = Number(volume.value);
      updateVolumeVisual();
    });

    audio.addEventListener("timeupdate", () => {
      if (!progress || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
      progress.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
    });

    audio.addEventListener("ended", () => {
      if (tracks.length > 1) {
        nextTrack(true);
      } else {
        setPlaying(false);
      }
    });

    audio.addEventListener("pause", () => setPlaying(false));

    audio.addEventListener("play", () => {
      failedSkips = 0;
      setPlaying(true);
    });

    audio.addEventListener("error", () => {
      if (tracks.length > 1 && failedSkips < tracks.length - 1) {
        failedSkips += 1;
        nextTrack(!audio.paused);
        return;
      }

      setError();
    });

    dragHandle?.addEventListener("pointerdown", (event) => {
      if (!canFloat()) return;
      if (event.target.closest("button, input, a")) return;

      const rect = player.getBoundingClientRect();
      const shiftX = event.clientX - rect.left;
      const shiftY = event.clientY - rect.top;

      player.classList.add("is-custom-position", "is-dragging");
      player.style.left = `${rect.left}px`;
      player.style.top = `${rect.top}px`;

      dragHandle.setPointerCapture?.(event.pointerId);

      function move(pointerEvent) {
        const nextLeft = clamp(pointerEvent.clientX - shiftX, 8, window.innerWidth - rect.width - 8);
        const nextTop = clamp(pointerEvent.clientY - shiftY, 54, window.innerHeight - rect.height - 8);
        player.style.left = `${nextLeft}px`;
        player.style.top = `${nextTop}px`;
      }

      function up() {
        player.classList.remove("is-dragging");
        const finalRect = player.getBoundingClientRect();
        savePosition(finalRect.left, finalRect.top);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
      }

      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    });

    function handleResponsiveCollapse() {
      if (localStorage.getItem(COLLAPSE_STORAGE_KEY) !== null) {
        applySavedPosition();
        return;
      }

      setCollapsed(window.innerWidth <= 980, false);
      applySavedPosition();
    }

    window.addEventListener("resize", handleResponsiveCollapse);

    if (volume) {
      audio.volume = Number(volume.value);
      updateVolumeVisual();
    }

    loadTrack(0, false);
    applySavedCollapse();
    applySavedPosition();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
