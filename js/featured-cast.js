// featured-cast.js
// 用途：首頁「今日推薦」公關區塊
// 特色：
// 1. 固定公關資料讀取 cast-data.js 的 window.allCasts。
// 2. 今日出勤狀態讀取 Google Sheet 班表 CSV。
// 3. 首頁仍維持「推薦展示」用途，不變成完整班表頁。
// 4. 支援 Google Sheet staff_status 的 bookableStatus / statusLabel。

(function () {
  const grid = document.getElementById("featuredCastGrid");
  if (!grid) return;

  // Google Sheet 班表 CSV
  // 欄位格式：date,cast,start,end,status,note
  const SCHEDULE_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRKYIls0ZbPLmj4e43Hpp82EDPS8FpOQvbG3N-LaNP5XgLVdV55ZMHclNwb_SgfdTI9XzkL19OFB2zP/pub?gid=0&single=true&output=csv";

  // Google Sheet 人員狀態 CSV
  // 欄位格式：cast,bookableStatus,statusLabel,role,note
  // bookableStatus 給系統判斷；statusLabel 給網頁顯示。
  const STAFF_STATUS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRKYIls0ZbPLmj4e43Hpp82EDPS8FpOQvbG3N-LaNP5XgLVdV55ZMHclNwb_SgfdTI9XzkL19OFB2zP/pub?gid=1310958925&single=true&output=csv";


  const casts = Array.isArray(window.allCasts) ? window.allCasts : [];
  const config = window.FEATURE_CONFIG || { mode: "daily", count: 3 };
  const count = Number(config.count || 3);

  let scheduleRows = [];
  let scheduleLoaded = false;
  let scheduleError = false;

  let staffStatusMap = new Map();
  let staffStatusLoaded = false;
  let staffStatusError = false;

  injectFeaturedStyle();

  function injectFeaturedStyle() {
    if (document.getElementById("featured-cast-sheet-style")) return;

    const style = document.createElement("style");
    style.id = "featured-cast-sheet-style";
    style.textContent = `
      .featured-card.staff-card {
        overflow: hidden;
        padding: 0;
      }

      .featured-card .staff-img {
        aspect-ratio: 4 / 5;
        padding: 0 !important;
        overflow: hidden;
        position: relative;
        display: block !important;
        background: linear-gradient(135deg, rgba(242,167,198,.22), rgba(155,135,245,.2));
      }

      .featured-card .staff-photo {
        width: 100%;
        height: 100%;
        display: block;
        object-fit: cover;
      }

      .featured-card .staff-photo-fallback {
        width: 100%;
        height: 100%;
        display: none;
        place-items: center;
        text-align: center;
        padding: 24px;
        color: rgba(255,255,255,.75);
        background: linear-gradient(135deg, rgba(242,167,198,.22), rgba(155,135,245,.2));
      }

      .featured-card .staff-photo-fallback span {
        display: block;
        color: var(--gold);
        font-size: 24px;
        letter-spacing: .12em;
      }

      .featured-card .staff-photo-fallback small {
        display: block;
        margin-top: 8px;
        color: var(--muted);
      }

      .featured-card .cast-name-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
      }

      .featured-card .staff-body h3 {
        margin: 0;
        color: var(--gold);
        font-size: 26px;
      }

      .featured-card .today-line.pending {
        color: var(--muted);
        border-color: rgba(255,255,255,.16);
        background: rgba(255,255,255,.06);
      }

      .featured-card .today-line.rest {
        color: var(--danger);
        border-color: rgba(255,154,169,.28);
        background: rgba(255,154,169,.08);
      }

      .featured-card-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 22px;
      }
    `;
    document.head.appendChild(style);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizeKey(value) {
    return String(value || "").trim().toLowerCase();
  }

  function todayDateText() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function normalizeScheduleRow(row) {
    const date = String(row.date || "").trim();
    const cast = String(row.cast || "").trim();
    const start = String(row.start || "").trim();
    const end = String(row.end || "").trim();
    const status = String(row.status || "").trim().toLowerCase();
    const note = String(row.note || "").trim();

    if (!date || !cast || !start || !end || !status) return null;
    if (!["available", "pending", "unbookable", "rest"].includes(status)) return null;

    return { date, cast, start, end, status, note };
  }

  function labelFromBookableStatus(status) {
    if (status === "available") return "接受指名";
    if (status === "pending") return "排班確認中";
    if (status === "unbookable") return "不接受指名";
    if (status === "rest") return "暫停服務";
    return "接受指名";
  }

  function normalizeStaffStatusRow(row) {
    const cast = String(row.cast || "").trim();
    const bookableStatus = String(row.bookablestatus || row.bookableStatus || "").trim().toLowerCase();
    const statusLabel = String(row.statuslabel || row.statusLabel || "").trim();
    const role = String(row.role || "").trim();
    const note = String(row.note || "").trim();

    if (!cast || !bookableStatus) return null;
    if (!["available", "pending", "unbookable", "rest"].includes(bookableStatus)) return null;

    return {
      cast,
      bookableStatus,
      statusLabel: statusLabel || labelFromBookableStatus(bookableStatus),
      role,
      note
    };
  }

  function applyStaffStatus(cast) {
    if (!cast) return cast;

    const override = staffStatusMap.get(String(cast.name || "").trim());

    if (!override) {
      return {
        ...cast,
        status: cast.status || "available",
        statusLabel: cast.statusLabel || labelFromBookableStatus(cast.status || "available")
      };
    }

    return {
      ...cast,
      status: override.bookableStatus,
      statusLabel: override.statusLabel || labelFromBookableStatus(override.bookableStatus),
      role: override.role || cast.role || "",
      staffStatusNote: override.note || ""
    };
  }

  async function loadStaffStatus() {
    if (!STAFF_STATUS_CSV_URL) {
      staffStatusLoaded = true;
      return;
    }

    try {
      if (!window.TNSheet) throw new Error("TNSheet 尚未載入");

      const rawRows = await window.TNSheet.fetchCsvRows(STAFF_STATUS_CSV_URL, {
        cacheKey: "staff-status",
        ttlMs: 5 * 60 * 1000,
        normalizeHeader: normalizeKey
      });

      if (!rawRows.length) throw new Error("CSV 沒有資料列");
      const rows = rawRows.map(normalizeStaffStatusRow).filter(Boolean);
      staffStatusMap = new Map(rows.map((row) => [row.cast, row]));
      staffStatusLoaded = true;
      staffStatusError = false;
    } catch (error) {
      console.warn("Google Sheet 人員狀態讀取失敗，將暫時使用 cast-data.js 的 status / statusLabel。", error);
      staffStatusMap = new Map();
      staffStatusLoaded = true;
      staffStatusError = true;
    }
  }

  async function loadSchedule() {
    if (!SCHEDULE_CSV_URL) {
      scheduleLoaded = true;
      render();
      return;
    }

    try {
      if (!window.TNSheet) throw new Error("TNSheet 尚未載入");

      const rawRows = await window.TNSheet.fetchCsvRows(SCHEDULE_CSV_URL, {
        cacheKey: "schedule",
        ttlMs: 5 * 60 * 1000,
        normalizeHeader: normalizeKey
      });

      if (!rawRows.length) throw new Error("CSV 沒有資料列");
      scheduleRows = rawRows.map(normalizeScheduleRow).filter(Boolean);
      scheduleLoaded = true;
      scheduleError = false;
    } catch (error) {
      console.warn("首頁推薦：Google Sheet 班表讀取失敗。", error);
      scheduleRows = [];
      scheduleLoaded = true;
      scheduleError = true;
    }

    render();
  }

  function getTodaySchedule(castName) {
    const today = todayDateText();
    const rows = scheduleRows.filter((row) => row.date === today && row.cast === castName);

    if (!rows.length) return null;

    // 同一天同一位公關若有多筆，優先順序：available > pending > rest。
    return (
      rows.find((row) => row.status === "available") ||
      rows.find((row) => row.status === "pending") ||
      rows.find((row) => row.status === "rest") ||
      rows[0]
    );
  }

  function todayText(castName) {
    if (!scheduleLoaded) return "班表讀取中";
    if (scheduleError) return "班表未更新";

    const row = getTodaySchedule(castName);

    if (!row || row.status === "rest") return "今日未出勤";
    if (row.status === "available") return `今日出勤｜${row.start}–${row.end}`;
    if (row.status === "pending") return `今日詢問制｜${row.start}–${row.end}`;
    if (row.status === "unbookable") return `今日出勤｜${row.start}–${row.end}`;

    return "今日未出勤";
  }

  function todayClass(castName) {
    if (!scheduleLoaded) return "";
    if (scheduleError) return "pending";

    const row = getTodaySchedule(castName);

    if (!row || row.status === "rest") return "rest";
    if (row.status === "pending") return "pending";
    if (row.status === "unbookable") return "";
    return "";
  }

  function statusClass(cast) {
    if (cast.status === "pending") return "pending";
    if (cast.status === "rest") return "rest";
    if (cast.status === "unbookable") return "rest unbookable";
    return "";
  }

  function imagePath(cast) {
    return String(cast.image || cast.photo || "")
      .trim()
      .replace(/^\.\//, "")
      .replace(/^\//, "");
  }

  function dateSeed() {
    const now = new Date();
    return Number(
      `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`
    );
  }

  function rotateList(list, seed) {
    if (!list.length) return [];
    const start = seed % list.length;
    return list.slice(start).concat(list.slice(0, start));
  }

  function pickFeaturedCasts() {
    // 首頁推薦預設只推薦可被指名或詢問制的人員。
    // unbookable 人員仍可出現在公關介紹頁，但不會自動進入首頁推薦。
    const effectiveCasts = casts.map((cast) => applyStaffStatus(cast));
    const usable = effectiveCasts.filter((cast) => cast.status !== "rest" && cast.status !== "unbookable");
    const source = usable.length ? usable : effectiveCasts;

    if (!source.length) return [];

    // 手動指定模式：
    // window.FEATURE_CONFIG = { mode: "manual", count: 3, names: ["月鈴", "星紗", "夜璃"] };
    if (config.mode === "manual" && Array.isArray(config.names) && config.names.length) {
      const manual = config.names
        .map((name) => source.find((cast) => cast.name === name))
        .filter(Boolean);

      if (manual.length) return manual.slice(0, count);
    }

    // today 模式：今日有出勤者優先；沒有則每日輪替。
    if (config.mode === "today" && scheduleLoaded && !scheduleError) {
      const todayNames = scheduleRows
        .filter((row) => row.date === todayDateText() && row.status === "available")
        .map((row) => row.cast);

      const todayCasts = source.filter((cast) => todayNames.includes(cast.name));
      if (todayCasts.length) return todayCasts.slice(0, count);
    }

    // daily 模式：每日輪替，但仍顯示 Sheet 今日狀態。
    return rotateList(source, dateSeed()).slice(0, count);
  }

  function createTags(tags) {
    if (!Array.isArray(tags)) return "";
    return tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
  }

  function actionButtons(cast) {
    const todayRow = getTodaySchedule(cast.name);
    const bookingUrl = `booking.html?cast=${encodeURIComponent(cast.name)}`;
    const inquiryUrl = `booking.html?cast=${encodeURIComponent(cast.name)}&mode=inquiry`;

    // unbookable 代表可展示、可顯示今日出勤，但不開放指名。
    // 這個狀態優先讀取 Google Sheet staff_status。
    if (cast.status === "unbookable") {
      return `
        <span class="btn cast-link-disabled">不接受指名</span>
        <a class="btn" href="cast.html">完整介紹</a>
      `;
    }

    if (scheduleLoaded && !scheduleError && todayRow?.status === "available" && cast.status === "available") {
      return `
        <a class="btn primary" href="${bookingUrl}">今日預約</a>
        <a class="btn" href="cast.html">完整介紹</a>
      `;
    }

    if (scheduleLoaded && !scheduleError && (todayRow?.status === "pending" || cast.status === "pending")) {
      return `
        <a class="btn primary" href="${inquiryUrl}">詢問今日排班</a>
        <a class="btn" href="cast.html">完整介紹</a>
      `;
    }

    return `
      <a class="btn primary" href="${bookingUrl}">查詢其他日期</a>
      <a class="btn" href="cast.html">完整介紹</a>
    `;
  }

  function createCard(cast) {
    const name = cast.name || "未命名公關";
    const img = imagePath(cast);
    const shortDesc = cast.shortDesc || cast.desc || "這位公關尚未填寫簡介。";
    const quote = cast.quote || "";
    const statusLabel = cast.statusLabel || "接受指名";
    const todayLineClass = todayClass(name);

    return `
      <article class="card staff-card featured-card">
        <div class="staff-img">
          <img
            class="staff-photo"
            src="${escapeHtml(img)}"
            alt="${escapeHtml(name)} 的公關照片"
            width="900"
            height="1600"
            loading="lazy"
            decoding="async"
            onerror="this.style.display='none'; this.nextElementSibling.style.display='grid';"
          />
          <div class="staff-photo-fallback">
            <span>${escapeHtml(name)}</span>
            <small>圖片路徑錯誤或尚未放置圖片</small>
          </div>
        </div>

        <div class="staff-body">
          <div class="cast-name-row">
            <h3>${escapeHtml(name)}</h3>
            <span class="status ${escapeHtml(statusClass(cast))}">${escapeHtml(statusLabel)}</span>
          </div>

          <div class="today-line ${escapeHtml(todayLineClass)}">${escapeHtml(todayText(name))}</div>

          <p>${escapeHtml(shortDesc)}</p>

          <div class="tag-row">
            ${createTags(cast.tags)}
          </div>

          ${quote ? `<p>「${escapeHtml(quote)}」</p>` : ""}

          <div class="featured-card-actions">
            ${actionButtons(cast)}
          </div>
        </div>
      </article>
    `;
  }

  function render() {
    const featured = pickFeaturedCasts();

    if (!featured.length) {
      grid.innerHTML = `
        <div class="empty-cast-box">
          目前尚未設定公關資料。請確認 js/cast-data.js 是否已載入，且 window.allCasts 裡有資料。
        </div>
      `;
      return;
    }

    grid.innerHTML = featured.map(createCard).join("");
  }

  // 先渲染一次，讓頁面不會空白；再讀 Sheet 更新狀態。
  render();

  Promise.all([loadSchedule(), loadStaffStatus()]).then(() => {
    render();
  });
})();
