var AC_CFG = {
  chat: "!astral",
  range: 15,
  size: 1,
  damage: 60,
  radius: 5,
  knockback: 10,
  hitPlayers: true,
  spawnPerTick: 5,
  hold: 24,
  beamWidth: 4.5,
  beamTicks: 30,
  sounds: true,
  hideDist: 220,
  maxCasts: 1,
  maxMeshes: 399,
}

var AC_COL = {
  white: [255, 255, 255],
  ice: [205, 230, 255],
  blue: [125, 180, 255],
  deep: [70, 110, 220],
}

var AC_SND = {
  cast: [["ominousBellHit", 1, 1.3], ["magicAccent2", 0.9, 1.1]],
  ring: [["harp_pling", 0.6, 1]],
  hold: [["suspenseRiser", 1, 1.3]],
  beam: [["futureStrangePulse", 1, 1.5], ["zapAccent1", 1, 1.2], ["cannonFire2", 1, 0.7]],
  hit: [["zapAccent2", 0.7, 1.4]],
  end: [["magicAccent2", 0.7, 0.7]],
}

var AC_RING = [
  [3, 1, 14, 0.07, "white"],
  [2.7, 1, 12, 0.04, "ice"],
  [1.2, 1, 8, 0.05, "white"],
  [0.8, 1.7, 6, 0.04, "ice"],
  [0.6, 3, 6, 0.04, "white"],
  [1.1, 3.6, 8, 0.045, "ice"],
  [1.7, 4.3, 10, 0.05, "white"],
  [7.5, 5.5, 28, 0.08, "white"],
  [7.1, 5.5, 26, 0.04, "ice"],
  [5.5, 6.8, 22, 0.05, "ice"],
  [4.5, 7.3, 18, 0.07, "white"],
  [3.7, 7.8, 16, 0.045, "blue"],
  [3, 9.5, 14, 0.08, "white"],
  [2.6, 9.5, 12, 0.04, "ice"],
  [0.8, 9.5, 6, 0.05, "white"],
]

var AC_STAR = [
  [2.7, 1, 6, 2, 0.04, "blue", 0],
  [4.5, 7.3, 8, 2, 0.04, "ice", 0],
  [2.6, 9.5, 4, 1, 0.035, "blue", 45],
]

var AC_SPOKE = [
  [7.6, 8.1, 5.5, 12, 0.05, "ice", 0],
  [0.8, 2.6, 9.5, 4, 0.04, "ice", 0],
  [1.2, 2.7, 1, 6, 0.035, "ice", 30],
  [0.6, 1.7, 4.3, 5, 0.035, "blue", 0],
]

var AC_PIN = [
  [3, 1, 8, 0.07, 0.5, "blue"],
]

var AC_BELT = { radius: 7.5, height: 5.5, count: 28, spin: -0.012 }

var AC_RUNE = [
  [0.3, 0.55, "white"],
  [0.14, 0.38, "ice"],
  [0.42, 0.42, "white"],
  [0.12, 0.66, "ice"],
  [0.28, 0.28, "blue"],
  [0.18, 0.58, "white"],
  [0.38, 0.2, "ice"],
  [0.15, 0.46, "white"],
]

var AC_ORB = {
  count: 4,
  radius: 3,
  height: 9.5,
  spin: 0.025,
  circle: [0.72, 6, 0.05, "white"],
  globe: [
    [-0.68, 5, 0.03, "ice"],
    [0, 6, 0.04, "white"],
    [0.68, 5, 0.03, "ice"],
  ],
  size: 0.5,
  pole: [0.035, "blue"],
}

var AC_BEAM = {
  height: 44,
  core: [0, 60, 120],
  streaks: 4,
  flare: [
    [3.5, 0.12, "white"],
    [6, 0.24, "ice"],
  ],
}

var acCasts = []
var acMeshes = 0
var acBeat = 0

