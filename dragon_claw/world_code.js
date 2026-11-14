var CLAW_CFG = {
  chat: "!claw",
  item: "",
  range: 4,
  spinRange: 3.5,
  damage: 18,
  spinDamage: 10,
  knockback: 6,
  lunge: 3,
  hitPlayers: true,
  animate: true,
  flip: 1,
  nodeClaws: true,
  sounds: true,
  hideDist: 80,
  maxCasts: 6,
  maxMeshes: 120,
}

var CLAW_MAX_RANGE = 15

var CLAW_COL = {
  white: [235, 255, 240],
  core: [120, 255, 150],
  edge: [20, 190, 90],
  deep: [8, 90, 60],
}

var CLAW_SND = {
  ready: [["magicAccent2", 0.7, 1.5]],
  slash: [["rpgKnifeSlice1", 1, 0.9], ["drumSwish1", 0.8, 1.3]],
  spin: [["bigDrumSwish1", 1, 1.2]],
  slash2: [["rpgKnifeSlice2", 1, 0.8], ["drumSwish2", 0.8, 1.2]],
  hit: [["zapAccent2", 0.6, 1.6]],
}

var CLAW_STEP = {
  slash1: 3,
  hit1: 5,
  drop1: 9,
  spin: 9,
  hitSpin: 13,
  dropSpin: 19,
  swing2: 18,
  slash2: 21,
  hit2: 23,
  drop2: 27,
  rest: 28,
  end: 31,
}

var CLAW_CUTS = [0, 0.45, 0.9, 1.4]

var CLAW_POSE = [
  [0, {}],
  [0.15, { TorsoNode: [-6, 22, 0], HeadMesh: [0, -15, 0], ArmRightMesh: [-155, 0, -30], ArmLeftMesh: [20, 0, 12], LegRightMesh: [12, 0, 0], LegLeftMesh: [-12, 0, 0] }],
  [0.27, { TorsoNode: [14, -28, 0], HeadMesh: [0, 20, 0], ArmRightMesh: [-40, 0, 50], ArmLeftMesh: [30, 0, 15], LegRightMesh: [-18, 0, 0], LegLeftMesh: [18, 0, 0] }],
  [0.4, { TorsoNode: [10, -38, 0], HeadMesh: [0, 25, 0], ArmRightMesh: [15, 0, 35], ArmLeftMesh: [10, 0, 20], LegRightMesh: [-18, 0, 0], LegLeftMesh: [18, 0, 0] }],
  [0.45, { ArmRightMesh: [0, 0, -75], ArmLeftMesh: [0, 0, 75] }, 0],
  [0.5625, { ArmRightMesh: [0, 0, -75], ArmLeftMesh: [0, 0, 75] }, 90],
  [0.675, { ArmRightMesh: [0, 0, -75], ArmLeftMesh: [0, 0, 75] }, 180],
  [0.7875, { ArmRightMesh: [0, 0, -75], ArmLeftMesh: [0, 0, 75] }, 270],
  [0.9, { ArmRightMesh: [0, 0, -75], ArmLeftMesh: [0, 0, 75] }, 360],
  [1.03, { TorsoNode: [-6, -22, 0], HeadMesh: [0, 15, 0], ArmLeftMesh: [-155, 0, 30], ArmRightMesh: [20, 0, -12], LegLeftMesh: [12, 0, 0], LegRightMesh: [-12, 0, 0] }, 360],
  [1.15, { TorsoNode: [14, 28, 0], HeadMesh: [0, -20, 0], ArmLeftMesh: [-40, 0, -50], ArmRightMesh: [30, 0, -15], LegLeftMesh: [-18, 0, 0], LegRightMesh: [18, 0, 0] }, 360],
  [1.28, { TorsoNode: [10, 38, 0], HeadMesh: [0, -25, 0], ArmLeftMesh: [15, 0, -35], ArmRightMesh: [10, 0, -20], LegLeftMesh: [-18, 0, 0], LegRightMesh: [18, 0, 0] }, 360],
  [1.4, {}, 360],
]

var CLAW_NODES = ["TorsoNode", "HeadMesh", "ArmRightMesh", "ArmLeftMesh", "LegLeftMesh", "LegRightMesh"]
var CLAW_HIP = { LegRightMesh: -0.129, LegLeftMesh: 0.129 }

