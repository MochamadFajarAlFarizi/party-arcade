import { ARENA_W, ARENA_H, PLAYER_RADIUS, BaseGame, clamp, dist, randRange, spawnRing } from './base-game.js';

function moveBasic(p, dt, speed = 280, dashSpeed = 570, dashCdMax = 1.9, onDash = null) {
  p.dashCd = Math.max(0, p.dashCd - dt);
  p.dashTimer = Math.max(0, p.dashTimer - dt);
  p.stunTimer = Math.max(0, p.stunTimer - dt);
  if (p.stunTimer > 0) {
    p.vx *= 0.86;
    p.vy *= 0.86;
    p.wantAction = false;
  } else {
    if (p.wantAction && p.dashCd <= 0) {
      p.wantAction = false;
      p.dashCd = dashCdMax;
      p.dashTimer = 0.22;
      const dx = Math.hypot(p.inputX, p.inputY) > 0.1 ? p.inputX : Math.cos(p.facing);
      const dy = Math.hypot(p.inputX, p.inputY) > 0.1 ? p.inputY : Math.sin(p.facing);
      p.vx = dx * dashSpeed;
      p.vy = dy * dashSpeed;
      onDash?.();
    } else {
      p.wantAction = false;
    }
    if (p.dashTimer <= 0) {
      p.vx += (p.inputX * speed - p.vx) * Math.min(1, dt * 13);
      p.vy += (p.inputY * speed - p.vy) * Math.min(1, dt * 13);
    }
  }
  if (Math.hypot(p.vx, p.vy) > 14) p.facing = Math.atan2(p.vy, p.vx);
  p.x = clamp(p.x + p.vx * dt, 48, ARENA_W - 48);
  p.y = clamp(p.y + p.vy * dt, 48, ARENA_H - 48);
}

// =========================================================================
// 7. CROWN CHASE — Hold the golden crown as long as possible!
// =========================================================================
export class CrownChaseGame extends BaseGame {
  constructor(room, players) {
    super(room, 'crown-chase');
    this.entities = spawnRing(players, ARENA_W / 2, ARENA_H / 2, 220);
    this.entities.forEach((e) => { e.stealCd = 0; });
    this.crown = { x: ARENA_W / 2, y: ARENA_H / 2, holderId: null };
    this.duration = 45;
  }

  update(dt) {
    if (this.elapsed >= this.duration) {
      return this.finishGame(this.entities.map((e) => ({
        id: e.id, name: e.name, color: e.color, hat: e.hat, isBot: e.isBot,
        score: Math.round(e.score), detail: `${Math.round(e.score / 10)} dtk pegang mahkota`,
      })));
    }

    for (const p of this.entities) {
      p.stealCd = Math.max(0, p.stealCd - dt);
      const holding = this.crown.holderId === p.id;
      if (p.isBot) {
        if (holding) {
          const nearest = this.entities.filter((o) => o.id !== p.id).sort((a, b) => dist(p.x, p.y, a.x, a.y) - dist(p.x, p.y, b.x, b.y))[0];
          const ang = nearest ? Math.atan2(p.y - nearest.y, p.x - nearest.x) + Math.sin(this.elapsed * 2 + p.aiSeed) * 0.5 : 0;
          const tx = clamp(p.x + Math.cos(ang) * 180, 90, ARENA_W - 90);
          const ty = clamp(p.y + Math.sin(ang) * 180, 90, ARENA_H - 90);
          const d = dist(p.x, p.y, tx, ty) || 1;
          p.inputX = (tx - p.x) / d; p.inputY = (ty - p.y) / d;
          if (nearest && dist(p.x, p.y, nearest.x, nearest.y) < 110 && p.dashCd <= 0) p.wantAction = true;
        } else {
          const d = dist(p.x, p.y, this.crown.x, this.crown.y) || 1;
          p.inputX = (this.crown.x - p.x) / d; p.inputY = (this.crown.y - p.y) / d;
          if (d < 150 && p.dashCd <= 0) p.wantAction = true;
        }
      }

      moveBasic(p, dt, holding ? 252 : 292, 570, 1.8, () => this.emitEvent('dash', { x: p.x, y: p.y, color: p.color }));
      if (holding) {
        p.score += dt * 10;
        this.crown.x = p.x;
        this.crown.y = p.y - 34;
      } else if (!this.crown.holderId && dist(p.x, p.y, this.crown.x, this.crown.y) < PLAYER_RADIUS + 20) {
        this.crown.holderId = p.id;
        p.stealCd = 0.7;
        this.emitEvent('popup', { x: p.x, y: p.y - 30, text: `👑 ${p.name}!`, color: '#FFD166' });
        this.emitEvent('sfx', { sound: 'powerup' });
      }
    }

    // Steal crown on bump
    for (let i = 0; i < this.entities.length; i++) {
      for (let j = i + 1; j < this.entities.length; j++) {
        const a = this.entities[i];
        const b = this.entities[j];
        const d = dist(a.x, a.y, b.x, b.y);
        if (d < PLAYER_RADIUS * 2 && d > 0.1) {
          const nx = (b.x - a.x) / d; const ny = (b.y - a.y) / d;
          if (this.crown.holderId === a.id && a.stealCd <= 0) {
            this.crown.holderId = b.id; b.stealCd = 0.8; a.vx -= nx * 320; a.vy -= ny * 320;
            this.emitEvent('popup', { x: b.x, y: b.y - 30, text: '👑 REBUT!', color: '#FFD166' });
            this.emitEvent('sfx', { sound: 'pass' });
          } else if (this.crown.holderId === b.id && b.stealCd <= 0) {
            this.crown.holderId = a.id; a.stealCd = 0.8; b.vx += nx * 320; b.vy += ny * 320;
            this.emitEvent('popup', { x: a.x, y: a.y - 30, text: '👑 REBUT!', color: '#FFD166' });
            this.emitEvent('sfx', { sound: 'pass' });
          }
        }
      }
    }
  }

