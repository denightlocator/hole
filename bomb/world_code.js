var NUKE_CFG = {
  chat: "!target",
  scale: 1,
  dropHeight: 45,
  fallTicks: 50,
  follow: true,
  killTarget: true,
  blastRadius: 12,
  boomSize: 1,
  blastDamage: 60,
  knockback: 22,
  hitCaster: true,
  hitMobs: true,
  sounds: true,
  hideDist: 250,
  maxBombs: 3,
}

var NUKE_COL = {
  olive: [112, 120, 30],
  light: [150, 152, 44],
  shade: [70, 96, 50],
  nose: [38, 60, 48],
  teal: [40, 150, 140],
  gold: [204, 150, 24],
  amber: [226, 122, 20],
  dark: [60, 62, 24],
}
function nukeBuild(place) {
  var scale = NUKE_CFG.scale
  var made = []
  var piece = function (wide, tall, deep, colour, offX, offY, offZ, yaw) {
    var tint = NUKE_COL[colour]
    var ident = api.attemptCreateMeshEntity("Box", {
      width: wide * scale,
      height: tall * scale,
      depth: deep * scale,
      diffuseColor: tint,
      emissiveColor: [tint[0] * 0.4, tint[1] * 0.4, tint[2] * 0.4],
      hideDist: NUKE_CFG.hideDist,
    })
    if (!ident) return
    var angle = yaw + 0
    var sine = Math.sin(0)
    var cosine = Math.cos(0)
    api.setPosition(ident, place[0] + (offX * cosine + offZ * sine) * scale, place[1] + offY * scale, place[2] + (offZ * cosine - offX * sine) * scale)
    api.setEntityRotation(ident, 0, angle, 0)
    made.push({ ident: ident, offX: (offX * cosine + offZ * sine) * scale, offY: offY * scale, offZ: (offZ * cosine - offX * sine) * scale })
  }
  var round = function (radius, tall, colour, height) {
    var deep = 2 * radius * Math.tan(Math.PI / 6)
    for (var turn = 0; turn < 3; turn++) piece(2 * radius, tall, deep, colour, 0, height, 0, (turn * Math.PI) / 3)
  }
  var layers = 16
  var bodyTall = 3.3
  var each = bodyTall / layers
  var widthAt = function (part) {
    if (part < 0.4) return Math.sqrt(1 - Math.pow((0.4 - part) / 0.4, 2))
    return 0.34 + 0.66 * Math.cos(((part - 0.4) / 0.6) * Math.PI * 0.5)
  }
  for (var row = 0; row < layers; row++) {
    var part = (row + 0.5) / layers
    var colour = row < 3 ? "nose" : row < 4 ? "shade" : "olive"
    round(widthAt(part), each + 0.01, colour, (row + 0.5) * each)
  }
  var bands = [5 * each, 9.5 * each]
  for (var band = 0; band < bands.length; band++) {
    var reach = widthAt(bands[band] / bodyTall) + 0.03
    round(reach, 0.07, "dark", bands[band])
    for (var lug = 0; lug < 6; lug++) {
      var around = (lug * Math.PI) / 3 + Math.PI / 6
      piece(0.3, 0.22, 0.1, "light", Math.sin(around) * reach, bands[band], Math.cos(around) * reach, around)
    }
  }
  for (var bolt = 0; bolt < 6; bolt++) {
    var spot = (bolt * Math.PI) / 3
    var out = widthAt(3 / layers) + 0.02
    piece(0.09, 0.09, 0.09, "teal", Math.sin(spot) * out, 3 * each, Math.cos(spot) * out, spot)
  }
  var finLow = bodyTall - 0.25
  var finTall = 1.3
  var half = 0.9
  var finMid = finLow + 0.45 + finTall / 2
  piece(half * 2 + 0.08, finTall, 0.08, "gold", 0, finMid, half, 0)
  piece(half * 2 + 0.08, finTall, 0.08, "amber", 0, finMid, -half, 0)
  piece(0.08, finTall, half * 2 + 0.08, "gold", half, finMid, 0, 0)
  piece(0.08, finTall, half * 2 + 0.08, "amber", -half, finMid, 0, 0)
  piece(half * 2.75, finTall + 0.45, 0.07, "teal", 0, finMid - 0.22, 0, Math.PI / 4)
  piece(half * 2.75, finTall + 0.45, 0.07, "teal", 0, finMid - 0.22, 0, -Math.PI / 4)
  round(0.3, 0.5, "dark", finLow + 0.3)
  round(0.2, 0.5, "olive", finLow + 0.75)
  for (var side = 0; side < 4; side++) {
    var edge = (side * Math.PI) / 2
    piece(0.16, 0.16, 0.12, "dark", Math.sin(edge) * half, finMid - finTall / 2 + 0.2, Math.cos(edge) * half, edge)
  }
  return made
}

