import { BaseGame, pickRandom, randRange } from './base-game.js';

// =========================================================================
// 29. ULAR TANGGA RUSUH — 50-Tile Snakes & Ladders + Sabotage Dice!
// =========================================================================
const SL_GOAL = 50;
const SL_LADDERS = { 4: 14, 9: 21, 17: 34, 24: 38, 31: 42, 36: 46 };
const SL_SNAKES = { 16: 6, 27: 12, 33: 19, 41: 23, 45: 29, 49: 32 };
const SL_BONUS = new Set([7, 15, 25, 39]);
const SL_SWAP = new Set([13, 28, 44]);

export class SnakesLaddersGame extends BaseGame {
  constructor(room, players) {
    super(room, 'snakes-ladders');
    this.countdown = 3.5;
    this.players = players.map((p) => ({
      id: p.id, name: p.name, color: p.color, hat: p.hat, team: p.team ?? 0, isBot: !!p.isBot,
      pos: 1, bonusPts: 0, sabotageLeft: 1, snakesHit: 0, laddersHit: 0,
    }));
    this.turnIdx = 0;
    this.round = 1;
    this.maxRounds = 14;
    this.turnTimer = 9.0;
    this.botTimer = 1.3;
    this.extraRolls = 0;
    this.lastRoll = null;
    this.lastLog = '🎲 Lempar dadu untuk mulai balapan ke petak 50!';
  }

  get activePlayer() {
    return this.players[this.turnIdx % this.players.length];
  }

  _advanceTurn(extra = false) {
    if (extra && this.extraRolls < 2) {
      this.extraRolls += 1;
      this.turnTimer = 9.0;
      this.botTimer = randRange(1.0, 1.6);
      return;
    }
    this.extraRolls = 0;
    this.turnIdx = (this.turnIdx + 1) % this.players.length;
    if (this.turnIdx === 0) this.round += 1;
    this.turnTimer = 9.0;
    this.botTimer = randRange(1.0, 1.7);
    if (this.round > this.maxRounds) {
      this._conclude();
    }
  }

  _conclude(winnerId = null) {
    this.finishGame(this.players.map((p) => ({
      id: p.id, name: p.name, color: p.color, hat: p.hat, isBot: p.isBot,
      score: Math.max(0, Math.round(p.pos * 6 + p.bonusPts + (p.id === winnerId ? 140 : 0))),
      detail: `Petak ${p.pos}/50 • 🪜${p.laddersHit} 🐍${p.snakesHit}`,
    })));
  }

  handleAction(playerId, msg) {
    if (this.phase !== 'playing' || this.finished) return;
    const cur = this.activePlayer;
    if (!cur || cur.id !== playerId) return;
    if (msg.action === 'roll') {
      this._doRoll(cur, false);
    } else if (msg.action === 'sabotage' && cur.sabotageLeft > 0) {
      this._doRoll(cur, true);
    }
  }

  _doRoll(p, useSabotage) {
    let sabText = '';
    if (useSabotage && p.sabotageLeft > 0) {
      p.sabotageLeft = 0;
      // Push highest enemy back 4 tiles!
      const enemies = this.players.filter((o) => o.id !== p.id && !this.isAlly(p, o)).sort((a, b) => b.pos - a.pos);
      const victim = enemies[0] || this.players.filter((o) => o.id !== p.id).sort((a, b) => b.pos - a.pos)[0];
      if (victim) {
        victim.pos = Math.max(1, victim.pos - 4);
        sabText = `😈 ${p.name} SABOTASE ${victim.name} (-4 petak)! `;
        this.emitEvent('sfx', { sound: 'explode' });
      }
    }

    const roll = 1 + Math.floor(Math.random() * 6);
    this.lastRoll = { by: p.name, value: roll, color: p.color };
    p.pos = Math.min(SL_GOAL, p.pos + roll);
    let extra = roll === 6;
    let msg = `${sabText}🎲 ${p.name} lempar ${roll} → Petak ${p.pos}`;

    if (SL_LADDERS[p.pos]) {
      const dest = SL_LADDERS[p.pos];
      p.pos = dest;
      p.laddersHit += 1;
      p.bonusPts += 25;
      msg = `${sabText}🪜 ${p.name} NAIK TANGGA ke Petak ${dest}! (+25)`;
      this.emitEvent('sfx', { sound: 'powerup' });
    } else if (SL_SNAKES[p.pos]) {
      const dest = SL_SNAKES[p.pos];
      p.pos = dest;
      p.snakesHit += 1;
      extra = false;
      msg = `${sabText}🐍 OH TIDAK! ${p.name} DIGIGIT ULAR turun ke Petak ${dest}!`;
      this.emitEvent('sfx', { sound: 'wrong' });
    } else if (SL_BONUS.has(p.pos)) {
      p.bonusPts += 40;
      extra = true;
      msg = `${sabText}⭐ ${p.name} dapat PETAK BINTANG (+40 & Lempar Lagi)!`;
      this.emitEvent('sfx', { sound: 'correct' });
    } else if (SL_SWAP.has(p.pos)) {
      const leader = this.players.filter((o) => o.id !== p.id && !this.isAlly(p, o)).sort((a, b) => b.pos - a.pos)[0];
      if (leader && leader.pos > p.pos) {
        const tmp = p.pos;
        p.pos = leader.pos;
        leader.pos = tmp;
        msg = `${sabText}🌀 PETAK TUKAR! ${p.name} tukar posisi dengan ${leader.name} (${p.pos} ↔ ${leader.pos})!`;
        this.emitEvent('sfx', { sound: 'powerup' });
      } else {
        this.emitEvent('sfx', { sound: 'pop' });
      }
    } else {
      this.emitEvent('sfx', { sound: 'pop' });
    }

    if (extra && p.pos < SL_GOAL) msg += ' • 🎲 Bonus Lempar Lagi!';
    this.lastLog = msg;

    if (p.pos >= SL_GOAL) {
      this.lastLog = `🏆 ${p.name} MENCAPAI PETAK 50 & MENANG!`;
      this.emitEvent('sfx', { sound: 'win' });
      this._conclude(p.id);
      return;
    }

    this._advanceTurn(extra);
  }