  getState() {
    return {
      gameId: this.gameId, phase: this.phase, countdown: Number(this.countdown.toFixed(1)),
      timeLeft: Number(Math.max(0, this.duration - this.elapsed).toFixed(1)),
      crown: this.crown,
      players: this.entities.map((e) => ({
        id: e.id, name: e.name, color: e.color, hat: e.hat, x: Math.round(e.x), y: Math.round(e.y),
        vx: Math.round(e.vx), vy: Math.round(e.vy), facing: Number(e.facing.toFixed(2)),
        alive: true, score: Math.round(e.score), hasCrown: this.crown.holderId === e.id,
      })),
    };
  }
}

// =========================================================================
// 8. COIN RUSH — Collect coins & diamonds, dash opponents to spill coins!
// =========================================================================
export class CoinRushGame extends BaseGame {
  constructor(room, players) {
    super(room, 'coin-rush');
    this.entities = spawnRing(players, ARENA_W / 2, ARENA_H / 2, 200);
    this.items = [];
    this.spawnCd = 0.2;
    this.duration = 42;
  }

  _spawnItem(kind = null, x = null, y = null) {
    const type = kind || (Math.random() < 0.14 ? 'bomb' : Math.random() < 0.22 ? 'gem' : 'coin');
    this.items.push({
      id: Math.random().toString(36).slice(2, 7),
      type,
      x: x ?? randRange(80, ARENA_W - 80),
      y: y ?? randRange(80, ARENA_H - 80),
      val: type === 'gem' ? 40 : type === 'coin' ? 12 : -30,
    });
  }

  update(dt) {
    if (this.elapsed >= this.duration) {
      return this.finishGame(this.entities.map((e) => ({
        id: e.id, name: e.name, color: e.color, hat: e.hat, isBot: e.isBot,
        score: Math.max(0, Math.round(e.score)), detail: `💰 ${Math.max(0, Math.round(e.score))} koin`,
      })));
    }
    this.spawnCd -= dt;
    if (this.spawnCd <= 0 && this.items.length < 22) {
      this.spawnCd = 0.45;
      this._spawnItem();
    }

    for (const p of this.entities) {
      if (p.isBot) {
        const good = this.items.filter((it) => it.type !== 'bomb');
        const target = good.sort((a, b) => (dist(p.x, p.y, a.x, a.y) / (a.type === 'gem' ? 2 : 1)) - (dist(p.x, p.y, b.x, b.y) / (b.type === 'gem' ? 2 : 1)))[0];
        if (target) {
          const d = dist(p.x, p.y, target.x, target.y) || 1;
          p.inputX = (target.x - p.x) / d; p.inputY = (target.y - p.y) / d;
          if (d < 130 && target.type === 'gem' && p.dashCd <= 0) p.wantAction = true;
        }
      }
      moveBasic(p, dt, 290, 580, 1.8, () => this.emitEvent('dash', { x: p.x, y: p.y, color: p.color }));

      for (let i = this.items.length - 1; i >= 0; i--) {
        const it = this.items[i];
        if (dist(p.x, p.y, it.x, it.y) < PLAYER_RADIUS + 16) {
          this.items.splice(i, 1);
          p.score = Math.max(0, p.score + it.val);
          if (it.type === 'bomb') {
            p.stunTimer = 0.85;
            this.emitEvent('explode', { x: it.x, y: it.y, name: p.name, color: '#EF4444' });
          } else {
            this.emitEvent('popup', { x: it.x, y: it.y - 16, text: `+${it.val}`, color: it.type === 'gem' ? '#38BDF8' : '#FACC15' });
            this.emitEvent('sfx', { sound: it.type === 'gem' ? 'powerup' : 'pop' });
          }
        }
      }
    }

    // Dash-bump spills 2 coins!
    for (let i = 0; i < this.entities.length; i++) {
      for (let j = i + 1; j < this.entities.length; j++) {
        const a = this.entities[i]; const b = this.entities[j];
        const d = dist(a.x, a.y, b.x, b.y);
        if (d < PLAYER_RADIUS * 2 && d > 0.1) {
          const nx = (b.x - a.x) / d; const ny = (b.y - a.y) / d;
          if (a.dashTimer > 0 && b.stunTimer <= 0) {
            b.stunTimer = 0.7; b.vx = nx * 360; b.vy = ny * 360;
            if (b.score >= 24) {
              b.score -= 24;
              this._spawnItem('coin', clamp(b.x + nx * 60, 70, ARENA_W - 70), clamp(b.y + ny * 60, 70, ARENA_H - 70));
              this._spawnItem('coin', clamp(b.x - ny * 60, 70, ARENA_W - 70), clamp(b.y + nx * 60, 70, ARENA_H - 70));
            }
            this.emitEvent('bump', { x: b.x, y: b.y, heavy: true });
          } else if (b.dashTimer > 0 && a.stunTimer <= 0) {
            a.stunTimer = 0.7; a.vx = -nx * 360; a.vy = -ny * 360;
            if (a.score >= 24) {
              a.score -= 24;
              this._spawnItem('coin', clamp(a.x - nx * 60, 70, ARENA_W - 70), clamp(a.y - ny * 60, 70, ARENA_H - 70));
              this._spawnItem('coin', clamp(a.x + ny * 60, 70, ARENA_W - 70), clamp(a.y - nx * 60, 70, ARENA_H - 70));
            }
            this.emitEvent('bump', { x: a.x, y: a.y, heavy: true });
          }
        }
      }
    }
  }

