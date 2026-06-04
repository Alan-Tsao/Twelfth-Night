// dragon-gate.js
// 第十二夜｜射龍門多人房間 V11：籌碼累加下注

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import {
  getFirestore,
  doc,
  collection,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  increment,
  writeBatch,
  Timestamp
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA6v46nstI5pEqEiVJ7_8DgQiIz65AS5-E",
  authDomain: "fir-firestore-a6023.firebaseapp.com",
  projectId: "fir-firestore-a6023",
  storageBucket: "fir-firestore-a6023.firebasestorage.app",
  messagingSenderId: "167421866892",
  appId: "1:167421866892:web:735c461a9c9cbfe1175ca9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const $ = (id) => document.getElementById(id);
const ROOM_LIFETIME_MS = 11 * 60 * 60 * 1000;
const PRESENCE_INTERVAL_MS = 25 * 1000;
const PRESENCE_ACTIVE_MS = 95 * 1000;

const RANKS = [
  { label: "A", value: 1 },
  { label: "2", value: 2 },
  { label: "3", value: 3 },
  { label: "4", value: 4 },
  { label: "5", value: 5 },
  { label: "6", value: 6 },
  { label: "7", value: 7 },
  { label: "8", value: 8 },
  { label: "9", value: 9 },
  { label: "10", value: 10 },
  { label: "J", value: 11 },
  { label: "Q", value: 12 },
  { label: "K", value: 13 }
];

const SUITS = ["♠", "♥", "♦", "♣"];
const BET_LABELS = {
  inside: "進洞",
  post: "撞柱",
  outside: "出界"
};

let state = {
  role: localStorage.getItem("dgRole") || "",
  roomId: localStorage.getItem("dgRoomId") || "TESTROOM",
  playerId: localStorage.getItem("dgPlayerId") || "",
  displayName: localStorage.getItem("dgDisplayName") || "",
  clientId: localStorage.getItem("dgClientId") || "",
  room: null,
  players: [],
  presence: [],
  connected: false
};

let unsubRoom = null;
let unsubPlayers = null;
let unsubPresence = null;
let timerHandle = null;
let presenceHandle = null;
let cleanupInProgress = false;
let settlingInProgress = false;
let soundEnabled = localStorage.getItem("dgSoundEnabled") === "yes";
let audioContext = null;
let lastNeedBetKey = "";
let lastAllBetsReadyKey = "";
let lastSettledKey = "";
let chipAccumulated = false;

if (!state.clientId) {
  state.clientId = makeId();
  localStorage.setItem("dgClientId", state.clientId);
}

const params = new URLSearchParams(location.search);
const roomFromUrl = params.get("room");
if (roomFromUrl) {
  state.roomId = cleanRoomId(roomFromUrl);
}

$("roomId").value = state.roomId;
$("displayName").value = state.displayName;

function cleanRoomId(value) {
  return String(value || "TESTROOM")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .slice(0, 24) || "TESTROOM";
}

function makeRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function makeId() {
  return "p_" + Math.random().toString(36).slice(2, 10);
}

function roomRef() {
  return doc(db, "rooms", state.roomId);
}

function playersRef() {
  return collection(db, "rooms", state.roomId, "players");
}

function presenceRef() {
  return collection(db, "rooms", state.roomId, "presence");
}

function myPresenceRef() {
  return doc(db, "rooms", state.roomId, "presence", state.clientId);
}

function playerRef(id = state.playerId) {
  return doc(db, "rooms", state.roomId, "players", id);
}

function setStatus(message, type = "") {
  const box = $("statusBox");
  box.textContent = message;
  box.className = "status" + (type ? " " + type : "");
}

function saveLocal() {
  localStorage.setItem("dgRole", state.role);
  localStorage.setItem("dgRoomId", state.roomId);
  localStorage.setItem("dgPlayerId", state.playerId);
  localStorage.setItem("dgDisplayName", state.displayName);
  localStorage.setItem("dgClientId", state.clientId);
}

function updateSoundButton() {
  const btn = $("soundToggleBtn");
  if (!btn) return;
  btn.textContent = soundEnabled ? "提示音：開" : "提示音：關";
  btn.classList.toggle("enabled", soundEnabled);
}

async function ensureAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  return audioContext;
}

function tone(freq = 660, duration = 0.12, delay = 0, type = "sine", gainValue = 0.045) {
  if (!audioContext) return;

  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const start = audioContext.currentTime + delay;
  const end = start + duration;

  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  osc.connect(gain).connect(audioContext.destination);
  osc.start(start);
  osc.stop(end + 0.02);
}

async function playSound(kind = "notice") {
  if (!soundEnabled) return;

  try {
    await ensureAudioContext();

    if (kind === "needBet") {
      tone(660, 0.10, 0, "sine", 0.05);
      tone(880, 0.16, 0.12, "sine", 0.05);
    } else if (kind === "allReady") {
      tone(880, 0.09, 0, "triangle", 0.05);
      tone(1100, 0.09, 0.11, "triangle", 0.05);
      tone(1320, 0.16, 0.22, "triangle", 0.05);
    } else if (kind === "settled") {
      tone(520, 0.10, 0, "sine", 0.04);
      tone(740, 0.18, 0.12, "sine", 0.045);
    } else {
      tone(760, 0.12, 0, "sine", 0.045);
    }
  } catch (error) {
    console.warn("Sound failed:", error);
  }
}

