var CLAW_CFG = {
  chat: "!claw",
  item: "",
  range: 10,
  spinRange: 6,
  slashSize: 1.6,
  tilt: 25,
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
  maxMeshes: 200,
}

var CLAW_MAX_RANGE = 15

var CLAW_COL = {
  white: [205, 255, 195],
  hot: [125, 228, 115],
  core: [55, 208, 70],
  mid: [38, 172, 60],
  edge: [125, 152, 35],
  deep: [45, 72, 42],
  void: [85, 126, 55],
}

var CLAW_SND = {
  ready: [["magicAccent2", 0.7, 1.5]],
  slash: [["rpgKnifeSlice1", 1, 0.9], ["drumSwish1", 0.8, 1.3]],
  spin: [["bigDrumSwish1", 1, 1.2]],
  slash2: [["rpgKnifeSlice2", 1, 0.8], ["drumSwish2", 0.8, 1.2]],
  hit: [["zapAccent2", 0.6, 1.6]],
}

var CLAW_STEP = {
  slash1: 8,
  drop1: 26,
  spin: 21,
  turn: 12,
  dropSpin: 40,
  slash2: 40,
  drop2: 58,
  rest: 55,
  end: 60,
  draw: 6,
  fly: 10,
}

var CLAW_POSE = [
  [0, {}],
  [8, { TorsoNode: [-6, 22, 0], HeadMesh: [0, -15, 0], ArmRightMesh: [-155, 0, -30], ArmLeftMesh: [20, 0, 12], LegRightMesh: [12, 0, 0], LegLeftMesh: [-12, 0, 0] }],
  [11, { TorsoNode: [1, 4, 0], HeadMesh: [0, -3, 0], ArmRightMesh: [-115, 0, -2], ArmLeftMesh: [23, 0, 13], LegRightMesh: [2, 0, 0], LegLeftMesh: [-2, 0, 0] }],
  [14, { TorsoNode: [14, -28, 0], HeadMesh: [0, 20, 0], ArmRightMesh: [-40, 0, 50], ArmLeftMesh: [30, 0, 15], LegRightMesh: [-18, 0, 0], LegLeftMesh: [18, 0, 0] }],
  [18, { TorsoNode: [10, -38, 0], HeadMesh: [0, 25, 0], ArmRightMesh: [15, 0, 35], ArmLeftMesh: [10, 0, 20], LegRightMesh: [-18, 0, 0], LegLeftMesh: [18, 0, 0] }],
  [21, { ArmRightMesh: [0, 0, -75], ArmLeftMesh: [0, 0, 75] }, 0, 1],
  [24, { ArmRightMesh: [0, 0, -75], ArmLeftMesh: [0, 0, 75] }, 90, 1],
  [27, { ArmRightMesh: [0, 0, -75], ArmLeftMesh: [0, 0, 75] }, 180, 1],
  [30, { ArmRightMesh: [0, 0, -75], ArmLeftMesh: [0, 0, 75] }, 270, 1],
  [33, { ArmRightMesh: [0, 0, -75], ArmLeftMesh: [0, 0, 75] }, 360, 1],
  [40, { TorsoNode: [-6, -22, 0], HeadMesh: [0, 15, 0], ArmLeftMesh: [-155, 0, 30], ArmRightMesh: [20, 0, -12], LegLeftMesh: [12, 0, 0], LegRightMesh: [-12, 0, 0] }, 360],
  [43, { TorsoNode: [1, -4, 0], HeadMesh: [0, 3, 0], ArmLeftMesh: [-115, 0, 2], ArmRightMesh: [23, 0, -13], LegLeftMesh: [2, 0, 0], LegRightMesh: [-2, 0, 0] }, 360],
  [46, { TorsoNode: [14, 28, 0], HeadMesh: [0, -20, 0], ArmLeftMesh: [-40, 0, -50], ArmRightMesh: [30, 0, -15], LegLeftMesh: [-18, 0, 0], LegRightMesh: [18, 0, 0] }, 360],
  [50, { TorsoNode: [10, 38, 0], HeadMesh: [0, -25, 0], ArmLeftMesh: [15, 0, -35], ArmRightMesh: [10, 0, -20], LegLeftMesh: [-18, 0, 0], LegRightMesh: [18, 0, 0] }, 360],
  [55, {}, 360],
]

