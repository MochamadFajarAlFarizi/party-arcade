import { INK, drawCartoonBean, hatEmoji, roundRectPath } from '../renderer.js';
import { sfx } from '../audio.js';

const W = 1120;
const H = 560;
const TEAM_COLORS = ['#EF4444', '#3B82F6', '#22C55E', '#EAB308'];
const TEAM_ICONS = ['🔴', '🔵', '🟢', '🟡'];

const UNO_HEX = {
  red: '#EF4444',
  blue: '#3B82F6',
  green: '#22C55E',
  yellow: '#EAB308',
  wild: '#1E1B4B',
};

const UNO_LABEL = {
  skip: '🚫',
  rev: '🔄',
  '+2': '+2',
  '+4': '+4',
  wild: '🌈',
};

/**
 * Rich Interactive Cartoon Board Game View for:
 * - Ular Tangga Rusuh (snakes-ladders)
 * - Monopoli Kilat (mini-monopoly)
 * - Kartu UNO Rusuh (crazy-cards)
 * - Ludo Party Kilat (ludo-blitz)
 */
export class BoardView {
  constructor(sendAction) {
    this.sendAction = sendAction;
    this.canvas = document.getElementById('boardCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.playersBar = document.getElementById('boardPlayersBar');
    this.logBanner = document.getElementById('boardLogBanner');
    this.controlsBar = document.getElementById('boardControlsBar');
    this.myId = null;
    this.state = null;
    this.lastActionKey = '';
    this.pendingWildCardId = null;
    this.running = false;
    this.lastFrame = performance.now();
  }

  start(myId) {
    this.myId = myId;
    this.state = null;
    this.lastActionKey = '';
    this.pendingWildCardId = null;
    this.playersBar.innerHTML = '';
    this.controlsBar.innerHTML = '';
    this.logBanner.textContent = '🎲 Bersiap memulai papan permainan...';
    if (!this.running) {
      this.running = true;
      this.lastFrame = performance.now();
      requestAnimationFrame((t) => this._frame(t));
    }
  }

  stop() {
    this.running = false;
  }

  updateState(s, events = []) {
    this.state = s;
    for (const ev of events) {
      if (ev.type === 'sfx') sfx.play(ev.sound);
    }
    this._renderPlayersBar(s);
    if (s.lastLog) this.logBanner.textContent = s.lastLog;
    this._renderControls(s);
  }

  _renderPlayersBar(s) {
    this.playersBar.innerHTML = '';
    for (const p of s.players || []) {
      const isTurn = p.id === s.turnPlayerId;
      const chip = document.createElement('div');
      chip.className = `party-player-chip${isTurn ? ' board-turn-chip' : ''}`;
      chip.style.borderColor = s.teamMode ? (TEAM_COLORS[p.team ?? 0] || p.color) : p.color;
      const tIcon = s.teamMode ? `${TEAM_ICONS[p.team ?? 0]} ` : '';
      let extra = '';
      if (s.boardType === 'snakes-ladders') extra = ` • Petak ${p.pos}`;
      else if (s.boardType === 'mini-monopoly') extra = p.bankrupt ? ' 💀' : ` • 💰${p.cash}`;
      else if (s.boardType === 'crazy-cards') extra = ` • 🃏${p.cardCount}${p.cardCount === 1 ? ' UNO!' : ''}`;
      else if (s.boardType === 'ludo-blitz') {
        const fin = (p.pawns || []).filter((x) => x >= 24).length;
        extra = ` • 🏁${fin}/2`;
      }
      chip.textContent = `${isTurn ? '▶️ ' : ''}${tIcon}${hatEmoji(p.hat)} ${p.name}${extra}`;
      this.playersBar.appendChild(chip);
    }
  }

  _renderControls(s) {
    const isMyTurn = s.phase === 'playing' && s.turnPlayerId === this.myId;
    const me = (s.players || []).find((p) => p.id === this.myId);
    const active = (s.players || []).find((p) => p.id === s.turnPlayerId);
    const handSig = s.boardType === 'crazy-cards'
      ? (s.myHand || []).map((c) => `${c.id}:${c.playable ? 1 : 0}`).join(',')
      : '';
    const key = [
      s.boardType, s.phase, s.subPhase, s.turnPlayerId, isMyTurn,
      me?.sabotageLeft, s.pendingTile?.idx, s.pendingTile?.mode,
      s.pendingRoll, (s.validPawns || []).join(','), this.pendingWildCardId, handSig,
    ].join('|');

    if (key === this.lastActionKey) {
      const timerSpan = this.controlsBar.querySelector('.board-turn-timer');
      if (timerSpan) timerSpan.textContent = `⏱ ${Math.ceil(s.turnTimer || 0)}s`;
      return;
    }
    this.lastActionKey = key;

    if (s.phase !== 'playing') {
      this.controlsBar.innerHTML = `<div class="hud-chip">⏳ Bersiap mulai...</div>`;
      return;
    }

    // === 1. ULAR TANGGA ===
    if (s.boardType === 'snakes-ladders') {
      if (!isMyTurn) {
        this.controlsBar.innerHTML = `<div class="hud-chip">⏳ Giliran <b>${escapeHtml(active?.name || '...')}</b> melempar dadu... <span class="board-turn-timer">⏱ ${Math.ceil(s.turnTimer)}s</span></div>`;
        return;
      }
      const canSab = (me?.sabotageLeft || 0) > 0;
      this.controlsBar.innerHTML = `
        <button type="button" class="btn-candy btn-green" id="btnBoardRoll">🎲 LEMPAR DADU! <span class="board-turn-timer">⏱ ${Math.ceil(s.turnTimer)}s</span></button>
        <button type="button" class="btn-candy btn-pink" id="btnBoardSab" ${canSab ? '' : 'disabled'}>😈 SABOTASE LEADER (-4) & LEMPAR (${me?.sabotageLeft || 0}x)</button>
      `;
      this.controlsBar.querySelector('#btnBoardRoll')?.addEventListener('click', () => {
        sfx.play('pop');
        this.sendAction({ action: 'roll' });
        this.lastActionKey = '';
      });
      this.controlsBar.querySelector('#btnBoardSab')?.addEventListener('click', () => {
        sfx.play('powerup');
        this.sendAction({ action: 'sabotage' });
        this.lastActionKey = '';
      });
      return;
    }

    // === 2. MONOPOLI KILAT ===
    if (s.boardType === 'mini-monopoly') {
      if (!isMyTurn) {
        this.controlsBar.innerHTML = `<div class="hud-chip">⏳ Giliran <b>${escapeHtml(active?.name || '...')}</b>... <span class="board-turn-timer">⏱ ${Math.ceil(s.turnTimer)}s</span></div>`;
        return;
      }
      if (s.subPhase === 'decide' && s.pendingTile) {
        const pt = s.pendingTile;
        const label = pt.mode === 'upgrade'
          ? `🏨 UPGRADE HOTEL ${pt.icon} ${escapeHtml(pt.name)} (${pt.cost} Koin)`
          : `🏠 BELI ${pt.icon} ${escapeHtml(pt.name)} (${pt.cost} Koin)`;
        this.controlsBar.innerHTML = `
          <button type="button" class="btn-candy btn-green" id="btnMonoBuy">${label} <span class="board-turn-timer">⏱ ${Math.ceil(s.turnTimer)}s</span></button>
          <button type="button" class="btn-candy btn-white" id="btnMonoSkip">⏭️ LEWATI</button>
        `;
        this.controlsBar.querySelector('#btnMonoBuy')?.addEventListener('click', () => {
          sfx.play('correct');
          this.sendAction({ action: 'buy' });
          this.lastActionKey = '';
        });
        this.controlsBar.querySelector('#btnMonoSkip')?.addEventListener('click', () => {
          sfx.play('pop');
          this.sendAction({ action: 'skip' });
          this.lastActionKey = '';
        });
        return;
      }
      this.controlsBar.innerHTML = `
        <button type="button" class="btn-candy btn-yellow" id="btnMonoRoll">🎲 ${me?.jailed ? 'BAYAR DENDA PENJARA (60)' : 'LEMPAR DADU!'} <span class="board-turn-timer">⏱ ${Math.ceil(s.turnTimer)}s</span></button>
      `;
      this.controlsBar.querySelector('#btnMonoRoll')?.addEventListener('click', () => {
        sfx.play('pop');
        this.sendAction({ action: 'roll' });
        this.lastActionKey = '';
      });
      return;
    }

    // === 3. KARTU UNO RUSUH ===
    if (s.boardType === 'crazy-cards') {
      if (this.pendingWildCardId && isMyTurn) {
        this.controlsBar.innerHTML = `
          <div class="uno-wild-picker">
            <span class="hud-chip">🌈 Pilih Warna Baru:</span>
            <button type="button" class="btn-candy btn-pink" data-wcol="red">🔴 MERAH</button>
            <button type="button" class="btn-candy btn-blue" data-wcol="blue">🔵 BIRU</button>
            <button type="button" class="btn-candy btn-green" data-wcol="green">🟢 HIJAU</button>
            <button type="button" class="btn-candy btn-yellow" data-wcol="yellow">🟡 KUNING</button>
          </div>
        `;
        this.controlsBar.querySelectorAll('[data-wcol]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const cid = this.pendingWildCardId;
            this.pendingWildCardId = null;
            sfx.play('powerup');
            this.sendAction({ action: 'play', cardId: cid, chosenColor: btn.dataset.wcol });
            this.lastActionKey = '';
          });
        });
        return;
      }

