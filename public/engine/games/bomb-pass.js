import { ARENA_W, ARENA_H, PLAYER_RADIUS, BaseGame, clamp, dist, randRange, spawnRing } from './base-game.js';

const BUMPERS = [
  { x: 320, y: 195, r: 36 },
  { x: 960, y: 195, r: 36 },
  { x: 320, y: 425, r: 36 },
  { x: 960, y: 425, r: 36 },
  { x: 640, y: 310, r: 44 },
];

const BOOST_PADS = [
  { x: 640, y: 115, r: 30 },
  { x: 640, y: 505, r: 30 },
  { x: 155, y: 310, r: 30 },
  { x: 1125, y: 310, r: 30 },
];

export class BombPassGame extends BaseGame {
  constructor(room, players) {
    super(room, 'bomb-pass');
    this.entities = spawnRing(players, ARENA_W / 2, ARENA_H / 2, 210);
    this.entities.forEach((e) => {
      e.passes = 0;
      e.immuneTimer = 0;
      e.boostTimer = 0;
      e.eliminatedAt = null;
    });
    this.bombs = []; // { holderId, timer, maxTimer }
    this.eliminationOrder = [];
    this.roundNum = 1;
  }

  onStart() {
    this._assignBombs();
  }

  _assignBombs() {
    const alive = this.entities.filter((e) => e.alive);
    if (alive.length <= 1) {
      this._conclude();
      return;
    }
    const bombCount = alive.length >= 7 ? 2 : 1;
    const shuffled = [...alive].sort(() => Math.random() - 0.5);
    this.bombs = [];
    for (let i = 0; i < bombCount; i++) {
      const maxTimer = clamp(randRange(9.5, 13.5) - this.roundNum * 0.4, 6.5, 13.5);
      this.bombs.push({
        holderId: shuffled[i].id,
        timer: maxTimer,
        maxTimer,
        lastTickInt: Math.ceil(maxTimer),
      });
    }
    this.emitEvent('banner', { text: bombCount > 1 ? '💣 2 BOM AKTIF! OPER CEPAT!' : '💣 OPER BOM SEBELUM MELEDAK!' });
  }

  _updateBot(bot, dt) {
    const alive = this.entities.filter((e) => e.alive && e.id !== bot.id);
    if (alive.length === 0) return;

    const holding = this.bombs.some((b) => b.holderId === bot.id);
    let tx = ARENA_W / 2;
    let ty = ARENA_H / 2;

    if (holding) {
      // Chase closest non-holder
      let best = null;
      let bestD = Infinity;
      for (const other of alive) {
        if (this.bombs.some((b) => b.holderId === other.id) || other.immuneTimer > 0) continue;
        const d = dist(bot.x, bot.y, other.x, other.y);
        if (d < bestD) {
          bestD = d;
          best = other;
        }
      }
      if (best) {
        tx = best.x + best.vx * 0.15;
        ty = best.y + best.vy * 0.15;
        if (bestD < 145 && bot.dashCd <= 0) bot.wantAction = true;
      }
    } else {
      // Flee from nearest bomb holder
      let threat = null;
      let threatD = Infinity;
      for (const b of this.bombs) {
        const h = this.entities.find((e) => e.id === b.holderId && e.alive);
        if (!h) continue;
        const d = dist(bot.x, bot.y, h.x, h.y);
        if (d < threatD) {
          threatD = d;
          threat = h;
        }
      }
      if (threat && threatD < 320) {
        const awayX = bot.x - threat.x;
        const awayY = bot.y - threat.y;
        const angle = Math.atan2(awayY, awayX) + Math.sin(this.elapsed * 2 + bot.aiSeed) * 0.45;
        tx = clamp(bot.x + Math.cos(angle) * 200, 90, ARENA_W - 90);
        ty = clamp(bot.y + Math.sin(angle) * 200, 90, ARENA_H - 90);
        if (threatD < 110 && bot.dashCd <= 0) bot.wantAction = true;
      } else {
        tx = ARENA_W / 2 + Math.cos(this.elapsed * 0.9 + bot.aiSeed) * 280;
        ty = ARENA_H / 2 + Math.sin(this.elapsed * 1.1 + bot.aiSeed) * 180;
      }
    }

    const dx = tx - bot.x;
    const dy = ty - bot.y;
    const d = Math.hypot(dx, dy) || 1;
    bot.inputX = dx / d;
    bot.inputY = dy / d;
  }

