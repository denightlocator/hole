// ============================================================================
//  GOODRA  -  World Code (F8)
//  The Pokemon that fires Dragon Pulse in the clip, built from Box meshes.
//
//  Works on its own. To let it fire the move, paste it BELOW world_code.js in
//  the same World Code.
//
//  Chat:  !goodra         stand it where you are, facing the way you look
//         !goodra pulse   it fires Dragon Pulse from its mouth
//         !goodra off     remove it
//
//  Layout:   1 config    2 colours    3 mesh tables    4 engine    5 callbacks
// ============================================================================

// ---------------------------------------------------------------- 1. CONFIG
var GOODRA_CFG = {
  chat: "!goodra",
  scale: 0.6,     // 1 = 6.8 blocks tall, 0.6 = about 4 blocks
  detail: 3,      // 1 = body and eyes (51 meshes), 2 = + face, spots, belly (92), 3 = everything (125)
  rotate: true,   // turn the meshes. false = no turning: it then faces north, east, south or west
  perTick: 10,    // meshes made per tick while it is being built
  hideDist: 96,
}

// --------------------------------------------------------------- 2. COLOURS
var GOODRA_COL = {
  skin: [190, 166, 226],   // lilac body
  light: [208, 188, 238],  // rounded edges catch the light
  under: [150, 112, 196],  // darker underside: throat, belly, under the tail
  spot: [142, 212, 120],   // green spots
  eye: [96, 200, 96],
  white: [255, 255, 255],
  dark: [70, 48, 104],     // mouth, nostrils, pupils
  slime: [226, 214, 248],
}

