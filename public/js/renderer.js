export const INK = '#1E1B4B';

export const AVATAR_COLORS = [
  '#FF5E7E', '#38BDF8', '#FFD166', '#22C55E', '#A855F7', '#FF9F1C',
  '#EC4899', '#14B8A6', '#84CC16', '#6366F1', '#F43F5E', '#FB923C',
];

export const AVATAR_HATS = [
  { id: 'none', label: 'Polos', emoji: '🙂' },
  { id: 'headset', label: 'Discord', emoji: '🎧' },
  { id: 'crown', label: 'Mahkota', emoji: '👑' },
  { id: 'cat', label: 'Kucing', emoji: '🐱' },
  { id: 'cap', label: 'Topi', emoji: '🧢' },
  { id: 'shades', label: 'Kece', emoji: '🕶️' },
  { id: 'sprout', label: 'Tunas', emoji: '🌱' },
  { id: 'halo', label: 'Halo', emoji: '😇' },
  { id: 'bow', label: 'Pita', emoji: '🎀' },
  { id: 'cowboy', label: 'Koboi', emoji: '🤠' },
];

export function hatEmoji(hatId) {
  return AVATAR_HATS.find((h) => h.id === hatId)?.emoji || '🙂';
}

export function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/**
 * Draw a Fall Guys / Mario Party glossy cartoon bean character.
 */
