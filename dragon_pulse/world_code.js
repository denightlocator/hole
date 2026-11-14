// ============================================================================
//  DRAGON PULSE  -  World Code (F8)
//  Three orbs charge (violet / orange / cyan) -> three beams twist together
//  -> they merge into a glowing serpent dragon that hunts its target, coils
//  around it and detonates into a white blast and smoke.
//
//  Cast it:  type  !dp  in chat,  hold the item named in DP_CFG.item and
//            right click,  or run  dragonPulse(myId)  from a code block.
//
//  Layout:   1 config        4 particle looks     7 phases
//            2 colours       5 helpers            8 cast + callbacks
//            3 mesh tables   6 mesh + particle engine
// ============================================================================

// ---------------------------------------------------------------- 1. CONFIG
var DP_CFG = {
  chat: "!dp",      // chat message that casts the move ("" = off)
  item: "",         // held item that casts it on right click ("" = off)
  cooldown: 8,      // seconds between casts of one player
  range: 40,        // blocks the dragon flies when nothing is in the way
  damage: 40,       // health taken at the centre of the blast
  radius: 6,        // blast radius in blocks
  knockback: 14,    // push away from the blast
  hurtCaster: false,
  rotate: true,     // turn meshes to face the way they fly
  sounds: true,
  hideDist: 96,     // players further away do not see it
  maxCasts: 3,      // casts running at once in the world
  maxMeshes: 70,    // mesh entities this script may hold at once
}

// --------------------------------------------------------------- 2. COLOURS
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

// ----------------------------------------------------------- 3. MESH TABLES
// One row is one Box mesh:
//   [name, width, height, depth, colour, forward, right, up, flag]
// width is left-right, height is bottom-top, depth is along the flight.
// forward / right / up is where the part sits, in blocks from the middle of
// its group. flag "spin" = turns by itself, "lit" = shaded instead of glowing.
var DP_MESH = {
  // An orb: a white-hot core inside a turning coloured shell. "tint" is
  // replaced by the colour of the orb (violet, orange or cyan).
  orb: [
    ["core", 0.5, 0.5, 0.5, "white", 0, 0, 0],
    ["shell", 0.58, 0.58, 0.58, "tint", 0, 0, 0, "spin"],
  ],

  // The piece of beam behind an orb. Each beam has DP_BEAM_LEN of them.
  beam: [["ray", 0.3, 0.3, 1.2, "tint", 0, 0, 0]],

  // Dragon head. Stiff: every part keeps its place next to the skull.
  head: [
    ["skull", 1.5, 1.25, 1.6, "white", 0, 0, 0],
    ["snout", 1.05, 0.6, 1.3, "white", 1.35, 0, 0.18],
    ["jaw", 0.9, 0.26, 1.35, "pink", 1.2, 0, -0.58],
    ["hornL", 0.26, 0.26, 1.2, "violet", -1.05, -0.5, 0.8],
    ["hornR", 0.26, 0.26, 1.2, "violet", -1.05, 0.5, 0.8],
    ["crest", 0.3, 0.5, 1.0, "orange", -0.35, 0, 0.85],
    ["eyeL", 0.3, 0.3, 0.3, "cyan", 0.5, -0.78, 0.25],
    ["eyeR", 0.3, 0.3, 0.3, "cyan", 0.5, 0.78, 0.25],
    ["finL", 0.2, 0.7, 0.95, "blue", -0.45, -0.98, -0.05],
    ["finR", 0.2, 0.7, 0.95, "blue", -0.45, 0.98, -0.05],
  ],

  // Dragon body. Bends: "forward" is how far behind the head the part
  // follows along the path the head flew (so it is negative).
  body: [
    ["neck1", 1.3, 1.15, 1.1, "white", -1.35, 0, 0],
    ["neck2", 1.25, 1.1, 1.1, "pink", -2.5, 0, 0],
    ["spine1", 0.25, 0.6, 0.8, "orange", -2.5, 0, 0.8],
    ["back1", 1.2, 1.05, 1.1, "white", -3.65, 0, 0],
    ["back2", 1.15, 1.0, 1.1, "violet", -4.8, 0, 0],
    ["back3", 1.1, 0.95, 1.1, "white", -5.95, 0, 0],
    ["spine2", 0.25, 0.55, 0.8, "violet", -5.95, 0, 0.72],
    ["back4", 1.0, 0.9, 1.1, "blue", -7.1, 0, 0],
    ["back5", 0.95, 0.85, 1.1, "white", -8.25, 0, 0],
    ["back6", 0.85, 0.75, 1.1, "orange", -9.4, 0, 0],
    ["spine3", 0.22, 0.5, 0.7, "cyan", -9.4, 0, 0.6],
    ["tail1", 0.75, 0.65, 1.1, "white", -10.55, 0, 0],
    ["tail2", 0.62, 0.55, 1.1, "pink", -11.65, 0, 0],
    ["tail3", 0.5, 0.45, 1.05, "white", -12.7, 0, 0],
    ["tail4", 0.38, 0.35, 1.0, "violet", -13.7, 0, 0],
    ["tailFinL", 0.7, 0.14, 0.8, "blue", -14.4, -0.4, 0],
    ["tailFinR", 0.7, 0.14, 0.8, "blue", -14.4, 0.4, 0],
  ],

  // The yellow star that flashes where the dragon bites.
  flare: [
    ["heart", 1.0, 1.0, 1.0, "white", 0, 0, 0, "spin"],
    ["rayX", 3.0, 0.42, 0.42, "gold", 0, 0, 0],
    ["rayY", 0.42, 3.0, 0.42, "gold", 0, 0, 0],
    ["rayZ", 0.42, 0.42, 3.0, "orange", 0, 0, 0],
  ],

  // The white core of the blast.
  blast: [["core", 3.4, 3.4, 3.4, "white", 0, 0, 0, "spin"]],

  // Smoke puffs. Here forward / right / up is where a puff ends up.
  smoke: [
    ["puff1", 2.6, 2.3, 2.6, "smoke", 0.4, -2.6, 1.4, "lit"],
    ["puff2", 2.9, 2.5, 2.9, "smoke", -0.3, 2.4, 1.8, "lit"],
    ["puff3", 2.3, 2.0, 2.3, "smoke", 2.2, 0.3, 2.9, "lit"],
    ["puff4", 2.0, 1.8, 2.0, "shade", -2.3, -1.0, 0.5, "lit"],
    ["puff5", 2.2, 1.9, 2.2, "smoke", 0.2, -0.5, 3.9, "lit"],
    ["puff6", 1.8, 1.6, 1.8, "shade", 1.4, 2.6, 0.2, "lit"],
    ["puff7", 1.9, 1.7, 1.9, "smoke", -1.6, 1.3, 3.3, "lit"],
    ["puff8", 1.6, 1.4, 1.6, "shade", 2.6, -2.0, 1.2, "lit"],
  ],
}