  update(dt) {
    const cur = this.activePlayer;
    if (!cur) return;
    this.turnTimer -= dt;
    if (cur.isBot) {
      this.botTimer -= dt;
      if (this.botTimer <= 0) {
        const leader = this.players.filter((o) => o.id !== cur.id && !this.isAlly(cur, o)).sort((a, b) => b.pos - a.pos)[0];
        const useSab = cur.sabotageLeft > 0 && leader && leader.pos >= 28 && Math.random() < 0.45;
        this._doRoll(cur, useSab);
      }
      return;
    }
    if (this.turnTimer <= 0) {
      this._doRoll(cur, false);
    }
  }

  getState() {
    const cur = this.activePlayer;
    return {
      gameId: this.gameId, boardType: 'snakes-ladders', phase: this.phase,
      countdown: Number(this.countdown.toFixed(1)),
      round: this.round, maxRounds: this.maxRounds,
      turnPlayerId: cur?.id || null,
      turnTimer: Number(Math.max(0, this.turnTimer).toFixed(1)),
      lastRoll: this.lastRoll,
      lastLog: this.lastLog,
      ladders: SL_LADDERS, snakes: SL_SNAKES,
      bonusTiles: [...SL_BONUS], swapTiles: [...SL_SWAP],
      players: this.players.map((p) => ({
        id: p.id, name: p.name, color: p.color, hat: p.hat, team: p.team,
        pos: p.pos, score: p.pos * 6 + p.bonusPts, sabotageLeft: p.sabotageLeft,
      })),
    };
  }
}

// =========================================================================
// 30. MONOPOLI KILAT — 16-Tile Express Monopoly (Buy, Hotel, Rent, Chance!)
// =========================================================================
const MONO_TILES = [
  { idx: 0, name: 'START', icon: '🏁', type: 'start', color: '#4ADE80' },
  { idx: 1, name: 'Warteg', icon: '🍜', type: 'prop', price: 140, rent: 60, color: '#FB923C' },
  { idx: 2, name: 'Kafe', icon: '☕', type: 'prop', price: 160, rent: 70, color: '#FB923C' },
  { idx: 3, name: 'Dana Umum', icon: '❓', type: 'chance', color: '#FACC15' },
  { idx: 4, name: 'Bali', icon: '🏖️', type: 'prop', price: 200, rent: 90, color: '#38BDF8' },
  { idx: 5, name: 'Jogja', icon: '🏛️', type: 'prop', price: 220, rent: 95, color: '#38BDF8' },
  { idx: 6, name: 'Penjara', icon: '🔒', type: 'jail', color: '#94A3B8' },
  { idx: 7, name: 'Dufan', icon: '🎢', type: 'prop', price: 240, rent: 110, color: '#A855F7' },
  { idx: 8, name: 'Jakarta', icon: '🗼', type: 'prop', price: 280, rent: 130, color: '#A855F7' },
  { idx: 9, name: 'Pajak!', icon: '💸', type: 'tax', amount: 120, color: '#F43F5E' },
  { idx: 10, name: 'Lombok', icon: '🏝️', type: 'prop', price: 300, rent: 145, color: '#22C55E' },
  { idx: 11, name: 'Bromo', icon: '🌋', type: 'prop', price: 320, rent: 155, color: '#22C55E' },
  { idx: 12, name: 'Parkir VIP', icon: '🎁', type: 'free', amount: 150, color: '#34D399' },
  { idx: 13, name: 'Dana Umum', icon: '❓', type: 'chance', color: '#FACC15' },
  { idx: 14, name: 'Istana', icon: '🏰', type: 'prop', price: 380, rent: 190, color: '#EF4444' },
  { idx: 15, name: 'Sultan', icon: '💎', type: 'prop', price: 420, rent: 220, color: '#EF4444' },
];