var nukeList = []

function nukeFind(wanted) {
  var name = wanted.trim().toLowerCase()
  if (!name) return null
  var ids = api.getPlayerIds()
  var partly = null
  for (var num = 0; num < ids.length; num++) {
    var known = String(api.getEntityName(ids[num]) || "").toLowerCase()
    if (known === name) return ids[num]
    if (!partly && known.indexOf(name) === 0) partly = ids[num]
  }
  return partly
}

function nukeSound(name, volume, rate, where) {
  if (!NUKE_CFG.sounds) return
  try {
    api.broadcastSound(name, volume, rate, { playerIdOrPos: where, maxHearDist: 120, refDistance: 30 })
  } catch (err) {}
}

function nukePuff(low, high, look) {
  api.playParticleEffect({
    dir1: look.dir1 || [-1, -1, -1],
    dir2: look.dir2 || [1, 1, 1],
    pos1: low,
    pos2: high,
    texture: look.texture || "square_particle",
    minLifeTime: look.life * 0.6,
    maxLifeTime: look.life,
    minEmitPower: look.power * 0.4,
    maxEmitPower: look.power,
    minSize: look.size * 0.6,
    maxSize: look.size,
    manualEmitCount: look.count,
    gravity: [0, look.rise || 0, 0],
    colorGradients: [
      { timeFraction: 0, minColor: look.first.concat(1), maxColor: look.first.concat(1) },
      { timeFraction: 0.5, minColor: look.middle.concat(0.9), maxColor: look.middle.concat(0.9) },
      { timeFraction: 1, minColor: look.last.concat(0), maxColor: look.last.concat(0) },
    ],
    velocityGradients: [
      { timeFraction: 0, factor: 1, factor2: 1 },
      { timeFraction: 1, factor: 0.15, factor2: 0.15 },
    ],
    blendMode: look.solid ? 0 : 1,
    hideDist: NUKE_CFG.hideDist,
  })
}

function nukeBall(mid, reach, look) {
  nukePuff([mid[0] - reach, mid[1] - reach * 0.6, mid[2] - reach], [mid[0] + reach, mid[1] + reach * 0.6, mid[2] + reach], look)
}

var NUKE_FIRE = { white: [255, 255, 235], yellow: [255, 215, 70], orange: [255, 120, 20], red: [190, 40, 10], smoke: [60, 55, 52], ash: [25, 24, 24] }