var acPlan = (function () {
  var out = []
  var seg = (x1, z1, x2, z2, y, thick, col, orb) => {
    var dx = x2 - x1
    var dz = z2 - z1
    out.push({ w: thick, h: thick, d: Math.hypot(dx, dz) * 1.04, col: col, at: [(x1 + x2) / 2, y, (z1 + z2) / 2], yaw: Math.atan2(dx, dz), orb: orb, y: y + (orb >= 0 ? AC_ORB.height : 0) })
  }
  var poly = (r, y, n, skip, thick, col, turn, orb) => {
    for (var i = 0; i < n; i++) {
      var a = turn + (i / n) * Math.PI * 2
      var b = turn + ((i + skip) / n) * Math.PI * 2
      seg(Math.cos(a) * r, Math.sin(a) * r, Math.cos(b) * r, Math.sin(b) * r, y, thick, col, orb)
    }
  }
  var rad = (deg) => ((deg || 0) * Math.PI) / 180
  AC_RING.forEach((q) => poly(q[0], q[1], q[2], 1, q[3], q[4], 0, -1))
  AC_STAR.forEach((q) => poly(q[0], q[1], q[2], q[3], q[4], q[5], rad(q[6]), -1))
  AC_SPOKE.forEach((q) => {
    for (var i = 0; i < q[3]; i++) {
      var a = rad(q[6]) + (i / q[3]) * Math.PI * 2
      seg(Math.cos(a) * q[0], Math.sin(a) * q[0], Math.cos(a) * q[1], Math.sin(a) * q[1], q[2], q[4], q[5], -1)
    }
  })
  AC_PIN.forEach((q) => {
    for (var i = 0; i < q[2]; i++) {
      var a = ((i + 0.5) / q[2]) * Math.PI * 2
      out.push({ w: q[3], h: q[4], d: q[3], col: q[5], at: [Math.cos(a) * q[0], q[1] + q[4] / 2, Math.sin(a) * q[0]], yaw: -a, orb: -1, y: q[1] })
    }
  })
  for (var i = 0; i < AC_BELT.count; i++) {
    var rune = AC_RUNE[(i * 3 + (i >> 2)) % AC_RUNE.length]
    out.push({ w: rune[0], h: rune[1], d: 0.04, col: rune[2], rune: i, orb: -1, y: AC_BELT.height })
  }
  for (var o = 0; o < AC_ORB.count; o++) {
    poly(AC_ORB.circle[0], 0, AC_ORB.circle[1], 1, AC_ORB.circle[2], AC_ORB.circle[3], 0, o)
    AC_ORB.globe.forEach((g) => poly(AC_ORB.size * Math.cos(Math.asin(g[0])), AC_ORB.size * g[0], g[1], 1, g[2], g[3], 0, o))
    out.push({ w: AC_ORB.pole[0], h: AC_ORB.size * 2.3, d: AC_ORB.pole[0], col: AC_ORB.pole[1], at: [0, 0, 0], yaw: 0, orb: o, y: AC_ORB.height })
  }
  out.forEach((p, n) => (p.n = n))
  out.sort((a, b) => a.y - b.y || a.n - b.n)
  return out
})()

var acBeamPlan = (function () {
  var out = []
  AC_BEAM.core.forEach((deg) => out.push({ kind: "core", yaw: (deg * Math.PI) / 180, col: "white" }))
  for (var i = 0; i < AC_BEAM.streaks; i++) out.push({ kind: "streak", n: i, col: i % 2 ? "blue" : "ice" })
  AC_BEAM.flare.forEach((f, k) => AC_BEAM.core.forEach((deg) => out.push({ kind: "flare", k: k, yaw: (deg * Math.PI) / 180, col: f[2] })))
  return out
})()

var acBuildTicks = () => Math.ceil(acPlan.length / Math.max(1, AC_CFG.spawnPerTick))

function acFx(pos, vel, colA, colB, size, life, tex, n, spread, power) {
  var a = AC_COL[colA]
  var b = AC_COL[colB]
  var go = vel && Math.hypot(vel[0], vel[1], vel[2]) > 1e-6
  var s = spread || 0
  api.playParticleEffect({
    dir1: go ? vel : [-1, -1, -1],
    dir2: go ? vel : [1, 1, 1],
    pos1: [pos[0] - s, pos[1] - s, pos[2] - s],
    pos2: [pos[0] + s, pos[1] + s, pos[2] + s],
    texture: tex || "glint",
    minLifeTime: life * 0.5,
    maxLifeTime: life * 0.6,
    minEmitPower: (power || 1) * (go ? 1.6 : 0.4),
    maxEmitPower: (power || 1) * (go ? 1.7 : 2.4),
    minSize: size * 0.7,
    maxSize: size,
    manualEmitCount: n || 1,
    gravity: [0, 0, 0],
    colorGradients: [
      { timeFraction: 0, minColor: AC_COL.white.concat(1), maxColor: a.concat(1) },
      { timeFraction: 0.4, minColor: a.concat(1), maxColor: b.concat(1) },
      { timeFraction: 1, minColor: b.concat(0), maxColor: b.concat(0) },
    ],
    velocityGradients: [
      { timeFraction: 0, factor: 1, factor2: 1 },
      { timeFraction: 1, factor: 0.2, factor2: 0.2 },
    ],
    blendMode: 2,
    hideDist: AC_CFG.hideDist,
  })
}

