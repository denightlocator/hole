var DP_CFG = {
  chat: "!dp",
  item: "",
  range: 40,
  summon: 2.5,
  circleDist: 4,
  rise: 16,
  hitPlayers: true,
  kill: true,
  damage: 40,
  boom: 1,
  beam: 0.5,
  hold: 0.8,
  radius: 16,
  knockback: 24,
  hurtCaster: false,
  merge: true,
  mergeDist: 4,
  megaScale: 2.2,
  megaRise: 22,
  nukeRadius: 44,
  nukeDamage: 400,
  nukeKnockback: 30,
  rotate: true,
  sounds: true,
  hideDist: 160,
  maxCasts: 4,
  detail: 3,
  maxMeshes: 399,
  nodes: "",
  ringParticles: true,
  vortex: true,
}

var DP_COL = {
  white: [255, 255, 255],
  purple: [150, 55, 255],
  deep: [82, 26, 172],
  night: [38, 12, 80],
  magenta: [255, 55, 215],
  lilac: [212, 172, 255],
  cyan: [70, 230, 255],
  gold: [255, 205, 45],
  smoke: [58, 40, 70],
  shade: [26, 16, 36],
  void: [14, 6, 22],
  wine: [64, 12, 58],
  blood: [132, 8, 24],
  crimson: [235, 26, 46],
  volt: [178, 96, 255],
}

var DP_CIRCLE = [
  [16, 3.6, 1.46, 0.24, 0.06, "wine", 0, 0, 0, 0, "k"],
  [16, 3.2, 1.3, 0.08, 0.06, "blood", 11.25, 0, 3, 0],
  [8, 3.4, 0.3, 0.1, 0.07, "crimson", 0, 0.01, 6, 0, "r"],
  [8, 3.4, 0.14, 0.14, 0.07, "blood", 22.5, 0.01, 9, 0],
  [8, 2.6, 2.16, 0.1, 0.06, "blood", 22.5, 0, 12, 0],
  [3, 1.3, 4.5, 0.12, 0.06, "crimson", 0, 0.02, 16, 0.05, "k"],
  [3, 1.3, 4.5, 0.12, 0.06, "crimson", 60, 0.02, 16, 0.05, "k"],
  [6, 0.9, 1.04, 0.14, 0.06, "wine", 0, 0.04, 21, -0.08],
  [4, 0.42, 0.84, 0.1, 0.06, "blood", 0, 0.06, 24, 0.12],
  [4, 4.7, 1.5, 0.2, 0.06, "blood", 0, 0, 27, 0, "r"],
  [4, 4.35, 0.8, 0.12, 0.06, "wine", 45, 0, 29, 0, "r"],
  [8, 3.1, 2.57, 0.1, 0.08, "blood", 0, 1.2, 31, 0.05, "ke"],
  [8, 2.6, 2.15, 0.1, 0.08, "wine", 22.5, 2.4, 33, -0.06, "ke"],
  [8, 2.1, 1.74, 0.1, 0.08, "crimson", 0, 3.6, 35, 0.07, "ke"],
  [8, 1.6, 1.33, 0.1, 0.08, "blood", 22.5, 4.8, 37, -0.08, "ke"],
  [6, 1.1, 1.27, 0.1, 0.08, "wine", 0, 6, 39, 0.09, "ke"],
  [4, 0.6, 1.2, 0.1, 0.08, "crimson", 0, 7.2, 41, -0.1, "ke"],
  [1, 0, 0.5, 0.5, 0.5, "crimson", 0, 0.7, 44, 0, "spink"],
  [1, 0, 1.1, 1.1, 0.08, "void", 0, 0.08, 44, 0.2, "k"],
]

var DP_SND = {
  cast: [["ominousBellHit", 1, 0.9], ["magicAccent2", 0.9, 0.8]],
  ring: [["harp_pling", 0.7, 1]],
  pulse: [["lowDrum1", 0.8, 1]],
  build: [["suspenseRiser", 1, 1.2]],
  emerge: [["gorillaRoar1", 1, 0.7], ["hauntedHorrorImpact", 0.9, 1], ["bigDrumSwish1", 1, 1]],
  lock: [["bearRoar3", 1, 1.3], ["sonarBeep", 0.6, 1.6]],
  dive: [["drumSwish1", 1, 0.8]],
  flare: [["zapAccent2", 0.8, 1.3], ["firecracker1", 0.7, 1]],
  beam: [["futureStrangePulse", 1, 1.6], ["zapAccent1", 1, 1.4]],
  blast: [["cannonFire2", 1, 0.7], ["bassattack", 1, 0.6]],
  merge: [["futureStrangePulse", 1, 1], ["gorillaRoar1", 1, 0.5], ["zapAccent1", 1, 0.6]],
  climb: [["suspenseRiser", 1, 1.5]],
  nuke: [["cannonFire1", 1, 0.4], ["cannonFire3", 1, 0.55], ["hauntedHorrorImpact", 1, 0.6]],
  rumble: [["lowDrum3", 1, 0.5]],
}

