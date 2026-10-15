const beam = (x, y, x2, y2) => ({ type: "beam", x, y, x2, y2 });
const wheel = (x, y, r) => ({ type: "wheel", x, y, r });
export const garage = {
  sandfox: {
    name: "Sandfox GT",
    tag: "LOW / WIDE / FAST",
    description:
      "A low racing buggy with swept sides, a rear wing and a long wheelbase. Fast on smooth ground; mind the landings.",
    parts: [
      beam(310, 285, 330, 385),
      beam(330, 385, 450, 385),
      beam(450, 385, 470, 285),
      beam(280, 270, 310, 285),
      beam(470, 285, 500, 270),
      beam(280, 270, 260, 245),
      beam(240, 245, 285, 245),
      wheel(300, 424, 47),
      wheel(480, 424, 47),
    ],
  },
  crawler: {
    name: "Centipede 6×6",
    tag: "SIX WHEELS / BIG PAYLOAD",
    description:
      "Six driven wheels, a deep cargo cradle and an armored nose. Built to crawl over rough ground instead of flying over it.",
    parts: [
      beam(300, 345, 330, 395),
      beam(330, 395, 465, 395),
      beam(465, 395, 500, 345),
      beam(300, 345, 285, 280),
      beam(500, 345, 515, 280),
      beam(285, 280, 310, 230),
      beam(515, 280, 485, 230),
      beam(310, 230, 332, 215),
      beam(462, 215, 485, 230),
      ...[285, 330, 375, 420, 465, 510].map((x) => wheel(x, 435, 40)),
    ],
  },
  rover: {
    name: "Moon Mantis",
    tag: "GIANT WHEELS / HIGH CLEARANCE",
    description:
      "An elevated basket straddling two enormous wheels. Clears ledges beautifully; its tall center of gravity needs a light touch.",
    parts: [
      beam(325, 335, 455, 335),
      beam(325, 335, 300, 225),
      beam(455, 335, 480, 225),
      beam(300, 225, 335, 205),
      beam(445, 205, 480, 225),
      beam(325, 335, 245, 375),
      beam(455, 335, 535, 375),
      beam(335, 335, 335, 300),
      beam(445, 335, 445, 300),
      wheel(245, 383, 92),
      wheel(535, 383, 92),
    ],
  },
  capsule: {
    name: "Coco Capsule",
    tag: "DEEP CRADLE / CARGO FIRST",
    description:
      "A protective bowl with a narrow loading mouth, four wheels and a low keel. Less glamorous than a flip. Much better for coconuts.",
    parts: [
      beam(300, 345, 330, 395),
      beam(330, 395, 465, 395),
      beam(465, 395, 500, 345),
      beam(300, 345, 285, 280),
      beam(500, 345, 515, 280),
      beam(285, 280, 310, 230),
      beam(515, 280, 485, 230),
      beam(310, 230, 332, 215),
      beam(462, 215, 485, 230),
      beam(345, 410, 450, 410),
      ...[310, 365, 430, 490].map((x) => wheel(x, 435, 40)),
    ],
  },
};

