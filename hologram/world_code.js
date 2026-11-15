var HOLO_CFG = {
  chat: "!holo",
  distance: 2,
  size: 1,
  spawnPerTick: 5,
  particles: true,
  dotsPerTick: 5,
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
  start: [["futureStrangePulse", 0.8, 1.6], ["sonarBeep", 0.6, 1.4]],
  ready: [["sonarBeep", 0.7, 1.9]],
  stop: [["zapAccent2", 0.6, 0.8]],
}

var HOLO_PANEL = {
  main: { posX: 0, posY: 1.75, posZ: -0.25, yaw: 0, wide: 1.7, tall: 0.9 },
  left: { posX: -1.3, posY: 1.55, posZ: 0.2, yaw: 38, wide: 0.85, tall: 1 },
  right: { posX: 1.3, posY: 1.55, posZ: 0.2, yaw: -38, wide: 0.85, tall: 1 },
}

var HOLO_BASE = { rings: [[1.1, 0.05, 10, 0.03, "cyan"]], dotRings: [[0.82, 0.06, 12, "blue"], [1.1, 0.24, 8, "cyan"], [0.36, 0.72, 6, "cyan"]], spokes: 4 }
var HOLO_GLOBE = { posY: 1.05, radius: 0.28, hoops: [[0, 6, "bright"]], dotHoops: [[-0.68, 4, "blue"], [0.68, 4, "blue"]] }
var HOLO_ARC = { posY: 2.45, radius: 1.35, from: 108, upto: 252, pieces: 6, dots: 9, ticks: 5 }
var HOLO_KEYS = { posY: 0.95, posZ: 0.6, rows: 3, cols: 5, wide: 0.19, gap: 0.045 }
var HOLO_TEXT = [0.62, 0.4, 0.7, 0.3, 0.55, 0.46]
var HOLO_T = 0.02

var holoList = []
var holoDots = []
var holoMeshes = 0
var holoBeat = 0

