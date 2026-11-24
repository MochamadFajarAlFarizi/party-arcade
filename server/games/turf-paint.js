import { ARENA_W, ARENA_H, PLAYER_RADIUS, BaseGame, clamp, dist, randRange, spawnRing } from './base-game.js';

const COLS = 32;
const ROWS = 15;
const MARGIN_X = 36;
const MARGIN_Y = 44;
const CELL_W = (ARENA_W - MARGIN_X * 2) / COLS;
const CELL_H = (ARENA_H - MARGIN_Y * 2) / ROWS;
const MATCH_DURATION = 48;

export class TurfPaintGame extends BaseGame {
  constructor(room, players) {
    super(room, 'turf-paint');
    this.entities = spawnRing(players, ARENA_W / 2, ARENA_H / 2, 185);
    this.entities.forEach((e, i) => {
      e.pIndex = i + 1;
      e.tiles = 0;
    });
    this.grid = new Array(COLS * ROWS).fill(0); // 0 = empty, 1..N = player index
    this.paintBombs = [];
    this.nextBomb = 5.0;
    this.frenzyAnnounced = false;
  }

  _paintCell(c, r, pIndex) {
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return false;
    const idx = r * COLS + c;
    if (this.grid[idx] !== pIndex) {
      this.grid[idx] = pIndex;
      return true;
    }
    return false;
  }

  _splashRadius(cx, cy, cellRad, pIndex) {
    const c0 = Math.floor((cx - MARGIN_X) / CELL_W);
    const r0 = Math.floor((cy - MARGIN_Y) / CELL_H);
    for (let dr = -cellRad; dr <= cellRad; dr++) {
      for (let dc = -cellRad; dc <= cellRad; dc++) {
        if (dc * dc + dr * dr <= cellRad * cellRad + 0.5) {
          this._paintCell(c0 + dc, r0 + dr, pIndex);
        }
      }
    }
  }

  _updateBot(bot) {
    // Seek nearest paint bomb or unowned tile
    let tx = ARENA_W / 2;
    let ty = ARENA_H / 2;
    if (this.paintBombs.length > 0) {
      let best = this.paintBombs[0];
      let bestD = dist(bot.x, bot.y, best.x, best.y);
      for (const pb of this.paintBombs) {
        const d = dist(bot.x, bot.y, pb.x, pb.y);
        if (d < bestD) { best = pb; bestD = d; }
      }
      tx = best.x;
      ty = best.y;
    } else {
      // Sample 8 directions and pick one with most non-own cells
      let bestAng = bot.facing;
      let bestVal = -1;
      for (let k = 0; k < 8; k++) {
        const ang = (k / 8) * Math.PI * 2 + Math.sin(this.elapsed + bot.aiSeed) * 0.25;
        const sx = clamp(bot.x + Math.cos(ang) * 95, MARGIN_X + 20, ARENA_W - MARGIN_X - 20);
        const sy = clamp(bot.y + Math.sin(ang) * 95, MARGIN_Y + 20, ARENA_H - MARGIN_Y - 20);
        const c = clamp(Math.floor((sx - MARGIN_X) / CELL_W), 0, COLS - 1);
        const r = clamp(Math.floor((sy - MARGIN_Y) / CELL_H), 0, ROWS - 1);
        const val = (this.grid[r * COLS + c] !== bot.pIndex ? 2 : 0) + Math.random() * 0.6;
        if (val > bestVal) {
          bestVal = val;
          bestAng = ang;
        }
      }
      tx = bot.x + Math.cos(bestAng) * 140;
      ty = bot.y + Math.sin(bestAng) * 140;
    }

    const dx = tx - bot.x;
    const dy = ty - bot.y;
    const d = Math.hypot(dx, dy) || 1;
    bot.inputX = dx / d;
    bot.inputY = dy / d;
    if (bot.dashCd <= 0 && Math.random() < 0.04) bot.wantAction = true;
  }

