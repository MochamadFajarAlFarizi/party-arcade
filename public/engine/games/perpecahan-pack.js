import { ARENA_W, ARENA_H, PLAYER_RADIUS, BaseGame, clamp, dist, pickRandom, randRange, spawnRing } from './base-game.js';

// =========================================================================
// 25. BAGI ATAU KHIANATI — Classic Prisoner's Dilemma Betrayal Game!
// =========================================================================
export class SplitOrStealGame extends BaseGame {
  constructor(room, players) {
    super(room, 'split-or-steal');
    this.countdown = 3.5;
    this.players = players.map((p) => ({
      id: p.id, name: p.name, color: p.color, hat: p.hat, team: p.team ?? 0, isBot: !!p.isBot,
      score: 0, choice: null, botAt: 0, betrayals: 0, betrayedBy: new Set(), lastDelta: 0,
    }));
    this.round = 0;
    this.totalRounds = 5;
    this.subPhase = 'decide'; // decide | reveal
    this.timer = 0;
    this.groups = []; // array of arrays of playerIds (pairs or 1 triple)
    this.roundResults = [];
    this._nextRound();
  }

  _buildGroups() {
    let pool = [...this.players].sort(() => Math.random() - 0.5);
    // In Team Mode, interleave teams so pairs are cross-team whenever possible!
    if (this.room?.teamMode) {
      const byTeam = new Map();
      for (const p of pool) {
        if (!byTeam.has(p.team)) byTeam.set(p.team, []);
        byTeam.get(p.team).push(p);
      }
      const queues = [...byTeam.values()].sort((a, b) => b.length - a.length);
      pool = [];
      while (queues.some((q) => q.length > 0)) {
        for (const q of queues) {
          if (q.length > 0) pool.push(q.shift());
        }
      }
    }
    const groups = [];
    for (let i = 0; i < pool.length; i += 2) {
      if (pool.length - i === 3) {
        groups.push([pool[i].id, pool[i + 1].id, pool[i + 2].id]);
        break;
      } else if (pool.length - i === 1 && groups.length > 0) {
        groups[groups.length - 1].push(pool[i].id);
      } else {
        groups.push(pool.slice(i, i + 2).map((p) => p.id));
      }
    }
    return groups;
  }

  _nextRound() {
    this.round += 1;
    if (this.round > this.totalRounds) {
      return this.finishGame(this.players.map((p) => ({
        id: p.id, name: p.name, color: p.color, hat: p.hat, isBot: p.isBot,
        score: Math.max(0, p.score),
        detail: p.betrayals === 0 ? '🕊️ 100% Setia!' : `🔪 ${p.betrayals}x Pengkhianatan`,
      })));
    }
    this.subPhase = 'decide';
    this.timer = 11.5;
    this.groups = this._buildGroups();
    this.roundResults = [];
    this.players.forEach((p) => {
      p.choice = null;
      p.lastDelta = 0;
      p.botAt = randRange(1.4, 4.2);
    });
  }

  handleAction(playerId, msg) {
    if (this.phase !== 'playing' || this.subPhase !== 'decide') return;
    if (msg.action !== 'choose') return;
    if (msg.choice !== 'split' && msg.choice !== 'steal') return;
    const p = this.players.find((x) => x.id === playerId);
    if (!p || p.choice !== null) return;
    p.choice = msg.choice;
    this.emitEvent('sfx', { sound: 'pop' });
  }

  _resolveRound() {
    this.subPhase = 'reveal';
    this.timer = 4.4;
    const mult = this.round === this.totalRounds ? 2 : 1;
    const results = [];
    let anyBetrayal = false;

    for (const grp of this.groups) {
      const members = grp.map((id) => this.players.find((p) => p.id === id)).filter(Boolean);
      members.forEach((m) => { if (!m.choice) m.choice = 'split'; });

      const stealers = members.filter((m) => m.choice === 'steal');
      const splitters = members.filter((m) => m.choice === 'split');

      let headline = '';
      let tone = 'peace';

      if (members.length === 1) {
        const m = members[0];
        const delta = 100 * mult;
        m.score += delta;
        m.lastDelta = delta;
        headline = `🕊️ ${m.name} main solo ronde ini (+${delta})`;
      } else if (stealers.length === 0) {
        const gain = (members.length === 3 ? 130 : 120) * mult;
        members.forEach((m) => { m.score += gain; m.lastDelta = gain; });
        headline = `🕊️ DAMAI! Semua pilih BAGI (+${gain} pts masing-masing!)`;
        tone = 'peace';
      } else if (stealers.length === 1) {
        anyBetrayal = true;
        const thief = stealers[0];
        const gain = (members.length === 3 ? 300 : 260) * mult;
        const loss = 40 * mult;
        thief.score += gain;
        thief.lastDelta = gain;
        thief.betrayals += 1;
        splitters.forEach((v) => {
          v.score -= loss;
          v.lastDelta = -loss;
          v.betrayedBy.add(thief.id);
        });
        headline = `🔪 ${thief.name} MENIKAM ${splitters.map((v) => v.name).join(' & ')}! (+${gain} / -${loss})`;
        tone = 'betray';
      } else {
        anyBetrayal = true;
        const stealerLoss = 60 * mult;
        const splitterLoss = 45 * mult;
        stealers.forEach((s) => {
          s.score -= stealerLoss;
          s.lastDelta = -stealerLoss;
          s.betrayals += 1;
          members.forEach((o) => { if (o.id !== s.id) s.betrayedBy.add(o.id); });
        });
        splitters.forEach((v) => {
          v.score -= splitterLoss;
          v.lastDelta = -splitterLoss;
          stealers.forEach((s) => v.betrayedBy.add(s.id));
        });
        headline = `💥 SERAKAH BARENG! Semua kena karma (-${stealerLoss} pts)!`;
        tone = 'crash';
      }

      results.push({
        tone,
        headline,
        members: members.map((m) => ({
          id: m.id, name: m.name, color: m.color, choice: m.choice, delta: m.lastDelta,
        })),
      });
    }

    this.roundResults = results;
    this.emitEvent('sfx', { sound: anyBetrayal ? 'explode' : 'correct' });
  }

