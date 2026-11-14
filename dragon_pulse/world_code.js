var DP_CFG = {
  chat: "!dp",
  item: "",
  range: 40,
  rise: 16,
  lean: 0.3,
  hitPlayers: true,
  damage: 40,
  radius: 6,
  knockback: 14,
  hurtCaster: false,
  rotate: true,
  sounds: true,
  hideDist: 96,
  maxCasts: 3,
  detail: 3,
  maxMeshes: 130,
}

var DP_COL = {
  white: [255, 255, 255],
  violet: [165, 70, 255],
  orange: [255, 125, 30],
  cyan: [40, 195, 255],
  pink: [255, 95, 205],
  blue: [75, 95, 255],
  gold: [255, 205, 45],
  smoke: [236, 239, 250],
  shade: [118, 128, 176],
}

var DP_MESH = {
  orb: [
    ["M", 0.5, 0.5, 0.5, "white", 0, 0, 0],
    ["M", 0.58, 0.58, 0.58, "tint", 0, 0, 0, "spin"],
  ],

  beam: [["M", 0.3, 0.3, 1.2, "tint", 0, 0, 0]],

  head: [
    ["M", 1.5, 1.25, 1.6, "white", 0, 0, 0],
    ["M", 1.05, 0.6, 1.3, "white", 1.35, 0, 0.18],
    ["M", 0.9, 0.26, 1.35, "pink", 1.2, 0, -0.58],
    ["M", 0.26, 0.26, 1.2, "violet", -1.05, 0.5, 0.8, "m"],
    ["M", 0.3, 0.5, 1, "orange", -0.35, 0, 0.85],
    ["M", 0.3, 0.3, 0.3, "cyan", 0.5, 0.78, 0.25, "m"],
    ["M", 0.2, 0.7, 0.95, "blue", -0.45, 0.98, -0.05, "m"],
    ["M", 0.5, 0.2, 0.75, "violet", 0.5, 0.55, 0.68, "m2"],
    ["M", 0.14, 0.32, 0.14, "white", 1.85, 0.36, -0.24, "m2"],
    ["M", 0.12, 0.26, 0.12, "white", 1.72, 0.3, -0.34, "m2"],
    ["M", 0.6, 0.3, 0.45, "gold", 0.72, 0, -0.28, "2"],
    ["M", 0.12, 0.12, 1.3, "cyan", 1.05, 0.82, -0.05, "m2"],
    ["M", 0.2, 0.6, 0.2, "violet", -1.35, 0.5, 1.15, "m2"],
    ["M", 0.9, 0.5, 0.5, "pink", -1, 0, 0.55, "2"],
    ["M", 0.12, 0.2, 0.2, "white", 0.56, 0.92, 0.25, "m3"],
    ["M", 0.08, 0.14, 0.9, "white", 1.2, 0.44, -0.18, "m3"],
    ["M", 0.4, 0.1, 0.95, "orange", 1.15, 0, -0.4, "3"],
    ["M", 0.2, 0.16, 0.2, "pink", 1.92, 0.3, 0.5, "m3"],
    ["M", 0.1, 0.1, 1.2, "blue", -0.1, 1.15, -0.2, "m3"],
    ["M", 0.18, 0.18, 0.6, "pink", -1.9, 0.5, 0.95, "m3"],
    ["M", 0.6, 0.45, 0.5, "violet", -1.45, 0, 0.78, "3"],
    ["M", 0.14, 0.5, 0.6, "pink", -0.95, 1, 0.25, "m3"],
    ["M", 0.3, 0.3, 0.45, "violet", 1, 0, -0.82, "3"],
    ["M", 0.2, 0.45, 0.2, "violet", 0.68, 0, -0.98, "3"],
  ],

  body: [
    ["M", 1.3, 1.15, 1.1, "white", -1.35, 0, 0],
    ["M", 0.25, 0.6, 0.8, "orange", -1.35, 0, 0.85, "2"],
    ["M", 0.91, 0.14, 0.95, "cyan", -1.35, 0, -0.61, "2"],
    ["M", 0.1, 0.52, 0.6, "pink", -1.3, 0.68, 0.09, "m3"],
    ["M", 1.25, 1.1, 1.1, "pink", -2.5, 0, 0],
    ["M", 0.25, 0.57, 0.8, "violet", -2.5, 0, 0.81],
    ["M", 0.88, 0.14, 0.95, "cyan", -2.5, 0, -0.59, "2"],
    ["M", 0.1, 0.5, 0.6, "blue", -2.45, 0.66, 0.09, "m3"],
    ["M", 0.9, 0.12, 0.7, "blue", -2.6, 1.04, -0.1, "m2"],
    ["M", 1.2, 1.05, 1.1, "white", -3.65, 0, 0],
    ["M", 0.25, 0.55, 0.8, "cyan", -3.65, 0, 0.78, "2"],
    ["M", 0.84, 0.14, 0.95, "cyan", -3.65, 0, -0.57, "2"],
    ["M", 0.1, 0.47, 0.6, "orange", -3.6, 0.63, 0.08, "m3"],
    ["M", 1.15, 1, 1.1, "violet", -4.8, 0, 0],
    ["M", 0.25, 0.52, 0.8, "pink", -4.8, 0, 0.74, "2"],
    ["M", 0.8, 0.14, 0.95, "cyan", -4.8, 0, -0.54, "2"],
    ["M", 0.1, 0.45, 0.6, "violet", -4.75, 0.6, 0.08, "m3"],
    ["M", 1.1, 0.95, 1.1, "white", -5.95, 0, 0],
    ["M", 0.25, 0.49, 0.8, "blue", -5.95, 0, 0.7],
    ["M", 0.77, 0.14, 0.95, "cyan", -5.95, 0, -0.52, "2"],
    ["M", 0.1, 0.43, 0.6, "pink", -5.9, 0.58, 0.08, "m3"],
    ["M", 1, 0.9, 1.1, "blue", -7.1, 0, 0],
    ["M", 0.25, 0.47, 0.8, "orange", -7.1, 0, 0.67, "2"],
    ["M", 0.7, 0.14, 0.95, "cyan", -7.1, 0, -0.49, "2"],
    ["M", 0.9, 0.12, 0.7, "blue", -7.2, 0.92, -0.1, "m2"],
    ["M", 0.95, 0.85, 1.1, "white", -8.25, 0, 0],
    ["M", 0.25, 0.44, 0.8, "violet", -8.25, 0, 0.63, "2"],
    ["M", 0.66, 0.14, 0.95, "cyan", -8.25, 0, -0.46, "2"],
    ["M", 0.1, 0.38, 0.6, "blue", -8.2, 0.51, 0.07, "m3"],
    ["M", 0.85, 0.75, 1.1, "orange", -9.4, 0, 0],
    ["M", 0.24, 0.39, 0.8, "cyan", -9.4, 0, 0.55],
    ["M", 0.59, 0.14, 0.95, "cyan", -9.4, 0, -0.41, "2"],
    ["M", 0.75, 0.65, 1.1, "white", -10.55, 0, 0],
    ["M", 0.21, 0.34, 0.6, "pink", -10.55, 0, 0.48, "2"],
    ["M", 0.52, 0.14, 0.95, "cyan", -10.55, 0, -0.36, "2"],
    ["M", 0.1, 0.29, 0.6, "orange", -10.5, 0.41, 0.05, "m3"],
    ["M", 0.62, 0.55, 1.1, "pink", -11.65, 0, 0],
    ["M", 0.18, 0.29, 0.6, "blue", -11.65, 0, 0.41, "2"],
    ["M", 0.43, 0.14, 0.95, "cyan", -11.65, 0, -0.32, "2"],
    ["M", 0.5, 0.45, 1.05, "white", -12.7, 0, 0],
    ["M", 0.15, 0.23, 0.6, "orange", -12.7, 0, 0.33, "2"],
    ["M", 0.38, 0.35, 1, "violet", -13.7, 0, 0],
    ["M", 0.12, 0.18, 0.6, "violet", -13.7, 0, 0.26, "2"],
    ["M", 0.7, 0.14, 0.8, "blue", -14.4, 0.4, 0, "m"],
    ["M", 0.14, 0.6, 0.7, "pink", -14.35, 0, 0.3, "2"],
    ["M", 0.2, 0.2, 0.6, "white", -15, 0, 0, "3"],
  ],

  flare: [
    ["M", 1.0, 1.0, 1.0, "white", 0, 0, 0, "spin"],
    ["M", 3.0, 0.42, 0.42, "gold", 0, 0, 0],
    ["M", 0.42, 3.0, 0.42, "gold", 0, 0, 0],
    ["M", 0.42, 0.42, 3.0, "orange", 0, 0, 0],
  ],

  blast: [["M", 3.4, 3.4, 3.4, "white", 0, 0, 0, "spin"]],

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
}