var DP_MESH = {
  pillar: [["M", 1, 14, 1, "crimson", 0, 0, 7, "spin"]],

  head: [
    ["M", 1.4, 1.1, 1.4, "night", 0, 0, 0],
    ["M", 1.1, 0.7, 1, "night", 1.1, 0, 0.05],
    ["M", 0.85, 0.5, 0.8, "night", 1.9, 0, -0.02],
    ["M", 0.95, 0.24, 1.5, "void", 1.25, 0, -0.62],
    ["M", 0.26, 0.26, 1.6, "void", -1.2, 0.5, 0.8, "m"],
    ["M", 0.24, 0.7, 0.6, "deep", -0.4, 0, 0.9],
    ["M", 0.14, 0.24, 0.42, "crimson", 0.6, 0.76, 0.22, "m"],
    ["M", 0.16, 0.8, 1, "void", -0.5, 0.8, -0.05, "m"],
    ["M", 0.7, 0.2, 0.6, "void", 2, 0, -0.72, "2"],
    ["M", 0.22, 0.22, 1, "void", -2.1, 0.6, 1.1, "m2"],
    ["M", 0.24, 0.5, 0.6, "deep", 0.2, 0, 0.8, "2"],
    ["M", 0.24, 0.5, 0.6, "deep", -1, 0, 0.8, "2"],
    ["M", 0.12, 0.4, 0.6, "void", 0.55, 0.71, 0.2, "m2"],
    ["M", 0.4, 0.18, 0.9, "void", 0.55, 0.6, 0.52, "m2"],
    ["M", 0.14, 0.42, 0.14, "void", 2.15, 0.4, -0.42, "m2"],
    ["M", 0.12, 0.3, 0.12, "void", 2.15, 0.26, -0.42, "m2"],
    ["M", 0.7, 0.36, 0.5, "deep", 0.75, 0, -0.3, "2"],
    ["M", 0.22, 0.3, 0.3, "void", 2.05, 0, 0.33, "2"],
    ["M", 0.26, 0.14, 1.2, "void", 1.3, 0, 0.44, "2"],
    ["M", 0.1, 0.1, 1.5, "crimson", 1.5, 0.75, -0.1, "m2"],
    ["M", 0.34, 0.2, 0.34, "crimson", 0.45, 0, 0.6, "2"],
    ["M", 1, 0.6, 0.6, "void", -0.95, 0, 0.5, "2"],
    ["M", 0.2, 0.6, 0.5, "void", 0.25, 0.62, -0.45, "m2"],
    ["M", 0.16, 0.16, 0.6, "deep", -2.8, 0.68, 1.35, "m3"],
    ["M", 0.06, 0.26, 0.12, "void", 0.66, 0.83, 0.22, "m3"],
    ["M", 0.12, 0.2, 0.7, "deep", -1.1, 0.86, 0.3, "m3"],
    ["M", 0.12, 0.2, 0.7, "deep", -1.1, 0.86, -0.3, "m3"],
    ["M", 0.1, 0.26, 0.1, "void", 1.6, 0.44, -0.4, "m3"],
    ["M", 0.06, 0.14, 0.8, "void", 1.1, 0.46, -0.36, "m3"],
    ["M", 0.36, 0.08, 1, "deep", 1.3, 0, -0.47, "3"],
    ["M", 0.16, 0.14, 0.2, "deep", 2.2, 0.26, 0.24, "m3"],
    ["M", 0.08, 0.08, 0.9, "blood", 0.5, 1.05, -0.3, "m3"],
    ["M", 0.7, 0.5, 0.6, "void", -1.45, 0, 0.7, "3"],
    ["M", 0.3, 0.26, 0.5, "void", 1, 0, -0.84, "3"],
    ["M", 0.18, 0.5, 0.18, "blood", 0.75, 0, -1, "3"],
    ["M", 0.12, 0.3, 0.12, "void", 1.3, 0.36, -0.84, "m3"],
  ],

  body: [
    ["M", 1.3, 1.15, 1.1, "night", -1.35, 0, 0],
    ["M", 0.25, 0.81, 0.8, "deep", -1.35, 0, 0.95, "2"],
    ["M", 0.91, 0.14, 0.95, "blood", -1.35, 0, -0.61, "2"],
    ["M", 0.1, 0.52, 0.6, "crimson", -1.3, 0.68, 0.09, "m3"],
    ["M", 1.25, 1.1, 1.1, "void", -2.5, 0, 0],
    ["M", 0.25, 0.77, 0.8, "deep", -2.5, 0, 0.91],
    ["M", 0.88, 0.14, 0.95, "blood", -2.5, 0, -0.59, "2"],
    ["M", 0.1, 0.5, 0.6, "crimson", -2.45, 0.66, 0.09, "m3"],
    ["M", 1.7, 0.12, 1, "deep", -2.6, 1.4, -0.1, "m2"],
    ["M", 0.5, 0.1, 1.5, "blood", -3.2, 2.3, -0.05, "m3"],
    ["M", 1.2, 1.05, 1.1, "night", -3.65, 0, 0],
    ["M", 0.25, 0.74, 0.8, "deep", -3.65, 0, 0.87, "2"],
    ["M", 0.84, 0.14, 0.95, "blood", -3.65, 0, -0.57, "2"],
    ["M", 0.1, 0.47, 0.6, "crimson", -3.6, 0.63, 0.08, "m3"],
    ["M", 1.15, 1, 1.1, "void", -4.8, 0, 0],
    ["M", 0.25, 0.7, 0.8, "deep", -4.8, 0, 0.83, "2"],
    ["M", 0.8, 0.14, 0.95, "blood", -4.8, 0, -0.54, "2"],
    ["M", 0.1, 0.45, 0.6, "crimson", -4.75, 0.6, 0.08, "m3"],
    ["M", 1.1, 0.95, 1.1, "night", -5.95, 0, 0],
    ["M", 0.25, 0.66, 0.8, "deep", -5.95, 0, 0.78],
    ["M", 0.77, 0.14, 0.95, "blood", -5.95, 0, -0.52, "2"],
    ["M", 0.1, 0.43, 0.6, "crimson", -5.9, 0.58, 0.08, "m3"],
    ["M", 1, 0.9, 1.1, "void", -7.1, 0, 0],
    ["M", 0.25, 0.63, 0.8, "deep", -7.1, 0, 0.75, "2"],
    ["M", 0.7, 0.14, 0.95, "blood", -7.1, 0, -0.49, "2"],
    ["M", 1.2, 0.12, 0.8, "deep", -7.2, 1.05, -0.1, "m2"],
    ["M", 0.95, 0.85, 1.1, "night", -8.25, 0, 0],
    ["M", 0.25, 0.59, 0.8, "deep", -8.25, 0, 0.7, "2"],
    ["M", 0.66, 0.14, 0.95, "blood", -8.25, 0, -0.46, "2"],
    ["M", 0.1, 0.38, 0.6, "crimson", -8.2, 0.51, 0.07, "m3"],
    ["M", 0.85, 0.75, 1.1, "void", -9.4, 0, 0],
    ["M", 0.24, 0.53, 0.8, "deep", -9.4, 0, 0.62],
    ["M", 0.59, 0.14, 0.95, "blood", -9.4, 0, -0.41, "2"],
    ["M", 0.75, 0.65, 1.1, "night", -10.55, 0, 0],
    ["M", 0.21, 0.46, 0.6, "deep", -10.55, 0, 0.54, "2"],
    ["M", 0.52, 0.14, 0.95, "blood", -10.55, 0, -0.36, "2"],
    ["M", 0.1, 0.29, 0.6, "crimson", -10.5, 0.41, 0.05, "m3"],
    ["M", 0.62, 0.55, 1.1, "void", -11.65, 0, 0],
    ["M", 0.18, 0.39, 0.6, "deep", -11.65, 0, 0.46, "2"],
    ["M", 0.43, 0.14, 0.95, "blood", -11.65, 0, -0.32, "2"],
    ["M", 0.5, 0.45, 1.05, "night", -12.7, 0, 0],
    ["M", 0.15, 0.31, 0.6, "deep", -12.7, 0, 0.37, "2"],
    ["M", 0.38, 0.35, 1, "void", -13.7, 0, 0],
    ["M", 0.12, 0.24, 0.6, "deep", -13.7, 0, 0.29, "2"],
    ["M", 0.7, 0.14, 0.8, "deep", -14.4, 0.4, 0, "m"],
    ["M", 0.14, 0.6, 0.7, "crimson", -14.35, 0, 0.3, "2"],
    ["M", 0.2, 0.2, 0.6, "blood", -15, 0, 0, "3"],
  ],

  beam: [
    ["M", 0.61, 1, 1.48, "void", 0, 0, 0],
    ["M", 0.61, 1, 1.48, "void", 0, 0, 0, "", 45],
    ["M", 0.61, 1, 1.48, "void", 0, 0, 0, "", 90],
    ["M", 0.61, 1, 1.48, "void", 0, 0, 0, "", 135],
    ["M", 0.35, 1, 0.35, "crimson", 1.15, 0, 0],
    ["M", 0.35, 1, 0.35, "crimson", -1.15, 0, 0],
    ["M", 0.35, 1, 0.35, "deep", 0.575, 0.996, 0, "m"],
    ["M", 0.35, 1, 0.35, "deep", -0.575, 0.996, 0, "m"],
  ],

  beam2: [
    ["M", 0.5, 1, 0.5, "night", 2.1, 0, 0],
    ["M", 0.5, 1, 0.5, "night", -2.1, 0, 0],
    ["M", 0.5, 1, 0.5, "night", 0, 2.1, 0, "m"],
    ["M", 0.28, 1, 0.28, "blood", 1.485, 1.485, 0, "m"],
    ["M", 0.28, 1, 0.28, "crimson", -1.485, 1.485, 0, "m"],
  ],

  blast: [
    ["M", 1.1, 1.1, 1.1, "crimson", 0, 0, 0],
    ["M", 1.1, 1.1, 1.1, "crimson", 0, 0, 0, "f"],
    ["M", 1.1, 1.1, 1.1, "blood", 0, 0, 0, "o"],
    ["M", 3.4, 0.3, 0.3, "blood", 0, 0, 0],
    ["M", 0.34, 3, 0.34, "night", 0, 0, 0],
    ["M", 0.3, 0.3, 3.4, "blood", 0, 0, 0],
    ["M", 0.3, 0.3, 3.4, "blood", 0, 0, 0, "f"],
    ["M", 0.3, 0.3, 3.4, "blood", 0, 0, 0, "g"],
    ["M", 0.2, 0.2, 2.6, "night", 0, 0, 0, "u"],
    ["M", 0.2, 0.2, 2.6, "night", 0, 0, 0, "v"],
    ["M", 0.2, 0.2, 2.6, "night", 0, 0, 0, "w"],
    ["M", 0.2, 0.2, 2.6, "night", 0, 0, 0, "x"],
    ["M", 0.22, 0.22, 2.8, "crimson", 0, 0, 0, "a"],
    ["M", 0.22, 0.22, 2.8, "deep", 0, 0, 0, "b"],
    ["M", 0.22, 0.22, 2.8, "deep", 0, 0, 0, "c"],
    ["M", 0.22, 0.22, 2.8, "crimson", 0, 0, 0, "d"],
  ],

  beamTop: [
    ["M", 2.2, 2.2, 2.2, "crimson", 0, 0, 0],
    ["M", 1.84, 0.16, 4.43, "blood", 0, 0, 0],
    ["M", 1.22, 0.26, 2.96, "wine", 0, 0, 0],
  ],
}