      const hand = s.myHand || [];
      const turnNote = isMyTurn
        ? `<span class="hud-chip" style="background:#86EFAC">🔥 GILIRANMU! <span class="board-turn-timer">⏱ ${Math.ceil(s.turnTimer)}s</span></span>`
        : `<span class="hud-chip">⏳ Giliran <b>${escapeHtml(active?.name || '...')}</b> <span class="board-turn-timer">⏱ ${Math.ceil(s.turnTimer)}s</span></span>`;
      const drawBtn = isMyTurn
        ? `<button type="button" class="btn-candy btn-yellow btn-sm" id="btnUnoDraw">📥 AMBIL KARTU</button>`
        : '';

      const cardsHtml = hand.map((c) => {
        const bg = UNO_HEX[c.color] || '#1E1B4B';
        const txt = UNO_LABEL[c.value] || c.value;
        return `
          <button type="button" class="uno-card-btn${c.playable ? ' playable' : ''}" data-card-id="${c.id}" data-wild="${c.color === 'wild' ? '1' : '0'}" style="background:${bg}" ${c.playable ? '' : 'disabled'}>
            <span class="uno-card-val">${txt}</span>
          </button>
        `;
      }).join('');

      this.controlsBar.innerHTML = `
        <div class="uno-bar-top">${turnNote}${drawBtn}</div>
        <div class="uno-hand-row">${cardsHtml || '<span class="muted">Tidak ada kartu</span>'}</div>
      `;

