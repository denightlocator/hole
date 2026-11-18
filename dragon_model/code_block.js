var dragonCol = { body: [156, 34, 32], dark: [96, 18, 22], belly: [232, 178, 108], wing: [116, 28, 36], bone: [240, 230, 208], eye: [255, 206, 96], spike: [58, 12, 16] }
var dragonPlan = (function () {
  var out = []
  var add = function (x, y, z, wide, tall, deep, yaw, col, tag, idx) { out.push({ x: x, y: y, z: z, wide: wide, tall: tall, deep: deep, yaw: yaw || 0, col: col, tag: tag || "", idx: idx || 0 }) }
  var side = 0
  var num = 0
  add(0, 1.3, 0, 1.4, 1.15, 2.5, 0, "body")
  add(0, 1.36, 1.2, 1.24, 1.02, 0.9, 0, "body")
  add(0, 1.24, -1.25, 1.18, 0.98, 1.0, 0, "body")
  add(0, 1.58, 1.8, 0.78, 0.78, 0.8, 0, "body")
  for (num = 0; num < 5; num++) add(0, 0.72 + (num % 2) * 0.03, 0.85 - num * 0.42, 0.92 - num * 0.05, 0.14, 0.38, 0, "belly")
  add(0, 1.98, 2.16, 0.62, 0.62, 0.72, 0, "body")
  add(0, 2.32, 2.5, 0.5, 0.5, 0.6, 0, "body")
  add(0, 2.56, 2.86, 0.62, 0.52, 0.74, 0, "body", "head")
  add(0, 2.44, 3.34, 0.46, 0.32, 0.6, 0, "body", "head")
  add(0, 2.88, 2.92, 0.14, 0.18, 0.34, 0, "spike", "head")
  add(0, 2.26, 3.16, 0.4, 0.16, 0.52, 0, "dark", "head")
  for (side = -1; side <= 1; side += 2) {
    add(side * 0.2, 2.78, 3.06, 0.22, 0.12, 0.3, side * 0.18, "dark", "head")
    add(side * 0.29, 2.6, 3.1, 0.1, 0.1, 0.1, 0, "eye", "head")
    add(side * 0.22, 2.86, 2.7, 0.12, 0.18, 0.42, side * 0.28, "bone", "head")
    add(side * 0.32, 3.0, 2.44, 0.1, 0.14, 0.32, side * 0.5, "bone", "head")
    for (num = 0; num < 2; num++) add(side * 0.12, 2.2, 3.36 - num * 0.16, 0.06, 0.12, 0.08, 0, "bone", "head")
    add(side * 0.8, 1.62, 0.55, 0.5, 0.4, 0.5, 0, "body", "wing", 0.03)
    add(side * 1.5, 1.7, 0.36, 1.4, 0.26, 0.34, side * 0.15, "dark", "wing", 0.3)
    add(side * 2.15, 1.8, 0.16, 0.95, 0.22, 0.3, side * 0.22, "dark", "wing", 0.5)
    add(side * 1.85, 1.72, -0.35, 1.9, 0.05, 1.6, side * 0.1, "wing", "wing", 0.28)
    add(side * 1.85, 1.8, 0.4, 1.9, 0.1, 0.14, side * 0.1, "bone", "wing", 0.28)
    for (var finger = 0; finger < 5; finger++) {
      var spread = 1.15 + finger * 0.45
      var long = 2.6 - Math.abs(finger - 2) * 0.28
      var outX = Math.sin(spread) * long * 0.5
      var outZ = Math.cos(spread) * long * 0.5
      add(side * (2.5 + outX), 1.79, 0.05 + outZ, 1.6, 0.05, long, side * spread, "wing", "wing", 0.52 + finger * 0.09)
      add(side * (2.5 + outX), 1.87, 0.05 + outZ, 0.12, 0.12, long, side * spread, "bone", "wing", 0.52 + finger * 0.09)
    }
    add(side * 2.5, 1.91, 0.05, 0.18, 0.22, 0.26, 0, "bone", "wing", 0.55)
    add(side * 0.64, 0.95, -1.05, 0.52, 0.78, 0.72, side * 0.05, "body")
    add(side * 0.68, 0.42, -1.16, 0.36, 0.56, 0.48, 0, "dark")
    add(side * 0.68, 0.14, -0.84, 0.52, 0.26, 0.82, 0, "dark")
    for (num = -1; num <= 1; num++) add(side * 0.68 + num * 0.18, 0.1, -0.4, 0.1, 0.11, 0.34, num * 0.24, "bone")
    add(side * 0.58, 0.9, 1.15, 0.44, 0.72, 0.58, side * -0.05, "body")
    add(side * 0.6, 0.4, 1.2, 0.32, 0.52, 0.42, 0, "dark")
    add(side * 0.6, 0.13, 1.38, 0.44, 0.24, 0.64, 0, "dark")
    for (num = -1; num <= 1; num++) add(side * 0.6 + num * 0.14, 0.09, 1.62, 0.08, 0.1, 0.26, num * 0.2, "bone")
  }
  for (num = 0; num < 7; num++) {
    add(0, 1.14 - num * 0.05, -1.95 - num * 0.42, 0.9 - num * 0.1, 0.8 - num * 0.09, 0.5, 0, num % 2 ? "dark" : "body", "tail", num + 1)
    if (num % 2 === 0) add(0, 1.55 - num * 0.05, -1.95 - num * 0.42, 0.08, 0.26, 0.18, 0, "spike", "tail", num + 1)
  }
  add(0, 0.86, -5.0, 0.5, 0.06, 0.8, 0, "wing", "tail", 7)
  for (num = 0; num < 8; num++) add(0, 1.92 + (num < 3 ? 0.06 : 0), 1.5 - num * 0.42, 0.1, 0.3, 0.24, 0, "spike")
  add(0, 2.02, 1.85, 0.08, 0.22, 0.16, 0, "spike")
  add(0, 2.36, 2.2, 0.08, 0.2, 0.14, 0, "spike")
  return out
})()

function dragonBuild(spotX, spotY, spotZ, turn) {
  var cosT = Math.cos(turn)
  var sinT = Math.sin(turn)
  var made = []
  dragonPlan.forEach((part) => {
    var ident = api.attemptCreateMeshEntity("Box", { width: part.wide, height: part.tall, depth: part.deep, diffuseColor: [0, 0, 0], emissiveColor: dragonCol[part.col], hideDist: 160 })
    if (!ident) return
    api.setPosition(ident, spotX + part.x * cosT + part.z * sinT, spotY + part.y, spotZ - part.x * sinT + part.z * cosT)
    if (part.yaw) api.setEntityRotation(ident, 0, turn + part.yaw, 0)
    made.push(ident)
  })
  return made
}

if (!globalThis.dragonIds) globalThis.dragonIds = []
if (globalThis.dragonIds.length) {
  globalThis.dragonIds.forEach((ident) => {
    try {
      api.deleteMeshEntity(ident)
    } catch (err) {}
  })
  globalThis.dragonIds.length = 0
} else {
  var face = api.getPlayerFacingInfo(myId).dir
  var flat = Math.hypot(face[0], face[2])
  var dirX = flat > 0.001 ? face[0] / flat : 0
  var dirZ = flat > 0.001 ? face[2] / flat : 1
  globalThis.dragonIds = dragonBuild(thisPos[0] + 0.5 + dirX * 6, thisPos[1], thisPos[2] + 0.5 + dirZ * 6, Math.atan2(-dirX, -dirZ))
}
