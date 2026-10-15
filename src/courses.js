import { terrain as originalTerrain } from "./physics.js";
export const courses = {
  lagoon: {
    name: "Lagoon Express",
    label: "01 / THE CLASSIC",
    description: "Rolling hills. Precious cargo. Find your rhythm.",
    terrain: originalTerrain,
    finish: 4700,
    gravity: 1,
    gold: 18,
    theme: "lagoon",
    stars: [
      { x: 1330, y: 340 },
      { x: 2100, y: 300 },
      { x: 3400, y: 285 },
    ],
  },
  dunes: {
    name: "Dune Rally",
    label: "02 / BIG AIR",
    description: "Steeper climbs, bigger jumps. Build wide. Boost wisely.",
    terrain: [
      [-600, 480],
      [700, 480],
      [950, 510],
      [1220, 360],
      [1300, 360],
      [1600, 510],
      [1820, 510],
      [2090, 340],
      [2160, 340],
      [2490, 500],
      [2740, 500],
      [2980, 400],
      [3070, 400],
      [3370, 500],
      [3640, 500],
      [3900, 380],
      [4000, 380],
      [4270, 480],
      [5100, 480],
    ],
    finish: 4700,
    gravity: 1,
    gold: 18,
    theme: "dunes",
    stars: [
      { x: 1260, y: 255 },
      { x: 2125, y: 235 },
      { x: 3950, y: 275 },
    ],
  },
  orbit: {
    name: "Coconut Orbit",
    label: "03 / LOW GRAVITY",
    description: "Same coconuts. Less gravity. Much worse decisions.",
    terrain: originalTerrain,
    finish: 4700,
    gravity: 0.48,
    gold: 22,
    theme: "orbit",
    stars: [
      { x: 1300, y: 265 },
      { x: 2100, y: 235 },
      { x: 3400, y: 220 },
    ],
  },
};
export function groundHeight(points, x) {
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i],
      b = points[i + 1];
    if (x >= a[0] && x <= b[0])
      return a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]);
  }
  return 1000;
}
export function medal(cargo, time, gold) {
  return cargo === 15 && time <= gold
    ? "gold"
    : cargo >= 12
      ? "silver"
      : cargo >= 6
        ? "bronze"
        : "try again";
}
