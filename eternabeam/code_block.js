var eternaCol = { navy: [34, 34, 96], deep: [20, 20, 62], light: [66, 70, 150], red: [222, 42, 62], blood: [132, 22, 38], glow: [255, 120, 132] }
var eternaPlan = (function () {
  var out = []
  var add = function (x, y, z, wide, tall, deep, yaw, col, tag, idx) { out.push({ x: x, y: y, z: z, wide: wide, tall: tall, deep: deep, yaw: yaw || 0, col: col, tag: tag || "", idx: idx || 0 }) }
  var side = 0
  var num = 0
  add(0, 2.0, 0.5, 0.3, 0.26, 2.4, 0, "navy")
  add(0, 2.06, 0.5, 0.18, 0.16, 2.5, 0, "light")
  add(0, 1.5, 0.5, 0.62, 0.62, 0.62, 0, "glow")
  add(0, 1.5, 0.5, 0.82, 0.82, 0.2, 0, "red")
  add(0, 1.5, 0.5, 0.2, 0.82, 0.82, 0, "red")
  add(0, 1.1, 0.5, 0.42, 0.14, 2.0, 0, "blood")
  for (num = 0; num < 5; num++) {
    for (side = -1; side <= 1; side += 2) {
      add(side * 0.56, 1.78, 1.35 - num * 0.45, 0.09, 0.62, 0.12, side * 0.7, "red")
      add(side * 0.5, 1.3, 1.37 - num * 0.45, 0.09, 0.52, 0.11, side * 0.4, "red")
    }
    add(0, 2.24, 1.4 - num * 0.42, 0.08, 0.32, 0.18, 0, "red")
  }
  for (num = 0; num < 6; num++) {
    add(0, 2.12 + num * 0.11, 1.75 + num * 0.3, 0.26 - num * 0.015, 0.26 - num * 0.015, 0.34, 0, num % 2 ? "deep" : "navy")
    add(0, 2.04 + num * 0.11, 1.6 + num * 0.3, 0.3, 0.3, 0.1, 0, "red")
  }
  add(0, 2.8, 3.35, 0.4, 0.34, 0.6, 0, "navy", "head")
  add(0, 2.72, 3.85, 0.3, 0.2, 0.5, 0, "navy", "head")
  add(0, 2.56, 3.8, 0.24, 0.14, 0.44, 0, "glow", "head")
  add(0, 2.44, 3.7, 0.26, 0.12, 0.5, 0, "blood", "head")
  add(0, 3.0, 3.0, 0.09, 0.26, 0.4, 0, "red", "head")
  for (side = -1; side <= 1; side += 2) {
    add(side * 0.2, 2.86, 3.5, 0.08, 0.1, 0.14, 0, "glow", "head")
    for (num = 0; num < 3; num++) add(side * (0.2 + num * 0.05), 2.96 - num * 0.1, 3.1 - num * 0.24, 0.08, 0.11, 0.55, side * (0.5 + num * 0.45), "red", "head")
    add(side * 0.18, 3.05, 2.95, 0.08, 0.1, 1.0, side * 0.2, "navy", "head")
    add(side * 0.3, 3.1, 2.3, 0.07, 0.09, 0.7, side * 0.55, "red", "head")
    add(side * 0.62, 2.02, 0.7, 0.16, 0.2, 0.9, side * 1.0, "navy", "wing", 0.12)
    add(side * 1.55, 2.1, 0.32, 0.13, 0.18, 1.6, side * 1.3, "navy", "wing", 0.3)
    add(side * 2.6, 2.16, 0.0, 0.11, 0.16, 1.5, side * 1.45, "navy", "wing", 0.5)
    add(side * 1.8, 2.02, -0.5, 1.5, 0.06, 1.4, side * 0.25, "blood", "wing", 0.3)
    add(side * 3.2, 2.2, -0.1, 0.26, 0.3, 0.3, 0, "red", "wing", 0.56)
    for (num = 0; num < 4; num++) {
      var spread = 1.3 + num * 0.42
      var long = 2.6 - Math.abs(num - 1.5) * 0.4
      var outX = Math.sin(spread) * long * 0.5
      var outZ = Math.cos(spread) * long * 0.5
      add(side * (3.2 + outX), 2.18, -0.1 + outZ, 1.15, 0.05, long, side * spread, "blood", "wing", 0.65 + num * 0.08)
      add(side * (3.2 + outX), 2.28, -0.1 + outZ, 0.09, 0.13, long, side * spread, "navy", "wing", 0.65 + num * 0.08)
      add(side * (3.2 + outX * 1.8), 2.24, -0.1 + outZ * 1.8, 0.07, 0.1, 0.62, side * spread, "red", "wing", 0.95)
    }
  }
  for (num = 0; num < 11; num++) {
    add(0, 1.9 + num * 0.16, -0.75 - num * 0.45, 0.36 - num * 0.02, 0.36 - num * 0.02, 0.48, 0, num % 2 ? "deep" : "navy", "tail", num + 1)
    add(0, 1.9 + num * 0.16, -0.98 - num * 0.45, 0.3 - num * 0.015, 0.3 - num * 0.015, 0.08, 0, "red", "tail", num + 1)
    if (num % 2 === 1) {
      for (side = -1; side <= 1; side += 2) add(side * (0.22 - num * 0.012), 1.95 + num * 0.16, -0.75 - num * 0.45, 0.07, 0.3, 0.55, side * 1.15, "red", "tail", num + 1)
    }
  }
  add(0, 3.6, -5.6, 0.12, 0.14, 0.9, 0, "red", "tail", 11)
  add(0, 3.35, -5.1, 0.22, 0.06, 0.6, 0, "navy", "tail", 11)
  return out
})()
function eternaBuild(spotX, spotY, spotZ, turn) {
  var cosT = Math.cos(turn)
  var sinT = Math.sin(turn)
  var made = []
  eternaPlan.forEach((part) => {
    var ident = api.attemptCreateMeshEntity("Box", { width: part.wide, height: part.tall, depth: part.deep, diffuseColor: [0, 0, 0], emissiveColor: eternaCol[part.col], hideDist: 160 })
    if (!ident) return
    api.setPosition(ident, spotX + part.x * cosT + part.z * sinT, spotY + part.y, spotZ - part.x * sinT + part.z * cosT)
    if (part.yaw) api.setEntityRotation(ident, 0, turn + part.yaw, 0)
    made.push(ident)
  })
  return made
}

if (!globalThis.eternaIds) globalThis.eternaIds = []
if (globalThis.eternaIds.length) {
  globalThis.eternaIds.forEach((ident) => {
    try {
      api.deleteMeshEntity(ident)
    } catch (err) {}
  })
  globalThis.eternaIds.length = 0
} else {
  var face = api.getPlayerFacingInfo(myId).dir
  var flat = Math.hypot(face[0], face[2])
  var dirX = flat > 0.001 ? face[0] / flat : 0
  var dirZ = flat > 0.001 ? face[2] / flat : 1
  globalThis.eternaIds = eternaBuild(thisPos[0] + 0.5 + dirX * 7, thisPos[1], thisPos[2] + 0.5 + dirZ * 7, Math.atan2(-dirX, -dirZ))
}
