import { groundHeight } from "./courses.js";
export function scenery(ctx, camera, terrain, theme, time, build) {
  const night = theme === "orbit",
    sand = theme === "dunes";
  const sky = ctx.createLinearGradient(0, 0, 0, 580);
  sky.addColorStop(0, night ? "#18243e" : sand ? "#f9d6ae" : "#92d9d5");
  sky.addColorStop(1, night ? "#435276" : sand ? "#fff1ca" : "#e6f3d1");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 1000, 580);
  ctx.fillStyle = night ? "#f4edc1" : "#ffe29a";
  ctx.beginPath();
  ctx.arc(820 - camera * 0.025, 90, night ? 38 : 48, 0, Math.PI * 2);
  ctx.fill();
  if (night) {
    ctx.fillStyle = "#eee4ce";
    for (let i = 0; i < 45; i++) {
      const x = (((i * 173.7 - camera * 0.09) % 1040) + 1040) % 1040,
        y = 25 + ((i * 67.4) % 270);
      ctx.globalAlpha = 0.3 + (Math.sin(time + i) + 1) * 0.3;
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.globalAlpha = 1;
  } else {
    for (let i = 0; i < 5; i++) {
      const x = ((((i * 250 - camera * 0.12) % 1300) + 1300) % 1300) - 100,
        y = 85 + (i % 3) * 38;
      ctx.fillStyle = "#ffffff77";
      for (let j = 0; j < 3; j++) {
        ctx.beginPath();
        ctx.ellipse(x + j * 28, y - (j % 2) * 12, 38, 15, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  for (let layer = 0; layer < 2; layer++) {
    ctx.fillStyle = night
      ? ["#303e60", "#3f5670"][layer]
      : sand
        ? ["#e9b88b", "#d6a079"][layer]
        : ["#8dbdb2", "#69aaa0"][layer];
    ctx.beginPath();
    ctx.moveTo(0, 580);
    for (let x = 0; x <= 1020; x += 20)
      ctx.lineTo(
        x,
        335 +
          layer * 45 +
          Math.sin((x + camera * (0.15 + layer * 0.12)) / 190) * 25 +
          Math.cos((x + camera * 0.1) / 95) * 12,
      );
    ctx.lineTo(1020, 580);
    ctx.fill();
  }
  if (!night && !sand) {
    ctx.fillStyle = "#74c5bd";
    ctx.fillRect(0, 410, 1000, 170);
    ctx.strokeStyle = "#b2e2d5";
    ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      const x = (((i * 123 - camera * 0.3) % 1100) + 1100) % 1100;
      ctx.beginPath();
      ctx.moveTo(x, 435 + (i % 4) * 25);
      ctx.lineTo(x + 35, 435 + (i % 4) * 25);
      ctx.stroke();
    }
  }
  ctx.save();
  ctx.translate(-camera, 0);
  // Every scenery prop is decorative; terrain remains the physics source of truth.
  for (let x = 640; x < 4700; x += 610) {
    const y = groundHeight(terrain, x);
    if (x < camera - 100 || x > camera + 1100) continue;
    if (night) {
      ctx.fillStyle = "#8f9cae";
      ctx.beginPath();
      ctx.ellipse(x, y - 7, 26, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#65738c";
      ctx.beginPath();
      ctx.ellipse(x + 5, y - 13, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (sand) {
      ctx.strokeStyle = "#718c6d";
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - 65);
      ctx.moveTo(x, y - 30);
      ctx.lineTo(x - 18, y - 30);
      ctx.lineTo(x - 18, y - 52);
      ctx.stroke();
    } else {
      ctx.strokeStyle = "#9b7651";
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x - 12, y - 50, x + 8, y - 105);
      ctx.stroke();
      ctx.strokeStyle = "#357d69";
      ctx.lineWidth = 10;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 8, y - 105);
        ctx.quadraticCurveTo(x - 45 + i * 22, y - 140, x - 65 + i * 32, y - 92);
        ctx.stroke();
      }
    }
  }
  ctx.beginPath();
  ctx.moveTo(terrain[0][0], 850);
  terrain.forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.lineTo(5100, 850);
  ctx.closePath();
  ctx.fillStyle = night ? "#78869b" : sand ? "#c4936a" : "#b6976a";
  ctx.fill();
  ctx.strokeStyle = night ? "#b3b9bc" : "#edd39d";
  ctx.lineWidth = 12;
  ctx.lineJoin = "round";
  ctx.beginPath();
  terrain.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.strokeStyle = night ? "#85998e" : "#6b9b64";
  ctx.lineWidth = 5;
  ctx.stroke();
  for (let x = 0; x < 5100; x += 95) {
    const y = groundHeight(terrain, x);
    ctx.fillStyle = night ? "#66758b" : "#977953";
    ctx.beginPath();
    ctx.ellipse(x + 14, y + 35 + (x % 3) * 9, 4, 2, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  if (build) {
    ctx.strokeStyle = night ? "#ffffff12" : "#335f5517";
    ctx.lineWidth = 1;
    for (let x = 25; x < 1000; x += 25) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 480);
      ctx.stroke();
    }
    for (let y = 25; y < 480; y += 25) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1000, y);
      ctx.stroke();
    }
  }
  ctx.restore();
}