async function toggleSound() {
  soundEnabled = !soundEnabled;
  localStorage.setItem("dgSoundEnabled", soundEnabled ? "yes" : "no");
  updateSoundButton();

  if (soundEnabled) {
    await ensureAudioContext();
    await playSound("notice");
    setStatus("提示音已開啟。", "ok");
  } else {
    setStatus("提示音已關閉。", "");
  }
}

function getInviteUrl() {
  const url = new URL(location.href);
  url.searchParams.set("room", state.roomId);
  return url.toString();
}

function timestampToMillis(value) {
  if (!value) return null;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (value.seconds) return value.seconds * 1000;
  return null;
}

function getExpiresMillis() {
  return timestampToMillis(state.room?.expiresAt);
}

function isExpired() {
  const expires = getExpiresMillis();
  return Boolean(expires && Date.now() > expires);
}

function formatCountdown(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function updateTimer() {
  const expires = getExpiresMillis();
  if (!expires) {
    $("remainingTime").textContent = "--:--:--";
    return;
  }

  const left = expires - Date.now();
  $("remainingTime").textContent = left > 0 ? formatCountdown(left) : "已過期";

  if (left <= 0) {
    document.body.classList.add("room-expired");
    renderRoom();
  }
}

function startTimer() {
  if (timerHandle) clearInterval(timerHandle);
  updateTimer();
  timerHandle = setInterval(updateTimer, 1000);
}

function setConnected(value) {
  state.connected = value;
  $("connectionChip").classList.toggle("connected", value);
  $("connectionText").textContent = value ? "已連線" : "未連線";
}

function disconnectRoom() {
  if (unsubRoom) {
    unsubRoom();
    unsubRoom = null;
  }

  if (unsubPlayers) {
    unsubPlayers();
    unsubPlayers = null;
  }

  if (unsubPresence) {
    unsubPresence();
    unsubPresence = null;
  }

  stopPresence(false);

  if (timerHandle) {
    clearInterval(timerHandle);
    timerHandle = null;
  }

  state.room = null;
  state.players = [];
  state.presence = [];
  setConnected(false);
  renderPresence();
  $("remainingTime").textContent = "--:--:--";
  renderRoom();
  renderPlayers();
}

function getActivePresenceItems(items = state.presence) {
  const now = Date.now();
  return items.filter((item) => {
    const lastSeen = timestampToMillis(item.lastSeen);
    return lastSeen && now - lastSeen <= PRESENCE_ACTIVE_MS;
  });
}

function renderPresence() {
  const active = getActivePresenceItems();
  $("onlineCount").textContent = String(active.length);
}

async function writeMyPresence() {
  if (!state.role || !state.roomId) return;

  await setDoc(myPresenceRef(), {
    clientId: state.clientId,
    playerId: state.playerId || "",
    name: state.displayName || (state.role === "host" ? "主持人" : "玩家"),
    role: state.role,
    lastSeen: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });
}

function startPresence() {
  stopPresence(false);

  if (!state.role) {
    renderPresence();
    return;
  }

  writeMyPresence().catch((error) => {
    console.warn("Presence write failed:", error);
  });

  presenceHandle = setInterval(() => {
    writeMyPresence().catch((error) => {
      console.warn("Presence heartbeat failed:", error);
    });
  }, PRESENCE_INTERVAL_MS);
}

function stopPresence(deleteSelf = false) {
  if (presenceHandle) {
    clearInterval(presenceHandle);
    presenceHandle = null;
  }

  if (deleteSelf && state.roomId && state.clientId) {
    return deleteDoc(myPresenceRef()).catch((error) => {
      console.warn("Presence delete failed:", error);
    });
  }

  return Promise.resolve();
}

async function removeStalePresenceDocs() {
  const snap = await getDocs(presenceRef());
  const now = Date.now();
  const batch = writeBatch(db);
  let removed = 0;

  snap.forEach((docSnap) => {
    const data = docSnap.data();
    const lastSeen = timestampToMillis(data.lastSeen);
    if (!lastSeen || now - lastSeen > PRESENCE_ACTIVE_MS) {
      batch.delete(docSnap.ref);
      removed += 1;
    }
  });

  if (removed > 0) {
    await batch.commit();
  }

  return removed;
}

async function clearRoomBecauseEmpty() {
  if (cleanupInProgress || !state.roomId) return;
  cleanupInProgress = true;

  try {
    $("connectionChip").classList.add("cleaning");
    setStatus("房間已無人，正在自動清空本場資料...", "");

    const playersSnap = await getDocs(playersRef());
    const presenceSnap = await getDocs(presenceRef());
    const batch = writeBatch(db);

    playersSnap.forEach((docSnap) => batch.delete(docSnap.ref));
    presenceSnap.forEach((docSnap) => batch.delete(docSnap.ref));

    batch.set(roomRef(), {
      game: "dragonGate",
      status: "waiting",
      hostName: "",
      startScore: Math.max(0, Math.floor(Number($("startScore").value || state.room?.startScore || 2500))),
      minBet: Math.max(1, Math.floor(Number($("minBet").value || state.room?.minBet || 100))),
      round: 0,
      gateA: null,
      gateB: null,
      resultCard: null,
      roundResult: "房間已無人，自動清空本場資料。",
      autoClearedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });

    await batch.commit();
    setStatus("房間已無人，已自動清空本場資料。", "ok");
  } catch (error) {
    console.warn("Auto cleanup failed:", error);
    setStatus("自動清空失敗：" + error.message, "err");
  } finally {
    cleanupInProgress = false;
    $("connectionChip").classList.remove("cleaning");
  }
}

async function checkAndCleanupIfEmpty() {
  await removeStalePresenceDocs();

  const snap = await getDocs(presenceRef());
  const active = [];
  const now = Date.now();

  snap.forEach((docSnap) => {
    const data = docSnap.data();
    const lastSeen = timestampToMillis(data.lastSeen);
    if (lastSeen && now - lastSeen <= PRESENCE_ACTIVE_MS) {
      active.push({ id: docSnap.id, ...data });
    }
  });

  if (active.length === 0) {
    await clearRoomBecauseEmpty();
  }
}

function syncRoomUrl() {
  $("roomCodeText").textContent = state.roomId || "尚未連線";
  $("roomLabel").textContent = state.roomId || "尚未連線";
}

async function copyText(text) {
  await navigator.clipboard.writeText(text);
}

function getCard() {
  const rank = RANKS[Math.floor(Math.random() * RANKS.length)];
  const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
  return {
    label: rank.label + suit,
    rank: rank.value
  };
}

function getGateInfo(a, b) {
  if (!a || !b) return null;
  const low = Math.min(a.rank, b.rank);
  const high = Math.max(a.rank, b.rank);
  return {
    low,
    high,
    same: a.rank === b.rank,
    adjacent: Math.abs(a.rank - b.rank) === 1,
    width: Math.max(0, high - low - 1)
  };
}

function judgeBet(betType, amount, gateA, gateB, resultCard) {
  const gate = getGateInfo(gateA, gateB);
  if (!gate || !resultCard || !amount) {
    return { delta: 0, label: "未結算" };
  }

  const hitPost = resultCard.rank === gate.low || resultCard.rank === gate.high;
  const inside = resultCard.rank > gate.low && resultCard.rank < gate.high;
  const outside = !inside && !hitPost;

  if (betType === "inside") {
    return inside
      ? { delta: amount, label: "進洞成功" }
      : { delta: -amount, label: hitPost ? "撞柱失敗" : "出界失敗" };
  }

  if (betType === "post") {
    return hitPost
      ? { delta: amount * 2, label: "撞柱成功" }
      : { delta: -amount, label: inside ? "進洞未中" : "出界未中" };
  }

  if (betType === "outside") {
    return outside
      ? { delta: amount, label: "出界成功" }
      : { delta: -amount, label: hitPost ? "撞柱未中" : "進洞未中" };
  }

  return { delta: 0, label: "未結算" };
}

function setBetType(value) {
  const input = $("betType");
  if (input) input.value = value;

  document.querySelectorAll(".bet-type-option").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.betType === value);
  });
}

