import { ARENA_W, ARENA_H, PLAYER_RADIUS, BaseGame, clamp, dist, randRange, spawnRing } from './base-game.js';

// =========================================================================
// 21. DASH BLADE — Competitive 3-HP PvP Slash & Clash Duel!
// =========================================================================
export class DashBladeGame extends BaseGame {
  constructor(room, players) {
    super(room, 'dash-blade');
    this.entities = spawnRing(players, ARENA_W / 2, ARENA_H / 2, 240);
    this.entities.forEach((e) => {
      e.hp = 3;
      e.maxHp = 3;
      e.kills = 0;
      e.invuln = 0;
      e.powerTimer = 0;
    });
    this.orbs = [];
    this.nextOrb = 4.0;
    this.eliminationOrder = [];
  }

  update(dt) {
    const alive = this.entities.filter((e) => e.alive);
    if (this.isTeamSurvivalOver(alive) || this.elapsed >= 55) {
      const total = this.entities.length;
      return this.finishGame(this.entities.map((e) => {
        const rank = e.alive ? total : this.eliminationOrder.indexOf(e.id) + 1;
        return {
          id: e.id, name: e.name, color: e.color, hat: e.hat, isBot: e.isBot,
          score: Math.round(rank * 60 + e.kills * 70 + (e.alive ? 90 : 0)),
          detail: `⚔️ ${e.kills} Kill${e.alive ? ' • Sang Pendekar!' : ''}`,
        };
      }));
    }

    this.nextOrb -= dt;
    if (this.nextOrb <= 0 && this.orbs.length < 2) {
      this.nextOrb = randRange(5.0, 7.5);
      this.orbs.push({
        type: Math.random() < 0.5 ? 'heal' : 'fury',
        x: randRange(220, ARENA_W - 220),
        y: randRange(140, ARENA_H - 140),
      });
    }

    for (const p of alive) {
      p.dashCd = Math.max(0, p.dashCd - dt);
      p.dashTimer = Math.max(0, p.dashTimer - dt);
      p.invuln = Math.max(0, p.invuln - dt);
      p.powerTimer = Math.max(0, p.powerTimer - dt);

      if (p.isBot) {
        const rival = alive.filter((o) => o.id !== p.id && !this.isAlly(p, o)).sort((a, b) => dist(p.x, p.y, a.x, a.y) - dist(p.x, p.y, b.x, b.y))[0];
        const orb = p.hp < 3 ? this.orbs.find((o) => o.type === 'heal') : this.orbs[0];
        const target = (orb && dist(p.x, p.y, orb.x, orb.y) < 220) ? orb : rival;
        if (target) {
          const d = dist(p.x, p.y, target.x, target.y) || 1;
          p.inputX = (target.x - p.x) / d;
          p.inputY = (target.y - p.y) / d;
          if (rival && dist(p.x, p.y, rival.x, rival.y) < 165 && p.dashCd <= 0) p.wantAction = true;
        }
      }

      if (p.wantAction && p.dashCd <= 0) {
        p.wantAction = false;
        p.dashCd = p.powerTimer > 0 ? 0.95 : 1.55;
        p.dashTimer = 0.28;
        const dx = Math.hypot(p.inputX, p.inputY) > 0.1 ? p.inputX : Math.cos(p.facing);
        const dy = Math.hypot(p.inputX, p.inputY) > 0.1 ? p.inputY : Math.sin(p.facing);
        p.vx = dx * 690;
        p.vy = dy * 690;
        this.emitEvent('dash', { x: p.x, y: p.y, color: p.powerTimer > 0 ? '#FACC15' : p.color });
      } else {
        p.wantAction = false;
      }

      if (p.dashTimer <= 0) {
        p.vx += (p.inputX * 285 - p.vx) * Math.min(1, dt * 13);
        p.vy += (p.inputY * 285 - p.vy) * Math.min(1, dt * 13);
      }
      if (Math.hypot(p.vx, p.vy) > 15) p.facing = Math.atan2(p.vy, p.vx);
      p.x = clamp(p.x + p.vx * dt, 48, ARENA_W - 48);
      p.y = clamp(p.y + p.vy * dt, 48, ARENA_H - 48);

      for (let i = this.orbs.length - 1; i >= 0; i--) {
        const o = this.orbs[i];
        if (dist(p.x, p.y, o.x, o.y) < PLAYER_RADIUS + 20) {
          this.orbs.splice(i, 1);
          if (o.type === 'heal') {
            p.hp = Math.min(p.maxHp, p.hp + 1);
            this.emitEvent('popup', { x: p.x, y: p.y - 26, text: '❤️ +1 HP!', color: '#4ADE80' });
          } else {
            p.powerTimer = 6;
            this.emitEvent('popup', { x: p.x, y: p.y - 26, text: '⚔️ FURY SLASH!', color: '#FACC15' });
          }
          this.emitEvent('sfx', { sound: 'powerup' });
        }
      }
    }

    // Sword slash & clash combat!
    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        const a = alive[i];
        const b = alive[j];
        if (!a.alive || !b.alive || this.isAlly(a, b)) continue;
        const d = dist(a.x, a.y, b.x, b.y);
        if (d < PLAYER_RADIUS * 2.25 && d > 0.1) {
          const nx = (b.x - a.x) / d;
          const ny = (b.y - a.y) / d;
          const aSlash = a.dashTimer > 0;
          const bSlash = b.dashTimer > 0;

          if (aSlash && bSlash) {
            // Epic sword CLASH!
            a.vx = -nx * 460; a.vy = -ny * 460;
            b.vx = nx * 460; b.vy = ny * 460;
            a.dashTimer = 0; b.dashTimer = 0;
            this.emitEvent('bump', { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, heavy: true });
            this.emitEvent('popup', { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 22, text: '⚔️ CLASH!', color: '#FACC15' });
          } else if (aSlash && b.invuln <= 0) {
            this._hit(a, b, nx, ny);
          } else if (bSlash && a.invuln <= 0) {
            this._hit(b, a, -nx, -ny);
          } else {
            a.vx -= nx * 130; a.vy -= ny * 130;
            b.vx += nx * 130; b.vy += ny * 130;
          }
        }
      }
    }
  }

  _hit(attacker, victim, nx, ny) {
    const dmg = attacker.powerTimer > 0 ? 2 : 1;
    victim.hp -= dmg;
    victim.invuln = 0.75;
    victim.vx = nx * 490;
    victim.vy = ny * 490;
    attacker.dashTimer = 0;
    this.emitEvent('bump', { x: victim.x, y: victim.y, heavy: true });
    this.emitEvent('popup', { x: victim.x, y: victim.y - 26, text: `💥 -${dmg} HP!`, color: '#EF4444' });
    if (victim.hp <= 0) {
      victim.alive = false;
      attacker.kills += 1;
      this.eliminationOrder.push(victim.id);
      this.emitEvent('explode', { x: victim.x, y: victim.y, name: victim.name, color: victim.color });
    }
  }

  getState() {
    return {
      gameId: this.gameId, phase: this.phase, countdown: Number(this.countdown.toFixed(1)),
      timeLeft: Number(Math.max(0, 55 - this.elapsed).toFixed(1)),
      orbs: this.orbs,
      players: this.entities.map((e) => ({
        id: e.id, name: e.name, color: e.color, hat: e.hat, x: Math.round(e.x), y: Math.round(e.y),
        vx: Math.round(e.vx), vy: Math.round(e.vy), facing: Number(e.facing.toFixed(2)),
        alive: e.alive, hp: e.hp, slashing: e.dashTimer > 0, fury: e.powerTimer > 0, invuln: e.invuln > 0,
      })),
    };
  }
}

