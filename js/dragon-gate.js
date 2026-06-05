// dragon-gate.js
// 第十二夜｜射龍門多人房間 V41：特殊池公平分配

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  collection,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
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
const auth = getAuth(app);
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
  outside: "出界",
  higher: "猜大",
  lower: "猜小",
  suit_spade: "猜黑桃",
  suit_heart: "猜紅心",
  suit_diamond: "猜方塊",
  suit_club: "猜梅花"
};

const BET_SUIT_MAP = {
  suit_spade: "♠",
  suit_heart: "♥",
  suit_diamond: "♦",
  suit_club: "♣"
};

const GAME_MODE_LABELS = {
  normal: "一般模式",
  casino: "賭場模式"
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
  connected: false,
  setupExpanded: false,
  user: null,
  staff: null,
  authReady: false,
  authFormOpen: false,
  summaryDetailsOpen: false
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
let lastPairEffectKey = "";
let chipAccumulated = false;
let betCountdownHandle = null;
let autoFillingBets = false;
let pendingRebuyPlayerId = "";
let rebuyInProgress = false;
let resultRevealInProgress = false;
let currentResultRevealKey = "";
let lastResultRevealKey = "";
let resultRevealTimers = [];

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


function isRoomActive() {
  return Boolean(state.role && state.roomId && state.connected);
}

function updateLayoutMode() {
  const active = isRoomActive();
  const joined = isJoinedRoom();
  document.body.classList.toggle("room-active", active);
  updateRoomJoinedClass();

  const summaryPanel = $("roomSummaryPanel");
  const setupGrid = $("setupGrid");
  const collapseBtn = $("collapseSetupBtn");
  const toggleBtn = $("toggleSetupBtn");

  if (summaryPanel) summaryPanel.hidden = !joined;

  if (!setupGrid) return;

  if (!joined) {
    setupGrid.hidden = false;
    if (collapseBtn) collapseBtn.hidden = true;
    if (toggleBtn) toggleBtn.textContent = "展開房間設定";
    state.setupExpanded = false;
    state.summaryDetailsOpen = false;
    toggleSummaryDetails(false);
    return;
  }

  setupGrid.hidden = !state.setupExpanded;
  if (collapseBtn) collapseBtn.hidden = !state.setupExpanded;
  if (toggleBtn) toggleBtn.textContent = state.setupExpanded ? "收合房間設定" : "展開房間設定";
}

function toggleSetupExpanded(forceValue = null) {
  state.setupExpanded = forceValue === null ? !state.setupExpanded : Boolean(forceValue);
  updateLayoutMode();
}

function renderSummaryPanel() {
  const room = state.room || {};
  const roleText = state.role === "host" ? "主持人" : state.role === "player" ? "玩家" : isStaffActive() ? "已登入店員" : "未加入";
  $("summaryRoomCode").textContent = state.roomId || "-";
  $("summaryRole").textContent = roleText;
  $("summaryHost").textContent = room.hostName || "-";
  $("summaryStatus").textContent = isExpired() ? "expired" : (room.status || "-");
  $("summaryGameMode").textContent = getGameModeValue(room) === "casino" ? "賭場" : "一般";
  $("summaryPot").textContent = String(Math.floor(Number(room.pot || 0)));
  $("summaryJackpot").textContent = String(Math.floor(Number(room.jackpot || 0)));
  $("summaryStartScore").textContent = String(room.startScore ?? $("startScore").value ?? 2500);
  $("summaryMinBet").textContent = String(room.minBet ?? $("minBet").value ?? 100);
  $("summaryBetSeconds").textContent = `${room.betSeconds ?? $("betSeconds").value ?? 45} 秒`;
  $("summaryRound").textContent = String(room.round ?? 0);

  const roomText = isJoinedRoom()
    ? `房間 ${state.roomId || "-"}｜身份：${roleText}｜主持：${room.hostName || "-"}｜模式：${getGameModeValue(room) === "casino" ? "賭場" : "一般"}｜回合 ${room.round ?? 0}｜牌堆 ${getRemainingDeckCount(room.usedCards || [])} 張`
    : "建立或加入房間後，這裡會顯示本場設定與目前狀態。";
  $("roomSummaryText").textContent = roomText;
}

function getPlayerRoundState(player, room = state.room || {}) {
  const minBet = getMinBetValue();
  const hasBet = Number(player?.currentBet || 0) > 0 && Boolean(player?.betType);
  const score = Number(player?.score || 0);

  if (room.status === "settled") return { label: "本局已結算", className: "ready" };
  if (room.status !== "betting") return { label: "等待新一局", className: "waiting" };
  if (score < minBet) return { label: "分數不足", className: "out" };
  return hasBet ? { label: "已下注", className: "ready" } : { label: "等待下注", className: "waiting" };
}

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

function staffRef(uid) {
  return doc(db, "staff", uid);
}

function isStaffActive() {
  return Boolean(state.user && !state.user.isAnonymous && state.staff && state.staff.active === true);
}

function isManager() {
  return isStaffActive() && state.staff.role === "manager";
}

function canHostControl() {
  if (!isStaffActive()) return false;
  if (isManager()) return true;
  return Boolean(state.room?.hostUid && state.room.hostUid === state.user.uid);
}

function requireStaffLogin() {
  if (!isStaffActive()) {
    setStatus("請先用已登記的店員 / 荷官帳號登入。", "err");
    renderAuthState();
    return false;
  }
  return true;
}

function requireHostControl() {
  if (!canHostControl()) {
    setStatus("只有此房間的主持人或 manager 可以操作。", "err");
    renderAuthState();
    return false;
  }
  return true;
}

async function ensurePlayerAuth() {
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }

  state.user = auth.currentUser;
  state.playerId = auth.currentUser.uid;
  state.clientId = auth.currentUser.uid;

  localStorage.setItem("dgPlayerId", state.playerId);
  localStorage.setItem("dgClientId", state.clientId);

  return auth.currentUser;
}

async function loadStaffProfile(user) {
  if (!user || user.isAnonymous) {
    state.staff = null;
    return null;
  }

  const snap = await getDoc(staffRef(user.uid));
  state.staff = snap.exists() ? snap.data() : null;
  return state.staff;
}

function translateAuthError(error) {
  const code = error?.code || "";

  const map = {
    "auth/invalid-credential": "帳號或密碼錯誤，請重新確認。",
    "auth/invalid-email": "Email 格式不正確。",
    "auth/user-not-found": "找不到此店員帳號。",
    "auth/wrong-password": "密碼錯誤，請重新輸入。",
    "auth/missing-password": "請輸入密碼。",
    "auth/missing-email": "請輸入 Email。",
    "auth/too-many-requests": "嘗試次數過多，請稍後再試。",
    "auth/network-request-failed": "網路連線失敗，請稍後再試。",
    "auth/user-disabled": "此帳號已停用。"
  };

  return map[code] || "登入失敗，請確認帳號密碼或稍後再試。";
}

function setAuthError(message = "") {
  const el = $("authError");
  if (!el) return;
  el.textContent = message;
  el.hidden = !message;
}

function toggleStaffAuthForm(forceValue = null) {
  state.authFormOpen = forceValue === null ? !state.authFormOpen : Boolean(forceValue);

  const form = $("staffAuthForm");
  const toggle = $("staffAuthToggleBtn");

  if (form) form.hidden = !state.authFormOpen || isStaffActive();
  if (toggle) {
    toggle.hidden = isStaffActive();
    toggle.textContent = state.authFormOpen ? "收合登入" : "店員登入";
  }
}

function isJoinedRoom() {
  return Boolean(state.connected && state.roomId && (state.role === "host" || state.role === "player"));
}

function toggleSummaryDetails(forceValue = null) {
  state.summaryDetailsOpen = forceValue === null ? !state.summaryDetailsOpen : Boolean(forceValue);

  const details = $("summaryDetails");
  const btn = $("toggleSummaryDetailsBtn");

  if (details) details.hidden = !state.summaryDetailsOpen;
  if (btn) btn.textContent = state.summaryDetailsOpen ? "收合詳細資訊" : "展開詳細資訊";
}

function updateRoomJoinedClass() {
  const joined = isJoinedRoom();
  document.body.classList.toggle("room-joined", joined);

  const gameArea = $("gameArea");
  if (gameArea) gameArea.hidden = !joined;
}

function updateViewPermissions() {
  const staff = isStaffActive();

  document.body.classList.toggle("staff-authenticated", staff);

  document.querySelectorAll(".staff-only").forEach((el) => {
    el.hidden = !staff;
  });

  document.querySelectorAll(".guest-hidden").forEach((el) => {
    el.hidden = !staff;
  });
}

function renderAuthState() {
  const panel = $("authPanel");
  const status = $("authStatus");
  const loginBtn = $("staffLoginBtn");
  const logoutBtn = $("staffLogoutBtn");
  const emailInput = $("staffEmail");
  const passInput = $("staffPassword");
  const toggleBtn = $("staffAuthToggleBtn");
  const form = $("staffAuthForm");
  const hostBtn = $("hostCreateBtn");

  if (!panel || !status) return;

  panel.classList.toggle("staff-ok", isStaffActive());
  panel.classList.toggle("staff-denied", Boolean(state.user && !state.user.isAnonymous && !isStaffActive()));

  updateViewPermissions();

  if (isStaffActive()) {
    status.textContent = `已登入：${state.staff.displayName || state.user.email || state.user.uid}（${state.staff.role || "staff"}）`;
    setAuthError("");
  } else if (state.user && state.user.isAnonymous) {
    status.textContent = "目前是客人匿名身份：可以加入房間下注，但不能開房或主持。";
  } else if (state.user && !state.user.isAnonymous) {
    status.textContent = "此帳號尚未登記為 active staff，不能開房或主持。";
  } else {
    status.textContent = "未登入。客人可以直接加入房間；只有 staff 名單內的店員可以開房與主持。";
  }

  if (loginBtn) loginBtn.hidden = isStaffActive();
  if (logoutBtn) logoutBtn.hidden = !state.user;
  if (emailInput) emailInput.hidden = isStaffActive();
  if (passInput) passInput.hidden = isStaffActive();
  if (toggleBtn) toggleBtn.hidden = isStaffActive();
  if (form) form.hidden = !state.authFormOpen || isStaffActive();

  if (hostBtn) {
    hostBtn.disabled = !isStaffActive();
    hostBtn.hidden = !isStaffActive();
    hostBtn.classList.toggle("locked", !isStaffActive());
    hostBtn.textContent = "我是主持人：建立 / 連線房間";
  }

  updateActionButtons();
  renderSummaryPanel();
}