function updateBetTypePickerDisabled(disabled) {
  document.querySelectorAll(".bet-type-option").forEach((btn) => {
    btn.disabled = disabled;
  });
}

function getMinBetValue() {
  return Math.max(1, Number(state.room?.minBet ?? $("minBet").value ?? 100));
}

function getSelfScore() {
  const self = state.players.find((p) => p.id === state.playerId);
  return Math.max(0, Math.floor(Number(self?.score ?? state.room?.startScore ?? 0)));
}

function normalizeBetAmount(value, options = {}) {
  const minBet = getMinBetValue();
  const maxScore = getSelfScore();
  const allowBelowMin = options.allowBelowMin === true;

  let amount = Math.floor(Number(String(value || "").replace(/[^\d]/g, "")));
  if (!Number.isFinite(amount) || amount <= 0) amount = minBet;

  if (!allowBelowMin) amount = Math.max(minBet, amount);
  if (maxScore > 0) amount = Math.min(maxScore, amount);

  return amount;
}

function setBetAmount(value, options = {}) {
  const amount = normalizeBetAmount(value, options);
  $("betAmount").value = String(amount);
  updateChipActiveState();
  return amount;
}

function updateChipActiveState() {
  const current = Number(String($("betAmount")?.value || "0").replace(/[^\d]/g, ""));
  document.querySelectorAll(".chip-btn").forEach((btn) => {
    btn.classList.toggle("active", Number(btn.dataset.chip) === current);
  });
}