// ----------------------------------------------------------- 3. MESH TABLES
// One row is one Box mesh:
//   [name, width, height, depth, colour, forward, right, up, tilt, turn, lean, flags]
// width is left-right, height is bottom-top, depth is back-front.
// forward / right / up: where its middle is, in blocks from the point on the
//   ground between the feet (before GOODRA_CFG.scale).
// tilt / turn / lean: degrees. tilt + leans its top forward, turn + turns it
//   to its right, lean + leans its top to its right. Leave out for 0.
// flags: "m" = make it twice, mirrored left and right (written for the right
//   side). "2" or "3" = only at that detail level or higher. "g" = glows.
var GOODRA_MESH = {
  // ---- head: a rounded block with a short blunt snout
  head: [
    ["skull", 1.5, 1.25, 1.5, "skin", 0.45, 0, 5.4],
    ["skullTop", 1.2, 0.25, 1.2, "light", 0.45, 0, 6.1],
    ["skullBack", 1.2, 1.0, 0.25, "skin", -0.4, 0, 5.45],
    ["cheek", 0.2, 0.75, 1.1, "skin", 0.5, 0.82, 5.15, 0, 0, 0, "m"],
    ["snout", 1.2, 0.7, 0.6, "skin", 1.4, 0, 5.1],
    ["snoutTip", 0.95, 0.52, 0.2, "skin", 1.78, 0, 5.12],
    ["chin", 1.0, 0.25, 1.3, "under", 0.75, 0, 4.72],
    ["jawSide", 0.16, 0.3, 0.9, "skin", 1.0, 0.56, 4.85, 0, 0, 0, "m2"],
  ],

  // ---- face: big round eyes that stand out from the head and glow, so they
  //      show from the ground and in the dark; mouth, nostrils, cheek spots
  face: [
    ["eye", 0.5, 0.6, 0.22, "eye", 1.26, 0.5, 5.75, 0, 0, 0, "mg"],
    ["eyeSide", 0.14, 0.5, 0.45, "eye", 1.05, 0.95, 5.75, 0, 0, 0, "mg"],
    ["pupil", 0.14, 0.28, 0.08, "dark", 1.39, 0.43, 5.7, 0, 0, 0, "m"],
    ["eyeShine", 0.16, 0.18, 0.08, "white", 1.39, 0.6, 5.9, 0, 0, 0, "mg2"],
    ["eyelid", 0.58, 0.07, 0.28, "under", 1.26, 0.5, 6.08, 0, 0, 0, "m3"],
    ["mouth", 0.8, 0.06, 0.06, "dark", 1.88, 0, 4.94, 0, 0, 0, "2"],
    ["smile", 0.06, 0.16, 0.06, "dark", 1.86, 0.42, 5.0, 0, 0, 0, "m3"],
    ["nostril", 0.08, 0.08, 0.05, "dark", 1.89, 0.2, 5.3, 0, 0, 0, "m3"],
    ["cheekSpot", 0.06, 0.34, 0.34, "spot", 0.7, 0.94, 5.18, 0, 0, 0, "m2"],
  ],

  // ---- antennae: the long pair hangs down the back and curls at the tip,
  //      the short pair stands on the forehead
  antennae: [
    ["hornRoot", 0.32, 0.7, 0.32, "skin", -0.05, 0.45, 6.3, -25, 0, 8, "m"],
    ["hornArch", 0.3, 0.3, 0.95, "skin", -0.65, 0.52, 6.62, 12, 0, 0, "m"],
    ["hornDrop1", 0.28, 0.95, 0.28, "skin", -1.18, 0.58, 6.15, 18, 0, 0, "m"],
    ["hornDrop2", 0.26, 0.95, 0.26, "skin", -1.42, 0.62, 5.35, 6, 0, 0, "m"],
    ["hornDrop3", 0.24, 0.8, 0.24, "skin", -1.47, 0.64, 4.6, 0, 0, 0, "m"],
    ["hornCurl1", 0.22, 0.22, 0.55, "skin", -1.3, 0.64, 4.15, 0, 0, 0, "m"],
    ["hornCurl2", 0.2, 0.42, 0.2, "skin", -1.02, 0.64, 4.32, 0, 0, 0, "m2"],
    ["hornCurl3", 0.18, 0.18, 0.3, "skin", -1.12, 0.64, 4.52, 0, 0, 0, "m3"],
    ["hornSpot", 0.26, 0.26, 0.26, "spot", -1.47, 0.64, 4.2, 0, 0, 0, "m2"],
    ["feeler", 0.18, 0.42, 0.18, "skin", 0.95, 0.3, 6.27, 18, 0, 6, "m"],
    ["feelerTip", 0.22, 0.16, 0.22, "light", 1.03, 0.32, 6.5, 18, 0, 6, "m3"],
  ],

  // ---- neck: long, with the darker throat down its front
  neck: [
    ["neckTop", 1.05, 0.75, 1.0, "skin", 0.3, 0, 4.6],
    ["neckBase", 1.25, 0.9, 1.15, "skin", 0.2, 0, 3.95],
    ["throatTop", 0.75, 0.7, 0.14, "under", 0.82, 0, 4.55, -6, 0, 0, "2"],
    ["throatBase", 0.9, 0.85, 0.14, "under", 0.8, 0, 3.95, 0, 0, 0, "2"],
  ],

  // ---- torso: pear shaped, widest at the hips
  torso: [
    ["chest", 1.7, 0.85, 1.45, "skin", 0.12, 0, 3.4],
    ["waist", 2.0, 1.1, 1.7, "skin", 0.05, 0, 2.6],
    ["hips", 2.3, 1.3, 1.9, "skin", 0, 0, 1.6],
    ["shoulder", 0.3, 0.6, 0.9, "light", 0.12, 0.92, 3.4, 0, 0, 0, "m2"],
    ["side", 0.2, 0.9, 1.3, "light", 0.05, 1.08, 2.55, 0, 0, 0, "m2"],
    ["hipSide", 0.2, 1.0, 1.5, "light", 0, 1.23, 1.6, 0, 0, 0, "m2"],
    ["backTop", 1.3, 0.7, 0.2, "light", -0.68, 0, 3.4, 0, 0, 0, "2"],
    ["backMid", 1.6, 0.9, 0.2, "light", -0.88, 0, 2.6, 0, 0, 0, "2"],
  ],

  // ---- belly: the darker underside, in plates from the chest to the hips
  belly: [
    ["bellyTop", 1.2, 0.75, 0.16, "under", 0.9, 0, 3.4, 0, 0, 0, "2"],
    ["bellyMid", 1.5, 1.0, 0.2, "under", 0.98, 0, 2.6, 0, 0, 0, "2"],
    ["bellyLow", 1.7, 1.1, 0.24, "under", 1.04, 0, 1.65, 0, 0, 0, "2"],
    ["bellyBulge", 1.2, 0.8, 0.14, "under", 1.2, 0, 1.9, 0, 0, 0, "3"],
    ["bellyUnder", 1.6, 0.14, 1.5, "under", 0.1, 0, 0.92, 0, 0, 0, "3"],
  ],

  // ---- arms: short and stubby, held out in front, with two fingers
  arms: [
    ["upperArm", 0.5, 0.5, 0.95, "skin", 0.6, 1.02, 3.38, 28, 0, 0, "m"],
    ["foreArm", 0.46, 0.46, 0.8, "skin", 1.28, 1.02, 3.08, 12, 0, 0, "m"],
    ["hand", 0.56, 0.5, 0.5, "light", 1.78, 1.02, 2.98, 0, 0, 0, "m"],
    ["fingerOut", 0.2, 0.2, 0.32, "skin", 2.1, 1.2, 3.02, 0, 0, 0, "m2"],
    ["fingerIn", 0.2, 0.2, 0.32, "skin", 2.1, 0.84, 3.02, 0, 0, 0, "m2"],
    ["elbow", 0.4, 0.3, 0.3, "light", 0.95, 1.02, 3.02, 0, 0, 0, "m3"],
  ],

  // ---- legs: thick, with flat two-toed feet
  legs: [
    ["thigh", 0.95, 0.9, 1.05, "skin", 0.05, 0.72, 0.85, 0, 0, 0, "m"],
    ["foot", 1.0, 0.45, 1.35, "skin", 0.3, 0.75, 0.23, 0, 0, 0, "m"],
    ["toeOut", 0.36, 0.3, 0.32, "light", 1.08, 0.98, 0.16, 0, 0, 0, "m2"],
    ["toeIn", 0.36, 0.3, 0.32, "light", 1.08, 0.52, 0.16, 0, 0, 0, "m2"],
    ["knee", 0.7, 0.4, 0.2, "light", 0.62, 0.72, 0.95, 0, 0, 0, "m3"],
  ],

  // ---- tail: thick at the hips, thinner along the ground, curled at the end
  tail: [
    ["tail1", 1.7, 1.2, 1.2, "skin", -1.15, 0, 1.3, -18, 0, 0],
    ["tail2", 1.5, 1.0, 1.2, "skin", -2.1, 0, 0.9, -14, 0, 0],
    ["tail3", 1.3, 0.85, 1.2, "skin", -3.05, 0, 0.6, -8, 0, 0],
    ["tail4", 1.1, 0.7, 1.1, "skin", -3.95, 0, 0.42],
    ["tail5", 0.9, 0.6, 1.0, "skin", -4.75, 0, 0.42, 10, 0, 0],
    ["tailCurl1", 0.75, 0.85, 0.6, "skin", -5.3, 0, 0.85],
    ["tailCurl2", 0.65, 0.5, 0.85, "skin", -5.05, 0, 1.4],
    ["tailCurl3", 0.55, 0.55, 0.45, "light", -4.6, 0, 1.25],
    ["tailTip", 0.42, 0.4, 0.4, "light", -4.7, 0, 0.98, 0, 0, 0, "2"],
    ["tailUnder1", 1.2, 0.12, 1.1, "under", -1.3, 0, 0.72, -18, 0, 0, "3"],
    ["tailUnder2", 1.05, 0.12, 1.1, "under", -2.2, 0, 0.4, -14, 0, 0, "3"],
    ["tailUnder3", 0.9, 0.1, 1.1, "under", -3.1, 0, 0.17, -8, 0, 0, "3"],
  ],

  // ---- spots: green, along both sides of the tail and on the hips
  spots: [
    ["hipSpot", 0.06, 0.4, 0.4, "spot", -0.35, 1.35, 1.75, 0, 0, 0, "m2"],
    ["tailSpot1", 0.06, 0.42, 0.42, "spot", -1.2, 0.87, 1.38, -18, 0, 0, "m2"],
    ["tailSpot2", 0.06, 0.38, 0.38, "spot", -2.1, 0.77, 0.98, -14, 0, 0, "m2"],
    ["tailSpot3", 0.06, 0.32, 0.32, "spot", -3.05, 0.67, 0.66, -8, 0, 0, "m2"],
    ["tailSpot4", 0.06, 0.26, 0.26, "spot", -3.95, 0.57, 0.46, 0, 0, 0, "m3"],
    ["curlSpot", 0.06, 0.3, 0.3, "spot", -5.05, 0.35, 1.4, 0, 0, 0, "m3"],
  ],

  // ---- slime: Goodra drips. Hanging from the hands, chin, elbows and tail
  slime: [
    ["handDrip1", 0.12, 0.42, 0.12, "slime", 1.85, 1.1, 2.55, 0, 0, 0, "m3"],
    ["handDrip2", 0.1, 0.26, 0.1, "slime", 1.65, 0.92, 2.62, 0, 0, 0, "m3"],
    ["elbowDrip", 0.1, 0.3, 0.1, "slime", 0.95, 1.05, 2.75, 0, 0, 0, "m3"],
    ["chinDrip", 0.12, 0.34, 0.12, "slime", 1.2, 0.15, 4.45, 0, 0, 0, "3"],
    ["tailDrip", 0.12, 0.3, 0.12, "slime", -4.6, 0, 0.72, 0, 0, 0, "3"],
    ["puddle", 0.7, 0.04, 0.6, "slime", 1.75, 1.0, 0.02, 0, 0, 0, "m3"],
  ],
}