var holoPlan = (function () {
  var out = []
  var rad = (deg) => (deg * Math.PI) / 180
  var add = (piece) => (out.push(piece), piece)
  var dotAt = (posX, posY, posZ, col) => {
    var made = { posX: posX, posY: posY, posZ: posZ, col: col }
    holoDots.push(made)
    return made
  }
  var dotRing = (radius, posY, num, col, from, upto) => {
    for (var idx = 0; idx < num; idx++) {
      var ang = from === undefined ? (idx / num) * Math.PI * 2 : rad(from + ((idx + 0.5) / num) * (upto - from))
      dotAt(Math.sin(ang) * radius, posY, Math.cos(ang) * radius, col)
    }
  }
  var flat = (endX1, endZ1, endX2, endZ2, posY, thick, col) => {
    var distX = endX2 - endX1
    var distZ = endZ2 - endZ1
    return add({ posX: (endX1 + endX2) / 2, posY: posY, posZ: (endZ1 + endZ2) / 2, wide: thick, tall: thick, deep: Math.hypot(distX, distZ) * 1.04, yaw: Math.atan2(distX, distZ), col: col })
  }
  var ring = (radius, posY, num, thick, col, from, upto) => {
    var ang0 = from === undefined ? 0 : rad(from)
    var span = upto === undefined ? Math.PI * 2 : rad(upto) - ang0
    for (var idx = 0; idx < num; idx++) {
      var ang = ang0 + (idx / num) * span
      var other = ang0 + ((idx + 1) / num) * span
      flat(Math.sin(ang) * radius, Math.cos(ang) * radius, Math.sin(other) * radius, Math.cos(other) * radius, posY, thick, col)
    }
  }
  var onto = (panel, posX, posY, wide, unit, col, lift) => {
    var moment = rad(panel.yaw)
    var fwd = (lift || 0) * 0.012
    return add({ posX: panel.posX - posX * Math.cos(moment) + fwd * Math.sin(moment), posY: panel.posY + posY, posZ: panel.posZ + posX * Math.sin(moment) + fwd * Math.cos(moment), wide: wide, tall: unit, deep: HOLO_T, yaw: moment, col: col, panel: panel, planeX: posX, planeY: posY })
  }
  var frame = (panel) => {
    var ang = 0.16
    for (var signX = -1; signX <= 1; signX += 2) {
      for (var signY = -1; signY <= 1; signY += 2) {
        onto(panel, signX * (panel.wide / 2 - ang / 2), (signY * panel.tall) / 2, ang, 0.025, "bright")
        onto(panel, (signX * panel.wide) / 2, signY * (panel.tall / 2 - ang / 2), 0.025, ang, "bright")
      }
    }
    if (panel.yaw) return
    onto(panel, 0, panel.tall / 2, panel.wide - 2 * ang - 0.08, 0.012, "blue")
    onto(panel, 0, -panel.tall / 2, panel.wide - 2 * ang - 0.08, 0.012, "blue")
  }

  HOLO_BASE.rings.forEach((item) => ring(item[0], item[1], item[2], item[3], item[4]))
  HOLO_BASE.dotRings.forEach((item) => dotRing(item[0], item[1], item[2], item[3]))
  for (var state = 0; state < HOLO_BASE.spokes; state++) {
    var other = (state / HOLO_BASE.spokes) * Math.PI * 2 + Math.PI / 4
    flat(Math.sin(other) * 0.2, Math.cos(other) * 0.2, Math.sin(other) * 0.82, Math.cos(other) * 0.82, 0.05, 0.015, "dim")
  }
  for (var opts = 0; opts < 2; opts++) {
    var mark = dotAt(0, 0.08, 0.96, "bright")
    mark.anim = "orbit"
    mark.num = opts
  }
  add({ posX: 0, posY: 0.4, posZ: 0, wide: 0.015, tall: 0.66, deep: 0.015, yaw: 0, col: "blue" })
  add({ posX: 0, posY: 0.1, posZ: 0, wide: 0.16, tall: 0.08, deep: 0.16, yaw: Math.PI / 4, col: "cyan" })

  HOLO_GLOBE.hoops.forEach((hpos) => {
    var radius = HOLO_GLOBE.radius * Math.cos(Math.asin(hpos[0]))
    for (var idx = 0; idx < hpos[1]; idx++) {
      var ang = ((idx + 0.5) / hpos[1]) * Math.PI * 2
      add({ posX: 0, posY: HOLO_GLOBE.posY + HOLO_GLOBE.radius * hpos[0], posZ: 0, wide: 0.016, tall: 0.016, deep: 2 * radius * Math.tan(Math.PI / hpos[1]) * 1.05, yaw: 0, col: hpos[2], anim: "globe", ang: ang, radius: radius })
    }
  })
  HOLO_GLOBE.dotHoops.forEach((hpos) => {
    var radius = HOLO_GLOBE.radius * Math.cos(Math.asin(hpos[0]))
    for (var idx = 0; idx < hpos[1]; idx++) {
      var made = dotAt(0, HOLO_GLOBE.posY + HOLO_GLOBE.radius * hpos[0], 0, hpos[2])
      made.anim = "globe"
      made.ang = (idx / hpos[1]) * Math.PI * 2
      made.radius = radius
    }
  })
  add({ posX: 0, posY: HOLO_GLOBE.posY, posZ: 0, wide: 0.014, tall: HOLO_GLOBE.radius * 2.5, deep: 0.014, yaw: 0, col: "cyan" })

  var mainP = HOLO_PANEL.main
  frame(mainP)
  onto(mainP, -0.45, 0.33, 0.6, 0.05, "bright", 1)
  onto(mainP, 0.62, 0.33, 0.14, 0.05, "warn", 1)
  HOLO_TEXT.forEach((len, idx) => {
    var piece = onto(mainP, -0.75, 0.2 - idx * 0.09, len, 0.028, idx % 3 === 0 ? "bright" : "cyan", 1)
    piece.anim = "text"
    piece.num = idx
    piece.len = len
  })
  onto(mainP, 0.38, -0.34, 0.74, 0.012, "blue", 1)
  for (var cosv = 0; cosv < 6; cosv++) {
    var bar = onto(mainP, 0.08 + cosv * 0.12, -0.33, 0.07, 0.3, cosv === 4 ? "warn" : cosv % 2 ? "cyan" : "blue", 1)
    bar.anim = "bar"
    bar.num = cosv
  }
  onto(mainP, -0.42, -0.36, 0.5, 0.012, "dim", 1)
  var scan = onto(mainP, 0, 0, mainP.wide - 0.1, 0.008, "bright", 2)
  scan.anim = "scan"

  var leftP = HOLO_PANEL.left
  frame(leftP)
  var grid = 0.26
  var gaugeY = 0.12
  var holoL1 = [[0, grid, 0.2, 0.022], [0, -grid, 0.2, 0.022], [grid, 0, 0.022, 0.2], [-grid, 0, 0.022, 0.2]]
  holoL1.forEach((item) => onto(leftP, item[0], gaugeY + item[1], item[2], item[3], "cyan", 1))
  var spots = []
  for (var scale = 0; scale < 16; scale++) {
    var kang = (scale / 16) * Math.PI * 2
    spots.push([Math.sin(kang) * 0.17, gaugeY + Math.cos(kang) * 0.17])
    var ringX = Math.sin(kang) * 0.25
    dotAt(leftP.posX - ringX * Math.cos(rad(leftP.yaw)), leftP.posY + gaugeY + Math.cos(kang) * 0.25, leftP.posZ + ringX * Math.sin(rad(leftP.yaw)), "cyan")
  }
  onto(leftP, 0, gaugeY, 0.18, 0.012, "blue", 1)
  onto(leftP, 0, gaugeY, 0.04, 0.04, "bright", 2)
  onto(leftP, 0, gaugeY, 0.012, 0.18, "blue", 1)
  var needle = onto(leftP, spots[0][0], spots[0][1], 0.045, 0.045, "warn", 2)
  needle.anim = "needle"
  needle.spots = spots
  var holoL3 = [0.5, 0.34, 0.44]
  holoL3.forEach((len, idx) => {
    var piece = onto(leftP, -0.32, -0.26 - idx * 0.07, len, 0.024, idx ? "cyan" : "bright", 1)
    piece.anim = "text"
    piece.num = 6 + idx
    piece.len = len
  })

  var rightP = HOLO_PANEL.right
  frame(rightP)
  for (var gridX = 0; gridX < 3; gridX++) onto(rightP, -0.3 + gridX * 0.3, 0.12, 0.008, 0.5, "dim", 0)
  for (var gridH = 0; gridH < 2; gridH++) onto(rightP, 0, -0.13 + gridH * 0.5, 0.6, 0.008, "dim", 0)
  for (var deep = 0; deep < 8; deep++) {
    var dot = onto(rightP, -0.28 + deep * 0.08, 0.12, 0.05, 0.04, deep === 5 ? "warn" : "bright", 1)
    dot.anim = "plot"
    dot.num = deep
  }
  var holoL4 = [0.52, 0.3]
  holoL4.forEach((len, idx) => {
    var piece = onto(rightP, -0.32, -0.3 - idx * 0.07, len, 0.024, idx ? "cyan" : "bright", 1)
    piece.anim = "text"
    piece.num = 9 + idx
    piece.len = len
  })

  var arcs = HOLO_ARC
  ring(arcs.radius, arcs.posY, arcs.pieces, 0.025, "cyan", arcs.from, arcs.upto)
  dotRing(arcs.radius - 0.09, arcs.posY, arcs.dots, "blue", arcs.from, arcs.upto)
  for (var moment = 0; moment < arcs.ticks; moment++) {
    var tang = rad(arcs.from + ((moment + 0.5) / arcs.ticks) * (arcs.upto - arcs.from))
    add({ posX: Math.sin(tang) * arcs.radius, posY: arcs.posY - (moment % 3 === 1 ? 0.1 : 0.06), posZ: Math.cos(tang) * arcs.radius, wide: 0.02, tall: moment % 3 === 1 ? 0.2 : 0.12, deep: 0.02, yaw: tang, col: moment === 3 ? "warn" : "bright" })
  }

  var keys = HOLO_KEYS
  var step = keys.wide + keys.gap
  for (var row = 0; row < keys.rows; row++) {
    for (var col = 0; col < keys.cols; col++) {
      add({ posX: (col - (keys.cols - 1) / 2) * step, posY: keys.posY, posZ: keys.posZ + (row - 1) * step, wide: keys.wide, tall: 0.012, deep: keys.wide, yaw: 0, col: row === 1 && col === 2 ? "bright" : "blue", anim: "key", num: row * keys.cols + col })
    }
  }
  var half = (keys.cols * step) / 2 + 0.04
  flat(-half, keys.posZ - 1.5 * step - 0.03, half, keys.posZ - 1.5 * step - 0.03, keys.posY, 0.012, "cyan")
  flat(-half, keys.posZ + 1.5 * step + 0.03, half, keys.posZ + 1.5 * step + 0.03, keys.posY, 0.012, "cyan")

  out.forEach((piece, num) => (piece.ident = num))
  out.sort((ang, other) => ang.posY - other.posY || ang.ident - other.ident)
  return out
})()