  update(dt) {
    this.timer -= dt;
    if (this.subPhase === 'decide') {
      for (const p of this.players) {
        if (p.isBot && p.choice === null) {
          p.botAt -= dt;
          if (p.botAt <= 0) {
            const grp = this.groups.find((g) => g.includes(p.id)) || [];
            const partners = grp.filter((id) => id !== p.id);
            const grudge = partners.some((id) => p.betrayedBy.has(id));
            const stealChance = grudge ? 0.78 : (this.round === this.totalRounds ? 0.55 : 0.38);
            p.choice = Math.random() < stealChance ? 'steal' : 'split';
          }
        }
      }
      if (this.timer <= 0 || this.players.every((p) => p.choice !== null)) {
        this._resolveRound();
      }
    } else if (this.timer <= 0) {
      this._nextRound();
    }
  }

  getStateFor(viewerId) {
    const myGroupIds = this.groups.find((g) => g.includes(viewerId)) || [];
    const myPartners = myGroupIds
      .filter((id) => id !== viewerId)
      .map((id) => this.players.find((p) => p.id === id))
      .filter(Boolean)
      .map((p) => ({ id: p.id, name: p.name, color: p.color, team: p.team }));
    return {
      gameId: this.gameId, uiType: 'split-steal', phase: this.phase,
      countdown: Number(this.countdown.toFixed(1)),
      round: this.round, totalRounds: this.totalRounds,
      subPhase: this.subPhase, timer: Number(Math.max(0, this.timer).toFixed(1)),
      isJackpot: this.round === this.totalRounds,
      myPartners,
      results: this.subPhase === 'reveal' ? this.roundResults : [],
      players: this.players.map((p) => ({
        id: p.id, name: p.name, color: p.color, team: p.team, score: p.score,
        answered: p.choice !== null,
        myChoice: p.id === viewerId ? p.choice : null,
        choice: this.subPhase === 'reveal' ? p.choice : null,
        lastDelta: this.subPhase === 'reveal' ? p.lastDelta : 0,
      })),
    };
  }

  getState() { return this.getStateFor(null); }
}

// =========================================================================
// 26. FITNAH & TUMBAL — Secret Sabotage Voting + Reflect Shield Mindgame!
// =========================================================================
const BLAME_THEMES = [
  { title: '💣 BOM FITNAH', sub: 'Tunjuk 1 teman buat jadi TUMBAL! Yang paling banyak di-vote meledak & poinnya dibagi ke penuduh!', mult: 1 },
  { title: '💰 PAJAK SULTAN', sub: 'Kroyok orang yang kamu incar! Hati-hati kalau dia pasang 🛡️ PERISAI PANTUL!', mult: 1 },
  { title: '🤡 KAMBING HITAM', sub: 'Siapa yang paling licik di room ini? Tuduh dia sekarang atau lindungi dirimu!', mult: 1 },
  { title: '🎭 KUDETA MALAM', sub: 'Awas persekutuan palsu di Discord! Yang kena vote terbanyak rugi besar!', mult: 1 },
  { title: '🔥 PENGKHIANATAN FINAL (2x)', sub: 'RONDE TERAKHIR! Semua sabotase & pantulan perisai bernilai 2x LIPAT!!', mult: 2 },
];

export class BlameVoteGame extends BaseGame {
  constructor(room, players) {
    super(room, 'blame-vote');
    this.countdown = 3.5;
    this.players = players.map((p) => ({
      id: p.id, name: p.name, color: p.color, hat: p.hat, team: p.team ?? 0, isBot: !!p.isBot,
      score: 0, vote: null, botAt: 0, shieldsLeft: 2, timesBlamed: 0, reflects: 0, lastDelta: 0,
    }));
    this.round = 0;
    this.totalRounds = 5;
    this.subPhase = 'vote'; // vote | reveal
    this.timer = 0;
    this.theme = BLAME_THEMES[0];
    this.headlines = [];
    this.voteDetails = [];
    this._nextRound();
  }

