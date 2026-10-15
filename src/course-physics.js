import Matter from "matter-js";
const { Bodies, Body, Composite, Constraint } = Matter;

export function createCourseFeatures(engine, course) {
  const features = [];
  for (const spec of course.features || []) {
    const bodies = [],
      constraints = [];
    const addBody = (body) => {
      body.plugin = { surface: true };
      bodies.push(body);
      Composite.add(engine.world, body);
      return body;
    };
    const pin = (options) => {
      const joint = Constraint.create(options);
      constraints.push(joint);
      Composite.add(engine.world, joint);
    };
    if (spec.type === "bridge") {
      const count = spec.segments || 6,
        length = spec.width / count,
        left = spec.x - spec.width / 2;
      for (let i = 0; i < count; i++)
        addBody(
          Bodies.rectangle(left + length * (i + 0.5), spec.y, length - 1, 12, {
            density: 0.002,
            friction: 1,
            frictionAir: 0.025,
          }),
        );
      pin({
        pointA: { x: left, y: spec.y },
        bodyB: bodies[0],
        pointB: { x: -length / 2, y: 0 },
        length: 0,
        stiffness: 0.92,
        damping: 0.3,
      });
      for (let i = 1; i < count; i++)
        pin({
          bodyA: bodies[i - 1],
          pointA: { x: length / 2, y: 0 },
          bodyB: bodies[i],
          pointB: { x: -length / 2, y: 0 },
          length: 0,
          stiffness: 0.92,
          damping: 0.3,
        });
      pin({
        bodyA: bodies.at(-1),
        pointA: { x: length / 2, y: 0 },
        pointB: { x: left + spec.width, y: spec.y },
        length: 0,
        stiffness: 0.92,
        damping: 0.3,
      });
    } else if (spec.type === "seesaw") {
      const board = addBody(
        Bodies.rectangle(spec.x, spec.y, spec.width, 14, {
          density: 0.003,
          friction: 1,
          frictionAir: 0.025,
        }),
      );
      pin({
        pointA: { x: spec.x, y: spec.y },
        bodyB: board,
        pointB: { x: 0, y: 0 },
        length: 0,
        stiffness: 1,
        damping: 0.2,
      });
      // Bump stops limit the deck to a playable tilt without forcing its angle.
      for (const side of [-1, 1])
        Composite.add(
          engine.world,
          Bodies.circle(spec.x + side * spec.width * 0.4, spec.y + 43, 8, {
            isStatic: true,
          }),
        );
    } else if (spec.type === "rollers") {
      for (let i = 0; i < spec.count; i++) {
        const body = addBody(
          Bodies.circle(spec.x + i * spec.spacing, spec.y, spec.radius, {
            density: 0.002,
            friction: 0.85,
            frictionAir: 0.018,
          }),
        );
        pin({
          pointA: { x: body.position.x, y: body.position.y },
          bodyB: body,
          pointB: { x: 0, y: 0 },
          length: 0,
          stiffness: 1,
        });
      }
    }
    features.push({ spec, bodies, constraints });
  }
  return {
    features,
    step(objects, coconuts, loaded) {
      if (!loaded) return;
      for (const { spec } of features) {
        if (!["boost", "wind"].includes(spec.type)) continue;
        const affected = new Set();
        for (const { body } of objects) {
          const root = body.parent;
          if (affected.has(root)) continue;
          affected.add(root);
          if (root.position.x < spec.x || root.position.x > spec.end) continue;
          if (
            spec.type === "boost" &&
            !root.parts.some((p) => p.bounds.max.y > 390)
          )
            continue;
          Body.applyForce(root, root.position, {
            x: root.mass * spec.strength,
            y: root.mass * (spec.lift || 0),
          });
        }
        if (spec.type === "wind")
          for (const body of coconuts)
            if (
              body.plugin.state === "live" &&
              body.position.x >= spec.x &&
              body.position.x <= spec.end
            )
              Body.applyForce(body, body.position, {
                x: body.mass * spec.strength,
                y: body.mass * (spec.lift || 0),
              });
      }
    },
  };
}