async function loginStaff() {
  const email = $("staffEmail").value.trim();
  const password = $("staffPassword").value;

  setAuthError("");

  if (!email || !password) {
    const message = !email ? "請輸入店員 Email。" : "請輸入密碼。";
    setAuthError(message);
    setStatus(message, "err");
    return;
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await loadStaffProfile(cred.user);
    renderAuthState();

    if (isStaffActive()) {
      toggleStaffAuthForm(false);
      setStatus("店員登入成功，可以開房與主持。", "ok");
    } else {
      const message = "登入成功，但此帳號尚未加入 staff 或 active 不是 true。";
      setAuthError(message);
      setStatus(message, "err");
    }
  } catch (error) {
    toggleStaffAuthForm(true);
    const message = translateAuthError(error);
    setAuthError(message);
    setStatus(message, "err");
  }
}

async function logoutCurrentUser() {
  await stopPresence(true);

  localStorage.removeItem("dgRole");
  localStorage.removeItem("dgRoomId");
  localStorage.removeItem("dgPlayerId");
  state.role = "";
  state.playerId = "";
  state.staff = null;
  state.user = null;

  disconnectRoom();
  await signOut(auth);
  setAuthError("");
  toggleStaffAuthForm(false);
  renderAuthState();
  setStatus("已登出。", "");
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

function clampNumber(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function getGameModeValue(room = state.room) {
  return room?.gameMode || $("gameMode")?.value || "normal";
}

function isCasinoMode(room = state.room) {
  return getGameModeValue(room) === "casino";
}

function getAnteValue(room = state.room) {
  return Math.max(0, Math.floor(Number(room?.ante ?? $("ante")?.value ?? 100)));
}

function getInitialPotValue(room = state.room) {
  return Math.max(0, Math.floor(Number(room?.initialPot ?? $("initialPot")?.value ?? 5000)));
}

function getPotTopUpAmountValue() {
  return Math.max(100, Math.floor(Number($("potTopUpAmount")?.value || 5000)));
}

function getJackpotRateValue(room = state.room) {
  const raw = Number(room?.jackpotRate ?? (($("jackpotRate")?.value ?? 20) / 100));
  return clampNumber(raw > 1 ? raw / 100 : raw, 0, 1);
}

function getPotRiskRateValue(room = state.room) {
  const raw = Number(room?.potRiskRate ?? (($("potRiskRate")?.value ?? 20) / 100));
  return clampNumber(raw > 1 ? raw / 100 : raw, 0.05, 1);
}

function getRebuyAmountValue(room = state.room) {
  return Math.max(100, Math.floor(Number(room?.rebuyAmount ?? $("rebuyAmount")?.value ?? 2500)));
}

function isPreStartBuyInAvailable(room = state.room) {
  return Boolean(
    isCasinoMode(room) &&
    Number(room?.round || 0) === 0 &&
    !room?.gateA &&
    !room?.gateB &&
    !room?.resultCard &&
    (room?.status || "waiting") === "waiting"
  );
}

function getRebuyActionLabel(room = state.room) {
  return isPreStartBuyInAvailable(room) ? "開局前加購" : "補籌碼";
}

function getPairPostPenaltyValue(room = state.room) {
  if (!isCasinoMode(room)) return 1;
  return Math.max(1, Math.floor(Number(room?.pairPostPenalty ?? $("pairPostPenalty")?.value ?? 3)));
}

function formatSignedNumber(value) {
  const n = Math.floor(Number(value || 0));
  return n >= 0 ? `+${n}` : `${n}`;
}

function getPlayerNet(player) {
  return Math.floor(Number(player?.totalWin || 0) - Number(player?.totalLoss || 0));
}

function getPlayerStatsText(player) {
  if (!isCasinoMode()) return "";

  const win = Math.floor(Number(player?.totalWin || 0));
  const loss = Math.floor(Number(player?.totalLoss || 0));
  const rebuy = Math.floor(Number(player?.rebuyCount || 0));
  const extraBuyIn = Math.floor(Number(player?.extraBuyIn || 0));
  const net = getPlayerNet(player);

  const parts = [`戰績 ${formatSignedNumber(net)}`];
  if (win || loss) parts.push(`贏 ${win}｜輸 ${loss}`);
  if (extraBuyIn) parts.push(`開局加購 ${extraBuyIn}`);
  if (rebuy) parts.push(`補籌碼 ${rebuy} 次`);

  return parts.join("｜");
}

function setGameMode(value = "normal") {
  const mode = value === "casino" ? "casino" : "normal";
  if ($("gameMode")) $("gameMode").value = mode;

  document.querySelectorAll(".mode-option").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.gameMode === mode);
  });

  document.querySelectorAll(".casino-only").forEach((el) => {
    el.hidden = mode !== "casino";
  });
}

function updateCasinoPanel() {
  const room = state.room || {};
  const casino = isCasinoMode(room);
  const panel = $("casinoPanel");
  if (panel) panel.hidden = !casino;

  if ($("casinoModeText")) $("casinoModeText").textContent = GAME_MODE_LABELS[getGameModeValue(room)] || "一般模式";
  if ($("potText")) $("potText").textContent = String(Math.floor(Number(room.pot || 0)));
  if ($("jackpotText")) $("jackpotText").textContent = String(Math.floor(Number(room.jackpot || 0)));
  if ($("anteText")) $("anteText").textContent = String(getAnteValue(room));
  if ($("rebuyText")) $("rebuyText").textContent = String(getRebuyAmountValue(room));
  if ($("pairPostPenaltyText")) $("pairPostPenaltyText").textContent = `賠 ${getPairPostPenaltyValue(room)} 倍`;
}

function getCasinoRoomPatchFromInputs() {
  const gameMode = getGameModeValue();
  return {
    gameMode,
    initialPot: getInitialPotValue({ initialPot: Number($("initialPot")?.value || 5000) }),
    ante: Math.max(0, Math.floor(Number($("ante")?.value || 100))),
    jackpotRate: getJackpotRateValue({ jackpotRate: Number($("jackpotRate")?.value || 20) / 100 }),
    potRiskRate: getPotRiskRateValue({ potRiskRate: Number($("potRiskRate")?.value || 20) / 100 }),
    rebuyAmount: getRebuyAmountValue({ rebuyAmount: Number($("rebuyAmount")?.value || 2500) }),
    pairPostPenalty: Math.max(1, Math.floor(Number($("pairPostPenalty")?.value || 3))),
    pot: gameMode === "casino" ? getInitialPotValue({ initialPot: Number($("initialPot")?.value || 5000) }) : 0,
    jackpot: 0
  };
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
    } else if (kind === "reveal") {
      tone(620, 0.055, 0, "triangle", 0.035);
      tone(720, 0.055, 0.09, "triangle", 0.038);
      tone(840, 0.07, 0.19, "triangle", 0.04);
      tone(980, 0.09, 0.32, "triangle", 0.042);
    } else if (kind === "pair") {
      tone(740, 0.10, 0, "triangle", 0.045);
      tone(980, 0.12, 0.12, "triangle", 0.05);
      tone(1240, 0.22, 0.26, "sine", 0.04);
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

  if (betCountdownHandle) {
    clearInterval(betCountdownHandle);
    betCountdownHandle = null;
  }

  state.room = null;
  state.players = [];
  state.presence = [];
  setConnected(false);
  renderPresence();
  $("remainingTime").textContent = "--:--:--";
  renderRoom();
  renderPlayers();
  renderSummaryPanel();
  updateLayoutMode();
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
  updateLayoutMode();
}

async function writeMyPresence() {
  if (!state.role || !state.roomId || !auth.currentUser) return;
  state.clientId = auth.currentUser.uid;

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

  if (!state.role || !auth.currentUser) {
    renderPresence();
    return;
  }
  state.clientId = auth.currentUser.uid;

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
      betSeconds: Math.max(10, Math.floor(Number($("betSeconds").value || state.room?.betSeconds || 45))),
      gameMode: getGameModeValue(),
      initialPot: getInitialPotValue(),
      ante: getAnteValue(),
      jackpotRate: getJackpotRateValue(),
      potRiskRate: getPotRiskRateValue(),
      rebuyAmount: getRebuyAmountValue(),
      pairPostPenalty: getPairPostPenaltyValue(),
      pot: getGameModeValue() === "casino" ? getInitialPotValue() : 0,
      jackpot: 0,
      betDeadlineAt: null,
      autoFilled: false,
      round: 0,
      gateA: null,
      gateB: null,
      resultCard: null,
      usedCards: [],
      deckResetCount: 0,
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
  const roomLabel = $("roomLabel"); if (roomLabel) roomLabel.textContent = state.roomId || "尚未連線";
  const summaryRoomCode = $("summaryRoomCode"); if (summaryRoomCode) summaryRoomCode.textContent = state.roomId || "-";
}

async function copyText(text) {
  await navigator.clipboard.writeText(text);
}

function createDeck() {
  const deck = [];

  RANKS.forEach((rank) => {
    SUITS.forEach((suit) => {
      deck.push({
        id: `${rank.label}${suit}`,
        label: `${rank.label}${suit}`,
        rank: rank.value,
        suit
      });
    });
  });

  return deck;
}

function getCardId(card) {
  if (!card) return "";
  if (card.id) return String(card.id);

  const label = String(card.label || "");
  if (label) return label;

  const suit = getCardSuit(card);
  const rank = RANKS.find((r) => r.value === card.rank)?.label || String(card.rank || "");
  return rank && suit ? `${rank}${suit}` : "";
}

function normalizeUsedCards(usedCards = []) {
  return Array.from(new Set((Array.isArray(usedCards) ? usedCards : [])
    .map((id) => String(id || ""))
    .filter(Boolean)));
}

function getRemainingDeck(usedCards = []) {
  const used = new Set(normalizeUsedCards(usedCards));
  return createDeck().filter((card) => !used.has(card.id));
}

