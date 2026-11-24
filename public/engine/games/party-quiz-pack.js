import { BaseGame, pickRandom, randRange } from './base-game.js';

const TRIVIA_BANK = [
  { q: 'Planet terbesar di tata surya kita adalah?', opts: ['Saturnus', 'Jupiter', 'Neptunus', 'Mars'], ans: 1 },
  { q: 'Ibukota negara Jepang adalah?', opts: ['Kyoto', 'Osaka', 'Tokyo', 'Seoul'], ans: 2 },
  { q: 'Berapa jumlah warna utama dalam pelangi?', opts: ['5', '6', '7', '8'], ans: 2 },
  { q: 'Hewan tercepat di darat adalah?', opts: ['Singa', 'Cheetah', 'Kuda', 'Serigala'], ans: 1 },
  { q: 'Simbol kimia untuk air adalah?', opts: ['CO2', 'O2', 'H2O', 'NaCl'], ans: 2 },
  { q: 'Siapa tokoh utama di game Super Mario?', opts: ['Luigi', 'Sonic', 'Mario', 'Link'], ans: 2 },
  { q: 'Gunung tertinggi di dunia adalah?', opts: ['Kilimanjaro', 'Fuji', 'Everest', 'Rinjani'], ans: 2 },
  { q: 'Makanan khas Padang yang pernah jadi terenak di dunia?', opts: ['Gudeg', 'Rendang', 'Pempek', 'Rawon'], ans: 1 },
  { q: 'Berapa jumlah sisi pada sebuah kubus?', opts: ['4', '6', '8', '12'], ans: 1 },
  { q: 'Bahasa pemrograman apa yang berjalan langsung di browser web?', opts: ['JavaScript', 'C++', 'Swift', 'Kotlin'], ans: 0 },
  { q: 'Benua terkecil di dunia adalah?', opts: ['Eropa', 'Australia', 'Antartika', 'Amerika Selatan'], ans: 1 },
  { q: 'Hewan apa yang bisa tidur sambil berdiri?', opts: ['Kucing', 'Kuda', 'Anjing', 'Kelinci'], ans: 1 },
  { q: 'Berapa menit dalam 2,5 jam?', opts: ['120 menit', '135 menit', '150 menit', '160 menit'], ans: 2 },
  { q: 'Pulau terbesar di Indonesia adalah?', opts: ['Jawa', 'Sumatra', 'Kalimantan', 'Sulawesi'], ans: 2 },
  { q: 'Logo aplikasi Discord berbentuk seperti apa?', opts: ['Burung', 'Gamepad / Robot', 'Hantu', 'Roket'], ans: 1 },
  { q: 'Berapa jumlah pemain satu tim sepak bola di lapangan?', opts: ['9', '10', '11', '12'], ans: 2 },
  { q: 'Buah apa yang bijinya ada di luar kulitnya?', opts: ['Apel', 'Stroberi', 'Jeruk', 'Mangga'], ans: 1 },
  { q: 'Alat untuk mengukur gempa bumi disebut?', opts: ['Termometer', 'Barometer', 'Seismograf', 'Speedometer'], ans: 2 },
  { q: 'Negara mana yang dijuluki Negeri Gajah Putih?', opts: ['Vietnam', 'Thailand', 'India', 'Malaysia'], ans: 1 },
  { q: 'Dalam game Minecraft, blok paling keras yang tidak bisa dihancurkan di survival adalah?', opts: ['Obsidian', 'Diamond', 'Bedrock', 'Iron'], ans: 2 },
  { q: 'Berapa hasil dari 2 pangkat 5?', opts: ['16', '25', '32', '64'], ans: 2 },
  { q: 'Organ tubuh manusia yang memompa darah adalah?', opts: ['Paru-paru', 'Hati', 'Jantung', 'Ginjal'], ans: 2 },
];

// =========================================================================
// 18. TRIVIA RUSH — Fast-paced 8-question Discord Quiz Battle!
// =========================================================================
export class TriviaRushGame extends BaseGame {
  constructor(room, players) {
    super(room, 'trivia-rush');
    this.players = players.map((p) => ({
      id: p.id, name: p.name, color: p.color, hat: p.hat, isBot: !!p.isBot,
      score: 0, streak: 0, correct: 0, answer: null, answeredAt: 0,
    }));
    this.questions = [...TRIVIA_BANK].sort(() => Math.random() - 0.5).slice(0, 7);
    this.qIdx = 0;
    this.subPhase = 'question'; // question | reveal
    this.timer = 10;
    this.botTimers = new Map();
    this.countdown = 1.5;
  }

