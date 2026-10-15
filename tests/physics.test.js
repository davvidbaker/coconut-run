import test from "node:test";
import assert from "node:assert/strict";
import {
  preset,
  createSimulation,
  validateDesign,
  score,
} from "../src/physics.js";
test("starter cart delivers all fifteen coconuts using actual wheel physics", () => {
  const s = createSimulation(preset());
  s.load();
  s.load();
  assert.equal(s.coconuts.length, 15);
  for (let i = 0; i < 120 * 55 && s.delivered < 15; i++)
    s.step(1000 / 120, i > 240 ? 1 : 0, 1);
  assert.equal(s.delivered, 15);
  assert.ok(s.elapsed < 55);
  assert.ok(s.x > 4500);
  s.dispose();
});
test("unpowered cart stays at the workshop and retains its cargo", () => {
  const s = createSimulation(preset());
  s.load();
  for (let i = 0; i < 120 * 5; i++) s.step(1000 / 120, 0, 1);
  assert.ok(Math.abs(s.x - 390) < 40);
  assert.equal(s.delivered, 0);
  assert.equal(s.live, 15);
  assert.ok(s.coconuts.every((c) => c.position.y < 480));
  s.dispose();
});
test("unattached parts do not magically weld across the canvas", () => {
  const s = createSimulation([
    { type: "beam", x: 100, y: 100, x2: 200, y2: 100 },
    { type: "beam", x: 700, y: 100, x2: 800, y2: 100 },
    { type: "wheel", x: 150, y: 145, r: 40 },
  ]);
  assert.equal(s.joints.length, 1);
  s.dispose();
});
test("design validation and efficiency scoring", () => {
  assert.ok(validateDesign([]));
  assert.equal(validateDesign(preset()), null);
  assert.equal(score(15, 15), 100);
  assert.equal(score(0, 10), 0);
  assert.ok(score(15, 40) < score(15, 20));
});

import { courses, medal } from "../src/courses.js";
test("boost consumes fuel, stops on an empty tank and recharges off throttle", () => {
  const s = createSimulation(preset());
  s.load();
  for (let i = 0; i < 120; i++) s.step(1000 / 120, 0, 1, true);
  assert.equal(s.fuel, 1);
  for (let i = 0; i < 300; i++) s.step(1000 / 120, 1, 1, true);
  assert.ok(s.fuel < 0.15);
  const low = s.fuel;
  for (let i = 0; i < 120; i++) s.step(1000 / 120, 0, 1, false);
  assert.ok(s.fuel > low + 0.09);
  s.dispose();
});
test("long courses remain completable with the protective cargo capsule", () => {
  for (const course of Object.values(courses)) {
    const s = createSimulation(preset("capsule"), 0.6, course);
    s.load();
    for (let i = 0; i < 120 * 160 && s.delivered < 15; i++)
      s.step(1000 / 120, i > 240 ? 1 : 0, 1);
    assert.equal(s.delivered, 15, course.name);
    s.dispose();
  }
});
test("orbit changes actual physics gravity", () => {
  const s = createSimulation(preset(), 0.6, courses.orbit);
  assert.equal(s.engine.gravity.y, 0.48);
  s.dispose();
});
test("gold requires a perfect fast delivery, other medals reward retained cargo", () => {
  assert.equal(medal(15, 17, 18), "gold");
  assert.equal(medal(15, 25, 18), "silver");
  assert.equal(medal(8, 17, 18), "bronze");
  assert.equal(medal(2, 17, 18), "try again");
});

test("custom garage builds have distinct connected wheel layouts and deliver cargo on the original course", () => {
  for (const [name, wheels] of [
    ["sandfox", 2],
    ["crawler", 6],
    ["rover", 2],
    ["capsule", 4],
  ]) {
    const s = createSimulation(preset(name));
    assert.equal(s.wheels.length, wheels);
    s.load();
    for (let i = 0; i < 120 * 40 && s.delivered < 15; i++)
      s.step(1000 / 120, i > 240 ? 1 : 0, 1);
    assert.equal(s.delivered, 15, name);
    s.dispose();
  }
});
test("endurance courses exceed the original length and have distinct obstacles", () => {
  assert.ok(courses.lagoon.finish > 14000);
  assert.ok(courses.dunes.finish > 19000);
  assert.ok(courses.orbit.finish > 22000);
  for (const course of Object.values(courses)) {
    assert.equal(course.sections.length, 7, course.name);
    assert.ok(course.features.length >= 4, course.name);
    assert.ok(
      course.terrain.every((p, i, a) => !i || p[0] > a[i - 1][0]),
      course.name,
    );
    assert.ok(
      course.sections.every((s, i, a) => s.hint && (!i || s.x > a[i - 1].x)),
      course.name,
    );
  }
  assert.ok(
    courses.lagoon.features.filter((f) => f.type === "bridge").length >= 3,
  );
  assert.ok(courses.dunes.features.some((f) => f.type === "rollers"));
  assert.ok(courses.orbit.features.some((f) => f.type === "wind"));
});

test("video-inspired starters preserve independent articulation and deliver their cargo", () => {
  for (const id of ["train", "gimbal", "hamster"]) {
    const s = createSimulation(preset(id));
    const hinges = s.joints.filter((j) => j.plugin?.kind === "hinge");
    assert.ok(hinges.length > 0, id);
    assert.ok(
      hinges.every((j) => j.bodyA !== j.bodyB),
      id,
    );
    s.load();
    for (let i = 0; i < 120 * 65 && s.delivered < 15; i++)
      s.step(1000 / 120, i > 384 ? 1 : 0, 1);
    assert.equal(s.delivered, 15, id);
    if (s.actuators.length)
      assert.ok(
        s.actuators.every((a) => a.latched),
        id,
      );
    s.dispose();
  }
});