var CLAW_NODES = ["TorsoNode", "HeadMesh", "ArmRightMesh", "ArmLeftMesh", "LegLeftMesh", "LegRightMesh"]
var CLAW_TURNS = ["TorsoNode", "LegLeftMesh", "LegRightMesh"]

var CLAW_MESH = {
  slash: [
    [1, 0.09, 0.05, "core"],
    [0.8, 0.2, 0.07, "mid"],
    [0.6, 0.32, 0.09, "hot"],
    [0.66, 0.2, 0.12, "edge"],
    [0.52, 0.12, 0.15, "deep"],
    [0.38, 0.07, 0.18, "void"],
    [0.2, 0.035, 0.21, "hot"],
  ],
  mark: [
    [-0.6, 0.82, 0.85],
    [0, 1, 1.15],
    [0.6, 0.82, 0.85],
  ],
  ring: [
    [0.05, "edge"],
    [0.09, "core"],
    [0.13, "white"],
    [0.16, "white"],
    [0.18, "white"],
    [0.16, "white"],
    [0.13, "core"],
    [0.1, "core"],
    [0.13, "core"],
    [0.16, "white"],
    [0.18, "white"],
    [0.16, "white"],
    [0.13, "white"],
    [0.09, "core"],
    [0.06, "edge"],
    [0.04, "edge"],
  ],
  hand: [
    [0.09, 0.2, 0.11, "edge", -0.11, -0.82, 0, 0],
    [0.07, 0.24, 0.09, "core", -0.11, -1.0, 0.02, 0.2],
    [0.045, 0.24, 0.06, "white", -0.11, -1.2, 0.08, 0.5],
    [0.09, 0.2, 0.11, "edge", 0, -0.86, 0, 0],
    [0.07, 0.24, 0.09, "core", 0, -1.04, 0.02, 0.2],
    [0.045, 0.24, 0.06, "white", 0, -1.24, 0.08, 0.5],
    [0.09, 0.2, 0.11, "edge", 0.11, -0.82, 0, 0],
    [0.07, 0.24, 0.09, "core", 0.11, -1.0, 0.02, 0.2],
    [0.045, 0.24, 0.06, "white", 0.11, -1.2, 0.08, 0.5],
    [0.34, 0.1, 0.16, "void", 0, -0.7, 0, 0],
    [0.3, 0.34, 0.05, "mid", 0, -0.92, 0, 0],
  ],
}

var clawAdd = (a, b, k) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k]
var clawLen = (a) => Math.hypot(a[0], a[1], a[2])
var clawNorm = (a) => {
  var n = clawLen(a) || 1
  return [a[0] / n, a[1] / n, a[2] / n]
}
var clawRad = (deg) => Math.round(((deg * Math.PI) / 180) * 100) / 100

var clawCasts = []
var clawMeshes = 0

function clawNodePose(row, node) {
  var r = (row[1][node] || [0, 0, 0]).slice()
  if (CLAW_TURNS.indexOf(node) >= 0) r[1] += row[2] || 0
  if (node === "TorsoNode" && row[3]) r[2] += CLAW_CFG.tilt
  return r
}

