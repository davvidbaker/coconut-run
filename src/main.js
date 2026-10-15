import { garage } from "./garage.js";
import "./style.css";
import Matter from "matter-js";
import {
  preset,
  shape,
  validateDesign,
  createSimulation,
  score,
} from "./physics.js";
import { courses, groundHeight, medal, COURSE_VERSION } from "./courses.js";
import { Effects, drawStar } from "./effects.js";
import { scenery } from "./scenery.js";
let courseId = "lagoon",
  course = courses.lagoon,
  terrain = course.terrain,
  FINISH = course.finish;
const recordKey = "coconut-run-records-v" + COURSE_VERSION;
let autoDrive = false;
let boostHeld = false,
  collected = new Set(),
  airtime = 0,
  airStreak = 0,
  wasAir = false,
  lastDelivered = 0,
  nextGate = 1500,
  records = {};
const effects = new Effects();
try {
  records = JSON.parse(localStorage.getItem(recordKey)) || {};
} catch {}
function refreshRecords() {
  for (const id of Object.keys(courses)) {
    const rec = records[id];
    const el = document.getElementById("medal-" + id);
    el.textContent = rec
      ? { gold: "★", silver: "★", bronze: "★" }[rec.medal] || "☆"
      : "☆";
    el.className = "course-medal " + (rec?.medal || "");
  }
  const rec = records[courseId];
  document.getElementById("record").textContent = rec
    ? "BEST: " +
      rec.cargo +
      "/15 · " +
      rec.time.toFixed(1) +
      "s · " +
      rec.medal.toUpperCase()
    : "YOUR FIRST MEDAL IS WAITING";
}
const $ = (id) => document.getElementById(id),
  canvas = $("game"),
  ctx = canvas.getContext("2d");
let parts = preset("train"),
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
  document.querySelectorAll("[data-design]").forEach((b) => {
    b.disabled = mode !== "build";
    b.classList.toggle("active", b.dataset.design === $("preset").value);
  });
  $("stiffness").disabled = mode !== "build";
  document.querySelectorAll("[data-course]").forEach((b) => {
    b.disabled = mode !== "build";
    b.classList.toggle("active", b.dataset.course === courseId);
  });
  $("boost").disabled = mode !== "drive" || paused;
  $("demo").textContent =
    mode === "drive"
      ? autoDrive
        ? "Auto-drive: ON"
        : "Auto-drive: OFF"
      : "Quick ride ↗";
  $("course-description").textContent = course.description;
  $("tip").innerHTML =
    "THE GOLD STANDARD<br><span>Deliver all 15 in " +
    course.gold +
    " seconds for gold. Chase three stars along the way.</span>";
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
  $("pause").disabled = !$("result").hidden;
  $("start").disabled = !$("result").hidden;
  $("demo").disabled = !$("result").hidden;
  $("control-hint").textContent =
    mode === "build"
      ? "Drive when you're ready"
      : "Drive · SHIFT boost · T retry";
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
      ["spring", "hinge"].includes(part.type)
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
  hinge:
    "Drag between separate parts to add a rigid link with free pivots at its ends.",
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
  const vehicle = garage[e.target.value];
  $("garage-tag").textContent = vehicle?.tag || "THE ORIGINAL";
  $("garage-description").textContent =
    vehicle?.description || "A blank slate with good bones. Make it your own.";
  notice(vehicle ? vehicle.name + ": " + vehicle.description : tips[tool]);
  const source = $("garage-source");
  source.hidden = !vehicle?.source;
  if (vehicle?.source) source.href = vehicle.source;
  update();
};
for (const button of document.querySelectorAll("[data-design]"))
  button.onclick = () => {
    $("preset").value = button.dataset.design;
    $("preset").onchange({ target: $("preset") });
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
  boostHeld = false;
  drive = 0;
  finishAt = null;
  accumulator = 0;
  autoDrive = false;
  boostHeld = false;
  collected.clear();
  airtime = 0;
  airStreak = 0;
  wasAir = false;
  lastDelivered = 0;
  nextGate = 1500;
  effects.clear();
  $("aboard").textContent = "15";
  $("star-count").textContent = "☆ ☆ ☆";
  $("fuel").style.width = "100%";
  $("speed").textContent = "0";
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
  $("result-stats").textContent =
    `${n} / 15 delivered · ${sim.elapsed.toFixed(1)} seconds · ${score(n, sim.elapsed)}% efficiency`;
  const award = medal(n, sim.elapsed, course.gold);
  $("result-medal").className = "medal-display " + award;
  $("result-medal").textContent = award === "try again" ? "↻" : "★";
  $("result-title").textContent =
    award === "gold"
      ? "Certified coconut legend."
      : award === "silver"
        ? "That’s a sweet delivery."
        : award === "bronze"
          ? "Beautifully questionable."
          : "One more terrible idea?";
  $("result-extras").textContent =
    (award === "try again" ? "NO MEDAL YET" : award.toUpperCase() + " MEDAL") +
    " · " +
    collected.size +
    "/3 stars · " +
    airtime.toFixed(1) +
    "s airtime";
  const previous = records[courseId];
  const better =
    n > 0 &&
    (!previous ||
      n > previous.cargo ||
      (n === previous.cargo && sim.elapsed < previous.time));
  if (better) {
    records[courseId] = {
      cargo: n,
      time: sim.elapsed,
      medal: award,
      stars: collected.size,
    };
    try {
      localStorage.setItem("coconut-run-records", JSON.stringify(records));
    } catch {}
  }
  $("result-best").textContent = better
    ? "NEW PERSONAL BEST!"
    : previous
      ? "Personal best: " +
        previous.cargo +
        "/15 in " +
        previous.time.toFixed(1) +
        "s"
      : "Wider wheels. Deeper basket. Another go.";
  refreshRecords();
  if (n)
    for (let i = 0; i < 8; i++)
      effects.burst(camera + 100 + i * 110, 70, "#ffcd67", 15);
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
    sim = createSimulation(parts, Number($("stiffness").value) / 10, course);
    mode = "load";
    notice(
      "Your cart is ready. Release the coconuts, let them settle, then hold → to drive.",
    );
  } else if (mode === "load") {
    sim.load();
    mode = "drive";
    canvas.focus({ preventScroll: true });
    notice(
      "Hold → to drive, SHIFT for boost. Collect stars. Keep your cargo. Go nuts.",
    );
    beep(500);
  } else finish();
  update();
};
$("edit").onclick = build;
$("result-edit").onclick = build;
function retry() {
  build();
  $("start").click();
  $("start").click();
}
$("retry").onclick = retry;
$("demo").onclick = () => {
  if (mode !== "drive") {
    retry();
    autoDrive = true;
  } else autoDrive = !autoDrive;
  update();
  notice(
    autoDrive
      ? "Auto-drive is on. Take over with ← →, or hold SHIFT for boost."
      : "You’re driving. Hold → to go, SHIFT for boost.",
  );
};
for (const b of document.querySelectorAll("[data-course]"))
  b.onclick = () => {
    build();
    courseId = b.dataset.course;
    course = courses[courseId];
    terrain = course.terrain;
    FINISH = course.finish;
    refreshRecords();
    update();
    notice(course.description);
  };
