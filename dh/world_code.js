var RITE_CFG = {
  chat: "!dh",
  size: 1,
  spin: 0.5,
  pointsPerTick: 55,
  perPoint: 2,
  thick: 0.09,
  sparks: true,
  glyphs: true,
  growTicks: 24,
  duration: 0,
  stillLife: 8,
  hideDist: 120,
  maxCircles: 2,
}

var RITE_COL = {
  hot: [255, 205, 120],
  fire: [255, 72, 24],
  ember: [200, 25, 10],
  white: [255, 255, 255],
  pink: [255, 150, 185],
}

var RITE_RINGS = [
  [5, 84, -1],
  [4.5, 76, -1],
  [3.9, 66, 1],
]
var RITE_STAR = { radius: 3.9, tips: 5, perEdge: 20, turn: 1 }
var riteList = []
var riteBeat = 0

var ritePlan = (function () {
  var out = []
  RITE_RINGS.forEach((ring) => {
    for (var idx = 0; idx < ring[1]; idx++) out.push({ radius: ring[0], angle: (idx / ring[1]) * Math.PI * 2, turn: ring[2] })
  })
  var star = RITE_STAR
  for (var tip = 0; tip < star.tips; tip++) {
    var from = (tip / star.tips) * Math.PI * 2
    var upto = (((tip + 2) % star.tips) / star.tips) * Math.PI * 2
    for (var idx = 0; idx < star.perEdge; idx++) {
      var part = idx / star.perEdge
      var alongX = star.radius * (Math.sin(from) + (Math.sin(upto) - Math.sin(from)) * part)
      var alongZ = star.radius * (Math.cos(from) + (Math.cos(upto) - Math.cos(from)) * part)
      out.push({ radius: Math.hypot(alongX, alongZ), angle: Math.atan2(alongX, alongZ), turn: star.turn })
    }
  }
  var mixed = []
  var stride = 89
  for (var num = 0; num < out.length; num++) mixed.push(out[(num * stride) % out.length])
  return mixed
})()

function riteEmit(low, high, look) {
  api.playParticleEffect({
    dir1: look.dir1 || [0, 0, 0],
    dir2: look.dir2 || [0, 0, 0],
    pos1: low,
    pos2: high,
    texture: look.texture,
    minLifeTime: look.life,
    maxLifeTime: look.life * (look.lifeSpread || 1.15),
    minEmitPower: look.power || 0,
    maxEmitPower: (look.power || 0) * 2,
    minSize: look.size,
    maxSize: look.size * 1.25,
    manualEmitCount: look.count || 1,
    gravity: look.gravity || [0, 0, 0],
    colorGradients: [
      { timeFraction: 0, minColor: look.first.concat(1), maxColor: look.first.concat(1) },
      { timeFraction: 0.5, minColor: look.mid.concat(0.9), maxColor: look.mid.concat(0.9) },
      { timeFraction: 1, minColor: look.last.concat(0), maxColor: look.last.concat(0) },
    ],
    velocityGradients: [
      { timeFraction: 0, factor: 1, factor2: 1 },
      { timeFraction: 1, factor: 0.5, factor2: 0.5 },
    ],
    blendMode: 1,
    hideDist: RITE_CFG.hideDist,
  })
}

function ritePoint(circle, point, moment, grown, life) {
  var scale = RITE_CFG.size
  var angle = point.angle + point.turn * moment * (RITE_CFG.spin / 20)
  var radius = point.radius * scale * grown
  var spotX = circle.place[0] + Math.sin(angle) * radius
  var spotZ = circle.place[2] + Math.cos(angle) * radius
  var spotY = circle.place[1] + 0.12
  var thick = RITE_CFG.thick * scale * grown
  riteEmit([spotX - thick, spotY, spotZ - thick], [spotX + thick, spotY, spotZ + thick], { texture: "square_particle", count: RITE_CFG.perPoint, life: life, size: 0.27 * scale, first: RITE_COL.hot, mid: RITE_COL.fire, last: RITE_COL.ember })
}

