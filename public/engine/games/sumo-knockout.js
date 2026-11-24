import { ARENA_W, ARENA_H, PLAYER_RADIUS, BaseGame, clamp, dist, pickRandom, randRange, spawnRing } from './base-game.js';

const CX = ARENA_W / 2;
const CY = ARENA_H / 2;
const START_RADIUS = 278;
const MIN_RADIUS = 92;
const POWERUP_TYPES = ['turbo', 'shield', 'mega', 'shockwave'];

export class SumoKnockoutGame extends BaseGame {
  constructor(room, players) {
    super(room, 'sumo-knockout');
    this.entities = spawnRing(players, CX, CY, 165);
    this.entities.forEach((e) => {
      e.kos = 0;
      e.lastHitBy = null;
      e.lastHitAt = 0;
      e.shield = false;
      e.turboTimer = 0;
      e.megaTimer = 0;
      e.falling = 0; // 0 = on island, >0 = falling animation
    });
    this.islandRadius = START_RADIUS;
    this.powerups = [];
    this.nextPowerup = 3.5;
    this.eliminationOrder = [];
  }

  _updateBot(bot) {
    const alive = this.entities.filter((e) => e.alive && e.id !== bot.id);
    const dCenter = dist(bot.x, bot.y, CX, CY);

    // Priority 1: Stay safely inside island!
    if (dCenter > this.islandRadius - 58) {
      const dx = CX - bot.x;
      const dy = CY - bot.y;
      const len = Math.hypot(dx, dy) || 1;
      bot.inputX = dx / len;
      bot.inputY = dy / len;
      if (dCenter > this.islandRadius - 32 && bot.dashCd <= 0) bot.wantAction = true;
      return;
    }

    // Priority 2: Grab nearby powerup
    let targetX = CX;
    let targetY = CY;
    let nearestPu = null;
    let puDist = 170;
    for (const pu of this.powerups) {
      const d = dist(bot.x, bot.y, pu.x, pu.y);
      if (d < puDist && dist(pu.x, pu.y, CX, CY) < this.islandRadius - 30) {
        puDist = d;
        nearestPu = pu;
      }
    }
    if (nearestPu) {
      targetX = nearestPu.x;
      targetY = nearestPu.y;
    } else if (alive.length > 0) {
      // Push nearest opponent who is close to edge
      let best = alive[0];
      let bestScore = -Infinity;
      for (const o of alive) {
        const sc = dist(o.x, o.y, CX, CY) * 1.1 - dist(bot.x, bot.y, o.x, o.y);
        if (sc > bestScore) {
          bestScore = sc;
          best = o;
        }
      }
      targetX = best.x;
      targetY = best.y;
      if (dist(bot.x, bot.y, best.x, best.y) < 115 && bot.dashCd <= 0 && dCenter < this.islandRadius - 75) {
        bot.wantAction = true;
      }
    }

    const dx = targetX - bot.x;
    const dy = targetY - bot.y;
    const len = Math.hypot(dx, dy) || 1;
    bot.inputX = dx / len;
    bot.inputY = dy / len;
  }