var CLAW_MESH = {
  talon: [
    [-1, 0.05, "edge"],
    [-0.667, 0.11, "core"],
    [-0.333, 0.16, "white"],
    [0, 0.18, "white"],
    [0.333, 0.16, "white"],
    [0.667, 0.11, "core"],
    [1, 0.05, "edge"],
  ],
  mark: [
    [-0.36, 0.85, 0.8],
    [0, 1, 1.25],
    [0.36, 0.85, 0.8],
  ],
  ring: [
    [0, 0.07, "edge"],
    [1, 0.1, "core"],
    [2, 0.13, "core"],
    [3, 0.15, "white"],
    [4, 0.16, "white"],
    [5, 0.15, "white"],
    [6, 0.13, "core"],
    [7, 0.1, "core"],
    [8, 0.13, "core"],
    [9, 0.15, "white"],
    [10, 0.16, "white"],
    [11, 0.15, "white"],
    [12, 0.1, "core"],
    [13, 0.07, "edge"],
  ],
  hand: [
    [0.07, 0.5, 0.1, "white", -0.11, -1, 0],
    [0.07, 0.56, 0.1, "white", 0, -1.03, 0],
    [0.07, 0.5, 0.1, "white", 0.11, -1, 0],
    [0.3, 0.3, 0.06, "core", 0, -0.9, 0],
  ],
}

var clawAdd = (a, b, k) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k]
var clawLen = (a) => Math.hypot(a[0], a[1], a[2])
var clawNorm = (a) => {
  var n = clawLen(a) || 1
  return [a[0] / n, a[1] / n, a[2] / n]
}
var clawRad = (deg) => Math.round(((deg * Math.PI) / 180) * 10000) / 10000

var clawCasts = []
var clawMeshes = 0

function clawNodePose(row, node) {
  var r = (row[1][node] || [0, 0, 0]).slice()
  var turn = row[2] || 0
  var p = [0, 0, 0]
  if (node === "TorsoNode" || CLAW_HIP[node]) r[1] += turn
  if (CLAW_HIP[node]) {
    var a = (turn * Math.PI) / 180
    p = [CLAW_HIP[node] * (Math.cos(a) - 1), 0, CLAW_HIP[node] * Math.sin(a)]
  }
  return { r: r, p: p }
}

function clawSchema(n) {
  var from = CLAW_CUTS[n]
  var to = CLAW_CUTS[n + 1]
  var rows = CLAW_POSE.filter((row) => row[0] >= from - 1e-6 && row[0] <= to + 1e-6)
  var nodes = {}
  CLAW_NODES.forEach((node) => {
    var first = clawNodePose(rows[0], node)
    var whole = 360 * Math.round(first.r[1] / 360)
    var moved = false
    var line = rows.map((row) => {
      var q = clawNodePose(row, node)
      var rot = [clawRad(q.r[0] * CLAW_CFG.flip), clawRad(q.r[1] - whole), clawRad(q.r[2])]
      var pos = [Math.round(q.p[0] * 10000) / 10000, 0, -Math.round(q.p[2] * 10000) / 10000]
      if (rot.some((v) => v) || pos.some((v) => v)) moved = true
      return { timeFraction: Math.round(((row[0] - from) / (to - from)) * 1e6) / 1e6, position: pos, rotation: rot }
    })
    if (moved) nodes[node] = { timeline: line }
  })
  return { animationDurationMs: Math.round((to - from) * 1000), loop: false, nodeAnimations: nodes }
}

function clawAnimate(c, n) {
  if (!CLAW_CFG.animate) return
  try {
    api.animateEntity(c.id, n === null ? null : clawSchema(n), 0, 1)
  } catch (e) {
    CLAW_CFG.animate = false
  }
}

function clawSound(name, pos, rate) {
  if (!CLAW_CFG.sounds) return
  ;(CLAW_SND[name] || []).forEach((s) => {
    try {
      api.broadcastSound(s[0], s[1], s[2] * (rate || 1), { playerIdOrPos: pos })
    } catch (e) {}
  })
}