var DP_ORBS = [
  ["violet", 210],
  ["orange", 90],
  ["cyan", 330],
]
var DP_BEAM_LEN = 4

var DP_FX = {
  orbGlow: { tex: "glint", life: [0.25, 0.45], size: [0.25, 0.5], speed: [0.3, 1.2], col: ["tint", "white"], fade: [1, 0], blend: 2 },
  orbDust: { tex: "square_particle", life: [0.3, 0.5], size: [0.08, 0.16], speed: [1.5, 3], col: ["tint", "tint"], fade: [1, 0], blend: 2, drag: 0.1 },
  beam: { tex: "square_particle", life: [0.35, 0.6], size: [0.3, 0.55], speed: [0, 0.4], col: ["tint", "white"], fade: [1, 0], blend: 2 },
  beamSpark: { tex: "glint", life: [0.25, 0.5], size: [0.15, 0.3], speed: [1, 3], col: ["tint", "white"], fade: [1, 0], blend: 2 },
  flash: { tex: "square_particle", life: [0.15, 0.3], size: [1.5, 3.5], speed: [2, 6], col: ["white", "white"], fade: [1, 0], blend: 2, drag: 0.2 },
  aura: { tex: "square_particle", life: [0.4, 0.7], size: [0.4, 0.9], speed: [0.2, 1], col: ["tint", "tint2"], fade: [0.9, 0], blend: 2 },
  outline: { tex: "glint", life: [0.3, 0.5], size: [0.3, 0.6], speed: [0.2, 0.8], col: ["white", "white"], fade: [1, 0], blend: 2 },
  wisp: { tex: "soul_0", life: [0.6, 1], size: [0.6, 1.2], speed: [0.1, 0.5], col: ["white", "pink"], fade: [0.7, 0], blend: 2 },
  impact: { tex: "critical_hit", life: [0.3, 0.5], size: [0.4, 0.9], speed: [4, 9], grav: -6, col: ["gold", "orange"], fade: [1, 0], blend: 2, drag: 0.3 },
  ring: { tex: "square_particle", life: [0.35, 0.5], size: [0.3, 0.5], speed: [14, 18], col: ["white", "white"], fade: [1, 0], blend: 2, drag: 0.3, flat: 1 },
  smoke: { tex: "square_particle", life: [1.2, 2], size: [1.5, 3], speed: [0.5, 2], grav: 0.8, col: ["smoke", "shade"], fade: [0.85, 0], blend: 1, drag: 0.2 },
  spark: { tex: "glint", life: [0.5, 1], size: [0.25, 0.5], speed: [1, 4], col: ["violet", "pink"], fade: [1, 0], blend: 2, drag: 0.2 },
}
var DP_SKIN = [
  ["pink", "violet"],
  ["blue", "cyan"],
  ["orange", "pink"],
  ["white", "pink"],
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
var dpSound = (name, pos, vol, rate) => {
  if (!DP_CFG.sounds) return
  try {
    api.broadcastSound(name, vol, rate, { playerIdOrPos: pos, maxHearDist: 70, refDistance: 12 })
  } catch (e) {}
}
var dpLifeforms = () => api.getMobIds().concat(api.getPlayerIds())

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

function dpPut(c, key, row, tint, pos, f) {
  var id = c.m[key]
  var fresh = !id
  if (fresh) {
    if (dpMeshes >= DP_CFG.maxMeshes) return
    id = api.attemptCreateMeshEntity("Box", dpBox(row, tint, 1))
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
    dpPut(c, tag + i, r, tint, dpAt(pos, B, r[5] * k, r[6] * k, r[7] * k), still ? null : B[0])
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
    var seg = dpLen(dpSub(P[j], P[j - 1]))
    while (walked + seg < -r[5] && j > 1) {
      walked += seg
      j--
      seg = dpLen(dpSub(P[j], P[j - 1]))
    }
    if (walked + seg < -r[5]) return
    var f = dpNorm(dpSub(P[j], P[j - 1]))
    var B = dpBasis(f)
    dpPut(c, "body_" + i, r, "", dpAt(P[j], B, -(-r[5] - walked), r[6], r[7]), f)
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

function dpOrbAt(c, i, p) {
  var q = Math.max(0, p)
  var rad = 0.9 * (1 - q) + 0.7 * Math.sin(Math.PI * q)
  var ang = (DP_ORBS[i][1] * Math.PI) / 180 + q * Math.PI * 0.6
  return dpAt(c.from, c.L, c.reach * q, Math.cos(ang) * rad, Math.sin(ang) * rad)
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
  c.path.push(pos)
  if (c.path.length > 40) c.path.shift()
  dpGroup(c, "head", "head_", "", pos, dpBasis(f), 1)
  dpBody(c)
  var skin = DP_SKIN[c.t % DP_SKIN.length]
  dpFx("aura", pos, 5, 0.9, skin[0], skin[1])
  dpFx("outline", pos, 3, 1.1)
  var n = c.path.length
  var mid = c.path[Math.max(0, n - 2 - ((c.t * 3) % 9))]
  var skin2 = DP_SKIN[(c.t + 2) % DP_SKIN.length]
  dpFx("aura", mid, 4, 0.7, skin2[0], skin2[1])
  if (c.t % 2 === 0) dpFx("wisp", c.path[Math.max(0, n - 10)], 2, 0.6)
}

var DP_PHASE = [
  function (c) {
    var k = c.t < 8 ? 0.6 : 1
    if (c.t === 0) dpSound("magicAccent1", c.from, 1, 0.8)
    for (var i = 0; i < 3; i++) {
      var tint = DP_ORBS[i][0]
      var p = dpOrbAt(c, i, 0)
      if (c.t === 0) dpGroup(c, "orb", "orb" + i + "_", tint, p, c.L, 1)
      if (c.t === 0 || c.t === 8) dpResize(c, "orb", "orb" + i + "_", tint, k)
      dpFx("orbGlow", p, 3, 0.3 * k, tint)
      if (c.t % 3 === i) dpFx("orbDust", p, 4, 0.7, tint)
    }
    if (c.t >= 15) dpNext(c)
  },

  function (c) {
    var T = 14
    var p = (c.t + 1) / T
    if (c.t === 0) dpSound("zapAccent1", c.from, 1, 1)
    for (var i = 0; i < 3; i++) {
      var tint = DP_ORBS[i][0]
      var head = dpOrbAt(c, i, p)
      var f = dpNorm(dpSub(head, dpOrbAt(c, i, p - 0.02)))
      dpGroup(c, "orb", "orb" + i + "_", tint, head, dpBasis(f), 1)
      for (var k = 0; k < DP_BEAM_LEN; k++) {
        var q = p - (k + 1) * 0.085
        if (q <= 0) break
        var at = dpOrbAt(c, i, q)
        dpPut(c, "beam" + i + "_" + k, DP_MESH.beam[0], tint, at, dpNorm(dpSub(dpOrbAt(c, i, q + 0.02), at)))
      }
      dpFx("beam", head, 4, 0.2, tint)
      dpFx("beam", dpOrbAt(c, i, p - 0.5 / T), 3, 0.2, tint)
      if (c.t % 3 === i) dpFx("beamSpark", head, 3, 0.3, tint)
    }
    if (c.t >= T - 1) dpNext(c)
  },

  function (c) {
    if (c.t === 0) {
      dpDrop(c, "orb")
      dpDrop(c, "beam")
      c.at = dpAt(c.from, c.L, c.reach, 0, 0)
      c.path = [dpAt(c.at, c.L, -0.6, 0, 0)]
      c.far = Math.max(1, dpLen(dpSub(dpGoal(c), c.at)))
      dpFx("flash", c.at, 10, 0.6)
      dpFx("ring", c.at, 14, 0.3)
      dpSound("bearRoar1", c.at, 1, 1.4)
    }
    var goal = dpGoal(c)
    var left = dpLen(dpSub(goal, c.at))
    var speed = 0.95
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
      dpSound("zapAccent2", at, 0.8, 1.3)
    }
    if (c.t === 6) dpDrop(c, "flareA_")
    if (c.t >= 11) dpNext(c)
  },

  function (c) {
    var goal = dpGoal(c)
    if (c.t === 0) {
      dpDrop(c, "")
      dpGroup(c, "blast", "blast_", "", goal, c.B, 1, true)
      dpFx("flash", goal, 16, 1.5)
      dpFx("ring", goal, 24, 0.4)
      dpFx("impact", goal, 14, 0.8)
      dpSound("cannonFire1", goal, 1, 0.7)
      dpHurt(c, goal)
    }
    dpFx("flash", goal, 6, 2)
    if (c.t >= 3) dpNext(c)
  },

  function (c) {
    var goal = c.goal
    var T = 28
    if (c.t === 0) dpDrop(c, "blast_")
    var out = 1 - Math.pow(1 - Math.min(1, (c.t + 1) / 14), 2)
    var k = c.t < 18 ? 1 : c.t < 23 ? 0.65 : 0.35
    var rows = dpRows("smoke")
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i]
      dpPut(c, "smoke_" + i, r, "", dpAt(goal, c.B, r[5] * out, r[6] * out, 0.3 + r[7] * out + c.t * 0.03))
    }
    if (c.t === 18 || c.t === 23) dpResize(c, "smoke", "smoke_", "", k)
    if (c.t < 20 && c.t % 2 === 0) dpFx("smoke", dpAt(goal, c.B, 0, 0, 1.5), 5, 2.5)
    if (c.t % 3 === 0) dpFx("spark", dpAt(goal, c.B, 0, 0, 0.5), 5, 2.5)
    if (c.t >= T - 1) dpNext(c)
  },
]