function acSound(name, pos, rate) {
  if (!AC_CFG.sounds) return
  ;(AC_SND[name] || []).forEach((s) => {
    try {
      api.broadcastSound(s[0], s[1], s[2] * (rate || 1), { playerIdOrPos: pos })
    } catch (e) {}
  })
}

function acBox(w, h, d, col) {
  return { width: w, height: h, depth: d, diffuseColor: [0, 0, 0], emissiveColor: AC_COL[col], hideDist: AC_CFG.hideDist }
}

function acMake(c, w, h, d, col) {
  if (acMeshes >= AC_CFG.maxMeshes) return null
  var id = api.attemptCreateMeshEntity("Box", acBox(w, h, d, col))
  if (!id) return null
  acMeshes++
  c.ids.push(id)
  return id
}

function acKill(c, id) {
  var i = c.ids.indexOf(id)
  if (i < 0) return
  c.ids.splice(i, 1)
  acMeshes--
  try {
    api.deleteMeshEntity(id)
  } catch (e) {}
}

function acOrbAt(c, o) {
  var k = AC_CFG.size
  var a = (o / AC_ORB.count) * Math.PI * 2 + c.spin
  return [c.mid[0] + Math.cos(a) * AC_ORB.radius * k, c.mid[1] + AC_ORB.height * k, c.mid[2] + Math.sin(a) * AC_ORB.radius * k]
}

function acRuneAt(c, i) {
  var k = AC_CFG.size
  var a = (i / AC_BELT.count) * Math.PI * 2 + c.belt
  return { a: a, at: [c.mid[0] + Math.cos(a) * AC_BELT.radius * k, 0, c.mid[2] + Math.sin(a) * AC_BELT.radius * k] }
}

function acPlace(c, part, first) {
  var k = AC_CFG.size
  var p = part.p
  if (p.rune !== undefined) {
    var r = acRuneAt(c, p.rune)
    api.setPosition(part.id, r.at[0], c.mid[1] + (AC_BELT.height + 0.08) * k + (p.h * k) / 2, r.at[2])
    if (first || (c.t + p.rune) % 4 === 0) api.setEntityRotation(part.id, 0, Math.PI / 2 - r.a, 0)
    return
  }
  var base = p.orb >= 0 ? acOrbAt(c, p.orb) : c.mid
  api.setPosition(part.id, base[0] + p.at[0] * k, base[1] + p.at[1] * k, base[2] + p.at[2] * k)
  if (first) api.setEntityRotation(part.id, 0, p.yaw, 0)
}

function acBuild(c) {
  var k = AC_CFG.size
  for (var n = 0; n < AC_CFG.spawnPerTick && c.next < acPlan.length; n++) {
    var p = acPlan[c.next]
    var id = acMake(c, p.w * k, p.h * k, p.d * k, p.col)
    if (!id) return
    var part = { id: id, p: p }
    c.parts.push(part)
    if (p.orb >= 0 || p.rune !== undefined) c.moving.push(part)
    acPlace(c, part, true)
    c.next++
    if (n === 0 && p.at) acFx([c.mid[0] + p.at[0] * k, (p.orb >= 0 ? acOrbAt(c, p.orb)[1] : c.mid[1]) + p.at[1] * k, c.mid[2] + p.at[2] * k], null, "white", "blue", 0.3, 0.5, "glint", 2, 0.2)
  }
  if (c.t % 12 === 0) acSound("ring", c.mid, 0.8 + (c.next / acPlan.length) * 0.8)
}

function acBeamSize(c, f) {
  var k = AC_CFG.size
  var life = AC_CFG.beamTicks
  var w = 0.06
  if (f >= 0) w = Math.min(1, (f + 1) / 5)
  if (f > life - 8) w = Math.max(0, (life - f) / 8)
  if (f >= 5 && f <= life - 8) w = 1 + Math.sin(f * 2.4) * 0.06
  return Math.max(0.06, w * AC_CFG.beamWidth * k)
}