function clawFx(pos, vel, colA, colB, size, life, tex, n, spread) {
  var a = CLAW_COL[colA]
  var b = CLAW_COL[colB]
  var go = vel && clawLen(vel) > 1e-6
  var s = spread || 0
  api.playParticleEffect({
    dir1: go ? vel : [-1, -1, -1],
    dir2: go ? vel : [1, 1, 1],
    pos1: [pos[0] - s, pos[1] - s, pos[2] - s],
    pos2: [pos[0] + s, pos[1] + s, pos[2] + s],
    texture: tex || "glint",
    minLifeTime: life * 0.5,
    maxLifeTime: life * 0.6,
    minEmitPower: go ? 1.6 : 0.4,
    maxEmitPower: go ? 1.7 : 2.4,
    minSize: size * 0.7,
    maxSize: size,
    manualEmitCount: n || 1,
    gravity: [0, 0, 0],
    colorGradients: [
      { timeFraction: 0, minColor: CLAW_COL.white.concat(1), maxColor: a.concat(1) },
      { timeFraction: 0.4, minColor: a.concat(1), maxColor: b.concat(1) },
      { timeFraction: 1, minColor: b.concat(0), maxColor: b.concat(0) },
    ],
    velocityGradients: [
      { timeFraction: 0, factor: 1, factor2: 1 },
      { timeFraction: 1, factor: 0.2, factor2: 0.2 },
    ],
    blendMode: 2,
    hideDist: CLAW_CFG.hideDist,
  })
}

function clawBox(c, key, thick, long, col, pos, t) {
  var id = c.m[key]
  if (!id) {
    if (clawMeshes >= CLAW_CFG.maxMeshes) return
    id = api.attemptCreateMeshEntity("Box", {
      width: thick,
      height: thick,
      depth: long,
      diffuseColor: [0, 0, 0],
      emissiveColor: CLAW_COL[col],
      hideDist: CLAW_CFG.hideDist,
    })
    if (!id) return
    c.m[key] = id
    clawMeshes++
    api.setEntityRotation(id, -Math.asin(Math.max(-1, Math.min(1, t[1]))), Math.atan2(t[0], t[2]), 0)
  }
  api.setPosition(id, pos[0], pos[1], pos[2])
}

function clawDrop(c, tag) {
  for (var key in c.m) {
    if (key.indexOf(tag) !== 0) continue
    try {
      api.deleteMeshEntity(c.m[key])
    } catch (e) {}
    delete c.m[key]
    clawMeshes--
  }
}

function clawPoint(c, side, arc, u, drift) {
  var m = CLAW_MESH.mark[arc]
  var S = clawNorm(clawAdd(clawAdd([0, 0, 0], c.R, -side), [0, 1, 0], -0.9))
  var W = clawNorm(clawAdd(clawAdd([0, 0, 0], c.R, 0.9 * side), [0, 1, 0], -1))
  var x = u * m[1]
  var at = clawAdd(c.pos, [0, 1, 0], 1.15)
  at = clawAdd(at, S, x * 1.5)
  at = clawAdd(at, W, m[0])
  at = clawAdd(at, c.F, 1.5 + 0.55 * (1 - x * x) + drift)
  var t = clawNorm(clawAdd(clawAdd([0, 0, 0], S, 1.5), c.F, -1.1 * x))
  return { at: at, t: t }
}

function clawSlash(c, tag, side, age) {
  var shown = Math.min(7, 3 + age * 2)
  var drift = Math.max(0, age - 2) * 0.2
  for (var arc = 0; arc < 3; arc++) {
    var m = CLAW_MESH.mark[arc]
    for (var i = 0; i < shown; i++) {
      var row = CLAW_MESH.talon[i]
      var q = clawPoint(c, side, arc, row[0], drift)
      clawBox(c, tag + arc + "_" + i, row[1] * m[2], 0.62 * m[1], row[2], q.at, q.t)
    }
    var tip = clawPoint(c, side, arc, CLAW_MESH.talon[shown - 1][0], drift)
    if (age < 3) clawFx(tip.at, [tip.t[0] * 3, tip.t[1] * 3, tip.t[2] * 3], "core", "edge", 0.28, 0.5, "critical_hit", 2, 0.1)
    else clawFx(clawPoint(c, side, arc, ((age * 5 + arc * 3) % 7) / 3 - 1, drift).at, null, "core", "edge", 0.2, 0.45, "glint", 2, 0.15)
  }
}