  getState() {
    return {
      gameId: this.gameId, phase: this.phase, countdown: Number(this.countdown.toFixed(1)),
      timeLeft: Number(Math.max(0, this.duration - this.elapsed).toFixed(1)),
      items: this.items,
      players: this.entities.map((e) => ({
        id: e.id, name: e.name, color: e.color, hat: e.hat, x: Math.round(e.x), y: Math.round(e.y),
        vx: Math.round(e.vx), vy: Math.round(e.vy), facing: Number(e.facing.toFixed(2)),
        alive: true, stunned: e.stunTimer > 0, score: Math.round(e.score),
      })),
    };
  }
}

// =========================================================================
// 9. ZOMBIE TAG — Infection outbreak! Humans survive, zombies infect!
// =========================================================================
export class ZombieTagGame extends BaseGame {
  constructor(room, players) {
    super(room, 'zombie-tag');
    this.entities = spawnRing(players, ARENA_W / 2, ARENA_H / 2, 240);
    this.entities.forEach((e) => { e.zombie = false; e.infects = 0; });
    this.duration = 40;
  }

  onStart() {
    const first = this.entities[Math.floor(Math.random() * this.entities.length)];
    first.zombie = true;
    this.emitEvent('banner', { text: `🧟 ${first.name} JADI ZOMBI PERTAMA! LARI!!` });
  }

  update(dt) {
    const humans = this.entities.filter((e) => !e.zombie);
    if (this.elapsed >= this.duration || humans.length === 0) {
      return this.finishGame(this.entities.map((e) => ({
        id: e.id, name: e.name, color: e.color, hat: e.hat, isBot: e.isBot,
        score: Math.round(e.score + (!e.zombie ? 110 : 0)),
        detail: !e.zombie ? '🧬 Selamat dari Wabah!' : `🧟 ${e.infects} infeksi`,
      })));
    }

    const zombies = this.entities.filter((e) => e.zombie);
    for (const p of this.entities) {
      if (p.isBot) {
        if (p.zombie) {
          const target = humans.sort((a, b) => dist(p.x, p.y, a.x, a.y) - dist(p.x, p.y, b.x, b.y))[0];
          if (target) {
            const d = dist(p.x, p.y, target.x, target.y) || 1;
            p.inputX = (target.x - p.x) / d; p.inputY = (target.y - p.y) / d;
            if (d < 140 && p.dashCd <= 0) p.wantAction = true;
          }
        } else {
          const threat = zombies.sort((a, b) => dist(p.x, p.y, a.x, a.y) - dist(p.x, p.y, b.x, b.y))[0];
          const ang = threat ? Math.atan2(p.y - threat.y, p.x - threat.x) + Math.sin(this.elapsed * 2 + p.aiSeed) * 0.45 : 0;
          const tx = clamp(p.x + Math.cos(ang) * 200, 80, ARENA_W - 80);
          const ty = clamp(p.y + Math.sin(ang) * 200, 80, ARENA_H - 80);
          const d = dist(p.x, p.y, tx, ty) || 1;
          p.inputX = (tx - p.x) / d; p.inputY = (ty - p.y) / d;
          if (threat && dist(p.x, p.y, threat.x, threat.y) < 115 && p.dashCd <= 0) p.wantAction = true;
        }
      }
      moveBasic(p, dt, p.zombie ? 295 : 272, p.zombie ? 600 : 540, 1.9, () => this.emitEvent('dash', { x: p.x, y: p.y, color: p.zombie ? '#22C55E' : p.color }));
      if (!p.zombie) p.score += dt * 6;
    }

    for (const z of zombies) {
      for (const h of humans) {
        if (h.zombie) continue;
        if (dist(z.x, z.y, h.x, h.y) < PLAYER_RADIUS * 2) {
          h.zombie = true;
          z.infects += 1;
          z.score += 85;
          this.emitEvent('popup', { x: h.x, y: h.y - 26, text: '🧟 TERINFEKSI!', color: '#4ADE80' });
          this.emitEvent('sfx', { sound: 'explode' });
        }
      }
    }
  }

