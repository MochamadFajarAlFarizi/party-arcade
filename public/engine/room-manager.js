import { BombPassGame } from './games/bomb-pass.js';
import { SumoKnockoutGame } from './games/sumo-knockout.js';
import { TurfPaintGame } from './games/turf-paint.js';
import { QuickDrawGame } from './games/quick-draw.js';
import { WordBombGame } from './games/word-bomb.js';
import { ChaosSurvivalGame } from './games/chaos-survival.js';
import {
  CrownChaseGame, CoinRushGame, ZombieTagGame, BumperSoccerGame,
  MeteorShowerGame, SnakePartyGame, GhostFreezeGame, KingHillGame,
} from './games/arcade-pack.js';
import { SharkEscapeGame, DodgeballGame, TurboRaceGame } from './games/action-pack2.js';
import { TriviaRushGame, ReflexDuelGame, MathPanicGame, ClosestWinsGame } from './games/party-quiz-pack.js';
import { DashBladeGame, RicochetDuelGame, MemoryRushGame } from './games/competitive-pack.js';
import { SplitOrStealGame, BlameVoteGame, GreedHeistGame, BetrayalBridgeGame } from './games/perpecahan-pack.js';
import { SnakesLaddersGame, MiniMonopolyGame, CrazyCardsGame, LudoBlitzGame } from './games/board-pack.js';

export const TEAM_DEFS = [
  { id: 0, key: 'red', name: 'Tim Merah', short: 'MERAH', icon: '🔴', color: '#EF4444', bg: '#FEE2E2' },
  { id: 1, key: 'blue', name: 'Tim Biru', short: 'BIRU', icon: '🔵', color: '#3B82F6', bg: '#DBEAFE' },
  { id: 2, key: 'green', name: 'Tim Hijau', short: 'HIJAU', icon: '🟢', color: '#22C55E', bg: '#DCFCE7' },
  { id: 3, key: 'yellow', name: 'Tim Kuning', short: 'KUNING', icon: '🟡', color: '#EAB308', bg: '#FEF9C3' },
];

