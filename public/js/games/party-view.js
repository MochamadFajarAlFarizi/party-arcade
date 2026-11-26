import { sfx } from '../audio.js';

const CHOICE_COLORS = ['btn-pink', 'btn-blue', 'btn-yellow', 'btn-green'];
const LETTERS = ['A', 'B', 'C', 'D'];
const TEAM_ICONS = ['🔴', '🔵', '🟢', '🟡'];
const TEAM_COLORS = ['#EF4444', '#3B82F6', '#22C55E', '#EAB308'];

/**
 * Interactive Party UI View for Trivia Kilat, Reflex Duel, Math Panic, and Tebak Angka Terdekat.
 */
export class PartyView {
  constructor(sendAction) {
    this.sendAction = sendAction;
    this.myId = null;
    this.container = document.getElementById('partyStage');
    this.playersBar = document.getElementById('partyPlayersBar');
    this.lastRoundKey = '';
    this.pickedIdx = null;
    this.latestState = null;
  }

  start(myId) {
    this.myId = myId;
    this.lastRoundKey = '';
    this.pickedIdx = null;
    this.latestState = null;
    this.container.innerHTML = '';
    this.playersBar.innerHTML = '';
  }

  updateState(s, events = []) {
    this.latestState = s;
    for (const ev of events) {
      if (ev.type === 'sfx') sfx.play(ev.sound);
    }

    // Render live player score chips
    this.playersBar.innerHTML = '';
    for (const p of s.players || []) {
      const chip = document.createElement('div');
      chip.className = 'party-player-chip';
      chip.style.borderColor = s.teamMode ? (TEAM_COLORS[p.team ?? 0] || p.color) : p.color;
      const teamPrefix = s.teamMode ? `${TEAM_ICONS[p.team ?? 0] || ''} ` : '';
      let status = '';
      if (s.uiType === 'quiz') {
        if (p.lastCorrect === true) status = ' ✅';
        else if (p.lastCorrect === false) status = ' ❌';
        else if (p.answered) status = ' 🔒';
      } else if (s.uiType === 'reflex') {
        if (p.jumped) status = ' 🚨 CURANG!';
        else if (p.lastMs) status = ` ⚡ ${p.lastMs}ms`;
      } else if (s.uiType === 'estimate') {
        if (p.guess !== null && p.guess !== undefined) {
          status = p.diff === 0 ? ` 🎯 ${p.guess} (TEPAT!)` : ` • ${p.guess} (±${p.diff})`;
        } else if (p.answered) {
          status = ' 🔒';
        }
      } else if (s.uiType === 'split-steal') {
        if (p.choice === 'split') status = ` 🤝 (${p.lastDelta >= 0 ? '+' : ''}${p.lastDelta})`;
        else if (p.choice === 'steal') status = ` 🔪 (${p.lastDelta >= 0 ? '+' : ''}${p.lastDelta})`;
        else if (p.answered) status = ' 🔒';
      } else if (s.uiType === 'blame-vote') {
        if (s.subPhase === 'reveal') status = ` (${p.lastDelta >= 0 ? '+' : ''}${p.lastDelta})`;
        else if (p.answered) status = ' 🔒';
      } else if (s.uiType === 'greed-heist') {
        if (!p.inside) status = ' 🏃 AMAN';
        else status = ` 💰+${p.bag}${p.answered ? ' 🔒' : ''}`;
      }
      chip.textContent = `${teamPrefix}${p.name}: ${p.score}${status}`;
      this.playersBar.appendChild(chip);
    }

    if (s.uiType === 'quiz') this._renderQuiz(s);
    else if (s.uiType === 'reflex') this._renderReflex(s);
    else if (s.uiType === 'estimate') this._renderEstimate(s);
    else if (s.uiType === 'split-steal') this._renderSplitSteal(s);
    else if (s.uiType === 'blame-vote') this._renderBlameVote(s);
    else if (s.uiType === 'greed-heist') this._renderGreedHeist(s);
  }