function holoSound(name, where) {
  if (!HOLO_CFG.sounds) return
  var holoL5 = (HOLO_SND[name] || [])
  holoL5.forEach((state) => {
    try {
      api.broadcastSound(state[0], state[1], state[2], { playerIdOrPos: where })
    } catch (err) {}
  })
}

function holoFx(where, col, num, spread, life, power, size) {
  var ang = HOLO_COL[col]
  api.playParticleEffect({
    dir1: [-1, -1, -1],
    dir2: [1, 1, 1],
    pos1: [where[0] - spread, where[1] - spread, where[2] - spread],
    pos2: [where[0] + spread, where[1] + spread, where[2] + spread],
    texture: "glint",
    minLifeTime: life || 0.2,
    maxLifeTime: (life || 0.2) * 1.5,
    minEmitPower: power === undefined ? 0.1 : power,
    maxEmitPower: power === undefined ? 0.5 : power,
    minSize: size || 0.08,
    maxSize: (size || 0.08) * 1.6,
    manualEmitCount: num,
    gravity: [0, 0, 0],
    colorGradients: [
      { timeFraction: 0, minColor: HOLO_COL.bright.concat(1), maxColor: ang.concat(1) },
      { timeFraction: 1, minColor: ang.concat(0), maxColor: ang.concat(0) },
    ],
    velocityGradients: [
      { timeFraction: 0, factor: 1, factor2: 1 },
      { timeFraction: 1, factor: 0.2, factor2: 0.2 },
    ],
    blendMode: 2,
    hideDist: HOLO_CFG.hideDist,
  })
}

