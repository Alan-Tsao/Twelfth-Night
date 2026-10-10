// lofi-player.js (改版)
// 第十二夜共用 Lofi 播放器：固定在右下角，桌機可拖動並記住位置。
// 歌單請改 js/lofi-playlist.js 的 window.TWELFTH_NIGHT_LOFI_PLAYLIST。
(() => {
  const DEFAULT_PLAYLIST = [{ title: "Twelfth Night Lofi", src: "audio/lofi.mp3" }];
  const KEY_POS = "twelfthNightLofiPos2";
  const KEY_MIN = "twelfthNightLofiPlayerCollapsed";
  const KEY_LOOP = "twelfthNightLofiSingleLoop";
  const KEY_VOL = "twelfthNightLofiVolume";

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
    del(k) { try { localStorage.removeItem(k); } catch {} }
  };

  function normalize(list) {
    if (!Array.isArray(list)) return [];
    return list.map((item, i) => {
      if (typeof item === "string") return item.trim() ? { title: `Twelfth Night Lofi ${String(i + 1).padStart(2, "0")}`, src: item.trim() } : null;
      if (!item || typeof item !== "object") return null;
      const src = String(item.src || item.url || "").trim();
      if (!src) return null;
      return { title: String(item.title || item.name || `Twelfth Night Lofi ${String(i + 1).padStart(2, "0")}`).trim(), src };
    }).filter(Boolean);
  }

  function shortTitle(t) { return String(t).replace(/^Twelfth Night\s*/i, ""); }

  function boot() {
    if (document.querySelector(".tnl")) return;
    const tracks = normalize(window.TWELFTH_NIGHT_LOFI_PLAYLIST);
    const list = tracks.length ? tracks : DEFAULT_PLAYLIST;
    const IDLE = "點一下，讓夢境慢慢開始。";

    const p = document.createElement("aside");
    p.className = "tnl";
    p.setAttribute("aria-label", "第十二夜 Lofi 音樂播放器");
    p.innerHTML = `
      <div class="tnl-list">
        <div class="tnl-opts">
          <label>音量 <input class="tnl-vol" type="range" min="0" max="1" step="0.01" aria-label="調整音量"></label>
          <button class="tnl-loop" type="button" aria-pressed="false">單曲循環</button>
        </div>
        <div class="tnl-tracks"></div>
      </div>
      <div class="tnl-main">
        <button class="tnl-play" type="button" aria-label="播放">▶</button>
        <div class="tnl-info" title="拖曳可移動位置，連點兩下回到原位"><div class="tnl-title"></div><small class="tnl-note">${IDLE}</small></div>
        <button class="tnl-next" type="button" aria-label="下一首">下一首</button>
        <button class="tnl-ls" type="button" aria-expanded="false">歌單</button>
        <button class="tnl-min" type="button" aria-label="縮小播放器">－</button>
      </div>
      <div class="tnl-bar"><i></i></div>`;
    document.body.appendChild(p);

    const $ = (s) => p.querySelector(s);
    const playBtn = $(".tnl-play"), titleEl = $(".tnl-title"), noteEl = $(".tnl-note"), prog = $(".tnl-bar i");
    const tracksEl = $(".tnl-tracks"), vol = $(".tnl-vol"), loopBtn = $(".tnl-loop"), lsBtn = $(".tnl-ls"), minBtn = $(".tnl-min"), main = $(".tnl-main");

    const audio = new Audio();
    audio.preload = "metadata";
    let idx = 0, failed = 0, loop = store.get(KEY_LOOP) === "true";
    const v0 = parseFloat(store.get(KEY_VOL));
    audio.volume = Number.isFinite(v0) ? Math.min(Math.max(v0, 0), 1) : 0.55;
    vol.value = audio.volume;

    function paint() {
      titleEl.textContent = shortTitle(list[idx].title);
      tracksEl.querySelectorAll("button").forEach((b, k) => b.setAttribute("aria-current", String(k === idx)));
    }
    function load(k, go) {
      idx = k;
      audio.src = list[k].src;
      prog.style.width = "0%";
      paint();
      if (go) audio.play().catch(() => fail());
    }
    function fail() {
      noteEl.textContent = "無法播放，請確認音檔路徑。";
      p.classList.remove("on");
      playBtn.textContent = "▶";
    }
    function next(go) { load((idx + 1) % list.length, go); }

    list.forEach((t, k) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = shortTitle(t.title);
      b.addEventListener("click", () => { load(k, !audio.paused); p.classList.remove("open"); lsBtn.setAttribute("aria-expanded", "false"); fixPos(); });
      tracksEl.appendChild(b);
    });

    function applyLoop() {
      audio.loop = list.length <= 1 || loop;
      loopBtn.setAttribute("aria-pressed", String(loop));
    }

    playBtn.addEventListener("click", () => { if (audio.paused) audio.play().catch(() => fail()); else audio.pause(); });
    $(".tnl-next").addEventListener("click", () => next(!audio.paused));
    loopBtn.addEventListener("click", () => { loop = !loop; store.set(KEY_LOOP, String(loop)); applyLoop(); });
    vol.addEventListener("input", () => { audio.volume = Number(vol.value); store.set(KEY_VOL, String(audio.volume)); });
    lsBtn.addEventListener("click", (e) => { e.stopPropagation(); const o = p.classList.toggle("open"); lsBtn.setAttribute("aria-expanded", String(o)); fixPos(); });
    minBtn.addEventListener("click", () => setMin(!p.classList.contains("min")));
    document.addEventListener("click", (e) => { if (!e.target.closest(".tnl")) { p.classList.remove("open"); lsBtn.setAttribute("aria-expanded", "false"); } });

    audio.addEventListener("play", () => { failed = 0; p.classList.add("on"); playBtn.textContent = "Ⅱ"; playBtn.setAttribute("aria-label", "暫停"); noteEl.textContent = "播放中"; });
    audio.addEventListener("pause", () => { p.classList.remove("on"); playBtn.textContent = "▶"; playBtn.setAttribute("aria-label", "播放"); noteEl.textContent = IDLE; });
    audio.addEventListener("ended", () => { if (list.length > 1 && !loop) next(true); });
    audio.addEventListener("timeupdate", () => { if (audio.duration) prog.style.width = `${(audio.currentTime / audio.duration) * 100}%`; });
    audio.addEventListener("error", () => {
      if (list.length > 1 && failed < list.length - 1) { failed += 1; next(!audio.paused); return; }
      fail();
    });

    function setMin(m, save = true) {
      p.classList.toggle("min", m);
      p.classList.remove("open");
      minBtn.textContent = m ? "＋" : "－";
      minBtn.setAttribute("aria-label", m ? "展開播放器" : "縮小播放器");
      if (save) store.set(KEY_MIN, String(m));
      fixPos();
    }

    // 桌機拖動（寬度 981px 以上且使用滑鼠）；手機與平板固定在右下角
    const dm = window.matchMedia("(min-width:981px) and (pointer:fine)");
    function place(l, t) {
      const r = p.getBoundingClientRect();
      l = Math.min(Math.max(l, 8), window.innerWidth - r.width - 8);
      t = Math.min(Math.max(t, 62), window.innerHeight - r.height - 8);
      Object.assign(p.style, { left: `${l}px`, top: `${t}px`, right: "auto", bottom: "auto" });
    }
    function clearPos() { Object.assign(p.style, { left: "", top: "", right: "", bottom: "" }); }
    function restore() {
      if (!dm.matches) { clearPos(); return; }
      try { const v = JSON.parse(store.get(KEY_POS) || "null"); if (v) place(v[0], v[1]); } catch {}
    }
    function fixPos() { if (p.style.left) { const r = p.getBoundingClientRect(); place(r.left, r.top); } }

    main.addEventListener("pointerdown", (e) => {
      if (!dm.matches || e.target.closest("button")) return;
      const r = p.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
      p.classList.add("drag");
      main.setPointerCapture(e.pointerId);
      const move = (ev) => place(ev.clientX - dx, ev.clientY - dy);
      const up = () => {
        p.classList.remove("drag");
        main.removeEventListener("pointermove", move);
        main.removeEventListener("pointerup", up);
        main.removeEventListener("pointercancel", up);
        const q = p.getBoundingClientRect();
        store.set(KEY_POS, JSON.stringify([q.left, q.top]));
      };
      main.addEventListener("pointermove", move);
      main.addEventListener("pointerup", up);
      main.addEventListener("pointercancel", up);
    });
    main.addEventListener("dblclick", (e) => { if (!e.target.closest("button")) { clearPos(); store.del(KEY_POS); } });
    window.addEventListener("resize", restore);

    applyLoop();
    load(0, false);
    const savedMin = store.get(KEY_MIN);
    setMin(savedMin === null ? window.innerWidth <= 860 : savedMin === "true", false);
    restore();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