function clawBurst(c, side, drift) {
  for (var arc = 0; arc < 3; arc++) {
    for (var i = 0; i < 7; i++) {
      var q = clawPoint(c, side, arc, CLAW_MESH.talon[i][0], drift)
      clawFx(q.at, [c.F[0] * 2.5, 0.3, c.F[2] * 2.5], i % 2 ? "core" : "white", "edge", 0.32, 0.55, i % 3 ? "glint" : "square_particle")
    }
  }
}

function clawRing(c, age) {
  var rows = CLAW_MESH.ring
  var shown = Math.min(rows.length, 2 + age * 2)
  var mid = clawAdd(c.pos, [0, 1, 0], 1)
  var rad = 2.3
  for (var i = 0; i < shown; i++) {
    var a = c.turn + (rows[i][0] / rows.length) * Math.PI * 2
    var x = Math.cos(a)
    var z = Math.sin(a)
    clawBox(c, "ring_" + i, rows[i][1], ((Math.PI * 2 * rad) / rows.length) * 1.1, rows[i][2], [mid[0] + x * rad, mid[1] + Math.sin(a * 2) * 0.12, mid[2] + z * rad], [-z, 0, x])
  }
  var lead = c.turn + (shown / rows.length) * Math.PI * 2
  clawFx([mid[0] + Math.cos(lead) * rad, mid[1], mid[2] + Math.sin(lead) * rad], [-Math.sin(lead) * 4, 0.4, Math.cos(lead) * 4], "white", "core", 0.3, 0.5, "critical_hit", 3, 0.12)
}

function clawWave(c) {
  var mid = clawAdd(c.pos, [0, 1, 0], 1)
  for (var i = 0; i < 18; i++) {
    var a = (i / 18) * Math.PI * 2
    clawFx([mid[0] + Math.cos(a) * 2.3, mid[1], mid[2] + Math.sin(a) * 2.3], [Math.cos(a) * 3, 0.2, Math.sin(a) * 3], i % 2 ? "core" : "white", "edge", 0.3, 0.5, "glint")
  }
}

function clawHands(c, on) {
  if (!CLAW_CFG.nodeClaws) return
  try {
    ;["ArmRightMesh", "ArmLeftMesh"].forEach((node) => {
      if (!on) return api.updateEntityNodeMeshAttachment(c.id, node, null)
      CLAW_MESH.hand.forEach((r) => {
        api.updateEntityNodeMeshAttachment(
          c.id,
          node,
          "Box",
          { width: r[0], height: r[1], depth: r[2], diffuseColor: [0, 0, 0], emissiveColor: CLAW_COL[r[3]], hideDist: CLAW_CFG.hideDist },
          [r[4], r[5], r[6]],
          [0, 0, 0]
        )
      })
    })
  } catch (e) {
    CLAW_CFG.nodeClaws = false
  }
}

function clawHit(c, around) {
  var reach = Math.min(CLAW_MAX_RANGE, around ? CLAW_CFG.spinRange : CLAW_CFG.range)
  var ids = api.getMobIds().concat(CLAW_CFG.hitPlayers ? api.getPlayerIds() : [])
  var from = clawAdd(c.pos, [0, 1, 0], 1)
  var hits = 0
  for (var i = 0; i < ids.length; i++) {
    if (ids[i] === c.id) continue
    try {
      var p = api.getPosition(ids[i])
      var v = [p[0] - from[0], p[1] + 0.9 - from[1], p[2] - from[2]]
      var d = clawLen(v)
      if (d > reach) continue
      var flat = clawNorm([v[0], 0, v[2]])
      if (!around && d > 1 && flat[0] * c.F[0] + flat[2] * c.F[2] < 0.3) continue
      api.applyHealthChange(ids[i], -Math.round(around ? CLAW_CFG.spinDamage : CLAW_CFG.damage), c.id)
      api.applyImpulse(ids[i], flat[0] * CLAW_CFG.knockback, CLAW_CFG.knockback * 0.5, flat[2] * CLAW_CFG.knockback)
      clawFx([p[0], p[1] + 0.9, p[2]], null, "white", "core", 0.4, 0.5, "critical_hit", 8, 0.3)
      hits++
    } catch (e) {}
  }
  if (hits) clawSound("hit", c.pos)
}