export class MiniMonopolyGame extends BaseGame {
  constructor(room, players) {
    super(room, 'mini-monopoly');
    this.countdown = 3.5;
    this.players = players.map((p) => ({
      id: p.id, name: p.name, color: p.color, hat: p.hat, team: p.team ?? 0, isBot: !!p.isBot,
      pos: 0, cash: 1000, jailed: false, bankrupt: false, propsOwned: 0,
    }));
    this.tiles = MONO_TILES.map((t) => ({ ...t, ownerId: null, level: 0 }));
    this.turnIdx = 0;
    this.round = 1;
    this.maxRounds = 8;
    this.subPhase = 'roll'; // roll | decide
    this.turnTimer = 9.0;
    this.botTimer = 1.2;
    this.lastRoll = null;
    this.pendingTile = null;
    this.lastLog = '🏠 Semua mulai dengan 💰 1000 Koin! Lempar dadu & borong kota!';
  }

  get activePlayer() {
    return this.players[this.turnIdx % this.players.length];
  }

  _netWorth(p) {
    let val = p.cash;
    for (const t of this.tiles) {
      if (t.ownerId === p.id) val += Math.round(t.price * (t.level >= 2 ? 1.6 : 1));
    }
    return Math.max(0, Math.round(val));
  }

  _conclude() {
    this.finishGame(this.players.map((p) => {
      const nw = this._netWorth(p);
      const owned = this.tiles.filter((t) => t.ownerId === p.id).length;
      return {
        id: p.id, name: p.name, color: p.color, hat: p.hat, isBot: p.isBot,
        score: Math.round(nw / 3),
        detail: `💰 ${nw} Koin Total • 🏠 ${owned} Kota`,
      };
    }));
  }

  _nextTurn() {
    this.subPhase = 'roll';
    this.pendingTile = null;
    const activeCount = this.players.filter((p) => !p.bankrupt).length;
    if (activeCount <= 1) {
      this._conclude();
      return;
    }
    for (let step = 0; step < this.players.length; step++) {
      this.turnIdx = (this.turnIdx + 1) % this.players.length;
      if (this.turnIdx === 0) this.round += 1;
      if (this.round > this.maxRounds) {
        this._conclude();
        return;
      }
      if (!this.activePlayer.bankrupt) break;
    }
    this.turnTimer = 9.0;
    this.botTimer = randRange(1.0, 1.6);
  }

  _checkBankrupt(p) {
    if (p.cash < 0) {
      p.bankrupt = true;
      p.cash = 0;
      for (const t of this.tiles) {
        if (t.ownerId === p.id) { t.ownerId = null; t.level = 0; }
      }
      this.lastLog += ` 💀 ${p.name} BANGKRUT!`;
      this.emitEvent('sfx', { sound: 'explode' });
    }
  }

  handleAction(playerId, msg) {
    if (this.phase !== 'playing' || this.finished) return;
    const cur = this.activePlayer;
    if (!cur || cur.id !== playerId) return;
    if (this.subPhase === 'roll' && msg.action === 'roll') {
      this._doRoll(cur);
    } else if (this.subPhase === 'decide') {
      if (msg.action === 'buy') this._doBuy(cur);
      else if (msg.action === 'skip') this._nextTurn();
    }
  }

