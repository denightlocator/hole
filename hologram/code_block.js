if (typeof hologram !== "function") {
  ;(function () {
var HOLO_CFG = {
  chat: "!holo",
  distance: 2,
  size: 1,
  spawnPerTick: 5,
  animate: true,
  sounds: true,
  hideDist: 60,
  maxHolos: 1,
  maxMeshes: 399,
}

var HOLO_COL = {
  bright: [210, 248, 255],
  cyan: [70, 215, 255],
  blue: [35, 130, 255],
  dim: [20, 75, 150],
  warn: [255, 165, 55],
}

var HOLO_SND = {
  on: [["futureStrangePulse", 0.8, 1.6], ["sonarBeep", 0.6, 1.4]],
  ready: [["sonarBeep", 0.7, 1.9]],
  off: [["zapAccent2", 0.6, 0.8]],
}

var HOLO_PANEL = {
  main: { x: 0, y: 1.75, z: -0.25, yaw: 0, w: 1.7, h: 0.9 },
  left: { x: -1.3, y: 1.55, z: 0.2, yaw: 38, w: 0.85, h: 1 },
  right: { x: 1.3, y: 1.55, z: 0.2, yaw: -38, w: 0.85, h: 1 },
}

var HOLO_BASE = { rings: [[1.1, 0.05, 16, 0.03, "cyan"], [0.82, 0.05, 12, 0.02, "blue"], [0.36, 0.72, 8, 0.02, "cyan"]], pins: 8, spokes: 4 }
var HOLO_GLOBE = { y: 1.05, r: 0.28, hoops: [[-0.68, 5, "blue"], [0, 6, "bright"], [0.68, 5, "blue"]] }
var HOLO_ARC = { y: 2.45, r: 1.35, from: 108, to: 252, pieces: 10, ticks: 7 }
var HOLO_KEYS = { y: 0.95, z: 0.6, rows: 3, cols: 9, w: 0.1, gap: 0.03 }
var HOLO_TEXT = [0.62, 0.4, 0.7, 0.3, 0.55, 0.46]
var HOLO_T = 0.02

var holoList = []
var holoMeshes = 0
var holoBeat = 0

var holoPlan = (function () {
  var out = []
  var rad = (deg) => (deg * Math.PI) / 180
  var add = (p) => (out.push(p), p)
  var flat = (x1, z1, x2, z2, y, thick, col) => {
    var dx = x2 - x1
    var dz = z2 - z1
    return add({ x: (x1 + x2) / 2, y: y, z: (z1 + z2) / 2, w: thick, h: thick, d: Math.hypot(dx, dz) * 1.04, yaw: Math.atan2(dx, dz), col: col })
  }
  var ring = (r, y, n, thick, col, from, to) => {
    var a0 = from === undefined ? 0 : rad(from)
    var span = to === undefined ? Math.PI * 2 : rad(to) - a0
    for (var i = 0; i < n; i++) {
      var a = a0 + (i / n) * span
      var b = a0 + ((i + 1) / n) * span
      flat(Math.sin(a) * r, Math.cos(a) * r, Math.sin(b) * r, Math.cos(b) * r, y, thick, col)
    }
  }
  var on = (P, x, y, w, h, col, lift) => {
    var t = rad(P.yaw)
    var f = (lift || 0) * 0.012
    return add({ x: P.x - x * Math.cos(t) + f * Math.sin(t), y: P.y + y, z: P.z + x * Math.sin(t) + f * Math.cos(t), w: w, h: h, d: HOLO_T, yaw: t, col: col, P: P, px: x, py: y })
  }
  var frame = (P) => {
    var a = 0.16
    ;[-1, 1].forEach((sx) =>
      [-1, 1].forEach((sy) => {
        on(P, sx * (P.w / 2 - a / 2), (sy * P.h) / 2, a, 0.025, "bright")
        on(P, (sx * P.w) / 2, sy * (P.h / 2 - a / 2), 0.025, a, "bright")
      })
    )
    on(P, 0, P.h / 2, P.w - 2 * a - 0.08, 0.012, "blue")
    on(P, 0, -P.h / 2, P.w - 2 * a - 0.08, 0.012, "blue")
  }

  HOLO_BASE.rings.forEach((q) => ring(q[0], q[1], q[2], q[3], q[4]))
  for (var i = 0; i < HOLO_BASE.pins; i++) {
    var a = ((i + 0.5) / HOLO_BASE.pins) * Math.PI * 2
    add({ x: Math.sin(a) * 1.1, y: 0.14, z: Math.cos(a) * 1.1, w: 0.035, h: 0.18, d: 0.035, yaw: a, col: i % 2 ? "blue" : "cyan" })
  }
  for (var s = 0; s < HOLO_BASE.spokes; s++) {
    var b = (s / HOLO_BASE.spokes) * Math.PI * 2 + Math.PI / 4
    flat(Math.sin(b) * 0.2, Math.cos(b) * 0.2, Math.sin(b) * 0.82, Math.cos(b) * 0.82, 0.05, 0.015, "dim")
  }
  for (var o = 0; o < 2; o++) add({ x: 0, y: 0.05, z: 0.96, w: 0.12, h: 0.04, d: 0.05, yaw: 0, col: "bright", anim: "orbit", n: o })
  add({ x: 0, y: 0.4, z: 0, w: 0.015, h: 0.66, d: 0.015, yaw: 0, col: "blue" })
  add({ x: 0, y: 0.1, z: 0, w: 0.16, h: 0.08, d: 0.16, yaw: Math.PI / 4, col: "cyan" })

  HOLO_GLOBE.hoops.forEach((hp) => {
    var r = HOLO_GLOBE.r * Math.cos(Math.asin(hp[0]))
    for (var i = 0; i < hp[1]; i++) {
      var a = ((i + 0.5) / hp[1]) * Math.PI * 2
      add({ x: 0, y: HOLO_GLOBE.y + HOLO_GLOBE.r * hp[0], z: 0, w: 0.016, h: 0.016, d: 2 * r * Math.tan(Math.PI / hp[1]) * 1.05, yaw: 0, col: hp[2], anim: "globe", a: a, r: r })
    }
  })
  add({ x: 0, y: HOLO_GLOBE.y, z: 0, w: 0.014, h: HOLO_GLOBE.r * 2.5, d: 0.014, yaw: 0, col: "cyan" })

  var M = HOLO_PANEL.main
  frame(M)
  on(M, -0.45, 0.33, 0.6, 0.05, "bright", 1)
  on(M, 0.62, 0.33, 0.14, 0.05, "warn", 1)
  HOLO_TEXT.forEach((len, i) => {
    var p = on(M, -0.75, 0.2 - i * 0.09, len, 0.028, i % 3 === 0 ? "bright" : "cyan", 1)
    p.anim = "text"
    p.n = i
    p.len = len
  })
  on(M, 0.38, -0.34, 0.74, 0.012, "blue", 1)
  for (var c = 0; c < 6; c++) {
    var bar = on(M, 0.08 + c * 0.12, -0.33, 0.07, 0.3, c === 4 ? "warn" : c % 2 ? "cyan" : "blue", 1)
    bar.anim = "bar"
    bar.n = c
  }
  on(M, -0.42, -0.36, 0.5, 0.012, "dim", 1)
  var scan = on(M, 0, 0, M.w - 0.1, 0.008, "bright", 2)
  scan.anim = "scan"

  var L = HOLO_PANEL.left
  frame(L)
  var G = 0.26
  var gy = 0.12
  ;[[0, G, 0.2, 0.022], [0, -G, 0.2, 0.022], [G, 0, 0.022, 0.2], [-G, 0, 0.022, 0.2]].forEach((q) => on(L, q[0], gy + q[1], q[2], q[3], "cyan", 1))
  var spots = []
  ;[-1, 1].forEach((sx) =>
    [-1, 1].forEach((sy) => {
      ;[[0.145, 0.235], [0.195, 0.195], [0.235, 0.145]].forEach((q) => on(L, sx * q[0], gy + sy * q[1], 0.05, 0.05, "cyan", 1))
    })
  )
  for (var k = 0; k < 16; k++) {
    var ka = (k / 16) * Math.PI * 2
    spots.push([Math.sin(ka) * 0.17, gy + Math.cos(ka) * 0.17])
  }
  ;[0.02, 0.09].forEach((r, i) => on(L, 0, gy, r * 2, r * 2 > 0.1 ? 0.012 : 0.04, i ? "blue" : "bright", 1))
  on(L, 0, gy, 0.012, 0.18, "blue", 1)
  var needle = on(L, spots[0][0], spots[0][1], 0.045, 0.045, "warn", 2)
  needle.anim = "needle"
  needle.spots = spots
  ;[0.5, 0.34, 0.44].forEach((len, i) => {
    var p = on(L, -0.32, -0.26 - i * 0.07, len, 0.024, i ? "cyan" : "bright", 1)
    p.anim = "text"
    p.n = 6 + i
    p.len = len
  })

  var R = HOLO_PANEL.right
  frame(R)
  for (var gx = 0; gx < 5; gx++) on(R, -0.3 + gx * 0.15, 0.12, 0.008, 0.5, "dim", 0)
  for (var gh = 0; gh < 4; gh++) on(R, 0, -0.13 + gh * 0.1667, 0.6, 0.008, "dim", 0)
  for (var d = 0; d < 8; d++) {
    var dot = on(R, -0.28 + d * 0.08, 0.12, 0.05, 0.04, d === 5 ? "warn" : "bright", 1)
    dot.anim = "plot"
    dot.n = d
  }
  ;[0.52, 0.3].forEach((len, i) => {
    var p = on(R, -0.32, -0.3 - i * 0.07, len, 0.024, i ? "cyan" : "bright", 1)
    p.anim = "text"
    p.n = 9 + i
    p.len = len
  })

  var A = HOLO_ARC
  ring(A.r, A.y, A.pieces, 0.025, "cyan", A.from, A.to)
  ring(A.r - 0.07, A.y, A.pieces, 0.012, "blue", A.from, A.to)
  for (var t = 0; t < A.ticks; t++) {
    var ta = rad(A.from + ((t + 0.5) / A.ticks) * (A.to - A.from))
    add({ x: Math.sin(ta) * A.r, y: A.y - (t % 3 === 1 ? 0.1 : 0.06), z: Math.cos(ta) * A.r, w: 0.02, h: t % 3 === 1 ? 0.2 : 0.12, d: 0.02, yaw: ta, col: t === 3 ? "warn" : "bright" })
  }

  var K = HOLO_KEYS
  var step = K.w + K.gap
  for (var row = 0; row < K.rows; row++) {
    for (var col = 0; col < K.cols; col++) {
      add({ x: (col - (K.cols - 1) / 2) * step, y: K.y, z: K.z + (row - 1) * step, w: K.w, h: 0.012, d: K.w, yaw: 0, col: row === 1 && col === 4 ? "bright" : "blue", anim: "key", n: row * K.cols + col })
    }
  }
  var half = (K.cols * step) / 2 + 0.04
  flat(-half, K.z - 1.5 * step - 0.03, half, K.z - 1.5 * step - 0.03, K.y, 0.012, "cyan")
  flat(-half, K.z + 1.5 * step + 0.03, half, K.z + 1.5 * step + 0.03, K.y, 0.012, "cyan")

  out.forEach((p, n) => (p.id = n))
  out.sort((a, b) => a.y - b.y || a.id - b.id)
  return out
})()

function holoSound(name, pos) {
  if (!HOLO_CFG.sounds) return
  ;(HOLO_SND[name] || []).forEach((s) => {
    try {
      api.broadcastSound(s[0], s[1], s[2], { playerIdOrPos: pos })
    } catch (e) {}
  })
}

function holoFx(pos, col, n, spread) {
  var a = HOLO_COL[col]
  api.playParticleEffect({
    dir1: [-1, -1, -1],
    dir2: [1, 1, 1],
    pos1: [pos[0] - spread, pos[1] - spread, pos[2] - spread],
    pos2: [pos[0] + spread, pos[1] + spread, pos[2] + spread],
    texture: "glint",
    minLifeTime: 0.2,
    maxLifeTime: 0.35,
    minEmitPower: 0.1,
    maxEmitPower: 0.5,
    minSize: 0.08,
    maxSize: 0.16,
    manualEmitCount: n,
    gravity: [0, 0, 0],
    colorGradients: [
      { timeFraction: 0, minColor: HOLO_COL.bright.concat(1), maxColor: a.concat(1) },
      { timeFraction: 1, minColor: a.concat(0), maxColor: a.concat(0) },
    ],
    velocityGradients: [
      { timeFraction: 0, factor: 1, factor2: 1 },
      { timeFraction: 1, factor: 0.2, factor2: 0.2 },
    ],
    blendMode: 2,
    hideDist: HOLO_CFG.hideDist,
  })
}

function holoState(p, t) {
  var s = { x: p.x, y: p.y, z: p.z, w: p.w, h: p.h, d: p.d, yaw: p.yaw, col: p.col }
  if (!p.anim) return s
  var P = p.P
  var c = P ? Math.cos(p.yaw) : 1
  var sn = P ? Math.sin(p.yaw) : 0
  var shift = (dx, dy) => {
    s.x = p.x - dx * c
    s.z = p.z + dx * sn
    s.y = p.y + dy
  }
  if (p.anim === "text") {
    var cyc = (t + p.n * 17) % 90
    var part = cyc < 30 ? (cyc + 1) / 30 : cyc < 78 ? 1 : 0.04
    s.w = Math.max(0.02, p.len * part)
    shift(s.w / 2, 0)
  } else if (p.anim === "bar") {
    s.h = 0.06 + 0.24 * (0.5 + 0.5 * Math.sin(t * 0.09 + p.n * 1.7) * Math.cos(t * 0.031 + p.n))
    shift(0, s.h / 2)
  } else if (p.anim === "scan") {
    shift(0, Math.sin(t * 0.07) * (P.h / 2 - 0.06))
  } else if (p.anim === "needle") {
    var q = p.spots[Math.floor(t / 3) % p.spots.length]
    shift(q[0] - p.px, q[1] - p.py)
  } else if (p.anim === "plot") {
    shift(0, Math.sin(t * 0.12 - p.n * 0.8) * 0.2 * Math.cos(t * 0.02))
  } else if (p.anim === "orbit") {
    var a = t * 0.06 + p.n * Math.PI
    s.x = Math.sin(a) * 0.96
    s.z = Math.cos(a) * 0.96
    s.yaw = a + Math.PI / 2
  } else if (p.anim === "globe") {
    var g = p.a + t * 0.05
    s.x = Math.sin(g) * p.r
    s.z = Math.cos(g) * p.r
    s.yaw = g + Math.PI / 2
  } else if (p.anim === "key") {
    var lit = Math.floor(t / 4) * 7
    s.col = (lit + 3) % 27 === p.n || (lit * 5 + 11) % 27 === p.n ? "bright" : "blue"
  }
  return s
}

var HOLO_EVERY = { text: 2, bar: 3, scan: 1, needle: 3, plot: 2, orbit: 1, globe: 2, key: 4 }

function holoPut(h, part, t, first) {
  var p = part.p
  var s = holoState(p, t)
  var k = HOLO_CFG.size
  var c = Math.cos(h.yaw)
  var sn = Math.sin(h.yaw)
  if (!part.id) {
    if (holoMeshes >= HOLO_CFG.maxMeshes) return false
    var id = api.attemptCreateMeshEntity("Box", holoBox(s, k))
    if (!id) return false
    part.id = id
    holoMeshes++
    first = true
  } else if (p.anim === "text" || p.anim === "bar" || (p.anim === "key" && s.col !== part.col)) api.updateMeshEntity(part.id, "Box", holoBox(s, k))
  part.col = s.col
  if (p.anim === "key" && !first) return true
  api.setPosition(part.id, h.at[0] + (s.x * c + s.z * sn) * k, h.at[1] + s.y * k, h.at[2] + (s.z * c - s.x * sn) * k)
  if (first || p.anim === "orbit" || p.anim === "globe") api.setEntityRotation(part.id, 0, s.yaw + h.yaw, 0)
  return true
}

function holoBox(s, k) {
  return { width: s.w * k, height: s.h * k, depth: s.d * k, diffuseColor: [0, 0, 0], emissiveColor: HOLO_COL[s.col], hideDist: HOLO_CFG.hideDist }
}

function holoDrop(h, count) {
  var gone = 0
  for (var i = h.parts.length - 1; i >= 0 && gone < count; i--) {
    var part = h.parts[i]
    if (!part.id) continue
    try {
      api.deleteMeshEntity(part.id)
    } catch (e) {}
    part.id = null
    holoMeshes--
    gone++
  }
  return gone
}

function holoStep(h) {
  var t = h.t
  if (h.off) {
    if (h.off === 1) {
      holoSound("off", h.at)
      h.off = 2
    }
    return holoDrop(h, 30) === 0
  }
  if (t === 0) holoSound("on", h.at)
  for (var n = 0; n < HOLO_CFG.spawnPerTick && h.next < h.parts.length; n++) {
    if (!holoPut(h, h.parts[h.next], t, true)) break
    if (n === 0) {
      var p = h.parts[h.next].p
      holoFx([h.at[0], h.at[1] + p.y * HOLO_CFG.size, h.at[2]], "cyan", 2, 0.5 * HOLO_CFG.size)
    }
    h.next++
    if (h.next === h.parts.length) holoSound("ready", h.at)
  }
  if (!HOLO_CFG.animate) return false
  for (var i = 0; i < h.moving.length; i++) {
    var part = h.moving[i]
    if (!part.id) continue
    if ((t + part.p.id) % HOLO_EVERY[part.p.anim] === 0) holoPut(h, part, t, false)
  }
  if (t % 40 === 20 && h.next === h.parts.length) holoFx([h.at[0], h.at[1] + 1.05 * HOLO_CFG.size, h.at[2]], "bright", 3, 0.3 * HOLO_CFG.size)
  return false
}

function holoTick() {
  holoBeat++
  for (var i = holoList.length - 1; i >= 0; i--) {
    var h = holoList[i]
    var done = true
    try {
      done = holoStep(h)
      h.t++
    } catch (e) {
      try {
        api.sendMessage(h.owner, "Hologram stopped at tick " + h.t + ": " + e, { color: "orange" })
      } catch (x) {}
      holoDrop(h, 1e9)
    }
    if (done) holoList.splice(i, 1)
  }
}

function holoNew(playerId, at, facing) {
  var p = api.getPosition(playerId)
  var look = api.getPlayerFacingInfo(playerId).dir
  var n = Math.hypot(look[0], look[2]) || 1
  var F = [-look[0] / n, -look[2] / n]
  var spot = at
  if (!spot) spot = [p[0] + (look[0] / n) * HOLO_CFG.distance, p[1], p[2] + (look[2] / n) * HOLO_CFG.distance]
  else {
    var dx = p[0] - at[0]
    var dz = p[2] - at[2]
    var far = Math.hypot(dx, dz)
    if (far > 0.3) F = [dx / far, dz / far]
  }
  if (facing) F = [facing[0], facing[1]]
  var parts = holoPlan.map((q) => ({ p: q, id: null, col: q.col }))
  return { owner: playerId, t: 0, at: [spot[0], spot[1], spot[2]], yaw: Math.atan2(F[0], F[1]), parts: parts, moving: parts.filter((x) => x.p.anim), next: 0, off: 0 }
}

function hologram(playerId, at, facing) {
  var mine = holoList.filter((h) => h.owner === playerId && !h.off)[0]
  if (mine) {
    mine.off = 1
    return false
  }
  if (holoList.length >= HOLO_CFG.maxHolos) {
    api.sendMessage(playerId, "Another hologram is already open.", { color: "orange" })
    return false
  }
  holoList.push(holoNew(playerId, at, facing))
  return true
}

function hologramInstant(playerId, at, facing) {
  var old = holoList.filter((h) => h.owner === playerId)
  if (old.length) {
    old.forEach((h) => {
      holoDrop(h, 1e9)
      holoList.splice(holoList.indexOf(h), 1)
    })
    if (old.some((h) => h.next > 0)) return false
  }
  var h = holoNew(playerId, at, facing)
  holoList.push(h)
  for (var i = 0; i < h.parts.length; i++) {
    if (!holoPut(h, h.parts[i], 0, true)) break
    h.next++
  }
  return true
}

globalThis.hologram = hologram
globalThis.hologramInstant = hologramInstant
globalThis.hologramBeat = () => holoBeat

var holoOldTick = typeof tick === "function" ? tick : null
tick = (ms) => {
  if (holoOldTick) holoOldTick(ms)
  holoTick()
}

var holoOldChat = typeof onPlayerChat === "function" ? onPlayerChat : null
onPlayerChat = (playerId, message) => {
  if (HOLO_CFG.chat && message.trim().toLowerCase() === HOLO_CFG.chat) return hologram(playerId), false
  if (holoOldChat) return holoOldChat(playerId, message)
}
  })()
}
var holoAt = [thisPos[0] + 0.5, thisPos[1] + 1, thisPos[2] + 0.5]
if (globalThis.holoSeen === hologramBeat()) hologramInstant(myId, holoAt)
else hologram(myId, holoAt)
globalThis.holoSeen = hologramBeat()
