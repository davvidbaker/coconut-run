// Render in screen coordinates so the map stays fixed while the course scrolls.
export function drawMinimap(ctx, course, position, camera, scale = 1) {
  const box = { x: 738, y: 16, w: 246, h: 84 };
  const left = box.x + 14,
    right = box.x + box.w - 14;
  const start = 390,
    end = course.finish;
  const project = (x) =>
    left +
    Math.max(0, Math.min(1, (x - start) / (end - start))) * (right - left);
  const progress = Math.max(
    0,
    Math.min(100, ((position - start) / (end - start)) * 100),
  );
  const heights = course.terrain.map((p) => p[1]);
  const high = Math.min(...heights),
    low = Math.max(...heights);
  const y = (height) =>
    box.y + 37 + ((height - high) / Math.max(1, low - high)) * 26;
  ctx.save();
  ctx.translate(1000 - 1000 * scale, 0);
  ctx.scale(scale, scale);
  ctx.fillStyle = "#153f42eb";
  ctx.beginPath();
  ctx.roundRect(box.x, box.y, box.w, box.h, 8);
  ctx.fill();
  ctx.font = '700 10px "DM Sans"';
  ctx.fillStyle = "#d9e8cd";
  ctx.fillText("COURSE MAP", left, box.y + 18);
  ctx.textAlign = "right";
  ctx.fillStyle = "#ffce7e";
  ctx.fillText(Math.round(progress) + "%", right, box.y + 18);
  ctx.textAlign = "left";
  // Outline the camera's current window, useful on the longer endurance routes.
  ctx.fillStyle = "#c6e7c21a";
  ctx.fillRect(
    project(camera),
    box.y + 30,
    Math.max(3, project(camera + 1000) - project(camera)),
    42,
  );
  ctx.beginPath();
  course.terrain.forEach(([x, height], i) =>
    i ? ctx.lineTo(project(x), y(height)) : ctx.moveTo(project(x), y(height)),
  );
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#a9c5a2";
  ctx.lineJoin = "round";
  ctx.stroke();
  for (const star of course.stars) {
    ctx.fillStyle = "#e5b858";
    ctx.fillRect(project(star.x) - 1.5, box.y + 29, 3, 3);
  }
  const obstacleColors = {
    bridge: "#74d0cf",
    seesaw: "#f8a56b",
    rollers: "#d9bd84",
    boost: "#d6e37b",
    wind: "#bdaced",
  };
  for (const feature of course.features || []) {
    const x = project(feature.x);
    ctx.fillStyle = obstacleColors[feature.type] || "#a9c5a2";
    ctx.fillRect(x - 2, box.y + 24, 4, 4);
  }
  for (const section of course.sections || []) {
    ctx.strokeStyle = "#dcebc35c";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(project(section.x), box.y + 66);
    ctx.lineTo(project(section.x), box.y + 70);
    ctx.stroke();
  }
  const marker = project(position);
  ctx.beginPath();
  ctx.arc(marker, box.y + 72, 4, 0, Math.PI * 2);
  ctx.fillStyle = "#ffad69";
  ctx.fill();
  ctx.strokeStyle = "#ffad69";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(marker, box.y + 34);
  ctx.lineTo(marker, box.y + 67);
  ctx.stroke();
  ctx.fillStyle = "#f3eed0";
  ctx.fillRect(right - 1, box.y + 29, 1.5, 10);
  ctx.fillRect(right, box.y + 29, 5, 4);
  ctx.restore();
}