  _doRoll(p) {
    if (p.jailed) {
      p.jailed = false;
      p.cash -= 60;
      this.lastLog = `🔒 ${p.name} bayar denda 60 Koin & bebas dari Penjara!`;
      this._checkBankrupt(p);
      this.emitEvent('sfx', { sound: 'pop' });
      this._nextTurn();
      return;
    }

    const roll = 1 + Math.floor(Math.random() * 6);
    this.lastRoll = { by: p.name, value: roll, color: p.color };
    const prevPos = p.pos;
    p.pos = (p.pos + roll) % this.tiles.length;
    let passTxt = '';
    if (p.pos < prevPos) {
      p.cash += 200;
      passTxt = ' (+200 lewat START!)';
    }

    const tile = this.tiles[p.pos];
    if (tile.type === 'prop') {
      if (!tile.ownerId) {
        if (p.cash >= tile.price) {
          this.subPhase = 'decide';
          this.pendingTile = { idx: tile.idx, mode: 'buy', cost: tile.price, name: tile.name, icon: tile.icon };
          this.turnTimer = 7.5;
          this.botTimer = randRange(0.8, 1.3);
          this.lastLog = `🎲 ${p.name} mendarat di ${tile.icon} ${tile.name}${passTxt} — Beli seharga ${tile.price}?`;
          this.emitEvent('sfx', { sound: 'pop' });
          return;
        }
        this.lastLog = `🎲 ${p.name} di ${tile.icon} ${tile.name}${passTxt} (Koin kurang untuk beli).`;
      } else if (tile.ownerId === p.id) {
        const upCost = Math.round(tile.price * 0.7);
        if (tile.level < 2 && p.cash >= upCost) {
          this.subPhase = 'decide';
          this.pendingTile = { idx: tile.idx, mode: 'upgrade', cost: upCost, name: tile.name, icon: tile.icon };
          this.turnTimer = 7.5;
          this.botTimer = randRange(0.8, 1.3);
          this.lastLog = `🎲 ${p.name} di kota sendiri ${tile.icon} ${tile.name} — Upgrade Hotel (${upCost}) biar sewa 2x?`;
          this.emitEvent('sfx', { sound: 'pop' });
          return;
        }
        this.lastLog = `🏠 ${p.name} santai di kota sendiri ${tile.icon} ${tile.name}${passTxt}.`;
      } else {
        const owner = this.players.find((x) => x.id === tile.ownerId);
        if (owner && this.isAlly(p, owner)) {
          this.lastLog = `🤝 ${p.name} mampir di ${tile.icon} ${tile.name} milik rekan tim ${owner.name} — GRATIS!`;
          this.emitEvent('sfx', { sound: 'pop' });
        } else if (owner) {
          const rent = tile.level >= 2 ? tile.rent * 2 : tile.rent;
          p.cash -= rent;
          owner.cash += rent;
          this.lastLog = `💸 ${p.name} bayar sewa ${rent} Koin ke ${owner.name} di ${tile.icon} ${tile.name}!`;
          this.emitEvent('sfx', { sound: 'wrong' });
          this._checkBankrupt(p);
        }
      }
    } else if (tile.type === 'chance') {
      const ev = pickRandom([
        { text: '🎁 Dapat THR +220 Koin!', fn: () => { p.cash += 220; } },
        { text: '💸 Kena Tilang -110 Koin!', fn: () => { p.cash -= 110; } },
        { text: '😈 PALAK TEMAN! Semua lawan bayar 55 Koin ke kamu!', fn: () => {
          for (const o of this.players) {
            if (o.id !== p.id && !o.bankrupt && !this.isAlly(p, o)) { o.cash -= 55; p.cash += 55; }
          }
        } },
        { text: '🚀 Terbang ke START (+200 Koin)!', fn: () => { p.pos = 0; p.cash += 200; } },
        { text: '🎰 Menang Undian +180 Koin!', fn: () => { p.cash += 180; } },
      ]);
      ev.fn();
      this.lastLog = `❓ ${p.name}: ${ev.text}`;
      this.emitEvent('sfx', { sound: 'powerup' });
      this._checkBankrupt(p);
    } else if (tile.type === 'tax') {
      p.cash -= tile.amount;
      this.lastLog = `💸 ${p.name} kena Pajak Sultan -${tile.amount} Koin!`;
      this.emitEvent('sfx', { sound: 'wrong' });
      this._checkBankrupt(p);
    } else if (tile.type === 'free') {
      p.cash += tile.amount;
      this.lastLog = `🎁 ${p.name} dapat Parkir VIP +${tile.amount} Koin!`;
      this.emitEvent('sfx', { sound: 'correct' });
    } else if (tile.type === 'jail') {
      p.jailed = true;
      this.lastLog = `🔒 ${p.name} masuk Penjara! Giliran berikutnya bayar 60 Koin.`;
      this.emitEvent('sfx', { sound: 'wrong' });
    } else {
      this.lastLog = `🏁 ${p.name} pas di START!${passTxt}`;
      this.emitEvent('sfx', { sound: 'correct' });
    }

    this._nextTurn();
  }

  _doBuy(p) {
    const pend = this.pendingTile;
    if (!pend) { this._nextTurn(); return; }
    const tile = this.tiles[pend.idx];
    if (pend.mode === 'buy' && !tile.ownerId && p.cash >= tile.price) {
      p.cash -= tile.price;
      tile.ownerId = p.id;
      tile.level = 1;
      this.lastLog = `🏠 ${p.name} MEMBELI ${tile.icon} ${tile.name} (${tile.price} Koin)!`;
      this.emitEvent('sfx', { sound: 'correct' });
    } else if (pend.mode === 'upgrade' && tile.ownerId === p.id && tile.level < 2 && p.cash >= pend.cost) {
      p.cash -= pend.cost;
      tile.level = 2;
      this.lastLog = `🏨 ${p.name} UPGRADE HOTEL di ${tile.icon} ${tile.name} (Sewa ${tile.rent * 2})!`;
      this.emitEvent('sfx', { sound: 'powerup' });
    }
    this._nextTurn();
  }

  update(dt) {
    const cur = this.activePlayer;
    if (!cur) return;
    this.turnTimer -= dt;
    if (cur.isBot) {
      this.botTimer -= dt;
      if (this.botTimer <= 0) {
        if (this.subPhase === 'roll') this._doRoll(cur);
        else if (this.pendingTile && cur.cash - this.pendingTile.cost >= 120) this._doBuy(cur);
        else this._nextTurn();
      }
      return;
    }
    if (this.turnTimer <= 0) {
      if (this.subPhase === 'roll') this._doRoll(cur);
      else this._nextTurn();
    }
  }

