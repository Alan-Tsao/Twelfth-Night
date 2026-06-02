// announcements.js
// 用途：首頁公告區，讀取 Google Sheet announcements 分頁。
// 建議欄位：date,type,title,content,linkText,linkUrl,pinned,visible

(function () {
  const ANNOUNCEMENTS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRKYIls0ZbPLmj4e43Hpp82EDPS8FpOQvbG3N-LaNP5XgLVdV55ZMHclNwb_SgfdTI9XzkL19OFB2zP/pub?gid=1649492150&single=true&output=csv";
  const MAX_ITEMS = 5;

  const grid = document.getElementById("announcementGrid");
  const section = document.getElementById("announcements");
  if (!grid || !section) return;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizeKey(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, "");
  }

  function yes(value) {
    const v = String(value || "").trim().toLowerCase();
    return ["yes", "y", "true", "1", "是", "置頂", "顯示"].includes(v);
  }

  function visible(value) {
    const v = String(value || "").trim().toLowerCase();
    if (!v) return true;
    return !["no", "n", "false", "0", "否", "隱藏", "hidden"].includes(v);
  }

  function parseDateValue(value) {
    const raw = String(value || "").trim();
    if (!raw) return 0;
    const time = new Date(raw.replaceAll("/", "-")).getTime();
    return Number.isFinite(time) ? time : 0;
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

  function normalizeAnnouncement(row) {
    const title = String(row.title || row.標題 || "").trim();
    const content = String(row.content || row.內容 || "").trim();

    if (!title && !content) return null;
    if (!visible(row.visible || row.顯示)) return null;

    return {
      date: String(row.date || row.日期 || "").trim(),
      type: String(row.type || row.類型 || "公告").trim(),
      title: title || "未命名公告",
      content,
      linkText: String(row.linktext || row.linkText || row.連結文字 || "").trim(),
      linkUrl: String(row.linkurl || row.linkUrl || row.連結 || "").trim(),
      pinned: yes(row.pinned || row.置頂),
      sortTime: parseDateValue(row.date || row.日期)
    };
  }

  function cardHtml(item) {
    const link = item.linkText && item.linkUrl
      ? `<a class="btn" href="${escapeHtml(item.linkUrl)}">${escapeHtml(item.linkText)}</a>`
      : "";

    return `
      <article class="announcement-card ${item.pinned ? "pinned" : ""}">
        <div class="announcement-type">${escapeHtml(item.pinned ? "置頂・" + item.type : item.type)}</div>
        <h3>${escapeHtml(item.title)}</h3>
        ${item.date ? `<div class="announcement-date">${escapeHtml(item.date)}</div>` : ""}
        ${item.content ? `<p>${escapeHtml(item.content)}</p>` : ""}
        ${link}
      </article>
    `;
  }

  function render(items) {
    if (!items.length) {
      section.style.display = "none";
      return;
    }

    const sorted = items
      .slice()
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.sortTime - a.sortTime)
      .slice(0, MAX_ITEMS);

    grid.innerHTML = sorted.map(cardHtml).join("");
  }

  async function loadAnnouncements() {
    try {
      const url = `${ANNOUNCEMENTS_CSV_URL}&t=${Date.now()}`;
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const text = await response.text();
      const table = parseCsv(text);
      if (table.length < 2) throw new Error("CSV 沒有資料列");

      const headers = table[0].map(normalizeKey);
      const rows = table.slice(1).map((cols) => {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = cols[index] || "";
        });
        return obj;
      });

      render(rows.map(normalizeAnnouncement).filter(Boolean));
    } catch (error) {
      console.warn("首頁公告讀取失敗。", error);
      grid.innerHTML = `
        <div class="announcement-card announcement-empty">
          <div class="announcement-type">NOTICE</div>
          <h3>公告暫時無法讀取</h3>
          <p>請稍後重新整理，或至 Discord 查看最新消息。</p>
        </div>
      `;
    }
  }

  loadAnnouncements();
})();
