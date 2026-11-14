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
  radius: 10,
  knockback: 18,
  hurtCaster: false,
  merge: true,
  mergeDist: 4,
  megaScale: 2.2,
  megaRise: 22,
  nukeRadius: 34,
  nukeDamage: 400,
  nukeKnockback: 30,
  rotate: true,
  sounds: true,
  hideDist: 160,
  maxCasts: 4,
  detail: 3,
  maxMeshes: 400,
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
  smoke: [236, 232, 250],
  shade: [128, 112, 180],
}

var DP_CIRCLE = [
  [12, 3.6, 1.95, 0.22, 0.06, "purple", 0, 0, 0, 0],
  [12, 4.05, 2.18, 0.08, 0.06, "lilac", 15, 0, 4, 0],
  [12, 3.83, 0.36, 0.1, 0.06, "magenta", 15, 0, 8, 0, "r"],
  [8, 2.95, 2.45, 0.1, 0.06, "magenta", 22.5, 0, 12, 0],
  [3, 1.48, 5.1, 0.12, 0.06, "cyan", 0, 0.02, 16, 0.05],
  [3, 1.48, 5.1, 0.12, 0.06, "cyan", 60, 0.02, 16, 0.05],
  [6, 0.9, 1.04, 0.14, 0.06, "magenta", 0, 0.04, 22, -0.08],
  [4, 0.42, 0.84, 0.1, 0.06, "lilac", 0, 0.06, 26, 0.12],
  [4, 4.75, 1.3, 0.2, 0.06, "magenta", 0, 0, 30, 0, "r"],
  [6, 3.28, 0.3, 0.3, 0.3, "lilac", 30, 0.45, 34, 0, "spin"],
  [6, 3.28, 0.16, 0.16, 1.3, "purple", 0, 0.65, 38, 0],
  [6, 2.1, 2.42, 0.1, 0.08, "cyan", 0, 2.4, 42, -0.1],
  [1, 0, 0.5, 0.5, 0.5, "white", 0, 0.7, 44, 0, "spin"],
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
  blast: [["cannonFire2", 1, 0.7], ["bassattack", 1, 0.6]],
  merge: [["futureStrangePulse", 1, 1], ["gorillaRoar1", 1, 0.5], ["zapAccent1", 1, 0.6]],
  climb: [["suspenseRiser", 1, 1.5]],
  nuke: [["cannonFire1", 1, 0.4], ["cannonFire3", 1, 0.55], ["hauntedHorrorImpact", 1, 0.6]],
  rumble: [["lowDrum3", 1, 0.5]],
}