export const GAME_CATALOG = [
  { id: 'split-or-steal', name: 'Bagi / Khianati', icon: '💸', desc: 'Janji damai atau tikam teman? Serakah berdua hancur!', color: '#E11D48', tag: 'Perpecahan' },
  { id: 'blame-vote', name: 'Fitnah & Tumbal', icon: '🔪', desc: 'Tunjuk tumbal buat rampas poin — awas 🛡️ Perisai Pantul!', color: '#7C3AED', tag: 'Perpecahan' },
  { id: 'greed-heist', name: 'Rampok Brankas', icon: '🏦', desc: 'Lanjut jarah, kabur aman, atau 😈 TEKAN ALARM buat jebak teman!', color: '#D97706', tag: 'Perpecahan' },
  { id: 'betrayal-bridge', name: 'Jembatan Lava', icon: '🌋', desc: 'Rebutan ubin aman & dorong teman jatuh ke lava!', color: '#DC2626', tag: 'Perpecahan' },
  { id: 'snakes-ladders', name: 'Ular Tangga Rusuh', icon: '🐍', desc: 'Balapan 50 petak penuh tangga, ular, tukar posisi & sabotase!', color: '#16A34A', tag: 'Board' },
  { id: 'mini-monopoly', name: 'Monopoli Kilat', icon: '🏠', desc: 'Borong kota, bangun hotel, tarik sewa & bikin teman bangkrut!', color: '#0284C7', tag: 'Board' },
  { id: 'crazy-cards', name: 'Kartu UNO Rusuh', icon: '🃏', desc: 'Habiskan kartumu dulu — lempar +2, Skip, Reverse & Wild +4!', color: '#E11D48', tag: 'Board' },
  { id: 'ludo-blitz', name: 'Ludo Party Kilat', icon: '🏝️', desc: 'Bawa 2 pion ke Finish & tendang pion teman balik ke markas!', color: '#EA580C', tag: 'Board' },
  { id: 'dash-blade', name: 'Dash Blade PvP', icon: '⚔️', desc: 'Duel pedang 3 HP! Dash tebas lawan — bentrok dash jadi CLASH!', color: '#EF4444', tag: 'Action' },
  { id: 'ricochet-duel', name: 'Ricochet Arena', icon: '🔫', desc: 'Tembak bola energi memantul dari dinding & pilar cover!', color: '#6366F1', tag: 'Action' },
  { id: 'bomb-pass', name: 'Bomb Pass', icon: '💣', desc: 'Oper bom sebelum meledak! Dash & hindari!', color: '#FF5E7E', tag: 'Action' },
  { id: 'sumo-knockout', name: 'Sumo Knockout', icon: '🏝️', desc: 'Dorong lawan jatuh dari pulau yang mengecil!', color: '#FF9F1C', tag: 'Action' },
  { id: 'turf-paint', name: 'Turf Paint', icon: '🎨', desc: 'Cat wilayah terbanyak & stun lawan pakai dash!', color: '#A855F7', tag: 'Action' },
  { id: 'crown-chase', name: 'Crown Chase', icon: '👑', desc: 'Rebut mahkota emas & kabur dari semua pemain!', color: '#FACC15', tag: 'Action' },
  { id: 'coin-rush', name: 'Coin Rush', icon: '💰', desc: 'Rebut koin & berlian! Dash lawan biar koinnya tumpah!', color: '#F59E0B', tag: 'Action' },
  { id: 'king-hill', name: 'King of the Hill', icon: '🎯', desc: 'Rebutan zona emas yang terus berpindah tempat!', color: '#FB7185', tag: 'Action' },
  { id: 'dodgeball', name: 'Dodgeball Chaos', icon: '🏐', desc: 'Ambil bola lalu tekan Aksi untuk lempar KO lawan!', color: '#E11D48', tag: 'Sport' },
  { id: 'bumper-soccer', name: 'Bumper Soccer', icon: '⚽', desc: 'Sepak bola rusuh 2 tim! Dash tendang ke gawang!', color: '#22C55E', tag: 'Sport' },
  { id: 'turbo-race', name: 'Turbo Dash Race', icon: '🏁', desc: 'Balap 3 lap lewati lumpur, boost & palang putar!', color: '#06B6D4', tag: 'Sport' },
  { id: 'memory-rush', name: 'Memory Floor', icon: '🧩', desc: 'Hafalkan ubin bintang ⭐ sebelum tertutup & meledak!', color: '#EC4899', tag: 'Survival' },
  { id: 'zombie-tag', name: 'Zombie Tag', icon: '🧟', desc: 'Wabah zombi! Manusia kabur, zombi infeksi semua!', color: '#84CC16', tag: 'Survival' },
  { id: 'ghost-freeze', name: 'Ghost Freeze', icon: '👻', desc: 'Hantu es bekukan pemain; teman bisa cairkan lagi!', color: '#38BDF8', tag: 'Survival' },
  { id: 'meteor-shower', name: 'Meteor Shower', icon: '☄️', desc: 'Hindari hujan meteor & kawah lava yang makin brutal!', color: '#F97316', tag: 'Survival' },
  { id: 'shark-escape', name: 'Shark Escape', icon: '🦈', desc: 'Hindari hiu lapar sambil kumpulkan bintang laut!', color: '#0EA5E9', tag: 'Survival' },
  { id: 'snake-party', name: 'Neon Snake', icon: '🐍', desc: 'Makan buah biar panjang & potong jalur lawan!', color: '#10B981', tag: 'Survival' },
  { id: 'chaos-survival', name: 'Chaos Survival', icon: '⚡', desc: '3 ronde brutal: Lampu Merah, Laser Putar & Lantai Runtuh!', color: '#F43F5E', tag: 'Survival' },
  { id: 'word-bomb', name: 'Sambung Kata Bom', icon: '🔤', desc: 'Sambung suku kata akhir → awal (DA→DALAM→LAM...)!', color: '#22C55E', tag: 'Brain' },
  { id: 'trivia-rush', name: 'Trivia Kilat', icon: '🧠', desc: '105+ soal kuis seru — adu wawasan, kecepatan & streak!', color: '#8B5CF6', tag: 'Brain' },
  { id: 'math-panic', name: 'Math Panic', icon: '🧮', desc: '10 ronde hitung cepat (+, -, ×, ÷, kuadrat, persen)!', color: '#14B8A6', tag: 'Brain' },
  { id: 'closest-wins', name: 'Tebak Angka', icon: '🎲', desc: 'Tebak angka fakta unik terdekat — tepat sasaran JACKPOT!', color: '#F97316', tag: 'Brain' },
  { id: 'quick-draw', name: 'Tebak Gambar', icon: '✏️', desc: 'Gambar cepat & tebak kata bareng teman di chat!', color: '#38BDF8', tag: 'Social' },
  { id: 'reflex-duel', name: 'Reflex Duel', icon: '⚡', desc: 'Adu refleks milidetik! Awas kena jebakan warna palsu!', color: '#EC4899', tag: 'Social' },
];

