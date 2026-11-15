var GATE_CFG = {
  chat: "!portal",
  travel: 6,
  stay: 3,
  slashRadius: 3,
  damage: 25,
  knockback: 8,
  hitPlayers: true,
  animate: true,
  flip: 1,
  nodeMeshes: true,
  hidePlayer: true,
  holdPlayer: true,
  clickLeaves: true,
  groundArrow: true,
  sounds: true,
  size: 1,
  hideDist: 100,
  maxCasts: 6,
  maxMeshes: 380,
}

var GATE_COL = {
  gold: [255, 205, 80],
  brass: [190, 130, 45],
  dark: [70, 45, 15],
  deep: [8, 70, 52],
  jade: [70, 235, 165],
  mint: [190, 255, 225],
  white: [255, 255, 255],
  steam: [215, 215, 205],
}

var GATE_SND = {
  open: [["futureStrangePulse", 0.7, 0.8]],
  leave: [["zapAccent1", 0.7, 1.1]],
  slash: [["rpgKnifeSlice1", 1, 0.8], ["bigDrumSwish1", 0.8, 0.9]],
}

var GATE_STEP = { sink: 6, open: 6, spin: 8, settle: 4, close: 8 }
var GATE_NODES = ["TorsoNode", "HeadMesh", "ArmRightMesh", "ArmLeftMesh", "LegLeftMesh", "LegRightMesh"]
var GATE_POSE = {
  rest: {},
  brace: { TorsoNode: [18, 0, 0], HeadMesh: [25, 0, 0], ArmRightMesh: [0, 0, -40], ArmLeftMesh: [0, 0, 40], LegRightMesh: [-25, 0, 0], LegLeftMesh: [25, 0, 0] },
  drop: { HeadMesh: [-20, 0, 0], ArmRightMesh: [-170, 0, 8], ArmLeftMesh: [-170, 0, -8] },
  rise: { TorsoNode: [-10, 0, 12], ArmRightMesh: [0, 0, -85], ArmLeftMesh: [0, 0, 85] },
  wide: { TorsoNode: [8, 0, 12], ArmRightMesh: [0, 0, -85], ArmLeftMesh: [0, 0, 70], LegRightMesh: [-15, 0, 0], LegLeftMesh: [15, 0, 0] },
}
var GATE_TURNS = ["TorsoNode", "LegLeftMesh", "LegRightMesh"]
var GATE_WORN = [
  ["ArmRightMesh", 0.08, 1.2, 0.24, "jade", [0, -1, 0]],
  ["ArmLeftMesh", 0.3, 0.3, 0.3, "brass", [0, -0.45, 0]],
  ["TorsoNode", 0.5, 0.5, 0.1, "gold", [0, 0.1, -0.22]],
]

var gateList = []
var gateMeshes = 0

var gatePlan = (function () {
  var out = []
  var third = 1 / Math.sqrt(3)
  for (var turn = 0; turn < 3; turn++) out.push({ radius: 0, angle: (turn * Math.PI) / 3, wide: 2.1, tall: 0.03, deep: 2.1 * third, lift: 0.04, col: "deep", spin: 0 })
  for (var turn = 0; turn < 3; turn++) out.push({ radius: 0, angle: (turn * Math.PI) / 3, wide: 0.9, tall: 0.03, deep: 0.9 * third, lift: 0.075, col: "jade", spin: 0 })
  for (var idx = 0; idx < 8; idx++) out.push({ radius: 0.6, angle: (idx / 8) * Math.PI * 2, wide: 0.53, tall: 0.05, deep: 0.07, lift: 0.1, col: "gold", spin: -0.1 })
  for (var idx = 0; idx < 8; idx++) out.push({ radius: 0.74, angle: ((idx + 0.5) / 8) * Math.PI * 2, wide: 0.16, tall: 0.05, deep: 0.22, lift: 0.1, col: "brass", spin: -0.1 })
  for (var idx = 0; idx < 12; idx++) out.push({ radius: 1.22, angle: (idx / 12) * Math.PI * 2, wide: 0.2, tall: 0.06, deep: 0.3, lift: 0.09, col: idx % 2 ? "gold" : "brass", spin: 0.06 })
  for (var idx = 0; idx < 16; idx++) out.push({ radius: 1.5, angle: (idx / 16) * Math.PI * 2, wide: 0.63, tall: 0.08, deep: 0.12, lift: 0.06, col: "gold", spin: 0, rim: idx })
  return out
})()

