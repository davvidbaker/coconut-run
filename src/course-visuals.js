import { groundHeight } from "./courses.js";

const TAU = Math.PI * 2;
const palettes = {
  lagoon: {
    frame: "#355e55",
    board: "#bd8853",
    edge: "#f2d49b",
    accent: "#f19b50",
    rope: "#e9cb90",
    light: "#fff3ce",
    wind: "#e6fff1",
  },
  dunes: {
    frame: "#705340",
    board: "#a8754e",
    edge: "#f4d298",
    accent: "#c65f3b",
    rope: "#edd0a0",
    light: "#fff0c6",
    wind: "#fff4da",
  },
  orbit: {
    frame: "#303e61",
    board: "#76879f",
    edge: "#c1cbd7",
    accent: "#9ce1ce",
    rope: "#bccde5",
    light: "#f4edce",
    wind: "#b9e7ff",
  },
};

function stroke(ctx, points, color, width = 2) {
  ctx.beginPath();
  points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function circle(ctx, x, y, radius, fill, outline) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fillStyle = fill;
  ctx.fill();
  if (outline) {
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function polygon(ctx, vertices, fill, outline) {
  ctx.beginPath();
  vertices.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (outline) {
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function previewBoard(x, y, width, height = 14) {
  return {
    position: { x, y },
    angle: 0,
    vertices: [
      { x: x - width / 2, y: y - height / 2 },
      { x: x + width / 2, y: y - height / 2 },
      { x: x + width / 2, y: y + height / 2 },
      { x: x - width / 2, y: y + height / 2 },
    ],
  };
}

function board(ctx, body, width, palette) {
  polygon(ctx, body.vertices, palette.board, palette.frame);
  ctx.save();
  ctx.translate(body.position.x, body.position.y);
  ctx.rotate(body.angle || 0);
  stroke(
    ctx,
    [
      { x: -width / 2 + 3, y: -4 },
      { x: width / 2 - 3, y: -4 },
    ],
    palette.edge,
    2,
  );
  for (const x of [-width / 2 + 6, width / 2 - 6])
    circle(ctx, x, 1, 1.8, palette.frame);
  ctx.restore();
}

function warningSign(ctx, x, surface, text, palette) {
  stroke(
    ctx,
    [
      { x, y: surface },
      { x, y: surface - 61 },
    ],
    palette.frame,
    3,
  );
  polygon(
    ctx,
    [
      { x, y: surface - 76 },
      { x: x + 13, y: surface - 53 },
      { x: x - 13, y: surface - 53 },
    ],
    palette.light,
    palette.frame,
  );
  ctx.fillStyle = palette.frame;
  ctx.font = 'bold 14px "DM Sans", sans-serif';
  ctx.textAlign = "center";
  ctx.fillText("!", x, surface - 57);
  ctx.font = 'bold 10px "DM Sans", sans-serif';
  const width = ctx.measureText(text).width + 14;
  ctx.fillStyle = palette.frame;
  ctx.fillRect(x - width / 2, surface - 46, width, 19);
  ctx.fillStyle = palette.light;
  ctx.fillText(text, x, surface - 33);
}

function bridge(ctx, spec, bodies, terrain, palette) {
  const count = Math.max(2, spec.segments ?? 10);
  const span = spec.width / count;
  const left = spec.x - spec.width / 2;
  const planks = bodies.length
    ? bodies
    : Array.from({ length: count }, (_, i) =>
        previewBoard(left + span * (i + 0.5), spec.y, span - 2),
      );
  for (const x of [left - 7, left + spec.width + 7]) {
    const ground = groundHeight(terrain, x);
    stroke(
      ctx,
      [
        { x, y: Math.max(ground, spec.y + 28) },
        { x, y: spec.y - 44 },
      ],
      palette.frame,
      7,
    );
    circle(ctx, x, spec.y - 44, 5, palette.accent, palette.frame);
  }
  // The railing follows every live plank so flex is visible as the cart crosses.
  const rope = [
    { x: left - 7, y: spec.y - 40 },
    ...planks.map((b) => ({ x: b.position.x, y: b.position.y - 29 })),
    { x: left + spec.width + 7, y: spec.y - 40 },
  ];
  stroke(ctx, rope, palette.frame, 4);
  stroke(ctx, rope, palette.rope, 2);
  planks.forEach((b, i) => {
    if (i % 2 === 0)
      stroke(
        ctx,
        [
          { x: b.position.x, y: b.position.y - 29 },
          { x: b.position.x, y: b.position.y },
        ],
        palette.rope,
        2,
      );
    board(ctx, b, span - 2, palette);
  });
  warningSign(
    ctx,
    left - 52,
    groundHeight(terrain, left - 52),
    spec.label || "Rope bridge",
    palette,
  );
}

function seesaw(ctx, spec, bodies, terrain, palette) {
  const surface = groundHeight(terrain, spec.x);
  polygon(
    ctx,
    [
      { x: spec.x, y: spec.y - 2 },
      { x: spec.x + 28, y: Math.max(surface, spec.y + 27) },
      { x: spec.x - 28, y: Math.max(surface, spec.y + 27) },
    ],
    palette.frame,
    palette.edge,
  );
  const plank = bodies[0] || previewBoard(spec.x, spec.y, spec.width, 18);
  board(ctx, plank, spec.width, palette);
  ctx.save();
  ctx.translate(plank.position.x, plank.position.y);
  ctx.rotate(plank.angle || 0);
  for (let x = -spec.width / 2 + 15; x < spec.width / 2 - 10; x += 26)
    stroke(
      ctx,
      [
        { x, y: -7 },
        { x: x + 9, y: 7 },
      ],
      palette.edge,
      3,
    );
  ctx.restore();
  circle(ctx, spec.x, spec.y, 8, palette.accent, palette.frame);
  circle(ctx, spec.x, spec.y, 3, palette.light);
  warningSign(
    ctx,
    spec.x - spec.width / 2 - 48,
    groundHeight(terrain, spec.x - spec.width / 2 - 48),
    spec.label || "See-saw",
    palette,
  );
}

function rollers(ctx, spec, bodies, terrain, palette) {
  const wheels = bodies.length
    ? bodies
    : Array.from({ length: spec.count }, (_, i) => ({
        position: { x: spec.x + i * spec.spacing, y: spec.y },
        circleRadius: spec.radius,
        angle: 0,
      }));
  const radius = spec.radius;
  const lastX = spec.x + (spec.count - 1) * spec.spacing;
  stroke(
    ctx,
    [
      { x: spec.x - radius, y: spec.y + radius + 8 },
      { x: lastX + radius, y: spec.y + radius + 8 },
    ],
    palette.frame,
    9,
  );
  for (const body of wheels) {
    const { x, y } = body.position;
    const r = body.circleRadius || radius;
    stroke(
      ctx,
      [
        { x, y },
        { x, y: spec.y + radius + 10 },
      ],
      palette.frame,
      7,
    );
    circle(ctx, x, y, r, palette.frame, palette.edge);
    circle(ctx, x, y, r * 0.77, palette.board);
    for (let i = 0; i < 6; i++) {
      const a = body.angle + (i * TAU) / 6;
      stroke(
        ctx,
        [
          { x, y },
          { x: x + Math.cos(a) * r * 0.7, y: y + Math.sin(a) * r * 0.7 },
        ],
        palette.edge,
        3,
      );
    }
    circle(ctx, x, y, 6, palette.accent, palette.frame);
    circle(ctx, x, y, 2, palette.light);
  }
  warningSign(
    ctx,
    spec.x - radius - 48,
    groundHeight(terrain, spec.x - radius - 48),
    spec.label || "Roller bed",
    palette,
  );
}

function surfacePoints(terrain, start, end) {
  return [
    { x: start, y: groundHeight(terrain, start) - 5 },
    ...terrain
      .filter(([x]) => x > start && x < end)
      .map(([x, y]) => ({ x, y: y - 5 })),
    { x: end, y: groundHeight(terrain, end) - 5 },
  ];
}

function boost(ctx, spec, terrain, palette, time) {
  const direction = Math.sign(spec.strength ?? 1) || 1;
  const surface = surfacePoints(terrain, spec.x, spec.end);
  stroke(ctx, surface, palette.frame, 16);
  stroke(ctx, surface, palette.accent, 11);
  ctx.save();
  ctx.globalAlpha = 0.7 + Math.sin(time * 6) * 0.2;
  for (let x = spec.x + 23; x < spec.end - 13; x += 43) {
    const y = groundHeight(terrain, x) - 9;
    const angle = Math.atan2(
      groundHeight(terrain, x + 2) - groundHeight(terrain, x - 2),
      4,
    );
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    stroke(
      ctx,
      [
        { x: -7 * direction, y: -5 },
        { x: 1 * direction, y: 0 },
        { x: -7 * direction, y: 5 },
      ],
      palette.light,
      3,
    );
    ctx.restore();
  }
  ctx.restore();
  warningSign(
    ctx,
    spec.x - 40,
    groundHeight(terrain, spec.x - 40),
    spec.label || "Boost strip",
    palette,
  );
}

function wind(ctx, spec, terrain, palette, time) {
  const width = spec.end - spec.x;
  const ground = Math.min(
    ...surfacePoints(terrain, spec.x, spec.end).map((p) => p.y),
  );
  const top = Math.max(50, ground - 220);
  const lift = spec.lift ?? 0;
  const vertical = Math.sign(lift);
  const direction = Math.sign(spec.strength ?? 1) || 1;
  ctx.save();
  const glow = ctx.createLinearGradient(0, top, 0, ground + 12);
  glow.addColorStop(0, palette.wind + "00");
  glow.addColorStop(0.8, palette.wind + "22");
  glow.addColorStop(1, palette.wind + "44");
  ctx.fillStyle = glow;
  ctx.fillRect(spec.x, top, width, ground - top + 12);
  ctx.strokeStyle = palette.wind + "66";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 8]);
  for (const x of [spec.x, spec.end]) {
    ctx.beginPath();
    ctx.moveTo(x, top + 30);
    ctx.lineTo(x, groundHeight(terrain, x));
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.strokeStyle = palette.wind;
  ctx.lineWidth = 2;
  for (let i = 0; i < Math.ceil(width / 100) * 3; i++) {
    const phase = (((time * 48 + i * 83) % width) + width) % width;
    const x = spec.x + (direction > 0 ? phase : width - phase);
    const y =
      top + 43 + ((((i * 47 + vertical * time * 35) % 145) + 145) % 145);
    ctx.globalAlpha = 0.25 + Math.sin((phase / width) * Math.PI) * 0.4;
    ctx.beginPath();
    ctx.moveTo(x - direction * 32, y - vertical * 13);
    ctx.bezierCurveTo(
      x - direction * 14,
      y - 6,
      x + direction * 16,
      y + 9,
      x + direction * 24,
      y + (lift ? vertical * 21 : -3),
    );
    ctx.stroke();
    stroke(
      ctx,
      [
        { x: x + direction * 18, y: y + (lift ? vertical * 14 : -8) },
        { x: x + direction * 24, y: y + (lift ? vertical * 21 : -3) },
        { x: x + direction * 15, y: y + (lift ? vertical * 22 : -1) },
      ],
      palette.wind,
      2,
    );
  }
  ctx.restore();
  warningSign(
    ctx,
    spec.x - 35,
    groundHeight(terrain, spec.x - 35),
    spec.label ||
      (lift < 0
        ? "Updraft"
        : lift > 0
          ? "Downdraft"
          : direction < 0
            ? "Headwind"
            : "Tailwind"),
    palette,
  );
}

// The caller has already translated to world space. Live bodies are the source
// of truth; the authored geometry supplies previews before a simulation exists.
export function drawCourseFeatures(
  ctx,
  course,
  simulation,
  time = 0,
  camera = 0,
) {
  const palette = palettes[course.theme] || palettes.lagoon;
  const features =
    simulation?.features ||
    (course.features || []).map((spec) => ({ spec, bodies: [] }));
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.textBaseline = "alphabetic";
  for (const feature of features) {
    const { spec, bodies = [] } = feature;
    const left =
      spec.type === "bridge" || spec.type === "seesaw"
        ? spec.x - spec.width / 2
        : spec.type === "rollers"
          ? spec.x - spec.radius
          : spec.x;
    const right =
      spec.type === "bridge" || spec.type === "seesaw"
        ? spec.x + spec.width / 2
        : spec.type === "rollers"
          ? spec.x + (spec.count - 1) * spec.spacing + spec.radius
          : spec.end;
    if (right < camera - 120 || left > camera + 1120) continue;
    switch (spec.type) {
      case "bridge":
        bridge(ctx, spec, bodies, course.terrain, palette);
        break;
      case "seesaw":
        seesaw(ctx, spec, bodies, course.terrain, palette);
        break;
      case "rollers":
        rollers(ctx, spec, bodies, course.terrain, palette);
        break;
      case "boost":
        boost(ctx, spec, course.terrain, palette, time);
        break;
      case "wind":
        wind(ctx, spec, course.terrain, palette, time);
        break;
    }
  }
  ctx.restore();
}