function getRemainingDeckCount(usedCards = []) {
  return getRemainingDeck(usedCards).length;
}

function drawFromDeck(count = 1, usedCards = []) {
  const used = normalizeUsedCards(usedCards);
  const deck = getRemainingDeck(used);

  if (deck.length < count) {
    throw new Error("牌堆剩餘不足，請重新洗牌。");
  }

  const drawn = [];
  const usedAfter = [...used];

  for (let i = 0; i < count; i += 1) {
    const remaining = deck.filter((card) => !usedAfter.includes(card.id));
    const picked = remaining[Math.floor(Math.random() * remaining.length)];
    drawn.push(picked);
    usedAfter.push(picked.id);
  }

  return {
    drawn,
    usedCards: normalizeUsedCards(usedAfter)
  };
}

function prepareUsedCardsForNewRound(room = state.room || {}) {
  const used = normalizeUsedCards(room.usedCards || []);
  const remaining = getRemainingDeckCount(used);

  // 每局需要至少 3 張牌：兩張門牌與一張結果牌。
  // 不足 3 張時自動重新洗牌。
  if (remaining < 3) {
    return {
      usedCards: [],
      reshuffled: true
    };
  }

  return {
    usedCards: used,
    reshuffled: false
  };
}

function getUsedCardsForResult(room = state.room || {}) {
  const used = normalizeUsedCards(room.usedCards || []);
  const gateIds = [getCardId(room.gateA), getCardId(room.gateB)].filter(Boolean);
  let merged = normalizeUsedCards([...used, ...gateIds]);

  // 正常流程不會在結果牌階段洗牌；這裡只是防呆。
  if (getRemainingDeckCount(merged) < 1) {
    merged = normalizeUsedCards(gateIds);
    return {
      usedCards: merged,
      reshuffled: true
    };
  }

  return {
    usedCards: merged,
    reshuffled: false
  };
}

function getCard() {
  // 保留舊函式作為防呆；正式發牌請使用 drawFromDeck。
  return drawFromDeck(1, []).drawn[0];
}

function getCardSuit(card) {
  if (!card) return "";
  if (card.suit) return card.suit;

  const label = String(card.label || "");
  const found = SUITS.find((suit) => label.includes(suit));
  return found || "";
}

function getSuitGuessMultiplier(room = state.room) {
  return isCasinoMode(room) ? 3 : 0;
}

function isSuitBetType(betType) {
  return Boolean(BET_SUIT_MAP[betType]);
}

function setCardView(id, card) {
  const el = $(id);
  if (!el) return;

  const suit = getCardSuit(card);
  el.textContent = card?.label || "?";
  el.classList.toggle("red-suit", suit === "♥" || suit === "♦");
  el.classList.toggle("black-suit", suit === "♠" || suit === "♣");
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

function getGateMode(gateA, gateB) {
  const gate = getGateInfo(gateA, gateB);
  if (!gate) return "none";
  if (gate.same) return "pair";
  if (gate.adjacent) return "invalid";
  return "normal";
}

function getInsideMultiplierByWidth(width) {
  if (width <= 0) return 0;
  if (width === 1) return 8;
  if (width === 2) return 5;
  if (width === 3) return 3;
  if (width <= 5) return 2;
  return 1;
}

function getPairHitRange(rank, betType) {
  if (betType === "higher") return Math.max(0, 13 - Number(rank || 0));
  if (betType === "lower") return Math.max(0, Number(rank || 0) - 1);
  return 0;
}

function getPairMultiplierByRange(range) {
  if (range <= 0) return 0;
  if (range <= 2) return 5;
  if (range <= 4) return 3;
  if (range <= 8) return 2;
  return 1;
}

function getPairMultiplier(rank, betType) {
  return getPairMultiplierByRange(getPairHitRange(rank, betType));
}

function getRoundMultipliers(gateA, gateB) {
  const gate = getGateInfo(gateA, gateB);
  const mode = getGateMode(gateA, gateB);
  const width = gate?.width ?? 0;

  if (mode === "pair") {
    const rank = gateA?.rank ?? 0;
    return {
      mode,
      width: 0,
      higher: getPairMultiplier(rank, "higher"),
      lower: getPairMultiplier(rank, "lower"),
      suit: getSuitGuessMultiplier(),
      post: 0,
      outside: 0
    };
  }

  return {
    mode,
    width,
    inside: getInsideMultiplierByWidth(width),
    post: 3,
    outside: 1
  };
}

function multiplierText(value) {
  return value > 0 ? `${value} 倍` : "不可";
}

function cardRankName(value) {
  const found = RANKS.find((r) => r.value === value);
  return found ? found.label : String(value ?? "-");
}

function updateMultiplierPanel() {
  const room = state.room || {};
  const gate = getGateInfo(room.gateA, room.gateB);
  const mode = getGateMode(room.gateA, room.gateB);
  const multipliers = getRoundMultipliers(room.gateA, room.gateB);

  const gateLabel = $("gateMetricLabel");
  const insideLabel = $("insideMultiplierLabel");
  const postLabel = $("postMultiplierLabel");
  const outsideLabel = $("outsideMultiplierLabel");
  const suitItem = $("suitMultiplierItem");
  const suitText = $("suitMultiplierText");
  const widthText = $("gateWidthText");
  const insideText = $("insideMultiplierText");
  const postText = $("postMultiplierText");
  const outsideText = $("outsideMultiplierText");

  document.body.classList.toggle("pair-gate", mode === "pair");
  document.body.classList.toggle("invalid-gate", mode === "invalid");

  if (!room.gateA || !room.gateB) {
    gateLabel.textContent = "門寬";
    insideLabel.textContent = "進洞";
    postLabel.textContent = "押撞柱";
    outsideLabel.textContent = "出界";
    widthText.textContent = "--";
    insideText.textContent = "--";
    postText.textContent = "3 倍";
    outsideText.textContent = "1 倍";
    if (suitItem) suitItem.hidden = true;
    return;
  }

  if (mode === "pair") {
    const rank = room.gateA.rank;
    const higherRange = getPairHitRange(rank, "higher");
    const lowerRange = getPairHitRange(rank, "lower");

    gateLabel.textContent = "門柱";
    insideLabel.textContent = "猜大";
    postLabel.textContent = "猜小";
    outsideLabel.textContent = "撞柱";
    widthText.textContent = `${cardRankName(rank)} 對`;
    insideText.textContent = multiplierText(multipliers.higher);
    postText.textContent = multiplierText(multipliers.lower);
    outsideText.textContent = `賠 ${getPairPostPenaltyValue(room)} 倍`;
    if (suitItem) suitItem.hidden = !isCasinoMode(room);
    if (suitText) suitText.textContent = multiplierText(getSuitGuessMultiplier(room));

    const higherDesc = $("higherBetDesc");
    const lowerDesc = $("lowerBetDesc");
    if (higherDesc) higherDesc.textContent = higherRange ? `大於門柱，${higherRange} 種可中｜${multiplierText(multipliers.higher)}` : "沒有更大的牌，不可下注";
    if (lowerDesc) lowerDesc.textContent = lowerRange ? `小於門柱，${lowerRange} 種可中｜${multiplierText(multipliers.lower)}` : "沒有更小的牌，不可下注";
    return;
  }

  gateLabel.textContent = mode === "invalid" ? "門牌" : "門寬";
  insideLabel.textContent = "進洞";
  postLabel.textContent = "押撞柱";
  outsideLabel.textContent = "出界";
  widthText.textContent = mode === "invalid" ? "順子門" : `${multipliers.width} 格`;
  insideText.textContent = mode === "invalid" ? "不可" : multiplierText(multipliers.inside);
  postText.textContent = multiplierText(multipliers.post);
  outsideText.textContent = multiplierText(multipliers.outside);
  if (suitItem) suitItem.hidden = true;
}

function getAvailableBetTypes() {
  const room = state.room || {};
  const mode = getGateMode(room.gateA, room.gateB);

  if (mode === "pair") {
    const rank = room.gateA?.rank ?? 0;
    const values = ["higher", "lower"].filter((type) => getPairMultiplier(rank, type) > 0);

    if (isCasinoMode(room)) {
      values.push("suit_spade", "suit_heart", "suit_diamond", "suit_club");
    }

    return values;
  }

  if (mode === "normal") {
    return ["inside", "post", "outside"];
  }

  return [];
}

function updateBetTypeOptions() {
  const room = state.room || {};
  const mode = getGateMode(room.gateA, room.gateB);
  const available = getAvailableBetTypes();
  const casinoPair = mode === "pair" && isCasinoMode(room);

  document.querySelectorAll(".normal-bet").forEach((btn) => {
    btn.hidden = mode === "pair";
  });

  document.querySelectorAll(".pair-bet").forEach((btn) => {
    btn.hidden = mode !== "pair";
  });

  document.querySelectorAll(".pair-suit-bet").forEach((btn) => {
    btn.hidden = !casinoPair;
  });

  document.querySelectorAll(".bet-type-option").forEach((btn) => {
    const usable = available.includes(btn.dataset.betType);
    btn.classList.toggle("unavailable", !usable && mode === "pair");
    btn.disabled = btn.disabled || (!usable && mode === "pair");
  });

  const current = $("betType")?.value;
  if (!available.includes(current)) {
    setBetType(available[0] || "inside");
  }
}

function judgeBet(betType, amount, gateA, gateB, resultCard) {
  const gate = getGateInfo(gateA, gateB);
  const mode = getGateMode(gateA, gateB);

  if (!gate || !resultCard || !amount) {
    return { delta: 0, label: "未結算", multiplier: 0 };
  }

  if (mode === "invalid") {
    return { delta: 0, label: "無效門牌，需重新發牌", multiplier: 0 };
  }

  if (mode === "pair") {
    const rank = gateA.rank;
    const hitPost = resultCard.rank === rank;
    const higher = resultCard.rank > rank;
    const lower = resultCard.rank < rank;
    const multiplier = getPairMultiplier(rank, betType);

    if (isSuitBetType(betType)) {
      const suitMultiplier = getSuitGuessMultiplier();
      const guessedSuit = BET_SUIT_MAP[betType];
      const resultSuit = getCardSuit(resultCard);
      return resultSuit === guessedSuit
        ? { delta: amount * suitMultiplier, label: `${BET_LABELS[betType]}成功 ×${suitMultiplier}`, multiplier: suitMultiplier }
        : { delta: -amount, label: `${BET_LABELS[betType]}失敗`, multiplier: suitMultiplier };
    }

    if (hitPost) {
      const postPenalty = getPairPostPenaltyValue();
      return { delta: -(amount * postPenalty), label: `撞柱失敗 ×${postPenalty}`, multiplier: postPenalty };
    }

    if (betType === "higher") {
      return higher
        ? { delta: amount * multiplier, label: `猜大成功 ×${multiplier}`, multiplier }
        : { delta: -amount, label: "猜大失敗", multiplier };
    }

    if (betType === "lower") {
      return lower
        ? { delta: amount * multiplier, label: `猜小成功 ×${multiplier}`, multiplier }
        : { delta: -amount, label: "猜小失敗", multiplier };
    }

    return { delta: -amount, label: "下注類型錯誤", multiplier: 0 };
  }

  const multipliers = getRoundMultipliers(gateA, gateB);
  const hitPost = resultCard.rank === gate.low || resultCard.rank === gate.high;
  const inside = resultCard.rank > gate.low && resultCard.rank < gate.high;
  const outside = !inside && !hitPost;

  if (betType === "inside") {
    return inside
      ? { delta: amount * multipliers.inside, label: `進洞成功 ×${multipliers.inside}`, multiplier: multipliers.inside }
      : { delta: -amount, label: hitPost ? "撞柱失敗" : "出界失敗", multiplier: multipliers.inside };
  }

  if (betType === "post") {
    return hitPost
      ? { delta: amount * multipliers.post, label: `撞柱成功 ×${multipliers.post}`, multiplier: multipliers.post }
      : { delta: -amount, label: inside ? "進洞未中" : "出界未中", multiplier: multipliers.post };
  }

  if (betType === "outside") {
    return outside
      ? { delta: amount * multipliers.outside, label: `出界成功 ×${multipliers.outside}`, multiplier: multipliers.outside }
      : { delta: -amount, label: hitPost ? "撞柱未中" : "進洞未中", multiplier: multipliers.outside };
  }

  return { delta: 0, label: "未結算", multiplier: 0 };
}
function setBetType(value) {
  const input = $("betType");
  if (input) input.value = value;

  document.querySelectorAll(".bet-type-option").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.betType === value);
  });

  updateBetLimitHint();
}