function gateRad(deg) {
  return (deg * Math.PI) / 180
}

function gateSound(name, where) {
  if (!GATE_CFG.sounds) return
  var list = GATE_SND[name] || []
  list.forEach((entry) => {
    try {
      api.broadcastSound(entry[0], entry[1], entry[2], { playerIdOrPos: where })
    } catch (err) {}
  })
}

function gateEmit(low, high, look) {
  api.playParticleEffect({
    dir1: look.dir1 || [-1, -1, -1],
    dir2: look.dir2 || [1, 1, 1],
    pos1: low,
    pos2: high,
    texture: look.texture || "glint",
    minLifeTime: look.life,
    maxLifeTime: look.life * 1.6,
    minEmitPower: look.power || 0,
    maxEmitPower: (look.power || 0) * 2,
    minSize: look.size,
    maxSize: look.size * 1.5,
    manualEmitCount: look.count || 1,
    gravity: look.gravity || [0, 0, 0],
    colorGradients: [
      { timeFraction: 0, minColor: GATE_COL[look.first].concat(1), maxColor: GATE_COL[look.first].concat(1) },
      { timeFraction: 1, minColor: GATE_COL[look.last].concat(0), maxColor: GATE_COL[look.last].concat(0) },
    ],
    velocityGradients: [
      { timeFraction: 0, factor: 1, factor2: 1 },
      { timeFraction: 1, factor: 0.2, factor2: 0.2 },
    ],
    blendMode: 1,
    hideDist: GATE_CFG.hideDist,
  })
}

function gateCloud(mid, halfWide, halfTall, look) {
  gateEmit([mid[0] - halfWide, mid[1] - halfTall, mid[2] - halfWide], [mid[0] + halfWide, mid[1] + halfTall, mid[2] + halfWide], look)
}

function gateBox(cast, wide, tall, deep, col) {
  if (gateMeshes >= GATE_CFG.maxMeshes) return null
  var scale = GATE_CFG.size
  var ident = api.attemptCreateMeshEntity("Box", { width: wide * scale, height: tall * scale, depth: deep * scale, diffuseColor: [0, 0, 0], emissiveColor: GATE_COL[col], hideDist: GATE_CFG.hideDist })
  if (!ident) return null
  gateMeshes++
  cast.made.push(ident)
  return ident
}

function gatePut(ident, spotX, spotY, spotZ, yaw, turned) {
  api.setPosition(ident, spotX, spotY, spotZ)
  if (turned) api.setEntityRotation(ident, 0, yaw, 0)
}

function gateDrop(cast, list) {
  list.forEach((ident) => {
    try {
      api.deleteMeshEntity(ident)
    } catch (err) {}
    gateMeshes--
    var slot = cast.made.indexOf(ident)
    if (slot >= 0) cast.made.splice(slot, 1)
  })
  list.length = 0
}

function gatePiece(cast, part, moment, first) {
  var scale = GATE_CFG.size
  var angle = part.piece.angle + part.piece.spin * moment
  var reach = part.piece.radius * scale
  gatePut(part.ident, part.mid[0] + Math.sin(angle) * reach, part.mid[1] + part.piece.lift, part.mid[2] + Math.cos(angle) * reach, angle, first || part.piece.spin !== 0)
}

function gateSchema(cast, from, upto, ticks, yawFrom, yawUpto) {
  var nodes = {}
  GATE_NODES.forEach((node) => {
    var first = (from[node] || [0, 0, 0]).slice()
    var last = (upto[node] || [0, 0, 0]).slice()
    if (GATE_TURNS.indexOf(node) >= 0) {
      first[1] += yawFrom || 0
      last[1] += yawUpto || 0
    }
    if (!first.concat(last).some((value) => value)) return
    var turn = (rot) => [gateRad(rot[0] * GATE_CFG.flip), gateRad(rot[1]), gateRad(rot[2])]
    nodes[node] = { timeline: [{ timeFraction: 0, rotation: turn(first) }, { timeFraction: 1, rotation: turn(last) }] }
  })
  return { animationDurationMs: ticks * 50, loop: false, nodeAnimations: nodes }
}

function gateAnimate(cast, from, upto, ticks, yawFrom, yawUpto) {
  if (!GATE_CFG.animate) return
  try {
    if (!from) return api.animateEntity(cast.owner, null, 0, 1)
    api.animateEntity(cast.owner, gateSchema(cast, from, upto, ticks, yawFrom, yawUpto), 0, 1)
  } catch (err) {
    GATE_CFG.animate = false
    try {
      api.sendMessage(cast.owner, "Portal animation stopped: " + err, { color: "orange" })
    } catch (other) {}
  }
}