// Assemblies remain independent; explicit links are their only connections.
const piece = (id, assembly, x, y, x2, y2) => ({
  ...beam(x, y, x2, y2),
  id,
  assembly,
});
const tire = (assembly, x, y, r, extra = {}) => ({
  ...wheel(x, y, r),
  assembly,
  ...extra,
});
const basket = (assembly, left, right, top, bottom) => [
  piece(assembly + "-floor", assembly, left + 20, bottom, right - 20, bottom),
  piece(assembly + "-left", assembly, left, top, left + 20, bottom),
  piece(assembly + "-right", assembly, right - 20, bottom, right, top),
];
garage.train = {
  name: "CocoTrain",
  tag: "ARTICULATED / THREE CARS",
  description:
    "Inspired by the original CocoTrain video: a driven locomotive pulls two independent cargo cars through flexible tow links. Each car pitches with the terrain.",
  source: "https://www.youtube.com/watch?v=cJZxR09xkgU",
  parts: [
    ...basket("tender", 290, 480, 275, 390),
    tire("tender", 320, 435, 40, { powered: false }),
    tire("tender", 450, 435, 40, { powered: false }),
    ...basket("wagon", 510, 650, 315, 390),
    tire("wagon", 535, 435, 40, { powered: false }),
    tire("wagon", 625, 435, 40, { powered: false }),
    piece("engine-floor", "engine", 690, 390, 850, 390),
    piece("engine-cab", "engine", 700, 390, 700, 290),
    piece("engine-roof", "engine", 700, 290, 760, 290),
    piece("engine-front", "engine", 760, 290, 760, 390),
    piece("engine-boiler", "engine", 760, 345, 850, 345),
    piece("chimney", "engine", 820, 345, 820, 270),
    piece("chimney-cap", "engine", 805, 270, 835, 270),
    tire("engine", 715, 430, 45),
    tire("engine", 830, 430, 45),
    {
      type: "hinge",
      x: 460,
      y: 390,
      x2: 530,
      y2: 390,
      a: "tender-floor",
      b: "wagon-floor",
    },
    {
      type: "hinge",
      x: 630,
      y: 390,
      x2: 700,
      y2: 390,
      a: "wagon-floor",
      b: "engine-floor",
    },
  ],
};
garage.gimbal = {
  name: "The Pendulum",
  tag: "FREE PIVOT / SWINGING PAYLOAD",
  description:
    "The outer gantry rolls and tilts while a deep basket hangs from a single free pivot. Twin powered lids close over the load, then the sealed cargo basket swings independently of the chassis.",
  parts: [
    piece("arch-top", "gantry", 240, 80, 540, 80),
    piece("arch-riser-left", "gantry", 240, 80, 240, 190),
    piece("arch-riser-right", "gantry", 540, 80, 540, 190),
    piece("arch-stem", "gantry", 390, 80, 390, 235),
    piece("arch-left", "gantry", 240, 190, 240, 390),
    piece("arch-right", "gantry", 540, 190, 540, 390),
    piece("foot-left", "gantry", 240, 390, 280, 410),
    piece("foot-right", "gantry", 540, 390, 500, 410),
    tire("gantry", 250, 415, 60),
    tire("gantry", 530, 415, 60),
    ...basket("swing", 310, 470, 250, 340),
    piece("hanger", "swing", 390, 235, 390, 340),
    piece("swing-lid-left", "lid-left", 310, 250, 310, 170),
    piece("swing-lid-right", "lid-right", 470, 250, 470, 170),
    {
      type: "hinge",
      x: 310,
      y: 250,
      x2: 310,
      y2: 250,
      a: "swing-left",
      b: "swing-lid-left",
      closeAfter: 1.6,
      closedAngle: 0,
      ref: "hanger",
    },
    {
      type: "hinge",
      x: 470,
      y: 250,
      x2: 470,
      y2: 250,
      a: "swing-right",
      b: "swing-lid-right",
      closeAfter: 1.6,
      closedAngle: Math.PI,
      ref: "hanger",
    },
    {
      type: "hinge",
      x: 390,
      y: 235,
      x2: 390,
      y2: 235,
      a: "arch-top",
      b: "hanger",
    },
  ],
};
const rim = [];
const cx = 390,
  cy = 330,
  r = 145;
for (let i = 0; i < 25; i++) {
  const a = ((-60 + i * 12) * Math.PI) / 180,
    b = ((-60 + (i + 1) * 12) * Math.PI) / 180;
  rim.push(
    piece(
      "rim" + i,
      "ring",
      cx + Math.cos(a) * r,
      cy + Math.sin(a) * r,
      cx + Math.cos(b) * r,
      cy + Math.sin(b) * r,
    ),
  );
}
garage.hamster = {
  name: "The Coconut Hamster",
  tag: "ROLLING CAGE / MOTOR-CLOSED HATCH",
  description:
    "Inspired by the original zero-wheel ring: coconuts ride inside the rolling frame. A hinged loading hatch closes after the cargo drops, then the entire cage becomes the wheel.",
  source: "https://www.youtube.com/watch?v=TsUPFJD62-Q",
  parts: [
    ...rim,
    piece("spoke1", "ring", 390, 330, 390, 475),
    piece("spoke2", "ring", 390, 330, 535, 330),
    piece("spoke3", "ring", 390, 330, 245, 330),
    tire("ring", 390, 330, 12, { welded: true, powerScale: 0.6 }),
    piece("hatch", "hatch", 317.5, 204.43, 317.5, 59.43),
    {
      type: "hinge",
      x: 317.5,
      y: 204.43,
      x2: 317.5,
      y2: 204.43,
      a: "rim24",
      b: "hatch",
      closeAfter: 1.6,
      closedAngle: 0,
      ref: "rim0",
    },
  ],
};