function updateBetTypePickerDisabled(disabled) {
  const available = getAvailableBetTypes();

  document.querySelectorAll(".bet-type-option").forEach((btn) => {
    const usable = available.includes(btn.dataset.betType);
    btn.disabled = disabled || !usable;
  });
}

function getMinBetValue() {
  return Math.max(1, Number(state.room?.minBet ?? $("minBet").value ?? 100));
}

function getPotentialWinMultiplier(betType = $("betType")?.value, room = state.room || {}) {
  if (!room?.gateA || !room?.gateB) return 0;

  const mode = getGateMode(room.gateA, room.gateB);
  const multipliers = getRoundMultipliers(room.gateA, room.gateB);

  if (mode === "pair") {
    if (betType === "higher") return Number(multipliers.higher || 0);
    if (betType === "lower") return Number(multipliers.lower || 0);
    if (isSuitBetType(betType)) return Number(getSuitGuessMultiplier(room) || 0);
    return 0;
  }

  if (mode === "normal") {
    return Number(multipliers[betType] || 0);
  }

  return 0;
}

function getCasinoRiskLimitInfo(betType = $("betType")?.value, room = state.room || {}) {
  if (!isCasinoMode(room)) {
    return {
      enabled: false,
      maxBet: Infinity,
      maxPayout: Infinity,
      multiplier: getPotentialWinMultiplier(betType, room),
      rate: 1,
      pot: Math.floor(Number(room?.pot || 0))
    };
  }

  const pot = Math.max(0, Math.floor(Number(room?.pot || 0)));
  const rate = getPotRiskRateValue(room);
  const maxPayout = Math.floor(pot * rate);
  const multiplier = getPotentialWinMultiplier(betType, room);
  const maxBet = multiplier > 0 ? Math.floor(maxPayout / multiplier) : 0;

  return {
    enabled: true,
    maxBet,
    maxPayout,
    multiplier,
    rate,
    pot
  };
}

function getCurrentBetCap(betType = $("betType")?.value) {
  const score = getSelfScore();
  const info = getCasinoRiskLimitInfo(betType);

  if (!info.enabled) return score;
  return Math.max(0, Math.min(score, info.maxBet));
}

function updateBetLimitHint() {
  const el = $("betLimitHint");
  if (!el) return;

  const room = state.room || {};
  const betType = $("betType")?.value || "";
  const info = getCasinoRiskLimitInfo(betType, room);
  const minBet = getMinBetValue();

  el.classList.remove("warning");

  if (!info.enabled || state.role !== "player" || room.status !== "betting" || !room.gateA || !room.gateB || room.resultCard || !getAvailableBetTypes().includes(betType)) {
    el.hidden = true;
    el.textContent = "";
    return;
  }

  el.hidden = false;

  if (info.maxBet < minBet) {
    el.classList.add("warning");
    el.textContent = `賭場限注：目前獎金池承擔上限 ${info.maxPayout} 分，低於最低下注需求。請荷官補池或調高風險比例。`;
    return;
  }

  const score = getSelfScore();
  const cap = Math.min(score, info.maxBet);
  const riskPct = Math.round(info.rate * 100);
  const typeLabel = BET_LABELS[betType] || betType;

  el.textContent = `賭場限注：${typeLabel} 最高可下注 ${cap} 分（獎金池單局承擔 ${riskPct}%＝${info.maxPayout} 分，倍率 ${info.multiplier} 倍）。`;
}

function getSelfScore() {
  const self = state.players.find((p) => p.id === state.playerId);
  return Math.max(0, Math.floor(Number(self?.score ?? state.room?.startScore ?? 0)));
}

function getBetSecondsValue() {
  return Math.max(10, Math.floor(Number(state.room?.betSeconds ?? $("betSeconds").value ?? 45)));
}

function getBetDeadlineMillis() {
  return timestampToMillis(state.room?.betDeadlineAt);
}

function getSelfPlayer() {
  if (!state.playerId) return null;
  return state.players.find((p) => p.id === state.playerId) || null;
}

function hasSelfSubmittedBet() {
  const self = getSelfPlayer();
  return Boolean(self && Number(self.currentBet || 0) > 0 && self.betType);
}

function isPlayerBetLocked() {
  return Boolean(state.role === "player" && hasSelfSubmittedBet());
}

function assertPlayerBetEditable(actionText = "修改下注") {
  if (isBetDeadlinePassed()) {
    setStatus("下注時間已截止，不能再" + actionText + "。", "err");
    updateActionButtons();
    return false;
  }

  if (isPlayerBetLocked()) {
    setStatus("本局下注已送出，不能再" + actionText + "。", "err");
    updateActionButtons();
    return false;
  }

  return true;
}

function isBetDeadlinePassed() {
  const room = state.room || {};
  const deadline = getBetDeadlineMillis();

  return Boolean(
    room.status === "betting" &&
    deadline &&
    Date.now() >= deadline
  );
}

function getRandomBetType() {
  const values = getAvailableBetTypes();
  if (!values.length) return "";
  return values[Math.floor(Math.random() * values.length)];
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
  if (!assertPlayerBetEditable("調整下注")) return;

  const minBet = getMinBetValue();
  const current = normalizeBetAmount($("betAmount").value);
  setBetAmount(current + delta * minBet);
  chipAccumulated = true;
}

function addChipAmount(chipValue) {
  if (!assertPlayerBetEditable("調整下注")) return;

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
    getGateMode(room.gateA, room.gateB) !== "invalid" &&
    !room.resultCard &&
    progress.allReady &&
    !settlingInProgress &&
    !isExpired()
  );
}

function canStartNewRoundOrRedeal() {
  const room = state.room || {};
  const mode = getGateMode(room.gateA, room.gateB);

  if (isExpired() || !canHostControl() || settlingInProgress || autoFillingBets) return false;
  if (!room.status || room.status === "waiting" || room.status === "settled") return true;
  if (room.status === "betting" && mode === "invalid") return true;
  return false;
}

function updateActionButtons() {
  const room = state.room || {};
  const expired = isExpired();
  const mode = getGateMode(room.gateA, room.gateB);
  const bettingOpen = room.status === "betting" && room.gateA && room.gateB && mode !== "invalid" && !room.resultCard && !expired && !isBetDeadlinePassed();
  const revealing = isResultRevealActiveForRoom(room);
  const playerBetLocked = isPlayerBetLocked();
  const playerCanEditBet = bettingOpen && !playerBetLocked;

  const newRoundBtn = $("newRoundBtn");
  const drawResultBtn = $("drawResultBtn");
  const submitBetBtn = $("submitBetBtn");
  const clearBetBtn = $("clearBetBtn");
  const allInBtn = $("allInBtn");
  const autoFillBetsBtn = $("autoFillBetsBtn");

  if (newRoundBtn) {
    newRoundBtn.disabled = revealing || !canStartNewRoundOrRedeal();
    newRoundBtn.textContent = mode === "invalid" && room.status === "betting" ? "重新發牌" : "開始下一局";
  }
  if (drawResultBtn) drawResultBtn.disabled = revealing || !canDrawResult();
  if (autoFillBetsBtn) autoFillBetsBtn.disabled = revealing || !(bettingOpen && canHostControl() && getBetProgress().missing.length > 0);
  if (submitBetBtn) submitBetBtn.disabled = !playerCanEditBet || getAvailableBetTypes().length === 0;
  if (clearBetBtn) clearBetBtn.disabled = !playerCanEditBet;
  if (allInBtn) allInBtn.disabled = !playerCanEditBet;
  updateBetTypeOptions();
  updateBetTypePickerDisabled(!playerCanEditBet);
  updateBetAmountDisabled(!playerCanEditBet);

  const picker = $("betTypePicker");
  const amountControl = document.querySelector(".bet-amount-control");
  if (picker) picker.classList.toggle("locked", playerBetLocked || !bettingOpen);
  if (amountControl) amountControl.classList.toggle("locked", playerBetLocked || !bettingOpen);
  updateBetLimitHint();
}
function updateBetCountdown() {
  const el = $("betCountdown");
  if (!el) return;

  const room = state.room || {};
  el.classList.remove("urgent");

  if (room.status !== "betting" || !room.betDeadlineAt || room.resultCard) {
    el.textContent = "下注倒數：-- 秒";
    return;
  }

  const leftMs = getBetDeadlineMillis() - Date.now();
  const left = Math.max(0, Math.ceil(leftMs / 1000));
  el.textContent = `下注倒數：${left} 秒`;

  if (left <= 10) {
    el.classList.add("urgent");
  }

  if (left <= 0) {
    el.textContent = "下注倒數：0 秒｜下注已截止";
  }

  if (left <= 0 && state.role === "host" && !autoFillingBets) {
    autoFillMissingBets("timeout").catch((error) => setStatus(error.message, "err"));
  }

  updateActionButtons();
}