function acBeam(c, f) {
  var k = AC_CFG.size
  var H = AC_BEAM.height * k
  var w = acBeamSize(c, f)
  var grow = Math.max(0, Math.min(1, (f + 1) / 8))
  if (f > AC_CFG.beamTicks - 8) grow = Math.max(0.02, (AC_CFG.beamTicks - f) / 8)
  for (var n = 0; n < 3 && c.beamNext < acBeamPlan.length; n++) {
    var q = acBeamPlan[c.beamNext]
    var id = acMake(c, 0.06, q.kind === "flare" ? 0.05 : H, 0.06, q.col)
    if (!id) break
    c.beam.push({ id: id, q: q })
    api.setEntityRotation(id, 0, q.yaw || 0, 0)
    api.setPosition(id, c.mid[0], c.mid[1] + (q.kind === "flare" ? 0.2 : H / 2 - 3), c.mid[2])
    c.beamNext++
  }
  if (f < 0) return
  for (var i = 0; i < c.beam.length; i++) {
    var b = c.beam[i]
    if (b.q.kind === "core") api.updateMeshEntity(b.id, "Box", acBox(w, H, w / Math.sqrt(3), b.q.col))
    else if (b.q.kind === "streak") {
      var a = (b.q.n / AC_BEAM.streaks) * Math.PI * 2 + f * 0.35
      var r = w * 0.62
      api.updateMeshEntity(b.id, "Box", acBox(Math.max(0.05, w * 0.07), H, Math.max(0.05, w * 0.07), b.q.col))
      api.setPosition(b.id, c.mid[0] + Math.cos(a) * r, c.mid[1] + H / 2 - 3, c.mid[2] + Math.sin(a) * r)
    } else {
      var fl = AC_BEAM.flare[b.q.k]
      var d = Math.max(0.1, fl[0] * 2 * k * grow)
      api.updateMeshEntity(b.id, "Box", acBox(d, 0.12 * k, d / Math.sqrt(3), b.q.col))
      api.setPosition(b.id, c.mid[0], c.mid[1] + fl[1] * k, c.mid[2])
    }
  }
}

function acHit(c) {
  var reach = AC_CFG.radius * AC_CFG.size
  var ids = api.getMobIds().concat(AC_CFG.hitPlayers ? api.getPlayerIds() : [])
  var hits = 0
  for (var i = 0; i < ids.length; i++) {
    if (ids[i] === c.id) continue
    try {
      var p = api.getPosition(ids[i])
      var dx = p[0] - c.mid[0]
      var dz = p[2] - c.mid[2]
      var far = Math.hypot(dx, dz)
      if (far > reach || p[1] < c.mid[1] - 6) continue
      var n = far || 1
      api.applyHealthChange(ids[i], -Math.round(AC_CFG.damage), c.id)
      api.applyImpulse(ids[i], (dx / n) * AC_CFG.knockback, AC_CFG.knockback * 0.6, (dz / n) * AC_CFG.knockback)
      hits++
    } catch (e) {}
  }
  if (hits) acSound("hit", c.mid)
}

function acSparks(c, f) {
  var k = AC_CFG.size
  var w = acBeamSize(c, f)
  for (var i = 0; i < 4; i++) {
    var a = f * 1.3 + (i * Math.PI) / 2
    var y = ((f * 7 + i * 13) % 26) * k
    acFx([c.mid[0] + Math.cos(a) * w * 0.7, c.mid[1] + y, c.mid[2] + Math.sin(a) * w * 0.7], [0, 6, 0], "white", "ice", 0.5 * k, 0.6, "glint", 2, 0.3)
  }
  if (f < 6) {
    for (var j = 0; j < 8; j++) {
      var b = (j / 8) * Math.PI * 2 + f * 0.4
      acFx([c.mid[0] + Math.cos(b) * 1.5 * k, c.mid[1] + 0.4, c.mid[2] + Math.sin(b) * 1.5 * k], [Math.cos(b) * 6, 0.5, Math.sin(b) * 6], "white", "blue", 0.6 * k, 0.7, j % 2 ? "glint" : "critical_hit", 2, 0.2, 1.6)
    }
  }
}

