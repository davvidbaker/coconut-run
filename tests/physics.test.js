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
