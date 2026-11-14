var SKIN_CFG = {
  chat: "!skin",
  extras: true,
  front: 1,
  scale: 1,
  hideDist: 64,
}

var SKIN_COL = {
  skin: [190, 166, 226],
  light: [208, 188, 238],
  under: [150, 112, 196],
  spot: [142, 212, 120],
  eye: [96, 230, 96],
  dark: [70, 48, 104],
  slime: [226, 214, 248],
  white: [255, 255, 255],
  violet: [165, 70, 255],
  orange: [255, 125, 30],
  cyan: [40, 195, 255],
  pink: [255, 95, 205],
  blue: [75, 95, 255],
}

var SKINS = {
  goodra: [
    ["HeadMesh", 0.62, 0.6, 0.62, "skin", 0, 0.3, 0],
    ["TorsoNode", 0.62, 0.82, 0.4, "skin", 0, 0, 0],
    ["ArmRightMesh", 0.3, 0.8, 0.3, "light", 0, -0.35, 0],
    ["ArmLeftMesh", 0.3, 0.8, 0.3, "light", 0, -0.35, 0],
    ["LegRightMesh", 0.32, 0.8, 0.32, "skin", 0, -0.35, 0],
    ["LegLeftMesh", 0.32, 0.8, 0.32, "skin", 0, -0.35, 0],

    ["HeadMesh", 0.4, 0.25, 0.12, "skin", 0, 0.16, 0.36, "x"],
    ["HeadMesh", 0.3, 0.03, 0.03, "dark", 0, 0.1, 0.43, "x"],
    ["HeadMesh", 0.17, 0.21, 0.1, "eye", 0.16, 0.4, 0.34, "xmg"],
    ["HeadMesh", 0.06, 0.11, 0.04, "dark", 0.13, 0.39, 0.4, "xm"],
    ["HeadMesh", 0.06, 0.06, 0.04, "white", 0.2, 0.45, 0.4, "xmg"],
    ["HeadMesh", 0.04, 0.14, 0.14, "spot", 0.32, 0.2, 0.1, "xm"],
    ["HeadMesh", 0.1, 0.3, 0.1, "skin", 0.18, 0.72, -0.1, "xm"],
    ["HeadMesh", 0.1, 0.1, 0.4, "skin", 0.18, 0.85, -0.3, "xm"],
    ["HeadMesh", 0.1, 0.5, 0.1, "skin", 0.18, 0.62, -0.52, "xm"],
    ["HeadMesh", 0.13, 0.13, 0.13, "spot", 0.18, 0.34, -0.52, "xm"],
    ["HeadMesh", 0.07, 0.16, 0.07, "skin", 0.1, 0.68, 0.2, "xm"],
    ["TorsoNode", 0.44, 0.62, 0.06, "under", 0, 0, 0.22, "x"],
    ["TorsoNode", 0.42, 0.32, 0.4, "skin", 0, -0.3, -0.38, "x"],
    ["TorsoNode", 0.32, 0.26, 0.4, "skin", 0, -0.42, -0.74, "x"],
    ["TorsoNode", 0.24, 0.2, 0.36, "skin", 0, -0.5, -1.08, "x"],
    ["TorsoNode", 0.2, 0.26, 0.18, "light", 0, -0.36, -1.3, "x"],
    ["TorsoNode", 0.04, 0.14, 0.14, "spot", 0.22, -0.28, -0.4, "xm"],
    ["TorsoNode", 0.04, 0.12, 0.12, "spot", 0.17, -0.4, -0.76, "xm"],
    ["ArmRightMesh", 0.06, 0.2, 0.06, "slime", 0, -0.85, 0.05, "x"],
    ["ArmLeftMesh", 0.06, 0.2, 0.06, "slime", 0, -0.85, 0.05, "x"],
  ],

  dragon: [
    ["HeadMesh", 0.62, 0.6, 0.62, "white", 0, 0.3, 0, "g"],
    ["TorsoNode", 0.62, 0.82, 0.4, "white", 0, 0, 0, "g"],
    ["ArmRightMesh", 0.3, 0.8, 0.3, "blue", 0, -0.35, 0, "g"],
    ["ArmLeftMesh", 0.3, 0.8, 0.3, "blue", 0, -0.35, 0, "g"],
    ["LegRightMesh", 0.32, 0.8, 0.32, "violet", 0, -0.35, 0, "g"],
    ["LegLeftMesh", 0.32, 0.8, 0.32, "violet", 0, -0.35, 0, "g"],

    ["HeadMesh", 0.4, 0.22, 0.3, "white", 0, 0.24, 0.44, "xg"],
    ["HeadMesh", 0.34, 0.07, 0.3, "pink", 0, 0.06, 0.42, "xg"],
    ["HeadMesh", 0.05, 0.1, 0.05, "white", 0.13, 0.11, 0.54, "xmg"],
    ["HeadMesh", 0.14, 0.14, 0.08, "cyan", 0.2, 0.42, 0.3, "xmg"],
    ["HeadMesh", 0.2, 0.07, 0.2, "violet", 0.2, 0.53, 0.26, "xmg"],
    ["HeadMesh", 0.09, 0.09, 0.45, "violet", 0.2, 0.62, -0.35, "xmg"],
    ["HeadMesh", 0.08, 0.22, 0.08, "violet", 0.2, 0.75, -0.45, "xmg"],
    ["HeadMesh", 0.1, 0.18, 0.4, "orange", 0, 0.68, -0.05, "xg"],
    ["HeadMesh", 0.05, 0.05, 0.45, "cyan", 0.3, 0.2, 0.25, "xmg"],
    ["HeadMesh", 0.06, 0.25, 0.3, "blue", 0.34, 0.25, -0.2, "xmg"],
    ["TorsoNode", 0.44, 0.62, 0.06, "cyan", 0, 0, 0.22, "xg"],
    ["TorsoNode", 0.08, 0.2, 0.22, "orange", 0, 0.25, -0.28, "xg"],
    ["TorsoNode", 0.08, 0.2, 0.22, "violet", 0, 0, -0.28, "xg"],
    ["TorsoNode", 0.08, 0.2, 0.22, "pink", 0, -0.25, -0.28, "xg"],
    ["TorsoNode", 0.42, 0.04, 0.26, "blue", 0.5, 0.22, -0.12, "xmg"],
    ["TorsoNode", 0.38, 0.3, 0.4, "white", 0, -0.3, -0.38, "xg"],
    ["TorsoNode", 0.28, 0.24, 0.4, "pink", 0, -0.36, -0.76, "xg"],
    ["TorsoNode", 0.2, 0.18, 0.4, "white", 0, -0.4, -1.12, "xg"],
    ["TorsoNode", 0.4, 0.05, 0.3, "blue", 0, -0.4, -1.42, "xg"],
    ["ArmRightMesh", 0.34, 0.1, 0.34, "orange", 0, -0.2, 0, "xg"],
    ["ArmLeftMesh", 0.34, 0.1, 0.34, "orange", 0, -0.2, 0, "xg"],
    ["LegRightMesh", 0.36, 0.1, 0.36, "pink", 0, -0.2, 0, "xg"],
    ["LegLeftMesh", 0.36, 0.1, 0.36, "pink", 0, -0.2, 0, "xg"],
  ],
}