  _nextRound() {
    this.round += 1;
    if (this.round > this.totalRounds) {
      return this.finishGame(this.players.map((p) => ({
        id: p.id, name: p.name, color: p.color, hat: p.hat, isBot: p.isBot,
        score: Math.max(0, p.score),
        detail: p.reflects > 0 ? `🪞 ${p.reflects}x Pantul • 💣 ${p.timesBlamed}x Tumbal` : `💣 ${p.timesBlamed}x Jadi Tumbal`,
      })));
    }
    this.subPhase = 'vote';
    this.timer = 11.5;
    this.theme = BLAME_THEMES[(this.round - 1) % BLAME_THEMES.length];
    this.headlines = [];
    this.voteDetails = [];
    this.players.forEach((p) => {
      p.vote = null;
      p.lastDelta = 0;
      p.botAt = randRange(1.5, 4.4);
    });
  }

  handleAction(playerId, msg) {
    if (this.phase !== 'playing' || this.subPhase !== 'vote') return;
    if (msg.action !== 'vote') return;
    const p = this.players.find((x) => x.id === playerId);
    if (!p || p.vote !== null) return;
    if (msg.targetId === '__SHIELD__') {
      if (p.shieldsLeft <= 0) return;
      p.vote = '__SHIELD__';
      this.emitEvent('sfx', { sound: 'powerup' });
      return;
    }
    const target = this.players.find((x) => x.id === msg.targetId && x.id !== p.id);
    if (!target) return;
    p.vote = target.id;
    this.emitEvent('sfx', { sound: 'pop' });
  }

  _resolveRound() {
    this.subPhase = 'reveal';
    this.timer = 4.8;
    const mult = this.theme.mult || 1;
    const headlines = [];

    // Default unvoted players to random target
    for (const p of this.players) {
      if (p.vote === null) {
        const others = this.players.filter((o) => o.id !== p.id);
        p.vote = others.length ? pickRandom(others).id : '__SHIELD__';
      }
      if (p.vote === '__SHIELD__') {
        p.shieldsLeft = Math.max(0, p.shieldsLeft - 1);
      }
    }

    // Tally votes per target
    const attackersByTarget = new Map();
    for (const p of this.players) {
      if (p.vote && p.vote !== '__SHIELD__') {
        if (!attackersByTarget.has(p.vote)) attackersByTarget.set(p.vote, []);
        attackersByTarget.get(p.vote).push(p);
      }
    }

    // 1. Check shield reflections first!
    let anyReflect = false;
    for (const target of this.players) {
      const attackers = attackersByTarget.get(target.id) || [];
      if (target.vote === '__SHIELD__') {
        if (attackers.length > 0) {
          anyReflect = true;
          const gain = 75 * attackers.length * mult;
          const pen = 55 * mult;
          target.score += gain;
          target.lastDelta += gain;
          target.reflects += attackers.length;
          attackers.forEach((a) => {
            a.score -= pen;
            a.lastDelta -= pen;
          });
          headlines.push({
            tone: 'reflect',
            text: `🪞 ${target.name} PASANG PERISAI! ${attackers.map((a) => a.name).join(', ')} KENA PANTUL (-${pen})!`,
          });
        } else {
          target.score += 20;
          target.lastDelta += 20;
          headlines.push({
            tone: 'safe',
            text: `🛡️ ${target.name} pasang perisai, tapi tidak ada yang nyerang (+20).`,
          });
        }
      }
    }

    // 2. Find most-voted UNSHIELDED targets
    const unshielded = this.players.filter((p) => p.vote !== '__SHIELD__');
    let maxVotes = 0;
    for (const p of unshielded) {
      const cnt = (attackersByTarget.get(p.id) || []).length;
      if (cnt > maxVotes) maxVotes = cnt;
    }

    let anyBlamed = false;
    if (maxVotes > 0) {
      for (const victim of unshielded) {
        const attackers = attackersByTarget.get(victim.id) || [];
        if (attackers.length === maxVotes) {
          anyBlamed = true;
          const loss = 95 * mult;
          const gain = 110 * mult;
          victim.score -= loss;
          victim.lastDelta -= loss;
          victim.timesBlamed += 1;
          attackers.forEach((a) => {
            a.score += gain;
            a.lastDelta += gain;
          });
          headlines.push({
            tone: 'boom',
            text: `💣 ${victim.name} JADI TUMBAL (${maxVotes} suara, -${loss})! Penuduh dapat +${gain}!`,
          });
        }
      }
    }

    // 3. Safe bonus for unshielded players who got 0 votes
    for (const p of unshielded) {
      const cnt = (attackersByTarget.get(p.id) || []).length;
      if (cnt === 0) {
        const safeBonus = 45 * mult;
        p.score += safeBonus;
        p.lastDelta += safeBonus;
      }
    }

    if (headlines.length === 0) {
      headlines.push({ tone: 'safe', text: '😎 Tidak ada korban ronde ini!' });
    }

    this.headlines = headlines;
    this.voteDetails = this.players.map((p) => {
      const t = p.vote === '__SHIELD__' ? null : this.players.find((x) => x.id === p.vote);
      return {
        fromName: p.name,
        fromColor: p.color,
        action: p.vote === '__SHIELD__' ? 'shield' : 'vote',
        targetName: t ? t.name : 'PERISAI 🛡️',
        delta: p.lastDelta,
      };
    });
    this.emitEvent('sfx', { sound: anyReflect ? 'powerup' : anyBlamed ? 'explode' : 'correct' });
  }