function startBetCountdown() {
  if (betCountdownHandle) clearInterval(betCountdownHandle);
  updateBetCountdown();
  betCountdownHandle = setInterval(updateBetCountdown, 1000);
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

  if (getGateMode(room.gateA, room.gateB) === "invalid") {
    el.textContent = "下注進度：順子門無效，請主持人重新發牌";
    el.classList.add("waiting");
    updateActionButtons();
    return;
  }

  if (progress.eligibleCount === 0) {
    el.textContent = "下注進度：目前沒有可下注玩家";
    el.classList.add("waiting");
    updateActionButtons();
    return;
  }

  if (isPlayerBetLocked() && !isBetDeadlinePassed()) {
    const self = getSelfPlayer();
    el.textContent = `下注進度：你已送出 ${BET_LABELS[self.betType] || self.betType} ${self.currentBet} 分，本局不可更改`;
    el.classList.add("locked");
    updateActionButtons();
    return;
  }

  if (progress.allReady) {
    el.textContent = isBetDeadlinePassed()
      ? `下注進度：${progress.betCount}/${progress.eligibleCount}，下注已截止，可以結算`
      : `下注進度：${progress.betCount}/${progress.eligibleCount}，所有可下注玩家已完成`;
    el.classList.add("ready");
    updateActionButtons();
    return;
  }

  const names = progress.missing.map((p) => p.name).filter(Boolean).join("、");
  el.textContent = isBetDeadlinePassed()
    ? `下注進度：${progress.betCount}/${progress.eligibleCount}，下注已截止，等待系統補齊`
    : `下注進度：${progress.betCount}/${progress.eligibleCount}，等待 ${names || "玩家"} 下注`;
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
    const revealKey = getResultRevealKey(room);
    const key = `${state.roomId}-${room.round}-settled-${room.resultCard.label}`;
    if (lastSettledKey !== key && lastResultRevealKey === revealKey && !isResultRevealActiveForRoom(room)) {
      lastSettledKey = key;
      playSound("settled");
    }
  }
}

function getResultRevealKey(room = state.room || {}) {
  if (!room?.resultCard) return "";
  return `${state.roomId || ""}:${room.round || 0}:${getCardId(room.resultCard) || room.resultCard.label || ""}`;
}

function clearResultRevealTimers() {
  resultRevealTimers.forEach((timerId) => clearTimeout(timerId));
  resultRevealTimers = [];
}

function setResultRevealClasses(active = false, final = false) {
  const panel = document.querySelector(".main-game-panel");
  const resultEl = $("resultCard");

  if (panel) panel.classList.toggle("result-reveal-active", active);
  if (resultEl) {
    resultEl.classList.toggle("reveal-spinning", active);
    resultEl.classList.toggle("reveal-final", final);
  }
}

function isResultRevealActiveForRoom(room = state.room || {}) {
  return Boolean(resultRevealInProgress && currentResultRevealKey && currentResultRevealKey === getResultRevealKey(room));
}

function getRandomVisualCard() {
  const deck = createDeck();
  return deck[Math.floor(Math.random() * deck.length)];
}

function startResultReveal(room = state.room || {}) {
  if (!room?.resultCard) return;

  const key = getResultRevealKey(room);
  if (!key || key === lastResultRevealKey || currentResultRevealKey === key) return;

  clearResultRevealTimers();

  resultRevealInProgress = true;
  currentResultRevealKey = key;
  setResultRevealClasses(true, false);

  const resultEl = $("resultCard");
  if (resultEl) resultEl.textContent = "?";

  const roundResult = $("roundResult");
  if (roundResult) roundResult.textContent = "結果牌開獎中……";

  playSound("reveal");

  const steps = 16;
  const finalCard = room.resultCard;

  for (let i = 0; i < steps; i += 1) {
    const delay = 45 + i * 72 + Math.max(0, i - 9) * 24;
    resultRevealTimers.push(setTimeout(() => {
      setCardView("resultCard", getRandomVisualCard());
      if (soundEnabled && (i === 4 || i === 9 || i === 13)) {
        tone(720 + i * 28, 0.035, 0, "triangle", 0.025);
      }
    }, delay));
  }

  const finalDelay = 45 + steps * 72 + 360;
  resultRevealTimers.push(setTimeout(() => {
    setCardView("resultCard", finalCard);
    resultRevealInProgress = false;
    lastResultRevealKey = key;
    currentResultRevealKey = "";
    setResultRevealClasses(false, true);

    if ($("roundResult")) $("roundResult").textContent = room.roundResult || "本局已結算。";
    playSound("settled");

    // V38：開獎動畫結束後，立即刷新主持人按鈕狀態。
    // V37 在動畫結束後沒有重新呼叫 updateActionButtons，
    // 因此「開始下一局」可能會維持 disabled，直到下一次 Firebase 更新或重新整理。
    updateActionButtons();

    resultRevealTimers.push(setTimeout(() => {
      const resultCard = $("resultCard");
      if (resultCard) resultCard.classList.remove("reveal-final");
      updateActionButtons();
    }, 1300));
  }, finalDelay));
}

function resetResultRevealIfNoResult(room = state.room || {}) {
  if (room?.resultCard) return;
  clearResultRevealTimers();
  resultRevealInProgress = false;
  currentResultRevealKey = "";
  setResultRevealClasses(false, false);
}

function updatePairVisualState(room = state.room || {}) {
  const mode = getGateMode(room.gateA, room.gateB);
  const isPair = mode === "pair" && room.gateA && room.gateB;
  const panel = document.querySelector(".main-game-panel");
  const alert = $("pairAlert");

  if (panel) panel.classList.toggle("pair-round", Boolean(isPair));
  if (alert) alert.hidden = !isPair;
}

function triggerPairEffect(room = state.room || {}) {
  const mode = getGateMode(room.gateA, room.gateB);
  const isPair = mode === "pair" && room.gateA && room.gateB && !room.resultCard;

  updatePairVisualState(room);

  if (!isPair) return;

  const key = `${state.roomId || ""}:${room.round || 0}:${getCardId(room.gateA)}:${getCardId(room.gateB)}`;
  if (!key || key === lastPairEffectKey) return;

  lastPairEffectKey = key;

  const panel = document.querySelector(".main-game-panel");
  const alert = $("pairAlert");
  const gateA = $("gateA");
  const gateB = $("gateB");

  [panel, alert, gateA, gateB].forEach((el) => {
    if (!el) return;
    el.classList.remove("pair-effect-active", "flash", "pair-card-glow");
    void el.offsetWidth;
  });

  if (panel) panel.classList.add("pair-effect-active");
  if (alert) {
    alert.hidden = false;
    alert.classList.add("flash");
  }
  if (gateA) gateA.classList.add("pair-card-glow");
  if (gateB) gateB.classList.add("pair-card-glow");

  playSound("pair");

  setTimeout(() => {
    if (panel) panel.classList.remove("pair-effect-active");
    if (alert) alert.classList.remove("flash");
    if (gateA) gateA.classList.remove("pair-card-glow");
    if (gateB) gateB.classList.remove("pair-card-glow");
  }, 2100);
}