  getState() {
    return {
      gameId: this.gameId, phase: this.phase, countdown: Number(this.countdown.toFixed(1)),
      timeLeft: Number(Math.max(0, this.duration - this.elapsed).toFixed(1)),
      humansLeft: this.entities.filter((e) => !e.zombie).length,
      players: this.entities.map((e) => ({
        id: e.id, name: e.name, color: e.zombie ? '#22C55E' : e.color, hat: e.hat,
        x: Math.round(e.x), y: Math.round(e.y), vx: Math.round(e.vx), vy: Math.round(e.vy),
        facing: Number(e.facing.toFixed(2)), alive: true, zombie: e.zombie, score: Math.round(e.score),
      })),
    };
  }
}

// =========================================================================
// 10. BUMPER SOCCER — Chaotic 2-Team Cartoon Football!
// =========================================================================
export class BumperSoccerGame extends BaseGame {
  constructor(room, players) {
    super(room, 'bumper-soccer');
    this.entities = players.map((p, i) => {
      const team = i % 2 === 0 ? 'red' : 'blue';
      return {
        id: p.id, name: p.name, color: team === 'red' ? '#FF5E7E' : '#38BDF8', hat: p.hat, isBot: !!p.isBot,
        team, x: team === 'red' ? 280 : ARENA_W - 280, y: 160 + Math.floor(i / 2) * 110,
        vx: 0, vy: 0, facing: team === 'red' ? 0 : Math.PI, alive: true, score: 0, goals: 0,
        dashCd: 0, dashTimer: 0, stunTimer: 0, inputX: 0, inputY: 0, wantAction: false, aiSeed: Math.random() * 50,
      };
    });
    this.ball = { x: ARENA_W / 2, y: ARENA_H / 2, vx: 0, vy: 0, r: 28, lastTouch: null };
    this.teamScore = { red: 0, blue: 0 };
    this.duration = 55;
  }

  _resetKickoff() {
    this.ball.x = ARENA_W / 2; this.ball.y = ARENA_H / 2; this.ball.vx = 0; this.ball.vy = 0;
    this.entities.forEach((p, i) => {
      p.x = p.team === 'red' ? 280 : ARENA_W - 280;
      p.y = clamp(180 + Math.floor(i / 2) * 110, 120, ARENA_H - 120);
      p.vx = 0; p.vy = 0;
    });
  }

  update(dt) {
    if (this.elapsed >= this.duration) {
      const winTeam = this.teamScore.red > this.teamScore.blue ? 'red' : this.teamScore.blue > this.teamScore.red ? 'blue' : 'draw';
      return this.finishGame(this.entities.map((e) => ({
        id: e.id, name: e.name, color: e.color, hat: e.hat, isBot: e.isBot,
        score: (e.team === winTeam ? 180 : winTeam === 'draw' ? 100 : 50) + e.goals * 60,
        detail: `Tim ${e.team === 'red' ? 'Merah' : 'Biru'} (${this.teamScore.red}-${this.teamScore.blue}) • ${e.goals} gol`,
      })));
    }

    for (const p of this.entities) {
      if (p.isBot) {
        // Position slightly behind ball relative to opponent goal
        const goalX = p.team === 'red' ? ARENA_W - 40 : 40;
        const ang = Math.atan2(ARENA_H / 2 - this.ball.y, goalX - this.ball.x);
        const tx = this.ball.x - Math.cos(ang) * 28;
        const ty = this.ball.y - Math.sin(ang) * 28;
        const d = dist(p.x, p.y, tx, ty) || 1;
        p.inputX = (tx - p.x) / d; p.inputY = (ty - p.y) / d;
        if (dist(p.x, p.y, this.ball.x, this.ball.y) < 110 && p.dashCd <= 0) p.wantAction = true;
      }
      moveBasic(p, dt, 290, 610, 1.6, () => this.emitEvent('dash', { x: p.x, y: p.y, color: p.color }));

      const d = dist(p.x, p.y, this.ball.x, this.ball.y);
      if (d < PLAYER_RADIUS + this.ball.r && d > 0.1) {
        const nx = (this.ball.x - p.x) / d; const ny = (this.ball.y - p.y) / d;
        const kick = p.dashTimer > 0 ? 740 : 420;
        this.ball.vx = nx * kick + p.vx * 0.4;
        this.ball.vy = ny * kick + p.vy * 0.4;
        this.ball.lastTouch = p.id;
        this.emitEvent('bump', { x: this.ball.x, y: this.ball.y, heavy: p.dashTimer > 0 });
      }
    }

    this.ball.x += this.ball.vx * dt;
    this.ball.y += this.ball.vy * dt;
    const drag = Math.pow(0.28, dt);
    this.ball.vx *= drag; this.ball.vy *= drag;

    const inGoalY = Math.abs(this.ball.y - ARENA_H / 2) < 98;
    if (this.ball.y < 48) { this.ball.y = 48; this.ball.vy = Math.abs(this.ball.vy) * 0.85; }
    if (this.ball.y > ARENA_H - 48) { this.ball.y = ARENA_H - 48; this.ball.vy = -Math.abs(this.ball.vy) * 0.85; }

    if (this.ball.x < 44 && inGoalY) {
      this.teamScore.blue += 1;
      const scorer = this.entities.find((e) => e.id === this.ball.lastTouch && e.team === 'blue');
      if (scorer) scorer.goals += 1;
      this.emitEvent('banner', { text: `⚽ GOL TIM BIRU! (${this.teamScore.red} - ${this.teamScore.blue})` });
      this.emitEvent('sfx', { sound: 'correct' });
      this._resetKickoff();
    } else if (this.ball.x > ARENA_W - 44 && inGoalY) {
      this.teamScore.red += 1;
      const scorer = this.entities.find((e) => e.id === this.ball.lastTouch && e.team === 'red');
      if (scorer) scorer.goals += 1;
      this.emitEvent('banner', { text: `⚽ GOL TIM MERAH! (${this.teamScore.red} - ${this.teamScore.blue})` });
      this.emitEvent('sfx', { sound: 'correct' });
      this._resetKickoff();
    } else {
      if (this.ball.x < 48) { this.ball.x = 48; this.ball.vx = Math.abs(this.ball.vx) * 0.85; }
      if (this.ball.x > ARENA_W - 48) { this.ball.x = ARENA_W - 48; this.ball.vx = -Math.abs(this.ball.vx) * 0.85; }
    }
  }