function acStep(c) {
  if (c.B === undefined && (c.next >= acPlan.length || c.t > acBuildTicks() * 2 + 40)) c.B = c.t
  var B = c.B === undefined ? Infinity : c.B
  var F = B + AC_CFG.hold
  var E = F + AC_CFG.beamTicks
  var t = c.t
  var k = AC_CFG.size
  var rush = t < B ? 1 : 1 + Math.min(1, (t - B) / Math.max(1, AC_CFG.hold)) * 4
  c.spin += AC_ORB.spin * rush
  c.belt += AC_BELT.spin * rush
  if (t === 0) {
    acSound("cast", c.mid)
    acFx([c.mid[0], c.mid[1] + 1 * k, c.mid[2]], null, "white", "blue", 0.4, 0.8, "glint", 12, 2 * k)
  }
  if (t < B) acBuild(c)
  for (var i = 0; i < c.moving.length; i++) acPlace(c, c.moving[i], false)
  if (t === B) acSound("hold", c.mid)
  if (t >= B && t < F) {
    var a = t * 0.9
    var r = (1 - (t - B) / Math.max(1, AC_CFG.hold)) * 7 * k
    var y = c.mid[1] + (1 + ((t * 3) % 9)) * k
    acFx([c.mid[0] + Math.cos(a) * r, y, c.mid[2] + Math.sin(a) * r], [-Math.cos(a) * 5, 0, -Math.sin(a) * 5], "white", "blue", 0.4 * k, 0.6, "glint", 3, 0.3)
    if (t >= F - Math.ceil(acBeamPlan.length / 3) - 2) acBeam(c, t - F)
  }
  if (t >= F && t < E) {
    acBeam(c, t - F)
    acSparks(c, t - F)
    if (t === F) acSound("beam", c.mid)
    if (t === F + 2) acHit(c)
    if (t < F + 10) {
      var inner = c.parts.filter((x) => x.p.orb < 0 && x.p.rune === undefined && Math.hypot(x.p.at[0], x.p.at[2]) < AC_CFG.beamWidth / 2 + 0.4).slice(0, 12)
      inner.forEach((x) => {
        acKill(c, x.id)
        c.parts.splice(c.parts.indexOf(x), 1)
      })
    }
  }
  if (t === E) acSound("end", c.mid)
  if (t >= E) {
    var gone = c.ids.splice(0, 60)
    acMeshes -= gone.length
    gone.forEach((id) => {
      try {
        api.deleteMeshEntity(id)
      } catch (e) {}
    })
    c.moving = c.moving.filter((x) => c.ids.indexOf(x.id) >= 0)
    acFx([c.mid[0], c.mid[1] + 6 * k, c.mid[2]], null, "white", "blue", 0.4 * k, 0.9, "glint", 8, 5 * k)
  }
  return t >= E && c.ids.length === 0
}

function acEnd(c) {
  c.ids.forEach((id) => {
    try {
      api.deleteMeshEntity(id)
    } catch (e) {}
  })
  acMeshes -= c.ids.length
  c.ids = []
}

function acTick() {
  acBeat++
  for (var i = acCasts.length - 1; i >= 0; i--) {
    var c = acCasts[i]
    var done = true
    try {
      done = acStep(c)
      c.t++
    } catch (e) {
      try {
        api.sendMessage(c.id, "Astral Circle stopped at tick " + c.t + ": " + e, { color: "orange" })
      } catch (x) {}
    }
    if (done) {
      acEnd(c)
      acCasts.splice(i, 1)
    }
  }
}

function astralCircle(playerId, at) {
  if (acCasts.length >= AC_CFG.maxCasts) return false
  var mid = at
  if (!mid) {
    var f = api.getPlayerFacingInfo(playerId).dir
    var n = Math.hypot(f[0], f[2]) || 1
    var p = api.getPosition(playerId)
    var far = Math.min(15, Math.max(0, AC_CFG.range))
    mid = [p[0] + (f[0] / n) * far, p[1], p[2] + (f[2] / n) * far]
  }
  acCasts.push({ id: playerId, t: 0, mid: [mid[0], mid[1], mid[2]], ids: [], parts: [], moving: [], beam: [], next: 0, beamNext: 0, spin: 0, belt: 0 })
  return true
}
globalThis.astralCircle = astralCircle
globalThis.astralCircleBeat = () => acBeat

var acOldTick = typeof tick === "function" ? tick : null
tick = (ms) => {
  if (acOldTick) acOldTick(ms)
  acTick()
}

var acOldChat = typeof onPlayerChat === "function" ? onPlayerChat : null
onPlayerChat = (playerId, message) => {
  if (AC_CFG.chat && message.trim().toLowerCase() === AC_CFG.chat) return astralCircle(playerId), false
  if (acOldChat) return acOldChat(playerId, message)
}