  update(dt) {
    this.timer -= dt;
    if (this.subPhase === 'vote') {
      for (const p of this.players) {
        if (p.isBot && p.vote === null) {
          p.botAt -= dt;
          if (p.botAt <= 0) {
            const topScore = Math.max(...this.players.map((x) => x.score));
            const amLeader = p.score >= topScore && this.round >= 2;
            if (p.shieldsLeft > 0 && ((amLeader && Math.random() < 0.55) || Math.random() < 0.22)) {
              p.vote = '__SHIELD__';
            } else {
              let pool = this.players.filter((o) => o.id !== p.id && !this.isAlly(p, o));
              if (!pool.length) pool = this.players.filter((o) => o.id !== p.id);
              // Bots prefer targeting the current score leader!
              pool.sort((a, b) => b.score - a.score);
              const pick = Math.random() < 0.65 ? pool[0] : pickRandom(pool);
              p.vote = pick ? pick.id : '__SHIELD__';
            }
          }
        }
      }
      if (this.timer <= 0 || this.players.every((p) => p.vote !== null)) {
        this._resolveRound();
      }
    } else if (this.timer <= 0) {
      this._nextRound();
    }
  }

  getStateFor(viewerId) {
    const me = this.players.find((p) => p.id === viewerId);
    return {
      gameId: this.gameId, uiType: 'blame-vote', phase: this.phase,
      countdown: Number(this.countdown.toFixed(1)),
      round: this.round, totalRounds: this.totalRounds,
      subPhase: this.subPhase, timer: Number(Math.max(0, this.timer).toFixed(1)),
      theme: this.theme,
      myShieldsLeft: me ? me.shieldsLeft : 0,
      myVote: me ? me.vote : null,
      headlines: this.subPhase === 'reveal' ? this.headlines : [],
      voteDetails: this.subPhase === 'reveal' ? this.voteDetails : [],
      players: this.players.map((p) => ({
        id: p.id, name: p.name, color: p.color, team: p.team, score: p.score,
        shieldsLeft: p.shieldsLeft,
        answered: p.vote !== null,
        lastDelta: this.subPhase === 'reveal' ? p.lastDelta : 0,
      })),
    };
  }

  getState() { return this.getStateFor(null); }
}

// =========================================================================
// 27. RAMPOK BRANKAS — Push-Your-Luck Vault Heist + Sabotage Alarm Button!
// =========================================================================
const HEIST_LOOT = [55, 85, 120, 165, 235];
const HEIST_RISK = [15, 30, 48, 66, 82];

export class GreedHeistGame extends BaseGame {
  constructor(room, players) {
    super(room, 'greed-heist');
    this.countdown = 3.5;
    this.players = players.map((p) => ({
      id: p.id, name: p.name, color: p.color, hat: p.hat, team: p.team ?? 0, isBot: !!p.isBot,
      score: 0, bag: 0, inside: true, sabotageLeft: 1, sabotages: 0, busted: 0, choice: null, botAt: 0,
    }));
    this.heist = 0;
    this.totalHeists = 3;
    this.stepIdx = 0; // 0..4
    this.subPhase = 'decide'; // decide | reveal
    this.timer = 0;
    this.lastSummary = null;
    this._startHeist();
  }

  _startHeist() {
    this.heist += 1;
    if (this.heist > this.totalHeists) {
      return this.finishGame(this.players.map((p) => ({
        id: p.id, name: p.name, color: p.color, hat: p.hat, isBot: p.isBot,
        score: Math.max(0, p.score),
        detail: `💰 ${p.score} pts${p.sabotages > 0 ? ` • 😈 ${p.sabotages}x Sabotase` : ''}${p.busted > 0 ? ` • 🚔 ${p.busted}x Tertangkap` : ''}`,
      })));
    }
    this.stepIdx = 0;
    this.players.forEach((p) => {
      p.bag = 40; // initial vault entry loot so escaping on step 1 still has something!
      p.inside = true;
      p.choice = null;
    });
    this._startStep();
  }

  _startStep() {
    const inside = this.players.filter((p) => p.inside);
    if (inside.length === 0 || this.stepIdx >= HEIST_LOOT.length) {
      this._startHeist();
      return;
    }
    this.subPhase = 'decide';
    this.timer = 9.5;
    this.lastSummary = null;
    inside.forEach((p) => {
      p.choice = null;
      p.botAt = randRange(1.2, 3.6);
    });
  }