  getState() {
    return {
      gameId: this.gameId, phase: this.phase, countdown: Number(this.countdown.toFixed(1)),
      timeLeft: Number(Math.max(0, this.duration - this.elapsed).toFixed(1)),
      teamScore: this.teamScore,
      ball: { x: Math.round(this.ball.x), y: Math.round(this.ball.y), r: this.ball.r },
      players: this.entities.map((e) => ({
        id: e.id, name: e.name, color: e.color, hat: e.hat, team: e.team,
        x: Math.round(e.x), y: Math.round(e.y), vx: Math.round(e.vx), vy: Math.round(e.vy),
        facing: Number(e.facing.toFixed(2)), alive: true,
      })),
    };
  }
}

// =========================================================================
// 11. METEOR SHOWER — Survive escalating falling cartoon meteors!
// =========================================================================
export class MeteorShowerGame extends BaseGame {
  constructor(room, players) {
    super(room, 'meteor-shower');
    this.entities = spawnRing(players, ARENA_W / 2, ARENA_H / 2, 220);
    this.meteors = [];
    this.craters = [];
    this.spawnCd = 0.6;
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
          score: Math.round(rank * 65 + (e.alive ? 90 : 0)),
          detail: e.alive ? '☄️ Selamat dari Kiamat!' : 'Kena Meteor!',
        };
      }));
    }

    this.spawnCd -= dt;
    if (this.spawnCd <= 0) {
      this.spawnCd = Math.max(0.24, 0.9 - this.elapsed * 0.02);
      const count = this.elapsed > 18 ? 2 : 1;
      for (let k = 0; k < count; k++) {
        // 35% chance to target near a random alive player
        const target = Math.random() < 0.35 ? alive[Math.floor(Math.random() * alive.length)] : null;
        this.meteors.push({
          x: clamp(target ? target.x + randRange(-90, 90) : randRange(80, ARENA_W - 80), 80, ARENA_W - 80),
          y: clamp(target ? target.y + randRange(-90, 90) : randRange(80, ARENA_H - 80), 80, ARENA_H - 80),
          r: randRange(48, 76),
          timer: 1.15,
          maxTimer: 1.15,
        });
      }
    }

    for (let i = this.craters.length - 1; i >= 0; i--) {
      this.craters[i].life -= dt;
      if (this.craters[i].life <= 0) this.craters.splice(i, 1);
    }

    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      m.timer -= dt;
      if (m.timer <= 0) {
        this.meteors.splice(i, 1);
        this.craters.push({ x: m.x, y: m.y, r: m.r * 0.72, life: 3.5 });
        this.emitEvent('explode', { x: m.x, y: m.y, name: 'METEOR', color: '#F97316' });
        for (const p of alive) {
          if (p.alive && dist(p.x, p.y, m.x, m.y) < m.r + PLAYER_RADIUS * 0.65) {
            p.alive = false;
            this.eliminationOrder.push(p.id);
            this.emitEvent('popup', { x: p.x, y: p.y - 24, text: `☄️ ${p.name} KO!`, color: '#EF4444' });
          }
        }
      }
    }

    for (const p of alive) {
      if (!p.alive) continue;
      if (p.isBot) {
        let ax = 0; let ay = 0;
        for (const m of this.meteors) {
          const d = dist(p.x, p.y, m.x, m.y);
          if (d < m.r + 75 && d > 0.1) { ax += (p.x - m.x) / d; ay += (p.y - m.y) / d; }
        }
        if (ax === 0 && ay === 0) { ax = (ARENA_W / 2 - p.x) * 0.004; ay = (ARENA_H / 2 - p.y) * 0.004; }
        const len = Math.hypot(ax, ay) || 1;
        p.inputX = ax / len; p.inputY = ay / len;
      }
      const inLava = this.craters.some((c) => dist(p.x, p.y, c.x, c.y) < c.r);
      moveBasic(p, dt, inLava ? 170 : 290, 560, 1.9, () => this.emitEvent('dash', { x: p.x, y: p.y, color: p.color }));
    }
  }

  getState() {
    return {
      gameId: this.gameId, phase: this.phase, countdown: Number(this.countdown.toFixed(1)),
      timeLeft: Number(Math.max(0, 45 - this.elapsed).toFixed(1)),
      meteors: this.meteors.map((m) => ({ x: Math.round(m.x), y: Math.round(m.y), r: Math.round(m.r), prog: Number((1 - m.timer / m.maxTimer).toFixed(2)) })),
      craters: this.craters.map((c) => ({ x: Math.round(c.x), y: Math.round(c.y), r: Math.round(c.r) })),
      players: this.entities.map((e) => ({
        id: e.id, name: e.name, color: e.color, hat: e.hat, x: Math.round(e.x), y: Math.round(e.y),
        vx: Math.round(e.vx), vy: Math.round(e.vy), facing: Number(e.facing.toFixed(2)), alive: e.alive,
      })),
    };
  }
}