function dpHurt(c, at) {
  var ids = dpLifeforms()
  for (var i = 0; i < ids.length; i++) {
    var id = ids[i]
    if (id === c.id && !DP_CFG.hurtCaster) continue
    try {
      var p = api.getPosition(id)
      var away = dpSub([p[0], p[1] + 0.9, p[2]], at)
      var d = dpLen(away)
      if (d > DP_CFG.radius) continue
      var n = dpNorm([away[0], away[1] + 0.6, away[2]])
      var kb = DP_CFG.knockback
      api.applyImpulse(id, n[0] * kb, n[1] * kb, n[2] * kb)
      api.applyHealthChange(id, -Math.round(DP_CFG.damage * (1 - (0.6 * d) / DP_CFG.radius)), c.id)
    } catch (e) {}
  }
}

function dpFree(from, dir, max) {
  for (var d = 1; d <= max; d++) {
    try {
      var name = api.getBlock(Math.floor(from[0] + dir[0] * d), Math.floor(from[1] + dir[1] * d), Math.floor(from[2] + dir[2] * d))
      if (name && name !== "Air") return d
    } catch (e) {}
  }
  return max
}

function dpPick(casterId, eye, f) {
  var pick = (ids, aimed) => {
    var best = null
    var bestDist = DP_CFG.range
    for (var i = 0; i < ids.length; i++) {
      if (ids[i] === casterId) continue
      try {
        var p = api.getPosition(ids[i])
        var v = dpSub([p[0], p[1] + 0.9, p[2]], eye)
        var dist = dpLen(v)
        if (dist >= bestDist || dist < 1) continue
        if (aimed && (v[0] * f[0] + v[1] * f[1] + v[2] * f[2]) / dist < 0.94) continue
        best = ids[i]
        bestDist = dist
      } catch (e) {}
    }
    return best
  }
  var mobs = api.getMobIds()
  var players = DP_CFG.hitPlayers ? api.getPlayerIds() : []
  return pick(mobs.concat(players), true) || pick(mobs, false) || pick(players, false)
}

