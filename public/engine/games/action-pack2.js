import { ARENA_W, ARENA_H, PLAYER_RADIUS, BaseGame, clamp, dist, randRange, spawnRing } from './base-game.js';

// =========================================================================
// 15. SHARK ESCAPE — Dodge lunging sharks in the ocean & grab stars!
// =========================================================================
export class SharkEscapeGame extends BaseGame {
  constructor(room, players) {
    super(room, 'shark-escape');
    this.entities = spawnRing(players, ARENA_W / 2, ARENA_H / 2, 200);
    this.sharks = [
      { x: 120, y: 120, vx: 180, vy: 110, angle: 0, lungeCd: 2.0 },
      { x: ARENA_W - 120, y: ARENA_H - 120, vx: -180, vy: -110, angle: Math.PI, lungeCd: 3.5 },
    ];
    this.stars = Array.from({ length: 6 }, () => ({ x: randRange(120, ARENA_W - 120), y: randRange(100, ARENA_H - 100) }));
    this.eliminationOrder = [];
  }

  update(dt) {
    const alive = this.entities.filter((e) => e.alive);
    if (alive.length <= 1 || this.elapsed >= 45) {
      const total = this.entities.length;
      return this.finishGame(this.entities.map((e) => {
        const rank = e.alive ? total : this.eliminationOrder.indexOf(e.id) + 1;
        return {
          id: e.id, name: e.name, color: e.color, hat: e.hat, isBot: e.isBot,
          score: Math.round(rank * 55 + e.score + (e.alive ? 90 : 0)),
          detail: e.alive ? '🦈 Lolos dari Hiu!' : 'Dimakan Hiu!',
        };
      }));
    }

    // Spawn a 3rd shark after 18s!
    if (this.elapsed > 18 && this.sharks.length < 3) {
      this.sharks.push({ x: ARENA_W / 2, y: 80, vx: 0, vy: 220, angle: Math.PI / 2, lungeCd: 1.5 });
      this.emitEvent('banner', { text: '🦈 HIU KETIGA MUNCUL!!' });
    }

    for (const sh of this.sharks) {
      sh.lungeCd -= dt;
      const target = alive.sort((a, b) => dist(sh.x, sh.y, a.x, a.y) - dist(sh.x, sh.y, b.x, b.y))[0];
      if (target && sh.lungeCd <= 0) {
        sh.lungeCd = randRange(2.4, 3.8);
        const d = dist(sh.x, sh.y, target.x, target.y) || 1;
        sh.vx = ((target.x - sh.x) / d) * 430;
        sh.vy = ((target.y - sh.y) / d) * 430;
      } else if (target) {
        const d = dist(sh.x, sh.y, target.x, target.y) || 1;
        sh.vx += ((target.x - sh.x) / d) * 280 * dt;
        sh.vy += ((target.y - sh.y) / d) * 280 * dt;
        const spd = Math.hypot(sh.vx, sh.vy);
        if (spd > 310) { sh.vx = (sh.vx / spd) * 310; sh.vy = (sh.vy / spd) * 310; }
      }
      sh.x += sh.vx * dt;
      sh.y += sh.vy * dt;
      if (sh.x < 55 || sh.x > ARENA_W - 55) sh.vx *= -1;
      if (sh.y < 55 || sh.y > ARENA_H - 55) sh.vy *= -1;
      sh.x = clamp(sh.x, 55, ARENA_W - 55);
      sh.y = clamp(sh.y, 55, ARENA_H - 55);
      sh.angle = Math.atan2(sh.vy, sh.vx);
    }

    for (const p of alive) {
      if (p.isBot) {
        let ax = 0; let ay = 0;
        for (const sh of this.sharks) {
          const d = dist(p.x, p.y, sh.x, sh.y);
          if (d < 220 && d > 1) { ax += (p.x - sh.x) / d; ay += (p.y - sh.y) / d; }
        }
        if (ax === 0 && ay === 0 && this.stars.length) {
          const st = this.stars[0];
          const d = dist(p.x, p.y, st.x, st.y) || 1;
          ax = (st.x - p.x) / d; ay = (st.y - p.y) / d;
        }
        const len = Math.hypot(ax, ay) || 1;
        p.inputX = ax / len; p.inputY = ay / len;
      }
      p.dashCd = Math.max(0, p.dashCd - dt);
      p.dashTimer = Math.max(0, p.dashTimer - dt);
      if (p.wantAction && p.dashCd <= 0) {
        p.wantAction = false; p.dashCd = 1.8; p.dashTimer = 0.22;
        const dx = Math.hypot(p.inputX, p.inputY) > 0.1 ? p.inputX : Math.cos(p.facing);
        const dy = Math.hypot(p.inputX, p.inputY) > 0.1 ? p.inputY : Math.sin(p.facing);
        p.vx = dx * 560; p.vy = dy * 560;
        this.emitEvent('dash', { x: p.x, y: p.y, color: '#FFFFFF' });
      } else p.wantAction = false;
      if (p.dashTimer <= 0) {
        p.vx += (p.inputX * 285 - p.vx) * Math.min(1, dt * 12);
        p.vy += (p.inputY * 285 - p.vy) * Math.min(1, dt * 12);
      }
      if (Math.hypot(p.vx, p.vy) > 12) p.facing = Math.atan2(p.vy, p.vx);
      p.x = clamp(p.x + p.vx * dt, 52, ARENA_W - 52);
      p.y = clamp(p.y + p.vy * dt, 52, ARENA_H - 52);

      for (let i = this.stars.length - 1; i >= 0; i--) {
        if (dist(p.x, p.y, this.stars[i].x, this.stars[i].y) < PLAYER_RADIUS + 18) {
          this.stars.splice(i, 1);
          p.score += 25;
          this.stars.push({ x: randRange(100, ARENA_W - 100), y: randRange(90, ARENA_H - 90) });
          this.emitEvent('sfx', { sound: 'pop' });
        }
      }

      for (const sh of this.sharks) {
        if (dist(p.x, p.y, sh.x, sh.y) < PLAYER_RADIUS + 26) {
          p.alive = false;
          this.eliminationOrder.push(p.id);
          this.emitEvent('ko', { x: p.x, y: p.y, victim: p.name, killer: 'Hiu 🦈', color: p.color });
          break;
        }
      }
    }
  }

