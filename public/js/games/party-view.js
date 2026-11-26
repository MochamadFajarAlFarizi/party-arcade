import { sfx } from '../audio.js';

const CHOICE_COLORS = ['btn-pink', 'btn-blue', 'btn-yellow', 'btn-green'];
const LETTERS = ['A', 'B', 'C', 'D'];

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
      chip.style.borderColor = p.color;
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
      }
      chip.textContent = `${p.name}: ${p.score}${status}`;
      this.playersBar.appendChild(chip);
    }

    if (s.uiType === 'quiz') this._renderQuiz(s);
    else if (s.uiType === 'reflex') this._renderReflex(s);
    else if (s.uiType === 'estimate') this._renderEstimate(s);
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
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