const GAME_CONSTRUCTORS = {
  'split-or-steal': SplitOrStealGame,
  'blame-vote': BlameVoteGame,
  'greed-heist': GreedHeistGame,
  'betrayal-bridge': BetrayalBridgeGame,
  'snakes-ladders': SnakesLaddersGame,
  'mini-monopoly': MiniMonopolyGame,
  'crazy-cards': CrazyCardsGame,
  'ludo-blitz': LudoBlitzGame,
  'dash-blade': DashBladeGame,
  'ricochet-duel': RicochetDuelGame,
  'memory-rush': MemoryRushGame,
  'closest-wins': ClosestWinsGame,
  'bomb-pass': BombPassGame,
  'sumo-knockout': SumoKnockoutGame,
  'turf-paint': TurfPaintGame,
  'quick-draw': QuickDrawGame,
  'word-bomb': WordBombGame,
  'chaos-survival': ChaosSurvivalGame,
  'crown-chase': CrownChaseGame,
  'coin-rush': CoinRushGame,
  'zombie-tag': ZombieTagGame,
  'bumper-soccer': BumperSoccerGame,
  'meteor-shower': MeteorShowerGame,
  'snake-party': SnakePartyGame,
  'ghost-freeze': GhostFreezeGame,
  'king-hill': KingHillGame,
  'shark-escape': SharkEscapeGame,
  'dodgeball': DodgeballGame,
  'turbo-race': TurboRaceGame,
  'trivia-rush': TriviaRushGame,
  'reflex-duel': ReflexDuelGame,
  'math-panic': MathPanicGame,
};

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const BOT_NAMES = ['BotBoba', 'BotMochi', 'BotNeko', 'BotTaco', 'BotYuzu', 'BotKopi', 'BotSate', 'BotDino', 'BotPika', 'BotCendol', 'BotUfo'];
const COLORS = ['#FF5E7E', '#38BDF8', '#FFD166', '#22C55E', '#A855F7', '#FF9F1C', '#EC4899', '#14B8A6', '#84CC16', '#6366F1', '#F43F5E', '#FB923C'];
const HATS = ['none', 'headset', 'cat', 'cap', 'shades', 'sprout', 'halo', 'bow', 'cowboy', 'crown'];
const MAX_PLAYERS = 12;

function sanitizeName(raw) {
  return String(raw || 'Pemain').replace(/[<>]/g, '').trim().slice(0, 16) || 'Pemain';
}

export class Room {
  constructor(code, manager) {
    this.code = code;
    this.manager = manager;
    this.players = new Map(); // id -> { id, ws, name, color, hat, isBot, sessionScore, wins, ready }
    this.hostId = null;
    this.state = 'lobby'; // lobby | playing | podium
    this.currentGame = null;
    this.tickHandle = null;
    this.lastTickAt = 0;
    this.partyCup = null; // { queue: string[], index: number, total: number }
    this.lastStandings = [];
    this.botCounter = 0;
    this.savedScores = new Map(); // nameLower -> { sessionScore, wins, oldId, team } — preserves scores on disconnect/rejoin!
    this.teamMode = false; // false = FFA Solo, true = Co-op / Team Mode
    this.teamCount = 2; // 2, 3, or 4 teams
    this.teamScores = [0, 0, 0, 0];
  }

  isSameTeam(a, b) {
    if (!this.teamMode || !a || !b || a.id === b.id) return false;
    const ta = a.team !== undefined ? a.team : this.players.get(a.id)?.team;
    const tb = b.team !== undefined ? b.team : this.players.get(b.id)?.team;
    return ta !== undefined && ta === tb;
  }

  _pickBalancedTeam() {
    const counts = Array.from({ length: this.teamCount }, () => 0);
    for (const p of this.players.values()) {
      const t = (p.team ?? 0) % this.teamCount;
      counts[t] += 1;
    }
    let best = 0;
    for (let i = 1; i < counts.length; i++) {
      if (counts[i] < counts[best]) best = i;
    }
    return best;
  }

  _normalizeTeams(shuffle = false) {
    const list = this.playerList;
    if (shuffle) {
      const shuffled = [...list].sort(() => Math.random() - 0.5);
      shuffled.forEach((p, idx) => { p.team = idx % this.teamCount; });
    } else {
      for (const p of list) {
        if (p.team === undefined || p.team >= this.teamCount) {
          p.team = this._pickBalancedTeam();
        }
      }
    }
  }

  setTeamConfig(requesterId, cfg = {}) {
    if (requesterId !== this.hostId || this.state !== 'lobby') return;
    if (typeof cfg.enabled === 'boolean') {
      this.teamMode = cfg.enabled;
    }
    if (typeof cfg.perTeam === 'number' && cfg.perTeam >= 1) {
      this.teamMode = true;
      const n = Math.max(2, this.players.size);
      this.teamCount = Math.max(2, Math.min(4, Math.ceil(n / cfg.perTeam)));
      this._normalizeTeams(true);
    } else if (typeof cfg.teamCount === 'number') {
      this.teamCount = Math.max(2, Math.min(4, Math.round(cfg.teamCount)));
      this._normalizeTeams(!!cfg.shuffle);
    } else if (cfg.shuffle) {
      this._normalizeTeams(true);
    } else if (this.teamMode) {
      // Ensure at least 2 teams have players if everyone was stuck on team 0
      const used = new Set(this.playerList.map((p) => p.team ?? 0));
      if (used.size < 2 && this.players.size >= 2) {
        this._normalizeTeams(true);
      } else {
        this._normalizeTeams(false);
      }
    }
    if (cfg.balance) {
      const list = this.playerList;
      list.forEach((p, idx) => { p.team = idx % this.teamCount; });
    }
    this.broadcast({
      type: 'chat', system: true, tone: 'info',
      text: this.teamMode
        ? `🤝 Mode TEAM aktif (${this.teamCount} Tim)! Klik warna tim pemain untuk atur susunan.`
        : '👤 Mode berubah ke FFA (Solo / Semua Lawan Semua)!',
    });
    this.broadcastLobby();
  }