  getState() {
    return {
      gameId: this.gameId, phase: this.phase, countdown: Number(this.countdown.toFixed(1)),
      timeLeft: Number(Math.max(0, 45 - this.elapsed).toFixed(1)),
      sharks: this.sharks.map((s) => ({ x: Math.round(s.x), y: Math.round(s.y), angle: Number(s.angle.toFixed(2)) })),
      stars: this.stars.map((s) => ({ x: Math.round(s.x), y: Math.round(s.y) })),
      players: this.entities.map((e) => ({
        id: e.id, name: e.name, color: e.color, hat: e.hat, x: Math.round(e.x), y: Math.round(e.y),
        vx: Math.round(e.vx), vy: Math.round(e.vy), facing: Number(e.facing.toFixed(2)), alive: e.alive,
      })),
    };
  }
}

// =========================================================================
// 16. DODGEBALL CHAOS — Grab balls & press Action to throw supersonic shots!
// =========================================================================
export class DodgeballGame extends BaseGame {
  constructor(room, players) {
    super(room, 'dodgeball');
    this.entities = spawnRing(players, ARENA_W / 2, ARENA_H / 2, 235);
    this.entities.forEach((e) => { e.holdingBall = null; e.hits = 0; });
    this.balls = Array.from({ length: Math.min(5, Math.max(3, players.length)) }, (_, i) => ({
      id: `b${i}`,
      x: ARENA_W / 2 + (i - 1.5) * 90,
      y: ARENA_H / 2,
      vx: 0, vy: 0,
      ownerId: null,
      thrownBy: null,
      live: false,
    }));
    this.eliminationOrder = [];
  }