// =========================================================================
// 22. RICOCHET ARENA — Tactical Bouncy Skill-Shot Cover Shooter!
// =========================================================================
const COVER_PILLARS = [
  { x: 350, y: 195, w: 68, h: 68 },
  { x: 862, y: 195, w: 68, h: 68 },
  { x: 350, y: 360, w: 68, h: 68 },
  { x: 862, y: 360, w: 68, h: 68 },
  { x: 606, y: 276, w: 68, h: 68 },
];

export class RicochetDuelGame extends BaseGame {
  constructor(room, players) {
    super(room, 'ricochet-duel');
    this.entities = spawnRing(players, ARENA_W / 2, ARENA_H / 2, 245);
    this.entities.forEach((e) => { e.hp = 3; e.kills = 0; e.shootCd = 0; e.invuln = 0; });
    this.bullets = [];
    this.eliminationOrder = [];
  }

  update(dt) {
    const alive = this.entities.filter((e) => e.alive);
    if (this.isTeamSurvivalOver(alive) || this.elapsed >= 55) {
      const total = this.entities.length;
      return this.finishGame(this.entities.map((e) => {
        const rank = e.alive ? total : this.eliminationOrder.indexOf(e.id) + 1;
        return {
          id: e.id, name: e.name, color: e.color, hat: e.hat, isBot: e.isBot,
          score: Math.round(rank * 60 + e.kills * 75 + (e.alive ? 90 : 0)),
          detail: `🎯 ${e.kills} Kill${e.alive ? ' • Sniper Juara!' : ''}`,
        };
      }));
    }

    for (const p of alive) {
      p.shootCd = Math.max(0, p.shootCd - dt);
      p.invuln = Math.max(0, p.invuln - dt);

      if (p.isBot) {
        const target = alive.filter((o) => o.id !== p.id && !this.isAlly(p, o)).sort((a, b) => dist(p.x, p.y, a.x, a.y) - dist(p.x, p.y, b.x, b.y))[0];
        if (target) {
          const d = dist(p.x, p.y, target.x, target.y) || 1;
          const strafe = Math.sin(this.elapsed * 2 + p.aiSeed);
          const ang = Math.atan2(target.y - p.y, target.x - p.x);
          p.facing = ang;
          p.inputX = Math.cos(ang + strafe * 1.1) * (d > 260 ? 1 : -0.4);
          p.inputY = Math.sin(ang + strafe * 1.1) * (d > 260 ? 1 : -0.4);
          if (p.shootCd <= 0 && d < 560) p.wantAction = true;
        }
      }

      if (p.wantAction && p.shootCd <= 0) {
        p.wantAction = false;
        p.shootCd = 0.62;
        this.bullets.push({
          ownerId: p.id, color: p.color,
          x: p.x + Math.cos(p.facing) * 30,
          y: p.y + Math.sin(p.facing) * 30,
          vx: Math.cos(p.facing) * 620,
          vy: Math.sin(p.facing) * 620,
          bounces: 2,
          life: 2.8,
        });
        this.emitEvent('sfx', { sound: 'laser' });
      } else {
        p.wantAction = false;
      }

      p.vx += (p.inputX * 265 - p.vx) * Math.min(1, dt * 13);
      p.vy += (p.inputY * 265 - p.vy) * Math.min(1, dt * 13);
      if (Math.hypot(p.vx, p.vy) > 15 && !p.isBot) p.facing = Math.atan2(p.vy, p.vx);
      p.x = clamp(p.x + p.vx * dt, 48, ARENA_W - 48);
      p.y = clamp(p.y + p.vy * dt, 48, ARENA_H - 48);

      // Push out of cover pillars
      for (const box of COVER_PILLARS) {
        const cx = clamp(p.x, box.x, box.x + box.w);
        const cy = clamp(p.y, box.y, box.y + box.h);
        const d = dist(p.x, p.y, cx, cy);
        if (d < PLAYER_RADIUS && d > 0.01) {
          p.x += ((p.x - cx) / d) * (PLAYER_RADIUS - d);
          p.y += ((p.y - cy) / d) * (PLAYER_RADIUS - d);
        }
      }
    }

    // Update bouncy energy bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.life <= 0) { this.bullets.splice(i, 1); continue; }

      // Wall bounce
      let bounced = false;
      if (b.x < 36 || b.x > ARENA_W - 36) { b.vx *= -1; b.x = clamp(b.x, 36, ARENA_W - 36); bounced = true; }
      if (b.y < 36 || b.y > ARENA_H - 36) { b.vy *= -1; b.y = clamp(b.y, 36, ARENA_H - 36); bounced = true; }

      // Pillar bounce
      for (const box of COVER_PILLARS) {
        if (b.x > box.x - 8 && b.x < box.x + box.w + 8 && b.y > box.y - 8 && b.y < box.y + box.h + 8) {
          const fromLeft = Math.abs(b.x - box.x);
          const fromRight = Math.abs(b.x - (box.x + box.w));
          const fromTop = Math.abs(b.y - box.y);
          const fromBot = Math.abs(b.y - (box.y + box.h));
          const m = Math.min(fromLeft, fromRight, fromTop, fromBot);
          if (m === fromLeft || m === fromRight) b.vx *= -1; else b.vy *= -1;
          bounced = true;
          break;
        }
      }

      if (bounced) {
        b.bounces -= 1;
        this.emitEvent('sfx', { sound: 'pop' });
        if (b.bounces < 0) { this.bullets.splice(i, 1); continue; }
      }

      // Hit check
      let hitDone = false;
      const shooterObj = this.entities.find((e) => e.id === b.ownerId);
      for (const p of alive) {
        if (!p.alive || p.invuln > 0) continue;
        if (b.ownerId === p.id && b.bounces === 2) continue; // own shot can't self-hit immediately
        if (shooterObj && this.isAlly(shooterObj, p)) continue; // no friendly fire in Team Mode!
        if (dist(b.x, b.y, p.x, p.y) < PLAYER_RADIUS + 10) {
          p.hp -= 1;
          p.invuln = 0.5;
          this.emitEvent('bump', { x: p.x, y: p.y, heavy: true });
          this.emitEvent('popup', { x: p.x, y: p.y - 24, text: '🎯 KENA! -1 HP', color: '#EF4444' });
          if (p.hp <= 0) {
            p.alive = false;
            this.eliminationOrder.push(p.id);
            const shooter = this.entities.find((e) => e.id === b.ownerId);
            if (shooter && shooter.id !== p.id) shooter.kills += 1;
            this.emitEvent('explode', { x: p.x, y: p.y, name: p.name, color: p.color });
          }
          this.bullets.splice(i, 1);
          hitDone = true;
          break;
        }
      }
      if (hitDone) continue;
    }
  }

  getState() {
    return {
      gameId: this.gameId, phase: this.phase, countdown: Number(this.countdown.toFixed(1)),
      timeLeft: Number(Math.max(0, 55 - this.elapsed).toFixed(1)),
      pillars: COVER_PILLARS,
      bullets: this.bullets.map((b) => ({ x: Math.round(b.x), y: Math.round(b.y), color: b.color })),
      players: this.entities.map((e) => ({
        id: e.id, name: e.name, color: e.color, hat: e.hat, x: Math.round(e.x), y: Math.round(e.y),
        vx: Math.round(e.vx), vy: Math.round(e.vy), facing: Number(e.facing.toFixed(2)),
        alive: e.alive, hp: e.hp,
      })),
    };
  }
}