  setPlayerTeam(requesterId, targetId, teamIdx) {
    if (this.state !== 'lobby') return;
    const tid = targetId || requesterId;
    if (requesterId !== this.hostId && tid !== requesterId) return;
    const p = this.players.get(tid);
    if (!p) return;
    const nextTeam = Number.isInteger(teamIdx)
      ? ((teamIdx % this.teamCount) + this.teamCount) % this.teamCount
      : ((p.team ?? 0) + 1) % this.teamCount;
    p.team = nextTeam;
    this.broadcastLobby();
  }

  get playerList() {
    return [...this.players.values()];
  }

  get humanCount() {
    return this.playerList.filter((p) => !p.isBot).length;
  }

  _rebindActiveGamePlayer(oldId, newId, nameLower) {
    const g = this.currentGame;
    if (!g) return false;
    let rebound = false;
    const match = (e) => e && !e.isBot && (e.id === oldId || (e.name && e.name.toLowerCase() === nameLower));
    if (Array.isArray(g.entities)) {
      for (const e of g.entities) {
        if (match(e)) {
          const prevId = e.id;
          e.id = newId;
          rebound = true;
          if (Array.isArray(g.bombs)) g.bombs.forEach((b) => { if (b.holderId === prevId) b.holderId = newId; });
          if (g.crown && g.crown.holderId === prevId) g.crown.holderId = newId;
          if (Array.isArray(g.balls)) g.balls.forEach((b) => { if (b.ownerId === prevId) b.ownerId = newId; if (b.thrownBy === prevId) b.thrownBy = newId; });
          if (Array.isArray(g.bullets)) g.bullets.forEach((b) => { if (b.ownerId === prevId) b.ownerId = newId; });
        }
      }
    }
    if (Array.isArray(g.players)) {
      for (const e of g.players) {
        if (match(e)) {
          e.id = newId;
          rebound = true;
        }
      }
    }
    return rebound;
  }

  addHuman(ws, profile = {}) {
    // If same ws.id is already in room (e.g. reconnected within grace window), refresh cleanly
    const existingSameId = this.players.get(ws.id);
    if (existingSameId) {
      existingSameId.ws = ws;
      if (profile.name) existingSameId.name = sanitizeName(profile.name);
      if (COLORS.includes(profile.color)) existingSameId.color = profile.color;
      if (HATS.includes(profile.hat)) existingSameId.hat = profile.hat;
      this.broadcastLobby();
      if (this.state === 'playing' && this.currentGame) {
        const activeInGame = this._rebindActiveGamePlayer(existingSameId.id, existingSameId.id, existingSameId.name.toLowerCase());
        ws.sendJSON({
          type: 'game_start',
          gameId: this.currentGame.gameId,
          spectating: !activeInGame,
          partyCup: this._cupSummary(),
          meta: GAME_CATALOG.find((g) => g.id === this.currentGame.gameId),
        });
        if (this.currentGame.gameId === 'quick-draw') {
          ws.sendJSON({ type: 'draw_sync', strokes: this.currentGame.strokes });
        }
      }
      return { player: existingSameId };
    }
    if (this.players.size >= MAX_PLAYERS) {
      return { error: 'Room sudah penuh (maks 12 pemain)!' };
    }
    const cleanName = sanitizeName(profile.name);
    const nameKey = cleanName.toLowerCase();
    const saved = this.savedScores.get(nameKey);

    const usedColors = new Set(this.playerList.map((p) => p.color));
    const color = COLORS.includes(profile.color) ? profile.color : (COLORS.find((c) => !usedColors.has(c)) || COLORS[0]);
    const hat = HATS.includes(profile.hat) ? profile.hat : 'headset';
    const assignedTeam = saved && saved.team !== undefined
      ? (saved.team % this.teamCount)
      : this._pickBalancedTeam();
    const player = {
      id: ws.id,
      ws,
      name: cleanName,
      color,
      hat,
      team: assignedTeam,
      isBot: false,
      sessionScore: saved ? saved.sessionScore : 0,
      wins: saved ? saved.wins : 0,
    };
    this.players.set(player.id, player);
    if (!this.hostId) this.hostId = player.id;

    let reboundInGame = false;
    if (this.state === 'playing' && this.currentGame) {
      reboundInGame = this._rebindActiveGamePlayer(saved?.oldId, player.id, nameKey);
    }

    this.broadcastLobby();
    if (saved && (saved.sessionScore > 0 || saved.wins > 0)) {
      this.broadcast({
        type: 'chat', system: true, tone: 'success',
        text: `🔄 ${player.name} kembali masuk! Skor (${player.sessionScore} pts) dipulihkan!`,
      });
    } else {
      this.broadcast({ type: 'chat', system: true, tone: 'info', text: `👋 ${player.name} bergabung ke room!` });
    }

    // If game is already running, let them resume their character or spectate live
    if (this.state === 'playing' && this.currentGame) {
      ws.sendJSON({
        type: 'game_start',
        gameId: this.currentGame.gameId,
        spectating: !reboundInGame,
        partyCup: this._cupSummary(),
        meta: GAME_CATALOG.find((g) => g.id === this.currentGame.gameId),
      });
      if (this.currentGame.gameId === 'quick-draw') {
        ws.sendJSON({ type: 'draw_sync', strokes: this.currentGame.strokes });
      }
    }
    return { player };
  }