  update(dt) {
    const remaining = MATCH_DURATION - this.elapsed;
    if (remaining <= 10 && !this.frenzyAnnounced) {
      this.frenzyAnnounced = true;
      this.emitEvent('banner', { text: '🔥 10 DETIK TERAKHIR! TURBO CAT!' });
      this.emitEvent('sfx', { sound: 'powerup' });
    }
    if (remaining <= 0) {
      this._conclude();
      return;
    }

    this.nextBomb -= dt;
    if (this.nextBomb <= 0 && this.paintBombs.length < 3) {
      this.nextBomb = randRange(5.0, 7.5);
      this.paintBombs.push({
        id: `pb_${Math.random().toString(36).slice(2, 6)}`,
        x: randRange(MARGIN_X + 80, ARENA_W - MARGIN_X - 80),
        y: randRange(MARGIN_Y + 70, ARENA_H - MARGIN_Y - 70),
      });
    }

    const frenzyMult = remaining <= 10 ? 1.2 : 1.0;

    for (const p of this.entities) {
      if (p.isBot && p.stunTimer <= 0) this._updateBot(p);
      p.dashCd = Math.max(0, p.dashCd - dt);
      p.dashTimer = Math.max(0, p.dashTimer - dt);
      p.stunTimer = Math.max(0, p.stunTimer - dt);

      if (p.stunTimer > 0) {
        p.vx *= 0.85;
        p.vy *= 0.85;
        p.wantAction = false;
      } else {
        if (p.wantAction && p.dashCd <= 0) {
          p.wantAction = false;
          p.dashCd = 2.4;
          p.dashTimer = 0.24;
          const dirX = Math.hypot(p.inputX, p.inputY) > 0.1 ? p.inputX : Math.cos(p.facing);
          const dirY = Math.hypot(p.inputX, p.inputY) > 0.1 ? p.inputY : Math.sin(p.facing);
          p.vx = dirX * 560;
          p.vy = dirY * 560;
          this._splashRadius(p.x, p.y, 1.5, p.pIndex);
          this.emitEvent('splash', { x: p.x, y: p.y, color: p.color, big: false });
        } else {
          p.wantAction = false;
        }

        if (p.dashTimer <= 0) {
          const spd = 275 * frenzyMult;
          p.vx += (p.inputX * spd - p.vx) * Math.min(1, dt * 13);
          p.vy += (p.inputY * spd - p.vy) * Math.min(1, dt * 13);
        }
      }

      if (Math.hypot(p.vx, p.vy) > 12) {
        p.facing = Math.atan2(p.vy, p.vx);
      }

      p.x = clamp(p.x + p.vx * dt, MARGIN_X + PLAYER_RADIUS, ARENA_W - MARGIN_X - PLAYER_RADIUS);
      p.y = clamp(p.y + p.vy * dt, MARGIN_Y + PLAYER_RADIUS, ARENA_H - MARGIN_Y - PLAYER_RADIUS);

      // Paint current cell (+ wider during dash!)
      const c = Math.floor((p.x - MARGIN_X) / CELL_W);
      const r = Math.floor((p.y - MARGIN_Y) / CELL_H);
      if (p.dashTimer > 0) {
        this._splashRadius(p.x, p.y, 1.3, p.pIndex);
      } else {
        this._paintCell(c, r, p.pIndex);
      }

      // Collect paint bomb
      for (let i = this.paintBombs.length - 1; i >= 0; i--) {
        const pb = this.paintBombs[i];
        if (dist(p.x, p.y, pb.x, pb.y) < PLAYER_RADIUS + 20) {
          this.paintBombs.splice(i, 1);
          this._splashRadius(pb.x, pb.y, 2.7, p.pIndex);
          this.emitEvent('splash', { x: pb.x, y: pb.y, color: p.color, big: true });
          this.emitEvent('popup', { x: pb.x, y: pb.y - 24, text: '🎨 BOOM CAT!', color: p.color });
        }
      }
    }

    // Dash-bump stun
    for (let i = 0; i < this.entities.length; i++) {
      for (let j = i + 1; j < this.entities.length; j++) {
        const a = this.entities[i];
        const b = this.entities[j];
        const d = dist(a.x, a.y, b.x, b.y);
        if (d < PLAYER_RADIUS * 2 && d > 0.001) {
          const nx = (b.x - a.x) / d;
          const ny = (b.y - a.y) / d;
          if (a.dashTimer > 0 && b.stunTimer <= 0) {
            b.stunTimer = 1.1;
            b.vx = nx * 300;
            b.vy = ny * 300;
            this._splashRadius(b.x, b.y, 1.3, a.pIndex);
            this.emitEvent('bump', { x: b.x, y: b.y, heavy: true });
          } else if (b.dashTimer > 0 && a.stunTimer <= 0) {
            a.stunTimer = 1.1;
            a.vx = -nx * 300;
            a.vy = -ny * 300;
            this._splashRadius(a.x, a.y, 1.3, b.pIndex);
            this.emitEvent('bump', { x: a.x, y: a.y, heavy: true });
          }
        }
      }
    }

    // Count tiles
    for (const p of this.entities) p.tiles = 0;
    for (let i = 0; i < this.grid.length; i++) {
      const owner = this.grid[i];
      if (owner > 0 && this.entities[owner - 1]) {
        this.entities[owner - 1].tiles += 1;
      }
    }
  }

  _conclude() {
    const totalCells = COLS * ROWS;
    const standings = this.entities.map((e) => {
      const pct = Math.round((e.tiles / totalCells) * 100);
      return {
        id: e.id,
        name: e.name,
        color: e.color,
        hat: e.hat,
        isBot: e.isBot,
        score: Math.round(e.tiles * 3 + pct * 4),
        detail: `${pct}% Wilayah (${e.tiles} ubin)`,
      };
    });
    this.finishGame(standings);
  }

  getState() {
    return {
      gameId: this.gameId,
      phase: this.phase,
      countdown: Number(this.countdown.toFixed(1)),
      timeLeft: Number(Math.max(0, MATCH_DURATION - this.elapsed).toFixed(1)),
      cols: COLS,
      rows: ROWS,
      marginX: MARGIN_X,
      marginY: MARGIN_Y,
      grid: this.grid,
      paintBombs: this.paintBombs,
      players: this.entities.map((e) => ({
        id: e.id,
        pIndex: e.pIndex,
        name: e.name,
        color: e.color,
        hat: e.hat,
        x: Math.round(e.x),
        y: Math.round(e.y),
        vx: Math.round(e.vx),
        vy: Math.round(e.vy),
        facing: Number(e.facing.toFixed(2)),
        alive: true,
        stunned: e.stunTimer > 0,
        dashCd: Number(e.dashCd.toFixed(2)),
        tiles: e.tiles,
      })),
    };
  }
}