  onStart() {
    this._startQ();
  }

  _startQ() {
    if (this.qIdx >= this.questions.length) {
      return this.finishGame(this.players.map((p) => ({
        id: p.id, name: p.name, color: p.color, hat: p.hat, isBot: p.isBot,
        score: p.score, detail: `🧠 ${p.correct}/${this.questions.length} benar`,
      })));
    }
    this.subPhase = 'question';
    this.timer = 10;
    this.botTimers.clear();
    this.players.forEach((p) => {
      p.answer = null;
      if (p.isBot) this.botTimers.set(p.id, randRange(1.4, 5.8));
    });
  }

  handleAction(playerId, msg) {
    if (this.phase !== 'playing' || this.subPhase !== 'question') return;
    if (msg.action !== 'choice') return;
    const p = this.players.find((x) => x.id === playerId);
    if (!p || p.answer !== null) return;
    const idx = Number(msg.index);
    if (idx < 0 || idx > 3) return;
    p.answer = idx;
    p.answeredAt = this.timer;

    const q = this.questions[this.qIdx];
    if (idx === q.ans) {
      p.correct += 1;
      p.streak += 1;
      p.score += Math.round(70 + (this.timer / 10) * 80 + Math.min(p.streak - 1, 3) * 20);
      this.emitEvent('sfx', { sound: 'correct' });
    } else {
      p.streak = 0;
      this.emitEvent('sfx', { sound: 'wrong' });
    }
    if (this.players.every((x) => x.answer !== null)) {
      this.subPhase = 'reveal';
      this.timer = 2.4;
    }
  }

  update(dt) {
    this.timer -= dt;
    if (this.subPhase === 'question') {
      for (const [botId, t] of this.botTimers.entries()) {
        const nt = t - dt;
        this.botTimers.set(botId, nt);
        if (nt <= 0) {
          this.botTimers.delete(botId);
          const q = this.questions[this.qIdx];
          const pick = Math.random() < 0.65 ? q.ans : Math.floor(Math.random() * 4);
          this.handleAction(botId, { action: 'choice', index: pick });
        }
      }
      if (this.timer <= 0) {
        this.subPhase = 'reveal';
        this.timer = 2.6;
      }
    } else if (this.timer <= 0) {
      this.qIdx += 1;
      this._startQ();
    }
  }

  getState() {
    const q = this.questions[this.qIdx] || this.questions[0];
    return {
      gameId: this.gameId, uiType: 'quiz', phase: this.phase, countdown: Number(this.countdown.toFixed(1)),
      subPhase: this.subPhase, timer: Number(Math.max(0, this.timer).toFixed(1)),
      round: this.qIdx + 1, totalRounds: this.questions.length,
      prompt: q.q, options: q.opts,
      correctIdx: this.subPhase === 'reveal' ? q.ans : null,
      players: this.players.map((p) => ({
        id: p.id, name: p.name, color: p.color, hat: p.hat,
        score: p.score, answered: p.answer !== null,
        lastCorrect: this.subPhase === 'reveal' ? p.answer === q.ans : null,
      })),
    };
  }
}

// =========================================================================
// 19. REFLEX DUEL — Reaction time showdown with FAKE-OUT bait rounds!
// =========================================================================
export class ReflexDuelGame extends BaseGame {
  constructor(room, players) {
    super(room, 'reflex-duel');
    this.players = players.map((p) => ({
      id: p.id, name: p.name, color: p.color, hat: p.hat, isBot: !!p.isBot,
      score: 0, bestMs: 9999, tapped: false, lastMs: null, jumped: false,
    }));
    this.round = 1;
    this.totalRounds = 6;
    this.subPhase = 'wait'; // wait | bait | go | result
    this.timer = 2.5;
    this.goStartAt = 0;
    this.hasBait = false;
    this.botTimers = new Map();
    this.countdown = 1.5;
  }

  onStart() {
    this._startRound();
  }