  update(dt) {
    const alive = this.entities.filter((e) => e.alive);
    if (alive.length <= 1) {
      this._conclude();
      return;
    }

    for (const p of alive) {
      if (p.isBot) this._updateBot(p, dt);
      p.dashCd = Math.max(0, p.dashCd - dt);
      p.dashTimer = Math.max(0, p.dashTimer - dt);
      p.immuneTimer = Math.max(0, p.immuneTimer - dt);
      p.boostTimer = Math.max(0, p.boostTimer - dt);

      const isHolder = this.bombs.some((b) => b.holderId === p.id);
      if (p.wantAction && p.dashCd <= 0) {
        p.wantAction = false;
        p.dashCd = 2.0;
        p.dashTimer = 0.22;
        const dirX = Math.hypot(p.inputX, p.inputY) > 0.1 ? p.inputX : Math.cos(p.facing);
        const dirY = Math.hypot(p.inputX, p.inputY) > 0.1 ? p.inputY : Math.sin(p.facing);
        p.vx = dirX * 560;
        p.vy = dirY * 560;
        this.emitEvent('dash', { x: p.x, y: p.y, color: p.color });
      } else {
        p.wantAction = false;
      }

      const baseSpeed = (isHolder ? 295 : 260) * (p.boostTimer > 0 ? 1.38 : 1);
      if (p.dashTimer <= 0) {
        const targetVx = p.inputX * baseSpeed;
        const targetVy = p.inputY * baseSpeed;
        p.vx += (targetVx - p.vx) * Math.min(1, dt * 12);
        p.vy += (targetVy - p.vy) * Math.min(1, dt * 12);
      }

      if (Math.hypot(p.vx, p.vy) > 15) {
        p.facing = Math.atan2(p.vy, p.vx);
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Arena walls with bouncy feel
      const margin = 36 + PLAYER_RADIUS;
      if (p.x < margin) { p.x = margin; p.vx = Math.abs(p.vx) * 0.5; }
      if (p.x > ARENA_W - margin) { p.x = ARENA_W - margin; p.vx = -Math.abs(p.vx) * 0.5; }
      if (p.y < margin) { p.y = margin; p.vy = Math.abs(p.vy) * 0.5; }
      if (p.y > ARENA_H - margin) { p.y = ARENA_H - margin; p.vy = -Math.abs(p.vy) * 0.5; }

      // Bumpers
      for (const b of BUMPERS) {
        const d = dist(p.x, p.y, b.x, b.y);
        const minD = PLAYER_RADIUS + b.r;
        if (d < minD && d > 0.001) {
          const nx = (p.x - b.x) / d;
          const ny = (p.y - b.y) / d;
          p.x = b.x + nx * minD;
          p.y = b.y + ny * minD;
          p.vx = nx * 360;
          p.vy = ny * 360;
          this.emitEvent('bump', { x: b.x + nx * b.r, y: b.y + ny * b.r });
        }
      }

      // Boost pads
      for (const pad of BOOST_PADS) {
        if (dist(p.x, p.y, pad.x, pad.y) < PLAYER_RADIUS + pad.r * 0.8 && p.boostTimer <= 0.1) {
          p.boostTimer = 1.6;
          this.emitEvent('boost', { x: pad.x, y: pad.y, color: '#FFD166' });
        }
      }
    }

    // Player-player collisions & bomb passing
    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        const a = alive[i];
        const b = alive[j];
        const d = dist(a.x, a.y, b.x, b.y);
        const minD = PLAYER_RADIUS * 2;
        if (d < minD && d > 0.001) {
          const nx = (b.x - a.x) / d;
          const ny = (b.y - a.y) / d;
          const overlap = (minD - d) * 0.5;
          a.x -= nx * overlap;
          a.y -= ny * overlap;
          b.x += nx * overlap;
          b.y += ny * overlap;

          // Check bomb pass
          for (const bomb of this.bombs) {
            if (bomb.holderId === a.id && b.immuneTimer <= 0 && !this.bombs.some((x) => x.holderId === b.id)) {
              bomb.holderId = b.id;
              a.immuneTimer = 0.55;
              a.passes += 1;
              b.vx += nx * 180;
              b.vy += ny * 180;
              this.emitEvent('pass', { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, to: b.name });
              break;
            } else if (bomb.holderId === b.id && a.immuneTimer <= 0 && !this.bombs.some((x) => x.holderId === a.id)) {
              bomb.holderId = a.id;
              b.immuneTimer = 0.55;
              b.passes += 1;
              a.vx -= nx * 180;
              a.vy -= ny * 180;
              this.emitEvent('pass', { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, to: a.name });
              break;
            }
          }
        }
      }
    }