  update(dt) {
    const alive = this.entities.filter((e) => e.alive);
    if (alive.length <= 1 || this.elapsed > 75) {
      this._conclude();
      return;
    }

    // Shrink floating island gradually
    this.islandRadius = Math.max(MIN_RADIUS, START_RADIUS - this.elapsed * 3.1);

    // Spawn power-ups
    this.nextPowerup -= dt;
    if (this.nextPowerup <= 0 && this.powerups.length < 3) {
      this.nextPowerup = randRange(4.5, 7.0);
      const ang = Math.random() * Math.PI * 2;
      const rad = randRange(25, Math.max(35, this.islandRadius - 55));
      this.powerups.push({
        id: `pu_${Math.random().toString(36).slice(2, 7)}`,
        type: pickRandom(POWERUP_TYPES),
        x: CX + Math.cos(ang) * rad,
        y: CY + Math.sin(ang) * rad,
      });
    }

    // Remove powerups outside island
    this.powerups = this.powerups.filter((pu) => dist(pu.x, pu.y, CX, CY) < this.islandRadius - 12);

    // Update falling animations for eliminated players
    for (const e of this.entities) {
      if (!e.alive && e.falling < 1) {
        e.falling = Math.min(1, e.falling + dt * 1.4);
      }
    }

    for (const p of alive) {
      if (p.isBot) this._updateBot(p);
      p.dashCd = Math.max(0, p.dashCd - dt);
      p.dashTimer = Math.max(0, p.dashTimer - dt);
      p.turboTimer = Math.max(0, p.turboTimer - dt);
      p.megaTimer = Math.max(0, p.megaTimer - dt);

      if (p.wantAction && p.dashCd <= 0) {
        p.wantAction = false;
        p.dashCd = p.turboTimer > 0 ? 1.15 : 1.9;
        p.dashTimer = 0.24;
        const dirX = Math.hypot(p.inputX, p.inputY) > 0.1 ? p.inputX : Math.cos(p.facing);
        const dirY = Math.hypot(p.inputX, p.inputY) > 0.1 ? p.inputY : Math.sin(p.facing);
        p.vx += dirX * 430;
        p.vy += dirY * 430;
        this.emitEvent('dash', { x: p.x, y: p.y, color: p.color });
      } else {
        p.wantAction = false;
      }

      const accel = p.turboTimer > 0 ? 1280 : 940;
      const maxSpd = p.turboTimer > 0 ? 330 : 250;
      p.vx += p.inputX * accel * dt;
      p.vy += p.inputY * accel * dt;

      // Friction (slightly slippery arcade ice-toy feel!)
      const drag = Math.pow(0.06, dt);
      p.vx *= drag;
      p.vy *= drag;

      if (p.dashTimer <= 0) {
        const spd = Math.hypot(p.vx, p.vy);
        if (spd > maxSpd && spd < 380) {
          p.vx = (p.vx / spd) * maxSpd;
          p.vy = (p.vy / spd) * maxSpd;
        }
      }

      if (Math.hypot(p.inputX, p.inputY) > 0.15) {
        p.facing = Math.atan2(p.inputY, p.inputX);
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Pickup power-ups
      const radius = p.megaTimer > 0 ? PLAYER_RADIUS * 1.45 : PLAYER_RADIUS;
      for (let i = this.powerups.length - 1; i >= 0; i--) {
        const pu = this.powerups[i];
        if (dist(p.x, p.y, pu.x, pu.y) < radius + 18) {
          this.powerups.splice(i, 1);
          this._applyPowerup(p, pu.type);
        }
      }
    }

    // Elastic bumper collisions
    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        const a = alive[i];
        const b = alive[j];
        const ra = a.megaTimer > 0 ? PLAYER_RADIUS * 1.45 : PLAYER_RADIUS;
        const rb = b.megaTimer > 0 ? PLAYER_RADIUS * 1.45 : PLAYER_RADIUS;
        const d = dist(a.x, a.y, b.x, b.y);
        const minD = ra + rb;
        if (d < minD && d > 0.001) {
          const nx = (b.x - a.x) / d;
          const ny = (b.y - a.y) / d;
          const overlap = minD - d;
          a.x -= nx * overlap * 0.5;
          a.y -= ny * overlap * 0.5;
          b.x += nx * overlap * 0.5;
          b.y += ny * overlap * 0.5;

          const massA = a.megaTimer > 0 ? 2.1 : 1.0;
          const massB = b.megaTimer > 0 ? 2.1 : 1.0;
          const forceToB = (260 + (a.dashTimer > 0 ? 310 : 0)) * (massA / massB);
          const forceToA = (260 + (b.dashTimer > 0 ? 310 : 0)) * (massB / massA);

          if (b.shield && forceToB > 300) {
            b.shield = false;
            this.emitEvent('popup', { x: b.x, y: b.y - 24, text: '🛡️ BLOCK!', color: '#38BDF8' });
          } else {
            b.vx += nx * forceToB;
            b.vy += ny * forceToB;
            b.lastHitBy = a.id;
            b.lastHitAt = this.elapsed;
          }

          if (a.shield && forceToA > 300) {
            a.shield = false;
            this.emitEvent('popup', { x: a.x, y: a.y - 24, text: '🛡️ BLOCK!', color: '#38BDF8' });
          } else {
            a.vx -= nx * forceToA;
            a.vy -= ny * forceToA;
            a.lastHitBy = b.id;
            a.lastHitAt = this.elapsed;
          }

          this.emitEvent('bump', { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, heavy: a.dashTimer > 0 || b.dashTimer > 0 });
        }
      }
    }

