export class Effects {
  constructor() {
    this.particles = [];
    this.toasts = [];
    this.reduced =
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  burst(x, y, color = "#ffc75b", count = 24) {
    if (this.reduced) count = 5;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2,
        speed = 30 + Math.random() * 100;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        life: 0.5 + Math.random() * 0.6,
        size: 2 + Math.random() * 4,
        color,
      });
    }
    if (this.particles.length > 250)
      this.particles.splice(0, this.particles.length - 250);
  }
  toast(text, color = "#fff0b7") {
    this.toasts.push({ text, color, life: 2 });
    if (this.toasts.length > 3) this.toasts.shift();
  }
  update(dt) {
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 120 * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const t of this.toasts) t.life -= dt;
    this.toasts = this.toasts.filter((t) => t.life > 0);
  }
  draw(ctx, camera) {
    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = Math.min(1, p.life * 2);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - camera, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    this.toasts.forEach((t, i) => {
      ctx.globalAlpha = Math.min(1, t.life * 2);
      ctx.font = '700 22px "Space Grotesk"';
      ctx.textAlign = "center";
      ctx.fillStyle = "#153b3d";
      ctx.fillRect(270, 100 + i * 43, 460, 36);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, 500, 126 + i * 43);
    });
    ctx.restore();
  }
  clear() {
    this.particles = [];
    this.toasts = [];
  }
}
export function drawStar(ctx, x, y, r = 15, color = "#ffc75b", spin = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5,
      s = i % 2 ? r * 0.46 : r;
    ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = "#c68c35";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}