  handleAction(playerId, msg) {
    if (this.phase !== 'playing' || this.subPhase !== 'decide') return;
    if (msg.action !== 'heist') return;
    const p = this.players.find((x) => x.id === playerId);
    if (!p || !p.inside || p.choice !== null) return;
    if (msg.choice === 'stay' || msg.choice === 'escape') {
      p.choice = msg.choice;
      this.emitEvent('sfx', { sound: 'pop' });
    } else if (msg.choice === 'sabotage' && p.sabotageLeft > 0) {
      p.choice = 'sabotage';
      this.emitEvent('sfx', { sound: 'powerup' });
    }
  }

  _resolveStep() {
    this.subPhase = 'reveal';
    this.timer = 3.8;
    const inside = this.players.filter((p) => p.inside);
    inside.forEach((p) => { if (!p.choice) p.choice = 'stay'; });

    const escapees = inside.filter((p) => p.choice === 'escape');
    const saboteurs = inside.filter((p) => p.choice === 'sabotage');
    const stayers = inside.filter((p) => p.choice === 'stay');

    const baseRisk = HEIST_RISK[this.stepIdx];
    const stepLoot = HEIST_LOOT[this.stepIdx];
    const sabBonusRisk = saboteurs.length * 35;
    const effectiveRisk = Math.min(96, baseRisk + sabBonusRisk);
    const lines = [];

    // 1. Escapees cash out safely
    const soloBonus = (escapees.length === 1 && saboteurs.length === 0) ? 40 : 0;
    for (const p of escapees) {
      p.inside = false;
      const gain = p.bag + soloBonus;
      p.score += gain;
      p.bag = 0;
      lines.push({ tone: 'safe', text: `🏃 ${p.name} kabur aman membawa +${gain} pts${soloBonus ? ' (Solo Bonus +40!)' : ''}!` });
    }

    // 2. Saboteurs escape AND pull the alarm!
    for (const p of saboteurs) {
      p.inside = false;
      p.sabotageLeft = Math.max(0, p.sabotageLeft - 1);
      const gain = p.bag;
      p.score += gain;
      p.bag = 0;
      lines.push({ tone: 'sabotage', text: `😈 ${p.name} TEKAN ALARM POLISI & KABUR (+${gain})! Risiko naik jadi ${effectiveRisk}%!` });
    }

    // 3. Police raid roll for greedy stayers!
    let raided = false;
    if (stayers.length > 0) {
      const roll = Math.random() * 100;
      raided = roll < effectiveRisk;
      if (raided) {
        for (const p of stayers) {
          const lost = p.bag;
          p.bag = 0;
          p.inside = false;
          p.busted += 1;
          lines.push({ tone: 'bust', text: `🚔 ${p.name} TERTANGKAP POLISI! Kehilangan ${lost} pts di kantong!` });
        }
        // Saboteurs cash in betrayal jackpot!
        for (const s of saboteurs) {
          s.score += 120;
          s.sabotages += 1;
          lines.push({ tone: 'sabotage', text: `💀 JACKPOT PENGKHIANAT! ${s.name} dapat bonus +120 pts!` });
        }
        this.emitEvent('sfx', { sound: 'explode' });
      } else {
        const finalLayer = this.stepIdx === HEIST_LOOT.length - 1;
        for (const p of stayers) {
          p.bag += stepLoot;
          if (finalLayer) {
            const totalHaul = p.bag + 85;
            p.score += totalHaul;
            p.bag = 0;
            p.inside = false;
            lines.push({ tone: 'jackpot', text: `💎 ${p.name} MENJARAH BRANKAS TERDALAM! +${totalHaul} pts!` });
          } else {
            lines.push({ tone: 'loot', text: `💎 ${p.name} aman & raup +${stepLoot} (Kantong: ${p.bag} pts)` });
          }
        }
        this.emitEvent('sfx', { sound: 'correct' });
      }
    } else {
      this.emitEvent('sfx', { sound: 'pop' });
    }

    this.lastSummary = { raided, effectiveRisk, saboteurs: saboteurs.map((s) => s.name), lines };
    this.stepIdx += 1;
  }

  update(dt) {
    this.timer -= dt;
    if (this.subPhase === 'decide') {
      const inside = this.players.filter((p) => p.inside);
      for (const p of inside) {
        if (p.isBot && p.choice === null) {
          p.botAt -= dt;
          if (p.botAt <= 0) {
            const risk = HEIST_RISK[this.stepIdx] || 50;
            const enemiesInside = inside.filter((o) => o.id !== p.id && !this.isAlly(p, o)).length;
            if (p.sabotageLeft > 0 && this.stepIdx >= 1 && enemiesInside >= 1 && Math.random() < 0.28) {
              p.choice = 'sabotage';
            } else if (Math.random() * 100 < risk - 10) {
              p.choice = 'escape';
            } else {
              p.choice = 'stay';
            }
          }
        }
      }
      if (this.timer <= 0 || inside.every((p) => p.choice !== null)) {
        this._resolveStep();
      }
    } else if (this.timer <= 0) {
      this._startStep();
    }
  }