function riteExtras(circle, moment) {
  var scale = RITE_CFG.size
  var place = circle.place
  if (RITE_CFG.sparks) {
    var wide = 0.7 * scale
    riteEmit([place[0] - wide, place[1] + 0.2, place[2] - wide], [place[0] + wide, place[1] + 0.6, place[2] + wide], { texture: "glint", life: 1.1, lifeSpread: 2, size: 0.11 * scale, count: 3, power: 2.2 * scale, dir1: [-0.35, 1, -0.35], dir2: [0.35, 1.6, 0.35], gravity: [0, -0.6, 0], first: RITE_COL.white, mid: RITE_COL.white, last: RITE_COL.hot })
  }
  if (RITE_CFG.glyphs && moment % 2 === 0) {
    var seed = moment * 2.399963
    var reach = (5.6 + 3.2 * Math.abs(Math.sin(moment * 12.9898))) * scale
    var baseX = place[0] + Math.sin(seed) * reach
    var baseZ = place[2] + Math.cos(seed) * reach
    var baseY = place[1] + (3 + 5 * Math.abs(Math.sin(moment * 78.233))) * scale
    var tint = moment % 6 === 0 ? RITE_COL.pink : RITE_COL.white
    riteEmit([baseX, baseY, baseZ], [baseX, baseY + 1.3 * scale, baseZ], { texture: "square_particle", life: 1.2, lifeSpread: 1.6, size: 0.1 * scale, count: 5, power: 0.5, dir1: [0, -1, 0], dir2: [0, -1.4, 0], first: RITE_COL.white, mid: tint, last: tint })
    if (moment % 4 === 0) riteEmit([baseX, baseY + 0.4 * scale, baseZ], [baseX + 0.35 * scale, baseY + 0.4 * scale, baseZ], { texture: "square_particle", life: 1.2, lifeSpread: 1.6, size: 0.1 * scale, count: 2, power: 0.5, dir1: [0, -1, 0], dir2: [0, -1.4, 0], first: RITE_COL.white, mid: tint, last: tint })
  }
}

function riteStep(circle) {
  var moment = circle.moment
  if (circle.done) return true
  var grown = Math.min(1, (moment + 1) / Math.max(1, RITE_CFG.growTicks))
  grown = 1 - (1 - grown) * (1 - grown)
  var each = Math.max(1, Math.min(ritePlan.length, RITE_CFG.pointsPerTick))
  var rounds = Math.ceil(ritePlan.length / each)
  var life = ((rounds + 1) / 20) * 1.05
  for (var num = 0; num < each; num++) ritePoint(circle, ritePlan[(moment * each + num) % ritePlan.length], moment, grown, life)
  riteExtras(circle, moment)
  return RITE_CFG.duration > 0 && moment >= RITE_CFG.duration * 20
}

function riteTick() {
  riteBeat++
  for (var idx = riteList.length - 1; idx >= 0; idx--) {
    var circle = riteList[idx]
    var ended = true
    try {
      ended = riteStep(circle)
      circle.moment++
    } catch (err) {
      try {
        api.sendMessage(circle.owner, "Circle stopped at tick " + circle.moment + ": " + err, { color: "orange" })
      } catch (other) {}
    }
    if (ended) riteList.splice(idx, 1)
  }
}

function riteSpot(playerId, place) {
  if (place) return [place[0], place[1], place[2]]
  var where = api.getPosition(playerId)
  return [where[0], where[1], where[2]]
}

function spinCircle(playerId, place, quick) {
  var mine = riteList.filter((circle) => circle.owner === playerId)[0]
  if (mine) {
    mine.done = true
    return false
  }
  if (riteList.length >= RITE_CFG.maxCircles) {
    api.sendMessage(playerId, "Too many circles are already open.", { color: "orange" })
    return false
  }
  var circle = { owner: playerId, moment: 0, place: riteSpot(playerId, place), done: false }
  if (quick) {
    circle.moment = RITE_CFG.growTicks
    ritePlan.forEach((point) => ritePoint(circle, point, circle.moment, 1, 0.4))
  }
  riteList.push(circle)
  return true
}

function spinCircleStill(playerId, place) {
  var circle = { owner: playerId, moment: 0, place: riteSpot(playerId, place), done: false }
  ritePlan.forEach((point) => ritePoint(circle, point, 0, 1, RITE_CFG.stillLife))
  return true
}

globalThis.spinCircle = spinCircle
globalThis.spinCircleStill = spinCircleStill
globalThis.spinCircleBeat = () => riteBeat

var riteOldTick = typeof tick === "function" ? tick : null
tick = (msec) => {
  if (riteOldTick) riteOldTick(msec)
  riteTick()
}

globalThis.dh = spinCircle

var riteOldChat = typeof onPlayerChat === "function" ? onPlayerChat : null
onPlayerChat = (playerId, message) => {
  if (RITE_CFG.chat && message.trim().toLowerCase() === RITE_CFG.chat) return spinCircle(playerId), false
  if (riteOldChat) return riteOldChat(playerId, message)
}
