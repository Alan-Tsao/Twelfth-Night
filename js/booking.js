function escapeHtml(v){return String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}

// Google 表單送出設定
const GOOGLE_FORM_ACTION="https://docs.google.com/forms/d/e/1FAIpQLSeBaSem6rf9xXVzHfusmdccy8ih2CWNUovdMfuCNaMS2og9mQ/formResponse";
const F={discordId:"entry.1545709974",playerName:"entry.1718936699",serverName:"entry.750062138",guestCount:"entry.999763483",bookingDate:"entry.975020306",bookingTime:"entry.361264469",sessionCount:"entry.1283018425",castNames:"entry.1254505299",serviceType:"entry.356715083",notes:"entry.467701533"};

// Google Sheet 班表 CSV
// 欄位格式：date,cast,start,end,status,note
// 注意：Google Sheet schedule 的 available 代表「有出勤」；是否可被指名優先由 staff_status 判斷，讀取失敗才用 cast-data.js。
const SCHEDULE_CSV_URL="https://docs.google.com/spreadsheets/d/e/2PACX-1vRKYIls0ZbPLmj4e43Hpp82EDPS8FpOQvbG3N-LaNP5XgLVdV55ZMHclNwb_SgfdTI9XzkL19OFB2zP/pub?gid=0&single=true&output=csv";
const STAFF_STATUS_CSV_URL="https://docs.google.com/spreadsheets/d/e/2PACX-1vRKYIls0ZbPLmj4e43Hpp82EDPS8FpOQvbG3N-LaNP5XgLVdV55ZMHclNwb_SgfdTI9XzkL19OFB2zP/pub?gid=1310958925&single=true&output=csv";

const params=new URLSearchParams(location.search);
const mode=params.get("mode")==="inquiry"?"inquiry":"booking";
const pref=(params.get("casts")?params.get("casts").split(","):params.get("cast")?[params.get("cast")]:[]).map(x=>x.trim()).filter(Boolean);

let step=1;
let scheduleRows=[];
let scheduleLoaded=false;
let scheduleError=false;
let staffStatusMap=new Map();
let staffStatusLoaded=false;
let staffStatusError=false;

function v(id){return document.getElementById(id)?.value.trim()||""}
function err(id,on){document.getElementById(id)?.classList.toggle("show",on)}

function show(s){
  step=s;
  document.querySelectorAll(".form-step").forEach(x=>x.classList.toggle("active",Number(x.dataset.step)===s));
  document.querySelectorAll("[data-step-pill]").forEach(x=>x.classList.toggle("active",Number(x.dataset.stepPill)===s));
  scrollTo({top:0,behavior:"smooth"});
}

function day(date){
  if(!date)return null;
  const[a,b,c]=date.split("-").map(Number);
  return new Date(a,b-1,c).getDay();
}

function work(c,date){
  const d=day(date);
  return d!==null&&(c.workDays||[]).includes(d);
}

function selected(){
  return Array.from(document.querySelectorAll("input[name='casts']:checked")).map(x=>x.value);
}

function normalizeKey(s){
  return String(s||"").trim().toLowerCase();
}

function parseCsv(text){
  const rows=[];
  let row=[],cell="",quote=false;

  for(let i=0;i<text.length;i++){
    const ch=text[i];
    const next=text[i+1];

    if(ch==='"'){
      if(quote && next==='"'){
        cell+='"';
        i++;
      }else{
        quote=!quote;
      }
      continue;
    }

    if(ch==="," && !quote){
      row.push(cell);
      cell="";
      continue;
    }

    if((ch==="\n" || ch==="\r") && !quote){
      if(ch==="\r" && next==="\n") i++;
      row.push(cell);
      if(row.some(x=>String(x).trim()!=="")) rows.push(row);
      row=[];
      cell="";
      continue;
    }

    cell+=ch;
  }

  row.push(cell);
  if(row.some(x=>String(x).trim()!=="")) rows.push(row);
  return rows;
}

function normalizeScheduleRow(row){
  const date=String(row.date||"").trim();
  const cast=String(row.cast||"").trim();
  const start=String(row.start||"").trim();
  const end=String(row.end||"").trim();
  const status=String(row.status||"").trim().toLowerCase();
  const note=String(row.note||"").trim();

  if(!date || !cast || !start || !end || !status) return null;
  if(!["available","pending","unbookable","rest"].includes(status)) return null;

  return {date,cast,start,end,status,note};
}

