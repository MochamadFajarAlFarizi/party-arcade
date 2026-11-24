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
import { TriviaRushGame, ReflexDuelGame, MathPanicGame } from './games/party-quiz-pack.js';

export const GAME_CATALOG = [
  { id: 'bomb-pass', name: 'Bomb Pass', icon: '💣', desc: 'Oper bom sebelum meledak! Dash & hindari!', color: '#FF5E7E', tag: 'Action' },
  { id: 'sumo-knockout', name: 'Sumo Knockout', icon: '🏝️', desc: 'Dorong lawan jatuh dari pulau yang mengecil!', color: '#FF9F1C', tag: 'Action' },
  { id: 'turf-paint', name: 'Turf Paint', icon: '🎨', desc: 'Cat wilayah terbanyak & stun lawan pakai dash!', color: '#A855F7', tag: 'Action' },
  { id: 'crown-chase', name: 'Crown Chase', icon: '👑', desc: 'Rebut mahkota emas & kabur dari semua pemain!', color: '#FACC15', tag: 'Action' },
  { id: 'coin-rush', name: 'Coin Rush', icon: '💰', desc: 'Rebut koin & berlian! Dash lawan biar koinnya tumpah!', color: '#F59E0B', tag: 'Action' },
  { id: 'king-hill', name: 'King of the Hill', icon: '🎯', desc: 'Rebutan zona emas yang terus berpindah tempat!', color: '#FB7185', tag: 'Action' },
  { id: 'dodgeball', name: 'Dodgeball Chaos', icon: '🏐', desc: 'Ambil bola lalu tekan Aksi untuk lempar KO lawan!', color: '#EF4444', tag: 'Sport' },
  { id: 'bumper-soccer', name: 'Bumper Soccer', icon: '⚽', desc: 'Sepak bola rusuh 2 tim! Dash tendang ke gawang!', color: '#22C55E', tag: 'Sport' },
  { id: 'turbo-race', name: 'Turbo Dash Race', icon: '🏁', desc: 'Balap 3 lap lewati lumpur, boost & palang putar!', color: '#06B6D4', tag: 'Sport' },
  { id: 'zombie-tag', name: 'Zombie Tag', icon: '🧟', desc: 'Wabah zombi! Manusia kabur, zombi infeksi semua!', color: '#84CC16', tag: 'Survival' },
  { id: 'ghost-freeze', name: 'Ghost Freeze', icon: '👻', desc: 'Hantu es bekukan pemain; teman bisa cairkan lagi!', color: '#38BDF8', tag: 'Survival' },
  { id: 'meteor-shower', name: 'Meteor Shower', icon: '☄️', desc: 'Hindari hujan meteor & kawah lava yang makin brutal!', color: '#F97316', tag: 'Survival' },
  { id: 'shark-escape', name: 'Shark Escape', icon: '🦈', desc: 'Hindari hiu lapar sambil kumpulkan bintang laut!', color: '#0EA5E9', tag: 'Survival' },
  { id: 'snake-party', name: 'Neon Snake', icon: '🐍', desc: 'Makan buah biar panjang & potong jalur lawan!', color: '#10B981', tag: 'Survival' },
  { id: 'chaos-survival', name: 'Chaos Survival', icon: '⚡', desc: '3 ronde brutal: Lampu Merah, Laser Putar & Lantai Runtuh!', color: '#F43F5E', tag: 'Survival' },
  { id: 'word-bomb', name: 'Sambung Kata Bom', icon: '🔤', desc: 'Sambung suku kata akhir → awal (DA→DALAM→LAM...)!', color: '#22C55E', tag: 'Brain' },
  { id: 'quick-draw', name: 'Tebak Gambar', icon: '✏️', desc: 'Gambar cepat & tebak kata bareng teman di chat!', color: '#38BDF8', tag: 'Social' },
  { id: 'trivia-rush', name: 'Trivia Kilat', icon: '🧠', desc: 'Kuis seru 7 soal cepat — adu wawasan & kecepatan!', color: '#8B5CF6', tag: 'Brain' },
  { id: 'reflex-duel', name: 'Reflex Duel', icon: '⚡', desc: 'Adu refleks milidetik! Awas kena jebakan warna palsu!', color: '#EC4899', tag: 'Social' },
  { id: 'math-panic', name: 'Math Panic', icon: '🧮', desc: 'Hitung cepat di bawah tekanan! Siapa kalkulator jalan?', color: '#14B8A6', tag: 'Brain' },
];

