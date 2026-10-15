import "./style.css";
import Matter from "matter-js";
import {
  preset,
  shape,
  validateDesign,
  createSimulation,
  terrain,
  FINISH,
  score,
} from "./physics.js";
const $ = (id) => document.getElementById(id),
  canvas = $("game"),
  ctx = canvas.getContext("2d");
let parts = preset(),
  tool = "beam",
  drag = null,
  hover = null,
  history = [],
  mode = "build",
  sim = null,
  camera = 0,
  accumulator = 0,
  last = performance.now(),
  paused = false,
  drive = 0,
  keys = new Set(),
  sound = false,
  audio = null,
  finishAt = null;
const clone = (x) => structuredClone(x);
function notice(text) {
  $("notice").textContent = text;
}
function remember() {
  history.push(clone(parts));
  if (history.length > 40) history.shift();
}
function update() {
  $("part-count").textContent = `${parts.length} PARTS`;
  document.querySelectorAll("[data-tool]").forEach((b) => {
    b.classList.toggle("selected", b.dataset.tool === tool);
    b.disabled = mode !== "build";
  });
  $("undo").disabled = mode !== "build" || !history.length;
  $("clear").disabled = mode !== "build";
  $("preset").disabled = mode !== "build";
  $("stiffness").disabled = mode !== "build";
  $("stage-label").textContent =
    mode === "build"
      ? "DESIGN MODE"
      : mode === "load"
        ? "READY TO LOAD"
        : paused
          ? "PAUSED"
          : "ON THE ROAD";
  $("step1").classList.toggle("current", mode === "build");
  $("step2").classList.toggle("current", mode === "load");
  $("step3").classList.toggle("current", mode === "drive");
  $("start").textContent =
    mode === "build"
      ? "Test your design →"
      : mode === "load"
        ? "Release coconuts ↓"
        : "Finish run ↗";
  $("edit").hidden = mode === "build";
  $("pause").hidden = mode !== "drive";
  $("pause").textContent = paused ? "Resume" : "Pause";
  $("control-hint").textContent =
    mode === "build"
      ? "Drive when you're ready"
      : "Hold to drive · R to rebuild";
}
function point(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * 1000 + camera,
    y: ((e.clientY - r.top) / r.height) * 580,
  };
}
function makePart(a, b) {
  if (tool === "wheel" || tool === "circle")
    return {
      type: tool,
      x: a.x,
      y: a.y,
      r: Math.min(120, Math.max(12, Math.hypot(a.x - b.x, a.y - b.y))),
    };
  return { type: tool, x: a.x, y: a.y, x2: b.x, y2: b.y };
}
function beep(freq = 300) {
  if (!sound) return;
  audio ??= new AudioContext();
  const o = audio.createOscillator(),
    g = audio.createGain();
  o.connect(g);
  g.connect(audio.destination);
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.025, audio.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.1);
  o.start();
  o.stop(audio.currentTime + 0.1);
}
canvas.addEventListener("pointerdown", (e) => {
  if (mode !== "build") return;
  canvas.setPointerCapture(e.pointerId);
  const p = point(e);
  if (tool === "erase") {
    const hit = parts.findLastIndex((part) =>
      part.type === "spring"
        ? Math.hypot(
            (part.x + part.x2) / 2 - p.x,
            (part.y + part.y2) / 2 - p.y,
          ) < 35
        : Matter.Query.point([shape(part)], p).length,
    );
    if (hit >= 0) {
      remember();
      parts.splice(hit, 1);
      update();
    }
    return;
  }
  drag = p;
  hover = p;
});
canvas.addEventListener("pointermove", (e) => {
  hover = point(e);
});
canvas.addEventListener("pointerup", (e) => {
  if (!drag) return;
  const end = point(e);
  if (Math.hypot(end.x - drag.x, end.y - drag.y) > 8 && parts.length < 100) {
    remember();
    parts.push(makePart(drag, end));
    beep();
  }
  drag = null;
  update();
});
canvas.addEventListener("pointercancel", () => {
  drag = null;
});
const tips = {
  beam: "Drag to draw a beam. Touching frame pieces join automatically.",
  box: "Drag corner to corner to draw a solid block.",
  circle: "Drag outward from the center to draw a solid disc.",
  wheel:
    "Drag outward to size a wheel. Place it near the frame for an automatic axle.",
  spring: "Drag between two parts to add a flexible suspension link.",
  erase: "Click a part to remove it.",
};
document.querySelectorAll("[data-tool]").forEach(
  (b) =>
    (b.onclick = () => {
      tool = b.dataset.tool;
      notice(tips[tool]);
      update();
    }),
);
$("undo").onclick = () => {
  if (history.length && mode === "build") {
    parts = history.pop();
    update();
  }
};
$("clear").onclick = () => {
  remember();
  parts = [];
  update();
};
$("preset").onchange = (e) => {
  remember();
  parts = preset(e.target.value);
  update();
};
$("stiffness").oninput = (e) =>
  ($("spring-value").textContent =
    e.target.value < 4 ? "Soft" : e.target.value > 7 ? "Firm" : "Balanced");