var DP_ORBS = [
  [-3.5, 2.2, 1],
  [-7, -2.3, 0.4],
  [-10.5, 2, -0.5],
  [-14, -1.9, 0.9],
  [-17.5, 1.5, 0.2],
]

var DP_DIAG = {
  a: [1, 1, 1],
  b: [-1, 1, 1],
  c: [1, 1, -1],
  d: [-1, 1, -1],
  f: [1, 0, 1],
  g: [1, 0, -1],
  h: [0.5, 0, 0.866],
  j: [0.866, 0, 0.5],
  q: [1, 0, 0],
  o: [0, 1, 1],
  u: [0.924, 0, 0.383],
  v: [0.383, 0, 0.924],
  w: [-0.383, 0, 0.924],
  x: [-0.924, 0, 0.383],
}

var DP_FX = {
  mote: { tex: "glint", life: [0.5, 0.9], size: [0.15, 0.35], speed: [2, 5], col: ["tint", "tint2"], fade: [1, 0], blend: 2 },
  flash: { tex: "square_particle", life: [0.15, 0.3], size: [1.5, 3.5], speed: [2, 6], col: ["white", "lilac"], fade: [1, 0], blend: 2, drag: 0.2 },
  aura: { tex: "square_particle", life: [0.4, 0.7], size: [0.4, 0.9], speed: [0.2, 1], col: ["tint", "tint2"], fade: [0.9, 0], blend: 2 },
  outline: { tex: "glint", life: [0.3, 0.5], size: [0.3, 0.6], speed: [0.2, 0.8], col: ["volt", "magenta"], fade: [1, 0], blend: 2 },
  wisp: { tex: "soul_0", life: [0.6, 1], size: [0.6, 1.2], speed: [0.1, 0.5], col: ["volt", "crimson"], fade: [0.7, 0], blend: 2 },
  impact: { tex: "critical_hit", life: [0.3, 0.5], size: [0.4, 0.9], speed: [4, 9], grav: -6, col: ["gold", "magenta"], fade: [1, 0], blend: 2, drag: 0.3 },
  ring: { tex: "square_particle", life: [0.35, 0.5], size: [0.3, 0.5], speed: [14, 18], col: ["white", "magenta"], fade: [1, 0], blend: 2, drag: 0.3, flat: 1 },
  wave: { tex: "square_particle", life: [0.6, 0.85], size: [0.8, 1.5], speed: [30, 42], col: ["white", "magenta"], fade: [1, 0], blend: 2, drag: 0.4, flat: 1 },
  smoke: { tex: "square_particle", life: [1.2, 2], size: [1.5, 3], speed: [0.5, 2], grav: 0.8, col: ["smoke", "shade"], fade: [0.85, 0], blend: 1, drag: 0.2 },
  trail: { tex: "square_particle", life: [1, 1.6], size: [0.5, 1.1], speed: [0, 0.3], col: ["tint", "tint2"], fade: [0.7, 0], blend: 2 },
  spark: { tex: "glint", life: [0.5, 1], size: [0.25, 0.5], speed: [1, 4], col: ["purple", "magenta"], fade: [1, 0], blend: 2, drag: 0.2 },
  ember: { tex: "square_particle", life: [0.9, 1.6], size: [0.12, 0.3], speed: [0.4, 1.8], grav: 2.5, col: ["tint", "tint2"], fade: [1, 0], blend: 2, hot: 1 },
  streak: { tex: "glint", life: [0.2, 0.35], size: [0.2, 0.45], speed: [10, 16], col: ["white", "lilac"], fade: [1, 0], blend: 2, drag: 0.5, tight: 1 },
  gather: { tex: "glint", life: [0.35, 0.5], size: [0.2, 0.4], speed: [5, 7], col: ["tint", "tint2"], fade: [0.4, 1], blend: 2, tight: 1 },
  debris: { tex: "square_particle", life: [0.7, 1.2], size: [0.2, 0.5], speed: [8, 15], grav: -14, col: ["magenta", "purple"], fade: [1, 0], blend: 2, hot: 1 },
  shock: { tex: "square_particle", life: [0.4, 0.6], size: [0.5, 1], speed: [12, 16], col: ["tint", "tint2"], fade: [1, 0], blend: 2, drag: 0.3, hot: 1 },
  puff: { tex: "square_particle", life: [1.3, 1.9], size: [1.6, 3], speed: [0, 0], grav: 0.5, col: ["smoke", "shade"], fade: [0.9, 0], blend: 1, drag: 0.15 },
  cloud: { tex: "square_particle", life: [0.3, 0.42], size: [0.55, 0.95], speed: [0, 0], col: ["wine", "night"], fade: [0.85, 0], blend: 1 },
  front: { tex: "square_particle", life: [0.55, 0.6], size: [0.5, 0.9], speed: [0, 0], col: ["tint", "tint2"], fade: [1, 0], blend: 2, drag: 0.25, hot: 1 },
  ray: { tex: "critical_hit", life: [0.3, 0.36], size: [0.3, 0.6], speed: [0, 0], col: ["crimson", "blood"], fade: [1, 0], blend: 2, drag: 0.3 },
  glow: { tex: "square_particle", life: [0.25, 0.4], size: [1.4, 2.6], speed: [0, 0.5], col: ["tint", "white"], fade: [0.35, 0], blend: 2 },
}
var DP_DARK = { white: "crimson", lilac: "deep", magenta: "blood", cyan: "wine", gold: "crimson", purple: "deep", volt: "deep" }
var dpTint = (n) => DP_COL[DP_DARK[n] || n]
var DP_SKIN = [
  ["purple", "magenta"],
  ["deep", "volt"],
  ["magenta", "volt"],
  ["crimson", "purple"],
]
var DP_RITE = [
  ["blood", "crimson"],
  ["wine", "blood"],
  ["crimson", "wine"],
]

var dpAdd = (a, b, s) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s]
var dpSub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
var dpLen = (a) => Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2])
var dpNorm = (a) => {
  var l = dpLen(a)
  return l < 1e-6 ? [0, 0, 1] : [a[0] / l, a[1] / l, a[2] / l]
}
var dpBasis = (f) => {
  var r = Math.abs(f[1]) > 0.999 ? [1, 0, 0] : dpNorm([f[2], 0, -f[0]])
  return [f, r, [f[1] * r[2] - f[2] * r[1], f[2] * r[0] - f[0] * r[2], f[0] * r[1] - f[1] * r[0]]]
}
var dpAt = (p, B, fw, rt, up) => [
  p[0] + B[0][0] * fw + B[1][0] * rt + B[2][0] * up,
  p[1] + B[0][1] * fw + B[1][1] * rt + B[2][1] * up,
  p[2] + B[0][2] * fw + B[1][2] * rt + B[2][2] * up,
]
var dpSound = (cue, pos, pitch) => {
  if (!DP_CFG.sounds) return
  DP_SND[cue].forEach((s) => {
    try {
      api.broadcastSound(s[0], s[1], s[2] * (pitch || 1), { playerIdOrPos: pos, maxHearDist: 110, refDistance: 14 })
    } catch (e) {}
  })
}
var dpLifeforms = () => api.getMobIds().concat(api.getPlayerIds())
var DP_UP = dpBasis([0, 0, 1])
var DP_RING = DP_CIRCLE.map((r) => ["M", r[3], r[4], r[2], r[5], 0, 0, 0, r[10] || ""])

var dpCasts = []
var dpOther = () => (typeof goodra !== "undefined" && goodra && goodra.ids ? goodra.ids.length : 0)
var dpMeshes = 0
var dpRowCache = {}

var dpFlag = (row, flag) => (row[8] || "").indexOf(flag) >= 0

function dpRows(name) {
  var key = name + DP_CFG.detail
  if (dpRowCache[key]) return dpRowCache[key]
  var out = []
  ;(DP_MESH[name] || []).forEach((r) => {
    var level = dpFlag(r, "3") ? 3 : dpFlag(r, "2") ? 2 : 1
    if (level > DP_CFG.detail) return
    if (!dpFlag(r, "m")) return out.push(r)
    var left = r.slice()
    left[6] = -r[6]
    out.push(r, left)
  })
  if (name === "body") out.sort((a, b) => b[5] - a[5])
  return (dpRowCache[key] = out)
}