const GAME_CONSTRUCTORS = {
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
  }

  get playerList() {
    return [...this.players.values()];
  }

  get humanCount() {
    return this.playerList.filter((p) => !p.isBot).length;
  }

  addHuman(ws, profile = {}) {
    if (this.players.size >= MAX_PLAYERS) {
      return { error: 'Room sudah penuh (maks 12 pemain)!' };
    }
    const usedColors = new Set(this.playerList.map((p) => p.color));
    const color = COLORS.includes(profile.color) ? profile.color : (COLORS.find((c) => !usedColors.has(c)) || COLORS[0]);
    const hat = HATS.includes(profile.hat) ? profile.hat : 'headset';
    const player = {
      id: ws.id,
      ws,
      name: sanitizeName(profile.name),
      color,
      hat,
      isBot: false,
      sessionScore: 0,
      wins: 0,
    };
    this.players.set(player.id, player);
    if (!this.hostId) this.hostId = player.id;

    this.broadcastLobby();
    this.broadcast({ type: 'chat', system: true, tone: 'info', text: `👋 ${player.name} bergabung ke room!` });

    // If game is already running, let them spectate live
    if (this.state === 'playing' && this.currentGame) {
      ws.sendJSON({ type: 'game_start', gameId: this.currentGame.gameId, spectating: true, partyCup: this._cupSummary() });
      if (this.currentGame.gameId === 'quick-draw') {
        ws.sendJSON({ type: 'draw_sync', strokes: this.currentGame.strokes });
      }
    }
    return { player };
  }

  removePlayer(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;
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

    this.broadcast({ type: 'chat', system: true, tone: 'info', text: `🚪 ${p.name} keluar dari room.` });
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
    const turnBased = ['quick-draw', 'word-bomb', 'trivia-rush', 'math-panic'].includes(gameId);
    const defaultTick = this.manager.tickMs || 33;
    const intervalMs = turnBased ? Math.max(defaultTick, 120) : defaultTick;
    this.tickHandle = setInterval(() => this._tick(), intervalMs);
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
            state: this.currentGame.getStateFor(p.id),
            events,
          });
        }
      }
    } else {
      this.broadcast({
        type: 'game_state',
        state: this.currentGame.getState(),
        events,
      });
    }
  }

  onGameFinished(gameId, standings) {
    this._stopLoop();
    this.state = 'podium';
    this.lastStandings = standings;

    // Accumulate session scores
    for (const s of standings) {
      const p = this.players.get(s.id);
      if (p) {
        p.sessionScore += s.score;
        if (s.rank === 1) p.wins += 1;
      }
    }

    this.manager.leaderboard.recordGameResult({
      gameId,
      roomCode: this.code,
      standings,
    });

    const cupDone = this.partyCup ? this.partyCup.index + 1 >= this.partyCup.total : true;
    const sessionStandings = this.playerList
      .map((p) => ({ id: p.id, name: p.name, color: p.color, hat: p.hat, isBot: p.isBot, sessionScore: p.sessionScore, wins: p.wins }))
      .sort((a, b) => b.sessionScore - a.sessionScore);

    this.broadcast({
      type: 'game_over',
      gameId,
      meta: GAME_CATALOG.find((g) => g.id === gameId),
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
      games: GAME_CATALOG,
      players: this.playerList.map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        hat: p.hat,
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
        if (currentRoom) this.leaveRoom(ws);
        const res = room.addHuman(ws, msg.profile || {});
        if (res.error) {
          ws.sendJSON({ type: 'error', message: res.error });
          return;
        }
        this.clientRoom.set(ws.id, room);
        ws.sendJSON({ type: 'welcome', playerId: ws.id, roomCode: code });
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