function updateBetAmountDisabled(disabled) {
  const ids = ["betAmount", "betMinusBtn", "betPlusBtn"];
  ids.forEach((id) => {
    const el = $(id);
    if (el) el.disabled = disabled;
  });

  document.querySelectorAll(".chip-btn").forEach((btn) => {
    btn.disabled = disabled;
  });
}

function adjustBetAmount(delta) {
  const minBet = getMinBetValue();
  const current = normalizeBetAmount($("betAmount").value);
  setBetAmount(current + delta * minBet);
  chipAccumulated = true;
}

function addChipAmount(chipValue) {
  const chip = Math.max(1, Math.floor(Number(chipValue || 0)));
  const minBet = getMinBetValue();
  const currentRaw = Math.floor(Number(String($("betAmount").value || "").replace(/[^\d]/g, ""))) || 0;

  // 初次點選高額籌碼時，避免從預設最低下注額開始累加。
  // 例如預設 100，第一次點 +2500 → 2500；第二次點 +2500 → 5000。
  const nextAmount = (!chipAccumulated && currentRaw <= minBet)
    ? chip
    : currentRaw + chip;

  setBetAmount(nextAmount);
  chipAccumulated = true;
}

function getEligiblePlayers(players = state.players) {
  const minBet = Math.max(1, Number(state.room?.minBet ?? $("minBet").value ?? 100));
  return players.filter((p) => Number(p.score || 0) >= minBet);
}

function getBetProgress(players = state.players) {
  const eligible = getEligiblePlayers(players);
  const betPlayers = eligible.filter((p) => Number(p.currentBet || 0) > 0 && Boolean(p.betType));
  const missing = eligible.filter((p) => !(Number(p.currentBet || 0) > 0 && Boolean(p.betType)));

  return {
    eligibleCount: eligible.length,
    betCount: betPlayers.length,
    allReady: eligible.length > 0 && betPlayers.length === eligible.length,
    missing
  };
}

function canDrawResult() {
  const room = state.room || {};
  const progress = getBetProgress();

  return Boolean(
    room.status === "betting" &&
    room.gateA &&
    room.gateB &&
    !room.resultCard &&
    progress.allReady &&
    !settlingInProgress &&
    !isExpired()
  );
}

function updateActionButtons() {
  const room = state.room || {};
  const expired = isExpired();
  const bettingOpen = room.status === "betting" && room.gateA && room.gateB && !room.resultCard && !expired;

  const newRoundBtn = $("newRoundBtn");
  const drawResultBtn = $("drawResultBtn");
  const submitBetBtn = $("submitBetBtn");
  const clearBetBtn = $("clearBetBtn");
  const allInBtn = $("allInBtn");

  if (newRoundBtn) newRoundBtn.disabled = expired;
  if (drawResultBtn) drawResultBtn.disabled = !canDrawResult();
  if (submitBetBtn) submitBetBtn.disabled = !bettingOpen;
  if (clearBetBtn) clearBetBtn.disabled = !bettingOpen;
  if (allInBtn) allInBtn.disabled = !bettingOpen;
  updateBetTypePickerDisabled(!bettingOpen);
  updateBetAmountDisabled(!bettingOpen);
}

function updateBetProgress() {
  const el = $("betProgress");
  if (!el) {
    updateActionButtons();
    return;
  }

  const room = state.room || {};
  const progress = getBetProgress();

  el.classList.remove("ready", "waiting");

  if (!room.gateA || !room.gateB) {
    el.textContent = "下注進度：等待主持人開局";
    updateActionButtons();
    return;
  }

  if (room.status === "settled" || room.resultCard) {
    el.textContent = "下注進度：本局已結算，等待下一局";
    updateActionButtons();
    return;
  }

  if (room.status !== "betting") {
    el.textContent = "下注進度：等待新一局";
    updateActionButtons();
    return;
  }

  if (progress.eligibleCount === 0) {
    el.textContent = "下注進度：目前沒有可下注玩家";
    el.classList.add("waiting");
    updateActionButtons();
    return;
  }

  if (progress.allReady) {
    el.textContent = `下注進度：${progress.betCount}/${progress.eligibleCount}，所有可下注玩家已完成`;
    el.classList.add("ready");
    updateActionButtons();
    return;
  }

  const names = progress.missing.map((p) => p.name).filter(Boolean).join("、");
  el.textContent = `下注進度：${progress.betCount}/${progress.eligibleCount}，等待 ${names || "玩家"} 下注`;
  el.classList.add("waiting");
  updateActionButtons();
}