  getState() {
    const cur = this.activePlayer;
    return {
      gameId: this.gameId, boardType: 'mini-monopoly', phase: this.phase,
      countdown: Number(this.countdown.toFixed(1)),
      round: this.round, maxRounds: this.maxRounds,
      subPhase: this.subPhase,
      turnPlayerId: cur?.id || null,
      turnTimer: Number(Math.max(0, this.turnTimer).toFixed(1)),
      lastRoll: this.lastRoll,
      pendingTile: this.pendingTile,
      lastLog: this.lastLog,
      tiles: this.tiles.map((t) => {
        const own = t.ownerId ? this.players.find((x) => x.id === t.ownerId) : null;
        return {
          idx: t.idx, name: t.name, icon: t.icon, type: t.type, color: t.color,
          price: t.price || 0, rent: t.rent || 0, level: t.level,
          ownerId: t.ownerId, ownerColor: own?.color || null, ownerName: own?.name || null,
        };
      }),
      players: this.players.map((p) => ({
        id: p.id, name: p.name, color: p.color, hat: p.hat, team: p.team,
        pos: p.pos, cash: p.cash, jailed: p.jailed, bankrupt: p.bankrupt,
        score: Math.round(this._netWorth(p) / 3),
      })),
    };
  }
}

// =========================================================================
// 31. KARTU UNO RUSUH — Classic 4-Color UNO / Crazy Cards (+2, Skip, +4!)
// =========================================================================
const UNO_COLORS = ['red', 'blue', 'green', 'yellow'];
let unoCardSeq = 1;

function makeUnoCard(forceNormal = false) {
  const r = Math.random();
  if (!forceNormal && r < 0.08) return { id: `c${unoCardSeq++}`, color: 'wild', value: '+4' };
  if (!forceNormal && r < 0.16) return { id: `c${unoCardSeq++}`, color: 'wild', value: 'wild' };
  const color = pickRandom(UNO_COLORS);
  if (!forceNormal && r < 0.28) return { id: `c${unoCardSeq++}`, color, value: '+2' };
  if (!forceNormal && r < 0.37) return { id: `c${unoCardSeq++}`, color, value: 'skip' };
  if (!forceNormal && r < 0.45) return { id: `c${unoCardSeq++}`, color, value: 'rev' };
  return { id: `c${unoCardSeq++}`, color, value: String(1 + Math.floor(Math.random() * 9)) };
}

export class CrazyCardsGame extends BaseGame {
  constructor(room, players) {
    super(room, 'crazy-cards');
    this.countdown = 3.5;
    this.players = players.map((p) => ({
      id: p.id, name: p.name, color: p.color, hat: p.hat, team: p.team ?? 0, isBot: !!p.isBot,
      hand: Array.from({ length: 6 }, () => makeUnoCard(false)),
      attacksSent: 0,
    }));
    this.topCard = makeUnoCard(true);
    this.activeColor = this.topCard.color;
    this.turnIdx = 0;
    this.direction = 1;
    this.turnsPlayed = 0;
    this.maxTurns = 48;
    this.turnTimer = 10.5;
    this.botTimer = 1.4;
    this.lastLog = '🃏 Cocokkan warna atau angka kartu di tengah — habiskan kartumu dulu!';
  }

  get activePlayer() {
    return this.players[this.turnIdx];
  }

  _canPlay(card) {
    if (!card) return false;
    if (card.color === 'wild') return true;
    return card.color === this.activeColor || card.value === this.topCard.value;
  }

  _stepIdx(steps = 1) {
    const n = this.players.length;
    return ((this.turnIdx + this.direction * steps) % n + n) % n;
  }

  _conclude(winnerId = null) {
    this.finishGame(this.players.map((p) => {
      const cardsLeft = p.hand.length;
      const base = p.id === winnerId ? 320 : Math.max(20, 220 - cardsLeft * 22);
      return {
        id: p.id, name: p.name, color: p.color, hat: p.hat, isBot: p.isBot,
        score: Math.round(base + p.attacksSent * 25),
        detail: p.id === winnerId ? '🎉 KARTU HABIS! JUARA UNO!' : `🃏 Sisa ${cardsLeft} kartu`,
      };
    }));
  }

  handleAction(playerId, msg) {
    if (this.phase !== 'playing' || this.finished) return;
    const cur = this.activePlayer;
    if (!cur || cur.id !== playerId) return;
    if (msg.action === 'play') {
      this._playCard(cur, msg.cardId, msg.chosenColor);
    } else if (msg.action === 'draw') {
      this._drawCard(cur);
    }
  }