// =========================================================================
// 12. NEON SNAKE PARTY — Eat fruit to grow, cut off rivals' trails!
// =========================================================================
export class SnakePartyGame extends BaseGame {
  constructor(room, players) {
    super(room, 'snake-party');
    this.entities = spawnRing(players, ARENA_W / 2, ARENA_H / 2, 230);
    this.entities.forEach((e) => { e.trail = []; e.maxTrail = 18; e.sampleAcc = 0; });
    this.fruits = Array.from({ length: 10 }, () => ({ x: randRange(90, ARENA_W - 90), y: randRange(90, ARENA_H - 90) }));
    this.eliminationOrder = [];
  }

  update(dt) {
    const alive = this.entities.filter((e) => e.alive);
    if (alive.length <= 1 || this.elapsed >= 50) {
      const total = this.entities.length;
      return this.finishGame(this.entities.map((e) => {
        const rank = e.alive ? total : this.eliminationOrder.indexOf(e.id) + 1;
        return {
          id: e.id, name: e.name, color: e.color, hat: e.hat, isBot: e.isBot,
          score: Math.round(rank * 55 + e.score + (e.alive ? 85 : 0)),
          detail: `🐍 Panjang ${e.maxTrail}${e.alive ? ' • Raja Ular!' : ''}`,
        };
      }));
    }

    for (const p of alive) {
      if (p.isBot) {
        const nearestFruit = this.fruits.sort((a, b) => dist(p.x, p.y, a.x, a.y) - dist(p.x, p.y, b.x, b.y))[0];
        let ang = nearestFruit ? Math.atan2(nearestFruit.y - p.y, nearestFruit.x - p.x) : p.facing;
        // Avoid walls & other trails
        const lookX = p.x + Math.cos(ang) * 70; const lookY = p.y + Math.sin(ang) * 70;
        if (lookX < 75 || lookX > ARENA_W - 75 || lookY < 75 || lookY > ARENA_H - 75) ang += 1.4;
        p.inputX = Math.cos(ang); p.inputY = Math.sin(ang);
      }
      // Snakes always keep moving forward!
      if (Math.hypot(p.inputX, p.inputY) > 0.15) {
        p.facing = Math.atan2(p.inputY, p.inputX);
      }
      p.inputX = Math.cos(p.facing);
      p.inputY = Math.sin(p.facing);
      moveBasic(p, dt, 245, 420, 2.2, () => this.emitEvent('dash', { x: p.x, y: p.y, color: p.color }));

      p.sampleAcc += dt;
      if (p.sampleAcc >= 0.055) {
        p.sampleAcc = 0;
        p.trail.push([Math.round(p.x), Math.round(p.y)]);
        while (p.trail.length > p.maxTrail) p.trail.shift();
      }

      // Eat fruits
      for (let i = this.fruits.length - 1; i >= 0; i--) {
        if (dist(p.x, p.y, this.fruits[i].x, this.fruits[i].y) < PLAYER_RADIUS + 16) {
          this.fruits.splice(i, 1);
          p.maxTrail = Math.min(70, p.maxTrail + 5);
          p.score += 20;
          this.fruits.push({ x: randRange(90, ARENA_W - 90), y: randRange(90, ARENA_H - 90) });
          this.emitEvent('sfx', { sound: 'pop' });
        }
      }
    }

    // Check head vs enemy trails
    for (const p of alive) {
      if (!p.alive) continue;
      for (const other of alive) {
        if (other.id === p.id) continue;
        for (let k = 0; k < other.trail.length - 2; k++) {
          const [tx, ty] = other.trail[k];
          if (dist(p.x, p.y, tx, ty) < 22) {
            p.alive = false;
            other.score += 75;
            this.eliminationOrder.push(p.id);
            this.emitEvent('explode', { x: p.x, y: p.y, name: p.name, color: p.color });
            break;
          }
        }
        if (!p.alive) break;
      }
    }
  }