function holoDot(unit, dot, moment, life) {
  var state = holoState(dot, moment)
  var scale = HOLO_CFG.size
  var cosv = Math.cos(unit.yaw)
  var sinv = Math.sin(unit.yaw)
  holoFx([unit.place[0] + (state.posX * cosv + state.posZ * sinv) * scale, unit.place[1] + state.posY * scale, unit.place[2] + (state.posZ * cosv - state.posX * sinv) * scale], dot.col, 1, 0.004, life, 0, 0.05 * scale)
}

function holoDust(unit, moment) {
  var top = unit.next ? unit.parts[unit.next - 1].piece.posY : 0
  var slow = Math.ceil(holoSlow.length / HOLO_CFG.dotsPerTick)
  for (var num = 0; num < HOLO_CFG.dotsPerTick; num++) {
    var dot = holoSlow[(moment * HOLO_CFG.dotsPerTick + num) % holoSlow.length]
    if (dot.posY <= top) holoDot(unit, dot, moment, (slow + 2) / 20 / 1.25)
  }
  if (moment % 3) return
  for (var idx = 0; idx < holoFast.length; idx++) {
    if (holoFast[idx].posY <= top) holoDot(unit, holoFast[idx], moment, 0.16)
  }
}

function holoState(piece, moment) {
  var state = { posX: piece.posX, posY: piece.posY, posZ: piece.posZ, wide: piece.wide, tall: piece.tall, deep: piece.deep, yaw: piece.yaw, col: piece.col }
  if (!piece.anim) return state
  var panel = piece.panel
  var cosv = panel ? Math.cos(piece.yaw) : 1
  var sinv = panel ? Math.sin(piece.yaw) : 0
  var shift = (distX, distY) => {
    state.posX = piece.posX - distX * cosv
    state.posZ = piece.posZ + distX * sinv
    state.posY = piece.posY + distY
  }
  if (piece.anim === "text") {
    var cyc = (moment + piece.num * 17) % 90
    var part = cyc < 30 ? (cyc + 1) / 30 : cyc < 78 ? 1 : 0.04
    state.wide = Math.max(0.02, piece.len * part)
    shift(state.wide / 2, 0)
  } else if (piece.anim === "bar") {
    state.tall = 0.06 + 0.24 * (0.5 + 0.5 * Math.sin(moment * 0.09 + piece.num * 1.7) * Math.cos(moment * 0.031 + piece.num))
    shift(0, state.tall / 2)
  } else if (piece.anim === "scan") {
    shift(0, Math.sin(moment * 0.07) * (panel.tall / 2 - 0.06))
  } else if (piece.anim === "needle") {
    var item = piece.spots[Math.floor(moment / 3) % piece.spots.length]
    shift(item[0] - piece.planeX, item[1] - piece.planeY)
  } else if (piece.anim === "plot") {
    shift(0, Math.sin(moment * 0.12 - piece.num * 0.8) * 0.2 * Math.cos(moment * 0.02))
  } else if (piece.anim === "orbit") {
    var ang = moment * 0.06 + piece.num * Math.PI
    state.posX = Math.sin(ang) * 0.96
    state.posZ = Math.cos(ang) * 0.96
    state.yaw = ang + Math.PI / 2
  } else if (piece.anim === "globe") {
    var gang = piece.ang + moment * 0.05
    state.posX = Math.sin(gang) * piece.radius
    state.posZ = Math.cos(gang) * piece.radius
    state.yaw = gang + Math.PI / 2
  } else if (piece.anim === "key") {
    var lit = Math.floor(moment / 4) * 7
    state.col = (lit + 3) % 27 === piece.num || (lit * 5 + 11) % 27 === piece.num ? "bright" : "blue"
  }
  return state
}