function dpBox(row, tint, k) {
  var col = DP_COL[row[4] === "tint" ? tint : row[4]]
  var lit = dpFlag(row, "lit")
  return {
    width: row[1] * k,
    height: row[2] * k,
    depth: row[3] * k,
    diffuseColor: lit ? col : [0, 0, 0],
    emissiveColor: lit ? col.map((v) => v * 0.55) : col,
    autoRotate: dpFlag(row, "spin"),
    hideDist: DP_CFG.hideDist,
  }
}

function dpPut(c, key, row, tint, pos, f, k) {
  var id = c.m[key]
  var fresh = !id
  if (fresh) {
    if (dpMeshes + dpOther() >= DP_CFG.maxMeshes) return
    id = api.attemptCreateMeshEntity("Box", dpBox(row, tint, k || 1))
    if (!id) return
    c.m[key] = id
    dpMeshes++
  }
  api.setPosition(id, pos[0], pos[1], pos[2])
  if (f && DP_CFG.rotate && !dpFlag(row, "spin") && (fresh || (c.t + key.length) % 2 === 0)) {
    api.setEntityRotation(id, -Math.asin(Math.max(-1, Math.min(1, f[1]))), Math.atan2(f[0], f[2]), 0)
  }
}

function dpGroup(c, name, tag, tint, pos, B, k, still) {
  var rows = dpRows(name)
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i]
    dpPut(c, tag + i, r, tint, dpAt(pos, B, r[5] * k, r[6] * k, r[7] * k), still ? null : B[0], k)
  }
}

function dpResize(c, name, tag, tint, k) {
  dpRows(name).forEach((r, i) => {
    var id = c.m[tag + i]
    if (id) api.updateMeshEntity(id, "Box", dpBox(r, tint, k))
  })
}

function dpDrop(c, tag) {
  for (var key in c.m) {
    if (key.indexOf(tag) !== 0) continue
    try {
      api.deleteMeshEntity(c.m[key])
    } catch (e) {}
    delete c.m[key]
    dpMeshes--
  }
}

function dpAlong(c, name) {
  var rows = dpRows(name)
  var P = c.path
  var j = P.length - 1
  var walked = 0
  for (var i = 0; i < rows.length && j > 0; i++) {
    var r = rows[i]
    var back = -r[5] * c.k
    var seg = dpLen(dpSub(P[j], P[j - 1]))
    while (walked + seg < back && j > 1) {
      walked += seg
      j--
      seg = dpLen(dpSub(P[j], P[j - 1]))
    }
    if (walked + seg < back) return
    var f = dpNorm(dpSub(P[j], P[j - 1]))
    dpPut(c, name + "_" + i, r, "", dpAt(P[j], dpBasis(f), walked - back, r[6] * c.k, r[7] * c.k), f, c.k)
  }
}

function dpBars(c, name, tag, base, k, w, tall) {
  dpRows(name).forEach((r, i) => {
    dpPut(c, tag + i, r, "", dpAt(base, DP_UP, r[5] * w, r[6] * w, tall / 2), null, k)
    var box = dpBox(r, "", w)
    box.height = tall
    if (!c.m[tag + i]) return
    api.updateMeshEntity(c.m[tag + i], "Box", box)
    if (r[9]) api.setEntityRotation(c.m[tag + i], 0, (r[9] * Math.PI) / 180, 0)
  })
}

var dpTurn = [
  [0, 0, 1],
  [0.707, 0, 0.707],
  [1, 0, 0],
  [0.707, 0, -0.707],
]

function dpBeam(c, base, k, tall, wide, two) {
  var w = k * (wide || 1)
  dpBars(c, "beam", "beam_", base, k, w, tall)
  if (two) dpBars(c, "beam2", "beam_b", base, k, w, tall * two)
  var top = DP_MESH.beamTop
  dpSize = 2 * k
  dpShape("ray", dpAdd(base, [0, 1, 0], tall), dpBall(10), 1.1 * k, 0)
  dpSize = 1
  for (var n = 0; n < 4; n++) dpPut(c, "beam_base" + n, top[1], "", dpAdd(base, [0, 1, 0], 0.1), dpTurn[n], w)
  for (var n = 0; n < 8; n++) dpPut(c, "beam_ring" + n, top[2], "", dpAdd(base, [0, 1, 0], tall * (((n >> 2) / 2 + c.t * 0.11) % 1)), dpTurn[n % 4], k)
  dpFx("mote", base, 8, 1.4 * k, "magenta", "white", [0, 1, 0])
  dpFx("flash", dpAdd(base, [0, 1, 0], tall), 6, k)
  dpFx("glow", dpAdd(base, [0, 1, 0], tall), 2, k, "magenta")
  dpColumnFx(c, base, k, tall, wide || 1)
  if (c.t % 2 === 0) dpRingFx("shock", base, 1.6 * k * (wide || 1), 3, 0.7, 0.1, "magenta", "lilac", 6, c.t)
}

function dpHold(c, base, k, tall, h, hold, pitch) {
  var p = h / hold
  if (h === 0) dpSound("beam", base, pitch * 0.75)
  if (h % 4 === 0) dpSound("pulse", base, pitch * (1 + p))
  dpBeam(c, base, k, tall, 1 + p * 0.35 + Math.sin(h * 1.6) * 0.08, Math.min(1, (h + 1) / 4))
  if (h % 2 === 0) dpRingFx("gather", dpAdd(base, [0, 1, 0], 0.6), 5 * k, 3, -1, 0.05, "cyan", "magenta", 6, h * 0.5)
  dpFx("glow", dpAdd(base, [0, 1, 0], 1), 1, 0.5 * k, p > 0.6 ? "white" : "cyan")
  if (h % 3 === 0) dpFx("gather", dpAdd(base, [0, 1, 0], tall), 6, 2 * k, "cyan", "white", [0, -1, 0])
}

function dpBurst(c, name, tag, at, k) {
  dpRows(name).forEach((r, i) => {
    var d = DP_DIAG[r[8]]
    dpPut(c, tag + i, r, "", at, d ? dpNorm(d) : null, k)
  })
}

function dpBlast(c, base, k, e, ring) {
  var g = 1 - Math.pow(1 - Math.min(1, (e + 1) / 8), 2)
  var size = k * (1.5 + 4.5 * g) * (e > 10 ? Math.max(0.15, 1 - (e - 10) / 6) : 1)
  if (e === 0) dpBurst(c, "blast", "blast_", dpAdd(base, [0, 1, 0], k), size)
  dpResize(c, "blast", "blast_", "", size)
  if (e === 0 || e === 3 || e === 6) {
    var j = e / 3
    dpSize = k
    dpShape("front", dpAdd(base, [0, 1, 0], 0.4 + j * 1.6 * k), dpRing(Math.min(64, 28 + 12 * k) - j * 8, e), ring * 0.1, ring * 2.5 * (1 - j * 0.3), j ? "blood" : "crimson", "wine")
    dpSize = 1
  }
  dpFx("flash", base, 12, (2 + e * 0.6) * k)
  dpFx("impact", base, 8, 2.5 * k)
  dpFx("debris", base, 10, 2 * k, "", "", [0, 1, 0])
  dpFx("ember", base, 8, ring * g * 0.5, "crimson", "blood", null, 2)
  if (e % 3 === 0) dpFx("wave", base, 14, 0.5)
  if (e % 2 === 0) dpRingFx("shock", base, ring * (0.1 + g * 0.8), 4, 1, 0.08, "crimson", "blood", 10, e * 0.4)
  var sweep = [0, 48, 40, 0, 40, 32][e]
  if (sweep) {
    dpSize = k * 1.3
    dpShape("front", dpAdd(base, [0, 1, 0], 0.3), dpRing(sweep, e * 0.4), ring * 0.08, ring * (2.6 - e * 0.32), e % 2 ? "crimson" : "wine", e > 3 ? "void" : "blood")
    dpSize = 1
  }
  if (e === 0 || e === 4) {
    var dome = dpBall(e ? 40 : 56).filter((d) => d[1] > -0.05)
    dpSize = k * (e ? 1.6 : 1.2)
    dpShape(e ? "puff" : "front", dpAdd(base, [0, 1, 0], k), dome, ring * 0.12, ring * (e ? 0.5 : 1.5), "crimson", "blood", e ? 1 : 0)
    dpSize = 1
  }
  if (e === 0) {
    dpFx("glow", base, 10, 3 * k, "crimson")
    dpRingFx("smoke", base, ring * 0.2, 4, 1, 0.3, "", "", 8)
  }
}

