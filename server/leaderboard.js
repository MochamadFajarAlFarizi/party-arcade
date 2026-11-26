import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const FILE_PATH = path.join(DATA_DIR, 'leaderboard.json');

const GAME_IDS = [
  'split-or-steal', 'blame-vote', 'greed-heist', 'betrayal-bridge',
  'snakes-ladders', 'mini-monopoly', 'crazy-cards', 'ludo-blitz',
  'dash-blade', 'ricochet-duel', 'memory-rush', 'closest-wins',
  'bomb-pass', 'sumo-knockout', 'turf-paint', 'quick-draw', 'word-bomb', 'chaos-survival',
  'crown-chase', 'coin-rush', 'zombie-tag', 'bumper-soccer', 'meteor-shower', 'snake-party',
  'ghost-freeze', 'king-hill', 'shark-escape', 'dodgeball', 'turbo-race',
  'trivia-rush', 'reflex-duel', 'math-panic',
];

function createEmptyStore() {
  return {
    updatedAt: new Date().toISOString(),
    players: {}, // key: normalized name -> stats
    recentMatches: [],
    matchScores: [],
  };
}

export class LeaderboardStore {
  constructor(filePath = FILE_PATH) {
    this.filePath = filePath;
    this.data = createEmptyStore();
    this._saveTimer = null;
    this._load();
  }

