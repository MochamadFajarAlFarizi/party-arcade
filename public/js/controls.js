/**
 * Unified Cross-Platform Controls:
 * - Desktop: WASD / Arrow keys + Space/Shift Dash
 * - Mobile / Touch: Floating Virtual Thumbstick + Tactile Action Button
 */
export class GameControls {
  constructor(onInput) {
    this.onInput = onInput;
    this.active = false;
    this.keys = new Set();
    this.joy = { active: false, pointerId: null, originX: 0, originY: 0, dx: 0, dy: 0 };
    this.pendingAction = false;
    this.lastSent = { x: 0, y: 0, at: 0 };

    this.zoneEl = document.getElementById('joystickZone');
    this.baseEl = document.getElementById('joystickBase');
    this.knobEl = document.getElementById('joystickKnob');
    this.actionBtn = document.getElementById('btnTouchAction');

    this._bindKeyboard();
    this._bindTouch();
    this._loop = setInterval(() => this._emit(), 33);
  }

  setActive(flag) {
    this.active = flag;
    if (!flag) {
      this.keys.clear();
      this.joy.active = false;
      this.joy.dx = 0;
      this.joy.dy = 0;
      this.baseEl?.classList.add('hidden');
    }
  }

  _bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (!this.active) return;
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'shift'].includes(k)) {
        e.preventDefault();
      }
      if (k === ' ' || k === 'shift') {
        this.pendingAction = true;
        this._emit(true);
      } else {
        this.keys.add(k);
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
  }

  _bindTouch() {
    const MAX_R = 44;

    this.zoneEl?.addEventListener('pointerdown', (e) => {
      if (!this.active || this.joy.active) return;
      e.preventDefault();
      this.zoneEl.setPointerCapture?.(e.pointerId);
      const rect = this.zoneEl.getBoundingClientRect();
      this.joy.active = true;
      this.joy.pointerId = e.pointerId;
      this.joy.originX = e.clientX - rect.left;
      this.joy.originY = e.clientY - rect.top;
      this.joy.dx = 0;
      this.joy.dy = 0;
      this.baseEl.style.left = `${this.joy.originX}px`;
      this.baseEl.style.top = `${this.joy.originY}px`;
      this.knobEl.style.transform = 'translate(0px, 0px)';
      this.baseEl.classList.remove('hidden');
    });

    this.zoneEl?.addEventListener('pointermove', (e) => {
      if (!this.joy.active || e.pointerId !== this.joy.pointerId) return;
      e.preventDefault();
      const rect = this.zoneEl.getBoundingClientRect();
      const cx = e.clientX - rect.left - this.joy.originX;
      const cy = e.clientY - rect.top - this.joy.originY;
      const len = Math.hypot(cx, cy);
      const clamped = Math.min(len, MAX_R);
      const ang = Math.atan2(cy, cx);
      const kx = Math.cos(ang) * clamped;
      const ky = Math.sin(ang) * clamped;
      this.knobEl.style.transform = `translate(${kx}px, ${ky}px)`;
      this.joy.dx = len > 6 ? kx / MAX_R : 0;
      this.joy.dy = len > 6 ? ky / MAX_R : 0;
    });

    const releaseJoy = (e) => {
      if (!this.joy.active || e.pointerId !== this.joy.pointerId) return;
      this.joy.active = false;
      this.joy.pointerId = null;
      this.joy.dx = 0;
      this.joy.dy = 0;
      this.baseEl.classList.add('hidden');
      this._emit(true);
    };
    this.zoneEl?.addEventListener('pointerup', releaseJoy);
    this.zoneEl?.addEventListener('pointercancel', releaseJoy);

    this.actionBtn?.addEventListener('pointerdown', (e) => {
      if (!this.active) return;
      e.preventDefault();
      this.actionBtn.classList.add('pressed');
      this.pendingAction = true;
      this._emit(true);
    });
    const releaseBtn = () => this.actionBtn?.classList.remove('pressed');
    this.actionBtn?.addEventListener('pointerup', releaseBtn);
    this.actionBtn?.addEventListener('pointercancel', releaseBtn);
  }

  _emit(force = false) {
    if (!this.active) return;
    let x = 0;
    let y = 0;

    if (this.joy.active) {
      x = this.joy.dx;
      y = this.joy.dy;
    } else {
      if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
      if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
      if (this.keys.has('w') || this.keys.has('arrowup')) y -= 1;
      if (this.keys.has('s') || this.keys.has('arrowdown')) y += 1;
      const len = Math.hypot(x, y);
      if (len > 1) { x /= len; y /= len; }
    }

    const action = this.pendingAction;
    this.pendingAction = false;

    const now = performance.now();
    const changed = Math.abs(x - this.lastSent.x) > 0.04 || Math.abs(y - this.lastSent.y) > 0.04;
    if (force || action || changed || (now - this.lastSent.at > 150 && (x !== 0 || y !== 0))) {
      this.lastSent = { x, y, at: now };
      this.onInput({ x: Number(x.toFixed(2)), y: Number(y.toFixed(2)), action });
    }
  }
}