  _playCard(p, cardId, chosenColor) {
    const idx = p.hand.findIndex((c) => c.id === cardId);
    if (idx < 0) return;
    const card = p.hand[idx];
    if (!this._canPlay(card)) return;

    p.hand.splice(idx, 1);
    this.topCard = card;
    this.activeColor = card.color === 'wild'
      ? (UNO_COLORS.includes(chosenColor) ? chosenColor : pickRandom(UNO_COLORS))
      : card.color;

    const colorName = { red: '🔴 Merah', blue: '🔵 Biru', green: '🟢 Hijau', yellow: '🟡 Kuning' }[this.activeColor];
    let skipStep = 1;
    let msg = `🃏 ${p.name} mainkan ${card.value.toUpperCase()} (${colorName})`;

    if (p.hand.length === 0) {
      this.lastLog = `🎉 ${p.name} KARTU HABIS! MENANG!!`;
      this.emitEvent('sfx', { sound: 'win' });
      this._conclude(p.id);
      return;
    }

    if (card.value === 'rev') {
      if (this.players.length === 2) {
        skipStep = 2; // In 2-player UNO, Reverse acts like Skip!
        msg = `🔄 ${p.name} REVERSE! Giliran balik lagi!`;
      } else {
        this.direction *= -1;
        msg = `🔄 ${p.name} membalik arah putaran!`;
      }
      this.emitEvent('sfx', { sound: 'powerup' });
    } else if (card.value === 'skip') {
      const skipped = this.players[this._stepIdx(1)];
      skipStep = 2;
      msg = `🚫 ${p.name} SKIP giliran ${skipped.name}!`;
      this.emitEvent('sfx', { sound: 'wrong' });
    } else if (card.value === '+2') {
      const victim = this.players[this._stepIdx(1)];
      victim.hand.push(makeUnoCard(false), makeUnoCard(false));
      p.attacksSent += 1;
      skipStep = 2;
      msg = `💥 ${p.name} kasih +2 KARTU ke ${victim.name} (lewat giliran)!`;
      this.emitEvent('sfx', { sound: 'explode' });
    } else if (card.value === '+4') {
      const victim = this.players[this._stepIdx(1)];
      for (let k = 0; k < 4; k++) victim.hand.push(makeUnoCard(false));
      p.attacksSent += 2;
      skipStep = 2;
      msg = `🔥 KEJAM! ${p.name} lempar WILD +4 ke ${victim.name}! Warna jadi ${colorName}!`;
      this.emitEvent('sfx', { sound: 'explode' });
    } else if (card.value === 'wild') {
      msg = `🌈 ${p.name} ganti warna jadi ${colorName}!`;
      this.emitEvent('sfx', { sound: 'powerup' });
    } else {
      this.emitEvent('sfx', { sound: 'pop' });
    }

    if (p.hand.length === 1) msg += ` • ⚠️ ${p.name} SISA 1 KARTU (UNO)!`;
    this.lastLog = msg;
    this._advanceTurn(skipStep);
  }

  _drawCard(p) {
    p.hand.push(makeUnoCard(false));
    this.lastLog = `📥 ${p.name} ambil 1 kartu (sisa ${p.hand.length} kartu).`;
    this.emitEvent('sfx', { sound: 'pop' });
    this._advanceTurn(1);
  }

  _advanceTurn(step) {
    this.turnsPlayed += 1;
    if (this.turnsPlayed >= this.maxTurns) {
      this._conclude();
      return;
    }
    this.turnIdx = this._stepIdx(step);
    this.turnTimer = 10.5;
    this.botTimer = randRange(1.0, 1.7);
  }

  update(dt) {
    const cur = this.activePlayer;
    if (!cur) return;
    this.turnTimer -= dt;
    if (cur.isBot) {
      this.botTimer -= dt;
      if (this.botTimer <= 0) {
        const playable = cur.hand.filter((c) => this._canPlay(c));
        if (playable.length) {
          // Prefer action cards first for chaos!
          const pick = playable.find((c) => ['+4', '+2', 'skip', 'rev'].includes(c.value)) || playable[0];
          const colorCounts = { red: 0, blue: 0, green: 0, yellow: 0 };
          cur.hand.forEach((c) => { if (colorCounts[c.color] !== undefined) colorCounts[c.color] += 1; });
          const bestCol = Object.entries(colorCounts).sort((a, b) => b[1] - a[1])[0][0];
          this._playCard(cur, pick.id, bestCol);
        } else {
          this._drawCard(cur);
        }
      }
      return;
    }
    if (this.turnTimer <= 0) {
      const playable = cur.hand.find((c) => this._canPlay(c));
      if (playable) this._playCard(cur, playable.id, pickRandom(UNO_COLORS));
      else this._drawCard(cur);
    }
  }

