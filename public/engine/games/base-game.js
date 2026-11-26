export const ARENA_W = 1280;
export const ARENA_H = 620;
export const PLAYER_RADIUS = 22;

export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

export function dist(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

export function randRange(min, max) {
  return min + Math.random() * (max - min);
}

export function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function spawnRing(players, cx = ARENA_W / 2, cy = ARENA_H / 2, radius = 190) {
  const n = Math.max(players.length, 1);
  return players.map((p, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    return {
      id: p.id,
      name: p.name,
      color: p.color,
      hat: p.hat,
      team: p.team ?? 0,
      isBot: !!p.isBot,
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
      facing: angle + Math.PI,
      alive: true,
      score: 0,
      dashCd: 0,
      dashTimer: 0,
      stunTimer: 0,
      inputX: 0,
      inputY: 0,
      wantAction: false,
      aiSeed: Math.random() * 100,
    };
  });
}

export class BaseGame {
  constructor(room, gameId) {
    this.room = room;
    this.gameId = gameId;
    this.elapsed = 0;
    this.finished = false;
    this.events = [];
    this.countdown = 3.0;
    this.phase = 'countdown'; // countdown | playing | ended
  }

  emitEvent(type, payload = {}) {
    this.events.push({ type, ...payload });
  }

  flushEvents() {
    if (this.events.length === 0) return [];
    const out = this.events;
    this.events = [];
    return out;
  }

  setInput(playerId, input) {
    const ent = this.entities?.find((e) => e.id === playerId);
    if (!ent) return;
    const ix = Number(input.x) || 0;
    const iy = Number(input.y) || 0;
    const len = Math.hypot(ix, iy);
    if (len > 1) {
      ent.inputX = ix / len;
      ent.inputY = iy / len;
    } else {
      ent.inputX = ix;
      ent.inputY = iy;
    }
    if (input.action) ent.wantAction = true;
  }

  handleAction(_playerId, _msg) {}

  isAlly(a, b) {
    return !!this.room?.isSameTeam?.(a, b);
  }

  isTeamSurvivalOver(alive) {
    if (alive.length <= 1) return true;
    if (!this.room?.teamMode) return false;
    const teams = new Set(alive.map((e) => e.team));
    return teams.size <= 1;
  }

  step(dt) {
    if (this.finished) return;
    if (this.phase === 'countdown') {
      const prev = Math.ceil(this.countdown);
      this.countdown -= dt;
      const cur = Math.ceil(this.countdown);
      if (cur !== prev && cur > 0) {
        this.emitEvent('sfx', { sound: 'tick' });
      }
      if (this.countdown <= 0) {
        this.countdown = 0;
        this.phase = 'playing';
        this.emitEvent('sfx', { sound: 'go' });
        this.onStart?.();
      }
      return;
    }
    this.elapsed += dt;
    this.update(dt);
  }

  finishGame(standings) {
    if (this.finished) return;
    this.finished = true;
    this.phase = 'ended';
    const sorted = [...standings].sort((a, b) => b.score - a.score);
    sorted.forEach((s, idx) => {
      s.rank = idx + 1;
    });
    this.room.onGameFinished(this.gameId, sorted);
  }
}