export function drawCartoonBean(ctx, {
  x, y, r = 22, color = '#FF5E7E', hat = 'none', facing = 0, speed = 0,
  time = 0, mood = 'happy', name = '', isMe = false, scale = 1,
  shield = false, turbo = false, holdingBomb = false, stunned = false,
}) {
  ctx.save();
  ctx.translate(x, y);

  // Squash & stretch bounce while moving
  const moving = speed > 18;
  const bob = moving ? Math.abs(Math.sin(time * 14)) * 4.5 : Math.sin(time * 3.5) * 1.6;
  const sx = scale * (moving ? 1 + Math.sin(time * 14) * 0.06 : 1);
  const sy = scale * (moving ? 1 - Math.sin(time * 14) * 0.06 : 1);

  // Ground shadow
  ctx.fillStyle = 'rgba(30, 27, 75, 0.22)';
  ctx.beginPath();
  ctx.ellipse(0, r * scale * 0.88, r * scale * 0.92, r * scale * 0.36, 0, 0, Math.PI * 2);
  ctx.fill();

  // "You" highlight ring
  if (isMe) {
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3.5;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.arc(0, 2, r * scale + 9, time * 2, time * 2 + Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Turbo aura
  if (turbo) {
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, -bob, r * scale + 5 + Math.sin(time * 18) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.translate(0, -bob);
  ctx.scale(sx, sy);

  // Waddling cartoon feet
  const footSwing = moving ? Math.sin(time * 16) * 5 : 0;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(-r * 0.38, r * 0.78 + footSwing * 0.5, r * 0.24, r * 0.16, 0, 0, Math.PI * 2);
  ctx.ellipse(r * 0.38, r * 0.78 - footSwing * 0.5, r * 0.24, r * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Main glossy spherical jelly-bean body
  ctx.fillStyle = color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Inner soft rim shade at bottom
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r - 1.5, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = 'rgba(30, 27, 75, 0.16)';
  ctx.beginPath();
  ctx.arc(r * 0.18, r * 0.36, r * 0.95, 0, Math.PI * 2);
  ctx.fill();

  // Glossy vinyl crescent highlight on top-left
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.34, -r * 0.38, r * 0.36, r * 0.2, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Crisp outer cartoon stroke
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  // Expressive eyes looking toward facing direction
  const lookX = Math.cos(facing) * (r * 0.2);
  const lookY = Math.sin(facing) * (r * 0.14);
  const blink = !stunned && Math.sin(time * 2.1 + r) > 0.96;

  // Cute blush cheeks
  ctx.fillStyle = 'rgba(255, 110, 150, 0.38)';
  ctx.beginPath();
  ctx.ellipse(lookX - r * 0.42, lookY + r * 0.16, r * 0.16, r * 0.1, 0, 0, Math.PI * 2);
  ctx.ellipse(lookX + r * 0.42, lookY + r * 0.16, r * 0.16, r * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  if (stunned) {
    // Dizzy X eyes + spinning stars
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.6;
    for (const ex of [-r * 0.26, r * 0.26]) {
      const cx = lookX + ex;
      const cy = lookY - r * 0.06;
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy - 4); ctx.lineTo(cx + 4, cy + 4);
      ctx.moveTo(cx + 4, cy - 4); ctx.lineTo(cx - 4, cy + 4);
      ctx.stroke();
    }
    for (let s = 0; s < 3; s++) {
      const a = time * 6 + (s * Math.PI * 2) / 3;
      ctx.fillStyle = '#FFD166';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('★', Math.cos(a) * (r * 0.75) - 5, -r - 4 + Math.sin(a) * 5);
    }
  } else if (blink) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(lookX - r * 0.36, lookY - r * 0.05);
    ctx.lineTo(lookX - r * 0.14, lookY - r * 0.05);
    ctx.moveTo(lookX + r * 0.14, lookY - r * 0.05);
    ctx.lineTo(lookX + r * 0.36, lookY - r * 0.05);
    ctx.stroke();
  } else {
    const eyeR = mood === 'panic' || holdingBomb ? r * 0.2 : r * 0.16;
    for (const ex of [-r * 0.26, r * 0.26]) {
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(lookX + ex, lookY - r * 0.06, eyeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(lookX + ex + Math.cos(facing) * 1.8, lookY - r * 0.06 + Math.sin(facing) * 1.4, eyeR * 0.52, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(lookX + ex - 1.2, lookY - r * 0.12, eyeR * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Mouth expression
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  if (mood === 'panic' || holdingBomb) {
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.ellipse(lookX, lookY + r * 0.26, r * 0.15, r * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(lookX, lookY + r * 0.16, r * 0.16, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }

  // Hat / Accessory
  drawHat(ctx, hat, r, lookX, lookY);

  // Shield bubble
  if (shield) {
    ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r + 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();

  // Crisp pill nametag below character
  if (name) {
    ctx.save();
    ctx.font = '800 12px Nunito, sans-serif';
    const tw = ctx.measureText(name).width + 12;
    const ty = y + r * scale + 12;
    ctx.fillStyle = isMe ? '#FFD166' : 'rgba(255,255,255,0.92)';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    roundRectPath(ctx, x - tw / 2, ty - 9, tw, 18, 9);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, x, ty + 0.5);
    ctx.restore();
  }
}

function drawHat(ctx, hat, r, lookX, lookY) {
  if (!hat || hat === 'none') return;
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6;
  ctx.lineJoin = 'round';

  if (hat === 'crown') {
    ctx.fillStyle = '#FFD166';
    ctx.beginPath();
    ctx.moveTo(-r * 0.48, -r * 0.78);
    ctx.lineTo(-r * 0.56, -r * 1.38);
    ctx.lineTo(-r * 0.18, -r * 1.06);
    ctx.lineTo(0, -r * 1.48);
    ctx.lineTo(r * 0.18, -r * 1.06);
    ctx.lineTo(r * 0.56, -r * 1.38);
    ctx.lineTo(r * 0.48, -r * 0.78);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (hat === 'headset') {
    // Discord gamer headset!
    ctx.strokeStyle = '#5865F2';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.arc(0, -r * 0.1, r * 1.06, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.4;
    ctx.fillStyle = '#5865F2';
    roundRectPath(ctx, -r * 1.18, -r * 0.34, r * 0.32, r * 0.62, 6);
    ctx.fill(); ctx.stroke();
    roundRectPath(ctx, r * 0.86, -r * 0.34, r * 0.32, r * 0.62, 6);
    ctx.fill(); ctx.stroke();
    // Little mic boom
    ctx.beginPath();
    ctx.moveTo(r * 0.92, r * 0.2);
    ctx.quadraticCurveTo(r * 0.72, r * 0.52, r * 0.32, r * 0.42);
    ctx.stroke();
  } else if (hat === 'cat') {
    ctx.fillStyle = '#FFFDF7';
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(dir * r * 0.22, -r * 0.88);
      ctx.lineTo(dir * r * 0.76, -r * 1.38);
      ctx.lineTo(dir * r * 0.82, -r * 0.62);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#FF9EBB';
      ctx.beginPath();
      ctx.moveTo(dir * r * 0.38, -r * 0.86);
      ctx.lineTo(dir * r * 0.66, -r * 1.18);
      ctx.lineTo(dir * r * 0.7, -r * 0.74);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#FFFDF7';
    }
  } else if (hat === 'cap') {
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(0, -r * 0.66, r * 0.68, Math.PI, 0);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.ellipse(r * 0.44, -r * 0.66, r * 0.56, r * 0.16, 0.08, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  } else if (hat === 'shades') {
    ctx.fillStyle = '#0F172A';
    roundRectPath(ctx, lookX - r * 0.62, lookY - r * 0.24, r * 0.52, r * 0.34, 5);
    ctx.fill(); ctx.stroke();
    roundRectPath(ctx, lookX + r * 0.1, lookY - r * 0.24, r * 0.52, r * 0.34, 5);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(lookX - r * 0.1, lookY - r * 0.1);
    ctx.lineTo(lookX + r * 0.1, lookY - r * 0.1);
    ctx.stroke();
  } else if (hat === 'sprout') {
    ctx.strokeStyle = '#15803D';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.92);
    ctx.quadraticCurveTo(0, -r * 1.38, r * 0.15, -r * 1.48);
    ctx.stroke();
    ctx.fillStyle = '#4ADE80';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(-r * 0.26, -r * 1.38, r * 0.3, r * 0.15, -0.4, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(r * 0.3, -r * 1.42, r * 0.3, r * 0.15, 0.35, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  } else if (hat === 'halo') {
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.ellipse(0, -r * 1.28, r * 0.62, r * 0.2, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (hat === 'bow') {
    ctx.fillStyle = '#EC4899';
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.02);
    ctx.lineTo(-r * 0.48, -r * 1.32);
    ctx.lineTo(-r * 0.48, -r * 0.78);
    ctx.closePath();
    ctx.moveTo(0, -r * 1.02);
    ctx.lineTo(r * 0.48, -r * 1.32);
    ctx.lineTo(r * 0.48, -r * 0.78);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FDE047';
    ctx.beginPath();
    ctx.arc(0, -r * 1.02, r * 0.16, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  } else if (hat === 'cowboy') {
    ctx.fillStyle = '#B45309';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.84, r * 1.08, r * 0.24, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    roundRectPath(ctx, -r * 0.56, -r * 1.42, r * 1.12, r * 0.62, 10);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(-r * 0.54, -r * 0.98, r * 1.08, r * 0.16);
  }

  ctx.restore();
}

export function drawCartoonBomb(ctx, x, y, r, pulse, time, label = '') {
  ctx.save();
  ctx.translate(x, y);
  const sc = 1 + Math.sin(time * (pulse ? 24 : 9)) * (pulse ? 0.13 : 0.05);
  ctx.scale(sc, sc);

  // Fuse
  ctx.strokeStyle = '#92400E';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(r * 0.2, -r * 0.85);
  ctx.quadraticCurveTo(r * 0.7, -r * 1.45, r * 1.05, -r * 1.18);
  ctx.stroke();

  // Burning spark
  ctx.fillStyle = Math.sin(time * 35) > 0 ? '#FACC15' : '#FB7185';
  ctx.beginPath();
  ctx.arc(r * 1.05, -r * 1.18, 6 + Math.sin(time * 40) * 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Bomb body
  ctx.fillStyle = pulse && Math.sin(time * 24) > 0 ? '#DC2626' : '#1E293B';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Highlight
  ctx.fillStyle = 'rgba(255,255,255,0.38)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.34, -r * 0.32, r * 0.28, r * 0.16, -0.6, 0, Math.PI * 2);
  ctx.fill();

  if (label) {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `700 ${Math.round(r * 0.72)}px Fredoka, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 2);
  }
  ctx.restore();
}

/**
 * Lightweight pooled particle + floating text VFX system.
 */
export class VFXPool {
  constructor() {
    this.particles = [];
    this.popups = [];
    this.rings = [];
    this.shake = 0;
  }

  burst(x, y, color = '#FFD166', count = 16, speed = 220) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = (0.35 + Math.random() * 0.85) * speed;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        r: 4 + Math.random() * 6,
        color,
        life: 0.45 + Math.random() * 0.35,
        maxLife: 0.8,
      });
    }
    if (this.particles.length > 260) this.particles.splice(0, this.particles.length - 260);
  }

  ring(x, y, color = '#FF5E7E', maxR = 130) {
    this.rings.push({ x, y, color, r: 16, maxR, life: 0.4, maxLife: 0.4 });
  }

  popup(x, y, text, color = '#FFD166') {
    this.popups.push({ x, y, text, color, life: 1.05, maxLife: 1.05 });
  }

  addShake(amount = 8) {
    this.shake = Math.min(18, this.shake + amount);
  }

  update(dt) {
    this.shake = Math.max(0, this.shake - dt * 32);
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      if (r.life <= 0) { this.rings.splice(i, 1); continue; }
      r.r = r.maxR * (1 - r.life / r.maxLife);
    }
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const t = this.popups[i];
      t.life -= dt;
      t.y -= dt * 38;
      if (t.life <= 0) this.popups.splice(i, 1);
    }
  }

  draw(ctx) {
    for (const r of this.rings) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, r.life / r.maxLife);
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (p.life / p.maxLife), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    for (const t of this.popups) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, (t.life / t.maxLife) * 1.4);
      ctx.font = '700 20px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 5;
      ctx.strokeStyle = INK;
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    }
  }
}
