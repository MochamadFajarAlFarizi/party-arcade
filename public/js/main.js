import { AVATAR_COLORS, AVATAR_HATS, drawCartoonBean, hatEmoji } from './renderer.js';
import { sfx } from './audio.js';
import { GameControls } from './controls.js';
import { ArenaView } from './games/arena-view.js';
import { DrawView } from './games/draw-view.js';
import { WordView } from './games/word-view.js';
import { PartyView } from './games/party-view.js';
import { GameTransport } from './transport.js';

const STORAGE_KEY = 'party_pop_profile_v1';
const EMOTES_KEY = 'party_pop_custom_emotes_v1';
const ACCOUNT_TOKEN_KEY = 'party_pop_account_token_v1';
const MAX_CUSTOM_EMOTES = 8;

const app = {
  ws: null,
  connected: false,
  myId: null,
  roomCode: null,
  roomState: null,
  gamesCatalog: [],
  activeGameId: null,
  lastGameMeta: null,
  lastCupInfo: null,
  leaderboardData: null,
  lbTab: 'global',
  lbPeriod: 'all',
  selectedCategory: 'ALL',
  profile: loadProfile(),
  customEmotes: loadCustomEmotes(),
  pendingEmoteDataUrl: null,
  accountToken: loadAccountToken(),
  accountName: null,
};

function loadAccountToken() {
  try { return localStorage.getItem(ACCOUNT_TOKEN_KEY) || null; } catch { return null; }
}
function saveAccountToken(token) {
  app.accountToken = token || null;
  try {
    if (token) localStorage.setItem(ACCOUNT_TOKEN_KEY, token);
    else localStorage.removeItem(ACCOUNT_TOKEN_KEY);
  } catch { /* ignore */ }
}

const emoteImageCache = new Map();
function getCachedEmoteImage(dataUrl) {
  if (!dataUrl) return null;
  let img = emoteImageCache.get(dataUrl);
  if (!img) {
    img = new Image();
    img.src = dataUrl;
    emoteImageCache.set(dataUrl, img);
    if (emoteImageCache.size > 40) {
      const firstKey = emoteImageCache.keys().next().value;
      emoteImageCache.delete(firstKey);
    }
  }
  return img;
}

function loadCustomEmotes() {
  try {
    const arr = JSON.parse(localStorage.getItem(EMOTES_KEY) || '[]');
    if (!Array.isArray(arr)) return [];
    return arr.filter((e) => e && typeof e.dataUrl === 'string' && e.dataUrl.startsWith('data:image/')).slice(0, MAX_CUSTOM_EMOTES);
  } catch {
    return [];
  }
}

function saveCustomEmotes() {
  try {
    localStorage.setItem(EMOTES_KEY, JSON.stringify(app.customEmotes));
  } catch {
    toast('⚠️ Penyimpanan penuh — coba hapus beberapa emot lama.');
  }
  scheduleCloudSync();
}

function loadProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      name: saved.name || `Player${Math.floor(100 + Math.random() * 899)}`,
      color: AVATAR_COLORS.includes(saved.color) ? saved.color : AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      hat: AVATAR_HATS.some((h) => h.id === saved.hat) ? saved.hat : 'headset',
    };
  } catch {
    return { name: 'Player1', color: AVATAR_COLORS[0], hat: 'headset' };
  }
}

function saveProfile() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(app.profile));
  } catch { /* ignore */ }
  scheduleCloudSync();
}

let cloudSyncTimer = null;
function scheduleCloudSync() {
  if (!app.accountToken) return;
  clearTimeout(cloudSyncTimer);
  cloudSyncTimer = setTimeout(() => syncAccountNow(false), 600);
}

async function syncAccountNow(notify = false) {
  if (!app.accountToken) return;
  try {
    const r = await fetch('/api/account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sync',
        token: app.accountToken,
        color: app.profile.color,
        hat: app.profile.hat,
        customEmotes: app.customEmotes,
      }),
    });
    if (r.ok && notify) {
      sfx.play('correct');
      toast('☁️ Avatar & Emot Custom tersinkron ke Cloud!');
    }
  } catch { /* ignore */ }
}

function updateAccountUI() {
  const pill = document.getElementById('btnAccountTop');
  const inlineText = document.getElementById('accountInlineStatus');
  const inlineBtn = document.getElementById('btnAccountInline');
  const nameInput = document.getElementById('inputName');
  const loggedOutView = document.getElementById('accountLoggedOutView');
  const loggedInView = document.getElementById('accountLoggedInView');
  const signedName = document.getElementById('accountSignedName');

  const signed = !!(app.accountToken && app.accountName);
  if (pill) {
    pill.textContent = signed ? `🛡️ ${app.accountName}` : '🔐 Akun';
    pill.classList.toggle('signed', signed);
  }
  if (inlineText) {
    inlineText.textContent = signed ? `🛡️ Terkunci PIN (${app.customEmotes.length} emot sinkron)` : 'Mode Tamu (belum dikunci PIN)';
  }
  if (inlineBtn) {
    inlineBtn.textContent = signed ? '⚙️ Akun' : '🔐 Kunci / Login';
  }
  if (nameInput) {
    nameInput.readOnly = signed;
    if (signed) nameInput.value = app.accountName;
  }
  if (loggedOutView) loggedOutView.classList.toggle('hidden', signed);
  if (loggedInView) loggedInView.classList.toggle('hidden', !signed);
  if (signedName && signed) signedName.textContent = app.accountName;
}

async function restoreAccountSession() {
  if (!app.accountToken) {
    updateAccountUI();
    return;
  }
  try {
    const r = await fetch('/api/account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'me', token: app.accountToken }),
    });
    const data = await r.json();
    if (r.ok && data.ok && data.account) {
      applyCloudAccount(data.account);
    } else {
      saveAccountToken(null);
      app.accountName = null;
    }
  } catch { /* ignore */ }
  updateAccountUI();
}

function applyCloudAccount(acc) {
  app.accountName = acc.name;
  app.profile.name = acc.name;
  if (AVATAR_COLORS.includes(acc.color)) app.profile.color = acc.color;
  if (AVATAR_HATS.some((h) => h.id === acc.hat)) app.profile.hat = acc.hat;
  if (Array.isArray(acc.customEmotes)) {
    app.customEmotes = acc.customEmotes.slice(0, MAX_CUSTOM_EMOTES);
    try { localStorage.setItem(EMOTES_KEY, JSON.stringify(app.customEmotes)); } catch { /* ignore */ }
  }
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(app.profile)); } catch { /* ignore */ }
  initAvatarEditor();
  renderCustomEmoteUI();
  updateAccountUI();
}