  getStateFor(viewerId) {
    const me = this.players.find((p) => p.id === viewerId);
    const curStep = Math.min(this.stepIdx, HEIST_LOOT.length - 1);
    return {
      gameId: this.gameId, uiType: 'greed-heist', phase: this.phase,
      countdown: Number(this.countdown.toFixed(1)),
      round: this.heist, totalRounds: this.totalHeists,
      step: Math.min(this.stepIdx + 1, HEIST_LOOT.length),
      maxSteps: HEIST_LOOT.length,
      subPhase: this.subPhase, timer: Number(Math.max(0, this.timer).toFixed(1)),
      nextLoot: HEIST_LOOT[curStep],
      baseRisk: HEIST_RISK[curStep],
      myInside: !!me?.inside,
      myBag: me?.bag || 0,
      mySabotageLeft: me?.sabotageLeft || 0,
      myChoice: me?.choice || null,
      summary: this.subPhase === 'reveal' ? this.lastSummary : null,
      players: this.players.map((p) => ({
        id: p.id, name: p.name, color: p.color, team: p.team,
        score: p.score, bag: p.bag, inside: p.inside,
        answered: !p.inside || p.choice !== null,
      })),
    };
  }

  getState() { return this.getStateFor(null); }
}

// =========================================================================
// 28. JEMBATAN PENGKHIANAT — Crumbling Lava Bridge + Shove Friends Into Lava!
// =========================================================================
const BR_COLS = 6;
const BR_ROWS = 4;
const BR_PAD_X = 110;
const BR_PAD_Y = 66;
const BR_CELL_W = (ARENA_W - BR_PAD_X * 2) / BR_COLS;
const BR_CELL_H = (ARENA_H - BR_PAD_Y * 2) / BR_ROWS;

export class BetrayalBridgeGame extends BaseGame {
  constructor(room, players) {
    super(room, 'betrayal-bridge');
    this.entities = spawnRing(players, ARENA_W / 2, ARENA_H / 2, 160);
    this.entities.forEach((e) => {
      e.shoveKills = 0;
      e.falls = 0;
      e.respawnTimer = 0;
      e.lastShovedBy = null;
      e.lastShovedAt = -99;
      e.boostTimer = 0;
    });
    this.duration = 52;
    this.cyclePhase = 'safe'; // safe | warning | drop
    this.cycleTimer = 2.4;
    this.tiles = Array.from({ length: BR_COLS * BR_ROWS }, () => 2); // 2=solid, 1=cracking, 0=gone
    this.safeTiles = new Set(Array.from({ length: BR_COLS * BR_ROWS }, (_, i) => i));
    this.chests = [];
    this._spawnChest();
  }

  _tileCenter(idx) {
    const c = idx % BR_COLS;
    const r = Math.floor(idx / BR_COLS);
    return { x: BR_PAD_X + (c + 0.5) * BR_CELL_W, y: BR_PAD_Y + (r + 0.5) * BR_CELL_H };
  }

  _tileIndexAt(x, y) {
    const c = Math.floor((x - BR_PAD_X) / BR_CELL_W);
    const r = Math.floor((y - BR_PAD_Y) / BR_CELL_H);
    if (c < 0 || c >= BR_COLS || r < 0 || r >= BR_ROWS) return -1;
    return r * BR_COLS + c;
  }

  _spawnChest() {
    const candidates = [...this.safeTiles];
    if (!candidates.length) return;
    const idx = pickRandom(candidates);
    const pos = this._tileCenter(idx);
    this.chests = [{ x: pos.x, y: pos.y, tileIdx: idx }];
  }

  _startWarning() {
    this.cyclePhase = 'warning';
    this.cycleTimer = 2.4;
    const aliveCnt = this.entities.filter((e) => e.alive).length;
    // Deliberately tight safe tiles so friends must shove each other for space!
    const keepCount = clamp(Math.ceil(aliveCnt * 0.85) + 1, 2, 7);
    const all = Array.from({ length: BR_COLS * BR_ROWS }, (_, i) => i).sort(() => Math.random() - 0.5);
    this.safeTiles = new Set(all.slice(0, keepCount));
    for (let i = 0; i < this.tiles.length; i++) {
      this.tiles[i] = this.safeTiles.has(i) ? 2 : 1;
    }
    this.emitEvent('banner', { text: `⚠️ HANYA ${keepCount} UBIN AMAN! DORONG LAWAN KE LAVA!` });
    this.emitEvent('sfx', { sound: 'tick' });
  }