// =========================================================================
// 23. MEMORY FLOOR — Memorize Safe Tiles Before They Flip Blank & Explode!
// =========================================================================
const MEM_COLS = 5;
const MEM_ROWS = 3;

export class MemoryRushGame extends BaseGame {
  constructor(room, players) {
    super(room, 'memory-rush');
    this.entities = spawnRing(players, ARENA_W / 2, ARENA_H / 2, 180);
    this.wave = 1;
    this.maxWaves = 5;
    this.subPhase = 'preview'; // preview | hide | boom
    this.subTimer = 2.8;
    this.safeSet = []; // array of booleans length 15
    this.botMemory = new Map();
    this.eliminationOrder = [];
  }

  onStart() {
    this._setupWave();
  }

  _setupWave() {
    const total = MEM_COLS * MEM_ROWS;
    const safeCount = Math.max(3, 8 - this.wave); // 7 -> 6 -> 5 -> 4 -> 3 safe tiles!
    const indices = Array.from({ length: total }, (_, i) => i).sort(() => Math.random() - 0.5);
    this.safeSet = new Array(total).fill(false);
    for (let k = 0; k < safeCount; k++) this.safeSet[indices[k]] = true;

    this.subPhase = 'preview';
    this.subTimer = Math.max(1.5, 2.7 - this.wave * 0.22);
    this.botMemory.clear();
    for (const p of this.entities) {
      if (p.isBot && p.alive) {
        // Bots remember a safe tile 78% of the time (can also get confused!)
        const pickSafe = Math.random() < 0.78;
        const candidates = [];
        for (let i = 0; i < total; i++) if (this.safeSet[i] === pickSafe) candidates.push(i);
        this.botMemory.set(p.id, candidates[Math.floor(Math.random() * candidates.length)] ?? 0);
      }
    }
    this.emitEvent('banner', { text: `🧩 RONDE ${this.wave}/${this.maxWaves}: HAFALKAN UBIN BINTANG ⭐!` });
    this.emitEvent('sfx', { sound: 'tick' });
  }