  getState() {
    return {
      gameId: this.gameId, phase: this.phase, countdown: Number(this.countdown.toFixed(1)),
      timeLeft: Number(Math.max(0, 50 - this.elapsed).toFixed(1)),
      fruits: this.fruits.map((f) => ({ x: Math.round(f.x), y: Math.round(f.y) })),
      players: this.entities.map((e) => ({
        id: e.id, name: e.name, color: e.color, hat: e.hat, x: Math.round(e.x), y: Math.round(e.y),
        vx: Math.round(e.vx), vy: Math.round(e.vy), facing: Number(e.facing.toFixed(2)),
        alive: e.alive, trail: e.alive ? e.trail : [],
      })),
    };
  }
}

// =========================================================================
// 13. GHOST FREEZE — Ice Ghosts freeze players; teammates can thaw & rescue!
// =========================================================================
export class GhostFreezeGame extends BaseGame {
  constructor(room, players) {
    super(room, 'ghost-freeze');
    this.entities = spawnRing(players, ARENA_W / 2, ARENA_H / 2, 230);
    this.entities.forEach((e) => { e.ghost = false; e.frozen = false; e.rescues = 0; e.freezes = 0; e.thawCd = 0; });
    this.duration = 45;
  }

  onStart() {
    const ghostCount = this.entities.length >= 6 ? 2 : 1;
    const shuf = [...this.entities].sort(() => Math.random() - 0.5);
    for (let i = 0; i < ghostCount; i++) shuf[i].ghost = true;
    this.emitEvent('banner', { text: `👻 ${shuf.slice(0, ghostCount).map((g) => g.name).join(' & ')} JADI HANTU ES! CAIRKAN TEMANMU!` });
  }

  update(dt) {
    const runners = this.entities.filter((e) => !e.ghost);
    const activeRunners = runners.filter((e) => !e.frozen);
    if (this.elapsed >= this.duration || activeRunners.length === 0) {
      return this.finishGame(this.entities.map((e) => ({
        id: e.id, name: e.name, color: e.color, hat: e.hat, isBot: e.isBot,
        score: Math.round(e.score + (e.ghost && activeRunners.length === 0 ? 120 : !e.ghost && !e.frozen ? 100 : 0)),
        detail: e.ghost ? `❄️ ${e.freezes} bekukan` : `🔥 ${e.rescues} selamatkan teman`,
      })));
    }

    const ghosts = this.entities.filter((e) => e.ghost);
    for (const p of this.entities) {
      p.thawCd = Math.max(0, p.thawCd - dt);
      if (p.frozen) { p.vx = 0; p.vy = 0; continue; }

      if (p.isBot) {
        if (p.ghost) {
          const target = activeRunners.sort((a, b) => dist(p.x, p.y, a.x, a.y) - dist(p.x, p.y, b.x, b.y))[0];
          if (target) {
            const d = dist(p.x, p.y, target.x, target.y) || 1;
            p.inputX = (target.x - p.x) / d; p.inputY = (target.y - p.y) / d;
            if (d < 130 && p.dashCd <= 0) p.wantAction = true;
          }
        } else {
          const frozenPal = runners.find((r) => r.frozen && r.id !== p.id);
          const threat = ghosts.sort((a, b) => dist(p.x, p.y, a.x, a.y) - dist(p.x, p.y, b.x, b.y))[0];
          if (frozenPal && (!threat || dist(p.x, p.y, threat.x, threat.y) > 160)) {
            const d = dist(p.x, p.y, frozenPal.x, frozenPal.y) || 1;
            p.inputX = (frozenPal.x - p.x) / d; p.inputY = (frozenPal.y - p.y) / d;
          } else if (threat) {
            const ang = Math.atan2(p.y - threat.y, p.x - threat.x);
            p.inputX = Math.cos(ang); p.inputY = Math.sin(ang);
          }
        }
      }

      moveBasic(p, dt, p.ghost ? 305 : 278, 590, 1.8, () => this.emitEvent('dash', { x: p.x, y: p.y, color: p.ghost ? '#38BDF8' : p.color }));
      if (!p.ghost) p.score += dt * 5;
    }

    // Freeze & Rescue collisions
    for (const g of ghosts) {
      for (const r of activeRunners) {
        if (r.thawCd <= 0 && dist(g.x, g.y, r.x, r.y) < PLAYER_RADIUS * 2) {
          r.frozen = true; g.freezes += 1; g.score += 65;
          this.emitEvent('popup', { x: r.x, y: r.y - 26, text: '🧊 BEKU!', color: '#38BDF8' });
          this.emitEvent('sfx', { sound: 'bump' });
        }
      }
    }
    for (const helper of activeRunners) {
      for (const f of runners) {
        if (f.frozen && dist(helper.x, helper.y, f.x, f.y) < PLAYER_RADIUS * 2.1) {
          f.frozen = false; f.thawCd = 1.2; helper.rescues += 1; helper.score += 55;
          this.emitEvent('popup', { x: f.x, y: f.y - 26, text: '🔥 CAIR! +55', color: '#FACC15' });
          this.emitEvent('sfx', { sound: 'powerup' });
        }
      }
    }
  }