function openAccountModal(prefillName = null) {
  updateAccountUI();
  const inp = document.getElementById('inputAuthName');
  const pin = document.getElementById('inputAuthPin');
  if (inp) inp.value = prefillName || app.profile.name || '';
  if (pin) pin.value = '';
  document.getElementById('modalAccount').classList.remove('hidden');
}

async function checkNicknameAllowedBeforePlay() {
  const name = app.profile.name.trim();
  if (!name) return false;
  if (app.accountToken && app.accountName && app.accountName.toLowerCase() === name.toLowerCase()) {
    return true;
  }
  try {
    const r = await fetch('/api/account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'check', name }),
    });
    const data = await r.json();
    if (data.locked) {
      toast(`🔐 Nickname "${name}" dikunci PIN! Masukkan PIN atau ganti nama lain.`);
      openAccountModal(name);
      return false;
    }
  } catch { /* allow offline/fallback */ }
  return true;
}

// ===== UI HELPERS =====
const screens = {
  home: document.getElementById('screenHome'),
  lobby: document.getElementById('screenLobby'),
  game: document.getElementById('screenGame'),
  podium: document.getElementById('screenPodium'),
};

function showScreen(name) {
  Object.entries(screens).forEach(([k, el]) => el.classList.toggle('active', k === name));
  document.body.classList.toggle('in-game', name === 'game');
  if (name !== 'game') {
    closeRadialWheel(false);
    controls.setActive(false);
    arenaView.stop();
    wordView.stop();
    document.getElementById('countdownOverlay').classList.add('hidden');
  }
}

function toast(text) {
  const box = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  box.appendChild(el);
  setTimeout(() => el.remove(), 2900);
}

let bannerTimer = null;
function showBanner(text) {
  const el = document.getElementById('gameBanner');
  el.textContent = text;
  el.classList.remove('hidden');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => el.classList.add('hidden'), 2600);
}

function spawnFloatingReaction(msg) {
  const layer = document.getElementById('reactionLayer');
  const el = document.createElement('div');
  el.style.left = `${12 + Math.random() * 72}%`;
  el.style.borderColor = msg.color || '#1E1B4B';

  if (msg.customImage) {
    el.className = 'floating-react sticker';
    const img = document.createElement('img');
    img.src = msg.customImage;
    img.alt = msg.label || 'Emot';
    const cap = document.createElement('span');
    cap.textContent = msg.label ? `${msg.name}: ${msg.label}` : msg.name;
    el.append(img, cap);
  } else {
    el.className = 'floating-react';
    el.textContent = `${msg.emoji} ${msg.name}`;
  }

  layer.appendChild(el);
  sfx.play('pop');
  setTimeout(() => el.remove(), 2250);

  // Also display comic speech bubble right above character during Arena & Word Bomb games!
  const cachedImg = msg.customImage ? getCachedEmoteImage(msg.customImage) : null;
  arenaView.showPlayerEmote(msg.playerId, msg, cachedImg);
  wordView.showPlayerEmote(msg.playerId, msg, cachedImg);
}

function sendCustomEmote(emote) {
  if (!app.roomCode) {
    // Local preview pop if tested on Home screen!
    spawnFloatingReaction({
      playerId: app.myId,
      name: app.profile.name,
      color: app.profile.color,
      customImage: emote.dataUrl,
      label: emote.label,
    });
    return;
  }
  sendWS({ type: 'reaction', customImage: emote.dataUrl, label: emote.label || '' });
  document.getElementById('gameEmoteTray')?.classList.add('hidden');
}

function sendStandardEmoji(emoji) {
  if (!app.roomCode) return;
  sendWS({ type: 'reaction', emoji });
  document.getElementById('gameEmoteTray')?.classList.add('hidden');
}

function processUploadedEmoteFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Format gambar tidak didukung'));
      img.onload = () => {
        const size = 96;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        // Center square crop so stickers look crisp and unstretched
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);

        // Prefer compact WebP (supports transparency!) fallback to JPEG/PNG
        let dataUrl = canvas.toDataURL('image/webp', 0.82);
        if (!dataUrl.startsWith('data:image/webp') || dataUrl.length > 42000) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.78);
        }
        resolve(dataUrl);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function renderCustomEmoteUI() {
  const lobbyStrip = document.getElementById('lobbyCustomEmotes');
  const gameStrip = document.getElementById('gameCustomEmotes');
  const modalGrid = document.getElementById('savedEmotesGrid');
  const countEl = document.getElementById('customEmoteCount');

  if (countEl) countEl.textContent = String(app.customEmotes.length);

  if (lobbyStrip) {
    lobbyStrip.innerHTML = '';
    lobbyStrip.classList.toggle('hidden', app.customEmotes.length === 0);
    for (const em of app.customEmotes) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'custom-emote-btn';
      btn.title = em.label || 'Kirim emot custom';
      btn.innerHTML = `<img src="${em.dataUrl}" alt="" />`;
      btn.addEventListener('click', () => sendCustomEmote(em));
      lobbyStrip.appendChild(btn);
    }
  }

  if (gameStrip) {
    gameStrip.innerHTML = '';
    for (const em of app.customEmotes) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'custom-emote-btn';
      btn.title = em.label || 'Kirim emot custom';
      btn.innerHTML = `<img src="${em.dataUrl}" alt="" />`;
      btn.addEventListener('click', () => sendCustomEmote(em));
      gameStrip.appendChild(btn);
    }
  }

  if (modalGrid) {
    modalGrid.innerHTML = '';
    if (app.customEmotes.length === 0) {
      modalGrid.innerHTML = '<p class="muted" style="grid-column:1/-1;text-align:center">Belum ada emot custom. Klik "📁 Pilih Gambar" di atas!</p>';
      return;
    }
    app.customEmotes.forEach((em, idx) => {
      const card = document.createElement('div');
      card.className = 'saved-emote-card';
      card.title = 'Klik untuk test / kirim emot!';
      card.innerHTML = `
        <button type="button" class="btn-del-emote" title="Hapus">✕</button>
        <img src="${em.dataUrl}" alt="" />
        <span>${escapeHtml(em.label || `Emot #${idx + 1}`)}</span>
      `;
      card.querySelector('.btn-del-emote').addEventListener('click', (e) => {
        e.stopPropagation();
        app.customEmotes.splice(idx, 1);
        saveCustomEmotes();
        renderCustomEmoteUI();
        sfx.play('pop');
      });
      card.addEventListener('click', () => {
        sendCustomEmote(em);
        if (app.roomCode) document.getElementById('modalEmotes').classList.add('hidden');
      });
      modalGrid.appendChild(card);
    });
  }
}

const DEFAULT_EMOJIS = ['😂', '🔥', '😱', '💀', '👑', '👏'];

function getWheelItems() {
  const items = [];
  for (const em of app.customEmotes.slice(0, 6)) {
    items.push({ kind: 'custom', emote: em, label: em.label || 'Custom' });
  }
  for (const emoji of DEFAULT_EMOJIS) {
    if (items.length >= 6) break;
    items.push({ kind: 'emoji', emoji, label: emoji });
  }
  return items;
}

const radial = {
  open: false,
  pointerId: null,
  triggerEl: null,
  originX: 0,
  originY: 0,
  centerX: 0,
  centerY: 0,
  downAt: 0,
  moved: false,
  items: [],
  selectedIdx: -1,
  keyMode: false,
  lastMouseX: window.innerWidth / 2,
  lastMouseY: window.innerHeight / 2,
};

function openRadialWheel(originX, originY, triggerEl = null, pointerId = null, keyMode = false) {
  const wheel = document.getElementById('radialWheel');
  const slotsBox = document.getElementById('radialSlots');
  const centerEl = document.getElementById('radialCenter');
  const arrowEl = document.getElementById('radialArrow');
  if (!wheel || !slotsBox) return;

  const isCompact = window.innerHeight <= 540;
  const pad = isCompact ? 98 : 112;
  const radius = isCompact ? 68 : 78;

  radial.open = true;
  radial.pointerId = pointerId;
  radial.triggerEl = triggerEl;
  radial.originX = originX;
  radial.originY = originY;
  radial.centerX = Math.max(pad, Math.min(window.innerWidth - pad, originX));
  radial.centerY = Math.max(pad, Math.min(window.innerHeight - pad, originY));
  radial.downAt = performance.now();
  radial.moved = false;
  radial.items = getWheelItems();
  radial.selectedIdx = -1;
  radial.keyMode = keyMode;

  wheel.style.left = `${radial.centerX}px`;
  wheel.style.top = `${radial.centerY}px`;
  slotsBox.innerHTML = '';

  radial.items.forEach((item, idx) => {
    const angle = (idx / radial.items.length) * Math.PI * 2 - Math.PI / 2;
    const sx = Math.cos(angle) * radius;
    const sy = Math.sin(angle) * radius;
    const slot = document.createElement('div');
    slot.className = 'radial-slot';
    slot.dataset.tx = String(sx);
    slot.dataset.ty = String(sy);
    slot.style.transform = `translate(${sx}px, ${sy}px) scale(1)`;
    if (item.kind === 'custom') {
      slot.innerHTML = `<img src="${item.emote.dataUrl}" alt="" />`;
    } else {
      slot.textContent = item.emoji;
    }
    slotsBox.appendChild(slot);
  });

  centerEl.textContent = 'Geser!';
  centerEl.classList.remove('cancel');
  arrowEl.classList.remove('visible');
  document.getElementById('gameEmoteTray')?.classList.add('hidden');
  triggerEl?.classList.add('holding');
  wheel.classList.remove('hidden');
}

function updateRadialSwipe(clientX, clientY) {
  if (!radial.open) return;
  const dx = clientX - radial.originX;
  const dy = clientY - radial.originY;
  const dist = Math.hypot(dx, dy);
  if (dist > 10) radial.moved = true;

  const slotsBox = document.getElementById('radialSlots');
  const centerEl = document.getElementById('radialCenter');
  const arrowEl = document.getElementById('radialArrow');
  const n = radial.items.length;

  let nextIdx = -1;
  if (dist >= 24 && n > 0) {
    let ang = Math.atan2(dy, dx) + Math.PI / 2;
    if (ang < 0) ang += Math.PI * 2;
    nextIdx = Math.round((ang / (Math.PI * 2)) * n) % n;
    arrowEl.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
    arrowEl.classList.add('visible');
  } else {
    arrowEl.classList.remove('visible');
  }

  if (nextIdx !== radial.selectedIdx) {
    radial.selectedIdx = nextIdx;
    if (nextIdx >= 0) sfx.play('tick');

    const slotEls = slotsBox.children;
    for (let i = 0; i < slotEls.length; i++) {
      const el = slotEls[i];
      const active = i === nextIdx;
      el.classList.toggle('active', active);
      el.style.transform = `translate(${el.dataset.tx}px, ${el.dataset.ty}px) scale(${active ? 1.28 : 1})`;
    }

    if (nextIdx >= 0) {
      const item = radial.items[nextIdx];
      centerEl.textContent = item.label || 'Kirim!';
      centerEl.classList.remove('cancel');
    } else {
      centerEl.textContent = radial.moved ? '✕ Batal' : 'Geser!';
      centerEl.classList.toggle('cancel', radial.moved);
    }
  }
}

function closeRadialWheel(fireSelected = true) {
  if (!radial.open) return;
  const wheel = document.getElementById('radialWheel');
  const elapsed = performance.now() - radial.downAt;
  const chosen = radial.selectedIdx >= 0 ? radial.items[radial.selectedIdx] : null;
  const wasQuickTap = !radial.keyMode && !radial.moved && elapsed < 220;

  radial.open = false;
  radial.pointerId = null;
  radial.triggerEl?.classList.remove('holding');
  radial.triggerEl = null;
  wheel?.classList.add('hidden');

  if (fireSelected && chosen) {
    if (chosen.kind === 'custom') sendCustomEmote(chosen.emote);
    else sendStandardEmoji(chosen.emoji);
  } else if (fireSelected && wasQuickTap) {
    // Quick tap opens the emote tray (so users can also tap Upload Emot!)
    document.getElementById('gameEmoteTray')?.classList.toggle('hidden');
    sfx.play('pop');
  }
}

function bindRadialTrigger(el) {
  if (!el) return;
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    el.setPointerCapture?.(e.pointerId);
    openRadialWheel(e.clientX, e.clientY, el, e.pointerId, false);
  });
  el.addEventListener('pointermove', (e) => {
    if (!radial.open || radial.pointerId !== e.pointerId) return;
    e.preventDefault();
    updateRadialSwipe(e.clientX, e.clientY);
  });
  const onEnd = (e) => {
    if (!radial.open || radial.pointerId !== e.pointerId) return;
    e.preventDefault();
    closeRadialWheel(true);
  };
  el.addEventListener('pointerup', onEnd);
  el.addEventListener('pointercancel', () => closeRadialWheel(false));
}

function openEmoteStudio() {
  app.pendingEmoteDataUrl = null;
  document.getElementById('emotePreviewSlot').innerHTML = '<span>🖼️</span>';
  document.getElementById('inputEmoteLabel').value = '';
  document.getElementById('btnSaveCustomEmote').disabled = true;
  document.getElementById('gameEmoteTray')?.classList.add('hidden');
  renderCustomEmoteUI();
  document.getElementById('modalEmotes').classList.remove('hidden');
}

// ===== GAME VIEWS & CONTROLS =====
const controls = new GameControls((input) => sendWS({ type: 'input', ...input }));
const arenaView = new ArenaView(
  document.getElementById('arenaCanvas'),
  document.getElementById('hudCenterInfo'),
  showBanner
);
const drawView = new DrawView(
  (payload) => sendWS({ type: 'game_action', ...payload }),
  (text) => sendWS({ type: 'chat', text })
);
const wordView = new WordView((payload) => sendWS({ type: 'game_action', ...payload }));
const partyView = new PartyView((payload) => sendWS({ type: 'game_action', ...payload }));
const PARTY_GAME_IDS = new Set(['trivia-rush', 'reflex-duel', 'math-panic', 'closest-wins']);

// ===== DUAL-MODE TRANSPORT (Local WS or Vercel + Supabase Realtime) =====
const transport = new GameTransport({
  onStatus(state, label) {
    const pill = document.getElementById('connPill');
    app.connected = state === 'ok';
    pill.className = `conn-pill ${state}`;
    pill.innerHTML = `<i class="dot"></i> ${label}`;
    if (state === 'ok') {
      const params = new URLSearchParams(location.search);
      const inviteCode = params.get('room');
      if (inviteCode && !app.roomCode) {
        document.getElementById('inputRoomCode').value = inviteCode.toUpperCase().slice(0, 4);
        toast(`📩 Kode room ${inviteCode.toUpperCase()} siap! Klik MASUK.`);
      }
    }
  },
  onMessage(msg) {
    handleServerMessage(msg);
  },
});

function sendWS(obj) {
  transport.send(obj);
}

function connectWS() {
  transport.connect();
}

let lastCountdownText = '';
function updateCountdown(cd) {
  const el = document.getElementById('countdownOverlay');
  if (cd > 0) {
    const txt = String(Math.ceil(cd));
    if (txt !== lastCountdownText) {
      lastCountdownText = txt;
      el.textContent = txt;
      el.classList.remove('hidden');
    }
  } else if (lastCountdownText !== '') {
    lastCountdownText = '';
    el.classList.add('hidden');
  }
}

function handleServerMessage(msg) {
  switch (msg.type) {
    case 'hello':
      app.myId = msg.clientId;
      app.gamesCatalog = msg.games || [];
      renderHomeGameBadges();
      renderLeaderboardTabs();
      break;

    case 'welcome':
      app.myId = msg.playerId;
      app.roomCode = msg.roomCode;
      document.getElementById('lobbyRoomCode').textContent = msg.roomCode;
      document.getElementById('lobbyChatLog').innerHTML = '';
      showScreen('lobby');
      sfx.play('go');
      break;

    case 'error':
      sfx.play('wrong');
      toast(`⚠️ ${msg.message}`);
      break;

    case 'host_left':
      app.roomCode = null;
      app.roomState = null;
      showScreen('home');
      break;

    case 'room_state':
      app.roomState = msg;
      app.gamesCatalog = msg.games || app.gamesCatalog;
      renderLobby(msg);
      if (msg.state === 'lobby') showScreen('lobby');
      break;

    case 'chat':
      appendLobbyChat(msg);
      if (app.activeGameId === 'quick-draw') drawView.appendChat(msg);
      break;

    case 'reaction':
      spawnFloatingReaction(msg);
      break;

    case 'game_start':
      startGameView(msg);
      break;

    case 'game_state':
      updateCountdown(msg.state.countdown || 0);
      if (msg.state.gameId === 'quick-draw') {
        drawView.updateState(msg.state, msg.events);
        document.getElementById('hudCenterInfo').textContent = `✏️ Ronde ${msg.state.turn}/${msg.state.totalTurns}`;
      } else if (msg.state.gameId === 'word-bomb') {
        wordView.updateState(msg.state, msg.events);
        document.getElementById('hudCenterInfo').textContent = `🔗 Awalan: "${msg.state.syllable}..." • ${msg.state.usedCount} kata`;
      } else if (PARTY_GAME_IDS.has(msg.state.gameId)) {
        partyView.updateState(msg.state, msg.events);
        document.getElementById('hudCenterInfo').textContent = `🎯 Ronde ${msg.state.round}/${msg.state.totalRounds}`;
      } else {
        arenaView.updateState(msg.state, msg.events);
      }
      break;

    case 'draw_stroke':
      drawView.addRemoteStroke(msg.stroke);
      break;

    case 'draw_clear':
      drawView.strokes = [];
      drawView.clearCanvas();
      break;

    case 'draw_sync':
      drawView.syncStrokes(msg.strokes);
      break;

    case 'game_over':
      app.leaderboardData = msg.leaderboard || app.leaderboardData;
      renderPodium(msg);
      showScreen('podium');
      sfx.play('win');
      break;

    case 'leaderboard':
      app.leaderboardData = msg.data;
      renderLeaderboard();
      break;

    default:
      break;
  }
}

// ===== HOME AVATAR EDITOR =====
let avatarEditorInitialized = false;
function initAvatarEditor() {
  const nameInput = document.getElementById('inputName');
  nameInput.value = app.profile.name;

  const colBox = document.getElementById('colorPalette');
  colBox.innerHTML = '';
  for (const hex of AVATAR_COLORS) {
    const sw = document.createElement('button');
    sw.type = 'button';
    sw.className = `color-swatch${app.profile.color === hex ? ' selected' : ''}`;
    sw.style.background = hex;
    sw.addEventListener('click', () => {
      app.profile.color = hex;
      saveProfile();
      sfx.play('pop');
      colBox.querySelectorAll('.color-swatch').forEach((s) => s.classList.remove('selected'));
      sw.classList.add('selected');
    });
    colBox.appendChild(sw);
  }

  const hatBox = document.getElementById('hatPalette');
  hatBox.innerHTML = '';
  for (const h of AVATAR_HATS) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `hat-chip${app.profile.hat === h.id ? ' selected' : ''}`;
    chip.textContent = `${h.emoji} ${h.label}`;
    chip.addEventListener('click', () => {
      app.profile.hat = h.id;
      saveProfile();
      sfx.play('pop');
      hatBox.querySelectorAll('.hat-chip').forEach((c) => c.classList.remove('selected'));
      chip.classList.add('selected');
    });
    hatBox.appendChild(chip);
  }

  if (avatarEditorInitialized) return;
  avatarEditorInitialized = true;

  nameInput.addEventListener('input', () => {
    app.profile.name = nameInput.value.trim().slice(0, 16) || 'Pemain';
    saveProfile();
  });

  document.getElementById('btnRandomAvatar').addEventListener('click', () => {
    app.profile.color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    app.profile.hat = AVATAR_HATS[Math.floor(Math.random() * AVATAR_HATS.length)].id;
    saveProfile();
    sfx.play('pop');
    initAvatarEditor();
  });

  // Live animated preview canvas
  const canvas = document.getElementById('avatarPreviewCanvas');
  const ctx = canvas.getContext('2d');
  function animatePreview(now) {
    const t = now / 1000;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#1E1B4B';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(110, 152, 58, 17, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    drawCartoonBean(ctx, {
      x: 110, y: 108, r: 36,
      color: app.profile.color,
      hat: app.profile.hat,
      facing: Math.sin(t * 1.4) * 0.7,
      speed: 40,
      time: t,
      name: app.profile.name,
    });
    requestAnimationFrame(animatePreview);
  }
  requestAnimationFrame(animatePreview);
}

function renderHomeGameBadges() {
  const el = document.getElementById('homeGameBadges');
  el.innerHTML = '';
  for (const g of app.gamesCatalog) {
    const div = document.createElement('div');
    div.className = 'mini-game-pill';
    div.innerHTML = `<span style="font-size:20px">${g.icon}</span><span>${g.name}</span>`;
    el.appendChild(div);
  }
}

// ===== LOBBY RENDER =====
function renderLobby(rs) {
  const isHost = rs.hostId === app.myId;
  document.getElementById('lobbyRoomCode').textContent = rs.code;
  document.getElementById('lobbyPlayerCount').textContent = rs.players.length;
  document.getElementById('botControls').classList.toggle('hidden', !isHost);
  document.getElementById('cupControls').classList.toggle('hidden', !isHost);
  document.getElementById('btnRandomGame').classList.toggle('hidden', !isHost);
  document.getElementById('guestWaitNote').classList.toggle('show', !isHost);

  const list = document.getElementById('lobbyPlayersList');
  list.innerHTML = '';
  for (const p of rs.players) {
    const row = document.createElement('div');
    row.className = 'player-row';
    const crown = rs.leaderId === p.id ? '👑 ' : '';
    const hostTag = rs.hostId === p.id ? '<span class="tag-badge">HOST</span>' : '';
    const botTag = p.isBot ? '<span class="tag-badge tag-bot">BOT AI</span>' : '';
    const meTag = p.id === app.myId ? '<span class="tag-badge" style="background:#86EFAC">KAMU</span>' : '';
    row.innerHTML = `
      <div class="player-dot" style="background:${p.color}">${hatEmoji(p.hat)}</div>
      <div class="player-info">
        <div class="player-name">${crown}${escapeHtml(p.name)} ${hostTag}${botTag}${meTag}</div>
      </div>
      <div class="player-pts">${p.sessionScore} pts</div>
    `;
    list.appendChild(row);
  }

  const grid = document.getElementById('lobbyGamesGrid');
  grid.innerHTML = '';
  const allGames = rs.games || app.gamesCatalog;
  const filtered = app.selectedCategory === 'ALL'
    ? allGames
    : allGames.filter((g) => g.tag === app.selectedCategory);
  for (const g of filtered) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'game-tile';
    btn.disabled = !isHost;
    btn.innerHTML = `
      <div class="game-tile-top">
        <div class="game-icon-bubble" style="background:${g.color}">${g.icon}</div>
        <span class="game-tag">${g.tag}</span>
      </div>
      <h4>${g.name}</h4>
      <p>${g.desc}</p>
    `;
    if (isHost) {
      btn.addEventListener('click', () => {
        sfx.play('pop');
        sendWS({ type: 'start_game', gameId: g.id });
      });
    }
    grid.appendChild(btn);
  }
}

function appendLobbyChat(msg) {
  const log = document.getElementById('lobbyChatLog');
  const div = document.createElement('div');
  div.className = `chat-msg ${msg.system ? 'system' : ''} ${msg.tone || ''}`;
  if (msg.system) {
    div.textContent = msg.text;
  } else {
    const b = document.createElement('strong');
    b.style.color = msg.color || '#1E1B4B';
    b.textContent = `${msg.from}: `;
    div.append(b, document.createTextNode(msg.text));
  }
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

// ===== GAME START ROUTING =====
function startGameView(msg) {
  app.activeGameId = msg.gameId;
  app.lastGameMeta = msg.meta || app.gamesCatalog.find((g) => g.id === msg.gameId);
  app.lastCupInfo = msg.partyCup || null;

  showScreen('game');
  document.getElementById('hudGameName').textContent = `${app.lastGameMeta?.icon || '🎮'} ${app.lastGameMeta?.name || msg.gameId}`;

  const cupBadge = document.getElementById('hudCupBadge');
  if (msg.partyCup) {
    cupBadge.hidden = false;
    cupBadge.textContent = `🏆 Cup Ronde ${msg.partyCup.round}/${msg.partyCup.total}`;
  } else {
    cupBadge.hidden = true;
  }

  const isHost = app.roomState?.hostId === app.myId;
  document.getElementById('btnAbortGame').hidden = !isHost;

  document.getElementById('viewArena').classList.add('hidden');
  document.getElementById('viewDraw').classList.add('hidden');
  document.getElementById('viewWord').classList.add('hidden');
  document.getElementById('viewParty').classList.add('hidden');

  arenaView.stop();
  wordView.stop();
  controls.setActive(false);

  if (msg.gameId === 'quick-draw') {
    document.getElementById('viewDraw').classList.remove('hidden');
    drawView.start(app.myId);
  } else if (msg.gameId === 'word-bomb') {
    document.getElementById('viewWord').classList.remove('hidden');
    wordView.start(app.myId);
  } else if (PARTY_GAME_IDS.has(msg.gameId)) {
    document.getElementById('viewParty').classList.remove('hidden');
    partyView.start(app.myId);
  } else {
    document.getElementById('viewArena').classList.remove('hidden');
    arenaView.start(app.myId);
    controls.setActive(true);
  }
  sfx.play('go');
}

// ===== PODIUM RENDER =====
function renderPodium(msg) {
  const isHost = app.roomState?.hostId === app.myId;
  const cup = msg.partyCup;
  const isCupFinal = !!msg.cupFinished;

  document.getElementById('podiumBadge').textContent = cup
    ? (isCupFinal ? `🏆 JUARA GRAND PARTY CUP (${cup.total} RONDE)!` : `🏆 PARTY CUP RONDE ${cup.round}/${cup.total}`)
    : `${msg.meta?.icon || '🎮'} HASIL ${msg.meta?.name?.toUpperCase() || ''}`;

  const displayList = isCupFinal
    ? msg.sessionStandings.map((s, i) => ({ ...s, rank: i + 1, score: s.sessionScore, detail: `${s.wins} kemenangan di Cup` }))
    : msg.standings;

  document.getElementById('podiumTitle').textContent = displayList[0]
    ? `👑 ${displayList[0].name} MENANG!`
    : 'PERTANDINGAN SELESAI!';

  const visual = document.getElementById('podiumVisual');
  visual.innerHTML = '';
  const order = [1, 0, 2]; // Silver, Gold, Bronze visual order
  const medals = ['🥇 #1', '🥈 #2', '🥉 #3'];
  for (const idx of order) {
    const p = displayList[idx];
    if (!p) continue;
    const col = document.createElement('div');
    col.className = `podium-col podium-${idx + 1}`;
    col.innerHTML = `
      <div class="podium-avatar-bubble" style="background:${p.color}">${hatEmoji(p.hat)}</div>
      <strong style="font-size:14px">${escapeHtml(p.name)}</strong>
      <div class="podium-block">
        <div style="font-size:20px">${medals[idx]}</div>
        <div style="font-size:17px;margin-top:4px">${p.score} pts</div>
      </div>
    `;
    visual.appendChild(col);
  }

  const table = document.getElementById('podiumTable');
  table.innerHTML = '';
  for (const p of displayList) {
    const row = document.createElement('div');
    row.className = 'podium-row';
    row.innerHTML = `
      <span>#${p.rank} <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${p.color};border:2px solid #1E1B4B;margin:0 6px"></span>${escapeHtml(p.name)} <small style="color:#64748B;margin-left:6px">${escapeHtml(p.detail || '')}</small></span>
      <span style="color:#0284C7">${p.score} pts</span>
    `;
    table.appendChild(row);
  }

  const btnNext = document.getElementById('btnNextRound');
  const btnAgain = document.getElementById('btnPlayAgain');
  const btnBack = document.getElementById('btnBackLobby');

  btnNext.hidden = !(isHost && cup && !isCupFinal);
  btnAgain.hidden = !(isHost && (!cup || isCupFinal));
  btnBack.hidden = !isHost;
}

function renderLeaderboardTabs() {
  const box = document.getElementById('lbTabs');
  if (!box || !app.gamesCatalog.length) return;
  box.innerHTML = `<button class="lb-tab${app.lbTab === 'global' ? ' active' : ''}" data-tab="global">🌟 Global Top</button>`;
  for (const g of app.gamesCatalog) {
    const b = document.createElement('button');
    b.className = `lb-tab${app.lbTab === g.id ? ' active' : ''}`;
    b.dataset.tab = g.id;
    b.textContent = `${g.icon} ${g.name}`;
    box.appendChild(b);
  }
}

// ===== LEADERBOARD MODAL =====
function fetchLeaderboardForPeriod() {
  const box = document.getElementById('lbContent');
  if (box) box.innerHTML = '<p class="muted" style="text-align:center">Memuat leaderboard...</p>';
  fetch(`/api/leaderboard?period=${encodeURIComponent(app.lbPeriod)}`, { cache: 'no-store' })
    .then((r) => r.json())
    .then((data) => { app.leaderboardData = data; renderLeaderboard(); })
    .catch(() => renderLeaderboard());
}

function openLeaderboard() {
  renderLeaderboardTabs();
  document.getElementById('modalLeaderboard').classList.remove('hidden');
  fetchLeaderboardForPeriod();
}

function renderLeaderboard() {
  const box = document.getElementById('lbContent');
  const data = app.leaderboardData;
  if (!data) {
    box.innerHTML = '<p class="muted" style="text-align:center">Memuat leaderboard...</p>';
    return;
  }

  const rows = app.lbTab === 'global' ? (data.global || []) : (data.perGame?.[app.lbTab] || []);
  if (rows.length === 0) {
    box.innerHTML = '<p class="muted" style="text-align:center">Belum ada rekor di kategori ini. Yuk main dulu dan jadi Juara #1! 🏆</p>';
    return;
  }

  box.innerHTML = '';
  for (const r of rows) {
    const div = document.createElement('div');
    div.className = `lb-row${r.rank <= 3 ? ` top-${r.rank}` : ''}`;
    const scoreVal = app.lbTab === 'global' ? r.totalScore : r.score;
    const subInfo = app.lbTab === 'global'
      ? `🏆 ${r.wins} menang • ${r.gamesPlayed} main • 🔥 streak ${r.bestStreak}`
      : `🏆 ${r.wins} menang • rekor terbaik ${r.best}`;
    div.innerHTML = `
      <div class="lb-rank">${r.rank}</div>
      <div>
        <div><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${r.color};border:2px solid #1E1B4B;margin-right:6px"></span>${hatEmoji(r.hat)} ${escapeHtml(r.name)}</div>
        <div style="font-size:11.5px;color:#64748B;font-weight:700">${subInfo}</div>
      </div>
      <div style="font-family:var(--font-display);font-size:16px;color:#0284C7">${scoreVal} pts</div>
    `;
    box.appendChild(div);
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

const SVG_FS_ENTER = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
const SVG_FS_EXIT = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';

function updateFullscreenIcons() {
  const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
  const svg = isFs ? SVG_FS_EXIT : SVG_FS_ENTER;
  const topBtn = document.getElementById('btnFullscreenTop');
  const gameBtn = document.getElementById('btnFullscreenGame');
  if (topBtn) topBtn.innerHTML = svg;
  if (gameBtn) gameBtn.innerHTML = svg;
}

async function toggleFullscreen() {
  const el = document.documentElement;
  const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
  try {
    if (!isFs) {
      if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      else {
        toast('📱 Di iPhone/Safari, pilih Share → "Add to Home Screen" untuk Fullscreen!');
        return;
      }
    } else {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
  } catch {
    toast('⚠️ Browser menolak fullscreen — coba tap sekali lagi atau Add to Home Screen.');
  }
  updateFullscreenIcons();
}

// ===== EVENT LISTENERS =====
function bindEvents() {
  window.addEventListener('pointerdown', () => sfx.unlock(), { once: true });
  document.addEventListener('fullscreenchange', updateFullscreenIcons);
  document.addEventListener('webkitfullscreenchange', updateFullscreenIcons);

  const onToggleMute = () => {
    const muted = sfx.toggleMute();
    const icon = muted ? '🔇' : '🔊';
    document.getElementById('btnMute').textContent = icon;
    const gm = document.getElementById('btnMuteGame');
    if (gm) gm.textContent = icon;
  };
  document.getElementById('btnMute').addEventListener('click', onToggleMute);
  document.getElementById('btnMuteGame')?.addEventListener('click', onToggleMute);

  document.getElementById('btnFullscreenTop')?.addEventListener('click', toggleFullscreen);
  document.getElementById('btnFullscreenGame')?.addEventListener('click', toggleFullscreen);

  document.getElementById('btnLeaderboardTop').addEventListener('click', openLeaderboard);
  document.getElementById('btnCloseLeaderboard').addEventListener('click', () => {
    document.getElementById('modalLeaderboard').classList.add('hidden');
  });
  document.getElementById('modalLeaderboard').addEventListener('click', (e) => {
    if (e.target.id === 'modalLeaderboard') e.currentTarget.classList.add('hidden');
  });

  document.getElementById('lbPeriodTabs')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-period]');
    if (!btn) return;
    app.lbPeriod = btn.dataset.period;
    document.querySelectorAll('#lbPeriodTabs .lb-period-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    sfx.play('pop');
    fetchLeaderboardForPeriod();
  });

  document.getElementById('lbTabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.lb-tab');
    if (!tab) return;
    app.lbTab = tab.dataset.tab;
    document.querySelectorAll('#lbTabs .lb-tab').forEach((b) => b.classList.remove('active'));
    tab.classList.add('active');
    renderLeaderboard();
  });

  // Account PIN Modal handlers
  document.getElementById('btnAccountTop')?.addEventListener('click', () => openAccountModal());
  document.getElementById('btnAccountInline')?.addEventListener('click', () => openAccountModal());
  document.getElementById('btnCloseAccount')?.addEventListener('click', () => {
    document.getElementById('modalAccount').classList.add('hidden');
  });
  document.getElementById('modalAccount')?.addEventListener('click', (e) => {
    if (e.target.id === 'modalAccount') e.currentTarget.classList.add('hidden');
  });

  document.getElementById('accountAuthForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('inputAuthName').value.trim();
    const pin = document.getElementById('inputAuthPin').value.trim();
    const btn = document.getElementById('btnSubmitAuth');
    btn.disabled = true;
    try {
      const r = await fetch('/api/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'auth',
          name,
          pin,
          color: app.profile.color,
          hat: app.profile.hat,
          customEmotes: app.customEmotes,
        }),
      });
      const data = await r.json();
      if (!r.ok || !data.ok) {
        sfx.play('wrong');
        toast(`❌ ${data.error || 'Gagal login akun'}`);
      } else {
        saveAccountToken(data.token);
        applyCloudAccount(data.account);
        document.getElementById('modalAccount').classList.add('hidden');
        sfx.play('win');
        toast(data.isNew
          ? `🛡️ Nickname "${data.account.name}" dikunci PIN & tersinkron!`
          : `✅ Selamat datang kembali, ${data.account.name}! (${data.account.customEmotes.length} emot tersinkron)`);
      }
    } catch {
      toast('⚠️ Gagal terhubung ke server akun.');
    } finally {
      btn.disabled = false;
    }
  });

  document.getElementById('btnForceSync')?.addEventListener('click', () => syncAccountNow(true));
  document.getElementById('btnLogoutAccount')?.addEventListener('click', () => {
    saveAccountToken(null);
    app.accountName = null;
    updateAccountUI();
    document.getElementById('modalAccount').classList.add('hidden');
    toast('🚪 Keluar dari akun PIN (sekarang Mode Tamu).');
  });

  document.getElementById('gameCategoryFilters')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cat]');
    if (!btn) return;
    app.selectedCategory = btn.dataset.cat;
    document.querySelectorAll('#gameCategoryFilters .lb-tab').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    if (app.roomState) renderLobby(app.roomState);
    sfx.play('pop');
  });

  document.getElementById('btnCreateRoom').addEventListener('click', async () => {
    if (!(await checkNicknameAllowedBeforePlay())) return;
    sfx.play('pop');
    sendWS({ type: 'create_room', profile: app.profile });
  });

  const doJoin = async () => {
    const code = document.getElementById('inputRoomCode').value.trim().toUpperCase();
    if (code.length < 3) {
      toast('Masukkan kode room 4 huruf dulu!');
      return;
    }
    if (!(await checkNicknameAllowedBeforePlay())) return;
    sfx.play('pop');
    sendWS({ type: 'join_room', code, profile: app.profile });
  };
  document.getElementById('btnJoinRoom').addEventListener('click', doJoin);
  document.getElementById('inputRoomCode').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doJoin();
  });

  document.getElementById('btnCopyInvite').addEventListener('click', async () => {
    const link = `${location.origin}/?room=${app.roomCode}`;
    const msg = `🎉 Yuk mabar PARTY POP! Klik link: ${link} (Kode: ${app.roomCode})`;
    try {
      await navigator.clipboard.writeText(msg);
      toast('📋 Link undangan Discord tersalin!');
    } catch {
      toast(`Kode Room: ${app.roomCode}`);
    }
    sfx.play('pop');
  });

  document.getElementById('btnLeaveRoom').addEventListener('click', () => {
    sendWS({ type: 'leave_room' });
    app.roomCode = null;
    app.roomState = null;
    showScreen('home');
  });

  document.getElementById('btnAddBot').addEventListener('click', () => {
    sfx.play('pop');
    sendWS({ type: 'add_bot' });
  });
  document.getElementById('btnRemoveBot').addEventListener('click', () => {
    sfx.play('pop');
    sendWS({ type: 'remove_bot' });
  });

  document.getElementById('cupControls').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cup]');
    if (!btn) return;
    sfx.play('go');
    sendWS({ type: 'start_cup', rounds: Number(btn.dataset.cup) });
  });

  document.getElementById('btnRandomGame').addEventListener('click', () => {
    if (!app.gamesCatalog.length) return;
    const pick = app.gamesCatalog[Math.floor(Math.random() * app.gamesCatalog.length)];
    sfx.play('powerup');
    toast(`🎲 Terpilih: ${pick.icon} ${pick.name}!`);
    setTimeout(() => sendWS({ type: 'start_game', gameId: pick.id }), 350);
  });

  document.getElementById('lobbyChatForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('lobbyChatInput');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    sendWS({ type: 'chat', text });
  });

  document.querySelectorAll('[data-emoji]').forEach((btn) => {
    btn.addEventListener('click', () => sendStandardEmoji(btn.dataset.emoji));
  });

  // Custom Emote Studio & In-Game Tray
  document.getElementById('btnEmotesTop')?.addEventListener('click', openEmoteStudio);
  document.getElementById('btnAddCustomEmoteLobby')?.addEventListener('click', openEmoteStudio);
  document.getElementById('btnAddCustomEmoteGame')?.addEventListener('click', openEmoteStudio);
  document.getElementById('btnCloseEmotes')?.addEventListener('click', () => {
    document.getElementById('modalEmotes').classList.add('hidden');
  });
  document.getElementById('modalEmotes')?.addEventListener('click', (e) => {
    if (e.target.id === 'modalEmotes') e.currentTarget.classList.add('hidden');
  });

  // Mobile Legends Hold-and-Swipe Radial Emote Wheel on BOTH Arena button & HUD Emote button!
  bindRadialTrigger(document.getElementById('btnWheelArena'));
  bindRadialTrigger(document.getElementById('btnGameEmoteTray'));

  document.addEventListener('click', (e) => {
    const tray = document.getElementById('gameEmoteTray');
    if (
      tray &&
      !tray.classList.contains('hidden') &&
      !tray.contains(e.target) &&
      !e.target.closest('#btnGameEmoteTray') &&
      !e.target.closest('#btnWheelArena')
    ) {
      tray.classList.add('hidden');
    }
  });

  // Track mouse position for PC Hold-E radial emote wheel
  window.addEventListener('pointermove', (e) => {
    radial.lastMouseX = e.clientX;
    radial.lastMouseY = e.clientY;
    if (radial.open && radial.keyMode) {
      updateRadialSwipe(e.clientX, e.clientY);
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.key.toLowerCase() === 'e' && radial.open && radial.keyMode) {
      closeRadialWheel(true);
    }
  });

  const fileInput = document.getElementById('inputEmoteFile');
  document.getElementById('btnPickEmoteFile')?.addEventListener('click', () => fileInput.click());
  fileInput?.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    try {
      const dataUrl = await processUploadedEmoteFile(file);
      app.pendingEmoteDataUrl = dataUrl;
      document.getElementById('emotePreviewSlot').innerHTML = `<img src="${dataUrl}" alt="preview" />`;
      document.getElementById('btnSaveCustomEmote').disabled = false;
      sfx.play('pop');
    } catch (err) {
      toast(`⚠️ ${err.message}`);
    }
  });

  document.getElementById('btnSaveCustomEmote')?.addEventListener('click', () => {
    if (!app.pendingEmoteDataUrl) return;
    if (app.customEmotes.length >= MAX_CUSTOM_EMOTES) {
      toast(`Maksimal ${MAX_CUSTOM_EMOTES} emot! Hapus salah satu dulu.`);
      return;
    }
    const label = document.getElementById('inputEmoteLabel').value.trim().slice(0, 14);
    app.customEmotes.push({
      id: `em_${Date.now()}`,
      dataUrl: app.pendingEmoteDataUrl,
      label,
    });
    saveCustomEmotes();
    app.pendingEmoteDataUrl = null;
    document.getElementById('emotePreviewSlot').innerHTML = '<span>🖼️</span>';
    document.getElementById('inputEmoteLabel').value = '';
    document.getElementById('btnSaveCustomEmote').disabled = true;
    renderCustomEmoteUI();
    sfx.play('correct');
    toast('✅ Emot custom tersimpan! Siap dipakai di Lobby & Game!');
  });

  // Quick PC hotkeys: Hold E for radial wheel OR press 1-6 for instant emote!
  window.addEventListener('keydown', (e) => {
    if (!app.roomCode || ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
    if (e.key.toLowerCase() === 'e' && !e.repeat && !radial.open) {
      e.preventDefault();
      openRadialWheel(radial.lastMouseX, radial.lastMouseY, null, null, true);
      return;
    }
    const n = Number(e.key);
    if (n >= 1 && n <= 6) {
      if (app.customEmotes[n - 1]) {
        sendCustomEmote(app.customEmotes[n - 1]);
      } else {
        sendStandardEmoji(DEFAULT_EMOJIS[n - 1]);
      }
    }
  });

  document.getElementById('btnAbortGame').addEventListener('click', () => sendWS({ type: 'back_to_lobby' }));
  document.getElementById('btnNextRound').addEventListener('click', () => sendWS({ type: 'next_cup_round' }));
  document.getElementById('btnBackLobby').addEventListener('click', () => sendWS({ type: 'back_to_lobby' }));
  document.getElementById('btnPlayAgain').addEventListener('click', () => {
    if (app.activeGameId) sendWS({ type: 'start_game', gameId: app.activeGameId });
    else sendWS({ type: 'back_to_lobby' });
  });
}

// ===== BOOT =====
initAvatarEditor();
renderCustomEmoteUI();
updateFullscreenIcons();
bindEvents();
restoreAccountSession();
connectWS();