function dragonPulse(playerId, eye, dir) {
  if (dpCasts.length >= DP_CFG.maxCasts) return false
  var face = eye ? { camPos: eye, dir: dir } : api.getPlayerFacingInfo(playerId)
  var f = dpNorm(face.dir)
  var B = dpBasis(f)
  eye = face.camPos
  var flat = dpNorm([f[0], 0, f[2]])
  var up = dpNorm([flat[0] * DP_CFG.lean, 1, flat[2] * DP_CFG.lean])
  var from = dpAt(eye, B, 2.2, 0, 0.1)
  var c = {
    id: playerId,
    ph: 0,
    t: 0,
    m: {},
    B: B,
    L: dpBasis(up),
    from: from,
    reach: Math.max(3, dpFree(from, up, DP_CFG.rise) - 2),
    target: dpPick(playerId, eye, f),
    goal: dpAdd(eye, f, Math.max(2, dpFree(eye, f, DP_CFG.range) - 0.5)),
    path: [],
  }
  dpCasts.push(c)
  return true
}
globalThis.dragonPulse = dragonPulse

function dpTick() {
  for (var i = dpCasts.length - 1; i >= 0; i--) {
    var c = dpCasts[i]
    try {
      DP_PHASE[c.ph](c)
      c.t++
    } catch (e) {
      c.ph = 99
    }
    if (c.ph >= DP_PHASE.length) {
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
