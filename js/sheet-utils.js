// sheet-utils.js
// 共用 Google Sheet CSV 讀取工具：CSV 解析、表頭轉換、短時間快取與失敗備援。

(function () {
  const CACHE_PREFIX = "twelfthNightSheetCache:";
  const DEFAULT_TTL_MS = 5 * 60 * 1000;

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

  function defaultHeader(value) {
    return String(value || "").trim().toLowerCase();
  }

  function rowsFromCsv(text, options = {}) {
    const normalizeHeader = options.normalizeHeader || defaultHeader;
    const table = parseCsv(text);
    if (table.length < 2) return [];

    const headers = table[0].map(normalizeHeader);
    return table.slice(1).map((cols) => {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = cols[index] || "";
      });
      return row;
    });
  }

  function hashText(value) {
    let hash = 5381;
    const text = String(value || "");
    for (let i = 0; i < text.length; i += 1) {
      hash = ((hash << 5) + hash) + text.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }

  function cacheKeyFor(url, cacheKey) {
    return `${CACHE_PREFIX}${cacheKey || hashText(url)}`;
  }

  function readCache(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.text !== "string") return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function writeCache(key, text) {
    try {
      localStorage.setItem(key, JSON.stringify({
        savedAt: Date.now(),
        text
      }));
    } catch {
      // localStorage 可能被停用或容量不足；忽略即可，正常 fetch 仍可運作。
    }
  }

  function isFresh(cache, ttlMs) {
    return Boolean(cache && cache.savedAt && Date.now() - Number(cache.savedAt) < ttlMs);
  }

  async function fetchCsvText(url, options = {}) {
    if (!url) return "";

    const ttlMs = Number(options.ttlMs || DEFAULT_TTL_MS);
    const key = cacheKeyFor(url, options.cacheKey);
    const cached = readCache(key);

    if (!options.forceRefresh && isFresh(cached, ttlMs)) {
      return cached.text;
    }

    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const text = await response.text();
      writeCache(key, text);
      return text;
    } catch (error) {
      if (cached?.text) {
        console.warn("Google Sheet 讀取失敗，暫時使用本機快取。", error);
        return cached.text;
      }
      throw error;
    }
  }

  async function fetchCsvRows(url, options = {}) {
    const text = await fetchCsvText(url, options);
    return rowsFromCsv(text, options);
  }

  window.TNSheet = {
    parseCsv,
    rowsFromCsv,
    fetchCsvText,
    fetchCsvRows
  };
})();