  _load() {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.players) {
          this.data = {
            updatedAt: parsed.updatedAt || new Date().toISOString(),
            players: parsed.players || {},
            recentMatches: Array.isArray(parsed.recentMatches) ? parsed.recentMatches : [],
            matchScores: Array.isArray(parsed.matchScores) ? parsed.matchScores : [],
          };
        }
      }
    } catch {
      this.data = createEmptyStore();
    }
  }

  _scheduleSave() {
    if (this._saveTimer) return;
    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;
      this.flush();
    }, 300);
    this._saveTimer.unref?.();
  }

  flush() {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      this.data.updatedAt = new Date().toISOString();
      const tmp = `${this.filePath}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf8');
      fs.renameSync(tmp, this.filePath);
    } catch {
      // ignore disk write errors gracefully
    }
  }

  /**
   * Record results of a completed mini-game or Party Cup match.
   * Only human players (non-bots) are recorded on the global leaderboard.
   */
  recordGameResult({ gameId, roomCode, standings }) {
    const humanStandings = standings.filter((s) => !s.isBot && s.name && s.name.trim());
    if (humanStandings.length === 0) return;

    const topScore = Math.max(...standings.map((s) => s.score || 0), 0);

    for (const entry of humanStandings) {
      const key = entry.name.trim().toLowerCase();
      let rec = this.data.players[key];
      if (!rec) {
        rec = {
          name: entry.name.trim(),
          color: entry.color || '#FF5E7E',
          hat: entry.hat || 'none',
          totalScore: 0,
          wins: 0,
          gamesPlayed: 0,
          currentStreak: 0,
          bestStreak: 0,
          perGame: {},
          lastPlayedAt: new Date().toISOString(),
        };
        this.data.players[key] = rec;
      }

      rec.name = entry.name.trim();
      if (entry.color) rec.color = entry.color;
      if (entry.hat) rec.hat = entry.hat;

      const pts = Math.max(0, Math.round(entry.score || 0));
      const won = entry.rank === 1 && pts > 0 && pts >= topScore;

      rec.totalScore += pts;
      rec.gamesPlayed += 1;
      if (won) {
        rec.wins += 1;
        rec.currentStreak += 1;
        rec.bestStreak = Math.max(rec.bestStreak, rec.currentStreak);
      } else {
        rec.currentStreak = 0;
      }
      rec.lastPlayedAt = new Date().toISOString();

      if (gameId && GAME_IDS.includes(gameId)) {
        if (!rec.perGame[gameId]) {
          rec.perGame[gameId] = { score: 0, wins: 0, played: 0, best: 0 };
        }
        const g = rec.perGame[gameId];
        g.score += pts;
        g.played += 1;
        g.best = Math.max(g.best, pts);
        if (won) g.wins += 1;
      }

      this.data.matchScores.push({
        playerKey: key,
        name: rec.name,
        color: rec.color,
        hat: rec.hat,
        gameId: gameId || 'party-cup',
        score: pts,
        won,
        at: new Date().toISOString(),
      });
    }
    if (this.data.matchScores.length > 2000) {
      this.data.matchScores = this.data.matchScores.slice(-2000);
    }

    const winner = standings[0];
    this.data.recentMatches.unshift({
      gameId: gameId || 'party-cup',
      roomCode,
      winnerName: winner?.name || 'Unknown',
      winnerColor: winner?.color || '#FFD166',
      playerCount: standings.length,
      at: new Date().toISOString(),
    });
    if (this.data.recentMatches.length > 25) {
      this.data.recentMatches.length = 25;
    }

    this._scheduleSave();
  }

  getLeaderboard(limit = 50, period = 'all') {
    if (period === 'today' || period === 'week') {
      const now = Date.now();
      let cutoffMs = now - 7 * 24 * 60 * 60 * 1000;
      if (period === 'today') {
        const wib = new Date(now + 7 * 3600 * 1000);
        wib.setUTCHours(0, 0, 0, 0);
        cutoffMs = wib.getTime() - 7 * 3600 * 1000;
      }
      const rows = (this.data.matchScores || []).filter((r) => Date.parse(r.at) >= cutoffMs);
      const map = new Map();
      for (const r of rows) {
        let p = map.get(r.playerKey);
        if (!p) {
          p = { name: r.name, color: r.color, hat: r.hat, totalScore: 0, wins: 0, gamesPlayed: 0, bestStreak: 0, _cur: 0, perGame: {} };
          map.set(r.playerKey, p);
        }
        p.totalScore += r.score;
        p.gamesPlayed += 1;
        if (r.won) { p.wins += 1; p._cur += 1; p.bestStreak = Math.max(p.bestStreak, p._cur); } else { p._cur = 0; }
        if (GAME_IDS.includes(r.gameId)) {
          const g = p.perGame[r.gameId] || { score: 0, wins: 0, played: 0, best: 0 };
          g.score += r.score; g.played += 1; g.best = Math.max(g.best, r.score);
          if (r.won) g.wins += 1;
          p.perGame[r.gameId] = g;
        }
      }
      const all = [...map.values()];
      const global = [...all]
        .sort((a, b) => b.totalScore - a.totalScore || b.wins - a.wins)
        .slice(0, limit)
        .map((p, idx) => ({
          rank: idx + 1, name: p.name, color: p.color, hat: p.hat,
          totalScore: p.totalScore, wins: p.wins, gamesPlayed: p.gamesPlayed,
          winRate: p.gamesPlayed > 0 ? Math.round((p.wins / p.gamesPlayed) * 100) : 0, bestStreak: p.bestStreak,
        }));
      const perGame = {};
      for (const gid of GAME_IDS) {
        perGame[gid] = all
          .filter((p) => p.perGame[gid])
          .sort((a, b) => b.perGame[gid].score - a.perGame[gid].score)
          .slice(0, 10)
          .map((p, idx) => ({
            rank: idx + 1, name: p.name, color: p.color, hat: p.hat,
            score: p.perGame[gid].score, wins: p.perGame[gid].wins, best: p.perGame[gid].best, played: p.perGame[gid].played,
          }));
      }
      return { updatedAt: this.data.updatedAt, period, global, perGame, recentMatches: [] };
    }

    const all = Object.values(this.data.players);

    const global = [...all]
      .sort((a, b) => b.totalScore - a.totalScore || b.wins - a.wins)
      .slice(0, limit)
      .map((p, idx) => ({
        rank: idx + 1,
        name: p.name,
        color: p.color,
        hat: p.hat,
        totalScore: p.totalScore,
        wins: p.wins,
        gamesPlayed: p.gamesPlayed,
        winRate: p.gamesPlayed > 0 ? Math.round((p.wins / p.gamesPlayed) * 100) : 0,
        bestStreak: p.bestStreak,
      }));

    const perGame = {};
    for (const gid of GAME_IDS) {
      perGame[gid] = all
        .filter((p) => p.perGame && p.perGame[gid])
        .sort((a, b) => b.perGame[gid].score - a.perGame[gid].score || b.perGame[gid].wins - a.perGame[gid].wins)
        .slice(0, 10)
        .map((p, idx) => ({
          rank: idx + 1,
          name: p.name,
          color: p.color,
          hat: p.hat,
          score: p.perGame[gid].score,
          wins: p.perGame[gid].wins,
          best: p.perGame[gid].best,
          played: p.perGame[gid].played,
        }));
    }

    return {
      updatedAt: this.data.updatedAt,
      global,
      perGame,
      recentMatches: this.data.recentMatches.slice(0, 10),
    };
  }
}