function nukeHarm(bomb, ground) {
  var ids = api.getPlayerIds().concat(NUKE_CFG.hitMobs ? api.getMobIds() : [])
  for (var num = 0; num < ids.length; num++) {
    var ident = ids[num]
    if (ident === bomb.owner && ident !== bomb.target && !NUKE_CFG.hitCaster) continue
    var where = api.getPosition(ident)
    if (!where) continue
    var distX = where[0] - ground[0]
    var distY = where[1] - ground[1]
    var distZ = where[2] - ground[2]
    var away = Math.hypot(distX, distY, distZ)
    var isTarget = ident === bomb.target
    if (away > NUKE_CFG.blastRadius && !isTarget) continue
    var near = Math.max(0, 1 - away / NUKE_CFG.blastRadius)
    var flat = Math.hypot(distX, distZ)
    var push = NUKE_CFG.knockback * (isTarget ? 1 : 0.4 + 0.6 * near)
    try {
      if (flat > 0.2) api.applyImpulse(ident, (distX / flat) * push, push * 0.7, (distZ / flat) * push)
      else api.applyImpulse(ident, 0, push, 0)
    } catch (err) {}
    try {
      if (isTarget && NUKE_CFG.killTarget) api.killLifeform(ident, bomb.owner)
      else api.applyHealthChange(ident, -Math.max(1, Math.round(NUKE_CFG.blastDamage * (0.3 + 0.7 * near))), bomb.owner)
    } catch (err) {}
  }
}

function nukeRing(mid, height, start, parts, look) {
  for (var num = 0; num < parts; num++) {
    var angle = (num / parts) * Math.PI * 2 + (look.twist || 0)
    var dirX = Math.sin(angle)
    var dirZ = Math.cos(angle)
    var spot = [mid[0] + dirX * start, mid[1] + height, mid[2] + dirZ * start]
    look.dir1 = [dirX - 0.14, look.low || 0, dirZ - 0.14]
    look.dir2 = [dirX + 0.14, look.high || 0.05, dirZ + 0.14]
    nukePuff([spot[0] - 0.4, spot[1] - 0.2, spot[2] - 0.4], [spot[0] + 0.4, spot[1] + 0.2, spot[2] + 0.4], look)
  }
}

