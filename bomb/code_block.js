bombSettings = { scale: 1, lift: 1, turn: 0, hideDist: 150 }
bombColours = {
  olive: [112, 120, 30],
  light: [150, 152, 44],
  shade: [70, 96, 50],
  nose: [38, 60, 48],
  teal: [40, 150, 140],
  gold: [204, 150, 24],
  amber: [226, 122, 20],
  dark: [60, 62, 24],
}
bombRemove = function () {
  var list = globalThis.bombMeshIds || []
  for (var num = 0; num < list.length; num++) {
    try {
      api.deleteMeshEntity(list[num])
    } catch (err) {}
  }
  globalThis.bombMeshIds = null
  return list.length
}
bombBuild = function (place) {
  var scale = bombSettings.scale
  var made = []
  var piece = function (wide, tall, deep, colour, offX, offY, offZ, yaw) {
    var tint = bombColours[colour]
    var ident = api.attemptCreateMeshEntity("Box", {
      width: wide * scale,
      height: tall * scale,
      depth: deep * scale,
      diffuseColor: tint,
      emissiveColor: [tint[0] * 0.4, tint[1] * 0.4, tint[2] * 0.4],
      hideDist: bombSettings.hideDist,
    })
    if (!ident) return
    var angle = yaw + bombSettings.turn
    var sine = Math.sin(bombSettings.turn)
    var cosine = Math.cos(bombSettings.turn)
    api.setPosition(ident, place[0] + (offX * cosine + offZ * sine) * scale, place[1] + offY * scale, place[2] + (offZ * cosine - offX * sine) * scale)
    api.setEntityRotation(ident, 0, angle, 0)
    made.push(ident)
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
if (bombRemove() > 0) api.sendMessage(myId, "Bomb removed.", { color: "orange" })
else {
  globalThis.bombMeshIds = bombBuild([thisPos[0] + 0.5, thisPos[1] + 1 + bombSettings.lift, thisPos[2] + 0.5])
  api.sendMessage(myId, "Bomb built from " + globalThis.bombMeshIds.length + " meshes. Another click removes this.", { color: "lime" })
}