var DP_MESH = {
  pillar: [["M", 1, 14, 1, "lilac", 0, 0, 7, "spin"]],

  head: [
    ["M", 1.4, 1.1, 1.4, "purple", 0, 0, 0],
    ["M", 1.1, 0.7, 1, "purple", 1.1, 0, 0.05],
    ["M", 0.85, 0.5, 0.8, "purple", 1.9, 0, -0.02],
    ["M", 0.95, 0.24, 1.5, "deep", 1.25, 0, -0.62],
    ["M", 0.26, 0.26, 1.6, "night", -1.2, 0.5, 0.8, "m"],
    ["M", 0.24, 0.7, 0.6, "magenta", -0.4, 0, 0.9],
    ["M", 0.14, 0.24, 0.42, "cyan", 0.6, 0.76, 0.22, "m"],
    ["M", 0.16, 0.8, 1, "deep", -0.5, 0.8, -0.05, "m"],
    ["M", 0.7, 0.2, 0.6, "deep", 2, 0, -0.72, "2"],
    ["M", 0.22, 0.22, 1, "night", -2.1, 0.6, 1.1, "m2"],
    ["M", 0.24, 0.5, 0.6, "magenta", 0.2, 0, 0.8, "2"],
    ["M", 0.24, 0.5, 0.6, "magenta", -1, 0, 0.8, "2"],
    ["M", 0.12, 0.4, 0.6, "night", 0.55, 0.71, 0.2, "m2"],
    ["M", 0.4, 0.18, 0.9, "night", 0.55, 0.6, 0.52, "m2"],
    ["M", 0.14, 0.42, 0.14, "white", 2.15, 0.4, -0.42, "m2"],
    ["M", 0.12, 0.3, 0.12, "white", 2.15, 0.26, -0.42, "m2"],
    ["M", 0.7, 0.36, 0.5, "magenta", 0.75, 0, -0.3, "2"],
    ["M", 0.22, 0.3, 0.3, "night", 2.05, 0, 0.33, "2"],
    ["M", 0.26, 0.14, 1.2, "night", 1.3, 0, 0.44, "2"],
    ["M", 0.1, 0.1, 1.5, "cyan", 1.5, 0.75, -0.1, "m2"],
    ["M", 0.34, 0.2, 0.34, "cyan", 0.45, 0, 0.6, "2"],
    ["M", 1, 0.6, 0.6, "deep", -0.95, 0, 0.5, "2"],
    ["M", 0.2, 0.6, 0.5, "deep", 0.25, 0.62, -0.45, "m2"],
    ["M", 0.16, 0.16, 0.6, "magenta", -2.8, 0.68, 1.35, "m3"],
    ["M", 0.06, 0.26, 0.12, "white", 0.66, 0.83, 0.22, "m3"],
    ["M", 0.12, 0.2, 0.7, "magenta", -1.1, 0.86, 0.3, "m3"],
    ["M", 0.12, 0.2, 0.7, "magenta", -1.1, 0.86, -0.3, "m3"],
    ["M", 0.1, 0.26, 0.1, "white", 1.6, 0.44, -0.4, "m3"],
    ["M", 0.06, 0.14, 0.8, "white", 1.1, 0.46, -0.36, "m3"],
    ["M", 0.36, 0.08, 1, "magenta", 1.3, 0, -0.47, "3"],
    ["M", 0.16, 0.14, 0.2, "magenta", 2.2, 0.26, 0.24, "m3"],
    ["M", 0.08, 0.08, 0.9, "lilac", 0.5, 1.05, -0.3, "m3"],
    ["M", 0.7, 0.5, 0.6, "deep", -1.45, 0, 0.7, "3"],
    ["M", 0.3, 0.26, 0.5, "deep", 1, 0, -0.84, "3"],
    ["M", 0.18, 0.5, 0.18, "lilac", 0.75, 0, -1, "3"],
    ["M", 0.12, 0.3, 0.12, "night", 1.3, 0.36, -0.84, "m3"],
  ],

  body: [
    ["M", 1.3, 1.15, 1.1, "purple", -1.35, 0, 0],
    ["M", 0.25, 0.81, 0.8, "magenta", -1.35, 0, 0.95, "2"],
    ["M", 0.91, 0.14, 0.95, "lilac", -1.35, 0, -0.61, "2"],
    ["M", 0.1, 0.52, 0.6, "cyan", -1.3, 0.68, 0.09, "m3"],
    ["M", 1.25, 1.1, 1.1, "deep", -2.5, 0, 0],
    ["M", 0.25, 0.77, 0.8, "magenta", -2.5, 0, 0.91],
    ["M", 0.88, 0.14, 0.95, "lilac", -2.5, 0, -0.59, "2"],
    ["M", 0.1, 0.5, 0.6, "cyan", -2.45, 0.66, 0.09, "m3"],
    ["M", 1.7, 0.12, 1, "magenta", -2.6, 1.4, -0.1, "m2"],
    ["M", 0.5, 0.1, 1.5, "lilac", -3.2, 2.3, -0.05, "m3"],
    ["M", 1.2, 1.05, 1.1, "purple", -3.65, 0, 0],
    ["M", 0.25, 0.74, 0.8, "magenta", -3.65, 0, 0.87, "2"],
    ["M", 0.84, 0.14, 0.95, "lilac", -3.65, 0, -0.57, "2"],
    ["M", 0.1, 0.47, 0.6, "cyan", -3.6, 0.63, 0.08, "m3"],
    ["M", 1.15, 1, 1.1, "deep", -4.8, 0, 0],
    ["M", 0.25, 0.7, 0.8, "magenta", -4.8, 0, 0.83, "2"],
    ["M", 0.8, 0.14, 0.95, "lilac", -4.8, 0, -0.54, "2"],
    ["M", 0.1, 0.45, 0.6, "cyan", -4.75, 0.6, 0.08, "m3"],
    ["M", 1.1, 0.95, 1.1, "purple", -5.95, 0, 0],
    ["M", 0.25, 0.66, 0.8, "magenta", -5.95, 0, 0.78],
    ["M", 0.77, 0.14, 0.95, "lilac", -5.95, 0, -0.52, "2"],
    ["M", 0.1, 0.43, 0.6, "cyan", -5.9, 0.58, 0.08, "m3"],
    ["M", 1, 0.9, 1.1, "deep", -7.1, 0, 0],
    ["M", 0.25, 0.63, 0.8, "magenta", -7.1, 0, 0.75, "2"],
    ["M", 0.7, 0.14, 0.95, "lilac", -7.1, 0, -0.49, "2"],
    ["M", 1.2, 0.12, 0.8, "magenta", -7.2, 1.05, -0.1, "m2"],
    ["M", 0.95, 0.85, 1.1, "purple", -8.25, 0, 0],
    ["M", 0.25, 0.59, 0.8, "magenta", -8.25, 0, 0.7, "2"],
    ["M", 0.66, 0.14, 0.95, "lilac", -8.25, 0, -0.46, "2"],
    ["M", 0.1, 0.38, 0.6, "cyan", -8.2, 0.51, 0.07, "m3"],
    ["M", 0.85, 0.75, 1.1, "deep", -9.4, 0, 0],
    ["M", 0.24, 0.53, 0.8, "magenta", -9.4, 0, 0.62],
    ["M", 0.59, 0.14, 0.95, "lilac", -9.4, 0, -0.41, "2"],
    ["M", 0.75, 0.65, 1.1, "purple", -10.55, 0, 0],
    ["M", 0.21, 0.46, 0.6, "magenta", -10.55, 0, 0.54, "2"],
    ["M", 0.52, 0.14, 0.95, "lilac", -10.55, 0, -0.36, "2"],
    ["M", 0.1, 0.29, 0.6, "cyan", -10.5, 0.41, 0.05, "m3"],
    ["M", 0.62, 0.55, 1.1, "deep", -11.65, 0, 0],
    ["M", 0.18, 0.39, 0.6, "magenta", -11.65, 0, 0.46, "2"],
    ["M", 0.43, 0.14, 0.95, "lilac", -11.65, 0, -0.32, "2"],
    ["M", 0.5, 0.45, 1.05, "purple", -12.7, 0, 0],
    ["M", 0.15, 0.31, 0.6, "magenta", -12.7, 0, 0.37, "2"],
    ["M", 0.38, 0.35, 1, "deep", -13.7, 0, 0],
    ["M", 0.12, 0.24, 0.6, "magenta", -13.7, 0, 0.29, "2"],
    ["M", 0.7, 0.14, 0.8, "magenta", -14.4, 0.4, 0, "m"],
    ["M", 0.14, 0.6, 0.7, "cyan", -14.35, 0, 0.3, "2"],
    ["M", 0.2, 0.2, 0.6, "lilac", -15, 0, 0, "3"],
  ],

  flare: [
    ["M", 1.0, 1.0, 1.0, "white", 0, 0, 0, "spin"],
    ["M", 3.0, 0.42, 0.42, "gold", 0, 0, 0],
    ["M", 0.42, 3.0, 0.42, "gold", 0, 0, 0],
    ["M", 0.42, 0.42, 3.0, "magenta", 0, 0, 0],
  ],

  blast: [
    ["M", 3.6, 3.6, 3.6, "white", 0, 0, 0, "spin"],
    ["M", 10, 0.7, 0.7, "magenta", 0, 0, 0],
    ["M", 0.7, 10, 0.7, "purple", 0, 0, 0],
    ["M", 0.7, 0.7, 10, "cyan", 0, 0, 0],
  ],

  smoke: [
    ["M", 2.6, 2.3, 2.6, "smoke", 0.4, -2.6, 1.4, "lit"],
    ["M", 2.9, 2.5, 2.9, "smoke", -0.3, 2.4, 1.8, "lit"],
    ["M", 2.3, 2.0, 2.3, "smoke", 2.2, 0.3, 2.9, "lit"],
    ["M", 2.0, 1.8, 2.0, "shade", -2.3, -1.0, 0.5, "lit"],
    ["M", 2.2, 1.9, 2.2, "smoke", 0.2, -0.5, 3.9, "lit"],
    ["M", 1.8, 1.6, 1.8, "shade", 1.4, 2.6, 0.2, "lit"],
    ["M", 1.9, 1.7, 1.9, "smoke", -1.6, 1.3, 3.3, "lit"],
    ["M", 1.6, 1.4, 1.6, "shade", 2.6, -2.0, 1.2, "lit"],
  ],

  nuke: [
    ["M", 8, 8, 8, "white", 0, 0, 0, "spin"],
    ["M", 26, 1.8, 1.8, "magenta", 0, 0, 0],
    ["M", 1.8, 26, 1.8, "purple", 0, 0, 0],
    ["M", 1.8, 1.8, 26, "cyan", 0, 0, 0],
  ],

  stem: [["M", 3.2, 4.4, 3.2, "shade", 0, 0, 0, "lit"]],
}

