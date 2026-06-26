// champagne-ranking.js
// current 欄位建議：period,name,tower,bottle,note,public
// history 欄位建議：period,name,tower,bottle,note,public
// 也支援中文欄位：月份,貴賓名稱,香檳塔,香檳,備註,公開
(function(){
  const CHAMPAGNE_CURRENT_CSV_URL = "";
  const CHAMPAGNE_HISTORY_CSV_URL = "";
  const SAMPLE_CURRENT=[
    {period:"2026-06",name:"小翼",tower:20,bottle:0,public:"yes"},
    {period:"2026-06",name:"古嘿嘿",tower:2,bottle:0,public:"yes"},
    {period:"2026-06",name:"淵宿",tower:2,bottle:0,public:"yes"},
    {period:"2026-06",name:"特娜那格",tower:1,bottle:1,public:"yes"},
    {period:"2026-06",name:"佩佩嗄鳳",tower:1,bottle:0,public:"yes"},
    {period:"2026-06",name:"岱炫",tower:1,bottle:0,public:"yes"},
    {period:"2026-06",name:"白栗",tower:1,bottle:0,public:"yes"},
    {period:"2026-06",name:"芝麻渣渣",tower:1,bottle:0,public:"yes"},
    {period:"2026-06",name:"淨月小百合",tower:1,bottle:0,public:"yes"}
  ];
  const SAMPLE_HISTORY=[{period:"2026-06",name:"小翼",tower:20,bottle:0,public:"yes"}];
  let currentRows=[],historyRows=[],selectedPeriod="";
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const key=v=>String(v||"").trim().toLowerCase();
  const num=v=>{const n=Number(String(v??"").trim()||0);return Number.isFinite(n)?n:0};
  const pub=r=>!["no","false","0","n"].includes(String(r.public??r["公開"]??"yes").trim().toLowerCase());
  function csv(text){const rows=[];let row=[],cell="",q=false;for(let i=0;i<text.length;i++){const ch=text[i],nx=text[i+1];if(ch==='"'){if(q&&nx==='"'){cell+='"';i++}else q=!q;continue}if(ch===","&&!q){row.push(cell);cell="";continue}if((ch==="\n"||ch==="\r")&&!q){if(ch==="\r"&&nx==="\n")i++;row.push(cell);if(row.some(x=>String(x).trim()!==""))rows.push(row);row=[];cell="";continue}cell+=ch}row.push(cell);if(row.some(x=>String(x).trim()!==""))rows.push(row);return rows}
  function rowsFromCsv(text){const table=csv(text);if(table.length<2)return[];const heads=table[0].map(key);return table.slice(1).map(cols=>{const o={};heads.forEach((h,i)=>o[h]=cols[i]||"");return o})}
  function record(row){const period=String(row.period||row.month||row["月份"]||"").trim();const name=String(row.name||row.names||row["貴賓名稱"]||row["客人"]||row["暱稱"]||"").trim();const tower=num(row.tower||row.towers||row["香檳塔"]);const bottle=num(row.bottle||row.bottles||row["香檳"]);const note=String(row.note||row["備註"]||"").trim();if(!period||!name)return null;return{period,name,names:name.split(/[／/、,，]/).map(x=>x.trim()).filter(Boolean),tower,bottle,note,public:row.public??row["公開"]??"yes"}}
  function formatPeriod(p){const a=String(p||"").split("-");return a.length===2?`${a[0]} / ${a[1]}`:(p||"未設定月份")}
  function formatRecord(g){const arr=[];if(g.tower>0)arr.push(`香檳塔 ${g.tower}`);if(g.bottle>0)arr.push(`香檳 ${g.bottle}`);return arr.join("　")||"尚無紀錄"}
  function groups(rows){const list=rows.filter(pub).map(record).filter(Boolean).filter(r=>r.tower>0||r.bottle>0);list.sort((a,b)=>b.tower-a.tower||b.bottle-a.bottle||a.name.localeCompare(b.name,"zh-Hant"));const gs=[];for(const r of list){const k=`${r.tower}|${r.bottle}`;let g=gs.find(x=>x.key===k);if(!g){g={key:k,tower:r.tower,bottle:r.bottle,names:[],notes:[]};gs.push(g)}g.names.push(...r.names);if(r.note)g.notes.push(r.note)}let rank=1;for(const g of gs){g.names=[...new Set(g.names)];g.rank=rank;rank+=g.names.length}return gs}
  async function load(url,fallback){if(!url)return fallback;try{const res=await fetch(url,{cache:"no-store"});if(!res.ok)throw new Error(`HTTP ${res.status}`);const rows=rowsFromCsv(await res.text());return rows.length?rows:fallback}catch(e){console.warn("香檳王 CSV 讀取失敗，使用範例資料。",e);return fallback}}
  function periods(){return[...new Set(currentRows.map(r=>String(r.period||r.month||r["月份"]||"").trim()).filter(Boolean))].sort().reverse()}
  function renderOptions(){const s=$("champagnePeriodSelect");if(!s)return;const ps=periods();if(!ps.length){s.innerHTML='<option value="">尚無月份資料</option>';selectedPeriod="";return}if(!selectedPeriod||!ps.includes(selectedPeriod))selectedPeriod=ps[0];s.innerHTML=ps.map(p=>`<option value="${esc(p)}" ${p===selectedPeriod?"selected":""}>${esc(formatPeriod(p))}</option>`).join("")}
  function renderKing(gs){const card=$("champagneKingCard");if(!card)return;const k=gs[0];if(!k){card.innerHTML='<div class="king-medal">♛</div><h3 class="king-name">尚無資料</h3><div class="king-record">等待本月紀錄</div><div class="king-note">目前尚未有公開登榜紀錄。</div>';return}card.innerHTML=`<div class="king-medal">♛</div><h3 class="king-name">${esc(k.names.join("／"))}</h3><div class="king-record">${esc(formatRecord(k))}</div><div class="king-note">本期第 ${k.rank} 名｜${esc(formatPeriod(selectedPeriod))}</div>`}
  function set(id,v){const el=$(id);if(el)el.textContent=String(v)}
  function renderStats(rows,gs){const rec=rows.filter(pub).map(record).filter(Boolean);set("champagneTotalTower",rec.reduce((s,r)=>s+r.tower,0));set("champagneTotalBottle",rec.reduce((s,r)=>s+r.bottle,0));set("champagneGuestCount",rec.reduce((s,r)=>s+r.names.length,0));set("champagneTieCount",gs.filter(g=>g.names.length>1).length)}
  function renderRanking(gs){
    const list=$("champagneRankingList");
    if(!list)return;
    if(!gs.length){
      list.innerHTML='<div class="champagne-empty">目前尚無公開排行榜資料。</div>';
      return;
    }
    list.innerHTML=gs.map((g,i)=>{
      const type=podiumType(i);
      return `<div class="rank-row rank-${g.rank} podium-${type} ${i<3?"top-rank":""}">
        <div class="rank-medal-wrap">
          <div class="rank-crown">${crownSvg(type)}</div>
          <div class="rank-badge">#${g.rank}</div>
        </div>
        <div class="rank-names">${g.names.map(n=>`<span class="rank-name-pill">${esc(n)}</span>`).join("")}</div>
        <div class="rank-record">${esc(formatRecord(g))}</div>
      </div>`;
    }).join("");
  }
  function renderHistory(){const list=$("champagneHistoryList");if(!list)return;const source=historyRows.length?historyRows:currentRows;const m=new Map();source.filter(pub).map(record).filter(Boolean).forEach(r=>{if(!m.has(r.period))m.set(r.period,[]);m.get(r.period).push(r)});const ps=[...m.keys()].sort().reverse();if(!ps.length){list.innerHTML='<div class="champagne-empty">目前尚無歷史殿堂資料。</div>';return}list.innerHTML=ps.map(p=>{const w=groups(m.get(p))[0];return w?`<div class="history-item"><div class="history-period">${esc(formatPeriod(p))}</div><div><div class="history-name">${esc(w.names.join("／"))}</div><div class="history-record">${esc(formatRecord(w))}</div></div></div>`:""}).join("")}
  function render(){renderOptions();const rows=currentRows.filter(r=>String(r.period||r.month||r["月份"]||"").trim()===selectedPeriod);const gs=groups(rows);set("champagneTitle","香檳王殿堂");set("champagneUpdated",selectedPeriod?`更新月份：${formatPeriod(selectedPeriod)}`:"—");renderKing(gs);renderStats(rows,gs);renderRanking(gs);renderHistory()}
  async function init(){const s=$("champagnePeriodSelect");s?.addEventListener("change",()=>{selectedPeriod=s.value;render()});[currentRows,historyRows]=await Promise.all([load(CHAMPAGNE_CURRENT_CSV_URL,SAMPLE_CURRENT),load(CHAMPAGNE_HISTORY_CSV_URL,SAMPLE_HISTORY)]);render()}
  init();
})();