  _renderQuiz(s) {
    const me = (s.players || []).find((p) => p.id === this.myId);
    // Include s.phase & me.answered in key so Q1 unlocks the instant countdown -> playing!
    const key = `${s.gameId}_${s.phase}_${s.round}_${s.subPhase}_${s.correctIdx}_${!!me?.answered}`;
    const timerEl = this.container.querySelector('.quiz-timer-val');
    if (key === this.lastRoundKey && timerEl) {
      timerEl.textContent = `⏱ ${Math.ceil(s.timer)}s`;
      return;
    }

    if (s.subPhase === 'question' && !this.lastRoundKey.includes(`_${s.round}_question_`)) {
      this.pickedIdx = null;
    }
    this.lastRoundKey = key;

    const locked = !!(me?.answered || s.subPhase !== 'question' || s.phase !== 'playing');

    this.container.innerHTML = `
      <div class="quiz-box cartoon-card">
        <div class="quiz-meta">
          <span class="hud-chip">Soal ${s.round}/${s.totalRounds}</span>
          <span class="hud-chip hud-timer quiz-timer-val">⏱ ${Math.ceil(s.timer)}s</span>
        </div>
        <h2 class="quiz-prompt">${escapeHtml(s.prompt)}</h2>
        <div class="quiz-options"></div>
      </div>
    `;

    const optsBox = this.container.querySelector('.quiz-options');
    (s.options || []).forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      let extra = '';
      if (s.subPhase === 'reveal') {
        if (idx === s.correctIdx) extra = ' opt-correct';
        else if (idx === this.pickedIdx) extra = ' opt-wrong';
        else extra = ' opt-dim';
      } else if (idx === this.pickedIdx) {
        extra = ' opt-picked';
      }
      btn.className = `btn-candy ${CHOICE_COLORS[idx % 4]} quiz-opt-btn${extra}`;
      btn.disabled = locked;
      btn.innerHTML = `<span class="opt-letter">${LETTERS[idx]}</span><span>${escapeHtml(opt)}</span>`;
      btn.addEventListener('click', () => {
        const cur = this.latestState;
        const curMe = cur?.players?.find((p) => p.id === this.myId);
        if (!cur || cur.phase !== 'playing' || cur.subPhase !== 'question' || curMe?.answered) return;
        this.pickedIdx = idx;
        sfx.play('pop');
        this.sendAction({ action: 'choice', index: idx });
        this.lastRoundKey = '';
      });
      optsBox.appendChild(btn);
    });
  }

  _renderReflex(s) {
    const me = (s.players || []).find((p) => p.id === this.myId);
    const key = `${s.phase}_${s.round}_${s.subPhase}_${me?.tapped}_${me?.jumped}_${me?.lastMs}`;
    if (key === this.lastRoundKey) return;
    this.lastRoundKey = key;

    let cls = 'reflex-wait';
    let title = s.phase === 'countdown' ? '⏳ SIAP-SIAP...' : '🛑 TUNGGU HIJAU...';
    let sub = 'JANGAN TAP DULU! Kena penalti -35 kalau curi start!';

    if (s.subPhase === 'bait') {
      cls = 'reflex-bait';
      title = '⚠️ JANGAN TAP! JEBAKAN!!';
      sub = 'Tahan jarimu!! Ini warna palsu!';
    } else if (s.subPhase === 'go') {
      cls = 'reflex-go';
      title = me?.tapped ? (me.jumped ? '🚨 KAMU CURI START!' : `⚡ ${me.lastMs} ms!`) : '🔥 TAP SEKARANG!! 🔥';
      sub = me?.tapped ? 'Menunggu pemain lain...' : 'KLIK / TAP SECEPAT KILAT!';
    } else if (s.subPhase === 'result') {
      cls = 'reflex-result';
      title = me?.jumped ? '🚨 KENA JEBAKAN (-35)' : me?.lastMs ? `✅ WAKTU KAMU: ${me.lastMs} ms!` : '🐢 TELAT!';
      sub = 'Siap-siap ronde berikutnya...';
    }

    this.container.innerHTML = `
      <button type="button" class="reflex-pad ${cls}" id="btnReflexPad">
        <span class="reflex-round">RONDE ${s.round} / ${s.totalRounds}</span>
        <div class="reflex-title">${title}</div>
        <div class="reflex-sub">${sub}</div>
      </button>
    `;

    const pad = this.container.querySelector('#btnReflexPad');
    pad.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const cur = this.latestState;
      const curMe = cur?.players?.find((p) => p.id === this.myId);
      if (!cur || cur.phase !== 'playing' || curMe?.tapped) return;
      this.sendAction({ action: 'tap' });
    });
  }

  _renderEstimate(s) {
    const me = (s.players || []).find((p) => p.id === this.myId);
    const key = `est_${s.phase}_${s.round}_${s.subPhase}_${!!me?.answered}_${s.answer}`;
    const timerEl = this.container.querySelector('.quiz-timer-val');
    if (key === this.lastRoundKey && timerEl) {
      timerEl.textContent = `⏱ ${Math.ceil(s.timer)}s`;
      return;
    }
    this.lastRoundKey = key;

    const locked = !!(me?.answered || s.subPhase !== 'question' || s.phase !== 'playing');

    let bodyHtml = '';
    if (s.subPhase === 'reveal') {
      const sorted = [...(s.players || [])]
        .filter((p) => p.guess !== null && p.guess !== undefined)
        .sort((a, b) => (a.diff ?? 999999) - (b.diff ?? 999999));
      const rows = sorted.map((p, idx) => `
        <div class="podium-row" style="padding:6px 12px">
          <span>${idx === 0 ? '👑 ' : ''}${escapeHtml(p.name)}</span>
          <span>Tebakan: <b>${p.guess}</b> <small style="color:${p.diff === 0 ? '#16A34A' : '#64748B'}">(${p.diff === 0 ? 'TEPAT! +250' : `selisih ${p.diff}`})</small></span>
        </div>
      `).join('');
      bodyHtml = `
        <div style="background:#FEF08A;border:3px solid #1E1B4B;border-radius:16px;padding:10px;font-family:var(--font-display);font-size:24px;font-weight:700">
          🎯 JAWABAN ASLI: ${s.answer} ${escapeHtml(s.unit || '')}
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;max-height:24dvh;overflow-y:auto">${rows || '<p class="muted">Tidak ada yang menebak!</p>'}</div>
      `;
    } else if (me?.answered) {
      bodyHtml = `<div class="hud-chip" style="background:#86EFAC;padding:12px 18px;font-size:17px">🔒 Tebakanmu terkunci! Menunggu pemain lain...</div>`;
    } else {
      bodyHtml = `
        <form id="estimateForm" style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:6px">
          <input id="estimateInput" class="cartoon-input" style="max-width:240px;font-size:24px;text-align:center" type="number" inputmode="numeric" placeholder="Ketik angka..." ${locked ? 'disabled' : ''} required />
          <button type="submit" class="btn-candy btn-green" ${locked ? 'disabled' : ''}>🎯 KUNCI TEBAKAN!</button>
        </form>
        <p class="muted" style="margin:4px 0 0">Satuan: <b>${escapeHtml(s.unit || '')}</b> • Paling mendekati jawaban asli menang!</p>
      `;
    }

    this.container.innerHTML = `
      <div class="quiz-box cartoon-card">
        <div class="quiz-meta">
          <span class="hud-chip">Tebak Angka ${s.round}/${s.totalRounds}</span>
          <span class="hud-chip hud-timer quiz-timer-val">⏱ ${Math.ceil(s.timer)}s</span>
        </div>
        <h2 class="quiz-prompt">${escapeHtml(s.prompt)}</h2>
        ${bodyHtml}
      </div>
    `;

    const form = this.container.querySelector('#estimateForm');
    const inp = this.container.querySelector('#estimateInput');
    if (inp && !locked) setTimeout(() => inp.focus(), 40);
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = Number(inp?.value);
      if (!Number.isFinite(val)) return;
      sfx.play('pop');
      this.sendAction({ action: 'estimate', value: val });
      this.lastRoundKey = '';
    });
  }

  // ===== 25. BAGI ATAU KHIANATI =====
  _renderSplitSteal(s) {
    const me = (s.players || []).find((p) => p.id === this.myId);
    const key = `ss_${s.phase}_${s.round}_${s.subPhase}_${!!me?.answered}_${me?.myChoice}`;
    const timerEl = this.container.querySelector('.quiz-timer-val');
    if (key === this.lastRoundKey && timerEl) {
      timerEl.textContent = `⏱ ${Math.ceil(s.timer)}s`;
      return;
    }
    this.lastRoundKey = key;

    const locked = !!(me?.answered || s.subPhase !== 'decide' || s.phase !== 'playing');
    const mult = s.isJackpot ? 2 : 1;
    const partnersHtml = (s.myPartners || []).length
      ? s.myPartners.map((pt) => `<span class="partner-badge" style="border-color:${pt.color}">${s.teamMode ? (TEAM_ICONS[pt.team ?? 0] + ' ') : ''}${escapeHtml(pt.name)}</span>`).join(' & ')
      : '<span class="partner-badge">Solo Ronde Ini</span>';

    let bodyHtml = '';
    if (s.subPhase === 'reveal') {
      const cards = (s.results || []).map((res) => {
        const pills = res.members.map((m) => `
          <span class="reveal-member ${m.choice === 'steal' ? 'is-steal' : 'is-split'}">
            ${escapeHtml(m.name)}: ${m.choice === 'steal' ? '🔪 KHIANAT' : '🤝 BAGI'} (${m.delta >= 0 ? '+' : ''}${m.delta})
          </span>
        `).join('');
        return `
          <div class="betray-result-card tone-${res.tone}">
            <div class="betray-headline">${escapeHtml(res.headline)}</div>
            <div class="betray-members">${pills}</div>
          </div>
        `;
      }).join('');
      bodyHtml = `<div class="betray-results-list">${cards}</div>`;
    } else if (me?.answered) {
      const txt = me.myChoice === 'steal' ? '🔪 Kamu pilih KHIANATI!' : '🤝 Kamu pilih BAGI RATA!';
      bodyHtml = `<div class="hud-chip" style="background:#FEF08A;padding:14px 20px;font-size:18px">🔒 ${txt} Menunggu pemain lain...</div>`;
    } else {
      bodyHtml = `
        <div class="partner-callout">Pasanganmu Ronde Ini: ${partnersHtml}</div>
        <p class="muted" style="margin:0">Negosiasi di Discord! Sama-sama BAGI <b>+${120 * mult}</b> • Kamu KHIANAT & dia BAGI <b>+${260 * mult}</b> • Sama-sama KHIANAT <b>-${60 * mult}</b>!</p>
        <div class="perpecahan-actions">
          <button type="button" class="btn-candy btn-green btn-lg betray-choice-btn" data-ss="split" ${locked ? 'disabled' : ''}>
            🤝 BAGI RATA<br><small>+${120 * mult} Damai</small>
          </button>
          <button type="button" class="btn-candy btn-pink btn-lg betray-choice-btn" data-ss="steal" ${locked ? 'disabled' : ''}>
            🔪 KHIANATI!<br><small>+${260 * mult} / -${60 * mult}</small>
          </button>
        </div>
      `;
    }

    this.container.innerHTML = `
      <div class="quiz-box cartoon-card">
        <div class="quiz-meta">
          <span class="hud-chip">💸 Ronde ${s.round}/${s.totalRounds}${s.isJackpot ? ' 🔥 2x JACKPOT!' : ''}</span>
          <span class="hud-chip hud-timer quiz-timer-val">⏱ ${Math.ceil(s.timer)}s</span>
        </div>
        <h2 class="quiz-prompt">${s.subPhase === 'reveal' ? '😈 HASIL PENGKHIANATAN!' : 'Percaya Teman atau Tikam dari Belakang?'}</h2>
        ${bodyHtml}
      </div>
    `;

    this.container.querySelectorAll('[data-ss]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cur = this.latestState;
        if (!cur || cur.phase !== 'playing' || cur.subPhase !== 'decide') return;
        sfx.play('pop');
        this.sendAction({ action: 'choose', choice: btn.dataset.ss });
        this.lastRoundKey = '';
      });
    });
  }

  // ===== 26. FITNAH & TUMBAL =====
  _renderBlameVote(s) {
    const me = (s.players || []).find((p) => p.id === this.myId);
    const key = `bv_${s.phase}_${s.round}_${s.subPhase}_${!!me?.answered}_${s.myVote}`;
    const timerEl = this.container.querySelector('.quiz-timer-val');
    if (key === this.lastRoundKey && timerEl) {
      timerEl.textContent = `⏱ ${Math.ceil(s.timer)}s`;
      return;
    }
    this.lastRoundKey = key;

    const locked = !!(me?.answered || s.subPhase !== 'vote' || s.phase !== 'playing');
    let bodyHtml = '';

    if (s.subPhase === 'reveal') {
      const headHtml = (s.headlines || []).map((h) => `
        <div class="betray-result-card tone-${h.tone === 'reflect' ? 'peace' : h.tone === 'boom' ? 'betray' : 'safe'}">
          <div class="betray-headline">${escapeHtml(h.text)}</div>
        </div>
      `).join('');
      const detailHtml = (s.voteDetails || []).map((v) => `
        <span class="reveal-member ${v.action === 'shield' ? 'is-split' : 'is-steal'}">
          ${escapeHtml(v.fromName)} ${v.action === 'shield' ? '🛡️' : '👉'} ${escapeHtml(v.targetName)} (${v.delta >= 0 ? '+' : ''}${v.delta})
        </span>
      `).join('');
      bodyHtml = `
        <div class="betray-results-list">${headHtml}</div>
        <div class="betray-members" style="justify-content:center">${detailHtml}</div>
      `;
    } else if (me?.answered) {
      bodyHtml = `<div class="hud-chip" style="background:#C4B5FD;padding:14px 20px;font-size:18px">🔒 Pilihan rahasiamu terkunci! Menunggu pemain lain...</div>`;
    } else {
      const targets = (s.players || []).filter((p) => p.id !== this.myId);
      const targetBtns = targets.map((t) => `
        <button type="button" class="btn-candy btn-pink blame-target-btn" data-vote="${t.id}" ${locked ? 'disabled' : ''}>
          🔪 ${s.teamMode ? (TEAM_ICONS[t.team ?? 0] + ' ') : ''}${escapeHtml(t.name)} <small>(${t.score} pts)</small>
        </button>
      `).join('');
      const shieldDisabled = locked || (s.myShieldsLeft || 0) <= 0;
      bodyHtml = `
        <p class="muted" style="margin:0">${escapeHtml(s.theme?.sub || '')}</p>
        <div class="blame-grid">${targetBtns}</div>
        <button type="button" class="btn-candy btn-blue" data-vote="__SHIELD__" ${shieldDisabled ? 'disabled' : ''}>
          🛡️ PASANG PERISAI PANTUL (Sisa ${s.myShieldsLeft || 0}x) — Pantulkan Semua Serangan!
        </button>
      `;
    }

    this.container.innerHTML = `
      <div class="quiz-box cartoon-card">
        <div class="quiz-meta">
          <span class="hud-chip">🔪 Ronde ${s.round}/${s.totalRounds}${s.theme?.mult > 1 ? ' 🔥 2x!' : ''}</span>
          <span class="hud-chip hud-timer quiz-timer-val">⏱ ${Math.ceil(s.timer)}s</span>
        </div>
        <h2 class="quiz-prompt">${escapeHtml(s.theme?.title || 'FITNAH & TUMBAL')}</h2>
        ${bodyHtml}
      </div>
    `;

    this.container.querySelectorAll('[data-vote]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cur = this.latestState;
        if (!cur || cur.phase !== 'playing' || cur.subPhase !== 'vote') return;
        sfx.play('pop');
        this.sendAction({ action: 'vote', targetId: btn.dataset.vote });
        this.lastRoundKey = '';
      });
    });
  }

  // ===== 27. RAMPOK BRANKAS =====
  _renderGreedHeist(s) {
    const me = (s.players || []).find((p) => p.id === this.myId);
    const key = `gh_${s.phase}_${s.round}_${s.step}_${s.subPhase}_${s.myInside}_${!!me?.answered}_${s.myChoice}`;
    const timerEl = this.container.querySelector('.quiz-timer-val');
    if (key === this.lastRoundKey && timerEl) {
      timerEl.textContent = `⏱ ${Math.ceil(s.timer)}s`;
      return;
    }
    this.lastRoundKey = key;

    const locked = !!(me?.answered || !s.myInside || s.subPhase !== 'decide' || s.phase !== 'playing');
    const riskColor = s.baseRisk >= 60 ? '#EF4444' : s.baseRisk >= 35 ? '#F97316' : '#22C55E';
    let bodyHtml = '';

    if (s.subPhase === 'reveal' && s.summary) {
      const banner = s.summary.raided
        ? `<div class="betray-result-card tone-betray"><div class="betray-headline">🚔 POLISI GREBEK BRANKAS! (Risiko ${s.summary.effectiveRisk}%)</div></div>`
        : `<div class="betray-result-card tone-peace"><div class="betray-headline">💎 BRANKAS AMAN! (Risiko ${s.summary.effectiveRisk}%)</div></div>`;
      const lines = (s.summary.lines || []).map((ln) => `
        <div class="podium-row" style="padding:6px 12px;font-size:13.5px">${escapeHtml(ln.text)}</div>
      `).join('');
      bodyHtml = `${banner}<div class="betray-results-list">${lines}</div>`;
    } else if (!s.myInside) {
      bodyHtml = `<div class="hud-chip" style="background:#86EFAC;padding:14px 20px;font-size:17px">😎 Kamu sudah kabur aman! Menonton temanmu yang masih serakah...</div>`;
    } else if (me?.answered) {
      bodyHtml = `<div class="hud-chip" style="background:#FEF08A;padding:14px 20px;font-size:17px">🔒 Keputusan terkunci! Menunggu perampok lain...</div>`;
    } else {
      const sabDisabled = locked || (s.mySabotageLeft || 0) <= 0;
      bodyHtml = `
        <div class="heist-stats-bar">
          <div class="heist-stat">💰 Kantongmu: <b>${s.myBag} pts</b></div>
          <div class="heist-stat">💎 Tambahan Lapis Ini: <b>+${s.nextLoot}</b></div>
          <div class="heist-stat" style="background:${riskColor};color:#fff">🚨 Risiko Polisi: <b>${s.baseRisk}%</b></div>
        </div>
        <div class="perpecahan-actions">
          <button type="button" class="btn-candy btn-yellow betray-choice-btn" data-heist="stay" ${locked ? 'disabled' : ''}>
            💎 LANJUT RAMPOK<br><small>Kejar +${s.nextLoot} pts</small>
          </button>
          <button type="button" class="btn-candy btn-green betray-choice-btn" data-heist="escape" ${locked ? 'disabled' : ''}>
            🏃 KABUR AMAN<br><small>Simpan ${s.myBag} pts</small>
          </button>
          <button type="button" class="btn-candy btn-pink betray-choice-btn" data-heist="sabotage" ${sabDisabled ? 'disabled' : ''}>
            😈 TEKAN ALARM! (${s.mySabotageLeft}x)<br><small>Kabur + Risiko +35%!</small>
          </button>
        </div>
      `;
    }

    this.container.innerHTML = `
      <div class="quiz-box cartoon-card">
        <div class="quiz-meta">
          <span class="hud-chip">🏦 Brankas ${s.round}/${s.totalRounds} • Lapis ${s.step}/${s.maxSteps}</span>
          <span class="hud-chip hud-timer quiz-timer-val">⏱ ${Math.ceil(s.timer)}s</span>
        </div>
        <h2 class="quiz-prompt">${s.subPhase === 'reveal' ? '🚨 HASIL PENJARAHAN!' : 'Serakah Lanjut, Kabur, atau Tekan Alarm?'}</h2>
        ${bodyHtml}
      </div>
    `;

    this.container.querySelectorAll('[data-heist]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cur = this.latestState;
        if (!cur || cur.phase !== 'playing' || cur.subPhase !== 'decide') return;
        sfx.play('pop');
        this.sendAction({ action: 'heist', choice: btn.dataset.heist });
        this.lastRoundKey = '';
      });
    });
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
