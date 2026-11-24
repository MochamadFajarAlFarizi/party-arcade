import { BaseGame, pickRandom } from './base-game.js';
import { DRAW_WORDS, levenshtein } from '../dictionary.js';

const DRAW_TIME = 55;
const CHOOSE_TIME = 10;
const REVEAL_TIME = 4;

// Simple recognizable vector strokes for AI Bot artists (normalized 0..1 coordinates)
const BOT_DOODLES = {
  sun: [
    { color: '#FACC15', size: 10, pts: circlePts(0.5, 0.5, 0.17, 20) },
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((k) => {
      const a = (k / 8) * Math.PI * 2;
      return { color: '#FB923C', size: 8, pts: [[0.5 + Math.cos(a) * 0.22, 0.5 + Math.sin(a) * 0.22], [0.5 + Math.cos(a) * 0.34, 0.5 + Math.sin(a) * 0.34]] };
    }),
  ],
  house: [
    { color: '#EF4444', size: 10, pts: [[0.25, 0.45], [0.5, 0.2], [0.75, 0.45], [0.25, 0.45]] },
    { color: '#3B82F6', size: 10, pts: [[0.3, 0.45], [0.3, 0.8], [0.7, 0.8], [0.7, 0.45]] },
    { color: '#92400E', size: 9, pts: [[0.45, 0.8], [0.45, 0.6], [0.55, 0.6], [0.55, 0.8]] },
  ],
  cat: [
    { color: '#FB923C', size: 10, pts: circlePts(0.5, 0.55, 0.22, 22) },
    { color: '#FB923C', size: 10, pts: [[0.32, 0.42], [0.3, 0.22], [0.44, 0.34]] },
    { color: '#FB923C', size: 10, pts: [[0.68, 0.42], [0.7, 0.22], [0.56, 0.34]] },
    { color: '#1E1B4B', size: 7, pts: [[0.42, 0.52], [0.43, 0.52]] },
    { color: '#1E1B4B', size: 7, pts: [[0.58, 0.52], [0.59, 0.52]] },
    { color: '#1E1B4B', size: 5, pts: [[0.22, 0.58], [0.36, 0.58]] },
    { color: '#1E1B4B', size: 5, pts: [[0.64, 0.58], [0.78, 0.58]] },
  ],
  fish: [
    { color: '#06B6D4', size: 10, pts: [[0.25, 0.5], [0.45, 0.34], [0.68, 0.44], [0.82, 0.3], [0.82, 0.7], [0.68, 0.56], [0.45, 0.66], [0.25, 0.5]] },
    { color: '#1E1B4B', size: 8, pts: [[0.35, 0.47], [0.36, 0.47]] },
  ],
  pizza: [
    { color: '#FACC15', size: 12, pts: [[0.5, 0.18], [0.24, 0.8], [0.76, 0.8], [0.5, 0.18]] },
    { color: '#D97706', size: 14, pts: [[0.22, 0.8], [0.78, 0.8]] },
    { color: '#EF4444', size: 11, pts: [[0.48, 0.45], [0.49, 0.45]] },
    { color: '#EF4444', size: 11, pts: [[0.4, 0.65], [0.41, 0.65]] },
    { color: '#EF4444', size: 11, pts: [[0.58, 0.64], [0.59, 0.64]] },
  ],
  rocket: [
    { color: '#E2E8F0', size: 11, pts: [[0.5, 0.16], [0.62, 0.38], [0.62, 0.72], [0.38, 0.72], [0.38, 0.38], [0.5, 0.16]] },
    { color: '#EF4444', size: 10, pts: [[0.38, 0.6], [0.26, 0.78], [0.38, 0.72]] },
    { color: '#EF4444', size: 10, pts: [[0.62, 0.6], [0.74, 0.78], [0.62, 0.72]] },
    { color: '#F97316', size: 12, pts: [[0.44, 0.75], [0.5, 0.9], [0.56, 0.75]] },
  ],
  tree: [
    { color: '#92400E', size: 14, pts: [[0.5, 0.52], [0.5, 0.84]] },
    { color: '#22C55E', size: 14, pts: circlePts(0.5, 0.36, 0.2, 18) },
    { color: '#16A34A', size: 12, pts: circlePts(0.36, 0.44, 0.13, 14) },
    { color: '#16A34A', size: 12, pts: circlePts(0.64, 0.44, 0.13, 14) },
  ],
  ghost: [
    { color: '#6366F1', size: 10, pts: [[0.32, 0.78], [0.32, 0.36], [0.42, 0.22], [0.58, 0.22], [0.68, 0.36], [0.68, 0.78], [0.58, 0.7], [0.5, 0.78], [0.42, 0.7], [0.32, 0.78]] },
    { color: '#1E1B4B', size: 9, pts: [[0.43, 0.44], [0.44, 0.44]] },
    { color: '#1E1B4B', size: 9, pts: [[0.57, 0.44], [0.58, 0.44]] },
  ],
  car: [
    { color: '#EF4444', size: 12, pts: [[0.2, 0.62], [0.24, 0.44], [0.4, 0.34], [0.64, 0.34], [0.76, 0.46], [0.82, 0.62], [0.2, 0.62]] },
    { color: '#1E1B4B', size: 12, pts: circlePts(0.33, 0.66, 0.08, 12) },
    { color: '#1E1B4B', size: 12, pts: circlePts(0.68, 0.66, 0.08, 12) },
  ],
  heart: [
    { color: '#EC4899', size: 12, pts: [[0.5, 0.78], [0.24, 0.5], [0.26, 0.32], [0.4, 0.26], [0.5, 0.38], [0.6, 0.26], [0.74, 0.32], [0.76, 0.5], [0.5, 0.78]] },
  ],
  star: [
    {
      color: '#FACC15',
      size: 10,
      pts: Array.from({ length: 11 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const r = i % 2 === 0 ? 0.3 : 0.13;
        return [0.5 + Math.cos(a) * r, 0.5 + Math.sin(a) * r];
      }),
    },
  ],
};