// The three orbs: colour, and where each sits around the aim line (degrees).
var DP_ORBS = [
  ["violet", 210],
  ["orange", 90],
  ["cyan", 330],
]
var DP_BEAM_LEN = 4 // pieces of beam behind each orb

// ------------------------------------------------------ 4. PARTICLE LOOKS
// tex: texture. life: seconds. size: blocks. speed: blocks per second.
// grav: blocks per second squared (up is +). col: the two colours a particle
// is mixed from ("tint" = given when played). fade: alpha at birth and death.
// blend: 1 normal, 2 glow. drag: speed left at the end (1 = keeps flying).
// flat: 1 = flies level (rings).
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
// The colour pairs the dragon's skin shimmers in.
var DP_SKIN = [
  ["pink", "violet"],
  ["blue", "cyan"],
  ["orange", "pink"],
  ["white", "pink"],
]

// --------------------------------------------------------------- 5. HELPERS
var dpAdd = (a, b, s) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s]
var dpSub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
var dpLen = (a) => Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2])
var dpNorm = (a) => {
  var l = dpLen(a)
  return l < 1e-6 ? [0, 0, 1] : [a[0] / l, a[1] / l, a[2] / l]
}
// The frame of something flying along f: [forward, right, up].
var dpBasis = (f) => {
  var r = Math.abs(f[1]) > 0.999 ? [1, 0, 0] : dpNorm([f[2], 0, -f[0]])
  return [f, r, [f[1] * r[2] - f[2] * r[1], f[2] * r[0] - f[0] * r[2], f[0] * r[1] - f[1] * r[0]]]
}
// p moved by forward / right / up in the frame B.
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
var dpLifeforms = () => api.getPlayerIds().concat(api.getMobIds())

// -------------------------------------------- 6. MESH + PARTICLE ENGINE
var dpCasts = [] // casts that are running
var dpMeshes = 0 // mesh entities held right now
var dpClock = 0 // ticks since the world code started
var dpLast = {} // playerId -> tick of the last cast