$("power").oninput = (e) =>
  ($("power-value").textContent = e.target.value + "%");
function build() {
  sim?.dispose();
  sim = null;
  mode = "build";
  paused = false;
  camera = 0;
  keys.clear();
  drive = 0;
  finishAt = null;
  accumulator = 0;
  $("result").hidden = true;
  $("cargo").textContent = "00";
  $("timer").textContent = "00:00";
  $("progress").style.width = "0";
  notice(tips[tool]);
  update();
}
function finish() {
  if (mode !== "drive") return;
  paused = true;
  $("result").hidden = false;
  const n = sim.delivered;
  $("result-title").textContent =
    n === 15
      ? "Every coconut counts."
      : n > 0
        ? "A fruitful experiment."
        : "Back to the drawing board.";
  $("result-stats").textContent =
    `${n} / 15 delivered · ${sim.elapsed.toFixed(1)} seconds · ${score(n, sim.elapsed)}% efficiency`;
  beep(n ? 650 : 140);
  update();
}
$("start").onclick = () => {
  if (mode === "build") {
    const error = validateDesign(parts);
    if (error) {
      notice(error);
      return;
    }
    sim = createSimulation(parts, Number($("stiffness").value) / 10);
    mode = "load";
    notice(
      "Your cart is ready. Release the coconuts, let them settle, then hold → to drive.",
    );
  } else if (mode === "load") {
    sim.load();
    mode = "drive";
    canvas.focus({ preventScroll: true });
    notice(
      "Hold → / D to drive. Ease off over bumps. Deliver your coconuts to the shredder.",
    );
    beep(500);
  } else finish();
  update();
};
$("edit").onclick = build;
$("result-edit").onclick = build;
$("pause").onclick = () => {
  paused = !paused;
  keys.clear();
  drive = 0;
  update();
};
$("save").onclick = () => {
  try {
    localStorage.setItem(
      "coconut-run-design",
      JSON.stringify({ version: 1, parts }),
    );
    notice("Design saved in this browser.");
  } catch {
    notice("This browser cannot save your design.");
  }
};
$("restore").onclick = () => {
  if (mode !== "build") {
    notice("Return to build mode before restoring.");
    return;
  }
  try {
    const d = JSON.parse(localStorage.getItem("coconut-run-design"));
    if (!d || !Array.isArray(d.parts) || d.parts.length > 100) throw Error();
    if (
      !d.parts.every(
        (p) =>
          ["beam", "box", "circle", "wheel", "spring"].includes(p.type) &&
          (p.type === "wheel" || p.type === "circle"
            ? [p.x, p.y, p.r].every(Number.isFinite) && p.r >= 12 && p.r <= 120
            : [p.x, p.y, p.x2, p.y2].every(Number.isFinite)),
      )
    )
      throw Error();
    remember();
    parts = d.parts;
    update();
    notice("Saved design restored.");
  } catch {
    notice("No saved design found.");
  }
};
$("help").onclick = () => $("instructions").showModal();
$("close-help").onclick = $("got-it").onclick = () => $("instructions").close();
$("sound").onclick = () => {
  sound = !sound;
  $("sound").textContent = sound ? "Sound on ♫" : "Sound off ♫";
  $("sound").setAttribute("aria-pressed", String(sound));
  beep(450);
};
window.addEventListener("keydown", (e) => {
  if (["INPUT", "SELECT"].includes(e.target.tagName) || $("instructions").open)
    return;
  // Arrow keys belong to the game, including up/down, which otherwise scroll
  // the page while the player is driving. Form controls retain native editing.
  if (e.key.startsWith("Arrow")) e.preventDefault();
  if (["ArrowLeft", "ArrowRight", "a", "d", "A", "D"].includes(e.key)) {
    e.preventDefault();
    keys.add(e.key.toLowerCase());
  }
  if (e.key.toLowerCase() === "r") build();
  if (e.code === "Space" && mode === "drive") {
    e.preventDefault();
    $("pause").click();
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener("blur", () => {
  keys.clear();
  drive = 0;
});
document.addEventListener("visibilitychange", () => {
  keys.clear();
  drive = 0;
  last = performance.now();
});
for (const [id, n] of [
  ["left", -1],
  ["right", 1],
]) {
  const b = $(id);
  b.onpointerdown = (e) => {
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    drive = n;
  };
  b.onpointerup = b.onpointercancel = () => (drive = 0);
}
function line(points, color, width = 2) {
  ctx.beginPath();
  points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}
function circle(x, y, r, fill, stroke) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}
function renderBody(body, kind, ghost = false) {
  ctx.globalAlpha = ghost ? 0.5 : 1;
  if (kind === "wheel") {
    const { x, y } = body.position,
      r = body.circleRadius;
    circle(x, y, r, "#344c3b", "#243e2e");
    circle(x, y, r * 0.73, "#e6e9d8", "#859979");
    for (let i = 0; i < 6; i++) {
      const a = body.angle + (i * Math.PI) / 3;
      line(
        [
          { x: x + Math.cos(a) * r * 0.2, y: y + Math.sin(a) * r * 0.2 },
          { x: x + Math.cos(a) * r * 0.66, y: y + Math.sin(a) * r * 0.66 },
        ],
        "#809578",
        3,
      );
    }
    circle(x, y, r * 0.19, "#e9ae67", "#7c7956");
  } else if (kind === "coconut") {
    const { x, y } = body.position;
    circle(x, y, 9, "#a96b3e", "#734b2e");
    line(
      [
        { x: x - 3, y: y - 6 },
        { x: x - 5, y: y + 4 },
      ],
      "#d2a16a",
      1.5,
    );
    circle(x + 3, y - 2, 1, "#4f3d2c");
  } else {
    ctx.beginPath();
    body.vertices.forEach((p, i) =>
      i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y),
    );
    ctx.closePath();
    ctx.fillStyle = kind === "circle" ? "#97ad89" : "#c7a67b";
    ctx.fill();
    ctx.strokeStyle = "#7b7955";
    ctx.lineWidth = 2;
    ctx.stroke();
    if (kind === "beam") {
      const a = body.vertices[0],
        b = body.vertices[1];
      line(
        [
          { x: (a.x + body.position.x) / 2, y: (a.y + body.position.y) / 2 },
          { x: (b.x + body.position.x) / 2, y: (b.y + body.position.y) / 2 },
        ],
        "#e2caa5",
        2,
      );
    }
  }
  ctx.globalAlpha = 1;
}
function spring(a, b) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    len = Math.hypot(dx, dy) || 1,
    pts = [a];
  for (let i = 1; i < 12; i++) {
    const t = i / 12,
      s = (i % 2 ? 1 : -1) * 5;
    pts.push({
      x: a.x + dx * t - (dy / len) * s,
      y: a.y + dy * t + (dx / len) * s,
    });
  }
  pts.push(b);
  line(pts, "#64866e", 2);
  circle(a.x, a.y, 3, "#eaf0df", "#64866e");
  circle(b.x, b.y, 3, "#eaf0df", "#64866e");
}
function draw() {
  ctx.clearRect(0, 0, 1000, 580);
  ctx.fillStyle = "#edf0e6";
  ctx.fillRect(0, 0, 1000, 580);
  ctx.save();
  ctx.translate(-camera, 0);
  ctx.strokeStyle = "#dee4d4";
  ctx.lineWidth = 0.7;
  for (let x = Math.floor(camera / 25) * 25; x < camera + 1000; x += 25) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 580);
    ctx.stroke();
  }
  for (let y = 0; y < 580; y += 25) {
    ctx.beginPath();
    ctx.moveTo(camera, y);
    ctx.lineTo(camera + 1000, y);
    ctx.stroke();
  }
  // Quiet landscape behind the engineering drawing.
  ctx.fillStyle = "#dfe6d3";
  ctx.beginPath();
  ctx.moveTo(camera, 460);
  for (let x = camera; x <= camera + 1020; x += 20)
    ctx.lineTo(x, 400 + Math.sin(x / 220) * 35 + Math.cos(x / 120) * 18);
  ctx.lineTo(camera + 1020, 580);
  ctx.lineTo(camera, 580);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(terrain[0][0], 850);
  terrain.forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.lineTo(5100, 850);
  ctx.closePath();
  ctx.fillStyle = "#ced8b7";
  ctx.fill();
  line(
    terrain.map(([x, y]) => ({ x, y })),
    "#718462",
    3,
  );
  for (let x = 50; x < 5100; x += 180) {
    const seg = terrain.findIndex(
      (p, i) => i < terrain.length - 1 && x >= p[0] && x < terrain[i + 1][0],
    );
    if (seg < 0) continue;
    const a = terrain[seg],
      b = terrain[seg + 1],
      y = a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]);
    line(
      [
        { x, y: y + 24 },
        { x: x + 15, y: y + 18 },
        { x: x + 25, y: y + 30 },
      ],
      "#a7b58f",
      1,
    );
  }
  ctx.fillStyle = "#7e9270";
  ctx.font = '10px "DM Sans"';
  ctx.fillText("THE WORKSHOP", 265, 520);
  ctx.fillText("ROUGH ROAD AHEAD →", 780, 545);
  // Loading hopper is a guide, not a colliding part.
  if (camera < 600) {
    ctx.fillStyle = "#e2e7d8";
    ctx.beginPath();
    ctx.moveTo(325, 35);
    ctx.lineTo(470, 35);
    ctx.lineTo(447, 95);
    ctx.lineTo(350, 95);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#a8b69a";
    ctx.stroke();
    ctx.fillStyle = "#86977a";
    ctx.font = '9px "DM Sans"';
    ctx.fillText("15 COCONUTS", 357, 63);
    line(
      [
        { x: 398, y: 105 },
        { x: 398, y: 132 },
      ],
      "#a5b396",
      1,
    );
    ctx.fillText("↓", 394, 143);
  }
  // Finish shredder receives individual coconuts.
  ctx.fillStyle = "#526e4c";
  ctx.fillRect(FINISH, 420, 210, 90);
  ctx.fillStyle = "#344e35";
  ctx.fillRect(FINISH, 420, 210, 14);
  ctx.fillStyle = "#f0d58d";
  ctx.fillRect(FINISH + 20, 460, 170, 23);
  ctx.fillStyle = "#31503a";
  ctx.font = '12px "Space Grotesk"';
  ctx.fillText("COCONUT SHREDDER", FINISH + 29, 476);
  for (let i = 0; i < 8; i++)
    circle(FINISH + 14 + i * 25, 428, 8, "#9bab87", "#425c3c");
  line(
    [
      { x: FINISH, y: 420 },
      { x: FINISH, y: 260 },
    ],
    "#526e4c",
    4,
  );
  ctx.fillStyle = "#e5a268";
  ctx.fillRect(FINISH, 260, 85, 28);
  ctx.fillStyle = "#364f36";
  ctx.fillText("FINISH", FINISH + 18, 279);
  if (sim) {
    for (const o of sim.objects) renderBody(o.body, o.part.type);
    for (const c of sim.coconuts)
      if (c.plugin.state === "live") renderBody(c, "coconut");
    for (const c of sim.joints) {
      const a = c.bodyA
          ? Matter.Vector.add(c.bodyA.position, c.pointA)
          : c.pointA,
        b = c.bodyB ? Matter.Vector.add(c.bodyB.position, c.pointB) : c.pointB;
      if (c.length > 5) spring(a, b);
      else circle(a.x, a.y, 3, "#f1e7c8", "#758362");
    }
  } else {
    for (const p of parts)
      if (p.type === "spring") spring({ x: p.x, y: p.y }, { x: p.x2, y: p.y2 });
      else renderBody(shape(p), p.type);
    if (drag && hover) {
      const p = makePart(drag, hover);
      if (p.type === "spring") spring(drag, hover);
      else renderBody(shape(p), p.type, true);
    }
  }
  ctx.restore();
  if (mode === "build") {
    ctx.fillStyle = "#8b9a7c";
    ctx.font = '10px "DM Sans"';
    ctx.fillText("DESIGN YOUR WAY THROUGH.", 30, 35);
    ctx.font = '9px "DM Sans"';
    ctx.fillText("Each idea starts with a line.", 30, 53);
  }
}
function frame(now) {
  const dt = Math.min(now - last, 50);
  last = now;
  if (sim && !paused) {
    accumulator += dt;
    while (accumulator >= 1000 / 120) {
      const input =
        mode === "drive"
          ? drive ||
            (keys.has("arrowright") || keys.has("d") ? 1 : 0) -
              (keys.has("arrowleft") || keys.has("a") ? 1 : 0)
          : 0;
      sim.step(1000 / 120, input, Number($("power").value) / 60);
      accumulator -= 1000 / 120;
    }
    camera +=
      (Math.max(0, Math.min(FINISH - 400, sim.x - 380)) - camera) * 0.09;
    $("cargo").textContent = String(sim.delivered).padStart(2, "0");
    const secs = Math.floor(sim.elapsed);
    $("timer").textContent =
      String(Math.floor(secs / 60)).padStart(2, "0") +
      ":" +
      String(secs % 60).padStart(2, "0");
    $("progress").style.width =
      Math.max(0, Math.min(100, ((sim.x - 390) / (FINISH - 390)) * 100)) + "%";
    if (mode === "drive") {
      if (
        sim.delivered === 15 ||
        sim.elapsed > 120 ||
        sim.objects.every((o) => o.body.position.y > 900)
      )
        finish();
      else if (sim.x > FINISH - 100) {
        finishAt ??= sim.elapsed;
        if (sim.elapsed - finishAt > 5) finish();
      } else if (sim.coconuts.length && sim.live === 0) finish();
    }
  }
  draw();
  requestAnimationFrame(frame);
}
update();
requestAnimationFrame(frame);