    // Ring-out check
    for (const p of alive) {
      if (dist(p.x, p.y, CX, CY) > this.islandRadius + 10) {
        p.alive = false;
        p.falling = 0.05;
        this.eliminationOrder.push(p.id);
        let killerName = null;
        if (p.lastHitBy && this.elapsed - p.lastHitAt < 4.5) {
          const killer = this.entities.find((e) => e.id === p.lastHitBy);
          if (killer) {
            killer.kos += 1;
            killerName = killer.name;
          }
        }
        this.emitEvent('ko', { x: p.x, y: p.y, victim: p.name, killer: killerName, color: p.color });
      }
    }

    if (this.entities.filter((e) => e.alive).length <= 1) {
      this._conclude();
    }
  }

  _applyPowerup(p, type) {
    if (type === 'turbo') {
      p.turboTimer = 6;
      this.emitEvent('popup', { x: p.x, y: p.y - 26, text: '⚡ TURBO!', color: '#FACC15' });
    } else if (type === 'shield') {
      p.shield = true;
      this.emitEvent('popup', { x: p.x, y: p.y - 26, text: '🛡️ SHIELD!', color: '#38BDF8' });
    } else if (type === 'mega') {
      p.megaTimer = 6;
      this.emitEvent('popup', { x: p.x, y: p.y - 26, text: '💪 MEGA SUMO!', color: '#FB7185' });
    } else if (type === 'shockwave') {
      this.emitEvent('shockwave', { x: p.x, y: p.y, color: p.color });
      for (const o of this.entities) {
        if (!o.alive || o.id === p.id) continue;
        const d = dist(p.x, p.y, o.x, o.y);
        if (d < 230 && d > 1) {
          const push = (1 - d / 230) * 580;
          o.vx += ((o.x - p.x) / d) * push;
          o.vy += ((o.y - p.y) / d) * push;
          o.lastHitBy = p.id;
          o.lastHitAt = this.elapsed;
        }
      }
    }
    this.emitEvent('sfx', { sound: 'powerup' });
  }

  _conclude() {
    const total = this.entities.length;
    const standings = this.entities.map((e) => {
      const idx = this.eliminationOrder.indexOf(e.id);
      const surviveRank = e.alive ? total : idx + 1;
      const score = Math.round(surviveRank * 65 + e.kos * 40 + (e.alive ? 85 : 0));
      return {
        id: e.id,
        name: e.name,
        color: e.color,
        hat: e.hat,
        isBot: e.isBot,
        score,
        detail: `${e.kos} KO${e.alive ? ' • Raja Pulau!' : ''}`,
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
      islandRadius: Number(this.islandRadius.toFixed(1)),
      maxRadius: START_RADIUS,
      powerups: this.powerups,
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
        falling: Number(e.falling.toFixed(2)),
        dashCd: Number(e.dashCd.toFixed(2)),
        shield: e.shield,
        turbo: e.turboTimer > 0,
        mega: e.megaTimer > 0,
        kos: e.kos,
      })),
    };
  }
}