function notifyRoundState() {
  const room = state.room || {};
  if (!room.round) return;

  const progress = getBetProgress();

  if (state.role === "player" && state.playerId && room.status === "betting" && room.gateA && room.gateB && !room.resultCard) {
    const self = state.players.find((p) => p.id === state.playerId);
    const minBet = Math.max(1, Number(state.room?.minBet ?? $("minBet").value ?? 100));

    if (self && Number(self.score || 0) >= minBet && !(Number(self.currentBet || 0) > 0 && self.betType)) {
      const key = `${state.roomId}-${room.round}-needBet-${state.playerId}`;
      if (lastNeedBetKey !== key) {
        lastNeedBetKey = key;
        playSound("needBet");
        setStatus("輪到你下注了。", "");
      }
    }
  }

  if (state.role === "host" && room.status === "betting" && progress.allReady) {
    const key = `${state.roomId}-${room.round}-allReady-${progress.betCount}`;
    if (lastAllBetsReadyKey !== key) {
      lastAllBetsReadyKey = key;
      playSound("allReady");
      setStatus("所有可下注玩家都已下注，可以結算。", "ok");
    }
  }

  if (room.status === "settled" && room.resultCard) {
    const key = `${state.roomId}-${room.round}-settled-${room.resultCard.label}`;
    if (lastSettledKey !== key) {
      lastSettledKey = key;
      playSound("settled");
    }
  }
}

function renderRoom() {
  const room = state.room || {};
  const expired = isExpired();

  syncRoomUrl();

  $("roomStatus").textContent = expired ? "expired" : (room.status || "-");
  $("roundLabel").textContent = room.round ?? 0;
  $("hostLabel").textContent = room.hostName || "-";
  $("roleBadge").textContent = state.role === "host" ? "主持人" : state.role === "player" ? "玩家" : "未加入";

  if (room.startScore !== undefined) $("startScore").value = room.startScore;
  if (room.minBet !== undefined) {
    $("minBet").value = room.minBet;
    if (Number(String($("betAmount").value || "0").replace(/[^\d]/g, "")) < Number(room.minBet || 1)) setBetAmount(room.minBet);
  }
  $("betHint").textContent = `目前倍率：進洞 +1 倍、出界 +1 倍、撞柱 +2 倍；最低下注 ${room.minBet || Number($("minBet").value || 100)} 分，最高可押目前持有分數。`;

  $("gateA").textContent = room.gateA?.label || "?";
  $("gateB").textContent = room.gateB?.label || "?";
  $("resultCard").textContent = room.resultCard?.label || "?";

  const gate = getGateInfo(room.gateA, room.gateB);
  if (expired) {
    $("roundResult").textContent = "此房間已超過 11 小時，請重新建立房間。";
  } else if (!room.gateA || !room.gateB) {
    $("roundResult").textContent = "等待主持人開局。";
  } else if (room.resultCard) {
    $("roundResult").textContent = room.roundResult || "本局已結算。";
  } else if (gate?.same) {
    $("roundResult").textContent = "門牌相同，建議重發門牌。";
  } else if (gate?.adjacent) {
    $("roundResult").textContent = "門牌相鄰，沒有進洞空間，建議重發門牌。";
  } else {
    $("roundResult").textContent = `門寬 ${gate.width} 格，等待玩家下注。`;
  }

  $("hostPanel").style.display = state.role === "host" ? "block" : "none";
  $("betPanel").style.display = state.role === "player" ? "block" : "none";

  updateBetProgress();
  updateActionButtons();
}