// Where the mouth is: Dragon Pulse starts here. [forward, right, up]
var GOODRA_MOUTH = [2.0, 0, 5.1]

// ---------------------------------------------------------------- 4. ENGINE
var goodra = null // the one that stands in the world: { ids, todo, pos, yaw }

// Every mesh to make, mirrored rows doubled, for the detail level.
function goodraParts() {
  var out = []
  for (var group in GOODRA_MESH) {
    GOODRA_MESH[group].forEach((r) => {
      var flags = r[11] || ""
      var level = flags.indexOf("3") >= 0 ? 3 : flags.indexOf("2") >= 0 ? 2 : 1
      if (level > GOODRA_CFG.detail) return
      var part = { name: group + "." + r[0], glow: flags.indexOf("g") >= 0, size: [r[1], r[2], r[3]], col: r[4], at: [r[5], r[6], r[7]], rot: [r[8] || 0, r[9] || 0, r[10] || 0] }
      if (flags.indexOf("m") < 0) return out.push(part)
      out.push(Object.assign({}, part, { name: part.name + "R" }))
      out.push(Object.assign({}, part, { name: part.name + "L", at: [r[5], -r[6], r[7]], rot: [part.rot[0], -part.rot[1], -part.rot[2]] }))
    })
  }
  return out
}