function dpFinale(c, base, k, tall, ring, slow, burst) {
  var wait = Math.max(1, Math.round(DP_CFG.beam * 20 * slow))
  var hold = Math.max(1, Math.round(DP_CFG.hold * 20 * slow))
  var fall = Math.round(6 * slow)
  var h = c.t - wait
  var f = h - hold
  var e = f - fall
  if (c.t === 0) dpSound("beam", base, 1 / slow)
  if (h < 0) return dpBeam(c, base, k, (tall * (c.t + 1)) / wait), 0
  if (f < 0) return dpHold(c, base, k, tall, h, hold, 1 / slow), 0
  if (e < 0) {
    var p = (f + 1) / fall
    if (f === 0) dpSound("dive", base, 0.6 / slow)
    dpBeam(c, base, k, tall * (1 - p) + 0.6, 1.35 + p * 1.3, 1)
    dpFx("streak", dpAdd(base, [0, 1, 0], tall * (1 - p)), 10, 2 * k, "", "", [0, -1, 0])
    return 0
  }
  if (e === 0) dpDrop(c, "beam_")
  dpBlast(c, base, burst, e, ring)
  return e === 0 ? 1 : e >= 16 ? 2 : 0
}

function dpCarrier(c, key, pos, f, turn) {
  var id = c.m[key]
  if (!id) {
    if (dpMeshes + dpOther() >= DP_CFG.maxMeshes) return
    var tiny = { width: 0.05, height: 0.05, depth: 0.05, emissiveColor: DP_COL.white, hideDist: DP_CFG.hideDist }
    id = DP_CFG.nodes === "person" ? api.attemptCreateMeshEntity("Person", { size: 1, hideDist: DP_CFG.hideDist }) : api.attemptCreateMeshEntity("Box", tiny)
    if (!id) return
    c.m[key] = id
    c.fresh = true
    dpMeshes++
  } else c.fresh = false
  api.setPosition(id, pos[0], pos[1], pos[2])
  if (f) api.setEntityRotation(id, -Math.asin(Math.max(-1, Math.min(1, f[1]))), Math.atan2(f[0], f[2]), 0)
  else api.setEntityRotation(id, 0, turn || 0, 0)
  return id
}

var dpHang = (id, row, k, off, yaw) => api.updateEntityNodeMeshAttachment(id, "TorsoNode", "Box", dpBox(row, "", k), off, [0, yaw, 0])

function dpRigid(c, name, tag, pos, B, k) {
  if (c.nk !== k) dpDrop(c, tag)
  c.nk = k
  var id = dpCarrier(c, tag + "c", pos, B[0])
  if (id && c.fresh) dpRows(name).forEach((r) => dpHang(id, r, k, [r[6] * k, r[7] * k, r[5] * k], 0))
}

function dpEmitter(rad, col) {
  var a = DP_COL[col]
  var b = DP_COL.crimson
  return {
    texture: "square_particle",
    minLifeTime: 0.24,
    maxLifeTime: 0.36,
    minEmitPower: 0.05,
    maxEmitPower: 0.25,
    minSize: 0.12,
    maxSize: 0.24,
    gravity: [0, 0.4, 0],
    velocityGradients: [{ timeFraction: 0, factor: 1, factor2: 1 }],
    colorGradients: [
      { timeFraction: 0, minColor: b.concat(1), maxColor: b.concat(1) },
      { timeFraction: 0.3, minColor: a.concat(1), maxColor: b.concat(1) },
      { timeFraction: 1, minColor: a.concat(0), maxColor: a.concat(0) },
    ],
    blendMode: 2,
    hideDist: DP_CFG.hideDist,
    width: rad * 2,
    depth: rad * 2,
    height: 0.08,
    emitRate: Math.round(30 + rad * 40),
    emitterShape: "ring",
  }
}

function dpCircle(c) {
  var node = DP_CFG.nodes
  for (var a = 0; a < DP_CIRCLE.length; a++) {
    var r = DP_CIRCLE[a]
    var age = c.ct - r[8]
    var row = DP_RING[a]
    if (age < 0) continue
    if (age === 0) dpSound("ring", c.home, 0.8 + a * 0.07)
    var radial = dpFlag(row, "r")
    if (DP_CFG.ringParticles && dpFlag(row, "e")) {
      if (!c.m["ring" + a + "_e"] && dpMeshes + dpOther() < DP_CFG.maxMeshes) {
        try {
          var e = api.attemptCreateMeshEntity("ParticleEmitter", dpEmitter(r[1], r[5]))
          if (e) {
            c.m["ring" + a + "_e"] = e
            dpMeshes++
            api.setPosition(e, c.home[0], c.home[1] + r[7], c.home[2])
          }
        } catch (err) {
          DP_CFG.ringParticles = false
        }
      }
      if (DP_CFG.ringParticles) continue
    }
    if (node) {
      var id = dpCarrier(c, "ringc" + r[9], c.home, null, -r[9] * c.ct)
      if (!id || c.hung[a]) continue
      c.hung[a] = 1
      for (var n = 0; n < r[0]; n++) {
        var ang = (r[6] * Math.PI) / 180 + (n * 2 * Math.PI) / r[0] - r[9] * r[8]
        dpHang(id, row, 1, [Math.cos(ang) * r[1], r[7], Math.sin(ang) * r[1]], radial ? Math.atan2(Math.cos(ang), Math.sin(ang)) : Math.atan2(-Math.sin(ang), Math.cos(ang)))
      }
      continue
    }
    if ((age > 0 && !r[9]) || (c.ph && !dpFlag(row, "k"))) continue
    for (var n = 0; n < r[0]; n++) {
      var ang = (r[6] * Math.PI) / 180 + (n * 2 * Math.PI) / r[0] + r[9] * age
      var x = Math.cos(ang)
      var z = Math.sin(ang)
      dpPut(c, "ring" + a + "_" + n, row, "", [c.home[0] + x * r[1], c.home[1] + r[7], c.home[2] + z * r[1]], radial ? [x, 0, z] : [-z, 0, x])
    }
  }
}

function dpFx(look, pos, n, spread, tint, tint2, dir, tall, vel) {
  var L = DP_FX[look]
  var S = 0.6
  var go = vel && dpLen(vel) > 1e-6
  if (vel) dir = null
  var a = dpTint(L.col[0] === "tint" ? tint : L.col[0])
  var b = dpTint(L.col[1] === "tint" ? tint : L.col[1] === "tint2" ? tint2 : L.col[1])
  var y = L.flat ? 0.04 : 1
  var w = L.tight ? 0.06 : 0.25
  var hot = DP_COL.crimson.concat(L.fade[0])
  var grad = [
    { timeFraction: L.hot ? 0.3 : 0, minColor: a.concat(L.fade[0]), maxColor: b.concat(L.fade[0]) },
    { timeFraction: 1, minColor: a.concat(L.fade[1]), maxColor: b.concat(L.fade[1]) },
  ]
  if (L.hot) grad.unshift({ timeFraction: 0, minColor: hot, maxColor: hot })
  api.playParticleEffect({
    dir1: vel ? (go ? vel : [0, 1, 0]) : dir ? dpAdd(dir, [1, 1, 1], -w) : [-1, -y, -1],
    dir2: vel ? (go ? vel : [0, 1, 0]) : dir ? dpAdd(dir, [1, 1, 1], w) : [1, y, 1],
    pos1: [pos[0] - spread, pos[1] - (tall ? 0 : spread), pos[2] - spread],
    pos2: [pos[0] + spread, pos[1] + (tall || spread), pos[2] + spread],
    texture: L.tex,
    minLifeTime: L.life[0] * S,
    maxLifeTime: L.life[1] * S,
    minEmitPower: vel ? (go ? 1 / S : 0) : L.speed[0] / S,
    maxEmitPower: vel ? (go ? 1 / S : 0) : L.speed[1] / S,
    minSize: L.size[0] * dpSize,
    maxSize: L.size[1] * dpSize,
    manualEmitCount: n,
    gravity: [0, (L.grav || 0) / (S * S), 0],
    colorGradients: grad,
    velocityGradients: [
      { timeFraction: 0, factor: 1, factor2: 1 },
      { timeFraction: 1, factor: L.drag || 1, factor2: L.drag || 1 },
    ],
    blendMode: L.blend,
    hideDist: DP_CFG.hideDist,
  })
}