function nukeBoom(bomb, age) {
  var mid = bomb.ground
  var fire = NUKE_FIRE
  var big = NUKE_CFG.boomSize
  if (age === 0) {
    nukeSound("cannonFire1", 1, 0.5, mid)
    nukeSound("cannonFire2", 1, 0.7, mid)
    nukeSound("firecracker1", 1, 0.5, mid)
    nukeBall([mid[0], mid[1] + 3 * big, mid[2]], 4 * big, { count: 320, size: 6 * big, life: 0.7, power: 6 * big, texture: "glint", first: fire.white, middle: fire.white, last: fire.yellow })
    nukeBall([mid[0], mid[1] + 3 * big, mid[2]], 3 * big, { count: 420, size: 5 * big, life: 1.3, power: 22 * big, first: fire.white, middle: fire.yellow, last: fire.orange })
    nukeBall([mid[0], mid[1] + 3 * big, mid[2]], 2.5 * big, { count: 320, size: 3.6 * big, life: 2, power: 34 * big, first: fire.yellow, middle: fire.orange, last: fire.red })
    nukePuff([mid[0] - 1, mid[1] + 0.5, mid[2] - 1], [mid[0] + 1, mid[1] + 2, mid[2] + 1], { count: 160, size: 0.7 * big, life: 2.6, power: 30 * big, rise: -14, dir1: [-1, 0.6, -1], dir2: [1, 2.2, 1], first: fire.white, middle: fire.yellow, last: fire.red })
    nukeRing(mid, 0.6, 1, 24, { count: 14, size: 3 * big, life: 1.5, power: 30 * big, first: fire.white, middle: fire.yellow, last: fire.orange })
    nukeHarm(bomb, mid)
  }
  if (age === 3) {
    nukeSound("cannonFire3", 1, 0.5, mid)
    nukeRing(mid, 0.8, 2, 24, { twist: 0.13, count: 12, size: 3.6 * big, life: 2, power: 24 * big, first: fire.yellow, middle: fire.orange, last: fire.red })
  }
  if (age === 7) nukeRing(mid, 1, 3, 24, { count: 10, size: 4.4 * big, life: 2.8, power: 18 * big, solid: true, first: fire.smoke, middle: fire.smoke, last: fire.ash })
  if (age === 9) nukeSound("cannonFire1", 1, 0.5, mid)
  if (age === 12 || age === 22 || age === 32) {
    var halo = mid[1] + (6 + age * 0.45) * big
    nukeRing([mid[0], halo, mid[2]], 0, 1.5 * big, 20, { twist: age, count: 8, size: 2.2 * big, life: 1.8, power: 12 * big, low: -0.05, high: 0.12, first: fire.white, middle: fire.orange, last: fire.smoke })
  }
  if (age === 16) nukeSound("cannonFire2", 0.9, 0.5, mid)
  if (age >= 2 && age < 70 && age % 2 === 0) {
    var high = Math.min(24, age * 0.7) * big
    var fade = age < 44 ? 1 : 0.5
    nukePuff([mid[0] - 2 * big, mid[1], mid[2] - 2 * big], [mid[0] + 2 * big, mid[1] + high, mid[2] + 2 * big], { count: Math.round(60 * fade), size: 3.6 * big, life: 1.8, power: 2, rise: 4, first: fire.orange, middle: fire.red, last: fire.smoke })
    nukePuff([mid[0] - 2.4 * big, mid[1], mid[2] - 2.4 * big], [mid[0] + 2.4 * big, mid[1] + high, mid[2] + 2.4 * big], { count: Math.round(36 * fade), size: 4.2 * big, life: 2.8, power: 1.2, rise: 2.5, solid: true, first: fire.smoke, middle: fire.smoke, last: fire.ash })
    var capWide = Math.min(11, 2 + age * 0.3) * big
    nukePuff([mid[0] - capWide, mid[1] + high, mid[2] - capWide], [mid[0] + capWide, mid[1] + high + 4 * big, mid[2] + capWide], { count: Math.round(90 * fade), size: 4.6 * big, life: 2, power: 3 * big, rise: 1, dir1: [-1, -0.3, -1], dir2: [1, 0.5, 1], first: fire.yellow, middle: fire.orange, last: fire.smoke })
    nukePuff([mid[0] - capWide, mid[1] + high + big, mid[2] - capWide], [mid[0] + capWide, mid[1] + high + 5 * big, mid[2] + capWide], { count: Math.round(50 * fade), size: 5.2 * big, life: 3.2, power: 2 * big, rise: 0.6, solid: true, first: fire.smoke, middle: fire.smoke, last: fire.ash })
  }
  if (age >= 10 && age < 90 && age % 4 === 0) {
    var spread = 9 * big
    nukePuff([mid[0] - spread, mid[1] + 0.2, mid[2] - spread], [mid[0] + spread, mid[1] + 0.6, mid[2] + spread], { count: 30, size: 0.5 * big, life: 1.6, power: 0.6, rise: 1.2, texture: "glint", first: fire.yellow, middle: fire.orange, last: fire.red })
    nukePuff([mid[0] - spread, mid[1] + 8 * big, mid[2] - spread], [mid[0] + spread, mid[1] + 20 * big, mid[2] + spread], { count: 16, size: 0.4 * big, life: 2.4, power: 0.5, rise: -5, first: fire.orange, middle: fire.red, last: fire.ash })
  }
  if (age >= 70 && age < 100 && age % 5 === 0) {
    nukePuff([mid[0] - 6 * big, mid[1] + 4 * big, mid[2] - 6 * big], [mid[0] + 6 * big, mid[1] + 26 * big, mid[2] + 6 * big], { count: 24, size: 5 * big, life: 3, power: 0.6, rise: 1, solid: true, first: fire.smoke, middle: fire.ash, last: fire.ash })
  }
  return age >= 100
}

