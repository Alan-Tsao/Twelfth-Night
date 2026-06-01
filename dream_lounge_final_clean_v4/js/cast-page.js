// cast-page.js
// 用途：渲染 cast.html 的完整公關介紹頁。
// 修正重點：
// 1. 公關照片改用 <img src="..."> 顯示。
// 2. 公關固定資料仍讀取 cast-data.js 的 window.allCasts。
// 3. 「今日出勤」小標籤改讀 Google Sheet 班表 CSV，只顯示今日狀態，不把公關介紹頁變成完整班表頁。
// 4. 支援 cast-data.js 的 status: "unbookable" / statusLabel: "不接受指名"。

(function () {
  // Google Sheet 班表 CSV
  // 欄位格式：date,cast,start,end,status,note
  const SCHEDULE_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRKYIls0ZbPLmj4e43Hpp82EDPS8FpOQvbG3N-LaNP5XgLVdV55ZMHclNwb_SgfdTI9XzkL19OFB2zP/pub?gid=0&single=true&output=csv";

  let scheduleRows = [];
  let scheduleLoaded = false;
  let scheduleError = false;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  function todayDateText() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function normalizeKey(value) {
    return String(value || "").trim().toLowerCase();
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let quote = false;

    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      const next = text[i + 1];

      if (ch === '"') {
        if (quote && next === '"') {
          cell += '"';
          i += 1;
        } else {
          quote = !quote;
        }
        continue;
      }

      if (ch === "," && !quote) {
        row.push(cell);
        cell = "";
        continue;
      }

      if ((ch === "\n" || ch === "\r") && !quote) {
        if (ch === "\r" && next === "\n") i += 1;
        row.push(cell);
        if (row.some((item) => String(item).trim() !== "")) rows.push(row);
        row = [];
        cell = "";
        continue;
      }

      cell += ch;
    }

    row.push(cell);
    if (row.some((item) => String(item).trim() !== "")) rows.push(row);
    return rows;
  }

  function normalizeScheduleRow(row) {
    const date = String(row.date || "").trim();
    const cast = String(row.cast || "").trim();
    const start = String(row.start || "").trim();
    const end = String(row.end || "").trim();
    const status = String(row.status || "").trim().toLowerCase();
    const note = String(row.note || "").trim();

    if (!date || !cast || !start || !end || !status) return null;
    if (!["available", "pending", "rest"].includes(status)) return null;

    return { date, cast, start, end, status, note };
  }

  async function loadSchedule() {
    if (!SCHEDULE_CSV_URL) {
      scheduleLoaded = true;
      return;
    }

    try {
      const response = await fetch(SCHEDULE_CSV_URL, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const text = await response.text();
      const table = parseCsv(text);

      if (table.length < 2) throw new Error("CSV 沒有資料列");

      const headers = table[0].map(normalizeKey);
      const rawRows = table.slice(1).map((cols) => {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = cols[index] || "";
        });
        return obj;
      });

      scheduleRows = rawRows.map(normalizeScheduleRow).filter(Boolean);
      scheduleLoaded = true;
      scheduleError = false;
    } catch (error) {
      console.warn("Google Sheet 班表讀取失敗，公關介紹頁今日狀態會顯示班表未更新。", error);
      scheduleRows = [];
      scheduleLoaded = true;
      scheduleError = true;
    }

    updateTodayBadges();
    filter();
  }

  function getTodaySchedule(castName) {
    const today = todayDateText();
    const rows = scheduleRows.filter((row) => row.date === today && row.cast === castName);

    if (!rows.length) return null;

    // 同一天同一位公關如果有多筆，優先順序：available > pending > rest。
    return (
      rows.find((row) => row.status === "available") ||
      rows.find((row) => row.status === "pending") ||
      rows.find((row) => row.status === "rest") ||
      rows[0]
    );
  }

  function todayTextFromSchedule(castName) {
    if (!scheduleLoaded) return "班表讀取中";
    if (scheduleError) return "班表未更新";

    const row = getTodaySchedule(castName);

    if (!row || row.status === "rest") return "今日未出勤";

    if (row.status === "available") {
      return `今日出勤｜${row.start}–${row.end}`;
    }

    if (row.status === "pending") {
      return `今日詢問制｜${row.start}–${row.end}`;
    }

    return "今日未出勤";
  }

  function todayDatasetFromSchedule(castName) {
    if (!scheduleLoaded || scheduleError) return "";

    const row = getTodaySchedule(castName);

    if (!row || row.status === "rest") return "";
    return "today";
  }

  function todayLineClassFromSchedule(castName) {
    if (!scheduleLoaded) return "";
    if (scheduleError) return "pending";

    const row = getTodaySchedule(castName);

    if (!row || row.status === "rest") return "rest";
    if (row.status === "pending") return "pending";
    return "";
  }

  function days(dayList) {
    const labels = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];
    return (dayList || []).map((day) => labels[day]).join("、") || "未設定";
  }

  function statusClass(cast) {
    if (cast.status === "pending") return "pending";
    if (cast.status === "rest") return "rest";
    if (cast.status === "unbookable") return "rest unbookable";
    return "";
  }

  function buttonHtml(cast) {
    const todayRow = getTodaySchedule(cast.name);
    const bookingUrl = `booking.html?cast=${encodeURIComponent(cast.name)}`;
    const inquiryUrl = `booking.html?cast=${encodeURIComponent(cast.name)}&mode=inquiry`;

    // unbookable 代表這位人員可展示、可顯示今日出勤，但不開放客人指名。
    // 例如：服裝店店員、接待、攝影師、樂師等。
    if (cast.status === "unbookable") {
      return `<span class="btn cast-link-disabled">不接受指名</span>`;
    }

    if (scheduleLoaded && !scheduleError && todayRow?.status === "available" && cast.status === "available") {
      return `<a class="btn primary" href="${bookingUrl}">今日預約</a>`;
    }

    if (scheduleLoaded && !scheduleError && (todayRow?.status === "pending" || cast.status === "pending")) {
      return `<a class="btn" href="${inquiryUrl}">詢問今日排班</a>`;
    }

    if (cast.status === "available") {
      return `<a class="btn" href="${bookingUrl}">查詢其他日期</a>`;
    }

    if (cast.status === "pending") {
      return `<a class="btn" href="${inquiryUrl}">詢問排班</a>`;
    }

    return `<span class="btn cast-link-disabled">暫停指名</span>`;
  }

  function imagePath(cast) {
    const rawPath = cast.image || cast.photo || "";
    if (!rawPath) return "";
    return String(rawPath).replace(/^\.\//, "").replace(/^\//, "");
  }

  function extraServicesText(cast) {
    if (!Array.isArray(cast.extraServices) || !cast.extraServices.length) return "";
    return cast.extraServices.join("、");
  }

  function render() {
    const grid = document.getElementById("castGrid");
    if (!grid) return;

    grid.innerHTML = (window.allCasts || [])
      .map((cast) => {
        const keywordText = [
          cast.name,
          cast.quote,
          cast.desc,
          (cast.tags || []).join(" "),
          cast.recommended,
          (cast.extraServices || []).join(" "),
          cast.statusLabel,
          days(cast.workDays)
        ].join(" ");

        const img = imagePath(cast);
        const tagsHtml = (cast.tags || [])
          .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
          .join("");

        return `
          <article class="card cast-card-profile"
            data-cast-name="${escapeHtml(cast.name)}"
            data-status="${escapeHtml(cast.status)}"
            data-tags="${escapeHtml((cast.filterTags || []).join(" "))}"
            data-today=""
            data-keywords="${escapeHtml(keywordText)}">

            <div class="cast-img">
              <img
                class="cast-photo"
                src="${escapeHtml(img)}"
                alt="${escapeHtml(cast.name)} 的公關照片"
                loading="lazy"
              />
              <div class="cast-photo-fallback">
                <span>${escapeHtml(cast.name)}</span>
                <small>圖片路徑錯誤或尚未放置圖片</small>
              </div>
            </div>

            <div class="cast-body">
              <div class="cast-name-row">
                <h2>${escapeHtml(cast.name)}</h2>
                <span class="status ${statusClass(cast)}">${escapeHtml(cast.statusLabel)}</span>
              </div>

              <div class="today-line" data-today-line>${escapeHtml(todayTextFromSchedule(cast.name))}</div>
              <p>「${escapeHtml(cast.quote || "")}」</p>
              <p class="featured-note">${escapeHtml(cast.desc || "")}</p>

              <div class="tag-row">${tagsHtml}</div>

              <div class="meta">
                <div><strong>常駐時段：</strong>${escapeHtml(days(cast.workDays))}</div>
                <div><strong>推薦服務：</strong>${escapeHtml(cast.recommended || "未設定")}</div>
                ${extraServicesText(cast) ? `<div><strong>個人加購：</strong>${escapeHtml(extraServicesText(cast))}</div>` : ""}
              </div>

              <div class="cta-row" data-cast-actions>${buttonHtml(cast)}</div>
            </div>
          </article>
        `;
      })
      .join("");

    grid.querySelectorAll(".cast-photo").forEach((img) => {
      img.addEventListener("error", () => {
        img.style.display = "none";
        const fallback = img.nextElementSibling;
        if (fallback) fallback.style.display = "grid";
      });
    });
  }

  function updateTodayBadges() {
    document.querySelectorAll(".cast-card-profile").forEach((card) => {
      const castName = card.dataset.castName || "";
      const cast = (window.allCasts || []).find((item) => item.name === castName);
      const line = card.querySelector("[data-today-line]");
      const actions = card.querySelector("[data-cast-actions]");

      card.dataset.today = todayDatasetFromSchedule(castName);

      if (line) {
        line.textContent = todayTextFromSchedule(castName);
        line.classList.remove("pending", "rest");
        const todayClass = todayLineClassFromSchedule(castName);
        if (todayClass) line.classList.add(todayClass);
      }

      if (actions && cast) {
        actions.innerHTML = buttonHtml(cast);
      }
    });
  }

  function filter() {
    const activeButton = document.querySelector(".filter-btn.active");
    const filterValue = activeButton?.dataset.filter || "all";
    const keyword = normalize(document.getElementById("castSearch")?.value || "");
    let count = 0;

    document.querySelectorAll(".cast-card-profile").forEach((card) => {
      const matchesFilter =
        filterValue === "all" ||
        normalize(card.dataset.tags).includes(filterValue) ||
        normalize(card.dataset.status) === filterValue ||
        normalize(card.dataset.today) === filterValue;

      const matchesKeyword = keyword === "" || normalize(card.dataset.keywords).includes(keyword);
      const shouldShow = matchesFilter && matchesKeyword;

      card.style.display = shouldShow ? "block" : "none";
      if (shouldShow) count += 1;
    });

    document.getElementById("emptyState")?.classList.toggle("show", count === 0);
  }

  document.querySelectorAll(".filter-btn").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      filter();
    });
  });

  document.getElementById("castSearch")?.addEventListener("input", filter);

  render();
  filter();
  loadSchedule();
})();