var SKIN_NODES = ["TorsoNode", "HeadMesh", "ArmRightMesh", "ArmLeftMesh", "LegLeftMesh", "LegRightMesh"]

function skinParts(name) {
  var base = []
  var extra = []
  SKINS[name].forEach((r) => {
    var flags = r[8] || ""
    var list = flags.indexOf("x") >= 0 ? extra : base
    list.push(r)
    if (flags.indexOf("m") >= 0) {
      var left = r.slice()
      left[5] = -r[5]
      list.push(left)
    }
  })
  return (SKIN_CFG.extras ? extra : []).concat(base)
}

function skinOff(playerId) {
  SKIN_NODES.forEach((node) => api.updateEntityNodeMeshAttachment(playerId, node, null))
}

function skinWear(playerId, name) {
  if (!SKINS[name]) return false
  skinOff(playerId)
  var k = SKIN_CFG.scale
  skinParts(name).forEach((r) => {
    var col = SKIN_COL[r[4]]
    var glow = (r[8] || "").indexOf("g") >= 0
    api.updateEntityNodeMeshAttachment(
      playerId,
      r[0],
      "Box",
      {
        width: r[1] * k,
        height: r[2] * k,
        depth: r[3] * k,
        diffuseColor: glow ? [0, 0, 0] : col,
        emissiveColor: glow ? col : col.map((v) => Math.round(v * 0.35)),
        hideDist: SKIN_CFG.hideDist,
      },
      [r[5] * k, r[6] * k, r[7] * k * SKIN_CFG.front],
      [0, 0, 0]
    )
  })
  return true
}

function skinChat(playerId, message) {
  var words = message.trim().toLowerCase().split(/\s+/)
  if (!SKIN_CFG.chat || words[0] !== SKIN_CFG.chat) return true
  if (words[1] === "off") skinOff(playerId)
  else if (!skinWear(playerId, words[1])) api.sendMessage(playerId, "Skins: " + Object.keys(SKINS).join(", ") + ". Type " + SKIN_CFG.chat + " and a name, or " + SKIN_CFG.chat + " off.", { color: "orange" })
  return false
}

globalThis.skinWear = skinWear
globalThis.skinOff = skinOff

var skinOldChat = typeof onPlayerChat === "function" ? onPlayerChat : null
onPlayerChat = (playerId, message) => {
  if (skinChat(playerId, message) === false) return false
  if (skinOldChat) return skinOldChat(playerId, message)
}