// The options of one mesh row, k times its size.
function dpBox(row, tint, k) {
  var col = DP_COL[row[4] === "tint" ? tint : row[4]]
  var lit = row[8] === "lit"
  return {
    width: row[1] * k,
    height: row[2] * k,
    depth: row[3] * k,
    diffuseColor: lit ? col : [0, 0, 0],
    emissiveColor: lit ? col.map((v) => v * 0.55) : col,
    autoRotate: row[8] === "spin",
    hideDist: DP_CFG.hideDist,
  }
}

// Puts one mesh at pos, facing along f. Makes it the first time.
function dpPut(c, key, row, tint, pos, f) {
  var id = c.m[key]
  if (!id) {
    if (dpMeshes >= DP_CFG.maxMeshes) return
    id = api.attemptCreateMeshEntity("Box", dpBox(row, tint, 1))
    if (!id) return
    c.m[key] = id
    dpMeshes++
  }
  api.setPosition(id, pos[0], pos[1], pos[2])
  if (f && DP_CFG.rotate && row[8] !== "spin") {
    api.setEntityRotation(id, -Math.asin(Math.max(-1, Math.min(1, f[1]))), Math.atan2(f[0], f[2]), 0)
  }
}

// Puts a stiff group (orb, head, flare) at pos, k times its size.
// still: keep it level instead of turning it along B.
function dpGroup(c, name, tag, tint, pos, B, k, still) {
  var rows = DP_MESH[name]
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i]
    dpPut(c, tag + r[0], r, tint, dpAt(pos, B, r[5] * k, r[6] * k, r[7] * k), still ? null : B[0])
  }
}

function dpResize(c, name, tag, tint, k) {
  DP_MESH[name].forEach((r) => {
    var id = c.m[tag + r[0]]
    if (id) api.updateMeshEntity(id, "Box", dpBox(r, tint, k))
  })
}

// Deletes the meshes whose key starts with tag ("" = all of them).
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

// Lays the body along the path the head flew (c.path, newest point last).
function dpBody(c) {
  var rows = DP_MESH.body
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
    if (walked + seg < -r[5]) return // this far back has not left the flash yet
    var f = dpNorm(dpSub(P[j], P[j - 1]))
    var B = dpBasis(f)
    dpPut(c, "body_" + r[0], r, "", dpAt(P[j], B, -(-r[5] - walked), r[6], r[7]), f)
  }
}

// Plays n particles of a look around pos. spread: half the size of the cloud.
// dir: fly this way instead of every way. tint / tint2: colour names.
function dpFx(look, pos, n, spread, tint, tint2, dir) {
  var L = DP_FX[look]
  var S = 0.6 // one second on the game's particle clock
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

// ---------------------------------------------------------------- 7. PHASES
// Every phase is called once per tick (20 times a second) with the cast c.
// c.t counts the ticks of the phase. dpNext(c) moves on to the next phase.
var dpNext = (c) => {
  c.ph++
  c.t = -1
}

// Where orb i is, p of the way (0 to 1) from the caster to the merge point.
function dpOrbAt(c, i, p) {
  var q = Math.max(0, p)
  var rad = 0.9 * (1 - q) + 0.7 * Math.sin(Math.PI * q)
  var ang = (DP_ORBS[i][1] * Math.PI) / 180 + q * Math.PI * 0.6
  return dpAt(c.from, c.B, c.reach * q, Math.cos(ang) * rad, Math.sin(ang) * rad)
}

// Where the dragon is heading: its target if it has one, else a fixed point.
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

// Moves the head to pos, lays the body behind it and makes it shimmer.
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
  // 0 CHARGE (0.8 s): three orbs swell in front of the caster.
  function (c) {
    var k = c.t < 8 ? 0.6 : 1
    if (c.t === 0) dpSound("magicAccent1", c.from, 1, 0.8)
    for (var i = 0; i < 3; i++) {
      var tint = DP_ORBS[i][0]
      var p = dpOrbAt(c, i, 0)
      if (c.t === 0) dpGroup(c, "orb", "orb" + i + "_", tint, p, c.B, 1)
      if (c.t === 0 || c.t === 8) dpResize(c, "orb", "orb" + i + "_", tint, k)
      dpFx("orbGlow", p, 3, 0.3 * k, tint)
      if (c.t % 3 === i) dpFx("orbDust", p, 4, 0.7, tint)
    }
    if (c.t >= 15) dpNext(c)
  },

  // 1 BEAMS (0.7 s): the orbs shoot off, twist round each other and meet.
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

  // 2 DRAGON: the beams flash into one and the dragon flies out of the
  // flash, weaving and arching, after its target.
  function (c) {
    if (c.t === 0) {
      dpDrop(c, "orb")
      dpDrop(c, "beam")
      c.at = dpAt(c.from, c.B, c.reach, 0, 0) // the point the weaving is around
      c.path = [dpAt(c.at, c.B, -0.6, 0, 0)]
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

  // 3 COIL (0.6 s): it winds round the target and bites: two yellow stars.
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

  // 4 BLAST: the dragon bursts. Damage and knockback happen here.
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

  // 5 SMOKE (1.4 s): white and blue-grey puffs roll out, sparks linger.
  function (c) {
    var goal = c.goal
    var T = 28
    if (c.t === 0) dpDrop(c, "blast_")
    var out = 1 - Math.pow(1 - Math.min(1, (c.t + 1) / 14), 2) // fast, then slow
    var k = c.t < 18 ? 1 : c.t < 23 ? 0.65 : 0.35
    var rows = DP_MESH.smoke
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i]
      dpPut(c, "smoke_" + r[0], r, "", dpAt(goal, c.B, r[5] * out, r[6] * out, 0.3 + r[7] * out + c.t * 0.03))
    }
    if (c.t === 18 || c.t === 23) dpResize(c, "smoke", "smoke_", "", k)
    if (c.t < 20 && c.t % 2 === 0) dpFx("smoke", dpAt(goal, c.B, 0, 0, 1.5), 5, 2.5)
    if (c.t % 3 === 0) dpFx("spark", dpAt(goal, c.B, 0, 0, 0.5), 5, 2.5)
    if (c.t >= T - 1) dpNext(c)
  },
]