var holoSlow = holoDots.filter((dot) => !dot.anim)
var holoFast = holoDots.filter((dot) => dot.anim)

var HOLO_EVERY = { text: 2, bar: 3, scan: 1, needle: 3, plot: 2, orbit: 1, globe: 2, key: 4 }

function holoPut(unit, part, moment, first) {
  var piece = part.piece
  var state = holoState(piece, moment)
  var scale = HOLO_CFG.size
  var cosv = Math.cos(unit.yaw)
  var sinv = Math.sin(unit.yaw)
  if (!part.ident) {
    if (holoMeshes >= HOLO_CFG.maxMeshes) return false
    var ident = api.attemptCreateMeshEntity("Box", holoBox(state, scale))
    if (!ident) return false
    part.ident = ident
    holoMeshes++
    first = true
  } else if (piece.anim === "text" || piece.anim === "bar" || (piece.anim === "key" && state.col !== part.col)) api.updateMeshEntity(part.ident, "Box", holoBox(state, scale))
  part.col = state.col
  if (piece.anim === "key" && !first) return true
  api.setPosition(part.ident, unit.place[0] + (state.posX * cosv + state.posZ * sinv) * scale, unit.place[1] + state.posY * scale, unit.place[2] + (state.posZ * cosv - state.posX * sinv) * scale)
  if (first || piece.anim === "orbit" || piece.anim === "globe") api.setEntityRotation(part.ident, 0, state.yaw + unit.yaw, 0)
  return true
}

function holoBox(state, scale) {
  return { width: state.wide * scale, height: state.tall * scale, depth: state.deep * scale, diffuseColor: [0, 0, 0], emissiveColor: HOLO_COL[state.col], hideDist: HOLO_CFG.hideDist }
}

function holoDrop(unit, count) {
  var gone = 0
  for (var idx = unit.parts.length - 1; idx >= 0 && gone < count; idx--) {
    var part = unit.parts[idx]
    if (!part.ident) continue
    try {
      api.deleteMeshEntity(part.ident)
    } catch (err) {}
    part.ident = null
    holoMeshes--
    gone++
  }
  return gone
}