  getState() {
    return {
      gameId: this.gameId, phase: this.phase, countdown: Number(this.countdown.toFixed(1)),
      timeLeft: Number(Math.max(0, this.duration - this.elapsed).toFixed(1)),
      players: this.entities.map((e) => ({
        id: e.id, name: e.name, color: e.ghost ? '#38BDF8' : e.color, hat: e.hat,
        x: Math.round(e.x), y: Math.round(e.y), vx: Math.round(e.vx), vy: Math.round(e.vy),
        facing: Number(e.facing.toFixed(2)), alive: true, ghost: e.ghost, frozen: e.frozen, score: Math.round(e.score),
      })),
    };
  }
}

// =========================================================================
// 14. KING OF THE HILL — Fight inside a moving golden scoring zone!
// =========================================================================
export class KingHillGame extends BaseGame {
  constructor(room, players) {
    super(room, 'king-hill');
    this.entities = spawnRing(players, ARENA_W / 2, ARENA_H / 2, 230);
    this.zone = { x: ARENA_W / 2, y: ARENA_H / 2, r: 108 };
    this.moveTimer = 8;
    this.duration = 45;
  }

  update(dt) {
    if (this.elapsed >= this.duration) {
      return this.finishGame(this.entities.map((e) => ({
        id: e.id, name: e.name, color: e.color, hat: e.hat, isBot: e.isBot,
        score: Math.round(e.score), detail: `🎯 ${Math.round(e.score)} poin zona`,
      })));
    }

    this.moveTimer -= dt;
    if (this.moveTimer <= 0) {
      this.moveTimer = 8;
      this.zone.x = randRange(180, ARENA_W - 180);
      this.zone.y = randRange(150, ARENA_H - 150);
      this.emitEvent('banner', { text: '🎯 ZONA PINDAH! SERBU!!' });
      this.emitEvent('sfx', { sound: 'powerup' });
    }

    for (const p of this.entities) {
      if (p.isBot) {
        const d = dist(p.x, p.y, this.zone.x, this.zone.y);
        if (d > this.zone.r * 0.45) {
          p.inputX = (this.zone.x - p.x) / (d || 1);
          p.inputY = (this.zone.y - p.y) / (d || 1);
          if (d > 160 && p.dashCd <= 0) p.wantAction = true;
        } else {
          // Bump nearby enemy inside zone
          const rival = this.entities.find((o) => o.id !== p.id && dist(p.x, p.y, o.x, o.y) < 100);
          if (rival) {
            const rd = dist(p.x, p.y, rival.x, rival.y) || 1;
            p.inputX = (rival.x - p.x) / rd; p.inputY = (rival.y - p.y) / rd;
            if (p.dashCd <= 0) p.wantAction = true;
          } else { p.inputX = 0; p.inputY = 0; }
        }
      }
      moveBasic(p, dt, 285, 610, 1.7, () => this.emitEvent('dash', { x: p.x, y: p.y, color: p.color }));
      if (dist(p.x, p.y, this.zone.x, this.zone.y) < this.zone.r) {
        p.score += dt * 15;
      }
    }

    // Heavy knockback collisions!
    for (let i = 0; i < this.entities.length; i++) {
      for (let j = i + 1; j < this.entities.length; j++) {
        const a = this.entities[i]; const b = this.entities[j];
        const d = dist(a.x, a.y, b.x, b.y);
        if (d < PLAYER_RADIUS * 2 && d > 0.1) {
          const nx = (b.x - a.x) / d; const ny = (b.y - a.y) / d;
          a.vx -= nx * (b.dashTimer > 0 ? 520 : 220);
          a.vy -= ny * (b.dashTimer > 0 ? 520 : 220);
          b.vx += nx * (a.dashTimer > 0 ? 520 : 220);
          b.vy += ny * (a.dashTimer > 0 ? 520 : 220);
          this.emitEvent('bump', { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, heavy: a.dashTimer > 0 || b.dashTimer > 0 });
        }
      }
    }
  }

  getState() {
    return {
      gameId: this.gameId, phase: this.phase, countdown: Number(this.countdown.toFixed(1)),
      timeLeft: Number(Math.max(0, this.duration - this.elapsed).toFixed(1)),
      zone: { x: Math.round(this.zone.x), y: Math.round(this.zone.y), r: this.zone.r, moveIn: Number(this.moveTimer.toFixed(1)) },
      players: this.entities.map((e) => ({
        id: e.id, name: e.name, color: e.color, hat: e.hat, x: Math.round(e.x), y: Math.round(e.y),
        vx: Math.round(e.vx), vy: Math.round(e.vy), facing: Number(e.facing.toFixed(2)),
        alive: true, score: Math.round(e.score),
      })),
    };
  }
}