  removePlayer(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;

    // Persist human player's session score so if they disconnect & rejoin, points are NOT reset!
    if (!p.isBot && p.name) {
      this.savedScores.set(p.name.toLowerCase(), {
        sessionScore: p.sessionScore,
        wins: p.wins,
        team: p.team ?? 0,
        oldId: p.id,
        leftAt: Date.now(),
      });
    }

    this.players.delete(playerId);

    if (this.hostId === playerId) {
      const nextHuman = this.playerList.find((x) => !x.isBot);
      this.hostId = nextHuman ? nextHuman.id : null;
    }

    if (this.humanCount === 0) {
      this.destroy();
      this.manager.rooms.delete(this.code);
      return;
    }

    this.broadcast({ type: 'chat', system: true, tone: 'info', text: `🚪 ${p.name} terputus (skor ${p.sessionScore} pts disimpan jika gabung lagi).` });
    this.broadcastLobby();
  }

  updateProfile(playerId, profile) {
    const p = this.players.get(playerId);
    if (!p) return;
    if (profile.name) p.name = sanitizeName(profile.name);
    if (COLORS.includes(profile.color)) p.color = profile.color;
    if (HATS.includes(profile.hat)) p.hat = profile.hat;
    this.broadcastLobby();
  }

  addBot(requesterId) {
    if (requesterId !== this.hostId || this.state !== 'lobby') return;
    if (this.players.size >= MAX_PLAYERS) return;
    this.botCounter += 1;
    const usedNames = new Set(this.playerList.map((p) => p.name));
    const usedColors = new Set(this.playerList.map((p) => p.color));
    const name = BOT_NAMES.find((n) => !usedNames.has(n)) || `Bot${this.botCounter}`;
    const color = COLORS.find((c) => !usedColors.has(c)) || COLORS[this.botCounter % COLORS.length];
    const hat = HATS[1 + (this.botCounter % (HATS.length - 1))];
    const id = `bot_${this.code}_${this.botCounter}`;
    this.players.set(id, {
      id,
      ws: null,
      name,
      color,
      hat,
      team: this._pickBalancedTeam(),
      isBot: true,
      sessionScore: 0,
      wins: 0,
    });
    this.broadcastLobby();
  }

  removeBot(requesterId, botId) {
    if (requesterId !== this.hostId || this.state !== 'lobby') return;
    if (botId) {
      const p = this.players.get(botId);
      if (p?.isBot) this.players.delete(botId);
    } else {
      const bots = this.playerList.filter((p) => p.isBot);
      if (bots.length > 0) this.players.delete(bots[bots.length - 1].id);
    }
    this.broadcastLobby();
  }

  startSingleGame(requesterId, gameId) {
    if (requesterId !== this.hostId) return;
    if (!GAME_CONSTRUCTORS[gameId]) return;
    this.partyCup = null;
    this._launchGame(gameId);
  }

  startPartyCup(requesterId, rounds = 3) {
    if (requesterId !== this.hostId) return;
    const count = Math.max(2, Math.min(GAME_CATALOG.length, Number(rounds) || 3));
    const shuffled = [...GAME_CATALOG.map((g) => g.id)].sort(() => Math.random() - 0.5);
    this.partyCup = { queue: shuffled.slice(0, count), index: 0, total: count };
    this.savedScores.clear();
    this.teamScores = [0, 0, 0, 0];
    for (const p of this.players.values()) p.sessionScore = 0;
    this._launchGame(this.partyCup.queue[0]);
  }

  nextPartyCupRound(requesterId) {
    if (requesterId !== this.hostId || !this.partyCup) return;
    if (this.partyCup.index + 1 < this.partyCup.total) {
      this.partyCup.index += 1;
      this._launchGame(this.partyCup.queue[this.partyCup.index]);
    } else {
      this.returnToLobby(requesterId);
    }
  }

  returnToLobby(requesterId) {
    if (requesterId && requesterId !== this.hostId) return;
    this._stopLoop();
    this.currentGame = null;
    this.partyCup = null;
    this.state = 'lobby';
    this.broadcastLobby();
  }