function nukeStep(bomb) {
  if (bomb.boomAt >= 0) return nukeBoom(bomb, bomb.moment - bomb.boomAt)
  var where = null
  try {
    where = api.getPosition(bomb.target)
  } catch (err) {}
  if (where && NUKE_CFG.follow) bomb.aim = [where[0], where[1], where[2]]
  var part = Math.min(1, bomb.moment / NUKE_CFG.fallTicks)
  var height = bomb.aim[1] + NUKE_CFG.dropHeight * (1 - part * part)
  for (var num = 0; num < bomb.pieces.length; num++) {
    var piece = bomb.pieces[num]
    api.setPosition(piece.ident, bomb.aim[0] + piece.offX, height + piece.offY, bomb.aim[2] + piece.offZ)
  }
  var tail = height + 4.8 * NUKE_CFG.scale
  nukePuff([bomb.aim[0] - 0.5, tail, bomb.aim[2] - 0.5], [bomb.aim[0] + 0.5, tail + 1.5, bomb.aim[2] + 0.5], { count: 8, size: 1.1, life: 0.8, power: 1, rise: 2, solid: true, first: [230, 230, 230], middle: [170, 170, 170], last: [90, 90, 90] })
  if (bomb.moment % 4 === 0) {
    nukePuff([bomb.aim[0] - 1.6, bomb.aim[1] + 0.1, bomb.aim[2] - 1.6], [bomb.aim[0] + 1.6, bomb.aim[1] + 0.2, bomb.aim[2] + 1.6], { count: 10, size: 0.5, life: 0.4, power: 0.2, first: [255, 40, 30], middle: [255, 40, 30], last: [255, 40, 30] })
    nukeSound("rocketEngineLoop", 0.8, 1 + part * 1.5, [bomb.aim[0], height, bomb.aim[2]])
  }
  if (part >= 1) {
    bomb.boomAt = bomb.moment
    bomb.ground = [bomb.aim[0], bomb.aim[1], bomb.aim[2]]
    nukeDrop(bomb)
    return nukeBoom(bomb, 0)
  }
  return false
}

function nukeDrop(bomb) {
  for (var num = 0; num < bomb.pieces.length; num++) {
    try {
      api.deleteMeshEntity(bomb.pieces[num].ident)
    } catch (err) {}
  }
  bomb.pieces = []
}

function nukeTick() {
  for (var idx = nukeList.length - 1; idx >= 0; idx--) {
    var bomb = nukeList[idx]
    var ended = true
    try {
      ended = nukeStep(bomb)
      bomb.moment++
    } catch (err) {}
    if (ended) {
      nukeDrop(bomb)
      nukeList.splice(idx, 1)
    }
  }
}

function nukeTarget(ownerId, targetId) {
  if (nukeList.length >= NUKE_CFG.maxBombs) return false
  var where = api.getPosition(targetId)
  var aim = [where[0], where[1], where[2]]
  var pieces = nukeBuild([aim[0], aim[1] + NUKE_CFG.dropHeight, aim[2]])
  if (!pieces.length) return false
  nukeList.push({ owner: ownerId, target: targetId, aim: aim, pieces: pieces, moment: 0, boomAt: -1, ground: null })
  nukeSound("cannonFire1", 0.8, 1.4, ownerId)
  return true
}

globalThis.nukeTarget = nukeTarget

var nukeOldTick = typeof tick === "function" ? tick : null
tick = (msec) => {
  if (nukeOldTick) nukeOldTick(msec)
  nukeTick()
}

var nukeOldChat = typeof onPlayerChat === "function" ? onPlayerChat : null
onPlayerChat = (playerId, message) => {
  var text = message.trim()
  var word = NUKE_CFG.chat
  if (text.toLowerCase() === word || text.toLowerCase().indexOf(word + " ") === 0) {
    var wanted = text.slice(word.length).trim()
    try {
      var found = wanted ? nukeFind(wanted) : null
      if (found) nukeTarget(playerId, found)
    } catch (err) {}
    return false
  }
  if (nukeOldChat) return nukeOldChat(playerId, message)
}