function labelFromBookableStatus(status){
  if(status==="available")return"接受指名";
  if(status==="pending")return"排班確認中";
  if(status==="unbookable")return"不接受指名";
  if(status==="rest")return"暫停服務";
  return"接受指名";
}

function normalizeStaffStatusRow(row){
  const cast=String(row.cast||"").trim();
  const bookableStatus=String(row.bookablestatus||row.bookableStatus||"").trim().toLowerCase();
  const statusLabel=String(row.statuslabel||row.statusLabel||"").trim();
  const role=String(row.role||"").trim();
  const note=String(row.note||"").trim();

  if(!cast || !bookableStatus)return null;
  if(!["available","pending","unbookable","rest"].includes(bookableStatus))return null;

  return {cast,bookableStatus,statusLabel:statusLabel||labelFromBookableStatus(bookableStatus),role,note};
}

function applyStaffStatus(cast){
  if(!cast)return cast;
  const override=staffStatusMap.get(String(cast.name||"").trim());

  if(!override){
    return {
      ...cast,
      status:cast.status||"available",
      statusLabel:cast.statusLabel||labelFromBookableStatus(cast.status||"available")
    };
  }

  return {
    ...cast,
    status:override.bookableStatus,
    statusLabel:override.statusLabel||labelFromBookableStatus(override.bookableStatus),
    role:override.role||cast.role||"",
    staffStatusNote:override.note||""
  };
}

async function loadStaffStatus(){
  if(!STAFF_STATUS_CSV_URL){
    staffStatusLoaded=true;
    return;
  }

  try{
    const response=await fetch(STAFF_STATUS_CSV_URL,{cache:"no-store"});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);

    const text=await response.text();
    const table=parseCsv(text);

    if(table.length<2)throw new Error("CSV 沒有資料列");

    const headers=table[0].map(normalizeKey);
    const rawRows=table.slice(1).map(cols=>{
      const obj={};
      headers.forEach((h,i)=>obj[h]=cols[i]||"");
      return obj;
    });

    const rows=rawRows.map(normalizeStaffStatusRow).filter(Boolean);
    staffStatusMap=new Map(rows.map(row=>[row.cast,row]));
    staffStatusLoaded=true;
    staffStatusError=false;
  }catch(error){
    console.warn("Google Sheet 人員狀態讀取失敗，將暫時使用 cast-data.js 的 status / statusLabel。",error);
    staffStatusMap=new Map();
    staffStatusLoaded=true;
    staffStatusError=true;
  }

  renderCastOptions();
}

async function loadSchedule(){
  if(!SCHEDULE_CSV_URL) {
    scheduleLoaded=true;
    return;
  }

  try{
    const response=await fetch(SCHEDULE_CSV_URL,{cache:"no-store"});
    if(!response.ok) throw new Error(`HTTP ${response.status}`);

    const text=await response.text();
    const table=parseCsv(text);

    if(table.length<2) throw new Error("CSV 沒有資料列");

    const headers=table[0].map(normalizeKey);
    const rawRows=table.slice(1).map(cols=>{
      const obj={};
      headers.forEach((h,i)=>obj[h]=cols[i]||"");
      return obj;
    });

    scheduleRows=rawRows.map(normalizeScheduleRow).filter(Boolean);
    scheduleLoaded=true;
    scheduleError=false;
  }catch(error){
    console.warn("Google Sheet 班表讀取失敗，將暫時使用 cast-data.js 的 workDays 備援。",error);
    scheduleRows=[];
    scheduleLoaded=true;
    scheduleError=true;
  }

  renderCastOptions();
}