  _startDrop() {
    this.cyclePhase = 'drop';
    this.cycleTimer = 1.75;
    for (let i = 0; i < this.tiles.length; i++) {
      this.tiles[i] = this.safeTiles.has(i) ? 2 : 0;
    }
    this.chests = this.chests.filter((c) => this.safeTiles.has(c.tileIdx));
    this.emitEvent('sfx', { sound: 'explode' });
  }

  _restoreBridge() {
    this.cyclePhase = 'safe';
    this.cycleTimer = 2.2;
    this.safeTiles = new Set(Array.from({ length: BR_COLS * BR_ROWS }, (_, i) => i));
    this.tiles.fill(2);
    this._spawnChest();
  }

  update(dt) {
    if (this.elapsed >= this.duration) {
      return this.finishGame(this.entities.map((e) => ({
        id: e.id, name: e.name, color: e.color, hat: e.hat, isBot: e.isBot,
        score: Math.max(0, Math.round(e.score + 100)),
        detail: `🔪 ${e.shoveKills} Dorong Lava • 🔥 ${e.falls}x Jatuh`,
      })));
    }

    this.cycleTimer -= dt;
    if (this.cycleTimer <= 0) {
      if (this.cyclePhase === 'safe') this._startWarning();
      else if (this.cyclePhase === 'warning') this._startDrop();
      else this._restoreBridge();
    }

    const alive = this.entities.filter((e) => e.alive);
    for (const p of this.entities) {
      if (!p.alive) {
        p.respawnTimer -= dt;
        if (p.respawnTimer <= 0) {
          const safeArr = [...this.safeTiles];
          const spawnPos = this._tileCenter(safeArr.length ? pickRandom(safeArr) : 0);
          p.x = spawnPos.x + randRange(-25, 25);
          p.y = spawnPos.y + randRange(-20, 20);
          p.vx = 0; p.vy = 0;
          p.alive = true;
          p.lastShovedBy = null;
          this.emitEvent('boost', { x: p.x, y: p.y, color: p.color });
        }
        continue;
      }

      p.dashCd = Math.max(0, p.dashCd - dt);
      p.dashTimer = Math.max(0, p.dashTimer - dt);
      p.boostTimer = Math.max(0, p.boostTimer - dt);
      p.score += dt * 3;

      if (p.isBot) {
        let tx = ARENA_W / 2;
        let ty = ARENA_H / 2;
        const myTile = this._tileIndexAt(p.x, p.y);
        const onSafe = myTile >= 0 && this.safeTiles.has(myTile);
        const enemy = alive.filter((o) => o.id !== p.id && !this.isAlly(p, o))
          .sort((a, b) => dist(p.x, p.y, a.x, a.y) - dist(p.x, p.y, b.x, b.y))[0];

        if (!onSafe && this.safeTiles.size > 0) {
          const nearest = [...this.safeTiles]
            .map((idx) => this._tileCenter(idx))
            .sort((a, b) => dist(p.x, p.y, a.x, a.y) - dist(p.x, p.y, b.x, b.y))[0];
          tx = nearest.x; ty = nearest.y;
          if (dist(p.x, p.y, tx, ty) > 120 && p.dashCd <= 0) p.wantAction = true;
        } else if (this.chests.length && this.cyclePhase === 'safe') {
          tx = this.chests[0].x; ty = this.chests[0].y;
        } else if (enemy && dist(p.x, p.y, enemy.x, enemy.y) < 165) {
          tx = enemy.x; ty = enemy.y;
          if (dist(p.x, p.y, enemy.x, enemy.y) < 110 && p.dashCd <= 0) p.wantAction = true;
        } else {
          const curCenter = this._tileCenter(myTile >= 0 ? myTile : 0);
          tx = curCenter.x; ty = curCenter.y;
        }
        const d = dist(p.x, p.y, tx, ty);
        if (d > 14) { p.inputX = (tx - p.x) / d; p.inputY = (ty - p.y) / d; }
        else { p.inputX = 0; p.inputY = 0; }
      }

      if (p.wantAction && p.dashCd <= 0) {
        p.wantAction = false;
        p.dashCd = 1.45;
        p.dashTimer = 0.24;
        const dx = Math.hypot(p.inputX, p.inputY) > 0.1 ? p.inputX : Math.cos(p.facing);
        const dy = Math.hypot(p.inputX, p.inputY) > 0.1 ? p.inputY : Math.sin(p.facing);
        p.vx = dx * 650;
        p.vy = dy * 650;
        this.emitEvent('dash', { x: p.x, y: p.y, color: p.color });
      } else {
        p.wantAction = false;
      }

      const spd = p.boostTimer > 0 ? 355 : 280;
      if (p.dashTimer <= 0) {
        p.vx += (p.inputX * spd - p.vx) * Math.min(1, dt * 11);
        p.vy += (p.inputY * spd - p.vy) * Math.min(1, dt * 11);
      }
      if (Math.hypot(p.vx, p.vy) > 14) p.facing = Math.atan2(p.vy, p.vx);
      p.x = clamp(p.x + p.vx * dt, 55, ARENA_W - 55);
      p.y = clamp(p.y + p.vy * dt, 42, ARENA_H - 42);

      // Loot chest grab (+85 pts + mini shockwave!)
      for (let i = this.chests.length - 1; i >= 0; i--) {
        const ch = this.chests[i];
        if (dist(p.x, p.y, ch.x, ch.y) < PLAYER_RADIUS + 24) {
          this.chests.splice(i, 1);
          p.score += 85;
          this.emitEvent('popup', { x: ch.x, y: ch.y - 22, text: '👑 +85 PETI EMAS!', color: '#FACC15' });
          this.emitEvent('shockwave', { x: ch.x, y: ch.y, color: '#FACC15' });
          this.emitEvent('sfx', { sound: 'powerup' });
          for (const other of alive) {
            if (other.id === p.id || !other.alive || this.isAlly(p, other)) continue;
            const d = dist(ch.x, ch.y, other.x, other.y);
            if (d < 220 && d > 1) {
              other.vx += ((other.x - ch.x) / d) * 480;
              other.vy += ((other.y - ch.y) / d) * 480;
              other.lastShovedBy = p.id;
              other.lastShovedAt = this.elapsed;
            }
          }
        }
      }
    }

    // Mega SHOVE collisions!
    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        const a = alive[i];
        const b = alive[j];
        if (!a.alive || !b.alive) continue;
        const d = dist(a.x, a.y, b.x, b.y);
        const minD = PLAYER_RADIUS * 2;
        if (d < minD && d > 0.1) {
          const nx = (b.x - a.x) / d;
          const ny = (b.y - a.y) / d;
          const ov = (minD - d) * 0.5;
          a.x -= nx * ov; a.y -= ny * ov;
          b.x += nx * ov; b.y += ny * ov;

          if (this.isAlly(a, b)) {
            // Co-op teammate boost instead of betrayal!
            if (a.dashTimer > 0) { b.boostTimer = 1.6; this.emitEvent('popup', { x: b.x, y: b.y - 24, text: '🤝 BOOST TIM!', color: '#4ADE80' }); }
            if (b.dashTimer > 0) { a.boostTimer = 1.6; this.emitEvent('popup', { x: a.x, y: a.y - 24, text: '🤝 BOOST TIM!', color: '#4ADE80' }); }
            continue;
          }

          const shoveToB = a.dashTimer > 0 ? 680 : 240;
          const shoveToA = b.dashTimer > 0 ? 680 : 240;
          b.vx += nx * shoveToB; b.vy += ny * shoveToB;
          a.vx -= nx * shoveToA; a.vy -= ny * shoveToA;
          if (a.dashTimer > 0 || shoveToB >= shoveToA) { b.lastShovedBy = a.id; b.lastShovedAt = this.elapsed; }
          if (b.dashTimer > 0 || shoveToA >= shoveToB) { a.lastShovedBy = b.id; a.lastShovedAt = this.elapsed; }
          this.emitEvent('bump', { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, heavy: a.dashTimer > 0 || b.dashTimer > 0 });
        }
      }
    }

    // Lava plunge check
    for (const p of alive) {
      if (!p.alive) continue;
      const idx = this._tileIndexAt(p.x, p.y);
      const fell = idx < 0 || this.tiles[idx] === 0;
      if (fell) {
        p.alive = false;
        p.falls += 1;
        p.score = Math.max(0, p.score - 45);
        p.respawnTimer = 2.1;
        let killerName = null;
        if (p.lastShovedBy && this.elapsed - p.lastShovedAt < 3.6) {
          const killer = this.entities.find((e) => e.id === p.lastShovedBy);
          if (killer && killer.id !== p.id) {
            killer.score += 95;
            killer.shoveKills += 1;
            killerName = killer.name;
            this.emitEvent('banner', { text: `🔪 ${killer.name} DORONG ${p.name} KE LAVA! (+95)` });
          }
        }
        this.emitEvent('ko', { x: p.x, y: p.y, victim: p.name, killer: killerName, color: '#F97316' });
      }
    }
  }

  getState() {
    return {
      gameId: this.gameId, phase: this.phase, countdown: Number(this.countdown.toFixed(1)),
      timeLeft: Number(Math.max(0, this.duration - this.elapsed).toFixed(1)),
      cyclePhase: this.cyclePhase,
      cycleTimer: Number(Math.max(0, this.cycleTimer).toFixed(1)),
      cols: BR_COLS, rows: BR_ROWS,
      tiles: this.tiles,
      chests: this.chests.map((c) => ({ x: Math.round(c.x), y: Math.round(c.y) })),
      players: this.entities.map((e) => ({
        id: e.id, name: e.name, color: e.color, hat: e.hat, team: e.team,
        x: Math.round(e.x), y: Math.round(e.y), vx: Math.round(e.vx), vy: Math.round(e.vy),
        facing: Number(e.facing.toFixed(2)), alive: e.alive,
        score: Math.round(e.score), dashing: e.dashTimer > 0, boost: e.boostTimer > 0,
      })),
    };
  }
}