function gateWear(cast, worn) {
  if (!GATE_CFG.nodeMeshes || !worn === !cast.worn) return
  cast.worn = worn
  try {
    GATE_WORN.forEach((row) => {
      if (!worn) return api.updateEntityNodeMeshAttachment(cast.owner, row[0], null)
      api.updateEntityNodeMeshAttachment(cast.owner, row[0], "Box", { width: row[1], height: row[2], depth: row[3], diffuseColor: [0, 0, 0], emissiveColor: GATE_COL[row[4]], hideDist: GATE_CFG.hideDist }, row[5], [0, 0, 0])
    })
  } catch (err) {
    GATE_CFG.nodeMeshes = false
  }
}

function gateHold(cast, held) {
  if (!held === !cast.held) return
  cast.held = held
  try {
    if (GATE_CFG.hidePlayer) api.setPlayerOpacity(cast.owner, held ? 0 : 1)
  } catch (err) {}
  try {
    if (GATE_CFG.holdPlayer) {
      if (held) api.setClientOptions(cast.owner, { speedMultiplier: 0, jumpAmount: 0, invincible: true })
      else {
        api.setClientOptionToDefault(cast.owner, "speedMultiplier")
        api.setClientOptionToDefault(cast.owner, "jumpAmount")
        api.setClientOptionToDefault(cast.owner, "invincible")
      }
    }
  } catch (err) {}
  try {
    if (GATE_CFG.groundArrow && !held) api.setClientOptions(cast.owner, { groundArrowPath: null })
  } catch (err) {}
}

function gateClear(where) {
  try {
    return !api.getBlockSolidity(Math.floor(where[0]), Math.floor(where[1] + 0.2), Math.floor(where[2])) && !api.getBlockSolidity(Math.floor(where[0]), Math.floor(where[1] + 1.2), Math.floor(where[2]))
  } catch (err) {
    return true
  }
}

function gateReach(from, face, far) {
  var best = [from[0], from[1], from[2]]
  var steps = Math.max(1, Math.ceil(far * 2))
  for (var num = 1; num <= steps; num++) {
    var spot = [from[0] + (face[0] * far * num) / steps, from[1], from[2] + (face[1] * far * num) / steps]
    if (!gateClear(spot)) break
    best = spot
  }
  return best
}

function gateFacing(playerId, fallback) {
  var seen = api.getPlayerFacingInfo(playerId).dir
  var flat = Math.hypot(seen[0], seen[2])
  return flat > 0.001 ? [seen[0] / flat, seen[2] / flat] : fallback
}

function gateArrow(cast, moment) {
  var scale = GATE_CFG.size
  var angle = Math.atan2(cast.aim[0], cast.aim[1])
  for (var num = 0; num < 3; num++) {
    var far = (1.95 + num * 0.5 + ((moment % 10) / 10) * 0.5) * scale
    var tipX = cast.centre[0] + cast.aim[0] * far
    var tipZ = cast.centre[2] + cast.aim[1] * far
    for (var side = 0; side < 2; side++) {
      var back = angle + Math.PI + (side ? 0.6 : -0.6)
      var slot = num * 2 + side
      if (!cast.arrow[slot]) cast.arrow[slot] = gateBox(cast, 0.08, 0.04, 0.5, num === 2 ? "mint" : "jade")
      if (cast.arrow[slot]) gatePut(cast.arrow[slot], tipX + Math.sin(back) * 0.25 * scale, cast.centre[1] + 0.07, tipZ + Math.cos(back) * 0.25 * scale, back, true)
    }
  }
  if (GATE_CFG.groundArrow && moment % 4 === 0) {
    try {
      api.setClientOptions(cast.owner, { groundArrowPath: { target: [cast.centre[0] + cast.aim[0] * GATE_CFG.travel, cast.centre[1], cast.centre[2] + cast.aim[1] * GATE_CFG.travel], colour: "#46eba5" } })
    } catch (err) {
      GATE_CFG.groundArrow = false
    }
  }
}

