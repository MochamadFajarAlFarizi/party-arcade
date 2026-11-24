import { sfx } from '../audio.js';

const DRAW_PALETTE = [
  '#1E1B4B', '#FFFFFF', '#EF4444', '#F97316', '#FACC15', '#22C55E',
  '#06B6D4', '#3B82F6', '#A855F7', '#EC4899', '#92400E', '#94A3B8',
];

export class DrawView {
  constructor(sendAction, sendGuess) {
    this.sendAction = sendAction;
    this.sendGuess = sendGuess;

    this.canvas = document.getElementById('drawCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.artistBadge = document.getElementById('drawArtistBadge');
    this.wordDisplay = document.getElementById('drawWordDisplay');
    this.timerBadge = document.getElementById('drawTimerBadge');
    this.wordModal = document.getElementById('drawWordModal');
    this.wordChoicesEl = document.getElementById('drawWordChoices');
    this.toolbar = document.getElementById('drawToolbar');
    this.colorsEl = document.getElementById('drawColors');
    this.playersBar = document.getElementById('drawPlayersBar');
    this.chatLog = document.getElementById('drawChatLog');
    this.guessForm = document.getElementById('drawGuessForm');
    this.guessInput = document.getElementById('drawGuessInput');

    this.myId = null;
    this.canDraw = false;
    this.drawing = false;
    this.color = '#1E1B4B';
    this.size = 6;
    this.eraser = false;
    this.currentPoints = [];
    this.strokes = [];
    this.lastChoicesKey = '';

    this._initToolbar();
    this._bindCanvas();
    this._bindGuess();
  }

  start(myId) {
    this.myId = myId;
    this.strokes = [];
    this.lastChoicesKey = '';
    this.chatLog.innerHTML = '';
    this.clearCanvas();
  }

  _initToolbar() {
    this.colorsEl.innerHTML = '';
    for (const hex of DRAW_PALETTE) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `draw-color-dot${hex === this.color ? ' active' : ''}`;
      btn.style.background = hex;
      btn.addEventListener('click', () => {
        this.color = hex;
        this.eraser = false;
        document.getElementById('btnDrawEraser').classList.remove('active');
        this.colorsEl.querySelectorAll('.draw-color-dot').forEach((d) => d.classList.remove('active'));
        btn.classList.add('active');
        sfx.play('pop');
      });
      this.colorsEl.appendChild(btn);
    }

    this.toolbar.querySelectorAll('[data-size]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.size = Number(btn.dataset.size);
        this.toolbar.querySelectorAll('[data-size]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        sfx.play('pop');
      });
    });

    document.getElementById('btnDrawEraser').addEventListener('click', (e) => {
      this.eraser = !this.eraser;
      e.currentTarget.classList.toggle('active', this.eraser);
    });

    document.getElementById('btnDrawUndo').addEventListener('click', () => {
      if (!this.canDraw) return;
      this.strokes.pop();
      this.redrawAll();
      this.sendAction({ action: 'undo' });
    });

    document.getElementById('btnDrawClear').addEventListener('click', () => {
      if (!this.canDraw) return;
      this.strokes = [];
      this.clearCanvas();
      this.sendAction({ action: 'clear' });
    });
  }

  _getPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return [
      Math.round(((e.clientX - rect.left) / rect.width) * this.canvas.width),
      Math.round(((e.clientY - rect.top) / rect.height) * this.canvas.height),
    ];
  }

  _bindCanvas() {
    this.canvas.addEventListener('pointerdown', (e) => {
      if (!this.canDraw) return;
      e.preventDefault();
      this.canvas.setPointerCapture?.(e.pointerId);
      this.drawing = true;
      const pt = this._getPos(e);
      this.currentPoints = [pt];
      this._drawSegment(pt, pt, this.eraser ? '#FFFFFF' : this.color, this.eraser ? this.size * 2.2 : this.size);
    });

    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.drawing || !this.canDraw) return;
      e.preventDefault();
      const pt = this._getPos(e);
      const prev = this.currentPoints[this.currentPoints.length - 1];
      if (Math.hypot(pt[0] - prev[0], pt[1] - prev[1]) < 3) return;
      this._drawSegment(prev, pt, this.eraser ? '#FFFFFF' : this.color, this.eraser ? this.size * 2.2 : this.size);
      this.currentPoints.push(pt);
    });

    const endStroke = () => {
      if (!this.drawing) return;
      this.drawing = false;
      if (this.currentPoints.length > 0) {
        const stroke = {
          color: this.eraser ? '#FFFFFF' : this.color,
          size: this.eraser ? this.size * 2.2 : this.size,
          points: this.currentPoints,
        };
        this.strokes.push(stroke);
        this.sendAction({ action: 'stroke', stroke });
      }
      this.currentPoints = [];
    };

    this.canvas.addEventListener('pointerup', endStroke);
    this.canvas.addEventListener('pointercancel', endStroke);
  }

  _bindGuess() {
    this.guessForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = this.guessInput.value.trim();
      if (!text) return;
      this.guessInput.value = '';
      this.sendGuess(text);
    });
  }

  clearCanvas() {
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  _drawSegment(a, b, color, size) {
    const ctx = this.ctx;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (a[0] === b[0] && a[1] === b[1]) {
      ctx.beginPath();
      ctx.arc(a[0], a[1], size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
  }

  drawStroke(stroke) {
    if (!stroke || !Array.isArray(stroke.points) || stroke.points.length === 0) return;
    const pts = stroke.norm
      ? stroke.points.map(([nx, ny]) => [nx * this.canvas.width, ny * this.canvas.height])
      : stroke.points;
    if (pts.length === 1) {
      this._drawSegment(pts[0], pts[0], stroke.color, stroke.size);
      return;
    }
    for (let i = 1; i < pts.length; i++) {
      this._drawSegment(pts[i - 1], pts[i], stroke.color, stroke.size);
    }
  }

  addRemoteStroke(stroke) {
    this.strokes.push(stroke);
    this.drawStroke(stroke);
  }

  syncStrokes(strokes) {
    this.strokes = strokes || [];
    this.redrawAll();
  }

  redrawAll() {
    this.clearCanvas();
    for (const s of this.strokes) this.drawStroke(s);
  }

  appendChat(msg) {
    const div = document.createElement('div');
    div.className = `chat-msg ${msg.system ? 'system' : ''} ${msg.tone || ''}`;
    if (msg.system) {
      div.textContent = msg.text;
    } else {
      const b = document.createElement('strong');
      b.style.color = msg.color || '#1E1B4B';
      b.textContent = `${msg.from}: `;
      div.append(b, document.createTextNode(msg.text));
    }
    this.chatLog.appendChild(div);
    this.chatLog.scrollTop = this.chatLog.scrollHeight;
  }

  updateState(s, events = []) {
    for (const ev of events) {
      if (ev.type === 'sfx') sfx.play(ev.sound);
      if (ev.type === 'clearCanvas') {
        this.strokes = [];
        this.clearCanvas();
      }
    }

    const isArtist = s.artistId === this.myId;
    this.canDraw = isArtist && s.subPhase === 'drawing';
    this.artistBadge.textContent = `✏️ Pelukis: ${s.artistName} (${s.turn}/${s.totalTurns})`;
    this.timerBadge.textContent = `⏱ ${Math.ceil(s.timer)}s`;
    this.wordDisplay.textContent = s.maskedWord || (s.subPhase === 'choosing' ? 'Memilih kata...' : '...');
    this.toolbar.classList.toggle('hidden', !this.canDraw);
    this.guessInput.disabled = isArtist || s.subPhase !== 'drawing';
    this.guessInput.placeholder = isArtist ? 'Kamu sedang menggambar!' : (s.hintText ? `Petunjuk: ${s.hintText}` : 'Ketik tebakanmu di sini...');

    // Word choices modal for artist
    if (s.wordChoices && s.subPhase === 'choosing') {
      const key = s.wordChoices.map((w) => w.word).join('|');
      if (key !== this.lastChoicesKey) {
        this.lastChoicesKey = key;
        this.wordChoicesEl.innerHTML = '';
        for (const c of s.wordChoices) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'btn-candy btn-yellow';
          btn.textContent = `${c.word.toUpperCase()} (${c.category})`;
          btn.addEventListener('click', () => {
            sfx.play('pop');
            this.sendAction({ action: 'chooseWord', word: c.word });
          });
          this.wordChoicesEl.appendChild(btn);
        }
      }
      this.wordModal.classList.remove('hidden');
    } else {
      this.wordModal.classList.add('hidden');
    }

    // Scoreboard chips
    this.playersBar.innerHTML = '';
    for (const p of s.players || []) {
      const chip = document.createElement('span');
      chip.className = `draw-player-chip${p.guessed ? ' guessed' : ''}`;
      chip.style.borderColor = p.color;
      chip.textContent = `${p.id === s.artistId ? '🎨 ' : p.guessed ? '✅ ' : ''}${p.name}: ${p.score}`;
      this.playersBar.appendChild(chip);
    }
  }
}