  _startRound() {
    if (this.round > this.totalRounds) {
      return this.finishGame(this.players.map((p) => ({
        id: p.id, name: p.name, color: p.color, hat: p.hat, isBot: p.isBot,
        score: Math.max(0, p.score),
        detail: p.bestMs < 9999 ? `⚡ Rekor ${p.bestMs} ms` : 'Belum sempat tap!',
      })));
    }
    this.subPhase = 'wait';
    this.hasBait = this.round >= 2 && Math.random() < 0.45;
    this.timer = randRange(1.6, 3.6);
    this.botTimers.clear();
    this.players.forEach((p) => { p.tapped = false; p.lastMs = null; p.jumped = false; });
  }

  handleAction(playerId, msg) {
    if (this.phase !== 'playing' || msg.action !== 'tap') return;
    const p = this.players.find((x) => x.id === playerId);
    if (!p || p.tapped) return;

    if (this.subPhase === 'wait' || this.subPhase === 'bait') {
      p.tapped = true;
      p.jumped = true;
      p.score = Math.max(0, p.score - 35);
      this.emitEvent('sfx', { sound: 'wrong' });
      return;
    }

    if (this.subPhase === 'go') {
      p.tapped = true;
      const ms = Math.max(40, Math.round(Date.now() - this.goStartAt));
      p.lastMs = ms;
      if (ms < p.bestMs) p.bestMs = ms;
      const rankBonus = Math.max(30, 140 - this.players.filter((x) => x.tapped && !x.jumped).length * 22);
      const speedPts = Math.max(15, Math.round((1200 - Math.min(ms, 1100)) / 10));
      p.score += rankBonus + speedPts;
      this.emitEvent('sfx', { sound: 'correct' });

      if (this.players.every((x) => x.tapped)) {
        this.subPhase = 'result';
        this.timer = 2.1;
      }
    }
  }

  update(dt) {
    this.timer -= dt;
    if (this.subPhase === 'wait' && this.timer <= 0) {
      if (this.hasBait) {
        this.hasBait = false;
        this.subPhase = 'bait';
        this.timer = 1.05;
        this.emitEvent('sfx', { sound: 'tick' });
        // Some bots fall for bait!
        for (const p of this.players) {
          if (p.isBot && !p.tapped && Math.random() < 0.25) {
            this.handleAction(p.id, { action: 'tap' });
          }
        }
      } else {
        this._triggerGo();
      }
    } else if (this.subPhase === 'bait' && this.timer <= 0) {
      this.subPhase = 'wait';
      this.timer = randRange(0.9, 2.2);
    } else if (this.subPhase === 'go') {
      for (const [botId, t] of this.botTimers.entries()) {
        const nt = t - dt;
        this.botTimers.set(botId, nt);
        if (nt <= 0) {
          this.botTimers.delete(botId);
          this.handleAction(botId, { action: 'tap' });
        }
      }
      if (this.timer <= 0) {
        this.subPhase = 'result';
        this.timer = 2.0;
      }
    } else if (this.subPhase === 'result' && this.timer <= 0) {
      this.round += 1;
      this._startRound();
    }
  }

  _triggerGo() {
    this.subPhase = 'go';
    this.timer = 2.6;
    this.goStartAt = Date.now();
    this.emitEvent('sfx', { sound: 'go' });
    this.botTimers.clear();
    for (const p of this.players) {
      if (p.isBot && !p.tapped) {
        this.botTimers.set(p.id, randRange(0.24, 0.72));
      }
    }
  }

  getState() {
    return {
      gameId: this.gameId, uiType: 'reflex', phase: this.phase, countdown: Number(this.countdown.toFixed(1)),
      subPhase: this.subPhase, round: this.round, totalRounds: this.totalRounds,
      players: this.players.map((p) => ({
        id: p.id, name: p.name, color: p.color, hat: p.hat,
        score: p.score, tapped: p.tapped, lastMs: p.lastMs, jumped: p.jumped,
      })),
    };
  }
}

// =========================================================================
// 20. MATH PANIC — Rapid-fire mental math speed race!
// =========================================================================
function genMathProblem(level) {
  let a, b, op, ans;
  if (level <= 3) {
    a = Math.floor(randRange(4, 24)); b = Math.floor(randRange(3, 19));
    op = Math.random() < 0.5 ? '+' : '-';
    if (op === '-' && b > a) [a, b] = [b, a];
    ans = op === '+' ? a + b : a - b;
  } else if (level <= 6) {
    a = Math.floor(randRange(3, 13)); b = Math.floor(randRange(3, 12));
    op = '×'; ans = a * b;
  } else {
    a = Math.floor(randRange(4, 12)); b = Math.floor(randRange(3, 9));
    const c = Math.floor(randRange(2, 15));
    ans = a * b + c;
    const prompt = `${a} × ${b} + ${c} = ?`;
    return buildOpts(prompt, ans);
  }
  return buildOpts(`${a} ${op} ${b} = ?`, ans);
}