  _launchGame(gameId) {
    // Auto-add a friendly bot if playing solo so every game works immediately!
    if (this.players.size < 2) {
      this.addBot(this.hostId);
    }
    this._stopLoop();
    const Ctor = GAME_CONSTRUCTORS[gameId];
    const participants = this.playerList;
    this.currentGame = new Ctor(this, participants);
    this.state = 'playing';

    this.broadcast({
      type: 'game_start',
      gameId,
      partyCup: this._cupSummary(),
      meta: GAME_CATALOG.find((g) => g.id === gameId),
    });

    this.lastTickAt = Date.now();
    const turnBased = [
      'quick-draw', 'word-bomb', 'trivia-rush', 'math-panic', 'closest-wins',
      'split-or-steal', 'blame-vote', 'greed-heist',
      'snakes-ladders', 'mini-monopoly', 'crazy-cards', 'ludo-blitz',
    ].includes(gameId);
    const defaultTick = this.manager.tickMs || 33;
    const intervalMs = turnBased ? Math.max(defaultTick, 120) : defaultTick;
    this.tickHandle = setInterval(() => this._tick(), intervalMs);
  }

  _enrichTeamState(state) {
    if (!state || !this.teamMode) return state;
    state.teamMode = true;
    state.teamCount = this.teamCount;
    if (Array.isArray(state.players)) {
      for (const sp of state.players) {
        const rp = this.players.get(sp.id);
        if (rp) sp.team = rp.team ?? 0;
      }
    }
    return state;
  }

  _tick() {
    if (!this.currentGame || this.state !== 'playing') return;
    const now = Date.now();
    const dt = Math.min(0.08, (now - this.lastTickAt) / 1000);
    this.lastTickAt = now;

    this.currentGame.step(dt);
    const events = this.currentGame.flushEvents();

    if (!this.currentGame) return; // finished inside step()

    if (typeof this.currentGame.getStateFor === 'function') {
      for (const p of this.players.values()) {
        if (p.ws) {
          p.ws.sendJSON({
            type: 'game_state',
            state: this._enrichTeamState(this.currentGame.getStateFor(p.id)),
            events,
          });
        }
      }
    } else {
      this.broadcast({
        type: 'game_state',
        state: this._enrichTeamState(this.currentGame.getState()),
        events,
      });
    }
  }

  onGameFinished(gameId, standings) {
    this._stopLoop();
    this.state = 'podium';
    this.lastStandings = standings;

    // Attach team info to individual standings
    for (const s of standings) {
      const p = this.players.get(s.id);
      if (p) s.team = p.team ?? 0;
    }

    // Compute Team Standings if Team Mode is ON!
    let teamStandings = null;
    let teamSessionStandings = null;
    const winTeamMemberIds = new Set();
    if (this.teamMode) {
      const buckets = new Map();
      for (const s of standings) {
        const tid = (s.team ?? 0) % this.teamCount;
        if (!buckets.has(tid)) buckets.set(tid, []);
        buckets.get(tid).push(s);
      }
      const maxSize = Math.max(1, ...[...buckets.values()].map((arr) => arr.length));
      const allEqualSize = [...buckets.values()].every((arr) => arr.length === maxSize);

      teamStandings = [...buckets.entries()].map(([tid, members]) => {
        const def = TEAM_DEFS[tid] || TEAM_DEFS[0];
        const rawSum = members.reduce((acc, m) => acc + (m.score || 0), 0);
        // Fairly normalize if teams are uneven (e.g. 2v1), otherwise show exact sum!
        const score = allEqualSize ? Math.round(rawSum) : Math.round((rawSum / members.length) * maxSize);
        return {
          teamId: tid,
          name: def.name,
          icon: def.icon,
          color: def.color,
          bg: def.bg,
          score,
          rawSum: Math.round(rawSum),
          members: members.map((m) => m.name),
          memberIds: members.map((m) => m.id),
          detail: members.map((m) => m.name).join(' + ') + (allEqualSize ? '' : ' (rata-rata disesuaikan)'),
        };
      }).sort((a, b) => b.score - a.score);

      teamStandings.forEach((t, idx) => {
        t.rank = idx + 1;
        this.teamScores[t.teamId] = (this.teamScores[t.teamId] || 0) + t.score;
        if (idx === 0) t.memberIds.forEach((id) => winTeamMemberIds.add(id));
      });
    }

    // Accumulate session scores (also update savedScores if a player temporarily disconnected mid-round!)
    for (const s of standings) {
      const p = this.players.get(s.id);
      const teamBonus = winTeamMemberIds.has(s.id) ? 40 : 0;
      if (p) {
        p.sessionScore += s.score + teamBonus;
        if (s.rank === 1 || winTeamMemberIds.has(s.id)) p.wins += 1;
        if (!p.isBot && p.name) {
          this.savedScores.set(p.name.toLowerCase(), {
            sessionScore: p.sessionScore, wins: p.wins, team: p.team ?? 0, oldId: p.id, leftAt: Date.now(),
          });
        }
      } else if (!s.isBot && s.name) {
        const k = s.name.toLowerCase();
        const prev = this.savedScores.get(k) || { sessionScore: 0, wins: 0, team: s.team ?? 0, oldId: s.id };
        this.savedScores.set(k, {
          sessionScore: prev.sessionScore + s.score + teamBonus,
          wins: prev.wins + (s.rank === 1 || winTeamMemberIds.has(s.id) ? 1 : 0),
          team: prev.team,
          oldId: prev.oldId,
          leftAt: Date.now(),
        });
      }
    }

    if (this.teamMode) {
      teamSessionStandings = Array.from({ length: this.teamCount }, (_, tid) => {
        const def = TEAM_DEFS[tid] || TEAM_DEFS[0];
        const members = this.playerList.filter((p) => (p.team ?? 0) === tid);
        return {
          teamId: tid,
          name: def.name,
          icon: def.icon,
          color: def.color,
          bg: def.bg,
          score: this.teamScores[tid] || 0,
          members: members.map((m) => m.name),
          detail: members.map((m) => m.name).join(' + ') || 'Kosong',
        };
      }).filter((t) => t.members.length > 0 || t.score > 0).sort((a, b) => b.score - a.score);
      teamSessionStandings.forEach((t, i) => { t.rank = i + 1; });
    }

    this.manager.leaderboard.recordGameResult({
      gameId,
      roomCode: this.code,
      standings,
    });

    const cupDone = this.partyCup ? this.partyCup.index + 1 >= this.partyCup.total : true;
    const sessionStandings = this.playerList
      .map((p) => ({
        id: p.id, name: p.name, color: p.color, hat: p.hat, team: p.team ?? 0,
        isBot: p.isBot, sessionScore: p.sessionScore, wins: p.wins,
      }))
      .sort((a, b) => b.sessionScore - a.sessionScore);

    this.broadcast({
      type: 'game_over',
      gameId,
      meta: GAME_CATALOG.find((g) => g.id === gameId),
      teamMode: this.teamMode,
      teamCount: this.teamCount,
      teamStandings,
      teamSessionStandings,
      standings,
      sessionStandings,
      partyCup: this._cupSummary(),
      cupFinished: !!(this.partyCup && cupDone),
      leaderboard: this.manager.leaderboard.getLeaderboard(25),
    });
  }