function circlePts(cx, cy, r, steps) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

export class QuickDrawGame extends BaseGame {
  constructor(room, players) {
    super(room, 'quick-draw');
    this.players = players.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      hat: p.hat,
      isBot: !!p.isBot,
      score: 0,
      guessed: false,
      correctCount: 0,
    }));
    // Humans draw first; cap total turns so games stay snappy (max 5 turns)
    const humans = this.players.filter((p) => !p.isBot);
    const bots = this.players.filter((p) => p.isBot);
    const order = [...humans, ...bots];
    this.turnOrder = order.slice(0, Math.min(order.length, Math.max(2, Math.min(5, players.length))));
    this.turnIdx = 0;
    this.subPhase = 'choosing'; // choosing | drawing | reveal
    this.timer = CHOOSE_TIME;
    this.wordChoices = [];
    this.currentWordObj = null;
    this.strokes = [];
    this.revealedIndices = new Set();
    this.botStrokeIdx = 0;
    this.botDrawCooldown = 0;
    this.botGuessTimers = new Map();
    this.usedWords = new Set();
    this.countdown = 1.5;
  }

  onStart() {
    this._startTurn();
  }

  get currentArtist() {
    return this.turnOrder[this.turnIdx];
  }

  _startTurn() {
    if (this.turnIdx >= this.turnOrder.length) {
      this._conclude();
      return;
    }
    this.players.forEach((p) => { p.guessed = false; });
    this.strokes = [];
    this.revealedIndices.clear();
    this.subPhase = 'choosing';
    this.timer = CHOOSE_TIME;

    const pool = DRAW_WORDS.filter((w) => !this.usedWords.has(w.word));
    const shuffled = [...(pool.length >= 3 ? pool : DRAW_WORDS)].sort(() => Math.random() - 0.5);
    this.wordChoices = shuffled.slice(0, 3);
    this.currentWordObj = null;
    this.emitEvent('clearCanvas', {});

    const artist = this.currentArtist;
    if (artist.isBot) {
      // Bot prefers words with a recognizable doodle
      const doodleMatch = this.wordChoices.find((w) => BOT_DOODLES[w.doodle]) || this.wordChoices[0];
      this._selectWord(doodleMatch);
    } else {
      this.emitEvent('banner', { text: `✏️ ${artist.name} sedang memilih kata...` });
    }
  }

  _selectWord(wordObj) {
    this.currentWordObj = wordObj;
    this.usedWords.add(wordObj.word);
    this.subPhase = 'drawing';
    this.timer = DRAW_TIME;
    this.botStrokeIdx = 0;
    this.botDrawCooldown = 0.6;
    this.botGuessTimers.clear();
    for (const p of this.players) {
      if (p.isBot && p.id !== this.currentArtist.id) {
        this.botGuessTimers.set(p.id, 11 + Math.random() * 26);
      }
    }
    this.emitEvent('sfx', { sound: 'go' });
    this.emitEvent('banner', { text: `🎨 ${this.currentArtist.name} menggambar! Kategori: ${wordObj.category}` });
  }

  handleAction(playerId, msg) {
    if (this.phase !== 'playing') return;
    const artist = this.currentArtist;
    if (!artist) return;

    if (msg.action === 'chooseWord' && playerId === artist.id && this.subPhase === 'choosing') {
      const found = this.wordChoices.find((w) => w.word === msg.word);
      if (found) this._selectWord(found);
      return;
    }

    if (playerId === artist.id && this.subPhase === 'drawing') {
      if (msg.action === 'stroke' && msg.stroke) {
        if (this.strokes.length < 400) {
          this.strokes.push(msg.stroke);
          this.room.broadcast({ type: 'draw_stroke', stroke: msg.stroke }, playerId);
        }
      } else if (msg.action === 'clear') {
        this.strokes = [];
        this.room.broadcast({ type: 'draw_clear' });
      } else if (msg.action === 'undo') {
        this.strokes.pop();
        this.room.broadcast({ type: 'draw_sync', strokes: this.strokes });
      }
      return;
    }

    if (msg.action === 'guess' && this.subPhase === 'drawing' && playerId !== artist.id) {
      this._handleGuess(playerId, String(msg.text || ''));
    }
  }

  _handleGuess(playerId, rawText) {
    const player = this.players.find((p) => p.id === playerId);
    if (!player || player.guessed || !this.currentWordObj) return;
    const guess = rawText.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!guess) return;

    const target = this.currentWordObj.word.toLowerCase();
    if (guess === target) {
      player.guessed = true;
      player.correctCount += 1;
      const speedBonus = Math.round((this.timer / DRAW_TIME) * 140);
      const pts = 70 + speedBonus;
      player.score += pts;
      this.currentArtist.score += 45;
      this.emitEvent('sfx', { sound: 'correct' });
      this.room.broadcast({
        type: 'chat',
        system: true,
        tone: 'success',
        text: `🎉 ${player.name} berhasil menebak! (+${pts} poin)`,
      });

      const nonArtists = this.players.filter((p) => p.id !== this.currentArtist.id);
      if (nonArtists.every((p) => p.guessed)) {
        this._endTurn();
      }
    } else if (levenshtein(guess, target) <= (target.length > 5 ? 2 : 1)) {
      this.room.sendToPlayer(playerId, {
        type: 'chat',
        system: true,
        tone: 'warn',
        text: `🔥 "${rawText.trim()}" hampir benar banget!`,
      });
    } else {
      this.room.broadcast({
        type: 'chat',
        from: player.name,
        color: player.color,
        text: rawText.trim().slice(0, 80),
      });
    }
  }

  _endTurn() {
    if (this.subPhase === 'reveal') return;
    this.subPhase = 'reveal';
    this.timer = REVEAL_TIME;
    this.room.broadcast({
      type: 'chat',
      system: true,
      tone: 'info',
      text: `💡 Jawabannya adalah: "${this.currentWordObj?.word?.toUpperCase() || '-'}"`,
    });
  }

  update(dt) {
    this.timer -= dt;

    if (this.subPhase === 'choosing') {
      if (this.timer <= 0) {
        this._selectWord(pickRandom(this.wordChoices));
      }
      return;
    }

    if (this.subPhase === 'drawing') {
      // Reveal progressive hint letters at 35s and 18s remaining
      const word = this.currentWordObj.word;
      const letterIndices = [...word].map((ch, i) => (ch !== ' ' ? i : -1)).filter((i) => i >= 0);
      const targetReveals = this.timer < 18 ? Math.min(2, Math.floor(letterIndices.length / 2)) : this.timer < 35 ? 1 : 0;
      while (this.revealedIndices.size < targetReveals && this.revealedIndices.size < letterIndices.length - 1) {
        this.revealedIndices.add(pickRandom(letterIndices));
      }

      // Bot artist drawing strokes gradually
      if (this.currentArtist?.isBot) {
        const doodle = BOT_DOODLES[this.currentWordObj.doodle] || BOT_DOODLES.star;
        this.botDrawCooldown -= dt;
        if (this.botDrawCooldown <= 0 && this.botStrokeIdx < doodle.length) {
          const st = doodle[this.botStrokeIdx++];
          const strokeObj = { color: st.color, size: st.size, points: st.pts, norm: true };
          this.strokes.push(strokeObj);
          this.room.broadcast({ type: 'draw_stroke', stroke: strokeObj });
          this.botDrawCooldown = 1.1;
        }
      }

      // Bot guessers
      for (const [botId, t] of this.botGuessTimers.entries()) {
        const nextT = t - dt;
        this.botGuessTimers.set(botId, nextT);
        if (nextT <= 0) {
          this.botGuessTimers.delete(botId);
          const bot = this.players.find((p) => p.id === botId);
          if (bot && !bot.guessed) {
            if (Math.random() < 0.72) {
              this._handleGuess(botId, this.currentWordObj.word);
            } else {
              this._handleGuess(botId, pickRandom(DRAW_WORDS).word);
            }
          }
        }
      }

      if (this.timer <= 0) {
        this._endTurn();
      }
      return;
    }

    if (this.subPhase === 'reveal' && this.timer <= 0) {
      this.turnIdx += 1;
      this._startTurn();
    }
  }

  _maskedWord() {
    if (!this.currentWordObj) return '';
    return [...this.currentWordObj.word]
      .map((ch, idx) => (ch === ' ' ? '  ' : this.revealedIndices.has(idx) ? ch.toUpperCase() : '_'))
      .join(' ');
  }

  _conclude() {
    const standings = this.players.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      hat: p.hat,
      isBot: p.isBot,
      score: p.score,
      detail: `${p.correctCount} tebakan benar`,
    }));
    this.finishGame(standings);
  }

  getStateFor(playerId) {
    const artist = this.currentArtist;
    const isArtist = artist && playerId === artist.id;
    const me = this.players.find((p) => p.id === playerId);
    const revealAll = this.subPhase === 'reveal' || isArtist || me?.guessed;

    return {
      gameId: this.gameId,
      phase: this.phase,
      countdown: Number(this.countdown.toFixed(1)),
      subPhase: this.subPhase,
      timer: Number(Math.max(0, this.timer).toFixed(1)),
      turn: this.turnIdx + 1,
      totalTurns: this.turnOrder.length,
      artistId: artist?.id || null,
      artistName: artist?.name || '',
      category: this.currentWordObj?.category || '',
      hintText: this.timer < 22 && this.currentWordObj ? this.currentWordObj.hint : '',
      maskedWord: revealAll ? (this.currentWordObj?.word?.toUpperCase() || '') : this._maskedWord(),
      wordChoices: isArtist && this.subPhase === 'choosing' ? this.wordChoices : null,
      strokeCount: this.strokes.length,
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        hat: p.hat,
        score: p.score,
        guessed: p.guessed,
      })),
    };
  }
}