function timeToMinutes(timeText){
  const raw=String(timeText||"").trim();
  if(!raw || raw.includes("其他") || !raw.includes(":")) return null;

  const parts=raw.split(":").map(Number);
  const h=parts[0];
  const m=parts[1];

  if(!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h*60+m;
}

function sessionMinutes(){
  const n=Number(v("sessionCount"));
  return Number.isFinite(n) && n>0 ? n*20 : 0;
}

function requestedRange(){
  const start=timeToMinutes(v("bookingTime"));
  const mins=sessionMinutes();

  if(start===null || !mins) return null;

  let end=start+mins;
  if(end<=start) end+=1440;

  return {start,end};
}

function rowRange(row){
  let start=timeToMinutes(row.start);
  let end=timeToMinutes(row.end);

  if(start===null || end===null) return null;

  if(end<=start) end+=1440;
  return {start,end};
}

function rowCoversRequestedTime(row){
  const req=requestedRange();
  if(!req) return true;

  const range=rowRange(row);
  if(!range) return true;

  return req.start>=range.start && req.end<=range.end;
}

function scheduleTimeText(row){
  return `${row.start}–${row.end}`;
}

function getCastInfo(name){
  const found=(window.allCasts||[]).find(c=>c.name===name)||{name,shortDesc:"",desc:"",tags:[],status:"available"};
  return applyStaffStatus(found);
}

function isDirectBookableCast(name){
  return getCastInfo(name).status === "available";
}

function isInquiryCast(name){
  return getCastInfo(name).status === "pending";
}

function isUnbookableCast(name){
  const status = getCastInfo(name).status;
  return status === "unbookable" || status === "rest";
}

function buildCastCardFromInfo(info, row){
  const scheduleText=row?`<div class="hint">出勤時段：${escapeHtml(scheduleTimeText(row))}${row.note?`｜${escapeHtml(row.note)}`:""}</div>`:"";
  return `<label class="cast-card ${pref.includes(info.name)?"selected":""}">
    <input type="checkbox" name="casts" value="${escapeHtml(info.name)}" ${pref.includes(info.name)?"checked":""}/>
    <div class="cast-name">${escapeHtml(info.name)}</div>
    <div class="cast-desc">${escapeHtml(info.shortDesc||info.desc||"")}</div>
    <div class="tag-row">${(info.tags||[]).slice(0,3).map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>
    ${scheduleText}
  </label>`;
}

function cardEvents(){
  document.querySelectorAll(".cast-card").forEach(card=>{
    const input=card.querySelector("input");
    card.onclick=e=>{
      e.preventDefault();
      input.checked=!input.checked;
      card.classList.toggle("selected",input.checked);
    };
  });
}

function renderCastOptionsFromSheet(date,box,pend,hint){
  const rowsForDate=scheduleRows.filter(r=>r.date===date && r.status!=="rest");

  // Google Sheet 的 available 只代表「有出勤」。
  // 是否能被客人指名，仍以 cast-data.js 的 status 為準。
  // available   → 可直接指名
  // pending     → 詢問制
  // unbookable  → 出勤但不接受指名，預約頁不列入可勾選名單
  const availableRows=rowsForDate.filter(r=>r.status==="available" && rowCoversRequestedTime(r) && isDirectBookableCast(r.cast));
  const pendingRows=rowsForDate.filter(r=>rowCoversRequestedTime(r) && r.status!=="unbookable" && !isUnbookableCast(r.cast) && (r.status==="pending" || isInquiryCast(r.cast)));
  const unbookableRows=rowsForDate.filter(r=>rowCoversRequestedTime(r) && (r.status==="unbookable" || isUnbookableCast(r.cast)));

  if(!rowsForDate.length){
    box.innerHTML='<div class="empty-cast-box">此日期目前沒有班表資料。可以改選其他日期，或在備註中請接待協助安排。</div>';
    pend?.classList.remove("show");
    if(hint) hint.textContent="此日期尚未有報班的公關。";
    return;
  }

  box.innerHTML=availableRows.length
    ? availableRows.map(row=>buildCastCardFromInfo(getCastInfo(row.cast),row)).join("")
    : '<div class="empty-cast-box">此日期或時段目前沒有可直接指名的公關。可以改選其他時段，或在備註中請接待協助安排。</div>';

  if(pend){
    const messages=[];

    if(pendingRows.length){
      messages.push(`詢問制公關：${pendingRows.map(row=>`${escapeHtml(row.cast)}（${escapeHtml(scheduleTimeText(row))}${row.note?`｜${escapeHtml(row.note)}`:""}）`).join("、")}。可於備註中詢問接待。`);
    }

    if(unbookableRows.length){
      messages.push(`今日出勤但不接受指名：${unbookableRows.map(row=>`${escapeHtml(row.cast)}（${escapeHtml(scheduleTimeText(row))}${row.note?`｜${escapeHtml(row.note)}`:""}）`).join("、")}。`);
    }

    if(messages.length){
      pend.classList.add("show");
      pend.innerHTML=messages.join("<br>");
    }else{
      pend.classList.remove("show");
      pend.textContent="";
    }
  }

  const availableNames=availableRows.map(r=>r.cast);
  const pendingNames=pendingRows.map(r=>r.cast);
  const miss=pref.filter(name=>!availableNames.includes(name));

  if(hint){
    if(miss.length){
      hint.textContent=`你從公關頁帶入的「${miss.join("、")}」在此日期或時段未開放直接預約。可改選日期／時段，或在備註中請接待協助確認。`;
    }else if(requestedRange()){
      hint.textContent="已依班表與你選擇的開始時間、節數篩選可接待公關。";
    }else{
      hint.textContent="已依班表顯示該日期可直接預約的公關。選擇開始時間與節數後，名單會再依時段篩選。";
    }

    if(pendingNames.length){
      hint.textContent += " 詢問制公關請寫在備註中。";
    }

    if(unbookableRows.length){
      hint.textContent += " 部分出勤人員不接受指名，已自動排除於可勾選名單。";
    }
  }
}

function renderCastOptionsFallback(date,box,pend,hint){
  const ok=(window.allCasts||[]).filter(c=>c.status==="available"&&work(c,date));
  const pending=(window.allCasts||[]).filter(c=>c.status==="pending"&&work(c,date));

  box.innerHTML=ok.length
    ? ok.map(c=>buildCastCardFromInfo(c,null)).join("")
    : '<div class="empty-cast-box">此日期目前沒有可指名公關。可以改選其他日期，或在備註中請接待協助安排。</div>';

  if(pend){
    if(pending.length){
      pend.classList.add("show");
      pend.innerHTML=`排班確認中：${pending.map(c=>escapeHtml(c.name)).join("、")}。這些公關目前不會列入可勾選名單，可於備註中詢問接待。`;
    }else{
      pend.classList.remove("show");
      pend.textContent="";
    }
  }

  const miss=pref.filter(name=>!ok.some(c=>c.name===name));
  if(hint) hint.textContent=miss.length
    ? `你從公關頁帶入的「${miss.join("、")}」在此日期未開放預約。可改選日期，或在備註中請接待協助確認。`
    : "目前使用 cast-data.js 的固定週班表備援。若 Google Sheet 班表可正常讀取，會優先使用 Google Sheet。";
}

function renderCastOptions(){
  const date=v("bookingDate");
  const box=document.getElementById("castOptions");
  const pend=document.getElementById("pendingCastBox");
  const hint=document.getElementById("castHint");

  if(!box)return;

  if(!date){
    box.innerHTML='<div class="empty-cast-box">請先選擇預約日期，系統會顯示當日可指名公關。</div>';
    pend?.classList.remove("show");
    if(hint)hint.textContent="系統會自動顯示該日期「有出勤且接受指名」的所有公關。";
    return;
  }

  if(!scheduleLoaded){
    box.innerHTML='<div class="empty-cast-box">Google Sheet 班表載入中，請稍候...</div>';
    pend?.classList.remove("show");
    if(hint)hint.textContent="正在讀取班表。";
    return;
  }

  if(scheduleError || !scheduleRows.length){
    renderCastOptionsFallback(date,box,pend,hint);
  }else{
    renderCastOptionsFromSheet(date,box,pend,hint);
  }

  cardEvents();
}

function valid(s){
  if(s===1){
    const ok=document.getElementById("agreeRules")?.checked;
    err("step1Error",!ok);
    return ok;
  }

  if(s===2){
    const ok=["playerName","serverName","discordId","guestCount"].every(id=>v(id));
    err("step2Error",!ok);
    return ok;
  }

  if(s===3){
    const ok=selected().length>0&&["bookingDate","bookingTime","serviceType","sessionCount"].every(id=>v(id));
    err("step3Error",!ok);
    return ok;
  }

  return true;
}

function summary(){
  const casts=selected();
  const text=`【第十二夜預約申請】\n\n遊戲 ID：${v("playerName")||"未填寫"}\n伺服器：${v("serverName")||"未填寫"}\nDiscord ID：${v("discordId")||"未填寫"}\n預約人數：${v("guestCount")||"未填寫"}\n\n希望安排公關：${casts.join("、")||"未填寫"}\n預約日期：${v("bookingDate")||"未填寫"}\n預約時段：${v("bookingTime")||"未填寫"}\n預約節數：${v("sessionCount")||"未填寫"}\n服務項目：${v("serviceType")||"未填寫"}\n\n其他需求：\n${v("notes")||"無"}\n\n※ 此預約申請送出後，仍需等待接待確認才算預約成立。`;
  document.getElementById("summaryBox").textContent=text;
  return text;
}

function submitGoogle(){
  if(!valid(1)||!valid(2)||!valid(3))return;

  const form=document.createElement("form");
  form.action=GOOGLE_FORM_ACTION;
  form.method="POST";
  form.target="hiddenGoogleFrame";
  form.style.display="none";

  const data={
    [F.discordId]:v("discordId"),
    [F.playerName]:v("playerName"),
    [F.serverName]:v("serverName"),
    [F.guestCount]:v("guestCount"),
    [F.bookingDate]:v("bookingDate"),
    [F.bookingTime]:v("bookingTime"),
    [F.sessionCount]:v("sessionCount"),
    [F.castNames]:selected().join("、"),
    [F.serviceType]:v("serviceType"),
    [F.notes]:v("notes")||"無"
  };

  Object.entries(data).forEach(([name,val])=>{
    const input=document.createElement("input");
    input.type="hidden";
    input.name=name;
    input.value=val;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
  form.remove();
  document.getElementById("submitSuccess")?.classList.add("show");
}

function setupBooking(){
  document.getElementById("bookingDate")?.addEventListener("change",renderCastOptions);
  document.getElementById("bookingTime")?.addEventListener("change",renderCastOptions);
  document.getElementById("sessionCount")?.addEventListener("change",renderCastOptions);

  document.querySelectorAll("[data-next]").forEach(b=>b.onclick=()=>{
    if(!valid(step))return;
    if(step===3)summary();
    show(Math.min(step+1,4));
  });

  document.querySelectorAll("[data-prev]").forEach(b=>b.onclick=()=>show(Math.max(step-1,1)));

  document.getElementById("copyBtn")?.addEventListener("click",async()=>{
    try{
      await navigator.clipboard.writeText(document.getElementById("summaryBox")?.textContent||summary());
      document.getElementById("copySuccess")?.classList.add("show");
    }catch(e){
      alert("瀏覽器不允許自動複製，請手動反白複製預約單內容。");
    }
  });

  document.getElementById("submitGoogleBtn")?.addEventListener("click",()=>{
    summary();
    submitGoogle();
  });

  renderCastOptions();
  loadSchedule();
  loadStaffStatus();
}

function inquirySummary(){
  const discord=v("inquiryDiscord"),cast=v("inquiryCast"),date=v("inquiryDate"),time=v("inquiryTime")||"尚未決定",notes=v("inquiryNotes")||"想詢問該公關是否有排班。";
  const ok=discord&&cast&&cast!=="未指定"&&date;
  err("inquiryError",!ok);
  if(!ok)return"";

  const text=`【第十二夜會館排班詢問單】\n\nDiscord ID：${discord}\n詢問公關：${cast}\n希望日期：${date}\n希望時段：${time}\n\n詢問內容：\n${notes}\n\n※ 此為排班詢問，不代表正式預約成立。`;
  document.getElementById("inquirySummaryBox").textContent=text;
  return text;
}

function setupInquiry(){
  document.getElementById("bookingMode")?.classList.add("mode-hidden");
  document.getElementById("inquiryMode")?.classList.remove("mode-hidden");
  document.getElementById("modeEyebrow").textContent="CAST SCHEDULE INQUIRY";
  document.getElementById("pageTitle").textContent="排班詢問";
  document.getElementById("pageIntro").textContent="此頁僅用來詢問指定公關是否有排班，不代表正式預約。若確認可以接待，接待會再引導你填寫正式預約。";
  document.getElementById("modeReminder").textContent="這不是正式預約表，只會產生排班詢問單。";
  document.getElementById("modeNoticeTitle").textContent="詢問內容";
  document.getElementById("modeNoticeText").textContent="只需留下 Discord、詢問公關與希望日期即可。";
  document.getElementById("inquiryCast").value=pref[0]||"未指定";
  document.getElementById("generateInquiryBtn")?.addEventListener("click",inquirySummary);
  document.getElementById("copyInquiryBtn")?.addEventListener("click",async()=>{
    let t=document.getElementById("inquirySummaryBox")?.textContent||"";
    if(!t.trim())t=inquirySummary();
    if(!t.trim())return;

    try{
      await navigator.clipboard.writeText(t);
      document.getElementById("inquiryCopySuccess")?.classList.add("show");
    }catch(e){
      alert("瀏覽器不允許自動複製，請手動反白複製詢問單內容。");
    }
  });
}

mode==="inquiry"?setupInquiry():setupBooking();
