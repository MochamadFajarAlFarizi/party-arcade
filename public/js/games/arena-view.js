import { INK, VFXPool, drawCartoonBean, drawCartoonBomb, roundRectPath } from '../renderer.js';
import { sfx } from '../audio.js';

const W = 1280;
const H = 620;

const POWERUP_META = {
  turbo: { icon: '⚡', bg: '#FACC15' },
  shield: { icon: '🛡️', bg: '#38BDF8' },
  mega: { icon: '💪', bg: '#FB7185' },
  shockwave: { icon: '🌀', bg: '#A855F7' },
};

const TILE_PALETTE = ['#FF5E7E', '#FFD166', '#22C55E', '#38BDF8'];
const TILE_ICONS = ['❤️', '⭐', '🍀', '💎'];
const TEAM_COLORS = ['#EF4444', '#3B82F6', '#22C55E', '#EAB308'];
const TEAM_LABELS = ['M', 'B', 'H', 'K'];

/**
 * 60 FPS Vibrant Cartoon Canvas Renderer for Bomb Pass, Sumo Knockout,
 * Turf Paint, and Chaos Survival with smooth interpolation & juicy VFX.
 */
export class ArenaView {
  constructor(canvas, hudCenterEl, onBanner) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.hudCenterEl = hudCenterEl;
    this.onBanner = onBanner;
    this.vfx = new VFXPool();
    this.state = null;
    this.myId = null;
    this.interp = new Map(); // id -> { x, y }
    this.playerEmotes = new Map(); // playerId -> { emoji, img, label, until }
    this.running = false;
    this.lastFrame = performance.now();
  }

  start(myId) {
    this.myId = myId;
    this.interp.clear();
    this.playerEmotes.clear();
    this.vfx = new VFXPool();
    this.state = null;
    if (!this.running) {
      this.running = true;
      this.lastFrame = performance.now();
      requestAnimationFrame((t) => this._frame(t));
    }
  }

  showPlayerEmote(playerId, reaction, cachedImg = null) {
    if (!playerId) return;
    this.playerEmotes.set(playerId, {
      emoji: reaction.emoji || '',
      img: cachedImg,
      label: reaction.label || '',
      createdAt: performance.now(),
      until: performance.now() + 2600,
    });
  }

  stop() {
    this.running = false;
  }

  updateState(state, events = []) {
    this.state = state;
    this._updateHud(state);

    for (const ev of events) {
      if (ev.type === 'sfx') sfx.play(ev.sound);
      else if (ev.type === 'banner') this.onBanner(ev.text);
      else if (ev.type === 'dash') {
        sfx.play('dash');
        this.vfx.burst(ev.x, ev.y, ev.color || '#FFFFFF', 10, 170);
      } else if (ev.type === 'bump') {
        sfx.play('bump');
        this.vfx.burst(ev.x, ev.y, '#FFFFFF', ev.heavy ? 18 : 10, ev.heavy ? 240 : 140);
        if (ev.heavy) this.vfx.addShake(6);
      } else if (ev.type === 'pass') {
        sfx.play('pass');
        this.vfx.ring(ev.x, ev.y, '#FACC15', 75);
        this.vfx.popup(ev.x, ev.y - 18, `💣 OPER -> ${ev.to}!`, '#FFD166');
      } else if (ev.type === 'boost') {
        sfx.play('powerup');
        this.vfx.ring(ev.x, ev.y, '#FFD166', 65);
      } else if (ev.type === 'explode') {
        sfx.play('explode');
        this.vfx.burst(ev.x, ev.y, '#FF5E7E', 34, 340);
        this.vfx.burst(ev.x, ev.y, '#FFD166', 24, 240);
        this.vfx.ring(ev.x, ev.y, '#EF4444', 180);
        this.vfx.popup(ev.x, ev.y - 20, `💥 ${ev.name} MELEDAK!`, '#FF5E7E');
        this.vfx.addShake(14);
      } else if (ev.type === 'ko') {
        sfx.play('explode');
        this.vfx.burst(ev.x, ev.y, '#FFFFFF', 24, 220);
        this.vfx.ring(ev.x, ev.y, '#38BDF8', 110);
        this.vfx.popup(ev.x, ev.y - 18, ev.killer ? `🌊 ${ev.victim} KO oleh ${ev.killer}!` : `🌊 ${ev.victim} JATUH!`, '#38BDF8');
        this.vfx.addShake(9);
      } else if (ev.type === 'shockwave') {
        this.vfx.ring(ev.x, ev.y, ev.color || '#A855F7', 230);
        this.vfx.addShake(8);
      } else if (ev.type === 'splash') {
        sfx.play(ev.big ? 'explode' : 'pop');
        this.vfx.burst(ev.x, ev.y, ev.color, ev.big ? 28 : 14, ev.big ? 260 : 160);
        this.vfx.ring(ev.x, ev.y, ev.color, ev.big ? 130 : 70);
      } else if (ev.type === 'popup') {
        this.vfx.popup(ev.x, ev.y, ev.text, ev.color);
      }
    }
  }

  _updateHud(s) {
    if (!s || !this.hudCenterEl) return;
    if (s.gameId === 'bomb-pass') {
      const alive = s.players.filter((p) => p.alive).length;
      const minBomb = s.bombs?.length ? Math.min(...s.bombs.map((b) => b.timer)).toFixed(1) : '-';
      this.hudCenterEl.textContent = `👥 Sisa ${alive} • 💣 Bom: ${minBomb}s`;
    } else if (s.gameId === 'sumo-knockout') {
      const alive = s.players.filter((p) => p.alive).length;
      this.hudCenterEl.textContent = `🏝️ Sisa ${alive} • Radius ${Math.round(s.islandRadius)}m`;
    } else if (s.gameId === 'turf-paint') {
      this.hudCenterEl.textContent = `🎨 Sisa Waktu: ${s.timeLeft}s`;
    } else if (s.gameId === 'chaos-survival') {
      const titles = { 1: '🚦 Lampu Merah-Hijau', 2: '🔫 Laser Putar', 3: '🟦 Lantai Jebakan' };
      this.hudCenterEl.textContent = `${titles[s.stage] || 'Chaos'} • ⏱ ${s.stageTimer}s`;
    } else if (s.gameId === 'bumper-soccer') {
      this.hudCenterEl.textContent = `🔴 ${s.teamScore?.red || 0} - ${s.teamScore?.blue || 0} 🔵 • ⏱ ${s.timeLeft}s`;
    } else if (s.gameId === 'zombie-tag') {
      this.hudCenterEl.textContent = `🧬 Manusia: ${s.humansLeft} • ⏱ ${s.timeLeft}s`;
    } else if (s.gameId === 'king-hill') {
      this.hudCenterEl.textContent = `🎯 Zona Pindah: ${s.zone?.moveIn}s • ⏱ ${s.timeLeft}s`;
    } else if (s.gameId === 'dodgeball') {
      const alive = s.players.filter((p) => p.alive).length;
      this.hudCenterEl.textContent = `🏐 Sisa ${alive} • Ambil bola + DASH untuk lempar!`;
    } else if (s.gameId === 'dash-blade') {
      const alive = s.players.filter((p) => p.alive).length;
      this.hudCenterEl.textContent = `⚔️ Sisa ${alive} • Tekan DASH untuk Tebas Lawan! • ⏱ ${s.timeLeft}s`;
    } else if (s.gameId === 'ricochet-duel') {
      const alive = s.players.filter((p) => p.alive).length;
      this.hudCenterEl.textContent = `🔫 Sisa ${alive} • Tekan DASH untuk Tembak Pantul! • ⏱ ${s.timeLeft}s`;
    } else if (s.gameId === 'memory-rush') {
      const label = s.subPhase === 'preview' ? '👀 HAFALKAN ⭐' : s.subPhase === 'hide' ? '❓ LARI KE ⭐!' : '💥 MELEDAK!';
      this.hudCenterEl.textContent = `🧩 Ronde ${s.wave}/${s.maxWaves} • ${label} (${s.subTimer}s)`;
    } else if (s.gameId === 'betrayal-bridge') {
      const label = s.cyclePhase === 'warning' ? '⚠️ UBIN RETAK! DORONG!' : s.cyclePhase === 'drop' ? '🌋 LAVA TERBUKA!' : '👑 REBUT PETI & POSISI!';
      this.hudCenterEl.textContent = `🌋 ${label} • ⏱ ${s.timeLeft}s`;
    } else if (s.gameId === 'turbo-race') {
      const me = s.players.find((p) => p.id === this.myId);
      this.hudCenterEl.textContent = `🏁 Lap ${me?.lap || 1}/3 • ⏱ ${s.timeLeft}s`;
    } else if (typeof s.timeLeft === 'number') {
      const alive = s.players.filter((p) => p.alive).length;
      this.hudCenterEl.textContent = `👥 ${alive} Aktif • ⏱ ${s.timeLeft}s`;
    }
  }

  _frame(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    const time = now / 1000;

    this.vfx.update(dt);
    this._draw(dt, time);
    requestAnimationFrame((t) => this._frame(t));
  }

  _lerpPlayers(players, dt) {
    const out = [];
    const factor = Math.min(1, dt * 20);
    for (const p of players) {
      let cur = this.interp.get(p.id);
      if (!cur || Math.hypot(p.x - cur.x, p.y - cur.y) > 220) {
        cur = { x: p.x, y: p.y };
        this.interp.set(p.id, cur);
      } else {
        cur.x += (p.x - cur.x) * factor;
        cur.y += (p.y - cur.y) * factor;
      }
      out.push({ ...p, rx: cur.x, ry: cur.y });
    }
    return out;
  }

  _syncCanvasSize() {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return { vw: W, vh: H };
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetW = Math.round(rect.width * dpr);
    const targetH = Math.round(rect.height * dpr);
    if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
      this.canvas.width = targetW;
      this.canvas.height = targetH;
    }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { vw: rect.width, vh: rect.height };
  }

  _drawFullBleedBackdrop(ctx, vw, vh, gameId, time) {
    if (gameId === 'betrayal-bridge') {
      const grad = ctx.createLinearGradient(0, 0, 0, vh);
      grad.addColorStop(0, '#7F1D1D');
      grad.addColorStop(0.5, '#DC2626');
      grad.addColorStop(1, '#F97316');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, vw, vh);
      ctx.fillStyle = 'rgba(254, 240, 138, 0.22)';
      for (let i = 0; i < 12; i++) {
        const bx = ((i * 173 + time * 18) % (vw + 80)) - 40;
        const by = ((i * 97 + Math.sin(time * 2 + i) * 28) % vh + vh) % vh;
        ctx.beginPath();
        ctx.arc(bx, by, 14 + Math.sin(time * 3 + i) * 5, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

    if (gameId === 'sumo-knockout' || gameId === 'shark-escape') {
      const grad = ctx.createLinearGradient(0, 0, 0, vh);
      grad.addColorStop(0, '#0284C7');
      grad.addColorStop(0.5, '#0EA5E9');
      grad.addColorStop(1, '#38BDF8');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, vw, vh);
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 3;
      const rows = Math.max(5, Math.ceil(vh / 85));
      for (let i = 0; i < rows; i++) {
        const y = 40 + i * (vh / rows);
        ctx.beginPath();
        for (let x = 0; x <= vw; x += 44) {
          const wy = y + Math.sin(x * 0.018 + time * 2.5 + i) * 7;
          if (x === 0) ctx.moveTo(x, wy); else ctx.lineTo(x, wy);
        }
        ctx.stroke();
      }
      return;
    }

    // Sunny vibrant cartoon stadium sky across 100% of screen width & height
    const grad = ctx.createLinearGradient(0, 0, 0, vh);
    if (gameId === 'turf-paint') {
      grad.addColorStop(0, '#38BDF8');
      grad.addColorStop(1, '#BAE6FD');
    } else if (gameId === 'chaos-survival') {
      grad.addColorStop(0, '#60A5FA');
      grad.addColorStop(1, '#C4B5FD');
    } else {
      grad.addColorStop(0, '#2BB7F6');
      grad.addColorStop(1, '#7DD3FC');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, vw, vh);

    // Subtle drifting decorative clouds on wide side margins
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    for (let i = 0; i < 4; i++) {
      const cx = ((time * (14 + i * 5) + i * 320) % (vw + 220)) - 110;
      const cy = 65 + (i % 3) * (vh * 0.28);
      ctx.beginPath();
      ctx.arc(cx, cy, 34, 0, Math.PI * 2);
      ctx.arc(cx + 28, cy - 10, 28, 0, Math.PI * 2);
      ctx.arc(cx + 52, cy, 24, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _draw(dt, time) {
    const ctx = this.ctx;
    const { vw, vh } = this._syncCanvasSize();
    ctx.clearRect(0, 0, vw, vh);
    if (!this.state) return;

    const s = this.state;
    this._drawFullBleedBackdrop(ctx, vw, vh, s.gameId, time);

    // Fit 1280x620 widescreen world cleanly as LARGE as possible inside full-bleed viewport!
    const topReserve = vh < 500 ? 38 : 44;
    const botReserve = vh < 500 ? 4 : 10;
    const availW = vw - 8;
    const availH = Math.max(120, vh - topReserve - botReserve);
    const scale = Math.min(availW / 1244, availH / 586);
    const offX = (vw - W * scale) / 2;
    const offY = topReserve + (availH - H * scale) / 2;

    ctx.save();
    ctx.translate(offX, offY);
    ctx.scale(scale, scale);

    if (this.vfx.shake > 0.2) {
      ctx.translate((Math.random() - 0.5) * this.vfx.shake, (Math.random() - 0.5) * this.vfx.shake);
    }

    const players = this._lerpPlayers(s.players || [], dt);

    if (s.gameId === 'bomb-pass') this._drawBombPass(ctx, s, players, time);
    else if (s.gameId === 'sumo-knockout') this._drawSumo(ctx, s, players, time);
    else if (s.gameId === 'turf-paint') this._drawTurf(ctx, s, players, time);
    else if (s.gameId === 'chaos-survival') this._drawChaos(ctx, s, players, time);
    else if (s.gameId === 'crown-chase') this._drawCrownChase(ctx, s, players, time);
    else if (s.gameId === 'coin-rush') this._drawCoinRush(ctx, s, players, time);
    else if (s.gameId === 'zombie-tag') this._drawZombieTag(ctx, s, players, time);
    else if (s.gameId === 'bumper-soccer') this._drawSoccer(ctx, s, players, time);
    else if (s.gameId === 'meteor-shower') this._drawMeteors(ctx, s, players, time);
    else if (s.gameId === 'snake-party') this._drawSnake(ctx, s, players, time);
    else if (s.gameId === 'ghost-freeze') this._drawGhostFreeze(ctx, s, players, time);
    else if (s.gameId === 'king-hill') this._drawKingHill(ctx, s, players, time);
    else if (s.gameId === 'shark-escape') this._drawSharkEscape(ctx, s, players, time);
    else if (s.gameId === 'dodgeball') this._drawDodgeball(ctx, s, players, time);
    else if (s.gameId === 'turbo-race') this._drawTurboRace(ctx, s, players, time);
    else if (s.gameId === 'dash-blade') this._drawDashBlade(ctx, s, players, time);
    else if (s.gameId === 'ricochet-duel') this._drawRicochet(ctx, s, players, time);
    else if (s.gameId === 'memory-rush') this._drawMemoryRush(ctx, s, players, time);
    else if (s.gameId === 'betrayal-bridge') this._drawBetrayalBridge(ctx, s, players, time);

    if (s.teamMode && s.gameId !== 'bumper-soccer') {
      this._drawTeamBadges(ctx, players, time);
    }
    this._drawPlayerEmotes(ctx, players);
    this.vfx.draw(ctx);
    ctx.restore();
  }

  _drawPlayerEmotes(ctx, players) {
    const now = performance.now();
    for (const p of players) {
      const em = this.playerEmotes.get(p.id);
      if (!em) continue;
      if (now > em.until) {
        this.playerEmotes.delete(p.id);
        continue;
      }
      const age = (now - em.createdAt) / 1000;
      const remain = (em.until - now) / 1000;
      const pop = age < 0.16 ? 0.4 + (age / 0.16) * 0.72 : Math.max(0.95, 1.12 - (age - 0.16) * 0.6);
      const alpha = remain < 0.35 ? Math.max(0, remain / 0.35) : 1;
      const bx = p.rx;
      const by = p.ry - 56 - Math.sin(age * 5) * 3;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(bx, by);
      ctx.scale(pop, pop);

      // Comic sticker speech bubble
      const size = em.img ? 52 : 42;
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3.2;
      roundRectPath(ctx, -size / 2, -size / 2, size, size, 14);
      ctx.fill();
      ctx.stroke();

      // Little speech tail
      ctx.beginPath();
      ctx.moveTo(-7, size / 2 - 1);
      ctx.lineTo(0, size / 2 + 9);
      ctx.lineTo(7, size / 2 - 1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if (em.img && em.img.complete && em.img.naturalWidth > 0) {
        ctx.save();
        roundRectPath(ctx, -size / 2 + 4, -size / 2 + 4, size - 8, size - 8, 10);
        ctx.clip();
        ctx.drawImage(em.img, -size / 2 + 4, -size / 2 + 4, size - 8, size - 8);
        ctx.restore();
      } else if (em.emoji) {
        ctx.font = '26px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(em.emoji, 0, 1);
      }
      ctx.restore();
    }
  }

  _drawPlaygroundFloor(ctx, bgA = '#D9F99D', bgB = '#BEF264') {
    // Toybox stadium fence filling wide 1280x620 arena
    ctx.fillStyle = '#FFFDF7';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    roundRectPath(ctx, 18, 18, W - 36, H - 36, 26);
    ctx.fill();
    ctx.stroke();

    // Checkerboard grass/candy floor
    ctx.save();
    roundRectPath(ctx, 28, 28, W - 56, H - 56, 18);
    ctx.clip();
    const step = 62;
    for (let y = 28; y < H - 28; y += step) {
      for (let x = 28; x < W - 28; x += step) {
        const even = (Math.floor(x / step) + Math.floor(y / step)) % 2 === 0;
        ctx.fillStyle = even ? bgA : bgB;
        ctx.fillRect(x, y, step, step);
      }
    }
    ctx.restore();
  }

  _drawBombPass(ctx, s, players, time) {
    this._drawPlaygroundFloor(ctx, '#FEF9C3', '#FEF08A');

    // Boost pads
    for (const pad of s.boostPads || []) {
      ctx.save();
      ctx.translate(pad.x, pad.y);
      ctx.fillStyle = '#38BDF8';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, pad.r, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#FFD166';
      ctx.font = '700 22px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚡', 0, 1 + Math.sin(time * 8) * 2);
      ctx.restore();
    }

    // Toy bumpers
    for (const b of s.bumpers || []) {
      ctx.save();
      ctx.fillStyle = 'rgba(30,27,75,0.18)';
      ctx.beginPath();
      ctx.arc(b.x, b.y + 6, b.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FF5E7E';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();

      ctx.fillStyle = '#FFD166';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 0.55, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }

    // Draw players & bombs
    for (const p of players) {
      if (!p.alive) continue;
      const bomb = (s.bombs || []).find((b) => b.holderId === p.id);
      if (bomb) {
        // Danger ring
        ctx.save();
        ctx.strokeStyle = bomb.timer < 3 ? '#EF4444' : '#F97316';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(p.rx, p.ry, 36 + Math.sin(time * 22) * 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      drawCartoonBean(ctx, {
        x: p.rx, y: p.ry, r: 22, color: p.color, hat: p.hat,
        facing: p.facing, speed: Math.hypot(p.vx, p.vy), time,
        name: p.name, isMe: p.id === this.myId,
        turbo: p.boost, holdingBomb: !!bomb, mood: bomb ? 'panic' : 'happy',
      });
      if (bomb) {
        drawCartoonBomb(ctx, p.rx, p.ry - 38, 17, bomb.timer < 3.2, time, Math.ceil(bomb.timer));
      }
    }
  }

  _drawSumo(ctx, s, players, time) {
    // Full-bleed ocean is already drawn edge-to-edge in _drawFullBleedBackdrop!
    const cx = W / 2;
    const cy = H / 2;
    const R = s.islandRadius || 260;

    // 3D extruded floating island base
    ctx.fillStyle = '#B45309';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy + 20, R, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Danger outer ring
    ctx.fillStyle = '#FB7185';
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Inner sandy/sunny arena
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(20, R - 18), 0, Math.PI * 2);
    ctx.fill();

    // Sumo ring markings
    ctx.strokeStyle = 'rgba(180, 83, 9, 0.25)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.55, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 40, cy); ctx.lineTo(cx + 40, cy);
    ctx.moveTo(cx, cy - 40); ctx.lineTo(cx, cy + 40);
    ctx.stroke();

    // Power-ups
    for (const pu of s.powerups || []) {
      const meta = POWERUP_META[pu.type] || POWERUP_META.turbo;
      const bob = Math.sin(time * 5 + pu.x) * 4;
      ctx.save();
      ctx.fillStyle = meta.bg;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(pu.x, pu.y + bob, 19, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(meta.icon, pu.x, pu.y + bob + 1);
      ctx.restore();
    }

    // Falling eliminated players first (behind island!)
    for (const p of players) {
      if (p.alive || p.falling >= 1) continue;
      const sc = Math.max(0.15, 1 - p.falling * 0.85);
      drawCartoonBean(ctx, {
        x: p.rx, y: p.ry + p.falling * 65, r: 22, color: p.color, hat: p.hat,
        facing: p.facing + p.falling * 8, speed: 0, time, scale: sc, mood: 'panic',
      });
    }

    // Alive sumo fighters
    for (const p of players) {
      if (!p.alive) continue;
      const nearEdge = Math.hypot(p.rx - cx, p.ry - cy) > R - 45;
      drawCartoonBean(ctx, {
        x: p.rx, y: p.ry, r: 22, color: p.color, hat: p.hat,
        facing: p.facing, speed: Math.hypot(p.vx, p.vy), time,
        name: p.name, isMe: p.id === this.myId,
        scale: p.mega ? 1.42 : 1, shield: p.shield, turbo: p.turbo,
        mood: nearEdge ? 'panic' : 'happy',
      });
    }
  }

  _drawTurf(ctx, s, players, time) {
    const mx = s.marginX || 36;
    const my = s.marginY || 44;
    const cols = s.cols || 32;
    const rows = s.rows || 15;
    const cw = (W - mx * 2) / cols;
    const ch = (H - my * 2) / rows;

    // Board frame
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5;
    roundRectPath(ctx, mx - 8, my - 8, W - mx * 2 + 16, H - my * 2 + 16, 18);
    ctx.fill(); ctx.stroke();

    const colorMap = [null];
    for (const p of s.players || []) colorMap[p.pIndex] = p.color;

    const grid = s.grid || [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const owner = grid[r * cols + c] || 0;
        const x = mx + c * cw;
        const y = my + r * ch;
        ctx.fillStyle = owner > 0 && colorMap[owner] ? colorMap[owner] : ((r + c) % 2 === 0 ? '#F8FAFC' : '#F1F5F9');
        roundRectPath(ctx, x + 1.5, y + 1.5, cw - 3, ch - 3, 5);
        ctx.fill();
        if (owner > 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.22)';
          ctx.fillRect(x + 4, y + 3, cw - 12, 4);
        }
      }
    }

    // Live color race bar at top
    const total = Math.max(1, players.reduce((a, p) => a + (p.tiles || 0), 0));
    let barX = mx;
    const barW = W - mx * 2;
    ctx.save();
    roundRectPath(ctx, mx, 12, barW, 20, 10);
    ctx.clip();
    ctx.fillStyle = '#CBD5E1';
    ctx.fillRect(mx, 12, barW, 20);
    for (const p of players) {
      const pw = ((p.tiles || 0) / Math.max(total, 1)) * barW;
      ctx.fillStyle = p.color;
      ctx.fillRect(barX, 12, pw, 20);
      barX += pw;
    }
    ctx.restore();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    roundRectPath(ctx, mx, 12, barW, 20, 10);
    ctx.stroke();

    // Paint bombs
    for (const pb of s.paintBombs || []) {
      const sc = 1 + Math.sin(time * 7 + pb.x) * 0.1;
      ctx.save();
      ctx.translate(pb.x, pb.y);
      ctx.scale(sc, sc);
      ctx.fillStyle = '#FACC15';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🎨', 0, 1);
      ctx.restore();
    }

    for (const p of players) {
      drawCartoonBean(ctx, {
        x: p.rx, y: p.ry, r: 21, color: p.color, hat: p.hat,
        facing: p.facing, speed: Math.hypot(p.vx, p.vy), time,
        name: `${p.name} (${p.tiles})`, isMe: p.id === this.myId,
        stunned: p.stunned,
      });
    }
  }

  _drawChaos(ctx, s, players, time) {
    if (s.stage === 1) {
      this._drawPlaygroundFloor(ctx, '#DCFCE7', '#BBF7D0');
      // Mud puddles
      for (const m of s.mudPuddles || []) {
        ctx.fillStyle = 'rgba(146, 64, 14, 0.42)';
        ctx.strokeStyle = '#78350F';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      // Red danger scanner tint when RED
      if (s.lightState === 'red') {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.16)';
        ctx.fillRect(28, 28, W - 56, H - 56);
      }
      // Finish line checker
      const fx = W - 115;
      for (let y = 28; y < H - 28; y += 26) {
        ctx.fillStyle = Math.floor(y / 26) % 2 === 0 ? INK : '#FFFFFF';
        ctx.fillRect(fx, y, 22, 26);
      }
      // Traffic Light Mascot
      const lightColor = s.lightState === 'green' ? '#22C55E' : s.lightState === 'yellow' ? '#FACC15' : '#EF4444';
      ctx.fillStyle = INK;
      roundRectPath(ctx, W / 2 - 110, 38, 220, 54, 27);
      ctx.fill();
      ctx.fillStyle = lightColor;
      ctx.beginPath(); ctx.arc(W / 2 - 70, 65, 17, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '700 22px Fredoka, sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(s.lightState === 'green' ? 'LARI KE KANAN!' : s.lightState === 'yellow' ? 'SIAP REM!' : 'DIAM TOTAL!!', W / 2 - 44, 66);
    } else if (s.stage === 2) {
      this._drawPlaygroundFloor(ctx, '#F3E8FF', '#E9D5FF');
      // Center rotating disco laser bar!
      const cx = W / 2; const cy = H / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(s.spinnerAngle || 0);
      if (s.spinnerActive) {
        ctx.fillStyle = 'rgba(244, 63, 94, 0.35)';
        ctx.fillRect(-430, -18, 860, 36);
        ctx.fillStyle = '#F43F5E';
        ctx.fillRect(-430, -9, 860, 18);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-430, -3, 860, 6);
      } else {
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.5)';
        ctx.setLineDash([10, 8]); ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(-430, 0); ctx.lineTo(430, 0); ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = '#1E1B4B'; ctx.strokeStyle = '#FACC15'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(cx, cy, 24, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

      for (const l of s.lasers || []) {
        ctx.save();
        if (!l.active) {
          ctx.strokeStyle = 'rgba(244, 63, 94, 0.55)';
          ctx.lineWidth = 4;
          ctx.setLineDash([12, 10]);
          ctx.beginPath();
          if (l.horizontal) { ctx.moveTo(28, l.pos); ctx.lineTo(W - 28, l.pos); }
          else { ctx.moveTo(l.pos, 28); ctx.lineTo(l.pos, H - 28); }
          ctx.stroke();
        } else {
          ctx.fillStyle = 'rgba(244, 63, 94, 0.35)';
          if (l.horizontal) ctx.fillRect(28, l.pos - l.width * 0.8, W - 56, l.width * 1.6);
          else ctx.fillRect(l.pos - l.width * 0.8, 28, l.width * 1.6, H - 56);
          ctx.fillStyle = '#F43F5E';
          if (l.horizontal) ctx.fillRect(28, l.pos - l.width * 0.42, W - 56, l.width * 0.84);
          else ctx.fillRect(l.pos - l.width * 0.42, 28, l.width * 0.84, H - 56);
          ctx.fillStyle = '#FFFFFF';
          if (l.horizontal) ctx.fillRect(28, l.pos - 4, W - 56, 8);
          else ctx.fillRect(l.pos - 4, 28, 8, H - 56);
        }
        ctx.restore();
      }
    } else {
      // Stage 3: Falling Color Tiles floating over full-bleed sky
      const padX = 72;
      const padY = 78;
      const cols = s.tileCols || 8;
      const rows = s.tileRows || 4;
      const cw = (W - padX * 2) / cols;
      const ch = (H - padY * 2) / rows;
      const safeId = s.safeColor?.id ?? 0;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cid = (s.tileGrid || [])[r * cols + c] ?? 0;
          if (s.tilePhase === 'drop' && cid !== safeId) continue;
          const x = padX + c * cw;
          const y = padY + r * ch;
          const wobble = s.tilePhase === 'announce' && s.tileTimer < 0.9 && cid !== safeId ? (Math.random() - 0.5) * 5 : 0;
          ctx.fillStyle = TILE_PALETTE[cid];
          ctx.strokeStyle = INK;
          ctx.lineWidth = 4;
          roundRectPath(ctx, x + 5 + wobble, y + 5, cw - 10, ch - 10, 14);
          ctx.fill(); ctx.stroke();
          ctx.font = '32px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(TILE_ICONS[cid], x + cw / 2 + wobble, y + ch / 2 + 2);
        }
      }

      if (s.safeColor) {
        ctx.fillStyle = s.safeColor.hex;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 4;
        roundRectPath(ctx, W / 2 - 190, 14, 380, 50, 25);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = INK;
        ctx.font = '700 22px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${s.safeColor.icon} AMAN: ${s.safeColor.name} (${s.tileTimer}s)`, W / 2, 40);
      }
    }

    for (const p of players) {
      if (!p.alive) continue;
      drawCartoonBean(ctx, {
        x: p.rx, y: p.ry, r: 21, color: p.color, hat: p.hat,
        facing: p.facing, speed: Math.hypot(p.vx, p.vy), time,
        name: p.name, isMe: p.id === this.myId,
        mood: s.stage === 1 && s.lightState === 'red' ? 'panic' : 'happy',
      });
    }
  }

  _drawCrownChase(ctx, s, players, time) {
    this._drawPlaygroundFloor(ctx, '#FEF3C7', '#FDE68A');
    if (s.crown && !s.crown.holderId) {
      ctx.font = '44px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('👑', s.crown.x, s.crown.y + Math.sin(time * 6) * 6);
    }
    for (const p of players) {
      if (p.hasCrown) {
        ctx.strokeStyle = '#FACC15'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(p.rx, p.ry, 34 + Math.sin(time * 10) * 4, 0, Math.PI * 2); ctx.stroke();
      }
      drawCartoonBean(ctx, {
        x: p.rx, y: p.ry, r: 22, color: p.color, hat: p.hasCrown ? 'crown' : p.hat,
        facing: p.facing, speed: Math.hypot(p.vx, p.vy), time,
        name: `${p.name} (${p.score})`, isMe: p.id === this.myId,
      });
    }
  }

  _drawCoinRush(ctx, s, players, time) {
    this._drawPlaygroundFloor(ctx, '#ECFCCB', '#D9F99D');
    for (const it of s.items || []) {
      const bob = Math.sin(time * 6 + it.x) * 3;
      ctx.font = it.type === 'gem' ? '30px sans-serif' : '26px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(it.type === 'gem' ? '💎' : it.type === 'bomb' ? '💣' : '🪙', it.x, it.y + bob);
    }
    for (const p of players) {
      drawCartoonBean(ctx, {
        x: p.rx, y: p.ry, r: 22, color: p.color, hat: p.hat,
        facing: p.facing, speed: Math.hypot(p.vx, p.vy), time,
        name: `${p.name} 💰${p.score}`, isMe: p.id === this.myId, stunned: p.stunned,
      });
    }
  }

  _drawZombieTag(ctx, s, players, time) {
    this._drawPlaygroundFloor(ctx, '#E2E8F0', '#CBD5E1');
    for (const p of players) {
      if (p.zombie) {
        ctx.strokeStyle = '#22C55E'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(p.rx, p.ry, 32 + Math.sin(time * 12) * 3, 0, Math.PI * 2); ctx.stroke();
      }
      drawCartoonBean(ctx, {
        x: p.rx, y: p.ry, r: 22, color: p.color, hat: p.hat,
        facing: p.facing, speed: Math.hypot(p.vx, p.vy), time,
        name: `${p.zombie ? '🧟 ' : ''}${p.name}`, isMe: p.id === this.myId, mood: p.zombie ? 'panic' : 'happy',
      });
    }
  }

  _drawSoccer(ctx, s, players, time) {
    this._drawPlaygroundFloor(ctx, '#4ADE80', '#22C55E');
    // Field lines & Goals
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(W / 2, 28); ctx.lineTo(W / 2, H - 28); ctx.stroke();
    ctx.beginPath(); ctx.arc(W / 2, H / 2, 85, 0, Math.PI * 2); ctx.stroke();
    // Left Goal (Red defends) & Right Goal (Blue defends)
    ctx.fillStyle = 'rgba(255, 94, 126, 0.35)'; ctx.strokeStyle = '#FF5E7E'; ctx.lineWidth = 5;
    ctx.fillRect(16, H / 2 - 98, 28, 196); ctx.strokeRect(16, H / 2 - 98, 28, 196);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.35)'; ctx.strokeStyle = '#38BDF8';
    ctx.fillRect(W - 44, H / 2 - 98, 28, 196); ctx.strokeRect(W - 44, H / 2 - 98, 28, 196);

    if (s.ball) {
      ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = INK; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(s.ball.x, s.ball.y, s.ball.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.font = '34px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('⚽', s.ball.x, s.ball.y + 1);
    }
    for (const p of players) {
      drawCartoonBean(ctx, {
        x: p.rx, y: p.ry, r: 22, color: p.color, hat: p.hat,
        facing: p.facing, speed: Math.hypot(p.vx, p.vy), time, name: p.name, isMe: p.id === this.myId,
      });
    }
  }

  _drawMeteors(ctx, s, players, time) {
    this._drawPlaygroundFloor(ctx, '#FFEDD5', '#FED7AA');
    for (const c of s.craters || []) {
      ctx.fillStyle = 'rgba(234, 88, 12, 0.45)'; ctx.strokeStyle = '#9A3412'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    for (const m of s.meteors || []) {
      ctx.fillStyle = `rgba(239, 68, 68, ${0.15 + m.prog * 0.35})`;
      ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // Falling rock shadow shrinking toward impact
      const dropY = m.y - (1 - m.prog) * 260;
      ctx.fillStyle = '#7C2D12'; ctx.strokeStyle = INK; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(m.x, dropY, m.r * 0.55, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#F97316';
      ctx.beginPath(); ctx.arc(m.x - 8, dropY - 8, m.r * 0.25, 0, Math.PI * 2); ctx.fill();
    }
    for (const p of players) {
      if (!p.alive) continue;
      drawCartoonBean(ctx, {
        x: p.rx, y: p.ry, r: 21, color: p.color, hat: p.hat,
        facing: p.facing, speed: Math.hypot(p.vx, p.vy), time, name: p.name, isMe: p.id === this.myId,
      });
    }
  }

  _drawSnake(ctx, s, players, time) {
    this._drawPlaygroundFloor(ctx, '#ECFDF5', '#D1FAE5');
    for (const f of s.fruits || []) {
      ctx.font = '24px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🍎', f.x, f.y + Math.sin(time * 5 + f.x) * 3);
    }
    for (const p of players) {
      if (!p.alive) continue;
      const tr = p.trail || [];
      for (let i = 0; i < tr.length; i++) {
        const [tx, ty] = tr[i];
        const rr = 10 + (i / Math.max(tr.length, 1)) * 9;
        ctx.fillStyle = p.color; ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(tx, ty, rr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      drawCartoonBean(ctx, {
        x: p.rx, y: p.ry, r: 21, color: p.color, hat: p.hat,
        facing: p.facing, speed: Math.hypot(p.vx, p.vy), time, name: p.name, isMe: p.id === this.myId,
      });
    }
  }

  _drawGhostFreeze(ctx, s, players, time) {
    this._drawPlaygroundFloor(ctx, '#E0F2FE', '#BAE6FD');
    for (const p of players) {
      drawCartoonBean(ctx, {
        x: p.rx, y: p.ry, r: 22, color: p.color, hat: p.hat,
        facing: p.facing, speed: p.frozen ? 0 : Math.hypot(p.vx, p.vy), time,
        name: `${p.ghost ? '👻 ' : p.frozen ? '🧊 ' : ''}${p.name}`, isMe: p.id === this.myId,
        mood: p.frozen ? 'panic' : 'happy',
      });
      if (p.frozen) {
        ctx.fillStyle = 'rgba(186, 230, 253, 0.58)'; ctx.strokeStyle = '#0284C7'; ctx.lineWidth = 3.5;
        roundRectPath(ctx, p.rx - 28, p.ry - 28, 56, 56, 12);
        ctx.fill(); ctx.stroke();
      }
    }
  }

  _drawKingHill(ctx, s, players, time) {
    this._drawPlaygroundFloor(ctx, '#FCE7F3', '#FBCFE8');
    if (s.zone) {
      ctx.fillStyle = 'rgba(250, 204, 21, 0.35)';
      ctx.strokeStyle = '#EAB308'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(s.zone.x, s.zone.y, s.zone.r + Math.sin(time * 5) * 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.font = '700 18px Fredoka, sans-serif'; ctx.fillStyle = '#92400E'; ctx.textAlign = 'center';
      ctx.fillText('👑 ZONA RAJA', s.zone.x, s.zone.y - s.zone.r + 24);
    }
    for (const p of players) {
      drawCartoonBean(ctx, {
        x: p.rx, y: p.ry, r: 22, color: p.color, hat: p.hat,
        facing: p.facing, speed: Math.hypot(p.vx, p.vy), time,
        name: `${p.name} (${p.score})`, isMe: p.id === this.myId,
      });
    }
  }

  _drawSharkEscape(ctx, s, players, time) {
    // Ocean waves drawn full-bleed! Draw floating stars & sharks!
    for (const st of s.stars || []) {
      ctx.font = '28px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('⭐', st.x, st.y + Math.sin(time * 5 + st.x) * 4);
    }
    for (const sh of s.sharks || []) {
      ctx.save();
      ctx.translate(sh.x, sh.y);
      ctx.rotate(sh.angle);
      // Cartoon shark silhouette + fin
      ctx.fillStyle = '#475569'; ctx.strokeStyle = INK; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.ellipse(0, 0, 34, 18, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(-46, -16); ctx.lineTo(-46, 16); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(16, -6, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#EF4444';
      ctx.beginPath(); ctx.arc(17, -6, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    for (const p of players) {
      if (!p.alive) continue;
      // Cute inflatable swim ring!
      ctx.strokeStyle = '#FACC15'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.arc(p.rx, p.ry + 6, 24, 0, Math.PI * 2); ctx.stroke();
      drawCartoonBean(ctx, {
        x: p.rx, y: p.ry, r: 20, color: p.color, hat: p.hat,
        facing: p.facing, speed: Math.hypot(p.vx, p.vy), time, name: p.name, isMe: p.id === this.myId,
      });
    }
  }

  _drawDodgeball(ctx, s, players, time) {
    this._drawPlaygroundFloor(ctx, '#FEF2F2', '#FEE2E2');
    for (const b of s.balls || []) {
      ctx.fillStyle = b.live ? '#EF4444' : '#F97316';
      ctx.strokeStyle = INK; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(b.x, b.y, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (b.live) {
        ctx.strokeStyle = '#FACC15'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(b.x, b.y, 22, 0, Math.PI * 2); ctx.stroke();
      }
    }
    for (const p of players) {
      if (!p.alive) continue;
      drawCartoonBean(ctx, {
        x: p.rx, y: p.ry, r: 22, color: p.color, hat: p.hat,
        facing: p.facing, speed: Math.hypot(p.vx, p.vy), time,
        name: `${p.hasBall ? '🏐 ' : ''}${p.name}`, isMe: p.id === this.myId,
      });
    }
  }

  _drawTurboRace(ctx, s, players, time) {
    this._drawPlaygroundFloor(ctx, '#FEF9C3', '#FEF08A');
    // Left & Right checkered turnaround/finish zones
    for (const fx of [72, W - 95]) {
      for (let y = 28; y < H - 28; y += 26) {
        ctx.fillStyle = Math.floor(y / 26) % 2 === 0 ? INK : '#FFFFFF';
        ctx.fillRect(fx, y, 22, 26);
      }
    }
    for (const m of s.mud || []) {
      ctx.fillStyle = 'rgba(146, 64, 14, 0.45)'; ctx.strokeStyle = '#78350F'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    for (const b of s.boosts || []) {
      ctx.fillStyle = '#38BDF8'; ctx.strokeStyle = INK; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.font = '22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('⚡', b.x, b.y + 1);
    }
    // Rotating center candy bumper bar
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(s.barAngle || 0);
    ctx.fillStyle = '#FF5E7E'; ctx.strokeStyle = INK; ctx.lineWidth = 4;
    roundRectPath(ctx, -175, -14, 350, 28, 14); ctx.fill(); ctx.stroke();
    ctx.restore();
    for (const p of players) {
      drawCartoonBean(ctx, {
        x: p.rx, y: p.ry, r: 21, color: p.color, hat: p.hat,
        facing: p.facing, speed: Math.hypot(p.vx, p.vy), time,
        name: `${p.name} (L${p.lap})`, isMe: p.id === this.myId, turbo: p.boost,
      });
    }
  }

  _drawDashBlade(ctx, s, players, time) {
    this._drawPlaygroundFloor(ctx, '#FEF2F2', '#FEE2E2');
    // Orbs
    for (const o of s.orbs || []) {
      const bob = Math.sin(time * 6 + o.x) * 4;
      ctx.fillStyle = o.type === 'heal' ? '#86EFAC' : '#FACC15';
      ctx.strokeStyle = INK; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(o.x, o.y + bob, 20, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.font = '20px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(o.type === 'heal' ? '❤️' : '⚔️', o.x, o.y + bob + 1);
    }

    for (const p of players) {
      if (!p.alive) continue;
      // Glowing energy slash arc when dashing!
      ctx.save();
      ctx.translate(p.rx, p.ry);
      ctx.rotate(p.facing);
      if (p.slashing) {
        ctx.strokeStyle = p.fury ? '#FACC15' : '#FF5E7E';
        ctx.lineWidth = 10; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(8, 0, 38, -0.85, 0.85); ctx.stroke();
        ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(8, 0, 38, -0.7, 0.7); ctx.stroke();
      } else {
        // Cartoon sword held at side
        ctx.fillStyle = p.fury ? '#FACC15' : '#E2E8F0';
        ctx.strokeStyle = INK; ctx.lineWidth = 2.8;
        roundRectPath(ctx, 16, -4, 24, 8, 4); ctx.fill(); ctx.stroke();
      }
      ctx.restore();

      ctx.save();
      if (p.invuln && Math.sin(time * 35) > 0) ctx.globalAlpha = 0.5;
      drawCartoonBean(ctx, {
        x: p.rx, y: p.ry, r: 22, color: p.color, hat: p.hat,
        facing: p.facing, speed: Math.hypot(p.vx, p.vy), time,
        name: p.name, isMe: p.id === this.myId, turbo: p.fury,
      });
      ctx.restore();
      ctx.font = '13px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('❤️'.repeat(Math.max(0, p.hp)) + '🖤'.repeat(Math.max(0, 3 - p.hp)), p.rx, p.ry - 34);
    }
  }

  _drawRicochet(ctx, s, players, time) {
    this._drawPlaygroundFloor(ctx, '#EEF2FF', '#E0E7FF');
    // Cover pillars
    for (const box of s.pillars || []) {
      ctx.fillStyle = 'rgba(30,27,75,0.18)';
      roundRectPath(ctx, box.x, box.y + 8, box.w, box.h, 14); ctx.fill();
      ctx.fillStyle = '#6366F1'; ctx.strokeStyle = INK; ctx.lineWidth = 4;
      roundRectPath(ctx, box.x, box.y, box.w, box.h, 14); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      roundRectPath(ctx, box.x + 8, box.y + 7, box.w - 16, 12, 6); ctx.fill();
    }
    // Bouncy energy shots
    for (const b of s.bullets || []) {
      ctx.fillStyle = b.color || '#EF4444'; ctx.strokeStyle = INK; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(b.x, b.y, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(b.x - 3, b.y - 3, 3.5, 0, Math.PI * 2); ctx.fill();
    }
    for (const p of players) {
      if (!p.alive) continue;
      // Aim directional indicator
      ctx.save();
      ctx.translate(p.rx, p.ry);
      ctx.rotate(p.facing);
      ctx.fillStyle = '#FACC15'; ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(36, 0); ctx.lineTo(25, -7); ctx.lineTo(25, 7); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.restore();

      drawCartoonBean(ctx, {
        x: p.rx, y: p.ry, r: 22, color: p.color, hat: p.hat,
        facing: p.facing, speed: Math.hypot(p.vx, p.vy), time, name: p.name, isMe: p.id === this.myId,
      });
      ctx.font = '13px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('❤️'.repeat(Math.max(0, p.hp)) + '🖤'.repeat(Math.max(0, 3 - p.hp)), p.rx, p.ry - 34);
    }
  }

  _drawMemoryRush(ctx, s, players, time) {
    const padX = 110; const padY = 82;
    const cols = s.cols || 5; const rows = s.rows || 3;
    const cw = (W - padX * 2) / cols;
    const ch = (H - padY * 2) / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const isSafe = s.safeSet ? !!s.safeSet[idx] : false;
        if (s.subPhase === 'boom' && !isSafe) continue;
        const x = padX + c * cw; const y = padY + r * ch;
        let fill = '#A855F7';
        let icon = '❓';
        if (s.subPhase === 'preview') {
          fill = isSafe ? '#FDE047' : '#CBD5E1';
          icon = isSafe ? '⭐' : '💣';
        } else if (s.subPhase === 'boom') {
          fill = '#4ADE80';
          icon = '⭐';
        }
        ctx.fillStyle = fill; ctx.strokeStyle = INK; ctx.lineWidth = 4;
        roundRectPath(ctx, x + 6, y + 6, cw - 12, ch - 12, 16);
        ctx.fill(); ctx.stroke();
        ctx.font = '38px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(icon, x + cw / 2, y + ch / 2 + 2);
      }
    }

    for (const p of players) {
      if (!p.alive) continue;
      drawCartoonBean(ctx, {
        x: p.rx, y: p.ry, r: 21, color: p.color, hat: p.hat,
        facing: p.facing, speed: Math.hypot(p.vx, p.vy), time, name: p.name, isMe: p.id === this.myId,
      });
    }
  }

  _drawTeamBadges(ctx, players, time) {
    for (const p of players) {
      if (p.alive === false) continue;
      const tid = p.team ?? 0;
      const col = TEAM_COLORS[tid] || '#EF4444';
      // Crisp colored team ring under feet
      ctx.save();
      ctx.strokeStyle = col;
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.ellipse(p.rx, p.ry + 18, 25 + Math.sin(time * 5) * 1.5, 11, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Small letter badge on top-right of character
      ctx.fillStyle = col;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(p.rx + 22, p.ry - 20, 10, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 11px Nunito, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(TEAM_LABELS[tid] || 'T', p.rx + 22, p.ry - 19.5);
      ctx.restore();
    }
  }

  _drawBetrayalBridge(ctx, s, players, time) {
    const padX = 110; const padY = 66;
    const cols = s.cols || 6; const rows = s.rows || 4;
    const cw = (W - padX * 2) / cols;
    const ch = (H - padY * 2) / rows;
    const tiles = s.tiles || [];

    // Molten bridge frame border
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.45)';
    ctx.lineWidth = 5;
    roundRectPath(ctx, padX - 8, padY - 8, W - padX * 2 + 16, H - padY * 2 + 16, 20);
    ctx.stroke();

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const st = tiles[idx] ?? 2;
        if (st === 0) continue; // dropped into lava!
        let x = padX + c * cw;
        let y = padY + r * ch;
        if (st === 1) {
          x += Math.sin(time * 42 + idx) * 3.5;
          y += Math.cos(time * 38 + idx) * 2.5;
        }
        // Tile depth shadow
        ctx.fillStyle = 'rgba(30,27,75,0.45)';
        roundRectPath(ctx, x + 5, y + 11, cw - 10, ch - 10, 14);
        ctx.fill();

        const isSafeHighlight = s.cyclePhase !== 'safe' && st === 2;
        ctx.fillStyle = st === 1 ? '#FB923C' : isSafeHighlight ? '#4ADE80' : '#E2E8F0';
        ctx.strokeStyle = INK; ctx.lineWidth = 3.5;
        roundRectPath(ctx, x + 5, y + 5, cw - 10, ch - 10, 14);
        ctx.fill(); ctx.stroke();

        if (st === 1) {
          // Cracking lines
          ctx.strokeStyle = '#991B1B'; ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x + 22, y + 18); ctx.lineTo(x + cw * 0.52, y + ch * 0.5); ctx.lineTo(x + cw - 20, y + ch - 22);
          ctx.moveTo(x + cw * 0.52, y + ch * 0.5); ctx.lineTo(x + 30, y + ch - 20);
          ctx.stroke();
        } else if (isSafeHighlight) {
          ctx.font = '700 14px Fredoka, sans-serif'; ctx.fillStyle = '#14532D';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('AMAN!', x + cw / 2, y + ch / 2);
        }
      }
    }

    // Golden Loot Chests
    for (const chObj of s.chests || []) {
      const bob = Math.sin(time * 6) * 4;
      ctx.fillStyle = '#FACC15'; ctx.strokeStyle = INK; ctx.lineWidth = 3.5;
      roundRectPath(ctx, chObj.x - 22, chObj.y - 18 + bob, 44, 34, 10);
      ctx.fill(); ctx.stroke();
      ctx.font = '22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('👑', chObj.x, chObj.y + bob);
    }

    for (const p of players) {
      if (!p.alive) continue;
      drawCartoonBean(ctx, {
        x: p.rx, y: p.ry, r: 22, color: p.color, hat: p.hat,
        facing: p.facing, speed: Math.hypot(p.vx, p.vy), time,
        name: `${p.name} (${p.score})`, isMe: p.id === this.myId,
        turbo: p.dashing || p.boost,
      });
    }
  }
}
