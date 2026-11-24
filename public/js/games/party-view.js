import { sfx } from '../audio.js';

const CHOICE_COLORS = ['btn-pink', 'btn-blue', 'btn-yellow', 'btn-green'];
const LETTERS = ['A', 'B', 'C', 'D'];

/**
 * Interactive Party UI View for Trivia Kilat, Reflex Duel, and Math Panic.
 */
export class PartyView {
  constructor(sendAction) {
    this.sendAction = sendAction;
    this.myId = null;
    this.container = document.getElementById('partyStage');
    this.playersBar = document.getElementById('partyPlayersBar');
    this.lastRoundKey = '';
    this.pickedIdx = null;
  }

  start(myId) {
    this.myId = myId;
    this.lastRoundKey = '';
    this.pickedIdx = null;
    this.container.innerHTML = '';
    this.playersBar.innerHTML = '';
  }

  updateState(s, events = []) {
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
      }
      chip.textContent = `${p.name}: ${p.score}${status}`;
      this.playersBar.appendChild(chip);
    }

    if (s.uiType === 'quiz') {
      this._renderQuiz(s);
    } else if (s.uiType === 'reflex') {
      this._renderReflex(s);
    }
  }

  _renderQuiz(s) {
    const key = `${s.gameId}_${s.round}_${s.subPhase}_${s.correctIdx}`;
    const timerEl = this.container.querySelector('.quiz-timer-val');
    if (key === this.lastRoundKey && timerEl) {
      timerEl.textContent = `⏱ ${Math.ceil(s.timer)}s`;
      return;
    }
    if (!key.startsWith(`${s.gameId}_${s.round}_`) || s.subPhase === 'question' && !this.lastRoundKey.startsWith(`${s.gameId}_${s.round}_`)) {
      this.pickedIdx = null;
    }
    this.lastRoundKey = key;

    const me = (s.players || []).find((p) => p.id === this.myId);
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
        if (locked) return;
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
    const key = `${s.round}_${s.subPhase}_${me?.tapped}_${me?.jumped}_${me?.lastMs}`;
    if (key === this.lastRoundKey) return;
    this.lastRoundKey = key;

    let cls = 'reflex-wait';
    let title = '🛑 TUNGGU HIJAU...';
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
      if (s.phase !== 'playing' || me?.tapped) return;
      this.sendAction({ action: 'tap' });
    });
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
