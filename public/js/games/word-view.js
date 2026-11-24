import { INK, VFXPool, drawCartoonBean, drawCartoonBomb, roundRectPath } from '../renderer.js';
import { sfx } from '../audio.js';

const W = 960;
const H = 520;

export class WordView {
  constructor(sendAction) {
    this.sendAction = sendAction;
    this.canvas = document.getElementById('wordCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.form = document.getElementById('wordBombForm');
    this.input = document.getElementById('wordBombInput');
    this.syllablePill = document.getElementById('wordSyllablePill');

    this.myId = null;
    this.state = null;
    this.running = false;
    this.vfx = new VFXPool();
    this.playerEmotes = new Map();
    this.lastFrame = performance.now();
    this.lastActiveId = null;

    this._bindForm();
  }

  showPlayerEmote(playerId, reaction, cachedImg = null) {
    if (!playerId) return;
    this.playerEmotes.set(playerId, {
      emoji: reaction.emoji || '',
      img: cachedImg,
      createdAt: performance.now(),
      until: performance.now() + 2600,
    });
  }

  _bindForm() {
    this.input.addEventListener('input', () => {
      this.sendAction({ action: 'typing', text: this.input.value });
    });
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      const word = this.input.value.trim();
      if (!word) return;
      this.sendAction({ action: 'submit', word });
      this.input.value = '';
    });
  }

  start(myId) {
    this.myId = myId;
    this.state = null;
    this.lastActiveId = null;
    this.input.value = '';
    this.vfx = new VFXPool();
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
    this.syllablePill.textContent = `${s.syllable || '--'}...`;
    const isMyTurn = s.activePlayerId === this.myId && s.phase === 'playing';
    this.input.disabled = !isMyTurn;
    this.input.placeholder = isMyTurn
      ? `GILIRANMU! Ketik kata BERAWALAN "${s.syllable}" (contoh: ${s.syllable}...)`
      : `Tunggu giliranmu... (Awali kata dengan "${s.syllable}")`;

    if (isMyTurn && this.lastActiveId !== this.myId) {
      this.input.value = '';
      setTimeout(() => this.input.focus(), 40);
    }
    this.lastActiveId = s.activePlayerId;

    for (const ev of events) {
      if (ev.type === 'sfx') sfx.play(ev.sound);
      if (ev.type === 'explode') {
        sfx.play('explode');
        this.vfx.burst(W / 2, H / 2, '#FF5E7E', 30, 280);
        this.vfx.burst(W / 2, H / 2, '#FFD166', 20, 200);
        this.vfx.popup(W / 2, H / 2 - 40, `💥 ${ev.name} KENA BOM!`, '#FF5E7E');
        this.vfx.addShake(12);
      }
    }
  }

  _frame(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    this.vfx.update(dt);
    this._draw(now / 1000);
    requestAnimationFrame((t) => this._frame(t));
  }

  _syncCanvasSize() {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return { vw: W, vh: H };
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

  _draw(time) {
    const ctx = this.ctx;
    const { vw, vh } = this._syncCanvasSize();
    ctx.clearRect(0, 0, vw, vh);
    if (!this.state) return;

    const s = this.state;

    // Edge-to-edge sunny party backdrop
    const bg = ctx.createRadialGradient(vw / 2, vh / 2, 40, vw / 2, vh / 2, Math.max(vw, vh) * 0.72);
    bg.addColorStop(0, '#FEF9C3');
    bg.addColorStop(1, '#7DD3FC');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, vw, vh);

    const topReserve = 42;
    const scale = Math.min((vw - 16) / W, Math.max(120, vh - topReserve) / H);
    const offX = (vw - W * scale) / 2;
    const offY = topReserve + (vh - topReserve - H * scale) / 2;

    const cx = W / 2;
    const cy = H / 2 + 12;

    ctx.save();
    ctx.translate(offX, offY);
    ctx.scale(scale, scale);
    if (this.vfx.shake > 0.2) {
      ctx.translate((Math.random() - 0.5) * this.vfx.shake, (Math.random() - 0.5) * this.vfx.shake);
    }

    // Table circle
    ctx.fillStyle = '#FFFDF7';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 240, 155, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Players seated in oval around table
    const players = s.players || [];
    const n = Math.max(players.length, 1);
    let activeAngle = -Math.PI / 2;

    players.forEach((p, i) => {
      const ang = (i / n) * Math.PI * 2 - Math.PI / 2;
      const px = cx + Math.cos(ang) * 320;
      const py = cy + Math.sin(ang) * 182;
      const isActive = p.id === s.activePlayerId;
      if (isActive) activeAngle = ang;

      ctx.save();
      if (!p.alive) ctx.globalAlpha = 0.38;
      drawCartoonBean(ctx, {
        x: px, y: py, r: isActive ? 27 : 22, color: p.color, hat: p.hat,
        facing: ang + Math.PI, speed: isActive ? 80 : 0, time,
        name: p.name, isMe: p.id === this.myId,
        mood: isActive && s.bombTimer < 3.5 ? 'panic' : 'happy',
      });

      // Hearts above avatar
      ctx.font = '15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('❤️'.repeat(Math.max(0, p.hearts)) + '🖤'.repeat(Math.max(0, 3 - p.hearts)), px, py - 38);

      // Live typing speech bubble
      if (isActive && p.typing) {
        ctx.font = '700 18px Fredoka, sans-serif';
        const tw = Math.max(84, ctx.measureText(p.typing).width + 26);
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 3;
        roundRectPath(ctx, px - tw / 2, py - 74, tw, 30, 15);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = INK;
        ctx.textBaseline = 'middle';
        ctx.fillText(p.typing, px, py - 59);
      }

      // Custom/standard emote bubble next to player
      const em = this.playerEmotes.get(p.id);
      if (em) {
        const now = performance.now();
        if (now > em.until) {
          this.playerEmotes.delete(p.id);
        } else {
          const ex = px + (px < cx ? -52 : 52);
          const ey = py - 24;
          ctx.fillStyle = '#FFFFFF';
          ctx.strokeStyle = INK;
          ctx.lineWidth = 3;
          roundRectPath(ctx, ex - 25, ey - 25, 50, 50, 13);
          ctx.fill(); ctx.stroke();
          if (em.img && em.img.complete && em.img.naturalWidth > 0) {
            ctx.save();
            roundRectPath(ctx, ex - 21, ey - 21, 42, 42, 9);
            ctx.clip();
            ctx.drawImage(em.img, ex - 21, ey - 21, 42, 42);
            ctx.restore();
          } else if (em.emoji) {
            ctx.font = '24px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(em.emoji, ex, ey + 1);
          }
        }
      }
      ctx.restore();
    });

    // Pointer arrow from center bomb toward active player
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(activeAngle);
    ctx.fillStyle = '#FF5E7E';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(118, 0);
    ctx.lineTo(80, -18);
    ctx.lineTo(80, 18);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();

    // Giant Center Cartoon Bomb with Syllable!
    drawCartoonBomb(ctx, cx, cy, 52, s.bombTimer < 3.5, time, s.syllable);

    // Timer progress arc around bomb
    const pct = Math.max(0, Math.min(1, s.bombTimer / Math.max(s.maxBombTimer, 1)));
    ctx.strokeStyle = pct < 0.35 ? '#EF4444' : '#22C55E';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, 68, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
    ctx.stroke();

    // Chain rule banner at top: e.g. "DALAM ➔ Awali dengan [LAM]..."
    const chainText = s.lastWord
      ? `🔗 ${s.lastWord}  ➔  AWALI DENGAN "${s.syllable}..."`
      : `🔤 SAMBUNG KATA: AWALI DENGAN "${s.syllable}..."`;
    ctx.font = '700 17px Fredoka, sans-serif';
    const cw = ctx.measureText(chainText).width + 36;
    ctx.fillStyle = '#FEF08A';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    roundRectPath(ctx, cx - cw / 2, 8, cw, 34, 17);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(chainText, cx, 25);

    // Last word feedback pill below bomb
    if (s.lastResult) {
      const msg = s.lastResult.ok
        ? `✅ ${s.lastResult.word} (+${s.lastResult.bonus})`
        : `❌ ${s.lastResult.reason || s.lastResult.word}`;
      ctx.font = '700 15px Fredoka, sans-serif';
      const tw = ctx.measureText(msg).width + 28;
      ctx.fillStyle = s.lastResult.ok ? '#86EFAC' : '#FECACA';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.5;
      roundRectPath(ctx, cx - tw / 2, cy + 84, tw, 30, 15);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = INK;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(msg, cx, cy + 99);
    }

    this.vfx.draw(ctx);
    ctx.restore();
  }
}