for (const id of ["boost", "touch-boost"]) {
  const b = $(id);
  b.onpointerdown = (e) => {
    if (mode !== "drive" || paused) return;
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    boostHeld = true;
  };
  b.onpointerup = b.onpointercancel = () => (boostHeld = false);
}
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
          ["beam", "box", "circle", "wheel", "spring", "hinge"].includes(
            p.type,
          ) &&
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
  if (e.key.startsWith("Arrow") || e.key === "Shift") e.preventDefault();
  if (e.key === "Shift") keys.add("shift");
  if (e.key.toLowerCase() === "t" && mode === "drive") retry();
  if (["ArrowLeft", "ArrowRight", "a", "d", "A", "D"].includes(e.key)) {
    e.preventDefault();
    if (autoDrive) {
      autoDrive = false;
      update();
    }
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
  boostHeld = false;
  drive = 0;
});
document.addEventListener("visibilitychange", () => {
  keys.clear();
  boostHeld = false;
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
    autoDrive = false;
    drive = n;
    update();
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
  scenery(
    ctx,
    camera,
    terrain,
    course.theme,
    performance.now() / 1000,
    mode === "build",
  );
  ctx.save();
  ctx.translate(-camera, 0);
  for (const [i, star] of course.stars.entries())
    if (!collected.has(i)) {
      circle(star.x, star.y, 27, "#fff0b52a");
      drawStar(
        ctx,
        star.x,
        star.y,
        17,
        "#ffca60",
        Math.sin(performance.now() / 500) * 0.13,
      );
    }
  for (let x = 1500; x < FINISH; x += 1500) {
    const y = groundHeight(terrain, x);
    line(
      [
        { x, y },
        { x, y: y - 125 },
      ],
      "#f3c877",
      3,
    );
    ctx.fillStyle = "#ed905b";
    ctx.beginPath();
    ctx.moveTo(x, y - 125);
    ctx.lineTo(x + 50, y - 113);
    ctx.lineTo(x, y - 100);
    ctx.fill();
  }
  // Loading hopper is a guide, not a colliding part.
  if (camera < 600) {
    ctx.fillStyle = "#fbf1cf";
    ctx.beginPath();
    ctx.moveTo(325, 35);
    ctx.lineTo(470, 35);
    ctx.lineTo(447, 95);
    ctx.lineTo(350, 95);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#a8b69a";
    ctx.stroke();
    ctx.fillStyle = "#52746b";
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
      if (c.plugin?.kind === "hinge") {
        line([a, b], "#da9051", 4);
        circle(a.x, a.y, 5, "#fff0bb", "#bd7d43");
        circle(b.x, b.y, 5, "#fff0bb", "#bd7d43");
      } else if (c.length > 5) spring(a, b);
      else circle(a.x, a.y, 3, "#f1e7c8", "#758362");
    }
  } else {
    for (const p of parts)
      if (["spring", "hinge"].includes(p.type))
        spring({ x: p.x, y: p.y }, { x: p.x2, y: p.y2 });
      else renderBody(shape(p), p.type);
    if (drag && hover) {
      const p = makePart(drag, hover);
      if (["spring", "hinge"].includes(p.type)) spring(drag, hover);
      else renderBody(shape(p), p.type, true);
    }
  }
  ctx.restore();
  effects.draw(ctx, camera);
  if (mode === "build") {
    ctx.fillStyle = "#285c5e";
    ctx.font = '10px "DM Sans"';
    ctx.fillText("BAD IDEAS WELCOME.", 30, 35);
    ctx.font = '9px "DM Sans"';
    ctx.fillText("Draw it. Drive it. Blame the coconuts.", 30, 53);
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
            ((autoDrive && sim.elapsed > (sim.actuators.length ? 3.2 : 1.6)) ||
            keys.has("arrowright") ||
            keys.has("d")
              ? 1
              : 0) - (keys.has("arrowleft") || keys.has("a") ? 1 : 0)
          : 0;
      sim.step(
        1000 / 120,
        input,
        Number($("power").value) / 60,
        boostHeld || keys.has("shift"),
      );
      if (mode === "drive") {
        const airborne =
          sim.wheels.every(
            (w) =>
              groundHeight(terrain, w.position.x) -
                w.position.y -
                (w.plugin.welded ? w.bounds.max.y-w.position.y : w.circleRadius) >
              14,
          ) && sim.x > 650;
        if (airborne) {
          airtime += 1 / 120;
          airStreak += 1 / 120;
        } else if (wasAir) {
          if (airStreak > 0.55) {
            effects.toast("AIR MAIL! " + airStreak.toFixed(1) + "s", "#ffe097");
            beep(720);
          }
          airStreak = 0;
        }
        wasAir = airborne;
      }
      accumulator -= 1000 / 120;
    }
    camera +=
      (Math.max(0, Math.min(FINISH - 400, sim.x - 380)) - camera) * 0.09;
    $("fuel").style.width = sim.fuel * 100 + "%";
    $("boost").classList.toggle("charging", sim.boosting);
    const velocity =
      sim.wheels.reduce((sum, w) => sum + w.velocity.x, 0) / sim.wheels.length;
    $("speed").textContent = String(Math.round(Math.abs(velocity) * 12));
    $("aboard").textContent = String(
      sim.coconuts.filter(
        (c) =>
          c.plugin.state === "live" && Math.abs(c.position.x - sim.x) < 180,
      ).length,
    );
    if (mode === "drive") {
      const frameBodies = sim.objects.filter((o) => o.part.type !== "wheel");
      for (const [i, star] of course.stars.entries())
        if (
          !collected.has(i) &&
          frameBodies.some(
            (o) =>
              Math.hypot(
                o.body.position.x - star.x,
                o.body.position.y - star.y,
              ) < 100,
          )
        ) {
          collected.add(i);
          effects.burst(star.x, star.y);
          effects.toast("STAR DELIVERY! " + collected.size + "/3");
          beep(650 + collected.size * 140);
        }
      $("star-count").textContent = [0, 1, 2]
        .map((i) => (collected.has(i) ? "★" : "☆"))
        .join(" ");
      if (sim.x > nextGate && nextGate < FINISH) {
        effects.toast("CHECKPOINT · KEEP IT TOGETHER");
        beep(520);
        nextGate += 1500;
      }
      if (sim.delivered > lastDelivered) {
        effects.burst(FINISH + 60, 390, "#ffe7a0", 8);
        beep(500 + sim.delivered * 24);
        lastDelivered = sim.delivered;
      }
      if (Math.abs(velocity) > 0.5 && !effects.reduced && Math.random() < 0.3) {
        const w = sim.wheels[0];
        effects.burst(
          w.position.x - w.circleRadius,
          w.position.y + w.circleRadius,
          sim.boosting ? "#ff9a50" : "#d6c197",
          sim.boosting ? 4 : 1,
        );
      }
    }
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
        sim.elapsed > 240 ||
        sim.objects.every((o) => o.body.position.y > 900)
      )
        finish();
      else if (sim.x > FINISH - 100) {
        finishAt ??= sim.elapsed;
        if (sim.elapsed - finishAt > 5) finish();
      } else if (sim.coconuts.length && sim.live === 0) finish();
    }
  }
  effects.update(paused ? 0.016 : dt / 1000);
  draw();
  requestAnimationFrame(frame);
}
$("preset").value = "train";
$("garage-tag").textContent = garage.train.tag;
$("garage-description").textContent = garage.train.description;
$("garage-source").href = garage.train.source;
refreshRecords();
update();
requestAnimationFrame(frame);