  getStateFor(viewerId) {
    const cur = this.activePlayer;
    const me = this.players.find((p) => p.id === viewerId);
    return {
      gameId: this.gameId, boardType: 'crazy-cards', phase: this.phase,
      countdown: Number(this.countdown.toFixed(1)),
      turnsLeft: Math.max(0, this.maxTurns - this.turnsPlayed),
      direction: this.direction,
      turnPlayerId: cur?.id || null,
      turnTimer: Number(Math.max(0, this.turnTimer).toFixed(1)),
      topCard: this.topCard,
      activeColor: this.activeColor,
      lastLog: this.lastLog,
      myHand: me ? me.hand.map((c) => ({ ...c, playable: cur?.id === viewerId && this._canPlay(c) })) : [],
      players: this.players.map((p) => ({
        id: p.id, name: p.name, color: p.color, hat: p.hat, team: p.team,
        cardCount: p.hand.length, score: Math.max(0, 220 - p.hand.length * 22 + p.attacksSent * 25),
      })),
    };
  }

  getState() { return this.getStateFor(null); }
}

// =========================================================================
// 32. LUDO PARTY KILAT — 24-Tile Circular Race & Kick Opponents Home!
// =========================================================================
const LUDO_RING = 24;
const LUDO_SAFE = new Set([0, 6, 12, 18]);

export class LudoBlitzGame extends BaseGame {
  constructor(room, players) {
    super(room, 'ludo-blitz');
    this.countdown = 3.5;
    const n = Math.max(1, players.length);
    this.players = players.map((p, i) => ({
      id: p.id, name: p.name, color: p.color, hat: p.hat, team: p.team ?? 0, isBot: !!p.isBot,
      startOffset: Math.floor((i * LUDO_RING) / n) % LUDO_RING,
      // Pawn 0 starts on track (step 0) for instant action; Pawn 1 starts in base (-1)!
      pawns: [0, -1],
      kicks: 0,
    }));
    this.turnIdx = 0;
    this.round = 1;
    this.maxRounds = 12;
    this.subPhase = 'roll'; // roll | pick
    this.pendingRoll = 0;
    this.validPawns = [];
    this.extraRolls = 0;
    this.turnTimer = 9.0;
    this.botTimer = 1.2;
    this.lastRoll = null;
    this.lastLog = '🏝️ Bawa kedua pionmu keliling 24 petak ke Finish — tendang musuh balik markas!';
  }

  get activePlayer() {
    return this.players[this.turnIdx % this.players.length];
  }

  _globalTile(p, step) {
    if (step < 0 || step >= LUDO_RING) return -1;
    return (p.startOffset + step) % LUDO_RING;
  }

  _validPawnsFor(p, roll) {
    const out = [];
    const anyOnTrack = p.pawns.some((st) => st >= 0 && st < LUDO_RING);
    p.pawns.forEach((st, idx) => {
      if (st >= LUDO_RING) return; // already finished!
      if (st === -1) {
        if (roll === 6 || roll === 1 || !anyOnTrack) out.push(idx);
      } else {
        out.push(idx);
      }
    });
    return out;
  }

  _conclude(winnerId = null) {
    this.finishGame(this.players.map((p) => {
      const done = p.pawns.filter((st) => st >= LUDO_RING).length;
      const steps = p.pawns.reduce((acc, st) => acc + Math.max(0, st), 0);
      return {
        id: p.id, name: p.name, color: p.color, hat: p.hat, isBot: p.isBot,
        score: Math.round(steps * 4 + done * 90 + p.kicks * 65 + (p.id === winnerId ? 130 : 0)),
        detail: `🏁 ${done}/2 Finish • 💥 ${p.kicks}x Tendang`,
      };
    }));
  }

  _advanceTurn(extra = false) {
    this.subPhase = 'roll';
    this.pendingRoll = 0;
    this.validPawns = [];
    if (extra && this.extraRolls < 2) {
      this.extraRolls += 1;
      this.turnTimer = 9.0;
      this.botTimer = randRange(0.9, 1.5);
      return;
    }
    this.extraRolls = 0;
    this.turnIdx = (this.turnIdx + 1) % this.players.length;
    if (this.turnIdx === 0) this.round += 1;
    this.turnTimer = 9.0;
    this.botTimer = randRange(1.0, 1.6);
    if (this.round > this.maxRounds) {
      this._conclude();
    }
  }

  handleAction(playerId, msg) {
    if (this.phase !== 'playing' || this.finished) return;
    const cur = this.activePlayer;
    if (!cur || cur.id !== playerId) return;
    if (this.subPhase === 'roll' && msg.action === 'roll') {
      this._doRoll(cur);
    } else if (this.subPhase === 'pick' && msg.action === 'move_pawn') {
      const pidx = Number(msg.pawnIndex);
      if (this.validPawns.includes(pidx)) this._movePawn(cur, pidx);
    }
  }