function renderPlayers() {
  const sorted = state.players.slice().sort((a, b) => (b.score || 0) - (a.score || 0));

  $("rankingList").innerHTML = sorted.length
    ? sorted.map((p, index) => `
      <div class="rank-row">
        <div class="rank-no">${index + 1}</div>
        <div>
          <div class="player-name">${escapeHtml(p.name)}</div>
          <div class="player-meta">${p.currentBet ? `${BET_LABELS[p.betType] || p.betType}｜${p.currentBet} 分` : "尚未下注"}</div>
        </div>
        <div class="score">${p.score || 0}</div>
      </div>
    `).join("")
    : `<div class="empty">尚無玩家加入。</div>`;

  $("playerList").innerHTML = sorted.length
    ? sorted.map((p) => `
      <div class="player-row">
        <div class="rank-no">•</div>
        <div>
          <div class="player-name">${escapeHtml(p.name)}</div>
          <div class="player-meta">${p.lastResult || "等待中"}${p.currentBet ? `｜已押 ${BET_LABELS[p.betType] || p.betType} ${p.currentBet} 分` : ""}</div>
        </div>
        <div class="score">${p.score || 0}</div>
      </div>
    `).join("")
    : `<div class="empty">尚無玩家加入。</div>`;

  updateBetProgress();
  updateActionButtons();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function connectRoom() {
  if (unsubRoom) unsubRoom();
  if (unsubPlayers) unsubPlayers();

  state.roomId = cleanRoomId($("roomId").value);
  $("roomId").value = state.roomId;
  state.displayName = $("displayName").value.trim() || state.displayName || "未命名";
  saveLocal();
  syncRoomUrl();

  unsubRoom = onSnapshot(roomRef(), (snap) => {
    state.room = snap.exists() ? snap.data() : null;
    setConnected(true);
    renderRoom();
    startTimer();
    setStatus(snap.exists() ? "已連線房間。" : "已連線，但房間尚未建立。", snap.exists() ? "ok" : "");
    notifyRoundState();
  }, (err) => {
    console.error(err);
    setConnected(false);
    setStatus("房間讀取失敗：" + err.message, "err");
  });

  unsubPlayers = onSnapshot(playersRef(), (snap) => {
    state.players = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    renderPlayers();
    notifyRoundState();
  }, (err) => {
    console.error(err);
    setStatus("玩家讀取失敗：" + err.message, "err");
  });

  unsubPresence = onSnapshot(presenceRef(), (snap) => {
    state.presence = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    renderPresence();
  }, (err) => {
    console.error(err);
    setStatus("在線名單讀取失敗：" + err.message, "err");
  });

  removeStalePresenceDocs().catch((error) => console.warn("Stale presence cleanup failed:", error));

  if (state.role) {
    startPresence();
  }
}

async function hostCreateRoom() {
  state.role = "host";
  state.roomId = cleanRoomId($("roomId").value);
  state.displayName = $("displayName").value.trim() || "主持人";
  saveLocal();

  const now = Date.now();
  const startScore = Math.max(0, Math.floor(Number($("startScore").value || 2500)));
  const minBet = Math.max(1, Math.floor(Number($("minBet").value || 100)));

  await setDoc(roomRef(), {
    game: "dragonGate",
    status: "waiting",
    hostName: state.displayName,
    startScore,
    minBet,
    round: 0,
    gateA: null,
    gateB: null,
    resultCard: null,
    roundResult: "等待主持人開局。",
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(now + ROOM_LIFETIME_MS),
    updatedAt: serverTimestamp()
  }, { merge: true });

  connectRoom();
  setStatus("主持人房間已建立 / 連線，邀請碼已可複製。", "ok");
}

async function playerJoinRoom() {
  state.role = "player";
  state.roomId = cleanRoomId($("roomId").value);
  state.displayName = $("displayName").value.trim() || "未命名玩家";
  if (!state.playerId) state.playerId = makeId();
  saveLocal();

  const startScore = Math.max(0, Number(state.room?.startScore ?? $("startScore").value ?? 2500));

  await setDoc(playerRef(), {
    name: state.displayName,
    score: startScore,
    currentBet: 0,
    betType: "",
    lastResult: "剛加入房間",
    joinedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });

  connectRoom();
  setStatus("玩家已加入房間。", "ok");
}

function ensureRoomActive() {
  if (isExpired()) {
    setStatus("房間已過期，請重新建立房間。", "err");
    return false;
  }
  return true;
}

async function newRound() {
  if (!ensureRoomActive()) return;

  const gateA = getCard();
  const gateB = getCard();

  await updateDoc(roomRef(), {
    status: "betting",
    round: increment(1),
    gateA,
    gateB,
    resultCard: null,
    roundResult: "新一局開始，等待玩家下注。",
    updatedAt: serverTimestamp()
  });

  const snap = await getDocs(playersRef());
  const batch = writeBatch(db);
  snap.forEach((docSnap) => {
    batch.update(docSnap.ref, {
      currentBet: 0,
      betType: "",
      lastResult: "等待下注",
      updatedAt: serverTimestamp()
    });
  });
  await batch.commit();

  lastNeedBetKey = "";
  lastAllBetsReadyKey = "";
  lastSettledKey = "";
  chipAccumulated = false;
  setBetAmount(state.room?.minBet || $("minBet").value || 100);

  setStatus("已開始新一局，等待玩家下注。", "ok");
}

async function submitBet() {
  if (!ensureRoomActive()) return;

  if (state.role !== "player" || !state.playerId) {
    setStatus("請先以玩家身份加入房間。", "err");
    return;
  }

  const minBet = getMinBetValue();
  const amount = setBetAmount($("betAmount").value);
  const betType = $("betType").value;
  const self = state.players.find((p) => p.id === state.playerId);
  const score = Number(self?.score ?? state.room?.startScore ?? 0);

  if (amount < minBet) {
    setStatus(`最低下注為 ${minBet} 分。`, "err");
    return;
  }

  if (amount > score) {
    setStatus(`你的目前分數是 ${score}，不能下注超過持有分數。`, "err");
    return;
  }

  await setDoc(playerRef(), {
    name: state.displayName,
    currentBet: amount,
    betType,
    lastResult: `已押 ${BET_LABELS[betType]} ${amount} 分`,
    updatedAt: serverTimestamp()
  }, { merge: true });

  chipAccumulated = false;
  setStatus("下注已送出。", "ok");
}

async function clearBet() {
  if (!ensureRoomActive()) return;
  if (state.role !== "player" || !state.playerId) return;

  await updateDoc(playerRef(), {
    currentBet: 0,
    betType: "",
    lastResult: "已取消下注",
    updatedAt: serverTimestamp()
  });

  chipAccumulated = false;
  setBetAmount(state.room?.minBet || $("minBet").value || 100);
  setStatus("已取消下注。", "ok");
}

async function drawResult() {
  if (!ensureRoomActive()) return;

  if (settlingInProgress) {
    setStatus("正在結算中，請稍候。", "");
    return;
  }

  const room = state.room;
  if (!room?.gateA || !room?.gateB) {
    setStatus("請先開始新一局。", "err");
    return;
  }

  if (room.status !== "betting" || room.resultCard) {
    setStatus("本局已結算或尚未開放下注，不能重複抽結果牌。", "err");
    return;
  }

  const snap = await getDocs(playersRef());
  const currentPlayers = snap.docs.map((docSnap) => ({ id: docSnap.id, ref: docSnap.ref, ...docSnap.data() }));
  const progress = getBetProgress(currentPlayers);

  if (!progress.allReady) {
    const names = progress.missing.map((p) => p.name).filter(Boolean).join("、");
    setStatus(`還不能結算：下注進度 ${progress.betCount}/${progress.eligibleCount}。等待 ${names || "玩家"} 下注。`, "err");
    return;
  }

  settlingInProgress = true;
  $("drawResultBtn").disabled = true;

  try {
    await updateDoc(roomRef(), {
      status: "settling",
      updatedAt: serverTimestamp()
    });

    const resultCard = getCard();
    const batch = writeBatch(db);
    const lines = [];

    currentPlayers.forEach((p) => {
      const amount = Math.max(0, Number(p.currentBet || 0));

      if (!amount || !p.betType) {
        batch.update(p.ref, {
          lastResult: "本局未下注",
          updatedAt: serverTimestamp()
        });
        return;
      }

      const judged = judgeBet(p.betType, amount, room.gateA, room.gateB, resultCard);
      batch.update(p.ref, {
        score: increment(judged.delta),
        currentBet: 0,
        betType: "",
        lastResult: `${judged.label}（${judged.delta >= 0 ? "+" : ""}${judged.delta}）`,
        updatedAt: serverTimestamp()
      });

      lines.push(`${p.name}：${BET_LABELS[p.betType]} ${amount} 分 → ${judged.label}（${judged.delta >= 0 ? "+" : ""}${judged.delta}）`);
    });

    const summary = [
      `第 ${Number(room.round || 0)} 局結果`,
      `門牌：${room.gateA.label}｜${room.gateB.label}`,
      `結果牌：${resultCard.label}`,
      lines.length ? lines.join(" / ") : "本局無玩家下注"
    ].join("　");

    batch.update(roomRef(), {
      status: "settled",
      resultCard,
      roundResult: summary,
      updatedAt: serverTimestamp()
    });

    await batch.commit();
    setStatus("已抽結果牌並結算。", "ok");
  } finally {
    settlingInProgress = false;
    renderRoom();
  }
}

async function clearRoom() {
  if (!confirm("確定要清空本場玩家與牌局資料嗎？")) return;

  const snap = await getDocs(playersRef());
  const batch = writeBatch(db);

  snap.forEach((docSnap) => {
    batch.delete(docSnap.ref);
  });

  batch.set(roomRef(), {
    game: "dragonGate",
    status: "waiting",
    hostName: state.displayName || "主持人",
    startScore: Math.max(0, Math.floor(Number($("startScore").value || state.room?.startScore || 2500))),
    minBet: Math.max(1, Math.floor(Number($("minBet").value || state.room?.minBet || 100))),
    round: 0,
    gateA: null,
    gateB: null,
    resultCard: null,
    roundResult: "本場已清空，等待主持人開局。",
    updatedAt: serverTimestamp()
  }, { merge: true });

  await batch.commit();
  setStatus("本場已清空。", "ok");
}

async function copyResult() {
  const room = state.room;
  const sorted = state.players.slice().sort((a, b) => (b.score || 0) - (a.score || 0));
  const ranking = sorted.map((p, i) => `${i + 1}. ${p.name} ${p.score || 0}分`).join(" / ");

  const text = [
    room?.roundResult || "尚無結算結果",
    ranking ? `本場排名：${ranking}` : ""
  ].filter(Boolean).join("\n");

  await copyText(text);
  setStatus("已複製結果文字。", "ok");
}

function allIn() {
  if (state.role !== "player" || !state.playerId) {
    setStatus("請先以玩家身份加入房間。", "err");
    return;
  }

  const self = state.players.find((p) => p.id === state.playerId);
  const score = Math.max(0, Math.floor(Number(self?.score ?? 0)));
  const minBet = Math.max(1, Number(state.room?.minBet ?? $("minBet").value ?? 100));

  if (score < minBet) {
    setStatus(`目前分數 ${score} 低於最低下注 ${minBet}，無法 All in。`, "err");
    return;
  }

  setBetAmount(score);
  chipAccumulated = true;
  setStatus(`已填入 All in：${score} 分。`, "ok");
}

async function resetLocal() {
  const hadRoom = Boolean(state.roomId);
  const leavingRole = state.role;
  const leavingPlayerId = state.playerId;

  await stopPresence(true);

  if (leavingRole === "player" && leavingPlayerId) {
    try {
      await deleteDoc(playerRef(leavingPlayerId));
    } catch (error) {
      console.warn("Failed to delete player doc:", error);
    }
  }

  if (hadRoom) {
    await checkAndCleanupIfEmpty();
  }

  localStorage.removeItem("dgRole");
  localStorage.removeItem("dgRoomId");
  localStorage.removeItem("dgPlayerId");
  localStorage.removeItem("dgDisplayName");

  history.replaceState(null, "", location.pathname);

  state.role = "";
  state.playerId = "";
  state.displayName = "";
  state.roomId = makeRoomCode();
  state.room = null;
  state.players = [];
  state.presence = [];

  $("roomId").value = state.roomId;
  $("displayName").value = "";

  disconnectRoom();
  syncRoomUrl();
  setStatus("已清除本機資料並離線。若房間已無人，系統會自動清空。", "");
}

async function leaveRoom() {
  const leavingRole = state.role;
  const leavingPlayerId = state.playerId;
  const hadRoom = Boolean(state.roomId);

  await stopPresence(true);

  if (leavingRole === "player" && leavingPlayerId) {
    try {
      await deleteDoc(playerRef(leavingPlayerId));
    } catch (error) {
      console.warn("Failed to delete player doc:", error);
    }
  }

  if (hadRoom) {
    await checkAndCleanupIfEmpty();
  }

  localStorage.removeItem("dgRole");
  localStorage.removeItem("dgRoomId");
  localStorage.removeItem("dgPlayerId");

  history.replaceState(null, "", location.pathname);

  state.role = "";
  state.playerId = "";
  state.room = null;
  state.players = [];
  state.presence = [];

  disconnectRoom();
  syncRoomUrl();

  setStatus(leavingRole === "player" ? "已離開房間，並從玩家列表移除。" : "已離開房間並停止監聽。若房間已無人，系統會自動清空。", "");
}

window.addEventListener("pagehide", () => {
  // 瀏覽器關閉/重整時嘗試停止心跳；真正的清房仍以「離開房間」按鈕與下次 stale cleanup 為主。
  if (presenceHandle) {
    clearInterval(presenceHandle);
    presenceHandle = null;
  }
});

document.querySelectorAll(".bet-type-option").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.disabled) return;
    setBetType(btn.dataset.betType || "inside");
  });
});