    // Update bombs
    let exploded = false;
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const bomb = this.bombs[i];
      bomb.timer -= dt;
      const tickThresh = bomb.timer < 3 ? Math.ceil(bomb.timer * 3) : Math.ceil(bomb.timer);
      if (tickThresh !== bomb.lastTickInt && bomb.timer > 0) {
        bomb.lastTickInt = tickThresh;
        this.emitEvent('sfx', { sound: bomb.timer < 3 ? 'bombFast' : 'bombTick' });
      }
      if (bomb.timer <= 0) {
        const holder = this.entities.find((e) => e.id === bomb.holderId);
        if (holder && holder.alive) {
          holder.alive = false;
          holder.eliminatedAt = this.elapsed;
          this.eliminationOrder.push(holder.id);
          this.emitEvent('explode', { x: holder.x, y: holder.y, name: holder.name, color: holder.color });
          // Knockback nearby players
          for (const other of alive) {
            if (!other.alive) continue;
            const d = dist(holder.x, holder.y, other.x, other.y);
            if (d < 220 && d > 1) {
              const force = (1 - d / 220) * 520;
              other.vx += ((other.x - holder.x) / d) * force;
              other.vy += ((other.y - holder.y) / d) * force;
            }
          }
        }
        this.bombs.splice(i, 1);
        exploded = true;
      }
    }

    if (exploded) {
      const remaining = this.entities.filter((e) => e.alive);
      if (remaining.length <= 1) {
        this._conclude();
      } else if (this.bombs.length === 0) {
        this.roundNum += 1;
        this._assignBombs();
      }
    }
  }

  _conclude() {
    const alive = this.entities.filter((e) => e.alive);
    const total = this.entities.length;
    const standings = this.entities.map((e) => {
      const elimIdx = this.eliminationOrder.indexOf(e.id);
      const surviveRank = e.alive ? total : elimIdx + 1;
      const score = Math.round(surviveRank * 65 + e.passes * 15 + (e.alive ? 90 : 0));
      return {
        id: e.id,
        name: e.name,
        color: e.color,
        hat: e.hat,
        isBot: e.isBot,
        score,
        detail: e.alive ? 'Juara Bertahan!' : `${e.passes}x Oper Bom`,
      };
    });
    this.finishGame(standings);
  }

  getState() {
    return {
      gameId: this.gameId,
      phase: this.phase,
      countdown: Number(this.countdown.toFixed(1)),
      elapsed: Number(this.elapsed.toFixed(1)),
      bumpers: BUMPERS,
      boostPads: BOOST_PADS,
      bombs: this.bombs.map((b) => ({
        holderId: b.holderId,
        timer: Number(Math.max(0, b.timer).toFixed(2)),
        maxTimer: Number(b.maxTimer.toFixed(2)),
      })),
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
        dashCd: Number(e.dashCd.toFixed(2)),
        boost: e.boostTimer > 0,
        immune: e.immuneTimer > 0,
      })),
    };
  }
}