function buildOpts(prompt, ans) {
  const set = new Set([ans]);
  while (set.size < 4) {
    const delta = pickRandom([-10, -4, -3, -2, -1, 1, 2, 3, 4, 10]);
    if (ans + delta >= 0) set.add(ans + delta);
  }
  const opts = [...set].sort(() => Math.random() - 0.5);
  return { q: prompt, opts: opts.map(String), ans: opts.indexOf(ans) };
}

export class MathPanicGame extends BaseGame {
  constructor(room, players) {
    super(room, 'math-panic');
    this.players = players.map((p) => ({
      id: p.id, name: p.name, color: p.color, hat: p.hat, isBot: !!p.isBot,
      score: 0, streak: 0, correct: 0, answer: null,
    }));
    this.round = 1;
    this.totalRounds = 8;
    this.problem = genMathProblem(1);
    this.subPhase = 'question';
    this.timer = 7.5;
    this.botTimers = new Map();
    this.countdown = 1.5;
  }

  onStart() {
    this._startRound();
  }

  _startRound() {
    if (this.round > this.totalRounds) {
      return this.finishGame(this.players.map((p) => ({
        id: p.id, name: p.name, color: p.color, hat: p.hat, isBot: p.isBot,
        score: p.score, detail: `🧮 ${p.correct}/${this.totalRounds} hitungan benar`,
      })));
    }
    this.problem = genMathProblem(this.round);
    this.subPhase = 'question';
    this.timer = Math.max(5.5, 8.2 - this.round * 0.25);
    this.botTimers.clear();
    this.players.forEach((p) => {
      p.answer = null;
      if (p.isBot) this.botTimers.set(p.id, randRange(1.2, 4.4));
    });
  }

  handleAction(playerId, msg) {
    if (this.phase !== 'playing' || this.subPhase !== 'question' || msg.action !== 'choice') return;
    const p = this.players.find((x) => x.id === playerId);
    if (!p || p.answer !== null) return;
    const idx = Number(msg.index);
    if (idx < 0 || idx > 3) return;
    p.answer = idx;
    if (idx === this.problem.ans) {
      p.correct += 1;
      p.streak += 1;
      p.score += Math.round(60 + (this.timer / 8) * 75 + Math.min(p.streak - 1, 4) * 15);
      this.emitEvent('sfx', { sound: 'correct' });
    } else {
      p.streak = 0;
      this.emitEvent('sfx', { sound: 'wrong' });
    }
    if (this.players.every((x) => x.answer !== null)) {
      this.subPhase = 'reveal';
      this.timer = 1.7;
    }
  }

  update(dt) {
    this.timer -= dt;
    if (this.subPhase === 'question') {
      for (const [botId, t] of this.botTimers.entries()) {
        const nt = t - dt;
        this.botTimers.set(botId, nt);
        if (nt <= 0) {
          this.botTimers.delete(botId);
          const pick = Math.random() < 0.7 ? this.problem.ans : Math.floor(Math.random() * 4);
          this.handleAction(botId, { action: 'choice', index: pick });
        }
      }
      if (this.timer <= 0) {
        this.subPhase = 'reveal';
        this.timer = 1.8;
      }
    } else if (this.timer <= 0) {
      this.round += 1;
      this._startRound();
    }
  }

  getState() {
    return {
      gameId: this.gameId, uiType: 'quiz', phase: this.phase, countdown: Number(this.countdown.toFixed(1)),
      subPhase: this.subPhase, timer: Number(Math.max(0, this.timer).toFixed(1)),
      round: this.round, totalRounds: this.totalRounds,
      prompt: this.problem.q, options: this.problem.opts,
      correctIdx: this.subPhase === 'reveal' ? this.problem.ans : null,
      players: this.players.map((p) => ({
        id: p.id, name: p.name, color: p.color, hat: p.hat,
        score: p.score, answered: p.answer !== null,
        lastCorrect: this.subPhase === 'reveal' ? p.answer === this.problem.ans : null,
      })),
    };
  }
}