function gateHarm(cast) {
  var ids = api.getMobIds().concat(GATE_CFG.hitPlayers ? api.getPlayerIds() : [])
  var reach = GATE_CFG.slashRadius * GATE_CFG.size
  for (var idx = 0; idx < ids.length; idx++) {
    var ident = ids[idx]
    if (ident === cast.owner || cast.hurt[ident]) continue
    var where = api.getPosition(ident)
    if (!where) continue
    var distX = where[0] - cast.out[0]
    var distZ = where[2] - cast.out[2]
    var flat = Math.hypot(distX, distZ)
    if (flat > reach || Math.abs(where[1] - cast.out[1]) > 2.5) continue
    cast.hurt[ident] = true
    api.applyHealthChange(ident, -Math.round(GATE_CFG.damage), cast.owner)
    var push = GATE_CFG.knockback
    var away = flat > 0.01 ? [distX / flat, distZ / flat] : cast.aim
    if (push) api.applyImpulse(ident, away[0] * push, push * 0.5, away[1] * push)
    gateCloud([where[0], where[1] + 1, where[2]], 0.3, 0.4, { life: 0.3, size: 0.2, count: 10, power: 3, first: "white", last: "jade" })
  }
}

function gateSlash(cast, age) {
  var scale = GATE_CFG.size
  var reach = GATE_CFG.slashRadius * 0.86 * scale
  var count = 18
  var start = Math.atan2(cast.aim[0], cast.aim[1])
  var long = 2 * reach * Math.tan(Math.PI / count) * 1.08
  for (var num = 0; num < count; num++) {
    var born = Math.floor(num / 3)
    if (age === born) {
      var angle = start + (num / count) * Math.PI * 2
      var tall = cast.out[1] + 0.95 * scale
      var outer = gateBox(cast, long / scale, 0.06, 0.55, "jade")
      var inner = gateBox(cast, (long * 0.9) / scale, 0.09, 0.16, "mint")
      if (outer) gatePut(outer, cast.out[0] + Math.sin(angle) * reach, tall, cast.out[2] + Math.cos(angle) * reach, angle, true)
      if (inner) gatePut(inner, cast.out[0] + Math.sin(angle) * (reach + 0.3 * scale), tall, cast.out[2] + Math.cos(angle) * (reach + 0.3 * scale), angle, true)
      cast.slash.push({ gone: age + 4, ids: [outer, inner].filter((made) => made) })
      if (num % 3 === 0) gateCloud([cast.out[0] + Math.sin(angle) * reach, tall, cast.out[2] + Math.cos(angle) * reach], 0.3, 0.1, { life: 0.3, size: 0.14, count: 8, power: 4, dir1: [Math.cos(angle) - 0.3, -0.1, -Math.sin(angle) - 0.3], dir2: [Math.cos(angle) + 0.3, 0.3, -Math.sin(angle) + 0.3], first: "white", last: "jade" })
    }
  }
  for (var idx = cast.slash.length - 1; idx >= 0; idx--) {
    if (cast.slash[idx].gone <= age) {
      gateDrop(cast, cast.slash[idx].ids)
      cast.slash.splice(idx, 1)
    }
  }
}

function gateRun(cast, gate, moment) {
  var scale = GATE_CFG.size
  var mid = gate.mid
  if (gate.shut) {
    if (!gate.parts.length) return
    var take = Math.ceil(gatePlan.length / GATE_STEP.close)
    var gone = gate.parts.splice(Math.max(0, gate.parts.length - take), take)
    gateDrop(cast, gone.map((part) => part.ident))
    if (!gate.parts.length) gateCloud([mid[0], mid[1] + 0.2, mid[2]], 0.4, 0.1, { life: 0.4, size: 0.14, count: 14, power: 2, first: "jade", last: "gold" })
    return
  }
  for (var num = 0; num < gate.each && gate.next < gatePlan.length; num++) {
    var piece = gatePlan[gate.next++]
    var ident = gateBox(cast, piece.wide, piece.tall, piece.deep, piece.col)
    if (!ident) continue
    var part = { ident: ident, piece: piece, mid: mid }
    gate.parts.push(part)
    gatePiece(cast, part, moment, true)
  }
  gate.parts.forEach((part) => {
    if (part.piece.spin) gatePiece(cast, part, moment, false)
  })
  if (moment % 2 === 0) gateCloud([mid[0], mid[1] + 0.3, mid[2]], 1.1 * scale, 0.2, { life: 0.6, size: 0.1, count: 3, power: 0.8, dir1: [-0.2, 1, -0.2], dir2: [0.2, 1.5, 0.2], first: "mint", last: "jade" })
  if (moment % 5 === 0) gateCloud([mid[0], mid[1] + 0.2, mid[2]], 1.5 * scale, 0.1, { life: 0.5, size: 0.16, count: 2, power: 0.3, first: "white", last: "gold" })
  if (moment % 7 === 0) gateCloud([mid[0] + Math.sin(moment) * 1.5 * scale, mid[1] + 0.2, mid[2] + Math.cos(moment) * 1.5 * scale], 0.1, 0.1, { texture: "square_particle", life: 0.8, size: 0.3, count: 3, power: 0.6, dir1: [-0.2, 1, -0.2], dir2: [0.2, 1.4, 0.2], first: "steam", last: "steam" })
}