function clawLunge(c) {
  if (!CLAW_CFG.lunge) return
  try {
    api.applyImpulse(c.id, c.F[0] * CLAW_CFG.lunge, 0, c.F[2] * CLAW_CFG.lunge)
  } catch (e) {}
}

function clawStep(c) {
  var T = CLAW_STEP
  var t = c.t
  var p = api.getPosition(c.id)
  c.pos = [p[0], p[1], p[2]]
  if (t === 0) {
    clawHands(c, true)
    clawAnimate(c, 0)
    clawSound("ready", c.pos)
    clawFx(clawAdd(c.pos, [0, 1, 0], 1.2), null, "core", "edge", 0.3, 0.6, "glint", 10, 0.6)
  }
  if (t === T.slash1) {
    clawSound("slash", c.pos)
    clawLunge(c)
  }
  if (t >= T.slash1 && t < T.drop1) clawSlash(c, "a", 1, t - T.slash1)
  if (t === T.hit1) clawHit(c, false)
  if (t === T.drop1) {
    clawBurst(c, 1, (T.drop1 - T.slash1 - 2) * 0.2)
    clawDrop(c, "a")
  }
  if (t === T.spin) {
    clawAnimate(c, 1)
    clawSound("spin", c.pos)
  }
  if (t >= T.spin && t < T.dropSpin) clawRing(c, t - T.spin)
  if (t === T.hitSpin) {
    clawHit(c, true)
    clawWave(c)
  }
  if (t === T.dropSpin) clawDrop(c, "ring_")
  if (t === T.swing2) clawAnimate(c, 2)
  if (t === T.slash2) {
    clawSound("slash2", c.pos)
    clawLunge(c)
  }
  if (t >= T.slash2 && t < T.drop2) clawSlash(c, "b", -1, t - T.slash2)
  if (t === T.hit2) clawHit(c, false)
  if (t === T.drop2) {
    clawBurst(c, -1, (T.drop2 - T.slash2 - 2) * 0.2)
    clawDrop(c, "b")
  }
  if (t === T.rest) clawAnimate(c, null)
  return t >= T.end
}

function clawEnd(c) {
  clawDrop(c, "")
  try {
    clawHands(c, false)
  } catch (e) {}
}

function clawTick() {
  for (var i = clawCasts.length - 1; i >= 0; i--) {
    var c = clawCasts[i]
    var done = true
    try {
      done = clawStep(c)
      c.t++
    } catch (e) {}
    if (done) {
      clawEnd(c)
      clawCasts.splice(i, 1)
    }
  }
}

function dragonClaw(playerId) {
  if (clawCasts.length >= CLAW_CFG.maxCasts || clawCasts.some((c) => c.id === playerId)) return false
  var f = api.getPlayerFacingInfo(playerId).dir
  var F = clawNorm([f[0], 0, f[2]])
  var p = api.getPosition(playerId)
  clawCasts.push({ id: playerId, t: 0, m: {}, F: F, R: [-F[2], 0, F[0]], turn: Math.atan2(-F[0], F[2]), pos: [p[0], p[1], p[2]] })
  return true
}
globalThis.dragonClaw = dragonClaw

var clawOldTick = typeof tick === "function" ? tick : null
tick = (ms) => {
  if (clawOldTick) clawOldTick(ms)
  clawTick()
}

var clawOldChat = typeof onPlayerChat === "function" ? onPlayerChat : null
onPlayerChat = (playerId, message) => {
  if (CLAW_CFG.chat && message.trim().toLowerCase() === CLAW_CFG.chat) return dragonClaw(playerId), false
  if (clawOldChat) return clawOldChat(playerId, message)
}

var clawOldAlt = typeof onPlayerAltAction === "function" ? onPlayerAltAction : null
onPlayerAltAction = (playerId, x, y, z, block, targetEId) => {
  if (CLAW_CFG.item && (api.getHeldItem(playerId) || {}).name === CLAW_CFG.item) dragonClaw(playerId)
  if (clawOldAlt) return clawOldAlt(playerId, x, y, z, block, targetEId)
}
