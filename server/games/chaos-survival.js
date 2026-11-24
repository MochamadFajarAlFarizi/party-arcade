import { ARENA_W, ARENA_H, PLAYER_RADIUS, BaseGame, clamp, dist, randRange } from './base-game.js';

const TILE_COLS = 8;
const TILE_ROWS = 4;
const TILE_COLORS = [
  { id: 0, name: 'MERAH', icon: '❤️', hex: '#FF5E7E' },
  { id: 1, name: 'KUNING', icon: '⭐', hex: '#FFD166' },
  { id: 2, name: 'HIJAU', icon: '🍀', hex: '#22C55E' },
  { id: 3, name: 'BIRU', icon: '💎', hex: '#38BDF8' },
];

const MUD_PUDDLES = [
  { x: 410, y: 185, r: 58 },
  { x: 640, y: 390, r: 64 },
  { x: 870, y: 215, r: 58 },
  { x: 930, y: 450, r: 52 },
];

export class ChaosSurvivalGame extends BaseGame {
  constructor(room, players) {
    super(room, 'chaos-survival');
    this.entities = players.map((p, i) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      hat: p.hat,
      isBot: !!p.isBot,
      x: 110,
      y: 110 + (i / Math.max(players.length - 1, 1)) * (ARENA_H - 220),
      vx: 0,
      vy: 0,
      facing: 0,
      alive: true,
      finishedPhase: false,
      score: 0,
      dashCd: 0,
      dashTimer: 0,
      inputX: 0,
      inputY: 0,
      wantAction: false,
      aiSeed: Math.random() * 100,
    }));

    this.stage = 1;
    this.stageTimer = 20;
    this.intermission = 0;

    // Stage 1: Red Light Green Light Extreme
    this.lightState = 'green';
    this.lightTimer = 2.0;
    this.finishOrder = [];

    // Stage 2: Laser Disco + Rotating Spinner + Danger Blasts
    this.lasers = [];
    this.laserSpawnTimer = 0.6;
    this.spinnerAngle = 0;
    this.spinnerSpeed = 0.85;

    // Stage 3: Shrinking Safe Tiles
    this.tileGrid = [];
    this.safeColorId = 0;
    this.tilePhase = 'announce';
    this.tileWave = 0;
    this.tileTimer = 2.8;
  }

  onStart() {
    this._setupStage(1);
  }

  _setupStage(stageNum) {
    this.stage = stageNum;
    this.intermission = 1.6;
    const n = this.entities.length;

    if (stageNum === 1) {
      this.stageTimer = 19;
      this.lightState = 'green';
      this.lightTimer = 1.9;
      this.finishOrder = [];
      this.entities.forEach((e, i) => {
        e.alive = true;
        e.finishedPhase = false;
        e.x = 95;
        e.y = n === 1 ? ARENA_H / 2 : 95 + (i / (n - 1)) * (ARENA_H - 190);
        e.vx = 0;
        e.vy = 0;
        e.facing = 0;
      });
      this.emitEvent('banner', { text: '🚦 RONDE 1/3: LARI KE FINIS! DIAM SAAT MERAH!' });
    } else if (stageNum === 2) {
      this.stageTimer = 19;
      this.lasers = [];
      this.laserSpawnTimer = 0.5;
      this.spinnerAngle = 0;
      this.spinnerSpeed = 0.72;
      this.entities.forEach((e, i) => {
        const ang = (i / Math.max(n, 1)) * Math.PI * 2;
        e.alive = true;
        e.finishedPhase = false;
        e.x = ARENA_W / 2 + Math.cos(ang) * 240;
        e.y = ARENA_H / 2 + Math.sin(ang) * 165;
        e.vx = 0;
        e.vy = 0;
      });
      this.emitEvent('banner', { text: '🔫 RONDE 2/3: HINDARI LASER PUTAR & GARIS!' });
    } else if (stageNum === 3) {
      this.stageTimer = 22;
      this.tileWave = 1;
      this.entities.forEach((e, i) => {
        const ang = (i / Math.max(n, 1)) * Math.PI * 2;
        e.alive = true;
        e.finishedPhase = false;
        e.x = ARENA_W / 2 + Math.cos(ang) * 180;
        e.y = ARENA_H / 2 + Math.sin(ang) * 120;
        e.vx = 0;
        e.vy = 0;
      });
      this._initTileWave();
      this.emitEvent('banner', { text: '🟦 RONDE 3/3: REBUTAN UBIN AMAN SEBELUM RUNTUH!' });
    }
  }

  _initTileWave() {
    this.safeColorId = Math.floor(Math.random() * TILE_COLORS.length);
    const otherColors = TILE_COLORS.filter((c) => c.id !== this.safeColorId).map((c) => c.id);
    const total = TILE_COLS * TILE_ROWS;
    this.tileGrid = Array.from({ length: total }, () => otherColors[Math.floor(Math.random() * otherColors.length)]);
    // Escalating chaos: Wave 1 = 6 safe tiles, Wave 2 = 4 safe tiles, Wave 3 = only 2 safe tiles!
    const safeCount = Math.max(2, 8 - this.tileWave * 2);
    const indices = Array.from({ length: total }, (_, i) => i).sort(() => Math.random() - 0.5);
    for (let k = 0; k < safeCount; k++) {
      this.tileGrid[indices[k]] = this.safeColorId;
    }
    this.tilePhase = 'announce';
    this.tileTimer = Math.max(1.8, 3.0 - this.tileWave * 0.45);
    const col = TILE_COLORS[this.safeColorId];
    this.emitEvent('banner', { text: `${col.icon} WAVE ${this.tileWave}: INJAK ${col.name}! (${safeCount} ubin)` });
    this.emitEvent('sfx', { sound: 'tick' });
  }

  _movePlayer(p, dt, speed = 280) {
    p.dashCd = Math.max(0, p.dashCd - dt);
    p.dashTimer = Math.max(0, p.dashTimer - dt);
    if (p.wantAction && p.dashCd <= 0) {
      p.wantAction = false;
      p.dashCd = 1.9;
      p.dashTimer = 0.2;
      const dx = Math.hypot(p.inputX, p.inputY) > 0.1 ? p.inputX : Math.cos(p.facing);
      const dy = Math.hypot(p.inputX, p.inputY) > 0.1 ? p.inputY : Math.sin(p.facing);
      p.vx = dx * 560;
      p.vy = dy * 560;
      this.emitEvent('dash', { x: p.x, y: p.y, color: p.color });
    } else {
      p.wantAction = false;
    }
    if (p.dashTimer <= 0) {
      p.vx += (p.inputX * speed - p.vx) * Math.min(1, dt * 14);
      p.vy += (p.inputY * speed - p.vy) * Math.min(1, dt * 14);
    }
    if (Math.hypot(p.vx, p.vy) > 12) p.facing = Math.atan2(p.vy, p.vx);
    p.x = clamp(p.x + p.vx * dt, 52, ARENA_W - 52);
    p.y = clamp(p.y + p.vy * dt, 52, ARENA_H - 52);
  }

  update(dt) {
    if (this.intermission > 0) {
      this.intermission -= dt;
      return;
    }
    this.stageTimer -= dt;
    if (this.stage === 1) this._updateStage1(dt);
    else if (this.stage === 2) this._updateStage2(dt);
    else if (this.stage === 3) this._updateStage3(dt);
  }

  _updateStage1(dt) {
    this.lightTimer -= dt;
    if (this.lightTimer <= 0) {
      if (this.lightState === 'green') {
        this.lightState = 'yellow';
        this.lightTimer = 0.45;
        this.emitEvent('sfx', { sound: 'tick' });
      } else if (this.lightState === 'yellow') {
        this.lightState = 'red';
        this.lightTimer = randRange(1.3, 2.2);
        this.emitEvent('sfx', { sound: 'wrong' });
      } else {
        this.lightState = 'green';
        this.lightTimer = randRange(1.2, 2.3);
        this.emitEvent('sfx', { sound: 'go' });
      }
    }

    for (const p of this.entities) {
      if (p.finishedPhase) continue;
      if (p.isBot) {
        if (this.lightState === 'green') {
          p.inputX = 1;
          p.inputY = Math.sin(this.elapsed * 2.5 + p.aiSeed) * 0.28;
          if (p.dashCd <= 0 && Math.random() < 0.04) p.wantAction = true;
        } else {
          p.inputX = 0;
          p.inputY = 0;
          p.wantAction = false;
        }
      }

      const inMud = MUD_PUDDLES.some((m) => dist(p.x, p.y, m.x, m.y) < m.r);
      this._movePlayer(p, dt, inMud ? 150 : 285);

      if (this.lightState === 'red' && Math.hypot(p.vx, p.vy) > 40) {
        p.x = Math.max(95, p.x - 280);
        p.vx = 0;
        p.vy = 0;
        this.emitEvent('popup', { x: p.x + 20, y: p.y - 26, text: '🚨 KETAHUAN! MUNDUR!', color: '#EF4444' });
        this.emitEvent('sfx', { sound: 'explode' });
      }

      if (p.x >= ARENA_W - 115) {
        p.finishedPhase = true;
        this.finishOrder.push(p.id);
        const pts = Math.max(60, 150 - (this.finishOrder.length - 1) * 25);
        p.score += pts;
        this.emitEvent('popup', { x: p.x - 50, y: p.y - 24, text: `🏁 +${pts}!`, color: '#22C55E' });
        this.emitEvent('sfx', { sound: 'correct' });
      }
    }

    if (this.stageTimer <= 0 || this.entities.every((e) => e.finishedPhase)) {
      for (const p of this.entities) {
        if (!p.finishedPhase) p.score += Math.round(((p.x - 95) / (ARENA_W - 210)) * 50);
      }
      this._setupStage(2);
    }
  }

  _updateStage2(dt) {
    // Rotating disco laser beam from arena center!
    this.spinnerSpeed = Math.min(1.55, 0.72 + (19 - this.stageTimer) * 0.045);
    this.spinnerAngle += this.spinnerSpeed * dt;

    // Cross-grid lasers spawn faster as timer drops
    this.laserSpawnTimer -= dt;
    if (this.laserSpawnTimer <= 0) {
      this.laserSpawnTimer = Math.max(0.55, 1.15 - (19 - this.stageTimer) * 0.035);
      const horizontal = Math.random() < 0.55;
      const pos = horizontal ? randRange(80, ARENA_H - 80) : randRange(120, ARENA_W - 120);
      this.lasers.push({
        id: Math.random().toString(36).slice(2, 6),
        horizontal,
        pos,
        width: 30,
        warnTimer: 0.85,
        fireTimer: 0.5,
        active: false,
      });
    }

    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const l = this.lasers[i];
      if (!l.active) {
        l.warnTimer -= dt;
        if (l.warnTimer <= 0) {
          l.active = true;
          this.emitEvent('sfx', { sound: 'laser' });
        }
      } else {
        l.fireTimer -= dt;
        if (l.fireTimer <= 0) this.lasers.splice(i, 1);
      }
    }

    const cx = ARENA_W / 2;
    const cy = ARENA_H / 2;
    const alive = this.entities.filter((e) => e.alive);

    for (const p of alive) {
      if (p.isBot) {
        // Orbit around center in spinner direction while dodging grid lasers
        const angToCenter = Math.atan2(p.y - cy, p.x - cx);
        let ax = -Math.sin(angToCenter) * 0.8;
        let ay = Math.cos(angToCenter) * 0.8;
        for (const l of this.lasers) {
          if (l.horizontal && Math.abs(p.y - l.pos) < 85) ay += p.y >= l.pos ? 1.5 : -1.5;
          if (!l.horizontal && Math.abs(p.x - l.pos) < 85) ax += p.x >= l.pos ? 1.5 : -1.5;
        }
        const len = Math.hypot(ax, ay) || 1;
        p.inputX = ax / len;
        p.inputY = ay / len;
      }

      this._movePlayer(p, dt, 295);
      p.score += dt * 8;

      let hit = false;
      for (const l of this.lasers) {
        if (!l.active) continue;
        if (l.horizontal ? Math.abs(p.y - l.pos) < l.width / 2 + 15 : Math.abs(p.x - l.pos) < l.width / 2 + 15) {
          hit = true;
          break;
        }
      }
      // Check rotating laser bar (2 opposite arms from center, active after first 1.5s of stage 2)
      if (!hit && this.stageTimer < 17.5) {
        const dx = p.x - cx;
        const dy = p.y - cy;
        const distC = Math.hypot(dx, dy);
        if (distC < 430) {
          const lineDist = Math.abs(-Math.sin(this.spinnerAngle) * dx + Math.cos(this.spinnerAngle) * dy);
          if (lineDist < 19) hit = true;
        }
      }

      if (hit) {
        p.alive = false;
        this.emitEvent('explode', { x: p.x, y: p.y, name: p.name, color: p.color });
      }
    }

    if (this.stageTimer <= 0 || this.entities.filter((e) => e.alive).length <= 1) {
      for (const p of this.entities) if (p.alive) p.score += 65;
      this._setupStage(3);
    }
  }

  _updateStage3(dt) {
    const padX = 72;
    const padY = 78;
    const cellW = (ARENA_W - padX * 2) / TILE_COLS;
    const cellH = (ARENA_H - padY * 2) / TILE_ROWS;

    this.tileTimer -= dt;
    if (this.tilePhase === 'announce' && this.tileTimer <= 0) {
      this.tilePhase = 'drop';
      this.tileTimer = 1.45;
      this.emitEvent('sfx', { sound: 'explode' });
    } else if (this.tilePhase === 'drop' && this.tileTimer <= 0) {
      for (const p of this.entities) if (p.alive) p.score += 55;
      if (this.tileWave >= 3 || this.entities.filter((e) => e.alive).length <= 1) {
        this._conclude();
        return;
      }
      this.tileWave += 1;
      this._initTileWave();
    }

    const alive = this.entities.filter((e) => e.alive);
    for (const p of alive) {
      if (p.isBot) {
        let bestX = ARENA_W / 2;
        let bestY = ARENA_H / 2;
        let bestD = Infinity;
        for (let r = 0; r < TILE_ROWS; r++) {
          for (let c = 0; c < TILE_COLS; c++) {
            if (this.tileGrid[r * TILE_COLS + c] !== this.safeColorId) continue;
            const cx = padX + (c + 0.5) * cellW;
            const cy = padY + (r + 0.5) * cellH;
            const d = dist(p.x, p.y, cx, cy);
            if (d < bestD) { bestD = d; bestX = cx; bestY = cy; }
          }
        }
        if (bestD > 18) {
          p.inputX = (bestX - p.x) / bestD;
          p.inputY = (bestY - p.y) / bestD;
          if (bestD > 120 && p.dashCd <= 0) p.wantAction = true;
        } else {
          p.inputX = 0;
          p.inputY = 0;
        }
      }

      this._movePlayer(p, dt, 295);
      p.x = clamp(p.x, padX + 16, ARENA_W - padX - 16);
      p.y = clamp(p.y, padY + 16, ARENA_H - padY - 16);

      if (this.tilePhase === 'drop') {
        const c = clamp(Math.floor((p.x - padX) / cellW), 0, TILE_COLS - 1);
        const r = clamp(Math.floor((p.y - padY) / cellH), 0, TILE_ROWS - 1);
        if (this.tileGrid[r * TILE_COLS + c] !== this.safeColorId) {
          p.alive = false;
          this.emitEvent('ko', { x: p.x, y: p.y, victim: p.name, color: p.color });
        }
      }
    }

    // Hard cartoon shoving on safe tiles!
    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        const a = alive[i];
        const b = alive[j];
        const d = dist(a.x, a.y, b.x, b.y);
        if (d < PLAYER_RADIUS * 2 && d > 0.001) {
          const nx = (b.x - a.x) / d;
          const ny = (b.y - a.y) / d;
          const fA = b.dashTimer > 0 ? 340 : 170;
          const fB = a.dashTimer > 0 ? 340 : 170;
          a.vx -= nx * fA; a.vy -= ny * fA;
          b.vx += nx * fB; b.vy += ny * fB;
        }
      }
    }
  }

  _conclude() {
    const standings = this.entities.map((e) => ({
      id: e.id,
      name: e.name,
      color: e.color,
      hat: e.hat,
      isBot: e.isBot,
      score: Math.round(e.score),
      detail: e.alive ? 'Lolos 3 Ronde Brutal!' : 'Tumbang di Chaos!',
    }));
    this.finishGame(standings);
  }

  getState() {
    return {
      gameId: this.gameId,
      phase: this.phase,
      countdown: Number(this.countdown.toFixed(1)),
      stage: this.stage,
      stageTimer: Number(Math.max(0, this.stageTimer).toFixed(1)),
      intermission: Number(Math.max(0, this.intermission).toFixed(1)),
      lightState: this.lightState,
      mudPuddles: this.stage === 1 ? MUD_PUDDLES : null,
      spinnerAngle: Number(this.spinnerAngle.toFixed(3)),
      spinnerActive: this.stage === 2 && this.stageTimer < 17.5,
      lasers: this.lasers.map((l) => ({
        horizontal: l.horizontal,
        pos: Math.round(l.pos),
        width: l.width,
        active: l.active,
      })),
      tileGrid: this.tileGrid,
      tileCols: TILE_COLS,
      tileRows: TILE_ROWS,
      safeColor: TILE_COLORS[this.safeColorId],
      tilePhase: this.tilePhase,
      tileTimer: Number(Math.max(0, this.tileTimer).toFixed(1)),
      tileWave: this.tileWave,
      players: this.entities.map((e) => ({
        id: e.id,
        name: e.name,
        color: e.color,
        hat: e.hat,
        x: Math.round(e.x),
        y: Math.round(e.y),
        vx: Math.round(e.vx),
        vy: Math.round(e.vy),
        facing: Number(e.facing.toFixed(2)),
        alive: e.alive,
        finishedPhase: e.finishedPhase,
        score: Math.round(e.score),
        dashCd: Number(e.dashCd.toFixed(2)),
      })),
    };
  }
}