function gateStep(cast) {
  var moment = cast.moment
  var scale = GATE_CFG.size
  var mid = cast.centre
  if (moment === 0) {
    gateSound("open", mid)
    gateWear(cast, true)
    gateAnimate(cast, GATE_POSE.rest, GATE_POSE.brace, 3)
  }
  if (moment === 3) gateAnimate(cast, GATE_POSE.brace, GATE_POSE.drop, 3)
  cast.gates.forEach((gate) => gateRun(cast, gate, moment))
  if (cast.phase === "sink") {
    var high = 1.8 * (1 - (moment + 1) / GATE_STEP.sink)
    gateCloud([mid[0], mid[1] + high * 0.5 + 0.1, mid[2]], 0.3, high * 0.5 + 0.1, { life: 0.35, size: 0.14, count: 8, power: 1.2, dir1: [-0.3, -1.5, -0.3], dir2: [0.3, -0.8, 0.3], first: "mint", last: "gold" })
    if (GATE_CFG.holdPlayer) api.setPosition(cast.owner, mid[0], mid[1], mid[2])
    if (GATE_CFG.hidePlayer && moment === GATE_STEP.sink - 3) {
      try {
        api.setPlayerOpacity(cast.owner, 0.5)
      } catch (err) {}
    }
    if (moment >= GATE_STEP.sink - 1) {
      cast.phase = "inside"
      cast.enter = moment + 1
      gateWear(cast, false)
      gateAnimate(cast, null)
      gateHold(cast, true)
      gateCloud([mid[0], mid[1] + 0.4, mid[2]], 0.6, 0.3, { life: 0.4, size: 0.2, count: 20, power: 3, first: "white", last: "jade" })
    }
    return false
  }
  if (cast.phase === "inside") {
    var waited = moment - cast.enter
    cast.aim = gateFacing(cast.owner, cast.aim)
    var where = api.getPosition(cast.owner)
    if (GATE_CFG.holdPlayer && Math.hypot(where[0] - mid[0], where[2] - mid[2]) > 0.25) api.setPosition(cast.owner, mid[0], mid[1], mid[2])
    var total = Math.round(GATE_CFG.stay * 20)
    if (waited < total && !cast.wantOut) {
      gateArrow(cast, moment)
      var spent = Math.min(16, Math.floor((waited / total) * 16))
      while (cast.rimGone < spent) {
        var slot = cast.gates[0].parts.filter((part) => part.piece.rim === cast.rimGone)[0]
        if (slot) api.updateMeshEntity(slot.ident, "Box", { width: slot.piece.wide * scale, height: slot.piece.tall * scale, depth: slot.piece.deep * scale, diffuseColor: [0, 0, 0], emissiveColor: GATE_COL.dark, hideDist: GATE_CFG.hideDist })
        cast.rimGone++
      }
      return false
    }
    cast.phase = "leave"
    cast.left = moment
    cast.out = gateReach(mid, cast.aim, Math.min(15, GATE_CFG.travel))
    gateDrop(cast, cast.arrow.filter((made) => made))
    cast.arrow.length = 0
    gateHold(cast, false)
    api.setPosition(cast.owner, cast.out[0], cast.out[1], cast.out[2])
    cast.gates[0].shut = true
    var second = { mid: cast.out, parts: [], next: 0, each: Math.ceil(gatePlan.length / 2), shut: false }
    cast.gates.push(second)
    gateRun(cast, second, moment)
    gateWear(cast, true)
    gateSound("leave", cast.out)
    gateSound("slash", cast.out)
    gateAnimate(cast, GATE_POSE.rise, GATE_POSE.wide, 1)
    gateCloud([cast.out[0], cast.out[1] + 0.2, cast.out[2]], 1, 0.1, { life: 0.4, size: 0.2, count: 30, power: 3, dir1: [-1, 0.2, -1], dir2: [1, 1.5, 1], first: "white", last: "jade" })
    gateCloud([cast.out[0], cast.out[1] + 0.2, cast.out[2]], 0.8, 0.1, { life: 0.5, size: 0.16, count: 16, power: 2, dir1: [-1, 0.5, -1], dir2: [1, 2, 1], first: "white", last: "gold" })
    gateCloud([cast.out[0], cast.out[1] + 0.9, cast.out[2]], 0.3, 0.9, { life: 0.4, size: 0.14, count: 14, power: 1.5, dir1: [-0.3, 0.8, -0.3], dir2: [0.3, 1.6, 0.3], first: "mint", last: "gold" })
    return false
  }
  var age = moment - cast.left
  if (age >= 1 && age <= GATE_STEP.spin) {
    if ((age - 1) % 2 === 0) {
      var quarter = (age - 1) / 2
      gateAnimate(cast, GATE_POSE.wide, GATE_POSE.wide, 2, (quarter * 90) % 360, ((quarter * 90) % 360) + 90)
    }
    gateHarm(cast)
  }
  if (age >= 1) gateSlash(cast, age - 1)
  if (age === GATE_STEP.spin + 1) {
    gateAnimate(cast, GATE_POSE.wide, GATE_POSE.rest, GATE_STEP.settle)
    cast.gates[1].shut = true
  }
  return age >= GATE_STEP.spin + 1 + GATE_STEP.settle && !cast.gates.some((gate) => gate.parts.length)
}