function clawSchema(n) {
  var a = CLAW_POSE[n]
  var b = CLAW_POSE[n + 1]
  var nodes = {}
  CLAW_NODES.forEach((node) => {
    var p = clawNodePose(a, node)
    var q = clawNodePose(b, node)
    var whole = 360 * Math.round(p[1] / 360)
    var rot = (r) => [clawRad(r[0] * CLAW_CFG.flip), clawRad(r[1] - whole), clawRad(r[2])]
    var from = rot(p)
    var to = rot(q)
    if (!from.concat(to).some((v) => v)) return
    nodes[node] = { timeline: [{ timeFraction: 0, rotation: from }, { timeFraction: 1, rotation: to }] }
  })
  return { animationDurationMs: (b[0] - a[0]) * 50, loop: false, nodeAnimations: nodes }
}

function clawAnimate(c) {
  if (!CLAW_CFG.animate) return
  try {
    if (c.t === CLAW_STEP.rest) return api.animateEntity(c.id, null, 0, 1)
    for (var n = 0; n < CLAW_POSE.length - 1; n++) {
      if (CLAW_POSE[n][0] === c.t) api.animateEntity(c.id, clawSchema(n), 0, 1)
    }
  } catch (e) {
    CLAW_CFG.animate = false
    try {
      api.sendMessage(c.id, "Dragon Claw animation stopped: " + e, { color: "orange" })
    } catch (e2) {}
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

function clawBox(c, key, thick, long, col, pos, t, resize, tall) {
  var id = c.m[key]
  var box = { width: thick, height: tall || thick, depth: long, diffuseColor: [0, 0, 0], emissiveColor: CLAW_COL[col], hideDist: CLAW_CFG.hideDist }
  if (!id) {
    if (clawMeshes >= CLAW_CFG.maxMeshes) return
    id = api.attemptCreateMeshEntity("Box", box)
    if (!id) return
    c.m[key] = id
    clawMeshes++
    resize = 2
  } else if (resize) api.updateMeshEntity(id, "Box", box)
  if (resize === 2) api.setEntityRotation(id, -Math.asin(Math.max(-1, Math.min(1, t[1]))), Math.atan2(t[0], t[2]), 0)
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

var clawReach = (around) => Math.min(CLAW_MAX_RANGE, around ? CLAW_CFG.spinRange : CLAW_CFG.range)

var clawSize = () => Math.max(0.5, Math.min(3, CLAW_CFG.slashSize))
var clawNear = () => 0.9 + 1.3 * clawSize()

function clawFront(age) {
  var fly = 1 - Math.min(1, Math.max(0, age - CLAW_STEP.draw - 1) / CLAW_STEP.fly)
  return (1 - fly * fly) * Math.max(0, clawReach(false) - clawNear())
}

function clawPoint(c, side, arc, u, drift, back) {
  var m = CLAW_MESH.mark[arc]
  var S = clawNorm(clawAdd(clawAdd([0, 0, 0], c.R, -side), [0, 1, 0], -0.9))
  var W = clawNorm(clawAdd(clawAdd([0, 0, 0], c.R, 0.9 * side), [0, 1, 0], -1))
  var k = clawSize()
  var at = clawAdd(c.from, [0, 1, 0], 0.8 + 1.1 * k)
  at = clawAdd(at, S, u * m[1] * 1.9 * k)
  at = clawAdd(at, W, m[0] * k)
  at = clawAdd(at, c.F, clawNear() + drift - (back || 0))
  return { at: at, t: S }
}

function clawSlash(c, tag, side, age) {
  var rows = CLAW_MESH.slash
  var part = Math.min(1, (age + 1) / CLAW_STEP.draw)
  var drift = clawFront(age)
  var k = clawSize()
  for (var arc = 0; arc < 3; arc++) {
    var m = CLAW_MESH.mark[arc]
    var q = clawPoint(c, side, arc, part - 1, drift)
    for (var i = 0; i < rows.length; i++) {
      clawBox(c, tag + arc + "_" + i, rows[i][2] * k, rows[i][0] * part * m[1] * 3.8 * k, rows[i][3], q.at, q.t, age > 0 && age < CLAW_STEP.draw, rows[i][1] * m[2] * k)
    }
    var tip = clawPoint(c, side, arc, 2 * part - 1, drift)
    if (age < CLAW_STEP.draw) clawFx(tip.at, [tip.t[0] * 4, tip.t[1] * 4, tip.t[2] * 4], "white", "hot", 0.3 * k, 0.5, "critical_hit", 4, 0.15)
    else if (age === CLAW_STEP.draw) clawFx(clawPoint(c, side, arc, 0, drift).at, null, "white", "core", 0.3 * k, 0.4, "glint", 3, 0.4 * k)
    else {
      var u = ((age * 5 + arc * 3) % 9) / 4 - 1
      clawFx(clawPoint(c, side, arc, u, drift, 0.5).at, [-c.F[0], 0.1, -c.F[2]], "core", "edge", 0.26 * k, 0.5, "glint", 2, 0.15)
      clawFx(clawPoint(c, side, arc, -u, drift, 0.9).at, null, "deep", "void", 0.34 * k, 0.6, "square_particle", 1, 0.1)
    }
  }
  if (age >= CLAW_STEP.draw / 2) clawSweep(c, tag, false, clawNear() + 0.3 + drift)
}

function clawBurst(c, side, age) {
  var drift = clawFront(age)
  for (var arc = 0; arc < 3; arc++) {
    for (var i = 0; i < 9; i += 2) {
      var q = clawPoint(c, side, arc, i / 4 - 1, drift)
      clawFx(q.at, [c.F[0] * 2.5, 0.3, c.F[2] * 2.5], i % 4 ? "core" : "white", "edge", 0.34 * clawSize(), 0.55, i % 4 ? "glint" : "critical_hit", 2, 0.1)
    }
  }
}

function clawRing(c, age) {
  var rows = CLAW_MESH.ring
  var shown = Math.min(rows.length, Math.ceil(((age + 1) / CLAW_STEP.turn) * rows.length))
  var mid = clawAdd(c.pos, [0, 1, 0], 1)
  var grow = Math.max(0, Math.min(1, (age - CLAW_STEP.turn) / 6))
  var rad = 2.3 + grow * Math.max(0, clawReach(true) - 2.6)
  var long = ((Math.PI * 2 * rad) / rows.length) * 1.1
  var lean = ((Math.max(-40, Math.min(40, CLAW_CFG.tilt)) * Math.PI) / 180) * (1 - grow)
  var X = c.F
  var Y = clawAdd(clawAdd([0, 0, 0], c.R, Math.cos(lean)), [0, 1, 0], Math.sin(lean))
  var how = grow > 0 ? 2 : 0
  var spot = (a, r) => clawAdd(clawAdd(mid, X, Math.cos(a) * r), Y, Math.sin(a) * r)
  var k = 1 + grow * 0.6
  for (var i = 0; i < shown; i++) {
    var a = (i / rows.length) * Math.PI * 2
    var t = clawAdd(clawAdd([0, 0, 0], X, -Math.sin(a)), Y, Math.cos(a))
    clawBox(c, "ring_" + i, rows[i][0] * k, long, rows[i][1], spot(a, rad), t, how)
    if (i % 2 === 0) clawBox(c, "ring_g" + i, rows[i][0] * 1.35 * k, long * 1.6, i % 4 ? "void" : "deep", spot(a, rad - 0.2), t, how)
  }
  var lead = (shown / rows.length) * Math.PI * 2
  var tl = clawAdd(clawAdd([0, 0, 0], X, -Math.sin(lead) * 4), Y, Math.cos(lead) * 4)
  clawFx(spot(lead, rad), tl, "white", "core", 0.3, 0.5, "critical_hit", 3, 0.12)
  if (age === CLAW_STEP.turn) clawWave(c, mid, rad)
  clawSweep(c, "ring", true, rad + 0.6)
}

function clawWave(c, mid, rad) {
  var speed = Math.max(3, (clawReach(true) - rad) * 3.4)
  for (var i = 0; i < 18; i++) {
    var a = (i / 18) * Math.PI * 2
    clawFx([mid[0] + Math.cos(a) * rad, mid[1], mid[2] + Math.sin(a) * rad], [Math.cos(a) * speed, 0.2, Math.sin(a) * speed], i % 2 ? "core" : "white", "edge", 0.32, 0.5, "glint")
  }
}

function clawHands(c, on) {
  if (!CLAW_CFG.nodeClaws || !on === !c.claws) return
  c.claws = on
  try {
    ;["ArmRightMesh", "ArmLeftMesh"].forEach((node) => {
      if (!on) return api.updateEntityNodeMeshAttachment(c.id, node, null)
      CLAW_MESH.hand.forEach((r) => {
        api.updateEntityNodeMeshAttachment(
          c.id,
          node,
          "Box",
          { width: r[0], height: r[1], depth: r[2], diffuseColor: [0, 0, 0], emissiveColor: CLAW_COL[r[3]], hideDist: CLAW_CFG.hideDist },
          [r[4], r[5], r[6] * CLAW_CFG.flip],
          [r[7] * CLAW_CFG.flip, 0, 0]
        )
      })
    })
  } catch (e) {
    CLAW_CFG.nodeClaws = false
  }
}

function clawSweep(c, tag, around, far) {
  var reach = Math.min(clawReach(around), far)
  var done = (c.hit[tag] = c.hit[tag] || {})
  var ids = api.getMobIds().concat(CLAW_CFG.hitPlayers ? api.getPlayerIds() : [])
  var from = clawAdd(around ? c.pos : c.from, [0, 1, 0], 1)
  var hits = 0
  for (var i = 0; i < ids.length; i++) {
    if (ids[i] === c.id || done[ids[i]]) continue
    try {
      var p = api.getPosition(ids[i])
      var v = [p[0] - from[0], p[1] + 0.9 - from[1], p[2] - from[2]]
      var flat = clawNorm([v[0], 0, v[2]])
      if (around) {
        if (clawLen(v) > reach) continue
      } else {
        var along = v[0] * c.F[0] + v[2] * c.F[2]
        var side = v[0] * c.R[0] + v[2] * c.R[2]
        if (along < -0.5 || along > reach || Math.abs(side) > 1.2 + clawSize() || Math.abs(v[1]) > 1.4 + clawSize()) continue
        flat = c.F
      }
      done[ids[i]] = 1
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
  clawAnimate(c)
  if (t === 0) {
    clawHands(c, true)
    clawSound("ready", c.pos)
    clawFx(clawAdd(c.pos, [0, 1, 0], 1.2), null, "core", "edge", 0.3, 0.6, "glint", 10, 0.6)
  }
  if (t === T.slash1 || t === T.slash2) {
    c.from = c.pos
    clawSound(t === T.slash1 ? "slash" : "slash2", c.pos)
    clawLunge(c)
  }
  if (t >= T.slash1 && t < T.drop1) clawSlash(c, "a", 1, t - T.slash1)
  if (t === T.drop1) {
    clawBurst(c, 1, t - T.slash1)
    clawDrop(c, "a")
  }
  if (t === T.spin) clawSound("spin", c.pos)
  if (t >= T.spin && t < T.dropSpin) clawRing(c, t - T.spin)
  if (t === T.dropSpin) clawDrop(c, "ring_")
  if (t >= T.slash2 && t < T.drop2) clawSlash(c, "b", -1, t - T.slash2)
  if (t === T.drop2) {
    clawBurst(c, -1, t - T.slash2)
    clawDrop(c, "b")
  }
  if (t === T.rest + 3) clawHands(c, false)
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
  clawCasts.push({ id: playerId, t: 0, m: {}, hit: {}, from: [p[0], p[1], p[2]], F: F, R: [-F[2], 0, F[0]], turn: Math.atan2(-F[0], F[2]), pos: [p[0], p[1], p[2]] })
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
