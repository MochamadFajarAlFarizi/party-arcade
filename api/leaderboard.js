const GAME_IDS = [
  'bomb-pass', 'sumo-knockout', 'turf-paint', 'quick-draw', 'word-bomb', 'chaos-survival',
  'crown-chase', 'coin-rush', 'zombie-tag', 'bumper-soccer', 'meteor-shower', 'snake-party',
  'ghost-freeze', 'king-hill', 'shark-escape', 'dodgeball', 'turbo-race',
  'trivia-rush', 'reflex-duel', 'math-panic',
];

function getSupabaseCreds() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  return { url, key };
}

async function sbFetch(path, { method = 'GET', body, prefer } = {}) {
  const { url, key } = getSupabaseCreds();
  if (!url || !key) return null;
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
  if (prefer) headers.Prefer = prefer;
  const resp = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`Supabase ${resp.status}: ${txt.slice(0, 160)}`);
  }
  const text = await resp.text();
  return text ? JSON.parse(text) : null;
}

function getPeriodCutoffISO(period) {
  const now = new Date();
  if (period === 'today') {
    // Start of current day in WIB (UTC+7)
    const wibOffsetMs = 7 * 60 * 60 * 1000;
    const wibNow = new Date(now.getTime() + wibOffsetMs);
    wibNow.setUTCHours(0, 0, 0, 0);
    return new Date(wibNow.getTime() - wibOffsetMs).toISOString();
  }
  if (period === 'week') {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  }
  return null;
}

function aggregateFromScores(rows) {
  const byPlayer = new Map();
  for (const r of rows) {
    const k = r.player_key;
    let rec = byPlayer.get(k);
    if (!rec) {
      rec = {
        name: r.name,
        color: r.color || '#FF5E7E',
        hat: r.hat || 'headset',
        totalScore: 0,
        wins: 0,
        gamesPlayed: 0,
        bestStreak: 0,
        _curStreak: 0,
        perGame: {},
      };
      byPlayer.set(k, rec);
    }
    rec.name = r.name;
    if (r.color) rec.color = r.color;
    if (r.hat) rec.hat = r.hat;
    const pts = Number(r.score) || 0;
    rec.totalScore += pts;
    rec.gamesPlayed += 1;
    if (r.won) {
      rec.wins += 1;
      rec._curStreak += 1;
      rec.bestStreak = Math.max(rec.bestStreak, rec._curStreak);
    } else {
      rec._curStreak = 0;
    }
    if (r.game_id && GAME_IDS.includes(r.game_id)) {
      const g = rec.perGame[r.game_id] || { score: 0, wins: 0, played: 0, best: 0 };
      g.score += pts;
      g.played += 1;
      g.best = Math.max(g.best, pts);
      if (r.won) g.wins += 1;
      rec.perGame[r.game_id] = g;
    }
  }

  const all = [...byPlayer.values()];
  const global = [...all]
    .sort((a, b) => b.totalScore - a.totalScore || b.wins - a.wins)
    .slice(0, 50)
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
      .filter((p) => p.perGame[gid])
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

  return { global, perGame };
}