  update(dt) {
    const alive = this.entities.filter((e) => e.alive);
    if (this.isTeamSurvivalOver(alive) || this.elapsed >= 50) {
      const total = this.entities.length;
      return this.finishGame(this.entities.map((e) => {
        const rank = e.alive ? total : this.eliminationOrder.indexOf(e.id) + 1;
        return {
          id: e.id, name: e.name, color: e.color, hat: e.hat, isBot: e.isBot,
          score: Math.round(rank * 60 + e.hits * 45 + (e.alive ? 85 : 0)),
          detail: `🏐 ${e.hits} lemparan KO`,
        };
      }));
    }

    for (const p of alive) {
      if (p.isBot) {
        if (p.holdingBall) {
          const target = alive.filter((o) => o.id !== p.id && !this.isAlly(p, o)).sort((a, b) => dist(p.x, p.y, a.x, a.y) - dist(p.x, p.y, b.x, b.y))[0];
          if (target) {
            const d = dist(p.x, p.y, target.x, target.y) || 1;
            p.inputX = (target.x - p.x) / d; p.inputY = (target.y - p.y) / d;
            p.facing = Math.atan2(target.y - p.y, target.x - p.x);
            if (d < 420 && Math.random() < 0.08) p.wantAction = true;
          }
        } else {
          const freeBall = this.balls.filter((b) => !b.ownerId && !b.live).sort((a, b) => dist(p.x, p.y, a.x, a.y) - dist(p.x, p.y, b.x, b.y))[0];
          if (freeBall) {
            const d = dist(p.x, p.y, freeBall.x, freeBall.y) || 1;
            p.inputX = (freeBall.x - p.x) / d; p.inputY = (freeBall.y - p.y) / d;
          } else {
            p.inputX = Math.cos(this.elapsed + p.aiSeed); p.inputY = Math.sin(this.elapsed + p.aiSeed);
          }
        }
      }

      if (p.wantAction && p.holdingBall) {
        p.wantAction = false;
        const ball = p.holdingBall;
        p.holdingBall = null;
        ball.ownerId = null;
        ball.thrownBy = p.id;
        ball.live = true;
        ball.x = p.x + Math.cos(p.facing) * 34;
        ball.y = p.y + Math.sin(p.facing) * 34;
        ball.vx = Math.cos(p.facing) * 760;
        ball.vy = Math.sin(p.facing) * 760;
        this.emitEvent('dash', { x: p.x, y: p.y, color: '#FF5E7E' });
      } else {
        p.wantAction = false;
      }

      p.vx += (p.inputX * 280 - p.vx) * Math.min(1, dt * 13);
      p.vy += (p.inputY * 280 - p.vy) * Math.min(1, dt * 13);
      if (Math.hypot(p.vx, p.vy) > 12) p.facing = Math.atan2(p.vy, p.vx);
      p.x = clamp(p.x + p.vx * dt, 52, ARENA_W - 52);
      p.y = clamp(p.y + p.vy * dt, 52, ARENA_H - 52);
    }

    for (const b of this.balls) {
      if (b.ownerId) {
        const own = this.entities.find((e) => e.id === b.ownerId && e.alive);
        if (!own) { b.ownerId = null; continue; }
        b.x = own.x + Math.cos(own.facing) * 26;
        b.y = own.y + Math.sin(own.facing) * 26;
        continue;
      }

      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vx *= Math.pow(0.45, dt);
      b.vy *= Math.pow(0.45, dt);
      if (b.x < 42 || b.x > ARENA_W - 42) { b.vx *= -0.82; b.x = clamp(b.x, 42, ARENA_W - 42); }
      if (b.y < 42 || b.y > ARENA_H - 42) { b.vy *= -0.82; b.y = clamp(b.y, 42, ARENA_H - 42); }
      if (Math.hypot(b.vx, b.vy) < 160) { b.live = false; b.thrownBy = null; }

      for (const p of alive) {
        if (!p.alive) continue;
        if (dist(p.x, p.y, b.x, b.y) < PLAYER_RADIUS + 17) {
          if (b.live && b.thrownBy !== p.id) {
            const thrower = this.entities.find((e) => e.id === b.thrownBy);
            if (thrower && this.isAlly(thrower, p)) {
              b.vx *= -0.5; b.vy *= -0.5;
              continue;
            }
            p.alive = false;
            this.eliminationOrder.push(p.id);
            if (thrower) thrower.hits += 1;
            if (p.holdingBall) { p.holdingBall.ownerId = null; p.holdingBall = null; }
            b.vx *= -0.4; b.vy *= -0.4; b.live = false;
            this.emitEvent('explode', { x: p.x, y: p.y, name: p.name, color: p.color });
          } else if (!b.live && !p.holdingBall) {
            b.ownerId = p.id;
            p.holdingBall = b;
            this.emitEvent('sfx', { sound: 'pop' });
          }
        }
      }
    }
  }