var dpSize = 1
var dpBalls = {}
var dpBall = (n) =>
  dpBalls[n] ||
  (dpBalls[n] = Array.from({ length: n }, (_, i) => {
    var y = 1 - (2 * i + 1) / n
    var r = Math.sqrt(1 - y * y)
    return [Math.cos(i * 2.39996) * r, y, Math.sin(i * 2.39996) * r]
  }))
var dpRing = (n, turn) => Array.from({ length: n }, (_, i) => [Math.cos((i / n) * 6.2832 + (turn || 0)), 0, Math.sin((i / n) * 6.2832 + (turn || 0))])

function dpShape(look, at, dirs, rad, grow, tint, tint2, rise) {
  dirs.forEach((d) => dpFx(look, dpAdd(at, d, rad), 1, 0, tint, tint2, null, 0, [d[0] * grow, d[1] * grow + (rise || 0), d[2] * grow]))
}

function dpRingFx(look, pos, rad, n, out, lift, tint, tint2, pts, turn) {
  pts = pts || 6
  for (var i = 0; i < pts; i++) {
    var a = (i / pts) * 6.2832 + (turn || 0)
    var x = Math.cos(a)
    var z = Math.sin(a)
    dpFx(look, [pos[0] + x * rad, pos[1], pos[2] + z * rad], n, (rad * 3.2) / pts, tint, tint2, [x * out, lift, z * out], 0.3)
  }
}

function dpColumnFx(c, base, k, tall, wide) {
  var r = 1.5 * k * wide
  dpFx("streak", base, 6, r, "", "", [0, 1, 0], tall)
  dpFx("ember", base, 5, r * 1.6, "magenta", "lilac", null, tall)
  for (var i = 0; i < 3; i++) {
    var a = c.t * 0.7 + i * 2.094
    var h = tall * ((c.t * 0.09 + i / 3) % 1)
    dpFx("spark", [base[0] + Math.cos(a) * r * 1.3, base[1] + h, base[2] + Math.sin(a) * r * 1.3], 3, 0.2 * k, "", "", [-Math.sin(a), 0.6, Math.cos(a)])
  }
}

var dpNext = (c) => {
  c.ph++
  c.t = -1
}

function dpGoal(c) {
  if (c.target) {
    try {
      var p = api.getPosition(c.target)
      if (p) c.goal = [p[0], p[1] + 0.9, p[2]]
    } catch (e) {
      c.target = null
    }
  }
  return c.goal
}

function dpFly(c, pos) {
  var last = c.path[c.path.length - 1]
  var f = dpNorm(dpSub(pos, last))
  var k = c.k
  c.path.push(pos)
  if (c.path.length > 60) c.path.shift()
  if (DP_CFG.nodes) dpRigid(c, "head", "head_", pos, dpBasis(f), k)
  else dpGroup(c, "head", "head_", "", pos, dpBasis(f), k)
  dpAlong(c, "body")
  var skin = DP_SKIN[c.t % DP_SKIN.length]
  dpFx("aura", pos, 5, 0.9 * k, skin[0], skin[1])
  dpFx("outline", pos, 3, 1.1 * k)
  dpFx("streak", pos, 3, 0.8 * k, "", "", [-f[0], -f[1], -f[2]])
  var n = c.path.length
  var mid = c.path[Math.max(0, n - 2 - ((c.t * 3) % 9))]
  var skin2 = DP_SKIN[(c.t + 2) % DP_SKIN.length]
  dpFx("aura", mid, 4, 0.7 * k, skin2[0], skin2[1])
  if (c.t % 2 === 0) dpFx("wisp", c.path[Math.max(0, n - 10)], 2, 0.6 * k)
  for (var q = 0; q < 5; q++) {
    dpSize = k * (1 - q * 0.17)
    dpFx("trail", c.path[Math.max(0, n - 13 - q * 3)], 1, 0.3 * k, q < 2 ? "purple" : "deep", "blood")
  }
  dpSize = k
  var o = DP_ORBS[c.t % DP_ORBS.length]
  var j = Math.max(1, n - 1 - Math.round((-o[0] * k) / 1.1))
  var at = dpAt(c.path[j], dpBasis(dpNorm(dpSub(c.path[j], c.path[j - 1]))), 0, o[1] * k, o[2] * k)
  dpShape("cloud", at, dpBall(9), 0.45 * k, 0.4)
  dpFx("mote", at, 1, 0.1, "crimson", "blood")
  dpSize = 1
  dpFx("ember", c.path[Math.max(0, n - 6 - ((c.t * 5) % 14))], 3, 0.8 * k, skin2[0], "lilac")
  dpVortex(c)
}

function dpVortexLook(k) {
  var a = DP_COL.void
  var b = DP_COL.wine
  var d = DP_COL.shade
  return {
    texture: "square_particle",
    minLifeTime: 0.5,
    maxLifeTime: 0.8,
    minEmitPower: 0,
    maxEmitPower: 0.3,
    minSize: 0.5 * k,
    maxSize: 1.1 * k,
    gravity: [0, 0.3, 0],
    velocityGradients: [{ timeFraction: 0, factor: 1, factor2: 1 }],
    colorGradients: [
      { timeFraction: 0, minColor: b.concat(0.9), maxColor: d.concat(0.9) },
      { timeFraction: 0.4, minColor: a.concat(0.8), maxColor: d.concat(0.8) },
      { timeFraction: 1, minColor: a.concat(0), maxColor: a.concat(0) },
    ],
    blendMode: 1,
    hideDist: DP_CFG.hideDist,
    width: 0.5 * k,
    depth: 0.5 * k,
    height: 0.5 * k,
    emitRate: 70,
    emitterShape: "box",
  }
}

function dpVortex(c) {
  if (!DP_CFG.vortex) return
  var n = c.path.length
  for (var i = 0; i < 2; i++) {
    var key = "vortex" + i
    if (c.vk !== c.k && c.m[key]) dpDrop(c, key)
    if (!c.m[key]) {
      if (dpMeshes + dpOther() >= DP_CFG.maxMeshes) return
      try {
        var e = api.attemptCreateMeshEntity("ParticleEmitter", dpVortexLook(c.k))
        if (!e) return
        c.m[key] = e
        dpMeshes++
      } catch (err) {
        DP_CFG.vortex = false
        return
      }
    }
    var j = Math.max(1, n - 1 - (i ? 14 : 5))
    var B = dpBasis(dpNorm(dpSub(c.path[j], c.path[j - 1])))
    var ang = c.t * 0.7 + i * Math.PI
    var at = dpAt(c.path[j], B, 0, Math.cos(ang) * 1.3 * c.k, Math.sin(ang) * 1.3 * c.k)
    api.setPosition(c.m[key], at[0], at[1], at[2])
  }
  c.vk = c.k
}

function dpSpiral(c, mid, rad, turn) {
  c.ang += turn
  c.at = [mid[0] + Math.cos(c.ang) * rad, mid[1], mid[2] + Math.sin(c.ang) * rad]
  dpFly(c, c.at)
}