  handleInput(playerId, input) {
    if (this.state === 'playing' && this.currentGame) {
      this.currentGame.setInput(playerId, input);
    }
  }

  handleGameAction(playerId, msg) {
    if (this.state === 'playing' && this.currentGame) {
      this.currentGame.handleAction(playerId, msg);
    }
  }

  handleChat(playerId, text) {
    const p = this.players.get(playerId);
    if (!p) return;
    const clean = String(text || '').trim().slice(0, 120);
    if (!clean) return;
    // If Quick Draw is running and player is guessing, route as guess
    if (this.state === 'playing' && this.currentGame?.gameId === 'quick-draw') {
      this.currentGame.handleAction(playerId, { action: 'guess', text: clean });
      return;
    }
    this.broadcast({ type: 'chat', from: p.name, color: p.color, text: clean });
  }

  handleReaction(playerId, msg) {
    const p = this.players.get(playerId);
    if (!p) return;
    const now = Date.now();
    if (p.lastReactAt && now - p.lastReactAt < 550) return;

    const emoji = typeof msg === 'string' ? msg : msg?.emoji;
    const customImage = typeof msg === 'object' ? msg?.customImage : null;
    const label = typeof msg === 'object' && msg?.label
      ? String(msg.label).replace(/[<>]/g, '').trim().slice(0, 14)
      : '';

    if (customImage && typeof customImage === 'string') {
      const validPrefix = /^data:image\/(png|webp|jpeg);base64,[A-Za-z0-9+/=]+$/.test(customImage);
      if (!validPrefix || customImage.length > 48000) return;
      p.lastReactAt = now;
      this.broadcast({
        type: 'reaction',
        playerId: p.id,
        name: p.name,
        color: p.color,
        customImage,
        label,
      });
      return;
    }

    const allowed = ['😂', '🔥', '😱', '💀', '👑', '👏', '🎉', '❤️'];
    if (!allowed.includes(emoji)) return;
    p.lastReactAt = now;
    this.broadcast({ type: 'reaction', playerId: p.id, name: p.name, color: p.color, emoji });
  }

  _cupSummary() {
    if (!this.partyCup) return null;
    return {
      round: this.partyCup.index + 1,
      total: this.partyCup.total,
      queue: this.partyCup.queue,
    };
  }