  _doRoll(p) {
    const roll = 1 + Math.floor(Math.random() * 6);
    this.lastRoll = { by: p.name, value: roll, color: p.color };
    this.pendingRoll = roll;
    this.validPawns = this._validPawnsFor(p, roll);
    if (this.validPawns.length === 0) {
      this.lastLog = `🎲 ${p.name} lempar ${roll} — tidak ada pion bisa jalan.`;
      this.emitEvent('sfx', { sound: 'pop' });
      this._advanceTurn(false);
    } else if (this.validPawns.length === 1) {
      this._movePawn(p, this.validPawns[0]);
    } else {
      this.subPhase = 'pick';
      this.turnTimer = 7.5;
      this.botTimer = randRange(0.7, 1.2);
      this.lastLog = `🎲 ${p.name} lempar ${roll}! Pilih Pion A atau Pion B untuk dijalankan!`;
      this.emitEvent('sfx', { sound: 'pop' });
    }
  }

  _movePawn(p, pawnIdx) {
    const roll = this.pendingRoll;
    const prev = p.pawns[pawnIdx];
    const next = prev === -1 ? 0 : Math.min(LUDO_RING, prev + roll);
    p.pawns[pawnIdx] = next;
    let extra = roll === 6;
    const label = pawnIdx === 0 ? 'A' : 'B';
    let msg = prev === -1
      ? `🚀 ${p.name} keluarkan Pion ${label} ke arena!`
      : `🎲 ${p.name} gerakkan Pion ${label} (+${roll} → ${next}/${LUDO_RING})`;

    if (next >= LUDO_RING) {
      extra = true;
      msg = `🏁 ${p.name} Pion ${label} MASUK FINISH!! (+120)`;
      this.emitEvent('sfx', { sound: 'correct' });
    } else {
      const gTile = this._globalTile(p, next);
      if (!LUDO_SAFE.has(gTile)) {
        // Check enemy kicks!
        for (const other of this.players) {
          if (other.id === p.id || this.isAlly(p, other)) continue;
          other.pawns.forEach((ost, oidx) => {
            if (ost >= 0 && ost < LUDO_RING && this._globalTile(other, ost) === gTile) {
              other.pawns[oidx] = -1;
              p.kicks += 1;
              extra = true;
              msg = `💥 ${p.name} TENDANG ${other.name} BALIK KE MARKAS! (+65 & Bonus Lempar!)`;
              this.emitEvent('sfx', { sound: 'explode' });
            }
          });
        }
      } else {
        this.emitEvent('sfx', { sound: 'pop' });
      }
    }

    if (p.pawns.every((st) => st >= LUDO_RING)) {
      this.lastLog = `🏆 ${p.name} MEMASUKKAN SEMUA PION & MENANG LUDO!`;
      this.emitEvent('sfx', { sound: 'win' });
      this._conclude(p.id);
      return;
    }

    if (extra) msg += ' • 🎲 Bonus Lempar!';
    this.lastLog = msg;
    this._advanceTurn(extra);
  }

  update(dt) {
    const cur = this.activePlayer;
    if (!cur) return;
    this.turnTimer -= dt;
    if (cur.isBot) {
      this.botTimer -= dt;
      if (this.botTimer <= 0) {
        if (this.subPhase === 'roll') {
          this._doRoll(cur);
        } else {
          // Bot checks if any pawn can kick an enemy!
          let best = this.validPawns[0];
          for (const pidx of this.validPawns) {
            const st = cur.pawns[pidx];
            const next = st === -1 ? 0 : Math.min(LUDO_RING, st + this.pendingRoll);
            const gTile = this._globalTile(cur, next);
            const canKick = gTile >= 0 && !LUDO_SAFE.has(gTile) && this.players.some(
              (o) => o.id !== cur.id && !this.isAlly(cur, o) && o.pawns.some((os) => os >= 0 && os < LUDO_RING && this._globalTile(o, os) === gTile)
            );
            if (canKick || next >= LUDO_RING) { best = pidx; break; }
          }
          this._movePawn(cur, best);
        }
      }
      return;
    }
    if (this.turnTimer <= 0) {
      if (this.subPhase === 'roll') this._doRoll(cur);
      else this._movePawn(cur, this.validPawns[0] ?? 0);
    }
  }

  getState() {
    const cur = this.activePlayer;
    return {
      gameId: this.gameId, boardType: 'ludo-blitz', phase: this.phase,
      countdown: Number(this.countdown.toFixed(1)),
      round: this.round, maxRounds: this.maxRounds,
      subPhase: this.subPhase,
      pendingRoll: this.pendingRoll,
      validPawns: this.validPawns,
      turnPlayerId: cur?.id || null,
      turnTimer: Number(Math.max(0, this.turnTimer).toFixed(1)),
      lastRoll: this.lastRoll,
      lastLog: this.lastLog,
      safeTiles: [...LUDO_SAFE],
      players: this.players.map((p) => {
        const done = p.pawns.filter((st) => st >= LUDO_RING).length;
        const steps = p.pawns.reduce((acc, st) => acc + Math.max(0, st), 0);
        return {
          id: p.id, name: p.name, color: p.color, hat: p.hat, team: p.team,
          startOffset: p.startOffset, pawns: [...p.pawns], kicks: p.kicks,
          score: steps * 4 + done * 90 + p.kicks * 65,
        };
      }),
    };
  }
}
