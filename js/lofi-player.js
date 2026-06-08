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
      <button class="lofi-corner-collapse lofi-collapse" type="button" aria-label="縮小播放器" aria-expanded="true">
        <span aria-hidden="true">－</span>
      </button>

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

          <button class="lofi-mini-btn lofi-playlist-toggle" type="button" aria-label="展開歌單" aria-expanded="false">
            <span>歌單</span>
          </button>
        </div>

        <div class="lofi-bars" aria-hidden="true">
          <span></span><span></span><span></span><span></span>
        </div>
      </div>

      <div class="lofi-controls">
        <div class="lofi-progress-area">
          <div class="lofi-progress" aria-hidden="true"><span></span></div>
          <button class="lofi-loop" type="button" aria-label="開啟單曲循環" aria-pressed="false">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 7h8.5a4.5 4.5 0 0 1 0 9H13"></path>
              <path d="M7 7l3-3"></path>
              <path d="M7 7l3 3"></path>
              <path d="M17 17h-8.5a4.5 4.5 0 0 1 0-9H11"></path>
              <path d="M17 17l-3 3"></path>
              <path d="M17 17l-3-3"></path>
              <text x="12" y="15.2">1</text>
            </svg>
          </button>
        </div>

        <div class="lofi-volume-wrap">
          <button class="lofi-volume-icon" type="button" aria-label="靜音">
            <svg class="lofi-volume-on" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4.5 9.5v5h3.2l4.8 4.1V5.4L7.7 9.5H4.5Z"></path>
              <path d="M16 8.3c1.1 1 1.7 2.3 1.7 3.7s-.6 2.8-1.7 3.7"></path>
              <path d="M18.7 5.7A8.6 8.6 0 0 1 21 12a8.6 8.6 0 0 1-2.3 6.3"></path>
            </svg>
            <svg class="lofi-volume-off" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4.5 9.5v5h3.2l4.8 4.1V5.4L7.7 9.5H4.5Z"></path>
              <path d="M16.2 9.2 21 14"></path>
              <path d="M21 9.2 16.2 14"></path>
            </svg>
          </button>

          <div class="lofi-volume-control">
            <input class="lofi-volume" type="range" min="0" max="1" step="0.01" value="0.55" aria-label="調整音量" />
            <div class="lofi-volume-track" aria-hidden="true"><span></span></div>
            <div class="lofi-volume-thumb" aria-hidden="true"></div>
          </div>
        </div>
      </div>

      <div class="lofi-note">點一下，讓夢境慢慢開始。</div>

      <div class="lofi-playlist-panel" hidden>
        <div class="lofi-playlist-head">
          <span>PLAYLIST</span>
          <button class="lofi-playlist-close" type="button" aria-label="關閉歌單">×</button>
        </div>
        <div class="lofi-playlist-list"></div>
      </div>
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
    const playlistToggle = player.querySelector(".lofi-playlist-toggle");
    const playlistPanel = player.querySelector(".lofi-playlist-panel");
    const playlistList = player.querySelector(".lofi-playlist-list");
    const playlistClose = player.querySelector(".lofi-playlist-close");
    const loopButton = player.querySelector(".lofi-loop");
    const volumeButton = player.querySelector(".lofi-volume-icon");
    const volume = player.querySelector(".lofi-volume");
    const progress = player.querySelector(".lofi-progress span");
    const note = player.querySelector(".lofi-note");
    const title = player.querySelector(".lofi-title");
    const titleText = player.querySelector(".lofi-title span");
    const dragHandle = player.querySelector(".lofi-player-main");
    const visualBars = Array.from(player.querySelectorAll(".lofi-bars span"));

    const STORAGE_KEY = "twelfthNightLofiPlayerPosition";
    const COLLAPSE_STORAGE_KEY = "twelfthNightLofiPlayerCollapsed";
    const LOOP_STORAGE_KEY = "twelfthNightLofiSingleLoop";
    const FLOATING_MIN_WIDTH = 1701;
    let singleLoop = localStorage.getItem(LOOP_STORAGE_KEY) === "true";
    let currentIndex = 0;
    let failedSkips = 0;
    let lastVolumeBeforeMute = 0.55;
    let audioContext = null;
    let analyser = null;
    let analyserData = null;
    let analyserTimeData = null;
    let visualizerFrame = null;
    let visualizerReady = false;
    let kickEnvelope = 0;
    let bassEnvelope = 0;
    let midEnvelope = 0;
    let airEnvelope = 0;
    let pulseEnvelope = 0;
    let previousBass = 0;
    let previousBassBody = 0;
    let bassBaseline = 0;
    let bassBodyBaseline = 0;
    let kickGateHold = 0;
    let bassGateHold = 0;

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

    function applyLoopMode() {
      audio.loop = tracks.length <= 1 || singleLoop;
      player.classList.toggle("is-single-loop", singleLoop);
      loopButton?.setAttribute("aria-pressed", String(singleLoop));
      loopButton?.setAttribute("aria-label", singleLoop ? "關閉單曲循環" : "開啟單曲循環");
    }

    function closePlaylist() {
      player.classList.remove("is-playlist-open");
      if (playlistPanel) playlistPanel.hidden = true;
      playlistToggle?.setAttribute("aria-expanded", "false");
    }

    function openPlaylist() {
      renderPlaylist();
      player.classList.add("is-playlist-open");
      if (playlistPanel) playlistPanel.hidden = false;
      playlistToggle?.setAttribute("aria-expanded", "true");
    }

    function togglePlaylist() {
      if (player.classList.contains("is-playlist-open")) {
        closePlaylist();
      } else {
        openPlaylist();
      }
    }

    function renderPlaylist() {
      if (!playlistList) return;

      playlistList.innerHTML = tracks.map((track, index) => `
        <button class="lofi-playlist-item ${index === currentIndex ? "active" : ""}" type="button" data-index="${index}">
          <span class="lofi-playlist-index">${String(index + 1).padStart(2, "0")}</span>
          <span class="lofi-playlist-name">${track.title || `Twelfth Night Lofi ${index + 1}`}</span>
        </button>
      `).join("");
    }

    function updateVolumeVisual() {
      if (!volume) return;

      const currentVolume = Number(volume.value || audio.volume || 0);
      const isMuted = audio.muted || currentVolume <= 0;
      const pct = `${currentVolume * 100}%`;

      volume.style.setProperty("--volume-pct", pct);
      player.style.setProperty("--volume-pct", pct);
      player.classList.toggle("is-muted", isMuted);
      volumeButton?.setAttribute("aria-label", isMuted ? "取消靜音" : "靜音");
    }

    function setVisualizerIdle() {
      kickEnvelope = 0;
      bassEnvelope = 0;
      midEnvelope = 0;
      airEnvelope = 0;
      pulseEnvelope = 0;
      previousBass = 0;
      previousBassBody = 0;
      bassBaseline = 0;
      bassBodyBaseline = 0;
      kickGateHold = 0;
      bassGateHold = 0;

      visualBars.forEach((bar, index) => {
        const idleHeights = [6, 9, 7, 5];
        bar.style.setProperty("--bar-height", `${idleHeights[index % idleHeights.length]}px`);
        bar.style.setProperty("--bar-glow", "0");
      });
    }

    function initVisualizer() {
      if (visualizerReady || !visualBars.length) return true;

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        player.classList.add("visualizer-fallback");
        return false;
      }

      try {
        audioContext = new AudioContextClass();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.36;

        const source = audioContext.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(audioContext.destination);

        analyserData = new Uint8Array(analyser.frequencyBinCount);
        analyserTimeData = new Uint8Array(analyser.fftSize);
        visualizerReady = true;
        player.classList.add("visualizer-ready");
        return true;
      } catch (error) {
        console.warn("音波視覺化初始化失敗，已改用柔和裝飾動畫。", error);
        player.classList.add("visualizer-fallback");
        return false;
      }
    }

    async function resumeVisualizer() {
      if (!initVisualizer() || !audioContext) return;

      if (audioContext.state === "suspended") {
        try {
          await audioContext.resume();
        } catch (error) {
          console.warn("音波視覺化啟動失敗。", error);
        }
      }
    }

    function startVisualizer() {
      if (!visualBars.length || !analyser || !analyserData) return;

      cancelAnimationFrame(visualizerFrame);

      function averageRange(start, end) {
        let sum = 0;
        let count = 0;

        for (let i = start; i < Math.min(end, analyserData.length); i += 1) {
          sum += analyserData[i];
          count += 1;
        }

        return count ? sum / count : 0;
      }

      function averageHz(fromHz, toHz) {
        if (!audioContext || !analyser) return 0;

        const binHz = audioContext.sampleRate / analyser.fftSize;
        const start = Math.max(1, Math.floor(fromHz / binHz));
        const end = Math.max(start + 1, Math.ceil(toHz / binHz));

        return averageRange(start, end) / 255;
      }

      function follow(current, target, attack = 0.32, release = 0.09) {
        return current + (target - current) * (target > current ? attack : release);
      }

      function draw() {
        if (audio.paused || player.classList.contains("is-collapsed")) {
          setVisualizerIdle();
          return;
        }

        analyser.getByteFrequencyData(analyserData);

        const subBass = averageHz(35, 72);
        const kickBand = averageHz(52, 145);
        const bassBody = averageHz(85, 235);
        const lowMid = averageHz(235, 620);
        const mid = averageHz(620, 1800);
        const air = averageHz(2200, 6200);

        // 分開追蹤背景低頻，讓第一根看 kick transient，第二根看 bass groove。
        bassBaseline += (kickBand - bassBaseline) * 0.010;
        bassBodyBaseline += (bassBody - bassBodyBaseline) * 0.012;

        const kickRise = Math.max(0, kickBand - previousBass);
        const bassBodyRise = Math.max(0, bassBody - previousBassBody);

        previousBass = previousBass * 0.68 + kickBand * 0.32;
        previousBassBody = previousBassBody * 0.78 + bassBody * 0.22;

        const midMask = lowMid * 0.58 + mid * 0.42;
        const lowDominance = (kickBand + subBass * 0.46 + bassBody * 0.18) / (midMask + 0.090);
        const bassDominance = (bassBody + subBass * 0.34) / (lowMid + mid * 0.38 + 0.110);

        // 第一根：比嚴格版稍微放寬，避免 kick 太少動；但仍需低頻突然上升。
        const kickThreshold = Math.max(0.060, bassBaseline * 1.28);
        const kickTransient = Math.max(0, kickBand - kickThreshold);
        const kickGateOpen = kickTransient > 0.007 && kickRise > 0.003 && lowDominance > 0.55;

        kickGateHold = kickGateOpen ? 1 : kickGateHold * 0.82;

        const kickTarget = kickGateHold > 0.06
          ? Math.min(1, kickTransient * 7.0 + kickRise * 4.8 + subBass * 0.18)
          : 0;

        kickEnvelope = follow(kickEnvelope, kickTarget, 0.76, 0.095);

        // 第二根：不再讓持續 bass 一直撐高，改看 bass body 的起伏與 groove。
        const bassThreshold = Math.max(0.075, bassBodyBaseline * 1.18);
        const bassBodyTransient = Math.max(0, bassBody - bassThreshold);
        const bassGateOpen = bassBodyTransient > 0.010 && bassBodyRise > 0.0025 && bassDominance > 0.52;

        bassGateHold = bassGateOpen ? 1 : bassGateHold * 0.84;

        const bassGroove = bassGateHold > 0.08
          ? Math.min(1, bassBodyTransient * 4.4 + bassBodyRise * 3.1 + kickEnvelope * 0.15)
          : 0;

        bassEnvelope = follow(bassEnvelope, bassGroove, 0.30, 0.052);

        // 第三根：旋律 / 和聲律動，但壓低幅度，避免干擾低頻語意。
        const midTarget = Math.min(1, Math.max(0, lowMid - 0.045) * 0.72 + mid * 0.04);
        midEnvelope = follow(midEnvelope, midTarget, 0.17, 0.10);

        // 第四根：只做很小的空氣感。
        const airTarget = Math.min(1, Math.max(0, air - 0.030) * 0.55);
        airEnvelope = follow(airEnvelope, airTarget, 0.14, 0.13);

        const values = [
          kickEnvelope,
          bassEnvelope,
          midEnvelope,
          airEnvelope
        ];

        const minHeights = [4.5, 5.0, 5, 4];
        const ranges = [23, 14, 9, 6];

        visualBars.forEach((bar, index) => {
          const normalized = Math.min(1, Math.max(0, values[index] || 0));
          const softened = Math.pow(normalized, index === 0 ? 0.52 : 0.80);
          const height = minHeights[index] + softened * ranges[index];

          bar.style.setProperty("--bar-height", `${height.toFixed(1)}px`);
          bar.style.setProperty("--bar-glow", softened.toFixed(2));
        });

        visualizerFrame = requestAnimationFrame(draw);
      }

      draw();
    }

    function stopVisualizer() {
      cancelAnimationFrame(visualizerFrame);
      visualizerFrame = null;
      setVisualizerIdle();
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
      renderPlaylist();
      applyLoopMode();
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
      stopVisualizer();
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

      const collapseSymbol = collapse?.querySelector("span");
      if (collapseSymbol) {
        collapseSymbol.textContent = isCollapsed ? "＋" : "－";
      }

      if (isCollapsed) {
        closePlaylist();
        stopVisualizer();
      } else if (!audio.paused) {
        startVisualizer();
      }

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
          await resumeVisualizer();
          await audio.play();
          setPlaying(true);
          startVisualizer();
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

    playlistToggle?.addEventListener("click", () => {
      togglePlaylist();
    });

    playlistClose?.addEventListener("click", () => {
      closePlaylist();
    });

    playlistList?.addEventListener("click", (event) => {
      const item = event.target.closest(".lofi-playlist-item");
      if (!item) return;

      const index = Number(item.dataset.index);
      if (!Number.isFinite(index)) return;

      loadTrack(index, !audio.paused);
      closePlaylist();
    });

    loopButton?.addEventListener("click", () => {
      singleLoop = !singleLoop;
      localStorage.setItem(LOOP_STORAGE_KEY, singleLoop ? "true" : "false");
      applyLoopMode();
    });

    volume?.addEventListener("input", () => {
      const nextVolume = Number(volume.value);

      audio.volume = nextVolume;

      if (nextVolume > 0) {
        audio.muted = false;
        lastVolumeBeforeMute = nextVolume;
      }

      updateVolumeVisual();
    });

    volumeButton?.addEventListener("click", () => {
      const currentVolume = Number(volume?.value || audio.volume || 0);
      const shouldUnmute = audio.muted || currentVolume <= 0;

      if (shouldUnmute) {
        const restoredVolume = lastVolumeBeforeMute > 0 ? lastVolumeBeforeMute : 0.55;

        audio.muted = false;
        audio.volume = restoredVolume;

        if (volume) {
          volume.value = String(restoredVolume);
        }
      } else {
        lastVolumeBeforeMute = currentVolume;
        audio.muted = true;
      }

      updateVolumeVisual();
    });

    audio.addEventListener("timeupdate", () => {
      if (!progress || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
      progress.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
    });

    audio.addEventListener("ended", () => {
      if (tracks.length > 1 && !singleLoop) {
        nextTrack(true);
      } else {
        setPlaying(false);
        stopVisualizer();
      }
    });

    audio.addEventListener("pause", () => {
      setPlaying(false);
      stopVisualizer();
    });

    audio.addEventListener("play", () => {
      failedSkips = 0;
      setPlaying(true);
      startVisualizer();
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

    document.addEventListener("click", (event) => {
      if (!player.classList.contains("is-playlist-open")) return;
      if (event.target.closest(".lofi-player")) return;
      closePlaylist();
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
      lastVolumeBeforeMute = audio.volume > 0 ? audio.volume : 0.55;
      updateVolumeVisual();
    }

    renderPlaylist();
    applyLoopMode();
    setVisualizerIdle();
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