function holoStep(unit) {
  var moment = unit.moment
  if (unit.off) {
    if (unit.off === 1) {
      holoSound("stop", unit.place)
      unit.off = 2
    }
    return holoDrop(unit, 30) === 0
  }
  if (moment === 0) holoSound("start", unit.place)
  for (var num = 0; num < HOLO_CFG.spawnPerTick && unit.next < unit.parts.length; num++) {
    if (!holoPut(unit, unit.parts[unit.next], moment, true)) break
    if (num === 0) {
      var piece = unit.parts[unit.next].piece
      holoFx([unit.place[0], unit.place[1] + piece.posY * HOLO_CFG.size, unit.place[2]], "cyan", 2, 0.5 * HOLO_CFG.size)
    }
    unit.next++
    if (unit.next === unit.parts.length) holoSound("ready", unit.place)
  }
  if (HOLO_CFG.particles) holoDust(unit, moment)
  if (!HOLO_CFG.animate) return false
  for (var idx = 0; idx < unit.moving.length; idx++) {
    var part = unit.moving[idx]
    if (!part.ident) continue
    if ((moment + part.piece.ident) % HOLO_EVERY[part.piece.anim] === 0) holoPut(unit, part, moment, false)
  }
  if (moment % 40 === 20 && unit.next === unit.parts.length) holoFx([unit.place[0], unit.place[1] + 1.05 * HOLO_CFG.size, unit.place[2]], "bright", 3, 0.3 * HOLO_CFG.size)
  return false
}

function holoTick() {
  holoBeat++
  for (var idx = holoList.length - 1; idx >= 0; idx--) {
    var unit = holoList[idx]
    var done = true
    try {
      done = holoStep(unit)
      unit.moment++
    } catch (err) {
      try {
        api.sendMessage(unit.owner, "Hologram stopped at tick " + unit.moment + ": " + err, { color: "orange" })
      } catch (posX) {}
      holoDrop(unit, 99999)
    }
    if (done) holoList.splice(idx, 1)
  }
}

function holoNew(playerId, place, facing) {
  var piece = api.getPosition(playerId)
  var look = api.getPlayerFacingInfo(playerId).dir
  var num = Math.hypot(look[0], look[2]) || 1
  var face = [-look[0] / num, -look[2] / num]
  var spot = place
  if (!spot) spot = [piece[0] + (look[0] / num) * HOLO_CFG.distance, piece[1], piece[2] + (look[2] / num) * HOLO_CFG.distance]
  else {
    var distX = piece[0] - place[0]
    var distZ = piece[2] - place[2]
    var far = Math.hypot(distX, distZ)
    if (far > 0.3) face = [distX / far, distZ / far]
  }
  if (facing) face = [facing[0], facing[1]]
  var parts = holoPlan.map((item) => ({ piece: item, ident: null, col: item.col }))
  return { owner: playerId, moment: 0, place: [spot[0], spot[1], spot[2]], yaw: Math.atan2(face[0], face[1]), parts: parts, moving: parts.filter((posX) => posX.piece.anim), next: 0, off: 0 }
}

function hologram(playerId, place, facing) {
  var mine = holoList.filter((unit) => unit.owner === playerId && !unit.off)[0]
  if (mine) {
    mine.off = 1
    return false
  }
  if (holoList.length >= HOLO_CFG.maxHolos) {
    api.sendMessage(playerId, "Another hologram is already open.", { color: "orange" })
    return false
  }
  holoList.push(holoNew(playerId, place, facing))
  return true
}

function hologramInstant(playerId, place, facing) {
  var old = holoList.slice()
  if (old.length) {
    old.forEach((unit) => {
      holoDrop(unit, 99999)
      holoList.splice(holoList.indexOf(unit), 1)
    })
    if (old.some((unit) => unit.next > 0)) return false
  }
  var unit = holoNew(playerId, place, facing)
  holoList.push(unit)
  for (var idx = 0; idx < unit.parts.length; idx++) {
    if (!holoPut(unit, unit.parts[idx], 0, true)) break
    unit.next++
  }
  if (HOLO_CFG.particles) holoDots.forEach((dot) => holoDot(unit, dot, 0, 3))
  return true
}

function hologramClear() {
  var count = 0
  holoList.forEach((unit) => (count += holoDrop(unit, 99999)))
  holoList.length = 0
  holoMeshes = 0
  return count
}

globalThis.hologram = hologram
globalThis.hologramClear = hologramClear
globalThis.hologramInstant = hologramInstant
globalThis.hologramBeat = () => holoBeat

var holoOldTick = typeof tick === "function" ? tick : null
tick = (msec) => {
  if (holoOldTick) holoOldTick(msec)
  holoTick()
}

var holoOldChat = typeof onPlayerChat === "function" ? onPlayerChat : null
onPlayerChat = (playerId, message) => {
  if (HOLO_CFG.chat && message.trim().toLowerCase() === HOLO_CFG.chat) return hologram(playerId), false
  if (holoOldChat) return holoOldChat(playerId, message)
}
