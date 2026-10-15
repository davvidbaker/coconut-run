import { garage } from "./garage.js";
import Matter from "matter-js";
const { Bodies, Body, Composite, Constraint, Engine, Query, Vector } = Matter;
export const FINISH = 4700;
export const terrain = [
  [-600, 480],
  [650, 480],
  [850, 510],
  [1050, 510],
  [1260, 440],
  [1450, 440],
  [1630, 490],
  [1830, 490],
  [2050, 405],
  [2170, 405],
  [2350, 485],
  [2510, 485],
  [2670, 450],
  [2800, 480],
  [2940, 450],
  [3100, 480],
  [3340, 390],
  [3470, 390],
  [3650, 480],
  [3900, 480],
  [4100, 435],
  [4300, 480],
  [5100, 480],
];
export function preset(name = "cart") {
  if (garage[name]) return structuredClone(garage[name].parts);
  const beam = (x, y, x2, y2) => ({ type: "beam", x, y, x2, y2 });
  if (name === "empty") return [];
  const big = name === "monster",
    long = name === "long";
  const left = long ? 260 : 310,
    right = long ? 530 : 470,
    base = big ? 345 : 385,
    top = big ? 235 : 285;
  return [
    beam(left, top, left + 20, base),
    beam(left + 20, base, right - 20, base),
    beam(right - 20, base, right, top),
    beam(left - 30, top - 15, left, top),
    beam(right, top, right + 30, top - 15),
    { type: "wheel", x: left + 20, y: big ? 390 : 420, r: big ? 79 : 45 },
    { type: "wheel", x: right - 20, y: big ? 390 : 420, r: big ? 79 : 45 },
  ];
}
export function shape(p, options = {}) {
  const opts = { friction: 0.8, restitution: 0.05, ...options };
  if (p.type === "wheel" || p.type === "circle")
    return Bodies.circle(p.x, p.y, p.r, {
      ...opts,
      density: p.type === "wheel" ? 0.002 : 0.003,
    });
  if (p.type === "box")
    return Bodies.rectangle(
      (p.x + p.x2) / 2,
      (p.y + p.y2) / 2,
      Math.max(8, Math.abs(p.x2 - p.x)),
      Math.max(8, Math.abs(p.y2 - p.y)),
      opts,
    );
  return Bodies.rectangle(
    (p.x + p.x2) / 2,
    (p.y + p.y2) / 2,
    Math.hypot(p.x2 - p.x, p.y2 - p.y),
    12,
    { ...opts, angle: Math.atan2(p.y2 - p.y, p.x2 - p.x) },
  );
}
export function validateDesign(parts) {
  if (!parts.some((p) => p.type === "wheel"))
    return "Add at least one wheel to get moving.";
  if (!parts.some((p) => ["beam", "box", "circle"].includes(p.type)))
    return "Add a frame or basket to carry your coconuts.";
  return null;
}
export function createSimulation(parts, stiffness = 0.6, course = {}) {
  const engine = Engine.create({
    positionIterations: 10,
    velocityIterations: 10,
    constraintIterations: 8,
  });
  engine.gravity.y = course.gravity ?? 1;
  const routeTerrain = course.terrain ?? terrain;
  const finish = course.finish ?? FINISH;
  const group = Body.nextGroup(true),
    objects = [],
    wheels = [],
    coconuts = [],
    joints = [];
  for (let i = 0; i < routeTerrain.length - 1; i++) {
    const [x, y] = routeTerrain[i],
      [x2, y2] = routeTerrain[i + 1];
    const vertices = [
      { x, y },
      { x: x2, y: y2 },
      { x: x2, y: 850 },
      { x, y: 850 },
    ];
    const ground = Bodies.fromVertices(
      (x + x2) / 2,
      (Math.min(y, y2) + 850) / 2,
      [vertices],
      { isStatic: true, friction: 0.95 },
      true,
    );
    // fromVertices centers on centroid: restore authored terrain coordinates exactly.
    const minX = Math.min(...ground.vertices.map((v) => v.x)),
      minY = Math.min(...ground.vertices.map((v) => v.y));
    Body.translate(ground, { x: x - minX, y: Math.min(y, y2) - minY });
    Composite.add(engine.world, ground);
  }
  for (const p of parts.filter((p) => !["spring", "hinge"].includes(p.type))) {
    const body = shape(p, { collisionFilter: { group }, density: 0.0025 });
    body.plugin = {
      kind: p.type,
      powered: p.powered !== false,
      powerScale: p.powerScale ?? 1,
      welded: p.welded,
      assembly: p.assembly,
    };
    objects.push({ part: p, body });
    if (p.type === "wheel") wheels.push(body);
    Composite.add(engine.world, body);
  }
  // Named assemblies are rigid compound bodies; joints connect assemblies, not
  // their individual decorative beams. The open spaces remain real openings.
  const assemblies = new Map();
  for (const o of objects)
    if (o.part.assembly && (o.part.type !== "wheel" || o.part.welded)) {
      const list = assemblies.get(o.part.assembly) || [];
      list.push(o);
      assemblies.set(o.part.assembly, list);
    }
  for (const [name, list] of assemblies)
    if (list.length > 1) {
      for (const o of list) Composite.remove(engine.world, o.body);
      const root = Body.create({
        parts: list.map((o) => o.body),
        collisionFilter: { group },
        friction: 0.8,
      });
      Composite.add(engine.world, root);
      const hub = list.find((o) => o.part.welded);
      if (hub) {
        root.plugin = { ...hub.body.plugin };
        root.circleRadius = hub.part.r;
        wheels.splice(wheels.indexOf(hub.body), 1, root);
      }
    }
  const frames = objects.filter((o) => o.part.type !== "wheel");
  function joint(a, b, pointA, pointB, length = 0, s = 0.95) {
    a = a.parent;
    b = b.parent;
    const c = Constraint.create({
      bodyA: a,
      bodyB: b,
      pointA: Vector.sub(pointA, a.position),
      pointB: Vector.sub(pointB, b.position),
      length,
      stiffness: s,
      damping: 0.15,
    });
    Composite.add(engine.world, c);
    joints.push(c);
    return c;
  }
  // Weld touching frame pieces at two nearby anchors, preserving independently built assemblies.
  for (let i = 0; i < frames.length; i++)
    for (let j = i + 1; j < frames.length; j++) {
      if (
        frames[i].part.assembly &&
        frames[j].part.assembly &&
        frames[i].part.assembly !== frames[j].part.assembly
      )
        continue;
      if (frames[i].body.parent === frames[j].body.parent) continue;
      const a = frames[i].body,
        b = frames[j].body;
      const expanded = Bodies.rectangle(
        a.position.x,
        a.position.y,
        a.bounds.max.x - a.bounds.min.x + 10,
        a.bounds.max.y - a.bounds.min.y + 10,
        { isStatic: true },
      );
      if (
        Query.collides(expanded, [b]).length &&
        (Query.collides(a, [b]).length ||
          Math.min(
            ...a.vertices.flatMap((v) =>
              b.vertices.map((w) => Vector.magnitude(Vector.sub(v, w))),
            ),
          ) < 20)
      ) {
        const mid = Vector.mult(Vector.add(a.position, b.position), 0.5);
        joint(a, b, mid, mid);
        joint(a, b, { x: mid.x + 12, y: mid.y }, { x: mid.x + 12, y: mid.y });
      }
    }
  for (const wheel of wheels) {
    if (wheel.plugin.welded) continue;
    const wheelPart = objects.find((o) => o.body === wheel).part;
    const nearest = frames
      .filter(
        (o) =>
          !wheelPart.assembly ||
          !o.part.assembly ||
          o.part.assembly === wheelPart.assembly,
      )
      .map((o) => ({
        body: o.body,
        d: Math.min(
          ...o.body.vertices.map((v, i) => {
            const next = o.body.vertices[(i + 1) % o.body.vertices.length];
            const dx = next.x - v.x,
              dy = next.y - v.y;
            const t = Math.max(
              0,
              Math.min(
                1,
                ((wheel.position.x - v.x) * dx +
                  (wheel.position.y - v.y) * dy) /
                  (dx * dx + dy * dy),
              ),
            );
            return Math.hypot(
              wheel.position.x - v.x - dx * t,
              wheel.position.y - v.y - dy * t,
            );
          }),
        ),
      }))
      .sort((a, b) => a.d - b.d)[0];
    if (nearest && nearest.d < wheel.circleRadius + 65) {
      joint(nearest.body, wheel, wheel.position, wheel.position, 0, stiffness);
      if (wheelPart.welded)
        joint(
          nearest.body,
          wheel,
          { x: wheel.position.x + 12, y: wheel.position.y },
          { x: wheel.position.x + 12, y: wheel.position.y },
          0,
          1,
        );
    }
  }
  const actuators = [];
  for (const p of parts.filter((p) => ["spring", "hinge"].includes(p.type))) {
    const near = (pt) =>
      objects
        .map((o) => ({
          body: o.body,
          d: Vector.magnitude(Vector.sub(o.body.position, pt)),
        }))
        .sort((a, b) => a.d - b.d);
    const a = p.a
      ? objects.find((o) => o.part.id === p.a)
      : near({ x: p.x, y: p.y })[0];
    const b = p.b
      ? objects.find((o) => o.part.id === p.b)
      : near({ x: p.x2, y: p.y2 }).find((o) => o.body !== a?.body);
    if (a && b) {
      const c = joint(
        a.body,
        b.body,
        { x: p.x, y: p.y },
        { x: p.x2, y: p.y2 },
        Math.hypot(p.x2 - p.x, p.y2 - p.y),
        p.type === "hinge" ? 0.95 : stiffness * 0.12,
      );
      c.plugin = { kind: p.type };
      if (p.closeAfter !== undefined) {
        const ref = (objects.find((o) => o.part.id === p.ref)?.body || a.body)
          .parent;
        actuators.push({
          body: b.body.parent,
          ref,
          initialRef: ref.angle,
          hinge: c,
          latched: false,
          delay: p.closeAfter,
          target: p.closedAngle,
        });
      }
    }
  }
  let loaded = false,
    elapsed = 0,
    delivered = 0,
    fuel = 1,
    boosting = false;
  return {
    engine,
    objects,
    wheels,
    coconuts,
    joints,
    actuators,
    get fuel() {
      return fuel;
    },
    get boosting() {
      return boosting;
    },
    get elapsed() {
      return elapsed;
    },
    get delivered() {
      return delivered;
    },
    load() {
      if (loaded) return;
      loaded = true;
      for (let i = 0; i < 15; i++) {
        const c = Bodies.circle(
          350 + (i % 5) * 22,
          160 - Math.floor(i / 5) * 23,
          9,
          { density: 0.0018, friction: 0.7, restitution: 0.15 },
        );
        c.plugin = { kind: "coconut", state: "live" };
        coconuts.push(c);
        Composite.add(engine.world, c);
      }
    },
    step(dt, drive, power, boost = false) {
      // A small restart threshold keeps an empty tank from flickering each tick.
      boosting = loaded && boost && !!drive && fuel > (boosting ? 0.005 : 0.12);
      if (loaded)
        fuel = Math.max(
          0,
          Math.min(1, fuel + ((boosting ? -0.36 : 0.1) * dt) / 1000),
        );
      const motor = power * (boosting ? 1.9 : 1);
      if (loaded) elapsed += dt / 1000;
      for (const a of actuators)
        if (loaded && elapsed > a.delay && !a.latched) {
          const target = a.target + a.ref.angle - a.initialRef;
          const error = Math.atan2(
            Math.sin(target - a.body.angle),
            Math.cos(target - a.body.angle),
          );
          if (elapsed > a.delay + 1 && Math.abs(error) < 0.2) {
            const pivot = Vector.add(a.hinge.bodyA.position, a.hinge.pointA);
            const oldAnchor = a.hinge.pointB,
              anchor = Vector.rotate(oldAnchor, target - a.body.angle);
            Body.setAngle(a.body, target);
            Body.setPosition(a.body, Vector.sub(pivot, anchor));
            a.hinge.pointB = anchor;
            a.hinge.angleB = a.body.angle;
            const second = {
              x: pivot.x + Math.cos(target) * 40,
              y: pivot.y + Math.sin(target) * 40,
            };
            joint(a.hinge.bodyA, a.body, second, second, 0, 1);
            a.latched = true;
          }
          Body.setAngularVelocity(
            a.body,
            a.ref.angularVelocity +
              Math.max(-0.12, Math.min(0.12, error * 0.12)),
          );
        }
      for (const w of wheels) {
        if (!w.plugin.powered) continue;
        if (w.plugin.welded) {
          const target = drive * motor * w.plugin.powerScale * 0.23;
          Body.setAngularVelocity(
            w,
            w.angularVelocity + (target - w.angularVelocity) * 0.4,
          );
          continue;
        }
        if (drive)
          Body.setAngularVelocity(
            w,
            w.angularVelocity +
              (drive * motor * w.plugin.powerScale * 0.23 - w.angularVelocity) *
                0.08,
          );
        else Body.setAngularVelocity(w, w.angularVelocity * 0.97);
      }
      if (boosting)
        for (const { body } of objects)
          Body.applyForce(body.parent, body.position, {
            x: drive * body.mass * 0.00018,
            y: 0,
          });
      Engine.update(engine, dt);
      for (const c of coconuts) {
        if (c.plugin.state !== "live") continue;
        if (c.position.x > finish && c.position.y > 280 && c.position.y < 600) {
          c.plugin.state = "delivered";
          delivered++;
          Composite.remove(engine.world, c);
        } else if (c.position.y > 1000 || c.position.x < -500) {
          c.plugin.state = "lost";
          Composite.remove(engine.world, c);
        }
      }
    },
    get x() {
      return wheels.length
        ? wheels.reduce((s, w) => s + w.position.x, 0) / wheels.length
        : 390;
    },
    get live() {
      return coconuts.filter((c) => c.plugin.state === "live").length;
    },
    dispose() {
      Composite.clear(engine.world, false);
      Engine.clear(engine);
    },
  };
}
export function score(delivered, seconds) {
  return Math.round(
    (delivered / 15) * Math.max(0, 100 - Math.max(0, seconds - 15) * 0.7),
  );
}