function renderRoom() {
  const room = state.room || {};
  const expired = isExpired();

  syncRoomUrl();

  const roomStatus = $("roomStatus"); if (roomStatus) roomStatus.textContent = expired ? "expired" : (room.status || "-");
  const roundLabel = $("roundLabel"); if (roundLabel) roundLabel.textContent = room.round ?? 0;
  const hostLabel = $("hostLabel"); if (hostLabel) hostLabel.textContent = room.hostName || "-";
  $("roleBadge").textContent = state.role === "host" ? "主持人" : state.role === "player" ? "玩家" : "未加入";

  if (room.startScore !== undefined) $("startScore").value = room.startScore;
  if (room.minBet !== undefined) {
    $("minBet").value = room.minBet;
    if (Number(String($("betAmount").value || "0").replace(/[^\d]/g, "")) < Number(room.minBet || 1)) setBetAmount(room.minBet);
  }
  if (room.betSeconds !== undefined) $("betSeconds").value = room.betSeconds;
  if (room.gameMode !== undefined) setGameMode(room.gameMode);
  if (room.initialPot !== undefined && $("initialPot")) $("initialPot").value = room.initialPot;
  if (room.ante !== undefined && $("ante")) $("ante").value = room.ante;
  if (room.jackpotRate !== undefined && $("jackpotRate")) $("jackpotRate").value = Math.round(Number(room.jackpotRate || 0) * 100);
  if (room.potRiskRate !== undefined && $("potRiskRate")) $("potRiskRate").value = Math.round(Number(room.potRiskRate || 0.2) * 100);
  if (room.rebuyAmount !== undefined && $("rebuyAmount")) $("rebuyAmount").value = room.rebuyAmount;
  if (room.pairPostPenalty !== undefined && $("pairPostPenalty")) $("pairPostPenalty").value = room.pairPostPenalty;
  updateCasinoPanel();
  $("betHint").textContent = `${isCasinoMode(room) ? `賭場模式：輸分進獎金池，贏分從獎金池支付；單局承擔 ${Math.round(getPotRiskRateValue(room) * 100)}%，對子撞柱賠 ${getPairPostPenaltyValue(room)} 倍，對子局可猜花色 3 倍。 ` : ""}普通局：進洞依門寬浮動，撞柱 3 倍，出界 1 倍。對子局：改猜大 / 猜小，抽到同點視為撞柱；最低下注 ${room.minBet || Number($("minBet").value || 100)} 分。`;

  setCardView("gateA", room.gateA);
  setCardView("gateB", room.gateB);
  resetResultRevealIfNoResult(room);
  if (room.resultCard) {
    if (lastResultRevealKey !== getResultRevealKey(room) && !isResultRevealActiveForRoom(room)) {
      startResultReveal(room);
    } else if (!isResultRevealActiveForRoom(room)) {
      setCardView("resultCard", room.resultCard);
    }
  } else {
    setCardView("resultCard", null);
  }
  updateMultiplierPanel();
  triggerPairEffect(room);

  const gate = getGateInfo(room.gateA, room.gateB);
  if (expired) {
    $("roundResult").textContent = "此房間已超過 11 小時，請重新建立房間。";
  } else if (!room.gateA || !room.gateB) {
    $("roundResult").textContent = `等待主持人開局。牌堆剩餘 ${getRemainingDeckCount(room.usedCards || [])} 張。`;
  } else if (room.resultCard) {
    $("roundResult").textContent = isResultRevealActiveForRoom(room)
      ? "結果牌開獎中……"
      : (room.roundResult || "本局已結算。");
  } else if (gate?.same) {
    $("roundResult").textContent = isCasinoMode(room)
      ? `對子局：門柱 ${cardRankName(room.gateA.rank)}，可猜大 / 猜小 / 猜花色；大小同點撞柱賠 ${getPairPostPenaltyValue(room)} 倍，猜花色只看花色。`
      : `對子局：門柱 ${cardRankName(room.gateA.rank)}，玩家改猜大 / 猜小；若結果牌同點則撞柱，賠 ${getPairPostPenaltyValue(room)} 倍。`;
  } else if (gate?.adjacent) {
    $("roundResult").textContent = "順子門無效：沒有進洞空間，請主持人重新發牌。";
  } else {
    $("roundResult").textContent = `門寬 ${gate.width} 格，等待玩家下注。`;
  }

  $("hostPanel").style.display = canHostControl() ? "block" : "none";
  $("betPanel").style.display = state.role === "player" ? "block" : "none";

  renderSummaryPanel();
  updateLayoutMode();
  updateBetProgress();
  updateActionButtons();
}

function renderPlayers() {
  const sorted = state.players.slice().sort((a, b) => (b.score || 0) - (a.score || 0));

  $("rankingCountBadge").textContent = `${sorted.length} 位`;
  $("playerCountBadge").textContent = `${sorted.length} 人`;

  $("rankingList").innerHTML = sorted.length
    ? sorted.map((p, index) => {
        const roundState = getPlayerRoundState(p);
        const rowClass = roundState.className === "waiting" ? "pending" : roundState.className === "ready" ? "done" : "";
        return `
          <div class="rank-row ${rowClass}">
            <div class="rank-no">${index + 1}</div>
            <div>
              <div class="player-name">${escapeHtml(p.name)}</div>
              <div class="player-meta">${p.currentBet ? `${BET_LABELS[p.betType] || p.betType}｜${p.currentBet} 分` : "尚未下注"}</div>
              ${getPlayerStatsText(p) ? `<div class="player-extra">${getPlayerStatsText(p)}</div>` : ""}
              <div class="player-state ${roundState.className}">${roundState.label}</div>
            </div>
            <div class="score">${p.score || 0}</div>
          </div>
        `;
      }).join("")
    : `<div class="empty">尚無玩家加入。</div>`;

  $("playerList").innerHTML = sorted.length
    ? sorted.map((p) => {
        const roundState = getPlayerRoundState(p);
        const rowClass = roundState.className === "waiting" ? "pending" : roundState.className === "ready" ? "done" : "";
        return `
          <div class="player-row ${rowClass}">
            <div class="rank-no">•</div>
            <div>
              <div class="player-name">${escapeHtml(p.name)}</div>
              <div class="player-meta">${p.currentBet ? `已押 ${BET_LABELS[p.betType] || p.betType} ${p.currentBet} 分` : (p.lastResult || "等待中")}</div>
              ${getPlayerStatsText(p) ? `<div class="player-extra">${getPlayerStatsText(p)}</div>` : ""}
              <div class="player-state ${roundState.className}">${roundState.label}</div>
            </div>
            <div class="player-actions">
              <div class="score">${p.score || 0}</div>
              ${canHostControl() && isCasinoMode() ? `<button class="rebuy-btn ${isPreStartBuyInAvailable() ? "prebuy" : ""}" type="button" data-rebuy-player="${p.id}">${getRebuyActionLabel()}</button>` : ""}
            </div>
          </div>
        `;
      }).join("")
    : `<div class="empty">尚無玩家加入。</div>`;

  renderSummaryPanel();
  updateLayoutMode();
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
    startBetCountdown();
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
  if (!requireStaffLogin()) return;

  state.role = "host";
  state.roomId = cleanRoomId($("roomId").value);
  state.displayName = state.staff?.displayName || $("displayName").value.trim() || "主持人";
  state.clientId = auth.currentUser.uid;
  saveLocal();

  const existingSnap = await getDoc(roomRef());
  const existing = existingSnap.exists() ? existingSnap.data() : null;

  if (existing?.hostUid && existing.hostUid !== auth.currentUser.uid && !isManager()) {
    setStatus("這個房間已由其他主持人建立；只有原主持人或 manager 可以接管。", "err");
    state.role = "";
    renderAuthState();
    return;
  }

  const now = Date.now();
  const startScore = Math.max(0, Math.floor(Number($("startScore").value || 2500)));
  const minBet = Math.max(1, Math.floor(Number($("minBet").value || 100)));
  const betSeconds = Math.max(10, Math.floor(Number($("betSeconds").value || 45)));
  const casinoPatch = getCasinoRoomPatchFromInputs();

  if (existing) {
    casinoPatch.pot = Number(existing.pot || 0);
    casinoPatch.jackpot = Number(existing.jackpot || 0);
  }

  await setDoc(roomRef(), {
    game: "dragonGate",
    status: existing?.status || "waiting",
    hostUid: auth.currentUser.uid,
    hostName: state.displayName,
    startScore,
    minBet,
    betSeconds,
    ...casinoPatch,
    betDeadlineAt: existing?.betDeadlineAt || null,
    autoFilled: existing?.autoFilled || false,
    round: Number(existing?.round || 0),
    gateA: existing?.gateA || null,
    gateB: existing?.gateB || null,
    resultCard: existing?.resultCard || null,
    usedCards: normalizeUsedCards(existing?.usedCards || []),
    deckResetCount: Number(existing?.deckResetCount || 0),
    roundResult: existing?.roundResult || "等待主持人開局。",
    createdAt: existing?.createdAt || serverTimestamp(),
    expiresAt: existing?.expiresAt || Timestamp.fromMillis(now + ROOM_LIFETIME_MS),
    updatedAt: serverTimestamp()
  }, { merge: true });

  connectRoom();
  setStatus("主持人房間已建立 / 連線，邀請碼已可複製。", "ok");
}

