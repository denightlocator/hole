if (typeof frOnce !== "function") {
  (function () {
var FR_CFG = {
  distance: 8,
  size: 1,
  tilt: 18,
  damage: 40,
  radius: 4,
  knockback: 10,
  hitPlayers: true,
  ringTicks: 18,
  buildTicks: 22,
  waitTicks: 20,
  flyTicks: 26,
  onceTime: 4.5,
  hideDist: 150,
  maxCasts: 2,
  maxMeshes: 60,
}

var FR_COL = {
  pink: [255, 105, 160],
  rose: [255, 60, 85],
  gold: [255, 200, 90],
  white: [255, 250, 230],
  fire: [255, 120, 30],
}

var FR_LONG = 12
var FR_RINGS = [
  [1.3, 2.6, "pink"],
  [2.3, 1.6, "rose"],
  [3.3, 3, "pink"],
  [4.4, 1.2, "rose"],
  [5.4, 2.3, "pink"],
  [6.5, 3.4, "rose"],
  [7.5, 1.5, "pink"],
  [8.5, 2, "pink"],
  [9.5, 1, "rose"],
  [10.4, 0.7, "pink"],
]
var FR_STAR = { radius: 3.1, thick: 0.07, lift: 0.08 }
var FR_BALL = [
  [0.85, 0.85, 0.85, 0, "white"],
  [0.85, 0.85, 0.85, 45, "gold"],
  [1.7, 0.24, 0.24, 0, "fire"],
  [1.7, 0.24, 0.24, 60, "fire"],
  [1.7, 0.24, 0.24, 120, "gold"],
  [0.24, 1.7, 0.24, 0, "fire"],
]

var frList = []
var frMeshes = 0

var frPlan = (function () {
  var out = []
  FR_RINGS.forEach((ring, index) => {
    var count = Math.max(10, Math.round((2 * Math.PI * ring[1]) / 0.36))
    for (var idx = 0; idx < count; idx++) out.push({ ring: index, along: ring[0], radius: ring[1], angle: (idx / count) * Math.PI * 2, col: ring[2] })
  })
  return out
})()

var frStar = (function () {
  var out = []
  for (var tri = 0; tri < 2; tri++) {
    for (var side = 0; side < 3; side++) {
      var from = ((side * 120 + tri * 60) * Math.PI) / 180
      var upto = (((side + 1) * 120 + tri * 60) * Math.PI) / 180
      var fromX = Math.sin(from) * FR_STAR.radius
      var fromZ = Math.cos(from) * FR_STAR.radius
      var uptoX = Math.sin(upto) * FR_STAR.radius
      var uptoZ = Math.cos(upto) * FR_STAR.radius
      out.push({ midX: (fromX + uptoX) / 2, midZ: (fromZ + uptoZ) / 2, long: Math.hypot(uptoX - fromX, uptoZ - fromZ), yaw: Math.atan2(uptoX - fromX, uptoZ - fromZ), fromX: fromX, fromZ: fromZ, uptoX: uptoX, uptoZ: uptoZ })
    }
  }
  return out
})()

function frEmit(low, high, look) {
  var stops = look.stops || [[0, look.first, 1], [0.6, look.mid || look.first, 1], [1, look.last || look.first, 0]]
  api.playParticleEffect({
    dir1: look.dir1 || [0, 0, 0],
    dir2: look.dir2 || [0, 0, 0],
    pos1: low,
    pos2: high,
    texture: look.texture || "glint",
    minLifeTime: look.life,
    maxLifeTime: look.life * (look.lifeSpread || 1.2),
    minEmitPower: look.power || 0,
    maxEmitPower: (look.power || 0) * (look.powerSpread || 1),
    minSize: look.size,
    maxSize: look.size * (look.sizeSpread || 1.3),
    manualEmitCount: look.count || 1,
    gravity: look.gravity || [0, 0, 0],
    colorGradients: stops.map((stop) => ({ timeFraction: stop[0], minColor: stop[1].concat(stop[2]), maxColor: stop[1].concat(stop[2]) })),
    velocityGradients: [
      { timeFraction: 0, factor: 1, factor2: 1 },
      { timeFraction: 1, factor: look.slow === undefined ? 0.4 : look.slow, factor2: look.slow === undefined ? 0.4 : look.slow },
    ],
    blendMode: 1,
    hideDist: FR_CFG.hideDist,
  })
}

function frFrame(base, facing) {
  var tilt = (FR_CFG.tilt * Math.PI) / 180
  var axis = [-facing[0] * Math.sin(tilt), Math.cos(tilt), -facing[1] * Math.sin(tilt)]
  var flat = Math.hypot(axis[0], axis[2])
  var side = flat > 0.001 ? [axis[2] / flat, 0, -axis[0] / flat] : [1, 0, 0]
  var cross = [axis[1] * side[2] - axis[2] * side[1], axis[2] * side[0] - axis[0] * side[2], axis[0] * side[1] - axis[1] * side[0]]
  return { base: base, axis: axis, side: side, cross: cross }
}

function frOn(frame, along) {
  var scale = FR_CFG.size
  return [frame.base[0] + frame.axis[0] * along * scale, frame.base[1] + frame.axis[1] * along * scale, frame.base[2] + frame.axis[2] * along * scale]
}

function frRingSpot(frame, point) {
  var mid = frOn(frame, point.along)
  var reach = point.radius * FR_CFG.size
  var cosv = Math.cos(point.angle) * reach
  var sinv = Math.sin(point.angle) * reach
  return [mid[0] + frame.side[0] * cosv + frame.cross[0] * sinv, mid[1] + frame.side[1] * cosv + frame.cross[1] * sinv, mid[2] + frame.side[2] * cosv + frame.cross[2] * sinv]
}

function frBox(mid, half) {
  return [[mid[0] - half, mid[1] - half, mid[2] - half], [mid[0] + half, mid[1] + half, mid[2] + half]]
}

function frRingDot(frame, point, life, stops) {
  var spot = frRingSpot(frame, point)
  frEmit(spot, spot, { life: life, lifeSpread: 1.1, size: 0.15 * FR_CFG.size, first: FR_COL.white, mid: FR_COL[point.col], last: FR_COL[point.col], stops: stops })
}

function frMake(cast, wide, tall, deep, col) {
  if (frMeshes >= FR_CFG.maxMeshes) return null
  var ident = api.attemptCreateMeshEntity("Box", { width: wide, height: tall, depth: deep, diffuseColor: [0, 0, 0], emissiveColor: FR_COL[col], hideDist: FR_CFG.hideDist })
  if (!ident) return null
  frMeshes++
  cast.made.push(ident)
  return ident
}

function frDrop(cast, list) {
  list.forEach((ident) => {
    try {
      api.deleteMeshEntity(ident)
    } catch (err) {}
    frMeshes--
    var slot = cast.made.indexOf(ident)
    if (slot >= 0) cast.made.splice(slot, 1)
  })
  list.length = 0
}

function frBurst(mid, col, count, power, size, life) {
  var box = frBox(mid, 0.3 * FR_CFG.size)
  frEmit(box[0], box[1], { life: life, lifeSpread: 1.8, size: size * FR_CFG.size, count: count, power: power * FR_CFG.size, powerSpread: 2.2, dir1: [-1, -1, -1], dir2: [1, 1, 1], first: FR_COL.white, mid: FR_COL[col], last: FR_COL[col], slow: 0.1 })
}

function frHarm(cast) {
  var ids = api.getMobIds().concat(FR_CFG.hitPlayers ? api.getPlayerIds() : [])
  var reach = FR_CFG.radius * FR_CFG.size
  for (var idx = 0; idx < ids.length; idx++) {
    if (ids[idx] === cast.owner) continue
    var where = api.getPosition(ids[idx])
    if (!where) continue
    var distX = where[0] - cast.frame.base[0]
    var distZ = where[2] - cast.frame.base[2]
    var flat = Math.hypot(distX, distZ)
    if (flat > reach || Math.abs(where[1] - cast.frame.base[1]) > reach) continue
    api.applyHealthChange(ids[idx], -Math.round(FR_CFG.damage), cast.owner)
    var push = FR_CFG.knockback
    var away = flat > 0.01 ? [distX / flat, distZ / flat] : [0, 1]
    if (push) api.applyImpulse(ids[idx], away[0] * push, push * 0.6, away[1] * push)
  }
}

function frStep(cast) {
  var moment = cast.moment
  var scale = FR_CFG.size
  var frame = cast.frame
  var build = FR_CFG.buildTicks
  var launch = build + FR_CFG.waitTicks
  var land = launch + FR_CFG.flyTicks
  if (moment < 6) {
    var line = frStar[moment]
    var ident = frMake(cast, FR_STAR.thick * scale, FR_STAR.thick * scale, line.long * scale, "pink")
    if (ident) {
      api.setPosition(ident, frame.base[0] + line.midX * scale, frame.base[1] + FR_STAR.lift, frame.base[2] + line.midZ * scale)
      api.setEntityRotation(ident, 0, line.yaw, 0)
      cast.star.push(ident)
    }
  }
  if (moment <= land) {
    var shown = Math.min(FR_RINGS.length, Math.floor((moment / build) * FR_RINGS.length) + 1)
    var each = Math.ceil(frPlan.length / FR_CFG.ringTicks)
    var life = ((FR_CFG.ringTicks + 2) / 20) * 1.1
    for (var num = 0; num < each; num++) {
      var point = frPlan[(moment * each + num) % frPlan.length]
      if (point.ring < shown) frRingDot(frame, point, life)
    }
    if (shown > cast.shown) {
      cast.shown = shown
      frPlan.forEach((fresh, slot) => {
        if (fresh.ring === shown - 1 && slot % 2 === 0) frRingDot(frame, fresh, life)
      })
    }
    if (moment % 2 === 0) {
      var seed = moment * 2.399963
      var out = (2 + 2.6 * Math.abs(Math.sin(moment * 12.9898))) * scale
      var mid = frOn(frame, 1 + 9 * Math.abs(Math.sin(moment * 78.233)))
      var box = frBox([mid[0] + Math.sin(seed) * out, mid[1], mid[2] + Math.cos(seed) * out], 0.25 * scale)
      frEmit(box[0], box[1], { texture: "square_particle", life: 1, lifeSpread: 1.6, size: 0.08 * scale, count: 4, power: 0.3, dir1: [0, -1, 0], dir2: [0, -1.4, 0], first: FR_COL.white, mid: FR_COL.white, last: FR_COL.pink })
    }
  }
  if (moment >= build && moment <= land) {
    for (var grain = 0; grain < 3; grain++) {
      var spot = frOn(frame, 0.5 + (FR_LONG - 1) * Math.abs(Math.sin((moment * 3 + grain) * 43.7585)))
      var cloud = frBox(spot, 0.22 * scale)
      frEmit(cloud[0], cloud[1], { life: 0.5, lifeSpread: 2, size: 0.1 * scale, count: 4, power: 1.2 * scale, dir1: [-frame.axis[0], -frame.axis[1], -frame.axis[2]], dir2: [-frame.axis[0], -frame.axis[1], -frame.axis[2]], first: FR_COL.white, mid: FR_COL.gold, last: FR_COL.gold })
    }
  }
  if (moment === launch) {
    FR_BALL.forEach((part) => {
      var made = frMake(cast, part[0] * scale, part[1] * scale, part[2] * scale, part[4])
      if (made) cast.ball.push({ ident: made, yaw: (part[3] * Math.PI) / 180 })
    })
  }
  if (moment >= launch && moment < land) {
    var part = (moment - launch + 1) / FR_CFG.flyTicks
    var along = (FR_LONG + 1) * (1 - part * part)
    var here = frOn(frame, along)
    cast.ball.forEach((piece) => {
      api.setPosition(piece.ident, here[0], here[1], here[2])
      api.setEntityRotation(piece.ident, 0, piece.yaw + moment * 0.5, 0)
    })
    var tail = frBox(here, 0.4 * scale)
    frEmit(tail[0], tail[1], { life: 0.7, lifeSpread: 2.4, size: 0.13 * scale, count: 18, power: 0.5 * scale, powerSpread: 3, dir1: [-1, -1, -1], dir2: [1, 1, 1], first: FR_COL.white, mid: FR_COL.gold, last: FR_COL.fire })
    frEmit(tail[0], tail[1], { life: 0.35, lifeSpread: 1.5, size: 0.4 * scale, count: 5, power: 0.3, dir1: [-1, -1, -1], dir2: [1, 1, 1], first: FR_COL.white, mid: FR_COL.gold, last: FR_COL.fire })
    for (var index = 0; index < FR_RINGS.length; index++) {
      if (!cast.passed[index] && along <= FR_RINGS[index][0]) {
        cast.passed[index] = true
        frBurst(frOn(frame, FR_RINGS[index][0]), FR_RINGS[index][2], 14, 1.5 + FR_RINGS[index][1], 0.14, 0.4)
      }
    }
  }
  if (moment === land) {
    frDrop(cast, cast.ball.map((piece) => piece.ident))
    cast.ball.length = 0
    var ground = [frame.base[0], frame.base[1] + 0.5 * scale, frame.base[2]]
    frBurst(ground, "gold", 45, 6, 0.3, 0.6)
    frBurst(ground, "fire", 45, 4, 0.45, 0.5)
    frBurst(ground, "white", 30, 9, 0.16, 0.7)
    frBurst(ground, "pink", 30, 7, 0.2, 0.6)
    var rim = FR_CFG.radius * scale
    frEmit([ground[0] - 0.4, frame.base[1] + 0.15, ground[2] - 0.4], [ground[0] + 0.4, frame.base[1] + 0.25, ground[2] + 0.4], { life: 0.5, lifeSpread: 1.3, size: 0.35 * scale, count: 50, power: rim * 1.6, powerSpread: 1.3, dir1: [-1, 0, -1], dir2: [1, 0.05, 1], first: FR_COL.white, mid: FR_COL.gold, last: FR_COL.fire, slow: 0.05 })
    frHarm(cast)
  }
  if (moment === land + 10) {
    frDrop(cast, cast.star)
    return true
  }
  return false
}

function frTick() {
  for (var idx = frList.length - 1; idx >= 0; idx--) {
    var cast = frList[idx]
    var ended = true
    try {
      ended = frStep(cast)
      cast.moment++
    } catch (err) {
      try {
        api.sendMessage(cast.owner, "Stopped at tick " + cast.moment + ": " + err, { color: "orange" })
      } catch (other) {}
    }
    if (ended) {
      frDrop(cast, cast.made.slice())
      frList.splice(idx, 1)
    }
  }
}

function frAim(playerId, place, facing) {
  var look = facing
  if (!look) {
    var seen = api.getPlayerFacingInfo(playerId).dir
    var flat = Math.hypot(seen[0], seen[2])
    look = flat > 0.001 ? [seen[0] / flat, seen[2] / flat] : [0, 1]
  }
  var base = place
  if (!base) {
    var where = api.getPosition(playerId)
    var reach = Math.min(15, Math.max(0, FR_CFG.distance))
    base = [where[0] + look[0] * reach, where[1], where[2] + look[1] * reach]
  }
  return frFrame([base[0], base[1], base[2]], look)
}

function frCast(playerId, place, facing) {
  if (frList.length >= FR_CFG.maxCasts) {
    api.sendMessage(playerId, "Too many at once.", { color: "orange" })
    return false
  }
  frList.push({ owner: playerId, moment: 0, frame: frAim(playerId, place, facing), made: [], star: [], ball: [], passed: {}, shown: 0 })
  return true
}

function frOnce(playerId, place, facing) {
  var frame = frAim(playerId, place, facing)
  var scale = FR_CFG.size
  var total = FR_CFG.onceTime
  var white = FR_COL.white
  frPlan.forEach((point) => {
    var tint = FR_COL[point.col]
    frRingDot(frame, point, total, [[0, white, 1], [0.1, tint, 1], [0.9, tint, 1], [1, tint, 0]])
  })
  frStar.forEach((line) => {
    for (var num = 0; num < 14; num++) {
      var part = num / 14
      var spot = [frame.base[0] + (line.fromX + (line.uptoX - line.fromX) * part) * scale, frame.base[1] + FR_STAR.lift + 0.05, frame.base[2] + (line.fromZ + (line.uptoZ - line.fromZ) * part) * scale]
      frEmit(spot, spot, { life: total, lifeSpread: 1, size: 0.16 * scale, first: FR_COL.pink, stops: [[0, FR_COL.pink, 1], [0.85, FR_COL.pink, 1], [0.9, white, 1], [1, white, 0]] })
    }
  })
  var fly = total * 0.9
  var speed = ((FR_LONG + 1) * scale) / fly
  var down = [-frame.axis[0], -frame.axis[1], -frame.axis[2]]
  var top = frBox(frOn(frame, FR_LONG + 1), 0.3 * scale)
  frEmit(top[0], top[1], { life: fly, lifeSpread: 1, size: 0.5 * scale, sizeSpread: 1.5, count: 30, power: speed, dir1: down, dir2: down, slow: 1, first: white, stops: [[0, white, 1], [0.5, FR_COL.gold, 1], [1, FR_COL.fire, 1]] })
  for (var step = 0; step < 26; step++) {
    var along = (FR_LONG + 1) * (1 - (step + 0.5) / 26)
    var seenAt = (((step + 0.5) / 26) * fly) / total
    var cloud = frBox(frOn(frame, along), 0.3 * scale)
    frEmit(cloud[0], cloud[1], { life: total, lifeSpread: 1, size: 0.12 * scale, count: 12, power: 0.15, dir1: [-1, -1, -1], dir2: [1, 1, 1], slow: 1, first: white, stops: [[0, white, 0], [seenAt, white, 0], [Math.min(0.99, seenAt + 0.02), white, 1], [Math.min(0.995, seenAt + 0.12), FR_COL.gold, 1], [1, FR_COL.fire, 0]] })
  }
  var ground = frBox([frame.base[0], frame.base[1] + 0.6 * scale, frame.base[2]], 0.9 * scale)
  var flash = [[0, white, 0], [0.89, white, 0], [0.9, white, 1], [0.95, FR_COL.gold, 1], [1, FR_COL.fire, 0]]
  frEmit(ground[0], ground[1], { life: total, lifeSpread: 1, size: 1.1 * scale, sizeSpread: 1.8, count: 26, first: white, stops: flash })
  var wide = frBox([frame.base[0], frame.base[1] + 0.3 * scale, frame.base[2]], FR_CFG.radius * 0.7 * scale)
  frEmit([wide[0][0], frame.base[1] + 0.1, wide[0][2]], [wide[1][0], frame.base[1] + 1.2 * scale, wide[1][2]], { life: total, lifeSpread: 1, size: 0.3 * scale, sizeSpread: 2, count: 60, first: white, stops: flash })
  return true
}

globalThis.frOnce = frOnce
  })()
}
frOnce(myId, [thisPos[0] + 0.5, thisPos[1] + 1, thisPos[2] + 0.5])
