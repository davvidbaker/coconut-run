import test from "node:test";
import assert from "node:assert/strict";
import Matter from "matter-js";
import { createCourseFeatures } from "../src/course-physics.js";
import { courses } from "../src/courses.js";
import { createSimulation, preset } from "../src/physics.js";
const { Engine, Bodies, Composite } = Matter;
function tick(engine, n = 360) {
  for (let i = 0; i < n; i++) Engine.update(engine, 1000 / 120);
}
test("suspension bridge sags under load while its end anchors hold", () => {
  const engine = Engine.create({ constraintIterations: 8 });
  const f = createCourseFeatures(engine, {
    features: [{ type: "bridge", x: 300, y: 300, width: 360, segments: 6 }],
  });
  const load = Bodies.rectangle(300, 240, 45, 45, { density: 0.008 });
  Composite.add(engine.world, load);
  tick(engine);
  const boards = f.features[0].bodies;
  assert.ok(boards[2].position.y > 302);
  assert.ok(boards.every((b) => b.position.y < 400));
  assert.ok(Math.abs(boards[0].position.x - 150) < 15);
});
test("seesaw tips under an off-center load and remains on its pivot", () => {
  const engine = Engine.create({ constraintIterations: 8 });
  const f = createCourseFeatures(engine, {
    features: [{ type: "seesaw", x: 300, y: 300, width: 260 }],
  });
  Composite.add(engine.world, Bodies.rectangle(380, 245, 35, 35));
  tick(engine, 240);
  const board = f.features[0].bodies[0];
  assert.ok(Math.abs(board.angle) > 0.03);
  assert.ok(Math.abs(board.position.x - 300) < 2);
  assert.ok(Math.abs(board.angle) < 0.6);
});
test("wind acts on loose cargo as well as the vehicle inside its corridor", () => {
  const engine = Engine.create();
  engine.gravity.y = 0;
  const f = createCourseFeatures(engine, {
    features: [
      { type: "wind", x: 100, end: 500, strength: 0.00008, lift: -0.00003 },
    ],
  });
  const vehicle = Bodies.rectangle(200, 300, 40, 20),
    cargo = Bodies.circle(230, 300, 9),
    outside = Bodies.circle(600, 300, 9);
  cargo.plugin = { state: "live" };
  outside.plugin = { state: "live" };
  Composite.add(engine.world, [vehicle, cargo, outside]);
  for (let i = 0; i < 120; i++) {
    f.step([{ body: vehicle }], [cargo, outside], true);
    Engine.update(engine, 1000 / 120);
  }
  assert.ok(vehicle.position.x > 210);
  assert.ok(cargo.position.x > 240);
  assert.ok(cargo.position.y < 300);
  assert.equal(outside.position.x, 600);
});
test("authored seesaws settle on their pivots without intersecting the banks", () => {
  for (const course of Object.values(courses)) {
    const sim = createSimulation(preset("capsule"), 0.6, course);
    for (let i = 0; i < 120 * 5; i++) sim.step(1000 / 120, 0, 1);
    for (const feature of sim.features.filter(
      (f) => f.spec.type === "seesaw",
    )) {
      const board = feature.bodies[0];
      assert.ok(Math.abs(board.position.x - feature.spec.x) < 2, course.name);
      assert.ok(Math.abs(board.angle) < 0.1, course.name);
      assert.ok(Math.abs(board.angularVelocity) < 0.01, course.name);
    }
    sim.dispose();
  }
});