async function playerJoinRoom() {
  await ensurePlayerAuth();

  state.role = "player";
  state.roomId = cleanRoomId($("roomId").value);
  state.displayName = $("displayName").value.trim() || "未命名玩家";
  state.playerId = auth.currentUser.uid;
  state.clientId = auth.currentUser.uid;
  saveLocal();

  const roomSnap = await getDoc(roomRef());
  const roomData = roomSnap.exists() ? roomSnap.data() : (state.room || {});
  const existingSnap = await getDoc(playerRef());
  const existing = existingSnap.exists() ? existingSnap.data() : {};

  const startScore = Math.max(0, Number(roomData.startScore ?? $("startScore").value ?? 2500));
  const casino = isCasinoMode(roomData);
  const ante = casino ? getAnteValue(roomData) : 0;
  const alreadyPaid = Boolean(existing.antePaid) && existing.joinedRoomId === state.roomId;
  const baseScore = Number(existing.score ?? startScore);
  const actualAnte = casino && !alreadyPaid ? Math.min(ante, baseScore) : 0;
  const finalScore = Math.max(0, baseScore - actualAnte);

  await setDoc(playerRef(), {
    name: state.displayName,
    score: finalScore,
    currentBet: existing.currentBet || 0,
    betType: existing.betType || "",
    lastResult: actualAnte ? `剛加入房間，已投入底注 ${actualAnte} 分` : (existing.lastResult || "剛加入房間"),
    antePaid: casino ? true : false,
    joinedRoomId: state.roomId,
    contributedToPot: Number(existing.contributedToPot || 0) + actualAnte,
    totalWin: Number(existing.totalWin || 0),
    totalLoss: Number(existing.totalLoss || 0),
    rebuyCount: Number(existing.rebuyCount || 0),
    totalRebuy: Number(existing.totalRebuy || 0),
    extraBuyIn: Number(existing.extraBuyIn || 0),
    initialBuyInCount: Number(existing.initialBuyInCount || 0),
    joinedAt: existing.joinedAt || serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });

  if (actualAnte > 0 && roomSnap.exists()) {
    await updateDoc(roomRef(), {
      pot: increment(actualAnte),
      updatedAt: serverTimestamp()
    });
  }

  connectRoom();
  renderAuthState();
  setStatus(actualAnte ? `玩家已加入房間，已投入底注 ${actualAnte} 分。` : "玩家已加入房間。", "ok");
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
  if (!requireHostControl()) return;

  if (!canStartNewRoundOrRedeal()) {
    setStatus("目前不能重發門牌：請先等待下注完成並結算，或遇到順子門時再重發。", "err");
    return;
  }

  const preparedDeck = prepareUsedCardsForNewRound(state.room || {});
  const deckDraw = drawFromDeck(2, preparedDeck.usedCards);
  const [gateA, gateB] = deckDraw.drawn;
  const betSeconds = getBetSecondsValue();
  const remainingAfterGate = getRemainingDeckCount(deckDraw.usedCards);
  const deckText = preparedDeck.reshuffled
    ? `已重新洗牌，牌堆剩餘 ${remainingAfterGate} 張。`
    : `牌堆剩餘 ${remainingAfterGate} 張。`;

  await updateDoc(roomRef(), {
    status: "betting",
    round: increment(1),
    gateA,
    gateB,
    resultCard: null,
    usedCards: deckDraw.usedCards,
    deckResetCount: increment(preparedDeck.reshuffled ? 1 : 0),
    roundResult: `新一局開始，下注倒數 ${betSeconds} 秒。進洞倍率會依門寬浮動。${deckText}`,
    betSeconds,
    betDeadlineAt: Timestamp.fromMillis(Date.now() + betSeconds * 1000),
    autoFilled: false,
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
  lastPairEffectKey = "";
  lastResultRevealKey = "";
  currentResultRevealKey = "";
  resultRevealInProgress = false;
  clearResultRevealTimers();
  setResultRevealClasses(false, false);
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

  if (!assertPlayerBetEditable("送出或修改下注")) return;

  const minBet = getMinBetValue();
  const amount = setBetAmount($("betAmount").value);
  const betType = $("betType").value;
  const self = state.players.find((p) => p.id === state.playerId);
  const score = Number(self?.score ?? state.room?.startScore ?? 0);

  if (!getAvailableBetTypes().includes(betType)) {
    setStatus("目前門牌不允許這個下注選項，請重新選擇。", "err");
    updateBetTypeOptions();
    return;
  }

  if (amount < minBet) {
    setStatus(`最低下注為 ${minBet} 分。`, "err");
    return;
  }

  if (amount > score) {
    setStatus(`你的目前分數是 ${score}，不能下注超過持有分數。`, "err");
    return;
  }

  const riskInfo = getCasinoRiskLimitInfo(betType);
  if (riskInfo.enabled) {
    if (riskInfo.maxBet < minBet) {
      setStatus(`賭場限注：目前獎金池承擔上限 ${riskInfo.maxPayout} 分，低於最低下注需求。請荷官補池或調高風險比例。`, "err");
      updateBetLimitHint();
      return;
    }

    if (amount > riskInfo.maxBet) {
      setStatus(`賭場限注：${BET_LABELS[betType] || betType} 最高可下注 ${riskInfo.maxBet} 分。`, "err");
      setBetAmount(riskInfo.maxBet);
      updateBetLimitHint();
      return;
    }
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

  if (!assertPlayerBetEditable("取消下注")) return;

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

async function autoFillMissingBets(reason = "manual") {
  if (!ensureRoomActive()) return;
  if (!requireHostControl()) return;

  const room = state.room;
  if (!room?.gateA || !room?.gateB || room.status !== "betting" || room.resultCard || getGateMode(room.gateA, room.gateB) === "invalid") {
    setStatus("目前不是可下注階段，無法補齊下注。", "err");
    return;
  }

  if (autoFillingBets) return;
  autoFillingBets = true;

  try {
    const snap = await getDocs(playersRef());
    const players = snap.docs.map((docSnap) => ({ id: docSnap.id, ref: docSnap.ref, ...docSnap.data() }));
    const minBet = Math.max(1, Number(room.minBet ?? $("minBet").value ?? 100));
    const missing = players.filter((p) => Number(p.score || 0) >= minBet && !(Number(p.currentBet || 0) > 0 && p.betType));

    if (!missing.length) {
      setStatus("沒有需要補齊下注的玩家。", "");
      return;
    }

    const batch = writeBatch(db);
    const lines = [];

    missing.forEach((p) => {
      const available = getAvailableBetTypes().filter((type) => {
        const info = getCasinoRiskLimitInfo(type, room);
        return !info.enabled || info.maxBet >= minBet;
      });
      const betType = available[Math.floor(Math.random() * available.length)] || "";

      if (!betType) {
        batch.update(p.ref, {
          currentBet: 0,
          betType: "",
          lastResult: "逾時未下注：賭場限注低於最低下注",
          updatedAt: serverTimestamp()
        });
        return;
      }

      batch.update(p.ref, {
        currentBet: minBet,
        betType,
        lastResult: `逾時自動押 ${BET_LABELS[betType]} ${minBet} 分`,
        updatedAt: serverTimestamp()
      });
      lines.push(`${p.name} → ${BET_LABELS[betType]} ${minBet} 分`);
    });

    batch.update(roomRef(), {
      autoFilled: true,
      autoFilledAt: serverTimestamp(),
      autoFillReason: reason,
      updatedAt: serverTimestamp()
    });

    await batch.commit();

    playSound("allReady");
    setStatus(`已補齊未下注玩家：${lines.join("、")}`, "ok");
  } finally {
    autoFillingBets = false;
    renderRoom();
  }
}

async function drawResult() {
  if (!ensureRoomActive()) return;
  if (!requireHostControl()) return;

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

  if (getGateMode(room.gateA, room.gateB) === "invalid") {
    setStatus("順子門無效，請先重新發牌。", "err");
    return;
  }

  if (getBetDeadlineMillis() && Date.now() >= getBetDeadlineMillis()) {
    await autoFillMissingBets("settle");
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

    const resultDeck = getUsedCardsForResult(room);
    const resultDraw = drawFromDeck(1, resultDeck.usedCards);
    const resultCard = resultDraw.drawn[0];
    const remainingAfterResult = getRemainingDeckCount(resultDraw.usedCards);
    const batch = writeBatch(db);
    const lines = [];
    const casino = isCasinoMode(room);
    const jackpotRate = getJackpotRateValue(room);
    const pairMode = getGateMode(room.gateA, room.gateB) === "pair";
    let potAfter = Math.max(0, Math.floor(Number(room.pot || 0)));
    let jackpotAfter = Math.max(0, Math.floor(Number(room.jackpot || 0)));

    // V41：同一局多人觸發特殊池時，先統計所有符合資格者，再平均分配。
    // 避免舊版出現第一位拿一半、第二位拿剩下一半的結算順序差異。
    const jackpotEligibleIds = new Set();
    if (casino && pairMode && jackpotAfter > 0) {
      currentPlayers.forEach((p) => {
        const amount = Math.max(0, Number(p.currentBet || 0));
        if (!amount || !(p.betType === "higher" || p.betType === "lower")) return;

        const judged = judgeBet(p.betType, amount, room.gateA, room.gateB, resultCard);
        if (judged.delta > 0) jackpotEligibleIds.add(p.id);
      });
    }

    const jackpotRelease = jackpotEligibleIds.size > 0 ? Math.floor(jackpotAfter * 0.5) : 0;
    const jackpotShare = jackpotEligibleIds.size > 0 ? Math.floor(jackpotRelease / jackpotEligibleIds.size) : 0;
    const jackpotTotalPaid = jackpotShare * jackpotEligibleIds.size;
    jackpotAfter = Math.max(0, jackpotAfter - jackpotTotalPaid);

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
      let playerDelta = judged.delta;
      let resultLabel = `${judged.label}（${judged.delta >= 0 ? "+" : ""}${judged.delta}）`;
      let potGain = 0;
      let jackpotGain = 0;
      let jackpotBonus = 0;
      let winRecord = 0;
      let lossRecord = 0;

      if (casino) {
        if (judged.delta > 0) {
          const requestedPayout = judged.delta;
          const payout = Math.min(requestedPayout, potAfter);
          potAfter -= payout;
          playerDelta = payout;

          if (pairMode && jackpotEligibleIds.has(p.id) && jackpotShare > 0) {
            jackpotBonus = jackpotShare;
            playerDelta += jackpotBonus;
          }

          winRecord = playerDelta;
          resultLabel = `${judged.label}（實領 +${playerDelta}${payout < requestedPayout ? `，獎金池不足，原應 +${requestedPayout}` : ""}${jackpotBonus ? `，含特殊池 +${jackpotBonus}` : ""}）`;
        } else if (judged.delta < 0) {
          const loss = Math.abs(judged.delta);
          jackpotGain = Math.floor(loss * jackpotRate);
          potGain = Math.max(0, loss - jackpotGain);
          potAfter += potGain;
          jackpotAfter += jackpotGain;
          playerDelta = -loss;
          lossRecord = loss;
          resultLabel = `${judged.label}（-${loss}，入池 ${potGain}${jackpotGain ? `，特殊池 ${jackpotGain}` : ""}）`;
        } else {
          playerDelta = 0;
          resultLabel = `${judged.label}（+0）`;
        }
      } else {
        if (judged.delta > 0) winRecord = judged.delta;
        if (judged.delta < 0) lossRecord = Math.abs(judged.delta);
      }

      batch.update(p.ref, {
        score: increment(playerDelta),
        currentBet: 0,
        betType: "",
        lastResult: resultLabel,
        contributedToPot: increment(potGain + jackpotGain),
        totalWin: increment(winRecord),
        totalLoss: increment(lossRecord),
        updatedAt: serverTimestamp()
      });

      lines.push(`${p.name}：${BET_LABELS[p.betType]} ${amount} 分 → ${resultLabel}`);
    });

    const summary = [
      `第 ${Number(room.round || 0)} 局結果`,
      casino ? `賭場模式｜獎金池 ${potAfter}｜特殊池 ${jackpotAfter}${jackpotEligibleIds.size ? `｜特殊池本局 ${jackpotEligibleIds.size} 人平分，每人 +${jackpotShare}` : ""}` : "",
      `門牌：${room.gateA.label}｜${room.gateB.label}`,
      `結果牌：${resultCard.label}`,
      `牌堆剩餘：${remainingAfterResult} 張`,
      lines.length ? lines.join(" / ") : "本局無玩家下注"
    ].filter(Boolean).join("　");

    batch.update(roomRef(), {
      status: "settled",
      resultCard,
      usedCards: resultDraw.usedCards,
      deckResetCount: increment(resultDeck.reshuffled ? 1 : 0),
      roundResult: summary,
      pot: casino ? potAfter : Number(room.pot || 0),
      jackpot: casino ? jackpotAfter : Number(room.jackpot || 0),
      updatedAt: serverTimestamp()
    });

    await batch.commit();
    setStatus("已抽結果牌並結算。", "ok");
  } finally {
    settlingInProgress = false;
    renderRoom();
  }
}

function openRebuyModal(playerId) {
  if (rebuyInProgress) return;

  const player = state.players.find((p) => p.id === playerId);
  if (!player) {
    setStatus("找不到該玩家。", "err");
    return;
  }

  const amount = getRebuyAmountValue();
  const preStart = isPreStartBuyInAvailable();
  const actionLabel = getRebuyActionLabel();
  const ante = getAnteValue();
  const antePaid = preStart ? 0 : Math.min(ante, amount);
  const netAmount = preStart ? amount : Math.max(0, amount - antePaid);

  pendingRebuyPlayerId = playerId;

  const title = $("rebuyModalTitle");
  const confirmBtn = $("rebuyConfirmBtn");
  if (title) title.textContent = `${actionLabel}確認`;
  if (confirmBtn) confirmBtn.textContent = `確認${actionLabel}`;

  $("rebuyModalText").textContent = preStart
    ? `要幫「${player.name}」開局前加購 ${amount} 分嗎？\n這次不會再收第二次入場底注，玩家實拿 ${netAmount} 分。`
    : `要幫「${player.name}」補籌碼 ${amount} 分嗎？\n賭場模式會收底注 ${antePaid} 分進獎金池，玩家實拿 ${netAmount} 分。`;
  $("rebuyModal").hidden = false;
}

function closeRebuyModal() {
  pendingRebuyPlayerId = "";
  $("rebuyModal").hidden = true;
}

async function confirmPendingRebuy() {
  if (!pendingRebuyPlayerId || rebuyInProgress) return;

  rebuyInProgress = true;
  $("rebuyConfirmBtn").disabled = true;
  $("rebuyCancelBtn").disabled = true;

  try {
    await rebuyPlayer(pendingRebuyPlayerId);
    closeRebuyModal();
  } finally {
    rebuyInProgress = false;
    $("rebuyConfirmBtn").disabled = false;
    $("rebuyCancelBtn").disabled = false;
  }
}

async function rebuyPlayer(playerId) {
  if (!ensureRoomActive()) return;

  if (!canHostControl()) {
    setStatus("只有此房間主持人或 manager 可以補籌碼。", "err");
    return;
  }

  if (!isCasinoMode()) {
    setStatus("補籌碼目前只開放賭場模式使用。", "err");
    return;
  }

  const player = state.players.find((p) => p.id === playerId);
  if (!player) {
    setStatus("找不到該玩家。", "err");
    return;
  }

  const amount = getRebuyAmountValue();
  const preStart = isPreStartBuyInAvailable();
  const ante = getAnteValue();
  const antePaid = preStart ? 0 : Math.min(ante, amount);
  const netAmount = preStart ? amount : Math.max(0, amount - antePaid);

  const batch = writeBatch(db);

  if (preStart) {
    batch.update(playerRef(playerId), {
      score: increment(netAmount),
      extraBuyIn: increment(amount),
      initialBuyInCount: increment(1),
      lastResult: `開局前加購 ${amount} 分（免第二次底注）`,
      updatedAt: serverTimestamp()
    });
  } else {
    batch.update(playerRef(playerId), {
      score: increment(netAmount),
      rebuyCount: increment(1),
      totalRebuy: increment(amount),
      contributedToPot: increment(antePaid),
      lastResult: `主持人補籌碼 ${amount} 分（底注 ${antePaid} 入池，實拿 ${netAmount}）`,
      updatedAt: serverTimestamp()
    });

    if (antePaid > 0) {
      batch.update(roomRef(), {
        pot: increment(antePaid),
        updatedAt: serverTimestamp()
      });
    }
  }

  await batch.commit();

  setStatus(
    preStart
      ? `已幫 ${player.name} 開局前加購 ${amount} 分，不收第二次底注。`
      : `已幫 ${player.name} 補籌碼 ${amount} 分，實拿 ${netAmount} 分。`,
    "ok"
  );
}

async function clearRoom() {
  if (!requireHostControl()) return;
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
    betSeconds: Math.max(10, Math.floor(Number($("betSeconds").value || state.room?.betSeconds || 45))),
    gameMode: getGameModeValue(),
    initialPot: getInitialPotValue(),
    ante: getAnteValue(),
    jackpotRate: getJackpotRateValue(),
    potRiskRate: getPotRiskRateValue(),
    rebuyAmount: getRebuyAmountValue(),
    pairPostPenalty: getPairPostPenaltyValue(),
    pot: getGameModeValue() === "casino" ? getInitialPotValue() : 0,
    jackpot: 0,
    betDeadlineAt: null,
    autoFilled: false,
    round: 0,
    gateA: null,
    gateB: null,
    resultCard: null,
    usedCards: [],
    deckResetCount: 0,
    roundResult: "本場已清空，等待主持人開局。",
    updatedAt: serverTimestamp()
  }, { merge: true });

  await batch.commit();
  setStatus("本場已清空。", "ok");
}