      this.controlsBar.querySelector('#btnUnoDraw')?.addEventListener('click', () => {
        sfx.play('pop');
        this.sendAction({ action: 'draw' });
        this.lastActionKey = '';
      });
      this.controlsBar.querySelectorAll('.uno-card-btn.playable').forEach((btn) => {
        btn.addEventListener('click', () => {
          const cid = btn.dataset.cardId;
          if (btn.dataset.wild === '1') {
            this.pendingWildCardId = cid;
            this.lastActionKey = '';
            this._renderControls(this.state);
          } else {
            sfx.play('pop');
            this.sendAction({ action: 'play', cardId: cid });
            this.lastActionKey = '';
          }
        });
      });
      return;
    }

    // === 4. LUDO PARTY KILAT ===
    if (s.boardType === 'ludo-blitz') {
      if (!isMyTurn) {
        this.controlsBar.innerHTML = `<div class="hud-chip">⏳ Giliran <b>${escapeHtml(active?.name || '...')}</b>... <span class="board-turn-timer">⏱ ${Math.ceil(s.turnTimer)}s</span></div>`;
        return;
      }
      if (s.subPhase === 'pick') {
        const btns = (s.validPawns || []).map((idx) => {
          const st = me?.pawns?.[idx] ?? -1;
          const desc = st === -1 ? 'Keluar Markas!' : `Petak ${st} → ${Math.min(24, st + s.pendingRoll)}`;
          return `<button type="button" class="btn-candy ${idx === 0 ? 'btn-pink' : 'btn-blue'}" data-pawn="${idx}">🏃 PION ${idx === 0 ? 'A' : 'B'} (${desc})</button>`;
        }).join('');
        this.controlsBar.innerHTML = `
          <span class="hud-chip" style="background:#FEF08A">🎲 Dadu: ${s.pendingRoll} <span class="board-turn-timer">⏱ ${Math.ceil(s.turnTimer)}s</span></span>
          ${btns}
        `;
        this.controlsBar.querySelectorAll('[data-pawn]').forEach((btn) => {
          btn.addEventListener('click', () => {
            sfx.play('pop');
            this.sendAction({ action: 'move_pawn', pawnIndex: Number(btn.dataset.pawn) });
            this.lastActionKey = '';
          });
        });
        return;
      }
      this.controlsBar.innerHTML = `
        <button type="button" class="btn-candy btn-orange" id="btnLudoRoll">🎲 LEMPAR DADU LUDO! <span class="board-turn-timer">⏱ ${Math.ceil(s.turnTimer)}s</span></button>
      `;
      this.controlsBar.querySelector('#btnLudoRoll')?.addEventListener('click', () => {
        sfx.play('pop');
        this.sendAction({ action: 'roll' });
        this.lastActionKey = '';
      });
    }
  }

  _syncCanvasSize() {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width < 20 || rect.height < 20) return { vw: W, vh: H };
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const tw = Math.round(rect.width * dpr);
    const th = Math.round(rect.height * dpr);
    if (this.canvas.width !== tw || this.canvas.height !== th) {
      this.canvas.width = tw;
      this.canvas.height = th;
    }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { vw: rect.width, vh: rect.height };
  }

  _frame(now) {
    if (!this.running) return;
    const time = now / 1000;
    this._draw(time);
    requestAnimationFrame((t) => this._frame(t));
  }

  _draw(time) {
    const ctx = this.ctx;
    const { vw, vh } = this._syncCanvasSize();
    ctx.clearRect(0, 0, vw, vh);
    if (!this.state) return;

    const scale = Math.min(vw / W, vh / H);
    const ox = (vw - W * scale) / 2;
    const oy = (vh - H * scale) / 2;

    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);

    const s = this.state;
    if (s.boardType === 'snakes-ladders') this._drawSnakesLadders(ctx, s, time);
    else if (s.boardType === 'mini-monopoly') this._drawMonopoly(ctx, s, time);
    else if (s.boardType === 'crazy-cards') this._drawUno(ctx, s, time);
    else if (s.boardType === 'ludo-blitz') this._drawLudo(ctx, s, time);

    ctx.restore();
  }

  // ===== CANVAS 1: ULAR TANGGA (10x5 Zigzag) =====
  _slTilePos(num) {
    const idx = Math.max(0, Math.min(49, num - 1));
    const rowFromBot = Math.floor(idx / 10);
    const colRaw = idx % 10;
    const col = rowFromBot % 2 === 0 ? colRaw : 9 - colRaw;
    const padX = 40; const padY = 26;
    const cw = (W - padX * 2) / 10;
    const ch = (H - padY * 2) / 5;
    const x = padX + col * cw;
    const y = H - padY - (rowFromBot + 1) * ch;
    return { x, y, cx: x + cw / 2, cy: y + ch / 2, cw, ch };
  }

  _drawSnakesLadders(ctx, s, time) {
    // Cozy board frame
    ctx.fillStyle = '#FFFBEB'; ctx.strokeStyle = INK; ctx.lineWidth = 5;
    roundRectPath(ctx, 24, 12, W - 48, H - 24, 24); ctx.fill(); ctx.stroke();

    const palette = ['#FEF3C7', '#E0F2FE', '#FCE7F3', '#DCFCE7', '#EDE9FE'];
    const bonusSet = new Set(s.bonusTiles || []);
    const swapSet = new Set(s.swapTiles || []);

    for (let n = 1; n <= 50; n++) {
      const t = this._slTilePos(n);
      ctx.fillStyle = n === 50 ? '#FDE047' : bonusSet.has(n) ? '#BBF7D0' : swapSet.has(n) ? '#DDD6FE' : palette[(n - 1) % palette.length];
      ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
      roundRectPath(ctx, t.x + 2, t.y + 2, t.cw - 4, t.ch - 4, 10);
      ctx.fill(); ctx.stroke();

      ctx.fillStyle = '#334155'; ctx.font = '800 14px Nunito, sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(String(n), t.x + 8, t.y + 6);

      if (n === 50) {
        ctx.font = '28px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('🏆', t.cx, t.cy + 6);
      } else if (bonusSet.has(n)) {
        ctx.font = '22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('⭐', t.cx, t.cy + 8);
      } else if (swapSet.has(n)) {
        ctx.font = '22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('🌀', t.cx, t.cy + 8);
      }
    }

    // Ladders 🪜
    for (const [fromStr, to] of Object.entries(s.ladders || {})) {
      const a = this._slTilePos(Number(fromStr));
      const b = this._slTilePos(Number(to));
      const dx = b.cx - a.cx; const dy = b.cy - a.cy;
      const len = Math.hypot(dx, dy) || 1;
      const px = (-dy / len) * 9; const py = (dx / len) * 9;
      ctx.strokeStyle = '#92400E'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(a.cx + px, a.cy + py); ctx.lineTo(b.cx + px, b.cy + py); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(a.cx - px, a.cy - py); ctx.lineTo(b.cx - px, b.cy - py); ctx.stroke();
      ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 3.5;
      const steps = Math.max(4, Math.floor(len / 24));
      for (let i = 1; i < steps; i++) {
        const f = i / steps;
        const rx = a.cx + dx * f; const ry = a.cy + dy * f;
        ctx.beginPath(); ctx.moveTo(rx + px, ry + py); ctx.lineTo(rx - px, ry - py); ctx.stroke();
      }
    }

    // Snakes 🐍
    for (const [fromStr, to] of Object.entries(s.snakes || {})) {
      const a = this._slTilePos(Number(fromStr));
      const b = this._slTilePos(Number(to));
      const mx = (a.cx + b.cx) / 2 + 28;
      const my = (a.cy + b.cy) / 2;
      ctx.strokeStyle = INK; ctx.lineWidth = 13; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(a.cx, a.cy); ctx.quadraticCurveTo(mx, my, b.cx, b.cy); ctx.stroke();
      ctx.strokeStyle = '#16A34A'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(a.cx, a.cy); ctx.quadraticCurveTo(mx, my, b.cx, b.cy); ctx.stroke();
      // Snake head at top
      ctx.fillStyle = '#EF4444'; ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(a.cx, a.cy, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }

    // Player tokens (clustered neatly when sharing a tile)
    const groups = new Map();
    for (const p of s.players || []) {
      if (!groups.has(p.pos)) groups.set(p.pos, []);
      groups.get(p.pos).push(p);
    }
    for (const [pos, arr] of groups.entries()) {
      const t = this._slTilePos(pos);
      arr.forEach((p, idx) => {
        const offX = arr.length > 1 ? ((idx % 3) - (Math.min(arr.length, 3) - 1) / 2) * 24 : 0;
        const offY = arr.length > 3 ? (Math.floor(idx / 3) * 20 - 10) : 4;
        const active = p.id === s.turnPlayerId;
        drawCartoonBean(ctx, {
          x: t.cx + offX, y: t.cy + offY, r: active ? 17 : 14,
          color: p.color, hat: p.hat, time, name: p.name, isMe: p.id === this.myId,
          turbo: active,
        });
      });
    }

    this._drawDiceBadge(ctx, s.lastRoll, W - 92, 46);
  }

  // ===== CANVAS 2: MONOPOLI KILAT (16-tile Square Loop) =====
  _monoTilePos(idx) {
    // 5x5 outer perimeter (16 tiles clockwise starting bottom-left = 0!)
    const coords = [
      [0, 4], [1, 4], [2, 4], [3, 4], [4, 4],
      [4, 3], [4, 2], [4, 1], [4, 0],
      [3, 0], [2, 0], [1, 0], [0, 0],
      [0, 1], [0, 2], [0, 3],
    ];
    const [c, r] = coords[idx % 16];
    const padX = 50; const padY = 18;
    const cw = (W - padX * 2) / 5;
    const ch = (H - padY * 2) / 5;
    const x = padX + c * cw;
    const y = padY + r * ch;
    return { x, y, cx: x + cw / 2, cy: y + ch / 2, cw, ch };
  }

  _drawMonopoly(ctx, s, time) {
    // Center felt table
    ctx.fillStyle = '#DCFCE7'; ctx.strokeStyle = INK; ctx.lineWidth = 5;
    roundRectPath(ctx, 42, 12, W - 84, H - 24, 22); ctx.fill(); ctx.stroke();

    // Center logo & stats
    ctx.fillStyle = '#14532D'; ctx.font = '700 32px Fredoka, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🏠 MONOPOLI KILAT', W / 2, H / 2 - 42);
    ctx.font = '800 18px Nunito, sans-serif'; ctx.fillStyle = '#1E293B';
    ctx.fillText(`Ronde ${s.round} / ${s.maxRounds}`, W / 2, H / 2 - 6);
    if (s.lastRoll) {
      this._drawDiceBadge(ctx, s.lastRoll, W / 2, H / 2 + 54);
    }

    // 16 perimeter tiles
    for (const t of s.tiles || []) {
      const p = this._monoTilePos(t.idx);
      ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = INK; ctx.lineWidth = 3;
      roundRectPath(ctx, p.x + 3, p.y + 3, p.cw - 6, p.ch - 6, 12);
      ctx.fill(); ctx.stroke();

      // Top color banner
      ctx.fillStyle = t.color || '#CBD5E1';
      roundRectPath(ctx, p.x + 5, p.y + 5, p.cw - 10, 22, 8);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF'; ctx.font = '800 13px Nunito, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`${t.icon} ${t.name}`, p.cx, p.y + 16);

      // Price / Rent / Owner strip
      ctx.fillStyle = '#334155'; ctx.font = '800 12.5px Nunito, sans-serif';
      if (t.type === 'prop') {
        const rentNow = t.level >= 2 ? t.rent * 2 : t.rent;
        ctx.fillText(t.ownerId ? `Sewa: ${rentNow} ${t.level >= 2 ? '🏨' : '🏠'}` : `Beli: ${t.price}`, p.cx, p.cy + 4);
        if (t.ownerId) {
          ctx.fillStyle = t.ownerColor || '#EF4444'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
          roundRectPath(ctx, p.x + 14, p.y + p.ch - 26, p.cw - 28, 18, 7);
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#FFFFFF'; ctx.font = '800 11px Nunito, sans-serif';
          ctx.fillText(t.ownerName.slice(0, 10), p.cx, p.y + p.ch - 17);
        }
      } else {
        const sub = t.type === 'start' ? '+200 Koin' : t.type === 'tax' ? '-120 Koin' : t.type === 'free' ? '+150 Koin' : t.type === 'jail' ? 'Denda 60' : 'Kejutan!';
        ctx.fillText(sub, p.cx, p.cy + 10);
      }
    }

    // Player tokens on tiles
    const groups = new Map();
    for (const pl of s.players || []) {
      if (pl.bankrupt) continue;
      if (!groups.has(pl.pos)) groups.set(pl.pos, []);
      groups.get(pl.pos).push(pl);
    }
    for (const [pos, arr] of groups.entries()) {
      const tp = this._monoTilePos(pos);
      arr.forEach((pl, i) => {
        const ox = (i - (arr.length - 1) / 2) * 26;
        drawCartoonBean(ctx, {
          x: tp.cx + ox, y: tp.cy + 14, r: pl.id === s.turnPlayerId ? 16 : 13,
          color: pl.color, hat: pl.hat, time, name: pl.name, isMe: pl.id === this.myId,
          turbo: pl.id === s.turnPlayerId,
        });
      });
    }
  }

  // ===== CANVAS 3: KARTU UNO RUSUH (Tabletop Card Arena) =====
  _drawUno(ctx, s, time) {
    // Rich green-blue velvet poker/party table
    const grad = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 540);
    grad.addColorStop(0, '#1E3A8A');
    grad.addColorStop(1, '#0F172A');
    ctx.fillStyle = grad; ctx.strokeStyle = INK; ctx.lineWidth = 6;
    roundRectPath(ctx, 20, 12, W - 40, H - 24, 34); ctx.fill(); ctx.stroke();

    // Glowing active color aura ring in center!
    const activeHex = UNO_HEX[s.activeColor] || '#FACC15';
    ctx.strokeStyle = activeHex; ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2 + 12, 118 + Math.sin(time * 5) * 5, 0, Math.PI * 2);
    ctx.stroke();

    // Direction ring text
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = '700 18px Fredoka, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`${s.direction > 0 ? '↻ SEARAH JARUM JAM' : '↺ BERLAWANAN ARAH'} • Sisa ${s.turnsLeft} giliran`, W / 2, 50);

    // Draw center Top Card
    if (s.topCard) {
      const cardCol = UNO_HEX[s.topCard.color] || activeHex;
      const cw = 128; const ch = 176;
      const cx = W / 2 - cw / 2; const cy = H / 2 - ch / 2 + 12;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      roundRectPath(ctx, cx + 6, cy + 10, cw, ch, 20); ctx.fill();
      ctx.fillStyle = cardCol; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 6;
      roundRectPath(ctx, cx, cy, cw, ch, 20); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = INK; ctx.lineWidth = 3;
      roundRectPath(ctx, cx - 2, cy - 2, cw + 4, ch + 4, 22); ctx.stroke();

      // White inner oval
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.beginPath(); ctx.ellipse(W / 2, H / 2 + 12, 46, 68, 0.35, 0, Math.PI * 2); ctx.fill();

      const label = UNO_LABEL[s.topCard.value] || s.topCard.value;
      ctx.fillStyle = '#FFFFFF'; ctx.font = '700 54px Fredoka, sans-serif';
      ctx.fillText(label, W / 2, H / 2 + 16);
    }

    // Active color pill under top card
    ctx.fillStyle = activeHex; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3;
    roundRectPath(ctx, W / 2 - 86, H / 2 + 112, 172, 34, 17); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FFFFFF'; ctx.font = '800 15px Nunito, sans-serif';
    const colLabel = { red: 'WARNA: MERAH', blue: 'WARNA: BIRU', green: 'WARNA: HIJAU', yellow: 'WARNA: KUNING' }[s.activeColor] || 'WARNA';
    ctx.fillText(colLabel, W / 2, H / 2 + 130);

    // Draw players seated around the oval!
    const players = s.players || [];
    const n = Math.max(1, players.length);
    players.forEach((p, idx) => {
      const ang = (idx / n) * Math.PI * 2 - Math.PI / 2;
      const px = W / 2 + Math.cos(ang) * 395;
      const py = H / 2 + 8 + Math.sin(ang) * 195;
      const isTurn = p.id === s.turnPlayerId;

      ctx.fillStyle = isTurn ? '#FEF08A' : 'rgba(255,255,255,0.92)';
      ctx.strokeStyle = isTurn ? '#F97316' : INK; ctx.lineWidth = isTurn ? 5 : 3;
      roundRectPath(ctx, px - 82, py - 34, 164, 68, 16); ctx.fill(); ctx.stroke();

      drawCartoonBean(ctx, {
        x: px - 50, y: py + 2, r: 18, color: p.color, hat: p.hat, time, turbo: isTurn,
      });
      ctx.fillStyle = INK; ctx.font = '800 14px Nunito, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(p.name.slice(0, 10), px - 24, py - 9);
      ctx.fillStyle = p.cardCount === 1 ? '#DC2626' : '#0284C7';
      ctx.font = '900 15px Fredoka, sans-serif';
      ctx.fillText(p.cardCount === 1 ? '⚠️ UNO (1)!' : `🃏 ${p.cardCount} kartu`, px - 24, py + 14);
    });
  }

  // ===== CANVAS 4: LUDO PARTY KILAT (24-Tile Circular Race Track) =====
  _ludoTilePos(gIdx) {
    const ang = (gIdx / 24) * Math.PI * 2 - Math.PI / 2;
    return {
      x: W / 2 + Math.cos(ang) * 360,
      y: H / 2 + Math.sin(ang) * 215,
    };
  }

  _drawLudo(ctx, s, time) {
    ctx.fillStyle = '#FEFCE8'; ctx.strokeStyle = INK; ctx.lineWidth = 5;
    roundRectPath(ctx, 24, 12, W - 48, H - 24, 28); ctx.fill(); ctx.stroke();

    // Dashed racing track ellipse
    ctx.strokeStyle = '#CBD5E1'; ctx.lineWidth = 14;
    ctx.beginPath(); ctx.ellipse(W / 2, H / 2, 360, 215, 0, 0, Math.PI * 2); ctx.stroke();

    // Center Finish Trophy Arena
    ctx.fillStyle = '#FEF08A'; ctx.strokeStyle = INK; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(W / 2, H / 2, 92, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.font = '38px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🏆', W / 2, H / 2 - 22);
    ctx.fillStyle = INK; ctx.font = '700 18px Fredoka, sans-serif';
    ctx.fillText(`Ronde ${s.round}/${s.maxRounds}`, W / 2, H / 2 + 16);
    if (s.lastRoll) this._drawDiceBadge(ctx, s.lastRoll, W / 2, H / 2 + 64);

    // 24 Track Tiles
    const safeSet = new Set(s.safeTiles || []);
    for (let i = 0; i < 24; i++) {
      const pt = this._ludoTilePos(i);
      const isSafe = safeSet.has(i);
      ctx.fillStyle = isSafe ? '#FDE047' : '#FFFFFF';
      ctx.strokeStyle = INK; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, isSafe ? 25 : 21, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = isSafe ? '#92400E' : '#64748B';
      ctx.font = isSafe ? '18px sans-serif' : '800 12px Nunito, sans-serif';
      ctx.fillText(isSafe ? '⭐' : String(i + 1), pt.x, pt.y + 1);
    }

    // Draw pawns on track!
    const tileBuckets = new Map();
    for (const p of s.players || []) {
      (p.pawns || []).forEach((st, pidx) => {
        if (st >= 0 && st < 24) {
          const gTile = (p.startOffset + st) % 24;
          if (!tileBuckets.has(gTile)) tileBuckets.set(gTile, []);
          tileBuckets.get(gTile).push({ p, pidx, st });
        }
      });
    }

    for (const [gTile, items] of tileBuckets.entries()) {
      const pt = this._ludoTilePos(gTile);
      items.forEach((it, k) => {
        const ox = (k - (items.length - 1) / 2) * 20;
        const active = it.p.id === s.turnPlayerId;
        ctx.fillStyle = it.p.color; ctx.strokeStyle = active ? '#FACC15' : INK; ctx.lineWidth = active ? 4 : 3;
        ctx.beginPath();
        ctx.arc(pt.x + ox, pt.y - 6 + Math.sin(time * 5 + k) * (active ? 3 : 0), 14, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#FFFFFF'; ctx.font = '900 12px Nunito, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(it.pidx === 0 ? 'A' : 'B', pt.x + ox, pt.y - 5 + Math.sin(time * 5 + k) * (active ? 3 : 0));
      });
    }
  }

  _drawDiceBadge(ctx, roll, cx, cy) {
    if (!roll) return;
    ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = INK; ctx.lineWidth = 3.5;
    roundRectPath(ctx, cx - 56, cy - 22, 112, 44, 14); ctx.fill(); ctx.stroke();
    ctx.fillStyle = roll.color || '#EF4444'; ctx.font = '700 22px Fredoka, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`🎲 ${roll.value}`, cx, cy + 1);
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