function gateEnd(cast) {
  try {
    gateHold(cast, false)
  } catch (err) {}
  if (cast.phase === "sink" && GATE_CFG.hidePlayer) {
    try {
      api.setPlayerOpacity(cast.owner, 1)
    } catch (err) {}
  }
  gateWear(cast, false)
  gateAnimate(cast, null)
  gateDrop(cast, cast.made.slice())
}

function gateTick() {
  for (var idx = gateList.length - 1; idx >= 0; idx--) {
    var cast = gateList[idx]
    var ended = true
    try {
      ended = gateStep(cast)
      cast.moment++
    } catch (err) {
      try {
        api.sendMessage(cast.owner, "Portal stopped at tick " + cast.moment + ": " + err, { color: "orange" })
      } catch (other) {}
    }
    if (ended) {
      gateEnd(cast)
      gateList.splice(idx, 1)
    }
  }
}

function gearPortal(playerId) {
  var mine = gateList.filter((cast) => cast.owner === playerId)[0]
  if (mine) {
    if (mine.phase === "inside") mine.wantOut = true
    return false
  }
  if (gateList.length >= GATE_CFG.maxCasts) {
    api.sendMessage(playerId, "Too many portals are open.", { color: "orange" })
    return false
  }
  var where = api.getPosition(playerId)
  var face = gateFacing(playerId, [0, 1])
  var from = [where[0], where[1], where[2]]
  gateList.push({ owner: playerId, moment: 0, phase: "sink", aim: face, centre: from, gates: [{ mid: from, parts: [], next: 0, each: Math.ceil(gatePlan.length / GATE_STEP.open), shut: false }], made: [], arrow: [], slash: [], hurt: {}, rimGone: 0, held: false, worn: false, wantOut: false })
  return true
}

globalThis.gearPortal = gearPortal

var gateOldTick = typeof tick === "function" ? tick : null
tick = (msec) => {
  if (gateOldTick) gateOldTick(msec)
  gateTick()
}

var gateOldChat = typeof onPlayerChat === "function" ? onPlayerChat : null
onPlayerChat = (playerId, message) => {
  if (GATE_CFG.chat && message.trim().toLowerCase() === GATE_CFG.chat) return gearPortal(playerId), false
  if (gateOldChat) return gateOldChat(playerId, message)
}

var gateOldClick = typeof onPlayerClick === "function" ? onPlayerClick : null
onPlayerClick = (playerId, wasAlt, spotX, spotY, spotZ, block, target) => {
  if (GATE_CFG.clickLeaves) {
    var mine = gateList.filter((cast) => cast.owner === playerId && cast.phase === "inside")[0]
    if (mine) mine.wantOut = true
  }
  if (gateOldClick) return gateOldClick(playerId, wasAlt, spotX, spotY, spotZ, block, target)
}