var DP_FX = {
  mote: { tex: "glint", life: [0.5, 0.9], size: [0.15, 0.35], speed: [2, 5], col: ["tint", "tint2"], fade: [1, 0], blend: 2 },
  flash: { tex: "square_particle", life: [0.15, 0.3], size: [1.5, 3.5], speed: [2, 6], col: ["white", "lilac"], fade: [1, 0], blend: 2, drag: 0.2 },
  aura: { tex: "square_particle", life: [0.4, 0.7], size: [0.4, 0.9], speed: [0.2, 1], col: ["tint", "tint2"], fade: [0.9, 0], blend: 2 },
  outline: { tex: "glint", life: [0.3, 0.5], size: [0.3, 0.6], speed: [0.2, 0.8], col: ["lilac", "white"], fade: [1, 0], blend: 2 },
  wisp: { tex: "soul_0", life: [0.6, 1], size: [0.6, 1.2], speed: [0.1, 0.5], col: ["lilac", "magenta"], fade: [0.7, 0], blend: 2 },
  impact: { tex: "critical_hit", life: [0.3, 0.5], size: [0.4, 0.9], speed: [4, 9], grav: -6, col: ["gold", "magenta"], fade: [1, 0], blend: 2, drag: 0.3 },
  ring: { tex: "square_particle", life: [0.35, 0.5], size: [0.3, 0.5], speed: [14, 18], col: ["white", "magenta"], fade: [1, 0], blend: 2, drag: 0.3, flat: 1 },
  wave: { tex: "square_particle", life: [0.6, 0.85], size: [0.8, 1.5], speed: [30, 42], col: ["white", "magenta"], fade: [1, 0], blend: 2, drag: 0.4, flat: 1 },
  smoke: { tex: "square_particle", life: [1.2, 2], size: [1.5, 3], speed: [0.5, 2], grav: 0.8, col: ["smoke", "shade"], fade: [0.85, 0], blend: 1, drag: 0.2 },
  spark: { tex: "glint", life: [0.5, 1], size: [0.25, 0.5], speed: [1, 4], col: ["purple", "magenta"], fade: [1, 0], blend: 2, drag: 0.2 },
}
var DP_SKIN = [
  ["purple", "magenta"],
  ["deep", "purple"],
  ["magenta", "lilac"],
  ["cyan", "purple"],
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
var dpMeshes = 0
var dpRowCache = {}

var dpFlag = (row, flag) => (row[8] || "").indexOf(flag) >= 0

function dpRows(name) {
  var key = name + DP_CFG.detail
  if (dpRowCache[key]) return dpRowCache[key]
  var out = []
  DP_MESH[name].forEach((r) => {
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
    if (dpMeshes >= DP_CFG.maxMeshes) return
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

function dpBody(c) {
  var rows = dpRows("body")
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
    dpPut(c, "body_" + i, r, "", dpAt(P[j], dpBasis(f), walked - back, r[6] * c.k, r[7] * c.k), f, c.k)
  }
}

function dpCircle(c) {
  for (var a = 0; a < DP_CIRCLE.length; a++) {
    var r = DP_CIRCLE[a]
    var age = c.ct - r[8]
    if (age < 0 || (age > 0 && !r[9])) continue
    if (age === 0) dpSound("ring", c.home, 0.8 + a * 0.07)
    var radial = dpFlag(DP_RING[a], "r")
    for (var n = 0; n < r[0]; n++) {
      var ang = (r[6] * Math.PI) / 180 + (n * 2 * Math.PI) / r[0] + r[9] * age
      var x = Math.cos(ang)
      var z = Math.sin(ang)
      dpPut(c, "ring" + a + "_" + n, DP_RING[a], "", [c.home[0] + x * r[1], c.home[1] + r[7], c.home[2] + z * r[1]], radial ? [x, 0, z] : [-z, 0, x])
    }
  }
}

function dpFx(look, pos, n, spread, tint, tint2, dir) {
  var L = DP_FX[look]
  var S = 0.6
  var a = DP_COL[L.col[0] === "tint" ? tint : L.col[0]]
  var b = DP_COL[L.col[1] === "tint" ? tint : L.col[1] === "tint2" ? tint2 : L.col[1]]
  var y = L.flat ? 0.04 : 1
  api.playParticleEffect({
    dir1: dir ? dpAdd(dir, [1, 1, 1], -0.25) : [-1, -y, -1],
    dir2: dir ? dpAdd(dir, [1, 1, 1], 0.25) : [1, y, 1],
    pos1: [pos[0] - spread, pos[1] - spread, pos[2] - spread],
    pos2: [pos[0] + spread, pos[1] + spread, pos[2] + spread],
    texture: L.tex,
    minLifeTime: L.life[0] * S,
    maxLifeTime: L.life[1] * S,
    minEmitPower: L.speed[0] / S,
    maxEmitPower: L.speed[1] / S,
    minSize: L.size[0],
    maxSize: L.size[1],
    manualEmitCount: n,
    gravity: [0, (L.grav || 0) / (S * S), 0],
    colorGradients: [
      { timeFraction: 0, minColor: a.concat(L.fade[0]), maxColor: b.concat(L.fade[0]) },
      { timeFraction: 1, minColor: a.concat(L.fade[1]), maxColor: b.concat(L.fade[1]) },
    ],
    velocityGradients: [
      { timeFraction: 0, factor: 1, factor2: 1 },
      { timeFraction: 1, factor: L.drag || 1, factor2: L.drag || 1 },
    ],
    blendMode: L.blend,
    hideDist: DP_CFG.hideDist,
  })
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
  dpGroup(c, "head", "head_", "", pos, dpBasis(f), k)
  dpBody(c)
  var skin = DP_SKIN[c.t % DP_SKIN.length]
  dpFx("aura", pos, 5, 0.9 * k, skin[0], skin[1])
  dpFx("outline", pos, 3, 1.1 * k)
  var n = c.path.length
  var mid = c.path[Math.max(0, n - 2 - ((c.t * 3) % 9))]
  var skin2 = DP_SKIN[(c.t + 2) % DP_SKIN.length]
  dpFx("aura", mid, 4, 0.7 * k, skin2[0], skin2[1])
  if (c.t % 2 === 0) dpFx("wisp", c.path[Math.max(0, n - 10)], 2, 0.6 * k)
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
    var skin = DP_SKIN[c.t % DP_SKIN.length]
    dpFx("mote", c.home, c.t > T - 12 ? 8 : 3, 2.6, skin[0], skin[1], [0, 1, 0])
    if (c.t % 10 === 9) dpFx("ring", c.home, 10, 0.3)
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
      dpSound("emerge", c.home)
    }
    c.ct = c.T + c.t
    dpCircle(c)
    if (c.t === 7) dpDrop(c, "pillar_")
    dpFx("mote", c.home, 6, 2.6, "magenta", "lilac", [0, 1, 0])
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
      var tag = c.t === 2 ? "flareA_" : "flareB_"
      var at = dpAt(goal, c.B, 0, c.t === 2 ? -0.8 : 0.9, c.t === 2 ? 0.2 : 0.7)
      dpGroup(c, "flare", tag, "", at, c.B, 1, true)
      dpFx("impact", at, 12, 0.3)
      dpSound("flare", at, c.t === 2 ? 1 : 1.2)
    }
    if (c.t === 6) dpDrop(c, "flareA_")
    if (c.t >= 11) dpNext(c)
  },

  function (c) {
    var goal = dpGoal(c)
    var b = DP_CFG.boom
    if (c.t === 0) {
      dpDrop(c, "")
      dpGroup(c, "blast", "blast_", "", goal, DP_UP, b, true)
      dpFx("flash", goal, 20, 3 * b)
      dpFx("ring", goal, 24, 0.4)
      dpFx("wave", goal, 20, 0.5)
      dpFx("impact", goal, 18, 2 * b)
      dpSound("blast", goal)
      dpHurt(c, goal, DP_CFG.radius, DP_CFG.damage, DP_CFG.knockback)
    }
    if (c.t && c.t % 2 === 0) dpResize(c, "blast", "blast_", "", b * (1 + c.t * 0.3))
    dpFx("flash", goal, 10, (3 + c.t * 0.6) * b)
    if (c.t % 3 === 0) dpFx("wave", goal, 12, 0.5)
    if (c.t >= 8) dpNext(c)
  },

  function (c) {
    if (c.t === 0) dpDrop(c, "blast_")
    var b = 2 * DP_CFG.boom
    dpCloud(c, b, 14, 24, 30, 0.04)
    if (c.t < 26 && c.t % 2 === 0) dpFx("smoke", dpAt(c.goal, c.B, 0, 0, 1.5 * b), 7, 2.5 * b)
    if (c.t % 3 === 0) dpFx("spark", dpAt(c.goal, c.B, 0, 0, 0.5), 7, 2.5 * b)
    if (c.t >= 35) c.ph = 99
  },

  function (c) {
    var h = c.t + 1
    if (c.t === 0) {
      dpFx("flash", c.base, 20, 3)
      dpFx("wave", c.base, 20, 0.5)
      dpSound("merge", c.base)
      dpSound("climb", c.base)
    }
    dpSpiral(c, [c.base[0], c.base[1] + h * 0.8, c.base[2]], Math.min(4, h * 0.4), 0.36)
    if (c.t % 4 === 0) dpFx("ring", c.at, 12, 0.5)
    if (h * 0.8 >= c.reach) dpNext(c)
  },

  function (c) {
    if (c.t === 0) {
      dpDrop(c, "")
      c.goal = c.at
      c.ground = dpAdd(c.at, [0, -1, 0], dpFree(c.at, [0, -1, 0], 60) - 1)
      dpGroup(c, "nuke", "nuke_", "", c.goal, DP_UP, DP_CFG.boom, true)
      dpSound("nuke", c.goal)
      dpHurt(c, c.ground, DP_CFG.nukeRadius, DP_CFG.nukeDamage, DP_CFG.nukeKnockback, true)
    }
    if (c.t && c.t % 3 === 0) dpResize(c, "nuke", "nuke_", "", DP_CFG.boom * (1 + c.t * 0.2))
    dpFx("flash", c.goal, 18, (5 + c.t) * DP_CFG.boom)
    dpFx("wave", c.goal, 16, 0.5)
    dpFx("wave", c.ground, 16, 0.5)
    dpFx("impact", c.goal, 14, 6 * DP_CFG.boom)
    if (c.t >= 15) dpNext(c)
  },

  function (c) {
    if (c.t === 0) dpDrop(c, "nuke_")
    if (c.t % 8 === 0 && c.t < 33) dpSound("rumble", c.ground, 1 - c.t * 0.01)
    dpCloud(c, 5 * DP_CFG.boom, 20, 34, 42, 0.05)
    var out = Math.min(1, (c.t + 1) / 12)
    for (var i = 0; i < 5 && c.t < 36; i++) {
      dpPut(c, "stem_" + i, DP_MESH.stem[0], "", dpAdd(c.ground, dpSub(c.goal, c.ground), ((i + 0.5) / 5) * out), null, 1.6 * DP_CFG.boom)
    }
    if (c.t === 36) dpDrop(c, "stem_")
    if (c.t < 36 && c.t % 2 === 0) dpFx("smoke", c.goal, 10, 13 * DP_CFG.boom)
    if (c.t < 30 && c.t % 2 === 1) dpFx("smoke", c.ground, 10, 9 * DP_CFG.boom)
    if (c.t % 2 === 0) dpFx("spark", c.goal, 10, 14 * DP_CFG.boom)
    if (c.t >= 49) c.ph = 99
  },
]

function dpCloud(c, k, grow, small, tiny, lift) {
  var out = 1 - Math.pow(1 - Math.min(1, (c.t + 1) / grow), 2)
  var rows = dpRows("smoke")
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i]
    dpPut(c, "smoke_" + i, r, "", dpAt(c.goal, c.B, r[5] * out * k, r[6] * out * k, 0.3 + r[7] * out * k + c.t * lift), null, k)
  }
  if (c.t === small || c.t === tiny) dpResize(c, "smoke", "smoke_", "", k * (c.t === small ? 0.65 : 0.35))
}

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
  if (DP_CFG.chat && message.trim().toLowerCase() === DP_CFG.chat) return dragonPulse(playerId), false
}

onPlayerAltAction = (playerId) => {
  if (DP_CFG.item && (api.getHeldItem(playerId) || {}).name === DP_CFG.item) dragonPulse(playerId)
}