  broadcastLobby() {
    const leaderId = this._leaderId();
    const payload = {
      type: 'room_state',
      code: this.code,
      state: this.state,
      hostId: this.hostId,
      leaderId,
      teamMode: this.teamMode,
      teamCount: this.teamCount,
      teamScores: this.teamScores.slice(0, this.teamCount),
      games: GAME_CATALOG,
      players: this.playerList.map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        hat: p.hat,
        team: p.team ?? 0,
        isBot: p.isBot,
        sessionScore: p.sessionScore,
        wins: p.wins,
      })),
    };
    this.broadcast(payload);
  }

  _leaderId() {
    let top = null;
    for (const p of this.players.values()) {
      if (p.sessionScore > 0 && (!top || p.sessionScore > top.sessionScore)) top = p;
    }
    return top?.id || null;
  }

  sendToPlayer(playerId, obj) {
    const p = this.players.get(playerId);
    if (p?.ws) p.ws.sendJSON(obj);
  }

  broadcast(obj, excludeId = null) {
    if (typeof this.manager.onRoomBroadcast === 'function') {
      this.manager.onRoomBroadcast(this, obj, excludeId);
      return;
    }
    const raw = JSON.stringify(obj);
    for (const p of this.players.values()) {
      if (p.ws && p.id !== excludeId) {
        p.ws.sendText(raw);
      }
    }
  }

  _stopLoop() {
    if (this.tickHandle) {
      clearInterval(this.tickHandle);
      this.tickHandle = null;
    }
  }

  destroy() {
    this._stopLoop();
    this.currentGame = null;
  }
}

export class RoomManager {
  constructor(leaderboard) {
    this.leaderboard = leaderboard;
    this.rooms = new Map(); // code -> Room
    this.clientRoom = new Map(); // ws.id -> Room
  }

  _generateCode() {
    for (let attempt = 0; attempt < 100; attempt++) {
      let code = '';
      for (let i = 0; i < 4; i++) {
        code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
      }
      if (!this.rooms.has(code)) return code;
    }
    return `R${Date.now().toString(36).slice(-3).toUpperCase()}`;
  }

  handleMessage(ws, raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (!msg || typeof msg.type !== 'string') return;

    const currentRoom = this.clientRoom.get(ws.id);

    switch (msg.type) {
      case 'get_leaderboard':
        ws.sendJSON({ type: 'leaderboard', data: this.leaderboard.getLeaderboard(50) });
        break;

      case 'create_room': {
        if (currentRoom) this.leaveRoom(ws);
        const code = this._generateCode();
        const room = new Room(code, this);
        this.rooms.set(code, room);
        this.clientRoom.set(ws.id, room);
        ws.sendJSON({ type: 'welcome', playerId: ws.id, roomCode: code });
        room.addHuman(ws, msg.profile || {});
        break;
      }

      case 'join_room': {
        const code = String(msg.code || '').trim().toUpperCase();
        const room = this.rooms.get(code);
        if (!room) {
          ws.sendJSON({ type: 'error', message: `Room "${code}" tidak ditemukan! Cek kode dari temanmu.` });
          return;
        }
        if (!room.players.has(ws.id) && room.players.size >= MAX_PLAYERS) {
          ws.sendJSON({ type: 'error', message: 'Room sudah penuh (maks 12 pemain)!' });
          return;
        }
        if (currentRoom && currentRoom !== room) this.leaveRoom(ws);
        this.clientRoom.set(ws.id, room);
        // Send welcome BEFORE addHuman so client switches to lobby first, then mid-game game_start switches cleanly to game!
        ws.sendJSON({ type: 'welcome', playerId: ws.id, roomCode: code });
        room.addHuman(ws, msg.profile || {});
        break;
      }

      case 'leave_room':
        this.leaveRoom(ws);
        break;

      case 'update_profile':
        currentRoom?.updateProfile(ws.id, msg.profile || {});
        break;

      case 'add_bot':
        currentRoom?.addBot(ws.id);
        break;

      case 'remove_bot':
        currentRoom?.removeBot(ws.id, msg.botId);
        break;

      case 'set_team_config':
        currentRoom?.setTeamConfig(ws.id, msg);
        break;

      case 'set_player_team':
        currentRoom?.setPlayerTeam(ws.id, msg.targetId, msg.team);
        break;

      case 'start_game':
        currentRoom?.startSingleGame(ws.id, msg.gameId);
        break;

      case 'start_cup':
        currentRoom?.startPartyCup(ws.id, msg.rounds);
        break;

      case 'next_cup_round':
        currentRoom?.nextPartyCupRound(ws.id);
        break;

      case 'back_to_lobby':
        currentRoom?.returnToLobby(ws.id);
        break;

      case 'input':
        currentRoom?.handleInput(ws.id, msg);
        break;

      case 'game_action':
        currentRoom?.handleGameAction(ws.id, msg);
        break;

      case 'chat':
        currentRoom?.handleChat(ws.id, msg.text);
        break;

      case 'reaction':
        currentRoom?.handleReaction(ws.id, msg);
        break;

      default:
        break;
    }
  }

  leaveRoom(ws) {
    const room = this.clientRoom.get(ws.id);
    if (!room) return;
    this.clientRoom.delete(ws.id);
    room.removePlayer(ws.id);
  }
}