// A point of the model in the world. p: [forward, right, up]
function goodraPoint(g, p) {
  var k = GOODRA_CFG.scale
  var s = Math.sin(g.yaw)
  var c = Math.cos(g.yaw)
  return [g.pos[0] + (s * p[0] + c * p[1]) * k, g.pos[1] + p[2] * k, g.pos[2] + (c * p[0] - s * p[1]) * k]
}

function goodraMake(g, part) {
  var k = GOODRA_CFG.scale
  var col = GOODRA_COL[part.col]
  var turned = !GOODRA_CFG.rotate && Math.round(g.yaw / (Math.PI / 2)) % 2 !== 0
  var id = api.attemptCreateMeshEntity("Box", {
    width: part.size[turned ? 2 : 0] * k,
    height: part.size[1] * k,
    depth: part.size[turned ? 0 : 2] * k,
    diffuseColor: col,
    emissiveColor: part.glow ? col : col.map((v) => Math.round(v * 0.35)),
    hideDist: GOODRA_CFG.hideDist,
  })
  if (!id) return false
  var p = goodraPoint(g, part.at)
  api.setPosition(id, p[0], p[1], p[2])
  if (GOODRA_CFG.rotate) {
    var d = Math.PI / 180
    api.setEntityRotation(id, part.rot[0] * d, g.yaw + part.rot[1] * d, -part.rot[2] * d)
  }
  g.ids.push(id)
  return true
}

