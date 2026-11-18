var nightCol = { navy: [30, 32, 104], deep: [18, 20, 66], light: [52, 56, 142], red: [236, 36, 64], glow: [255, 108, 120] }
var nightPlan = (function () {
  var out = []
  var add = function (x, y, z, wide, tall, deep, yaw, col, tag, idx) { out.push({ x: x, y: y, z: z, wide: wide, tall: tall, deep: deep, yaw: yaw || 0, col: col, tag: tag || "", idx: idx || 0 }) }
  var side = 0
  var num = 0
  add(0, 1.35, 0, 1.3, 1.05, 2.4, 0, "navy")
  add(0, 1.42, 1.25, 1.16, 0.96, 0.8, 0, "navy")
  add(0, 1.28, -1.3, 1.1, 0.9, 0.9, 0, "navy")
  add(0, 1.55, 1.75, 0.72, 0.72, 0.8, 0, "navy")
  for (num = 0; num < 4; num++) add(0, 0.82 - num * 0.02, 0.9 - num * 0.55, 0.84 - num * 0.05, 0.12, 0.4, 0, "red")
  for (side = -1; side <= 1; side += 2) {
    for (num = 0; num < 3; num++) add(side * 0.64, 1.28 - num * 0.2, 0.6 - num * 0.55, 0.06, 0.42, 0.12, 0, "red")
    add(side * 0.42, 1.95, 0.35, 0.1, 0.34, 0.3, side * 0.2, "red")
    add(side * 0.4, 1.9, -1.1, 0.09, 0.3, 0.26, side * 0.25, "red")
  }
  add(0, 2.05, 2.15, 0.62, 0.62, 0.7, 0, "navy")
  add(0, 2.35, 2.5, 0.52, 0.52, 0.6, 0, "navy")
  add(0, 2.6, 2.8, 0.44, 0.44, 0.5, 0, "navy")
  for (num = 0; num < 3; num++) add(0, 2.32 + num * 0.3, 2.1 + num * 0.34, 0.09, 0.36, 0.18, 0, "red")
  add(0, 2.85, 3.05, 0.56, 0.48, 0.7, 0, "navy", "head")
  add(0, 2.72, 3.6, 0.4, 0.28, 0.75, 0, "red", "head")
  add(0, 2.55, 3.4, 0.36, 0.14, 0.6, 0, "deep", "head")
  add(0, 2.72, 3.98, 0.3, 0.2, 0.3, 0, "red", "head")
  add(0, 2.5, 3.1, 0.08, 0.2, 0.4, 0, "red", "head")
  add(0, 3.15, 2.95, 0.08, 0.3, 0.2, 0, "red", "head")
  for (side = -1; side <= 1; side += 2) {
    add(side * 0.24, 3.06, 3.2, 0.1, 0.12, 0.42, side * 0.3, "red", "head")
    add(side * 0.28, 2.9, 3.3, 0.1, 0.1, 0.12, 0, "glow", "head")
    add(side * 0.26, 3.2, 2.9, 0.11, 0.13, 0.7, side * 0.25, "light", "head")
    add(side * 0.36, 3.35, 2.4, 0.09, 0.11, 0.6, side * 0.6, "red", "head")
    add(side * 0.3, 2.6, 2.9, 0.08, 0.1, 0.5, side * 1.1, "red", "head")
    add(side * 0.75, 1.6, 0.5, 0.45, 0.36, 0.5, 0, "navy", "wing", 0.03)
    add(side * 1.5, 1.75, 0.3, 1.3, 0.24, 0.3, side * 0.14, "navy", "wing", 0.28)
    add(side * 2.3, 1.9, 0.05, 1.1, 0.2, 0.26, side * 0.24, "navy", "wing", 0.48)
    add(side * 1.9, 1.95, 0.5, 1.7, 0.09, 0.13, side * 0.12, "red", "wing", 0.3)
    add(side * 2.85, 2.02, -0.2, 0.1, 0.14, 0.75, side * 0.95, "red", "wing", 0.62)
    add(side * 1.6, 1.72, -0.9, 1.5, 0.05, 1.5, side * 0.16, "navy", "wing", 0.3)
    add(side * 1.6, 1.79, -0.2, 1.5, 0.1, 0.12, side * 0.16, "red", "wing", 0.3)
    for (num = 0; num < 5; num++) {
      var spread = 1.1 + num * 0.46
      var long = 2.7 - Math.abs(num - 2) * 0.3
      var outX = Math.sin(spread) * long * 0.5
      var outZ = Math.cos(spread) * long * 0.5
      add(side * (2.9 + outX), 1.84, 0.02 + outZ, 1.6, 0.05, long, side * spread, "navy", "wing", 0.55 + num * 0.09)
      add(side * (2.9 + outX), 1.9, 0.02 + outZ, 0.1, 0.11, long, side * spread, "red", "wing", 0.55 + num * 0.09)
      if (num === 0 || num === 4) add(side * (2.9 + outX * 2), 1.86, 0.02 + outZ * 2, 0.09, 0.1, 0.9, side * spread, "glow", "wing", 0.95)
    }
    add(side * 2.9, 1.96, 0.02, 0.18, 0.24, 0.28, 0, "red", "wing", 0.52)
    add(side * 3.35, 1.9, -1.3, 0.09, 0.13, 1.35, side * 1.75, "red", "wing", 0.9)
    add(side * 2.55, 1.88, -2.35, 0.09, 0.12, 1.2, side * 2.05, "red", "wing", 0.95)
    add(side * 0.95, 1.98, -1.7, 0.09, 0.13, 1.1, side * 2.3, "red", "wing", 0.55)
    add(side * 0.5, 2.1, 0.9, 0.09, 0.16, 0.9, side * 0.45, "red")
    add(side * 0.62, 0.95, -1.1, 0.5, 0.78, 0.7, side * 0.05, "navy")
    add(side * 0.66, 0.42, -1.2, 0.34, 0.56, 0.46, 0, "deep")
    add(side * 0.66, 0.14, -0.9, 0.5, 0.26, 0.8, 0, "deep")
    add(side * 0.66, 0.86, -1.15, 0.1, 0.3, 0.3, side * -0.3, "red")
    for (num = -1; num <= 1; num++) add(side * 0.66 + num * 0.18, 0.1, -0.46, 0.1, 0.11, 0.36, num * 0.24, "red")
    add(side * 0.58, 0.92, 1.2, 0.42, 0.7, 0.56, side * -0.05, "navy")
    add(side * 0.6, 0.42, 1.25, 0.3, 0.52, 0.4, 0, "deep")
    add(side * 0.6, 0.14, 1.4, 0.44, 0.24, 0.62, 0, "deep")
    add(side * 0.6, 0.82, 1.25, 0.09, 0.26, 0.26, side * 0.3, "red")
    for (num = -1; num <= 1; num++) add(side * 0.6 + num * 0.15, 0.1, 1.68, 0.09, 0.1, 0.3, num * 0.24, "red")
  }
  for (num = 0; num < 8; num++) {
    add(0, 1.16 - num * 0.055, -1.95 - num * 0.42, 0.88 - num * 0.095, 0.78 - num * 0.085, 0.5, 0, num % 2 ? "deep" : "navy", "tail", num + 1)
    if (num < 7) {
      add(0, 1.2 - num * 0.055, -1.95 - num * 0.42, 0.12, 0.3, 0.2, 0, "red", "tail", num + 1)
      add(-0.46 + num * 0.05, 1.2 - num * 0.055, -1.95 - num * 0.42, 0.09, 0.24, 0.6, -1.15, "red", "tail", num + 1)
      add(0.46 - num * 0.05, 1.2 - num * 0.055, -1.95 - num * 0.42, 0.09, 0.24, 0.6, 1.15, "red", "tail", num + 1)
    }
  }
  add(0, 0.78, -5.55, 0.6, 0.06, 1.0, 0, "red", "tail", 8)
  add(0, 0.86, -4.95, 0.34, 0.05, 0.6, 0, "navy", "tail", 8)
  for (num = 0; num < 7; num++) add(0, 1.92 + (num < 2 ? 0.05 : 0), 1.45 - num * 0.42, 0.1, 0.34, 0.24, 0, "red")
  add(0, 2.1, 1.6, 0.08, 0.2, 0.14, 0, "glow")
  return out
})()