var DP_PHASE = [
  function (c) {
    var T = (c.T = Math.max(46, Math.round(DP_CFG.summon * 20)))
    c.ct = c.t
    if (c.t === 0) dpSound("cast", c.home)
    if (c.t % 10 === 5) dpSound("pulse", c.home, 0.7 + c.t / T)
    dpCircle(c)
    var skin = DP_RITE[c.t % DP_RITE.length]
    dpFx("mote", c.home, c.t > T - 12 ? 8 : 3, 2.6, skin[0], skin[1], [0, 1, 0])
    if (c.t % 10 === 9) dpRingFx("shock", c.home, 0.6, 2, 1, 0.03, "blood", "crimson", 6, c.t)
    if (c.t % 2 === 0) dpFx("ember", c.home, 3, 3.4, skin[0], "crimson", null, 0.4)
    if (c.t % 3 === 0 && c.t > 12) dpRingFx("gather", dpAdd(c.home, [0, 1, 0], 0.5), 3.6, 2, -1, 0.05, "crimson", "purple", 6, c.t * 0.3)
    if (c.t > T - 16) dpFx("mote", c.home, 4, 0.5, "crimson", "blood", [0, 1, 0], 0.5)
    if (c.t > T - 6 && c.t % 2 === 0) dpFx("glow", dpAdd(c.home, [0, 1, 0], 0.7), 1, 0.3, "crimson")
    if (c.t === T - 24) dpSound("build", c.home)
    if (c.t >= T - 1) dpNext(c)
  },

  function (c) {
    var h = c.t + 1
    var mid = [c.home[0], c.home[1] - 2 + h * 1.25, c.home[2]]
    if (c.t === 0) {
      c.path = [[mid[0], mid[1] - 1.5, mid[2]]]
      dpGroup(c, "pillar", "pillar_", "", c.home, DP_UP, 1, true)
      dpFx("flash", c.home, 12, 1.5)
      dpFx("ring", c.home, 20, 0.4)
      dpFx("glow", c.home, 5, 1.5, "crimson")
      dpFx("debris", c.home, 10, 1.2, "", "", [0, 1, 0])
      dpRingFx("shock", c.home, 1.5, 4, 1, 0.08, "crimson", "purple", 8)
      dpSound("emerge", c.home)
    }
    c.ct = c.T + c.t
    if (c.t === 0 && !DP_CFG.nodes) DP_RING.forEach((row, a) => dpFlag(row, "k") || dpDrop(c, "ring" + a + "_"))
    dpCircle(c)
    if (c.t === 7) dpDrop(c, "pillar_")
    dpFx("mote", c.home, 6, 2.6, "crimson", "purple", [0, 1, 0])
    dpFx("streak", c.home, 4, 1.2, "", "", [0, 1, 0], h * 1.2)
    if (c.t % 3 === 1) dpRingFx("shock", c.home, 1 + c.t * 0.35, 2, 0.6, 0.05, "blood", "crimson", 6, c.t)
    dpSpiral(c, mid, Math.min(2, h * 0.2), 0.5)
    if (mid[1] >= c.home[1] + c.reach) {
      dpDrop(c, "ring")
      dpDrop(c, "pillar_")
      dpNext(c)
    }
  },

  function (c) {
    var top = [c.home[0], c.home[1] + c.reach + Math.sin(c.t * 0.5) * 0.8, c.home[2]]
    dpSpiral(c, top, Math.min(3.5, 2 + c.t * 0.15), 0.45)
    if (c.t < 11) return
    if (!c.target) c.target = dpPick(c.id, c.home)
    var goal = dpGoal(c)
    c.far = Math.max(1, dpLen(dpSub(goal, c.at)))
    dpFx("ring", goal, 14, 0.3)
    dpFx("impact", goal, 6, 0.5)
    dpRingFx("gather", goal, 3.2, 4, -1, 0, "cyan", "white", 8)
    dpFx("glow", goal, 2, 0.3, "cyan")
    dpRingFx("shock", c.at, 1.5, 3, 1, 0, "lilac", "magenta", 6)
    dpSound("lock", c.at)
    dpSound("dive", c.at)
    dpNext(c)
  },

  function (c) {
    var goal = dpGoal(c)
    var left = dpLen(dpSub(goal, c.at))
    var speed = 1.15
    if (left <= speed || c.t > 70) {
      c.spin = Math.atan2(c.at[2] - goal[2], c.at[0] - goal[0])
      return dpNext(c)
    }
    var B = dpBasis(dpNorm(dpSub(goal, c.at)))
    c.at = dpAdd(c.at, B[0], speed)
    var weave = Math.min(2.2, left * 0.25, c.t * 0.3)
    var arch = Math.sin(Math.PI * Math.min(1, left / c.far)) * Math.min(4, c.far * 0.2)
    dpFly(c, dpAt(c.at, B, 0, Math.sin(c.t * 0.42) * weave, Math.sin(c.t * 0.21 + 1) * weave * 0.6 + arch))
  },

  function (c) {
    var goal = dpGoal(c)
    var rad = c.t < 4 ? 0.65 * (c.t + 1) : 2.6 - (c.t - 3) * 0.15
    var ang = c.spin + c.t * 0.55
    dpFly(c, [goal[0] + Math.cos(ang) * rad, goal[1] - 0.5 + c.t * 0.2, goal[2] + Math.sin(ang) * rad])
    if (c.t === 2 || c.t === 7) {
      var at = dpAt(goal, c.B, 0, c.t === 2 ? -0.8 : 0.9, c.t === 2 ? 0.2 : 0.7)
      for (var j = 1; j < 5; j++) dpShape("ray", at, dpBall(12), 0.3 * j, 3 * j)
      dpFx("impact", at, 12, 0.3)
      dpFx("glow", at, 3, 0.4, c.t === 2 ? "cyan" : "gold")
      dpRingFx("shock", at, 0.6, 3, 1, 0, "lilac", c.t === 2 ? "cyan" : "gold", 6)
      dpSound("flare", at, c.t === 2 ? 1 : 1.2)
    }
    if (c.t >= 11) dpNext(c)
  },

  function (c) {
    var goal = dpGoal(c)
    var b = DP_CFG.boom
    if (c.t === 0) dpDrop(c, "")
    var st = dpFinale(c, [goal[0], goal[1] - 1, goal[2]], 2 * b, 72 * b, DP_CFG.radius, 1, b)
    if (st === 1) {
      dpSound("blast", goal)
      dpHurt(c, goal, DP_CFG.radius, DP_CFG.damage, DP_CFG.knockback)
    }
    if (st === 2) dpNext(c)
  },

  function (c) {
    if (c.t === 0) dpDrop(c, "blast_")
    var b = 1.2 * DP_CFG.boom
    if (c.t % 8 === 0 && c.t < 17) dpShape("puff", [c.goal[0], c.goal[1] + 1.5 * b + c.t * 0.1, c.goal[2]], dpBall(c.t ? 14 : 26), (2.2 - c.t * 0.08) * b, 1.2, "", "", 0.8)
    if (c.t === 0) dpShape("puff", [c.goal[0], c.goal[1] + 0.5, c.goal[2]], dpRing(20), 2 * b, 4)
    if (c.t < 26 && c.t % 2 === 0) dpFx("smoke", dpAt(c.goal, c.B, 0, 0, 1.5 * b), 7, 2.5 * b)
    if (c.t % 3 === 0) dpFx("spark", dpAt(c.goal, c.B, 0, 0, 0.5), 7, 2.5 * b)
    if (c.t < 28) dpFx("ember", c.goal, 4, 3 * b, "magenta", "purple", null, 1)
    if (c.t < 12 && c.t % 3 === 0) dpRingFx("smoke", c.goal, 2 + c.t * 0.5, 2, 0.6, 0.1, "", "", 6, c.t)
    if (c.t >= 35) c.ph = 99
  },

  function (c) {
    var h = c.t + 1
    if (c.t === 0) {
      dpFx("flash", c.base, 20, 3)
      dpFx("wave", c.base, 20, 0.5)
      dpFx("glow", c.base, 8, 2.5, "cyan")
      dpRingFx("shock", c.base, 2, 6, 1, 0, "cyan", "magenta", 8)
      dpRingFx("shock", c.base, 1, 4, 0.5, 1, "lilac", "magenta", 6, 0.5)
      dpSound("merge", c.base)
      dpSound("climb", c.base)
    }
    dpSpiral(c, [c.base[0], c.base[1] + h * 0.8, c.base[2]], Math.min(4, h * 0.4), 0.36)
    if (c.t % 4 === 0) dpFx("ring", c.at, 12, 0.5)
    if (c.t % 3 === 0) dpRingFx("gather", c.at, 6, 3, -1, 0, "cyan", "magenta", 6, c.t)
    if (h * 0.8 >= c.reach) dpNext(c)
  },

  function (c) {
    var b = DP_CFG.boom
    if (c.t === 0) {
      dpDrop(c, "")
      c.ground = dpAdd(c.at, [0, -1, 0], dpFree(c.at, [0, -1, 0], 60) - 1)
      c.tall = c.at[1] - c.ground[1] + 50
      c.goal = c.ground
    }
    var st = dpFinale(c, c.ground, 4.5 * b, c.tall, DP_CFG.nukeRadius, 1.2, 3 * b)
    if (st === 1) {
      dpSound("nuke", c.ground)
      dpHurt(c, c.ground, DP_CFG.nukeRadius, DP_CFG.nukeDamage, DP_CFG.nukeKnockback, true)
    }
    if (st === 2) dpNext(c)
  },

  function (c) {
    var b = DP_CFG.boom
    if (c.t === 0) dpDrop(c, "blast_")
    if (c.t % 8 === 0 && c.t < 33) dpSound("rumble", c.ground, 1 - c.t * 0.01)
    var wide = (4 + 16 * (1 - Math.pow(1 - Math.min(1, (c.t + 1) / 26), 2))) * b
    dpSize = 2.4
    if (c.t % 8 === 0 && c.t < 25) dpShape("puff", [c.ground[0], c.ground[1] + 4 * b + c.t * 0.15, c.ground[2]], dpBall(c.t ? 24 : 40), (6 - c.t * 0.12) * b, 2.5, "", "", 1.2)
    if (c.t % 6 === 0 && c.t < 19) dpShape("puff", [c.ground[0], c.ground[1] + 1.6 * b, c.ground[2]], dpRing(36, c.t), wide, 7)
    dpSize = 1
    if (c.t < 30 && c.t % 2 === 0) dpFx("smoke", c.ground, 10, 9 * b)
    if (c.t % 2 === 0) dpFx("spark", c.ground, 10, 10 * b)
    if (c.t < 40) dpFx("ember", c.ground, 8, 11 * b, "magenta", "cyan", null, 3)
    if (c.t < 20 && c.t % 3 === 0) dpRingFx("smoke", c.ground, wide, 3, 0.7, 0.15, "", "", 10, c.t)
    if (c.t < 16 && c.t % 4 === 0) dpRingFx("shock", c.ground, wide * 1.2, 3, 1, 0.05, "purple", "magenta", 10, c.t)
    if (c.t >= 49) c.ph = 99
  },
]