  update(dt) {
    const alive = this.entities.filter((e) => e.alive);
    if (alive.length <= 1) {
      return this._conclude();
    }

    const padX = 110;
    const padY = 82;
    const cellW = (ARENA_W - padX * 2) / MEM_COLS;
    const cellH = (ARENA_H - padY * 2) / MEM_ROWS;

    this.subTimer -= dt;
    if (this.subPhase === 'preview' && this.subTimer <= 0) {
      this.subPhase = 'hide';
      this.subTimer = Math.max(2.1, 3.1 - this.wave * 0.2);
      this.emitEvent('banner', { text: '❓ TERTUTUP! LARI KE UBIN ⭐ SEKARANG!' });
      this.emitEvent('sfx', { sound: 'go' });
    } else if (this.subPhase === 'hide' && this.subTimer <= 0) {
      this.subPhase = 'boom';
      this.subTimer = 1.6;
      this.emitEvent('sfx', { sound: 'explode' });
      for (const p of alive) {
        const c = clamp(Math.floor((p.x - padX) / cellW), 0, MEM_COLS - 1);
        const r = clamp(Math.floor((p.y - padY) / cellH), 0, MEM_ROWS - 1);
        if (!this.safeSet[r * MEM_COLS + c]) {
          p.alive = false;
          this.eliminationOrder.push(p.id);
          this.emitEvent('explode', { x: p.x, y: p.y, name: p.name, color: p.color });
        } else {
          p.score += 65;
        }
      }
    } else if (this.subPhase === 'boom' && this.subTimer <= 0) {
      if (this.wave >= this.maxWaves || this.entities.filter((e) => e.alive).length <= 1) {
        return this._conclude();
      }
      this.wave += 1;
      this._setupWave();
    }

    for (const p of alive) {
      if (!p.alive) continue;
      p.dashCd = Math.max(0, p.dashCd - dt);
      p.dashTimer = Math.max(0, p.dashTimer - dt);

      if (p.isBot && this.subPhase !== 'boom') {
        const idx = this.botMemory.get(p.id) ?? 0;
        const tc = idx % MEM_COLS;
        const tr = Math.floor(idx / MEM_COLS);
        const tx = padX + (tc + 0.5) * cellW;
        const ty = padY + (tr + 0.5) * cellH;
        const d = dist(p.x, p.y, tx, ty);
        if (d > 22) { p.inputX = (tx - p.x) / d; p.inputY = (ty - p.y) / d; }
        else { p.inputX = 0; p.inputY = 0; }
      }

      if (p.wantAction && p.dashCd <= 0) {
        p.wantAction = false; p.dashCd = 1.9; p.dashTimer = 0.2;
        const dx = Math.hypot(p.inputX, p.inputY) > 0.1 ? p.inputX : Math.cos(p.facing);
        const dy = Math.hypot(p.inputX, p.inputY) > 0.1 ? p.inputY : Math.sin(p.facing);
        p.vx = dx * 540; p.vy = dy * 540;
        this.emitEvent('dash', { x: p.x, y: p.y, color: p.color });
      } else p.wantAction = false;

      if (p.dashTimer <= 0) {
        p.vx += (p.inputX * 290 - p.vx) * Math.min(1, dt * 13);
        p.vy += (p.inputY * 290 - p.vy) * Math.min(1, dt * 13);
      }
      if (Math.hypot(p.vx, p.vy) > 12) p.facing = Math.atan2(p.vy, p.vx);
      p.x = clamp(p.x + p.vx * dt, padX + 18, ARENA_W - padX - 18);
      p.y = clamp(p.y + p.vy * dt, padY + 18, ARENA_H - padY - 18);
    }

    // Shove opponents off remembered tiles!
    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        const a = alive[i]; const b = alive[j];
        if (!a.alive || !b.alive || this.isAlly(a, b)) continue;
        const d = dist(a.x, a.y, b.x, b.y);
        if (d < PLAYER_RADIUS * 2 && d > 0.1) {
          const nx = (b.x - a.x) / d; const ny = (b.y - a.y) / d;
          a.vx -= nx * (b.dashTimer > 0 ? 350 : 150);
          a.vy -= ny * (b.dashTimer > 0 ? 350 : 150);
          b.vx += nx * (a.dashTimer > 0 ? 350 : 150);
          b.vy += ny * (a.dashTimer > 0 ? 350 : 150);
        }
      }
    }
  }

  _conclude() {
    const total = this.entities.length;
    this.finishGame(this.entities.map((e) => {
      const rank = e.alive ? total : this.eliminationOrder.indexOf(e.id) + 1;
      return {
        id: e.id, name: e.name, color: e.color, hat: e.hat, isBot: e.isBot,
        score: Math.round(e.score + rank * 50 + (e.alive ? 85 : 0)),
        detail: e.alive ? '🧩 Ingatan Tajam!' : 'Salah Injak Ubin!',
      };
    }));
  }

  getState() {
    return {
      gameId: this.gameId, phase: this.phase, countdown: Number(this.countdown.toFixed(1)),
      wave: this.wave, maxWaves: this.maxWaves,
      subPhase: this.subPhase, subTimer: Number(Math.max(0, this.subTimer).toFixed(1)),
      cols: MEM_COLS, rows: MEM_ROWS,
      safeSet: this.subPhase === 'hide' ? null : this.safeSet,
      players: this.entities.map((e) => ({
        id: e.id, name: e.name, color: e.color, hat: e.hat, x: Math.round(e.x), y: Math.round(e.y),
        vx: Math.round(e.vx), vy: Math.round(e.vy), facing: Number(e.facing.toFixed(2)), alive: e.alive,
      })),
    };
  }
}