async function topUpPot() {
  if (!ensureRoomActive()) return;
  if (!requireHostControl()) return;

  if (!isCasinoMode()) {
    setStatus("只有賭場模式可以補獎金池。", "err");
    return;
  }

  const amount = getPotTopUpAmountValue();

  await updateDoc(roomRef(), {
    pot: increment(amount),
    bankTopUpTotal: increment(amount),
    updatedAt: serverTimestamp()
  });

  setStatus(`已補獎金池 ${amount} 分。`, "ok");
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

  if (!assertPlayerBetEditable("調整下注")) return;

  const self = state.players.find((p) => p.id === state.playerId);
  const score = Math.max(0, Math.floor(Number(self?.score ?? 0)));
  const minBet = Math.max(1, Number(state.room?.minBet ?? $("minBet").value ?? 100));

  if (score < minBet) {
    setStatus(`目前分數 ${score} 低於最低下注 ${minBet}，無法 All in。`, "err");
    return;
  }

  const cap = getCurrentBetCap($("betType")?.value);
  const amount = Math.max(0, Math.min(score, cap));

  if (amount < minBet) {
    setStatus(`目前賭場限注 ${amount} 分，低於最低下注 ${minBet}。請荷官補池或調高風險比例。`, "err");
    updateBetLimitHint();
    return;
  }

  setBetAmount(amount);
  chipAccumulated = true;
  setStatus(amount < score ? `已依賭場限注填入：${amount} 分。` : `已填入 All in：${score} 分。`, "ok");
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

document.querySelectorAll(".mode-option").forEach((btn) => {
  btn.addEventListener("click", () => {
    setGameMode(btn.dataset.gameMode || "normal");
  });
});

$("playerList").addEventListener("click", (event) => {
  const btn = event.target.closest("[data-rebuy-player]");
  if (!btn) return;
  openRebuyModal(btn.dataset.rebuyPlayer);
});

$("rebuyCancelBtn").addEventListener("click", closeRebuyModal);
$("rebuyModal").addEventListener("click", (event) => {
  if (event.target.id === "rebuyModal") closeRebuyModal();
});
$("rebuyConfirmBtn").addEventListener("click", () => {
  confirmPendingRebuy().catch((error) => {
    setStatus(error.message, "err");
    closeRebuyModal();
  });
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !$("rebuyModal").hidden) closeRebuyModal();
});

document.querySelectorAll(".bet-type-option").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.disabled) return;

    if (!assertPlayerBetEditable("更改下注類型")) return;

    setBetType(btn.dataset.betType || "inside");
  });
});

$("betAmount").addEventListener("input", () => {
  if (!assertPlayerBetEditable("調整下注")) return;

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

onAuthStateChanged(auth, async (user) => {
  state.user = user;
  state.authReady = true;

  if (user) {
    state.clientId = user.uid;
    localStorage.setItem("dgClientId", state.clientId);
    await loadStaffProfile(user);
  } else {
    state.staff = null;
  }

  renderAuthState();
  updateViewPermissions();
  updateLayoutMode();
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

$("staffAuthToggleBtn").addEventListener("click", () => toggleStaffAuthForm());
$("staffLoginBtn").addEventListener("click", () => loginStaff().catch((e) => setStatus(e.message, "err")));
$("staffLogoutBtn").addEventListener("click", () => logoutCurrentUser().catch((e) => setStatus(e.message, "err")));
$("hostCreateBtn").addEventListener("click", () => hostCreateRoom().catch((e) => setStatus(e.message, "err")));
$("playerJoinBtn").addEventListener("click", () => playerJoinRoom().catch((e) => setStatus(e.message, "err")));
$("newRoundBtn").addEventListener("click", () => newRound().catch((e) => setStatus(e.message, "err")));
$("submitBetBtn").addEventListener("click", () => submitBet().catch((e) => setStatus(e.message, "err")));
$("allInBtn").addEventListener("click", allIn);
$("clearBetBtn").addEventListener("click", () => clearBet().catch((e) => setStatus(e.message, "err")));
$("autoFillBetsBtn").addEventListener("click", () => autoFillMissingBets("manual").catch((e) => setStatus(e.message, "err")));
$("drawResultBtn").addEventListener("click", () => drawResult().catch((e) => setStatus(e.message, "err")));
$("clearRoomBtn").addEventListener("click", () => clearRoom().catch((e) => setStatus(e.message, "err")));
$("copyResultBtn").addEventListener("click", () => copyResult().catch((e) => setStatus(e.message, "err")));
$("topUpPotBtn").addEventListener("click", () => topUpPot().catch((e) => setStatus(e.message, "err")));
$("resetLocalBtn").addEventListener("click", () => resetLocal().catch((e) => setStatus(e.message, "err")));


$("toggleSummaryDetailsBtn").addEventListener("click", () => toggleSummaryDetails());
$("toggleSetupBtn").addEventListener("click", () => toggleSetupExpanded());
$("collapseSetupBtn").addEventListener("click", () => toggleSetupExpanded(false));

setGameMode($("gameMode")?.value || "normal");
updateViewPermissions();
toggleStaffAuthForm(false);
renderAuthState();
updateSoundButton();
setBetType($("betType")?.value || "inside");
setBetAmount($("betAmount")?.value || 100);
syncRoomUrl();
renderSummaryPanel();
updateLayoutMode();
updateRoomJoinedClass();
renderRoom();
renderPlayers();

if (roomFromUrl || localStorage.getItem("dgRoomId")) {
  connectRoom();
} else {
  setConnected(false);
  setStatus("尚未連線。請建立房間或輸入邀請碼加入。", "");
}