function nightBuild(spotX, spotY, spotZ, turn) {
  var cosT = Math.cos(turn)
  var sinT = Math.sin(turn)
  var made = []
  nightPlan.forEach((part) => {
    var ident = api.attemptCreateMeshEntity("Box", { width: part.wide, height: part.tall, depth: part.deep, diffuseColor: [0, 0, 0], emissiveColor: nightCol[part.col], hideDist: 160 })
    if (!ident) return
    api.setPosition(ident, spotX + part.x * cosT + part.z * sinT, spotY + part.y, spotZ - part.x * sinT + part.z * cosT)
    if (part.yaw) api.setEntityRotation(ident, 0, turn + part.yaw, 0)
    made.push(ident)
  })
  return made
}

if (!globalThis.nightIds) globalThis.nightIds = []
if (globalThis.nightIds.length) {
  globalThis.nightIds.forEach((ident) => {
    try {
      api.deleteMeshEntity(ident)
    } catch (err) {}
  })
  globalThis.nightIds.length = 0
} else {
  var face = api.getPlayerFacingInfo(myId).dir
  var flat = Math.hypot(face[0], face[2])
  var dirX = flat > 0.001 ? face[0] / flat : 0
  var dirZ = flat > 0.001 ? face[2] / flat : 1
  globalThis.nightIds = nightBuild(thisPos[0] + 0.5 + dirX * 7, thisPos[1], thisPos[2] + 0.5 + dirZ * 7, Math.atan2(-dirX, -dirZ))
}