$("betAmount").addEventListener("input", () => {
  $("betAmount").value = String($("betAmount").value || "").replace(/[^\d]/g, "");
  chipAccumulated = true;
  updateChipActiveState();
});

$("betAmount").addEventListener("blur", () => {
  setBetAmount($("betAmount").value);
});

$("betMinusBtn").addEventListener("click", () => adjustBetAmount(-1));
$("betPlusBtn").addEventListener("click", () => adjustBetAmount(1));

document.querySelectorAll(".chip-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.disabled) return;
    addChipAmount(btn.dataset.chip);
  });
});

$("randomRoomBtn").addEventListener("click", () => {
  $("roomId").value = makeRoomCode();
  state.roomId = cleanRoomId($("roomId").value);
  syncRoomUrl();
  setStatus("已產生新的房間代碼。按「我是主持人」後才會正式建立房間。", "");
});

$("copyCodeBtn").addEventListener("click", async () => {
  await copyText(state.roomId || $("roomId").value || "TESTROOM");
  setStatus("已複製房間代碼。", "ok");
});

$("copyInviteBtn").addEventListener("click", async () => {
  await copyText(getInviteUrl());
  setStatus("已複製邀請連結。", "ok");
});

$("soundToggleBtn").addEventListener("click", () => toggleSound().catch((e) => setStatus(e.message, "err")));
$("leaveRoomBtn").addEventListener("click", () => leaveRoom().catch((e) => setStatus(e.message, "err")));