async function fetchLeaderboardPayload(period = 'all') {
  const cutoff = getPeriodCutoffISO(period);
  if (cutoff) {
    try {
      const rows = await sbFetch(`match_scores?select=*&played_at=gte.${encodeURIComponent(cutoff)}&order=played_at.asc&limit=1000`);
      const { global, perGame } = aggregateFromScores(Array.isArray(rows) ? rows : []);
      return { updatedAt: new Date().toISOString(), period, global, perGame, recentMatches: [] };
    } catch {
      // Fallback cleanly if user hasn't run updated schema.sql yet
      return { updatedAt: new Date().toISOString(), period, global: [], perGame: {}, recentMatches: [] };
    }
  }

  const [players, matches] = await Promise.all([
    sbFetch('leaderboard_players?select=*&order=total_score.desc,wins.desc&limit=200'),
    sbFetch('recent_matches?select=*&order=created_at.desc&limit=10'),
  ]);

  const list = Array.isArray(players) ? players : [];
  const global = list.slice(0, 50).map((p, idx) => ({
    rank: idx + 1,
    name: p.name,
    color: p.color,
    hat: p.hat,
    totalScore: p.total_score || 0,
    wins: p.wins || 0,
    gamesPlayed: p.games_played || 0,
    winRate: p.games_played > 0 ? Math.round(((p.wins || 0) / p.games_played) * 100) : 0,
    bestStreak: p.best_streak || 0,
  }));

  const perGame = {};
  for (const gid of GAME_IDS) {
    perGame[gid] = list
      .filter((p) => p.per_game && p.per_game[gid])
      .sort((a, b) => (b.per_game[gid].score || 0) - (a.per_game[gid].score || 0))
      .slice(0, 10)
      .map((p, idx) => ({
        rank: idx + 1,
        name: p.name,
        color: p.color,
        hat: p.hat,
        score: p.per_game[gid].score || 0,
        wins: p.per_game[gid].wins || 0,
        best: p.per_game[gid].best || 0,
        played: p.per_game[gid].played || 0,
      }));
  }

  return {
    updatedAt: new Date().toISOString(),
    period: 'all',
    global,
    perGame,
    recentMatches: (Array.isArray(matches) ? matches : []).map((m) => ({
      gameId: m.game_id,
      roomCode: m.room_code,
      winnerName: m.winner_name,
      winnerColor: m.winner_color,
      playerCount: m.player_count,
      at: m.created_at,
    })),
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const { url, key } = getSupabaseCreds();
  const parsedUrl = new URL(req.url || '/', 'http://localhost');
  const period = ['today', 'week', 'all'].includes(parsedUrl.searchParams.get('period'))
    ? parsedUrl.searchParams.get('period')
    : 'all';

  if (!url || !key) {
    return res.status(200).json({ updatedAt: new Date().toISOString(), period, global: [], perGame: {}, recentMatches: [] });
  }

  try {
    if (req.method === 'POST') {
      const payload = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const { gameId, roomCode, standings = [] } = payload;
      const humans = standings.filter((s) => !s.isBot && s.name && String(s.name).trim());
      if (humans.length > 0) {
        const topScore = Math.max(...standings.map((s) => Number(s.score) || 0), 0);
        const keys = humans.map((h) => h.name.trim().toLowerCase());
        const inList = keys.map((k) => `"${encodeURIComponent(k.replace(/["(),]/g, ''))}"`).join(',');
        const existingRows = await sbFetch(`leaderboard_players?player_key=in.(${inList})`) || [];
        const existingMap = new Map(existingRows.map((r) => [r.player_key, r]));

        const nowIso = new Date().toISOString();
        const matchScoreRows = [];
        const upserts = humans.map((entry) => {
          const cleanName = entry.name.trim().slice(0, 16);
          const pKey = cleanName.toLowerCase();
          const prev = existingMap.get(pKey);
          const pts = Math.max(0, Math.min(2000, Math.round(Number(entry.score) || 0)));
          const won = entry.rank === 1 && pts > 0 && pts >= topScore;

          const curStreak = won ? ((prev?.current_streak || 0) + 1) : 0;
          const bestStreak = Math.max(prev?.best_streak || 0, curStreak);
          const perGame = { ...(prev?.per_game || {}) };

          if (gameId && GAME_IDS.includes(gameId)) {
            const g = perGame[gameId] || { score: 0, wins: 0, played: 0, best: 0 };
            perGame[gameId] = {
              score: (g.score || 0) + pts,
              played: (g.played || 0) + 1,
              best: Math.max(g.best || 0, pts),
              wins: (g.wins || 0) + (won ? 1 : 0),
            };
          }

          matchScoreRows.push({
            player_key: pKey,
            name: cleanName,
            color: entry.color || prev?.color || '#FF5E7E',
            hat: entry.hat || prev?.hat || 'headset',
            game_id: gameId || 'party-cup',
            score: pts,
            won,
            played_at: nowIso,
          });

          return {
            player_key: pKey,
            name: cleanName,
            color: entry.color || prev?.color || '#FF5E7E',
            hat: entry.hat || prev?.hat || 'headset',
            total_score: (prev?.total_score || 0) + pts,
            wins: (prev?.wins || 0) + (won ? 1 : 0),
            games_played: (prev?.games_played || 0) + 1,
            current_streak: curStreak,
            best_streak: bestStreak,
            per_game: perGame,
            last_played_at: nowIso,
          };
        });

        await sbFetch('leaderboard_players?on_conflict=player_key', {
          method: 'POST',
          body: upserts,
          prefer: 'resolution=merge-duplicates,return=minimal',
        });

        // Best-effort write into match_scores for Today/Week filters
        await sbFetch('match_scores', {
          method: 'POST',
          body: matchScoreRows,
          prefer: 'return=minimal',
        }).catch(() => {});

        const winner = standings[0];
        await sbFetch('recent_matches', {
          method: 'POST',
          body: {
            game_id: gameId || 'party-cup',
            room_code: String(roomCode || '').slice(0, 8),
            winner_name: winner?.name || 'Unknown',
            winner_color: winner?.color || '#FFD166',
            player_count: standings.length,
          },
          prefer: 'return=minimal',
        });
      }

      const fresh = await fetchLeaderboardPayload('all');
      return res.status(200).json(fresh);
    }

    const data = await fetchLeaderboardPayload(period);
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Leaderboard error', global: [], perGame: {}, recentMatches: [] });
  }
}
