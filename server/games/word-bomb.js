import { BaseGame, pickRandom } from './base-game.js';
import { isValidWord, findWordsStartingWith, extractNextSyllable } from '../dictionary.js';

const STARTER_PREFIXES = [
  'DA', 'KA', 'BA', 'MA', 'SA', 'PA', 'TA', 'LA', 'RA', 'GA',
  'ME', 'BE', 'SE', 'PE', 'TE', 'KE', 'BU', 'KU', 'SU', 'PU',
  'CA', 'JA', 'NA', 'WA', 'HA', 'MO', 'KO', 'BO', 'PO', 'TO',
];

export class WordBombGame extends BaseGame {
  constructor(room, players) {
    super(room, 'word-bomb');
    this.players = players.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      hat: p.hat,
      isBot: !!p.isBot,
      hearts: 3,
      alive: true,
      wordsSolved: 0,
      streak: 0,
      typing: '',
      score: 0,
    }));
    this.turnIdx = Math.floor(Math.random() * this.players.length);
    this.syllable = pickRandom(STARTER_PREFIXES);
    this.lastWord = '';
    this.bombTimer = 11;
    this.maxBombTimer = 11;
    this.usedWords = new Set();
    this.turnsCompleted = 0;
    this.eliminationOrder = [];
    this.lastResult = null;
    this.botThinkTimer = 0;
    this.botPlannedWord = '';
    this.countdown = 2.0;
  }

  onStart() {
    this._nextPrompt(false, true);
  }

  get activePlayer() {
    return this.players[this.turnIdx];
  }

  _nextPrompt(advance = true, freshPrefix = false) {
    const alive = this.players.filter((p) => p.alive);
    if (alive.length <= 1) {
      this._conclude();
      return;
    }

    if (advance) {
      for (let i = 1; i <= this.players.length; i++) {
        const idx = (this.turnIdx + i) % this.players.length;
        if (this.players[idx].alive) {
          this.turnIdx = idx;
          break;
        }
      }
    }

    this.players.forEach((p) => { p.typing = ''; });
    if (freshPrefix || !this.syllable) {
      this.syllable = pickRandom(STARTER_PREFIXES);
      this.lastWord = '';
    }
    this.maxBombTimer = Math.max(6.0, 11.5 - this.turnsCompleted * 0.22);
    this.bombTimer = this.maxBombTimer;

    const cur = this.activePlayer;
    if (cur.isBot) {
      const candidates = findWordsStartingWith(this.syllable, this.usedWords, 12);
      this.botPlannedWord = candidates.length > 0 ? pickRandom(candidates) : '';
      this.botThinkTimer = 1.3 + Math.random() * 2.4;
    }
  }

  handleAction(playerId, msg) {
    if (this.phase !== 'playing') return;
    const cur = this.activePlayer;
    if (!cur || cur.id !== playerId || !cur.alive) return;

    if (msg.action === 'typing') {
      cur.typing = String(msg.text || '').replace(/[^a-zA-Z]/g, '').slice(0, 22).toUpperCase();
      return;
    }

    if (msg.action === 'submit') {
      this._submitWord(cur, String(msg.word || ''));
    }
  }

  _submitWord(player, raw) {
    const word = raw.trim().toLowerCase().replace(/[^a-z]/g, '');
    const syl = this.syllable.toLowerCase();

    if (word.length < Math.max(3, syl.length + 1)) {
      this.lastResult = { playerId: player.id, word, ok: false, reason: 'Kata terlalu pendek!' };
      this.emitEvent('sfx', { sound: 'wrong' });
      return;
    }
    if (!word.startsWith(syl)) {
      this.lastResult = { playerId: player.id, word, ok: false, reason: `Harus BERAWALAN "${this.syllable}"!` };
      this.emitEvent('sfx', { sound: 'wrong' });
      return;
    }
    if (this.usedWords.has(word)) {
      this.lastResult = { playerId: player.id, word, ok: false, reason: 'Kata sudah dipakai!' };
      this.emitEvent('sfx', { sound: 'wrong' });
      return;
    }
    if (!isValidWord(word)) {
      this.lastResult = { playerId: player.id, word, ok: false, reason: 'Kata tidak ada di kamus ID/EN!' };
      this.emitEvent('sfx', { sound: 'wrong' });
      return;
    }

    // Accepted! Chain ending syllable -> next player's starting prefix!
    this.usedWords.add(word);
    player.wordsSolved += 1;
    player.streak += 1;
    const bonus = Math.round(35 + word.length * 4 + (this.bombTimer / this.maxBombTimer) * 20);
    player.score += bonus;
    if (player.streak > 0 && player.streak % 5 === 0 && player.hearts < 3) {
      player.hearts += 1;
      this.emitEvent('banner', { text: `❤️ ${player.name} streak 5x! +1 Nyawa!` });
    }
    this.turnsCompleted += 1;
    this.lastWord = word.toUpperCase();
    const nextSyl = extractNextSyllable(word, this.usedWords);
    this.syllable = nextSyl;
    this.lastResult = {
      playerId: player.id,
      word: word.toUpperCase(),
      nextSyllable: nextSyl,
      ok: true,
      bonus,
    };
    this.emitEvent('sfx', { sound: 'correct' });
    this._nextPrompt(true, false);
  }

  update(dt) {
    const alive = this.players.filter((p) => p.alive);
    if (alive.length <= 1) {
      this._conclude();
      return;
    }

    const cur = this.activePlayer;
    if (!cur || !cur.alive) {
      this._nextPrompt(true, false);
      return;
    }

    this.bombTimer -= dt;

    if (cur.isBot && this.botPlannedWord) {
      this.botThinkTimer -= dt;
      if (this.botThinkTimer <= 0) {
        const nextLen = cur.typing.length + 1;
        cur.typing = this.botPlannedWord.slice(0, nextLen).toUpperCase();
        if (nextLen >= this.botPlannedWord.length) {
          this._submitWord(cur, this.botPlannedWord);
        } else {
          this.botThinkTimer = 0.14 + Math.random() * 0.13;
        }
      }
    }

    if (this.bombTimer <= 0) {
      cur.hearts -= 1;
      cur.streak = 0;
      this.emitEvent('explode', { playerId: cur.id, name: cur.name, color: cur.color });
      this.lastResult = { playerId: cur.id, word: '💥 DUAR!', ok: false, reason: 'Waktu habis!' };
      if (cur.hearts <= 0) {
        cur.alive = false;
        this.eliminationOrder.push(cur.id);
      }
      if (this.players.filter((p) => p.alive).length <= 1) {
        this._conclude();
      } else {
        this._nextPrompt(true, true); // fresh starter prefix after explosion
      }
    }
  }

  _conclude() {
    const total = this.players.length;
    const standings = this.players.map((p) => {
      const idx = this.eliminationOrder.indexOf(p.id);
      const surviveRank = p.alive ? total : idx + 1;
      const finalScore = p.score + surviveRank * 50 + (p.alive ? 90 : 0);
      return {
        id: p.id,
        name: p.name,
        color: p.color,
        hat: p.hat,
        isBot: p.isBot,
        score: finalScore,
        detail: `${p.wordsSolved} sambung kata${p.alive ? ' • Raja Kamus!' : ''}`,
      };
    });
    this.finishGame(standings);
  }

  getState() {
    return {
      gameId: this.gameId,
      phase: this.phase,
      countdown: Number(this.countdown.toFixed(1)),
      activePlayerId: this.activePlayer?.id || null,
      syllable: this.syllable,
      lastWord: this.lastWord,
      bombTimer: Number(Math.max(0, this.bombTimer).toFixed(2)),
      maxBombTimer: Number(this.maxBombTimer.toFixed(2)),
      usedCount: this.usedWords.size,
      lastResult: this.lastResult,
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        hat: p.hat,
        hearts: p.hearts,
        alive: p.alive,
        score: p.score,
        typing: p.typing,
        wordsSolved: p.wordsSolved,
        streak: p.streak,
      })),
    };
  }
}