// Damage and push everything alive inside the blast.
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

// ------------------------------------------------------ 8. CAST + CALLBACKS
// Starts the move for a player. Returns true when it started.
function dragonPulse(playerId) {
  var wait = DP_CFG.cooldown * 20 - (dpClock - (dpLast[playerId] === undefined ? -1e9 : dpLast[playerId]))
  if (wait > 0) {
    api.sendMessage(playerId, "Dragon Pulse is ready in " + Math.ceil(wait / 20) + " s", { color: "violet" })
    return false
  }
  if (dpCasts.length >= DP_CFG.maxCasts) return false
  var face = api.getPlayerFacingInfo(playerId)
  var f = dpNorm(face.dir)
  var B = dpBasis(f)
  var eye = face.camPos
  var c = {
    id: playerId,
    ph: 0, // phase
    t: 0, // tick of the phase
    m: {}, // mesh key -> entity id
    B: B, // the frame of the cast: [forward, right, up]
    from: dpAt(eye, B, 2.2, 0, 0.1), // middle of the three orbs
    reach: 10, // blocks from there to where the beams merge
    target: null,
    goal: dpAt(eye, B, DP_CFG.range, 0, 0),
    path: [],
  }
  // Something solid in the way: the beams merge and the dragon ends before it.
  try {
    var hit = api.raycastForBlock(eye, f)
    var hp = hit && (hit.position || hit.pos || hit.point)
    if (hp) {
      var d = dpLen(dpSub([hp[0] + 0.5, hp[1] + 0.5, hp[2] + 0.5], eye))
      if (d < DP_CFG.range) c.goal = dpAt(eye, B, Math.max(3, d - 1), 0, 0)
      c.reach = Math.max(2, Math.min(10, d - 5))
    }
  } catch (e) {}
  // The nearest player or mob the caster is looking at becomes the target.
  var ids = dpLifeforms()
  var best = DP_CFG.range
  for (var i = 0; i < ids.length; i++) {
    if (ids[i] === playerId) continue
    try {
      var p = api.getPosition(ids[i])
      var v = dpSub([p[0], p[1] + 0.9, p[2]], eye)
      var dist = dpLen(v)
      if (dist < best && dist > 1 && (v[0] * f[0] + v[1] * f[1] + v[2] * f[2]) / dist > 0.9) {
        best = dist
        c.target = ids[i]
      }
    } catch (e) {}
  }
  dpLast[playerId] = dpClock
  dpCasts.push(c)
  return true
}
globalThis.dragonPulse = dragonPulse

// Runs every cast one step. Call it once per tick.
function dpTick() {
  dpClock++
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

// A world has one of each callback. If yours already has tick, onPlayerChat
// or onPlayerAltAction, do not paste these three: put the one line inside
// each into your own callback instead.
tick = () => {
  dpTick()
}

onPlayerChat = (playerId, message) => {
  if (DP_CFG.chat && message.trim().toLowerCase() === DP_CFG.chat) return dragonPulse(playerId), false
}

onPlayerAltAction = (playerId) => {
  if (DP_CFG.item && (api.getHeldItem(playerId) || {}).name === DP_CFG.item) dragonPulse(playerId)
}