function dpKill(id, by) {
  try {
    api.killLifeform(id, by)
  } catch (e) {
    api.applyHealthChange(id, -99999, by)
  }
}

function dpHurt(c, at, radius, damage, kb, nuke) {
  var ids = dpLifeforms()
  for (var i = 0; i < ids.length; i++) {
    var id = ids[i]
    if (c.ids.indexOf(id) >= 0 && !DP_CFG.hurtCaster) continue
    try {
      var p = api.getPosition(id)
      var away = dpSub([p[0], p[1] + 0.9, p[2]], at)
      if (nuke) away[1] = 0
      var d = dpLen(away)
      if (d > radius) continue
      var n = dpNorm([away[0], away[1] + 0.6, away[2]])
      api.applyImpulse(id, n[0] * kb, n[1] * kb, n[2] * kb)
      if (DP_CFG.kill && (nuke || id === c.target)) dpKill(id, c.id)
      else api.applyHealthChange(id, -Math.round(damage * (1 - (0.6 * d) / radius)), c.id)
    } catch (e) {}
  }
}

function dpSolid(x, y, z) {
  try {
    var name = api.getBlock(Math.floor(x), Math.floor(y), Math.floor(z))
    return !!name && name !== "Air"
  } catch (e) {
    return false
  }
}

function dpFree(from, dir, max) {
  for (var d = 1; d <= max; d++) {
    if (dpSolid(from[0] + dir[0] * d, from[1] + dir[1] * d, from[2] + dir[2] * d)) return d
  }
  return max
}

function dpPick(casterId, from, f) {
  var pick = (ids) => {
    var best = null
    var bestDist = DP_CFG.range
    for (var i = 0; i < ids.length; i++) {
      if (ids[i] === casterId) continue
      try {
        var p = api.getPosition(ids[i])
        var v = dpSub([p[0], p[1] + 0.9, p[2]], from)
        var dist = dpLen(v)
        if (dist >= bestDist || dist < 1) continue
        if (f && (v[0] * f[0] + v[1] * f[1] + v[2] * f[2]) / dist < 0.94) continue
        best = ids[i]
        bestDist = dist
      } catch (e) {}
    }
    return best
  }
  var mobs = api.getMobIds()
  var players = DP_CFG.hitPlayers ? api.getPlayerIds() : []
  return f ? pick(mobs.concat(players)) : pick(mobs) || pick(players)
}

function dragonPulse(playerId, eye, dir) {
  if (dpCasts.length >= DP_CFG.maxCasts) return false
  var face = eye ? { camPos: eye, dir: dir } : api.getPlayerFacingInfo(playerId)
  var f = dpNorm(face.dir)
  eye = face.camPos
  var flat = dpNorm([f[0], 0, f[2]])
  var spot = dpAdd(eye, flat, DP_CFG.circleDist)
  if (dpSolid(spot[0], spot[1], spot[2])) spot = eye
  var drop = dpFree(spot, [0, -1, 0], 16)
  var home = [spot[0], drop < 16 ? Math.floor(spot[1] - drop) + 1.06 : spot[1] - 1.5, spot[2]]
  dpCasts.push({
    id: playerId,
    ids: [playerId],
    ph: 0,
    t: 0,
    m: {},
    k: 1,
    hung: {},
    B: dpBasis(flat),
    home: home,
    at: home,
    ang: Math.atan2(flat[2], flat[0]),
    reach: Math.max(6, dpFree(dpAdd(home, [0, 1, 0], 1), [0, 1, 0], DP_CFG.rise) - 2),
    target: dpPick(playerId, eye, f),
    goal: dpAdd(eye, f, Math.max(2, dpFree(eye, f, DP_CFG.range) - 0.5)),
    path: [],
  })
  return true
}
globalThis.dragonPulse = dragonPulse

var dpFlying = (c) => (c.ph >= 1 && c.ph <= 4) || c.ph === 7

function dpTouch(a, b) {
  var head = a.path[a.path.length - 1]
  var reach = DP_CFG.mergeDist * Math.max(a.k, b.k)
  for (var n = b.path.length - 1; n >= 0 && n > b.path.length - 18; n -= 2) {
    if (dpLen(dpSub(head, b.path[n])) < reach) return true
  }
  return false
}

function dpMerge() {
  for (var i = 0; i < dpCasts.length; i++) {
    for (var j = dpCasts.length - 1; j > i; j--) {
      var a = dpCasts[i]
      var b = dpCasts[j]
      if (!dpFlying(a) || !dpFlying(b) || !a.path.length || !b.path.length) continue
      if (!dpTouch(a, b) && !dpTouch(b, a)) continue
      if (b.ph === 7) {
        dpCasts[i] = b
        b = a
        a = dpCasts[i]
      }
      dpDrop(b, "")
      dpCasts.splice(j, 1)
      a.ids = a.ids.concat(b.ids)
      dpFx("flash", a.at, 16, 2)
      if (a.ph === 7) continue
      var mid = dpAdd(a.at, dpSub(b.at, a.at), 0.5)
      dpDrop(a, "")
      a.k = DP_CFG.megaScale
      a.ph = 7
      a.t = 0
      a.at = a.base = mid
      a.path = [[mid[0], mid[1] - 2, mid[2]]]
      a.reach = Math.max(8, dpFree(mid, [0, 1, 0], DP_CFG.megaRise) - 2)
    }
  }
}

function dpTick() {
  if (DP_CFG.merge) dpMerge()
  for (var i = dpCasts.length - 1; i >= 0; i--) {
    var c = dpCasts[i]
    try {
      DP_PHASE[c.ph](c)
      c.t++
    } catch (e) {
      c.ph = 99
    }
    if (!DP_PHASE[c.ph]) {
      dpDrop(c, "")
      dpCasts.splice(i, 1)
    }
  }
}

tick = () => {
  dpTick()
}

onPlayerChat = (playerId, message) => {
  var words = message.trim().toLowerCase().split(/\s+/)
  if (!DP_CFG.chat || words[0] !== DP_CFG.chat) return
  if (words[1] === "nodes") {
    DP_CFG.nodes = words[2] === "box" || words[2] === "person" ? words[2] : ""
    api.sendMessage(playerId, "Dragon Pulse node meshes: " + (DP_CFG.nodes || "off"), { color: "orange" })
  } else if (!words[1]) dragonPulse(playerId)
  else return
  return false
}

onPlayerAltAction = (playerId) => {
  if (DP_CFG.item && (api.getHeldItem(playerId) || {}).name === DP_CFG.item) dragonPulse(playerId)
}