$("hostCreateBtn").addEventListener("click", () => hostCreateRoom().catch((e) => setStatus(e.message, "err")));
$("playerJoinBtn").addEventListener("click", () => playerJoinRoom().catch((e) => setStatus(e.message, "err")));
$("newRoundBtn").addEventListener("click", () => newRound().catch((e) => setStatus(e.message, "err")));
$("submitBetBtn").addEventListener("click", () => submitBet().catch((e) => setStatus(e.message, "err")));
$("allInBtn").addEventListener("click", allIn);
$("clearBetBtn").addEventListener("click", () => clearBet().catch((e) => setStatus(e.message, "err")));
$("drawResultBtn").addEventListener("click", () => drawResult().catch((e) => setStatus(e.message, "err")));
$("clearRoomBtn").addEventListener("click", () => clearRoom().catch((e) => setStatus(e.message, "err")));
$("copyResultBtn").addEventListener("click", () => copyResult().catch((e) => setStatus(e.message, "err")));
$("resetLocalBtn").addEventListener("click", () => resetLocal().catch((e) => setStatus(e.message, "err")));

updateSoundButton();
setBetType($("betType")?.value || "inside");
setBetAmount($("betAmount")?.value || 100);
syncRoomUrl();
renderRoom();
renderPlayers();

if (roomFromUrl || localStorage.getItem("dgRoomId")) {
  connectRoom();
} else {
  setConnected(false);
  setStatus("尚未連線。請建立房間或輸入邀請碼加入。", "");
}
