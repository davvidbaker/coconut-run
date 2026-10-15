// Each section combines a climb, landing, rough patch and recovery stretch.
function route(section, repeats) {
  const points = [
    [-600, 480],
    [650, 480],
  ];
  const width = section.at(-1)[0];
  for (let n = 0; n < repeats; n++)
    for (const [x, y] of section)
      if (x > 0)
        points.push([
          650 + n * width + x,
          480 + (y - 480) * [1, 1.15, 0.85, 1.25, 1.1, 0.95, 1.2][n % 7],
        ]);
  const finish = 650 + repeats * width + 350;
  points.push([finish + 500, 480]);
  return { terrain: points, finish };
}
const lagoon = route(
  [
    [0, 480],
    [200, 480],
    [450, 380],
    [650, 380],
    [850, 500],
    [1050, 500],
    [1200, 450],
    [1270, 480],
    [1420, 435],
    [1500, 480],
    [1700, 480],
    [1900, 405],
    [2100, 480],
    [2200, 480],
  ],
  6,
);
const dunes = route(
  [
    [0, 480],
    [240, 510],
    [450, 365],
    [550, 365],
    [750, 520],
    [900, 520],
    [901, 495],
    [1100, 495],
    [1300, 315],
    [1400, 315],
    [1660, 515],
    [1830, 515],
    [1980, 430],
    [2070, 500],
    [2200, 405],
    [2300, 480],
    [2600, 480],
  ],
  7,
);
const orbit = route(
  [
    [0, 480],
    [350, 510],
    [620, 330],
    [700, 330],
    [1100, 530],
    [1350, 530],
    [1530, 420],
    [1640, 490],
    [1830, 360],
    [1920, 360],
    [2300, 515],
    [2510, 515],
    [2700, 385],
    [2830, 480],
    [3100, 480],
  ],
  7,
);
function stars(route) {
  return [0.28, 0.58, 0.86].map((t) => {
    const x = 650 + (route.finish - 1000) * t;
    return { x, y: groundHeight(route.terrain, x) - 110 };
  });
}

export const COURSE_VERSION = 2;
export const courses = {
  lagoon: {
    name: "Lagoon Express",
    label: "01 / THE CLASSIC",
    description:
      "A long run of hills, washboard sections and tricky landings. A real endurance delivery.",
    ...lagoon,
    gravity: 1,
    gold: 38,
    theme: "lagoon",
    stars: stars(lagoon),
  },
  dunes: {
    name: "Dune Rally",
    label: "02 / BIG AIR",
    description:
      "A marathon of steep dunes, step-ups and successive jumps. Smooth throttle beats blind speed.",
    ...dunes,
    gravity: 1,
    gold: 60,
    theme: "dunes",
    stars: stars(dunes),
  },
  orbit: {
    name: "Coconut Orbit",
    label: "03 / LOW GRAVITY",
    description:
      "An endurance run in low gravity. Long launches and awkward landings punish top-heavy builds.",
    ...orbit,
    gravity: 0.48,
    gold: 80,
    theme: "orbit",
    stars: stars(orbit),
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