  getState() {
    return {
      gameId: this.gameId, phase: this.phase, countdown: Number(this.countdown.toFixed(1)),
      timeLeft: Number(Math.max(0, 50 - this.elapsed).toFixed(1)),
      balls: this.balls.map((b) => ({ x: Math.round(b.x), y: Math.round(b.y), live: b.live })),
      players: this.entities.map((e) => ({
        id: e.id, name: e.name, color: e.color, hat: e.hat, x: Math.round(e.x), y: Math.round(e.y),
        vx: Math.round(e.vx), vy: Math.round(e.vy), facing: Number(e.facing.toFixed(2)),
        alive: e.alive, hasBall: !!e.holdingBall,
      })),
    };
  }
}

// =========================================================================
// 17. TURBO DASH RACE — 3-Lap Obstacle Sprint with Boosts, Mud & Spinners!
// =========================================================================
const RACE_BOOSTS = [
  { x: 340, y: 165, r: 30 }, { x: 340, y: 455, r: 30 },
  { x: 640, y: 310, r: 32 }, { x: 940, y: 175, r: 30 }, { x: 940, y: 445, r: 30 },
];
const RACE_MUD = [
  { x: 490, y: 260, r: 58 }, { x: 790, y: 365, r: 62 },
];

export class TurboRaceGame extends BaseGame {
  constructor(room, players) {
    super(room, 'turbo-race');
    const n = Math.max(players.length, 1);
    this.entities = players.map((p, i) => ({
      id: p.id, name: p.name, color: p.color, hat: p.hat, isBot: !!p.isBot,
      x: 95, y: n === 1 ? ARENA_H / 2 : 90 + (i / (n - 1)) * (ARENA_H - 180),
      vx: 0, vy: 0, facing: 0, alive: true, score: 0, lap: 1, targetSide: 'right', finishedAt: null,
      dashCd: 0, dashTimer: 0, boostTimer: 0, inputX: 0, inputY: 0, wantAction: false, aiSeed: Math.random() * 50,
    }));
    this.finishOrder = [];
    this.barAngle = 0;
  }