function goodraRemove() {
  if (!goodra) return
  goodra.ids.forEach((id) => {
    try {
      api.deleteMeshEntity(id)
    } catch (e) {}
  })
  goodra = null
}

// Stands Goodra with its feet at pos, facing yaw (radians, 0 = +Z).
// It is built over the next ticks, GOODRA_CFG.perTick meshes at a time.
function goodraSpawn(pos, yaw, playerId) {
  goodraRemove()
  if (!GOODRA_CFG.rotate) yaw = Math.round(yaw / (Math.PI / 2)) * (Math.PI / 2)
  goodra = { ids: [], todo: goodraParts(), pos: pos, yaw: yaw, by: playerId }
}

function goodraTick() {
  var g = goodra
  if (!g || !g.todo.length) return
  for (var n = 0; n < GOODRA_CFG.perTick && g.todo.length; n++) {
    if (goodraMake(g, g.todo[0])) {
      g.todo.shift()
      continue
    }
    // the game would not make another mesh: stop here and say so
    try {
      api.sendMessage(g.by, "Goodra: the game's mesh limit was reached after " + g.ids.length + " parts, " + g.todo.length + " are missing. Lower GOODRA_CFG.detail.", { color: "orange" })
    } catch (e) {}
    g.todo = []
  }
}

// Goodra fires Dragon Pulse from its mouth, the way it faces.
function goodraPulse(playerId) {
  if (!goodra || typeof dragonPulse !== "function") return false
  var f = [Math.sin(goodra.yaw), 0.12, Math.cos(goodra.yaw)]
  return dragonPulse(playerId, goodraPoint(goodra, GOODRA_MOUTH), f)
}

function goodraChat(playerId, message) {
  var words = message.trim().toLowerCase().split(/\s+/)
  if (!GOODRA_CFG.chat || words[0] !== GOODRA_CFG.chat) return true
  if (words[1] === "off") goodraRemove()
  else if (words[1] === "pulse") {
    if (!goodra) api.sendMessage(playerId, "No Goodra yet. Type " + GOODRA_CFG.chat + " first.", { color: "orange" })
    else if (typeof dragonPulse !== "function") api.sendMessage(playerId, "Dragon Pulse is not in this World Code. Paste world_code.js above goodra.js.", { color: "orange" })
    else goodraPulse(playerId)
  } else {
    var dir = api.getPlayerFacingInfo(playerId).dir
    goodraSpawn(api.getPosition(playerId), Math.atan2(dir[0], dir[2]), playerId)
  }
  return false
}

globalThis.goodraSpawn = goodraSpawn
globalThis.goodraRemove = goodraRemove
globalThis.goodraPulse = goodraPulse

// ------------------------------------------------------------- 5. CALLBACKS
// These add Goodra to the tick and onPlayerChat that are already there (the
// ones of world_code.js when this is pasted below it), or stand alone.
var goodraOldTick = typeof tick === "function" ? tick : null
tick = (ms) => {
  if (goodraOldTick) goodraOldTick(ms)
  goodraTick()
}

var goodraOldChat = typeof onPlayerChat === "function" ? onPlayerChat : null
onPlayerChat = (playerId, message) => {
  if (goodraChat(playerId, message) === false) return false
  if (goodraOldChat) return goodraOldChat(playerId, message)
}
