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

async function fetchLeaderboardPayload() {
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
  if (!url || !key) {
    return res.status(200).json({ updatedAt: new Date().toISOString(), global: [], perGame: {}, recentMatches: [] });
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
            last_played_at: new Date().toISOString(),
          };
        });

        await sbFetch('leaderboard_players?on_conflict=player_key', {
          method: 'POST',
          body: upserts,
          prefer: 'resolution=merge-duplicates,return=minimal',
        });

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

      const fresh = await fetchLeaderboardPayload();
      return res.status(200).json(fresh);
    }

    const data = await fetchLeaderboardPayload();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Leaderboard error', global: [], perGame: {}, recentMatches: [] });
  }
}