  update(dt) {
    this.barAngle += 1.65 * dt;
    if (this.elapsed >= 45 || this.entities.every((e) => e.finishedAt !== null)) {
      return this.finishGame(this.entities.map((e) => {
        const idx = this.finishOrder.indexOf(e.id);
        const progress = e.lap * 1000 + (e.targetSide === 'right' ? e.x : (ARENA_W - e.x));
        const score = idx >= 0 ? Math.max(120, 320 - idx * 40) : Math.round((progress / 4280) * 110);
        return {
          id: e.id, name: e.name, color: e.color, hat: e.hat, isBot: e.isBot,
          score, detail: idx >= 0 ? `🏁 Finis #${idx + 1}!` : `Lap ${e.lap}/3`,
        };
      }));
    }

    for (const p of this.entities) {
      if (p.finishedAt !== null) continue;
      p.dashCd = Math.max(0, p.dashCd - dt);
      p.dashTimer = Math.max(0, p.dashTimer - dt);
      p.boostTimer = Math.max(0, p.boostTimer - dt);

      if (p.isBot) {
        const tx = p.targetSide === 'right' ? ARENA_W - 75 : 75;
        const ty = ARENA_H / 2 + Math.sin(this.elapsed * 2 + p.aiSeed) * 180;
        const d = dist(p.x, p.y, tx, ty) || 1;
        p.inputX = (tx - p.x) / d; p.inputY = (ty - p.y) / d;
        if (p.dashCd <= 0) p.wantAction = true;
      }

      if (p.wantAction && p.dashCd <= 0) {
        p.wantAction = false; p.dashCd = 1.8; p.dashTimer = 0.24;
        const dx = Math.hypot(p.inputX, p.inputY) > 0.1 ? p.inputX : Math.cos(p.facing);
        const dy = Math.hypot(p.inputX, p.inputY) > 0.1 ? p.inputY : Math.sin(p.facing);
        p.vx = dx * 610; p.vy = dy * 610;
        this.emitEvent('dash', { x: p.x, y: p.y, color: p.color });
      } else p.wantAction = false;

      const inMud = RACE_MUD.some((m) => dist(p.x, p.y, m.x, m.y) < m.r);
      const spd = (inMud ? 155 : 290) * (p.boostTimer > 0 ? 1.4 : 1);
      if (p.dashTimer <= 0) {
        p.vx += (p.inputX * spd - p.vx) * Math.min(1, dt * 13);
        p.vy += (p.inputY * spd - p.vy) * Math.min(1, dt * 13);
      }
      if (Math.hypot(p.vx, p.vy) > 12) p.facing = Math.atan2(p.vy, p.vx);
      p.x = clamp(p.x + p.vx * dt, 48, ARENA_W - 48);
      p.y = clamp(p.y + p.vy * dt, 48, ARENA_H - 48);

      for (const b of RACE_BOOSTS) {
        if (dist(p.x, p.y, b.x, b.y) < PLAYER_RADIUS + b.r && p.boostTimer <= 0.2) {
          p.boostTimer = 1.4;
          this.emitEvent('boost', { x: b.x, y: b.y, color: '#FACC15' });
        }
      }

      // Rotating center bumper bar knocks racers back
      const dx = p.x - ARENA_W / 2; const dy = p.y - ARENA_H / 2;
      if (Math.hypot(dx, dy) < 175) {
        const lineD = Math.abs(-Math.sin(this.barAngle) * dx + Math.cos(this.barAngle) * dy);
        if (lineD < 26) {
          p.vx = -Math.cos(p.facing) * 380;
          p.vy = -Math.sin(p.facing) * 380;
          this.emitEvent('bump', { x: p.x, y: p.y, heavy: true });
        }
      }

      // Checkpoint lap flip
      if (p.targetSide === 'right' && p.x >= ARENA_W - 95) {
        if (p.lap >= 3) {
          p.finishedAt = this.elapsed;
          this.finishOrder.push(p.id);
          this.emitEvent('popup', { x: p.x - 40, y: p.y - 24, text: `🏁 #${this.finishOrder.length}!`, color: '#22C55E' });
          this.emitEvent('sfx', { sound: 'correct' });
        } else {
          p.lap += 1; p.targetSide = 'left';
          this.emitEvent('popup', { x: p.x - 40, y: p.y - 24, text: `🔄 LAP ${p.lap}/3!`, color: '#38BDF8' });
          this.emitEvent('sfx', { sound: 'powerup' });
        }
      } else if (p.targetSide === 'left' && p.x <= 95) {
        p.lap += 1; p.targetSide = 'right';
        this.emitEvent('popup', { x: p.x + 40, y: p.y - 24, text: `🔥 FINAL LAP 3/3!`, color: '#FACC15' });
        this.emitEvent('sfx', { sound: 'powerup' });
      }
    }
  }

  getState() {
    return {
      gameId: this.gameId, phase: this.phase, countdown: Number(this.countdown.toFixed(1)),
      timeLeft: Number(Math.max(0, 45 - this.elapsed).toFixed(1)),
      boosts: RACE_BOOSTS, mud: RACE_MUD, barAngle: Number(this.barAngle.toFixed(3)),
      players: this.entities.map((e) => ({
        id: e.id, name: e.name, color: e.color, hat: e.hat, x: Math.round(e.x), y: Math.round(e.y),
        vx: Math.round(e.vx), vy: Math.round(e.vy), facing: Number(e.facing.toFixed(2)),
        alive: true, lap: e.lap, targetSide: e.targetSide, boost: e.boostTimer > 0,
      })),
    };
  }
}
