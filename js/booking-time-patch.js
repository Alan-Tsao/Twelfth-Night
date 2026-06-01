// booking-time-patch.js
// 用途：保留既有 js/booking.js 的公關排班、詢問模式、Google 表單設定，
// 只補強「預約開始時間 + 預約節數」的時段計算與送出內容。
// 載入順序：請放在 js/booking.js 後面。

(function () {
  const GOOGLE_FORM_ACTION = "https://docs.google.com/forms/d/e/1FAIpQLSeBaSem6rf9xXVzHfusmdccy8ih2CWNUovdMfuCNaMS2og9mQ/formResponse";

  const GOOGLE_FORM_FIELDS = {
    discordId: "entry.1545709974",
    playerName: "entry.1718936699",
    serverName: "entry.750062138",
    guestCount: "entry.999763483",
    bookingDate: "entry.975020306",
    bookingTime: "entry.361264469",
    sessionCount: "entry.1283018425",
    castNames: "entry.1254505299",
    serviceType: "entry.356715083",
    notes: "entry.467701533"
  };

  function $(id) {
    return document.getElementById(id);
  }

  function value(id) {
    const el = $(id);
    return el ? String(el.value || "").trim() : "";
  }

  function sessionLabel() {
    const count = Number(value("sessionCount"));
    if (!Number.isFinite(count) || count <= 0) return "";
    return `${count} 節，${count * 30} 分鐘`;
  }

  function guestLabel() {
    const count = value("guestCount");
    if (!count) return "";
    return `${count} 人`;
  }

  function selectedCasts() {
    return Array.from(document.querySelectorAll("input[name='casts']:checked")).map((item) => item.value);
  }

  function addMinutesToTime(timeText, minutes) {
    if (!timeText || timeText.includes("其他") || !timeText.includes(":") || !minutes) return "";

    const parts = timeText.split(":").map(Number);
    const hour = parts[0];
    const minute = parts[1];

    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return "";

    const startTotal = hour * 60 + minute;
    const endTotal = startTotal + minutes;
    const endHourRaw = Math.floor(endTotal / 60);
    const endHour = endHourRaw % 24;
    const endMinute = endTotal % 60;
    const nextDayText = endTotal >= 1440 ? "（翌日）" : "";

    return `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}${nextDayText}`;
  }

  function bookingTimeLabel() {
    const start = value("bookingTime");
    const count = Number(value("sessionCount"));
    const minutes = Number.isFinite(count) ? count * 30 : 0;

    if (!start) return "";
    if (start.includes("其他")) return start;

    const end = addMinutesToTime(start, minutes);
    if (!end) return `${start} 開始`;

    return `${start}–${end}`;
  }

  function updateTimePreview() {
    const preview = $("timePreview");
    if (!preview) return;

    const text = bookingTimeLabel();
    if (!text) {
      preview.textContent = "選擇開始時間與節數後，系統會自動顯示預計時段。";
      return;
    }

    preview.textContent = `預計預約時段：${text}。實際是否可安排仍以接待確認為準。`;
  }

  function generateSummary() {
    const casts = selectedCasts();

    const summary = `【第十二夜【盛會】預約申請】

遊戲 ID：${value("playerName") || "未填寫"}
伺服器：${value("serverName") || "未填寫"}
Discord ID：${value("discordId") || "未填寫"}
預約人數：${guestLabel() || "未填寫"}

希望安排公關：${casts.join("、") || "未填寫"}
預約日期：${value("bookingDate") || "未填寫"}
預約時段：${bookingTimeLabel() || "未填寫"}
預約節數：${sessionLabel() || "未填寫"}
服務項目：${value("serviceType") || "未填寫"}

其他需求：
${value("notes") || "無"}

※ 此預約申請送出後，仍需等待接待確認才算預約成立。`;

    const box = $("summaryBox");
    if (box) box.textContent = summary;

    return summary;
  }

  function validateBeforeSubmit() {
    const required = ["playerName", "serverName", "discordId", "guestCount", "bookingDate", "bookingTime", "serviceType", "sessionCount"];
    const okFields = required.every((id) => value(id) !== "");
    const okCasts = selectedCasts().length > 0;

    if ((!okFields || !okCasts) && $("step3Error")) {
      $("step3Error").classList.add("show");
    }

    return okFields && okCasts;
  }

  function submitToGoogleForm() {
    if (!validateBeforeSubmit()) return;

    generateSummary();

    const form = document.createElement("form");
    form.action = GOOGLE_FORM_ACTION;
    form.method = "POST";
    form.target = "hiddenGoogleFrame";
    form.style.display = "none";

    const data = {
      [GOOGLE_FORM_FIELDS.discordId]: value("discordId"),
      [GOOGLE_FORM_FIELDS.playerName]: value("playerName"),
      [GOOGLE_FORM_FIELDS.serverName]: value("serverName"),
      [GOOGLE_FORM_FIELDS.guestCount]: guestLabel(),
      [GOOGLE_FORM_FIELDS.bookingDate]: value("bookingDate"),
      [GOOGLE_FORM_FIELDS.bookingTime]: bookingTimeLabel(),
      [GOOGLE_FORM_FIELDS.sessionCount]: sessionLabel(),
      [GOOGLE_FORM_FIELDS.castNames]: selectedCasts().join("、"),
      [GOOGLE_FORM_FIELDS.serviceType]: value("serviceType"),
      [GOOGLE_FORM_FIELDS.notes]: value("notes") || "無"
    };

    Object.entries(data).forEach(([name, val]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = val;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
    form.remove();

    const success = $("submitSuccess");
    if (success) success.classList.add("show");
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("bookingTime")?.addEventListener("change", updateTimePreview);
    $("sessionCount")?.addEventListener("change", updateTimePreview);

    const step3Next = document.querySelector('[data-step="3"] [data-next]');
    if (step3Next) {
      step3Next.addEventListener("click", () => {
        setTimeout(() => {
          updateTimePreview();
          generateSummary();
        }, 0);
      });
    }

    const copyBtn = $("copyBtn");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        generateSummary();
      }, true);
    }

    const submitBtn = $("submitGoogleBtn");
    if (submitBtn) {
      submitBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        submitToGoogleForm();
      }, true);
    }

    updateTimePreview();
  });
})();
