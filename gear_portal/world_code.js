var GATE_CFG = { chat: "!portal", travel: 6, aimTime: 3, aimLimit: 3, aimCancels: false, slashRadius: 3, damage: 25, knockback: 8, hitPlayers: true, animate: true, flip: 1, nodeMeshes: true, hidePlayer: true, shrink: true, slashWay: -1, slashPieces: 18, slashGap: 26, slashJitter: 1, slashMs: 2100, slashShare: 0.19, holdPlayer: true, clickFires: true, groundArrow: true, size: 1, hideDist: 100, maxCasts: 6, maxMeshes: 380, }
var GATE_COL = { gold: [255, 205, 80], brass: [190, 130, 45], dark: [70, 45, 15], deep: [8, 70, 52], jade: [70, 235, 165], mint: [190, 255, 225], white: [255, 255, 255], steam: [215, 215, 205], }
var GATE_STEP = { sink: 6, open: 6, spin: 8, settle: 4, close: 8 }
var GATE_NODES = ["TorsoNode", "HeadMesh", "ArmRightMesh", "ArmLeftMesh", "LegLeftMesh", "LegRightMesh"]
var GATE_POSE = { rest: {}, ready: { TorsoNode: [8, 0, 0], ArmRightMesh: [-80, 0, 0], ArmLeftMesh: [20, 0, 10], LegRightMesh: [-12, 0, 0], LegLeftMesh: [12, 0, 0] }, crouch: { TorsoNode: [28, 0, 0], HeadMesh: [20, 0, 0], ArmRightMesh: [45, 0, -15], ArmLeftMesh: [45, 0, 15], LegRightMesh: [-40, 0, 0], LegLeftMesh: [40, 0, 0] }, leap: { TorsoNode: [-12, 0, 0], HeadMesh: [-25, 0, 0], ArmRightMesh: [-175, 0, -10], ArmLeftMesh: [-175, 0, 10], LegRightMesh: [8, 0, 0], LegLeftMesh: [-8, 0, 0] }, tuck: { TorsoNode: [20, 0, 0], HeadMesh: [15, 0, 0], ArmRightMesh: [-175, 0, 20], ArmLeftMesh: [-175, 0, -20], LegRightMesh: [-30, 0, 0], LegLeftMesh: [-30, 0, 0] }, }
var GATE_SLASH = { HeadMesh: [[-0.2793, 0, 0], [-0.2793, 0, 0]], TorsoNode: [[0.2793, 0, 0], [0.2926, 0, 0]], ArmLeftMesh: [[-1.2217, 0, -0.4363], [-1.5708, 0, 1.9024]], ArmRightMesh: [[-1.0821, 0, 0.3665], [-1.5708, 0, -2.0944]], LegLeftMesh: [[0.5411, 0, 0], [0.5411, 0, 0]], LegRightMesh: [[-0.6632, 0, 0], [-0.6632, 0, 0]], }
var GATE_TURNS = ["TorsoNode", "LegLeftMesh", "LegRightMesh"]
var GATE_WORN = [ ["ArmRightMesh", 0.08, 1.2, 0.24, "jade", [0, -1, 0]], ["ArmLeftMesh", 0.06, 1.0, 0.2, "jade", [0, -0.9, 0]], ]
var gateList = []
var gateMeshes = 0
var gatePlan = (function () { var out = []
var third = 1 / Math.sqrt(3)
var full = Math.PI * 2
var add = function (radius, angle, wide, tall, deep, lift, col, spin, offX, offZ) { out.push({ radius: radius, angle: angle, wide: wide, tall: tall, deep: deep, lift: lift, col: col, spin: spin || 0, offX: offX || 0, offZ: offZ || 0 }) }
for (var turn = 0; turn < 3; turn++) add(0, (turn * Math.PI) / 3, 2.7, 0.03, 2.7 * third, 0.04, "deep")
for (var turn = 0; turn < 3; turn++) add(0, (turn * Math.PI) / 3, 1.0, 0.03, 1.0 * third, 0.06, "jade")
for (var idx = 0; idx < 12; idx++) add(0.8, (idx / 12) * full, 0.45, 0.04, 0.07, 0.075, "brass")
for (var turn = 0; turn < 3; turn++) add(0, (turn * Math.PI) / 3, 0.09, 0.04, 1.56, 0.085, "brass", -0.07)
for (var idx = 0; idx < 12; idx++) { var main = idx % 3 === 0
add(main ? 1.1 : 1.14, (idx / 12) * full, main ? 0.13 : 0.07, 0.04, main ? 0.32 : 0.2, 0.09, main ? "gold" : "mint") }
for (var idx = 0; idx < 16; idx++) add(1.4, (idx / 16) * full, 0.6, 0.1, 0.16, 0.06, "gold")
for (var idx = 0; idx < 12; idx++) add(1.58, (idx / 12) * full, 0.3, 0.1, 0.24, 0.06, idx % 2 ? "gold" : "brass", 0.05)
add(0.3, 0, 0.13, 0.04, 0.6, 0.11, "brass", -0.04)
add(0.52, 0, 0.07, 0.04, 1.04, 0.13, "white", 0.32)
add(0, 0, 0.26, 0.08, 0.26, 0.13, "gold", 0.32)
add(0, Math.PI / 4, 0.16, 0.1, 0.16, 0.14, "dark", 0.32)
for (var gear = 0; gear < 3; gear++) { var where = (gear / 3) * full + 0.7
var gearX = Math.sin(where) * 1.92
var gearZ = Math.cos(where) * 1.92
for (var turn = 0; turn < 3; turn++) add(0, (turn * Math.PI) / 3, 0.13, 0.08, 0.72, 0.06, gear === 1 ? "gold" : "brass", gear % 2 ? 0.22 : -0.22, gearX, gearZ)
for (var turn = 0; turn < 3; turn++) add(0, (turn * Math.PI) / 3, 0.44, 0.07, 0.44 * third, 0.065, "dark", 0, gearX, gearZ)
add(0, 0, 0.14, 0.1, 0.14, 0.08, "jade", 0, gearX, gearZ) }
return out })()
function gateRad(deg) { return (deg * Math.PI) / 180 }
function gateEmit(low, high, look) { api.playParticleEffect({ dir1: look.dir1 || [-1, -1, -1], dir2: look.dir2 || [1, 1, 1], pos1: low, pos2: high, texture: look.texture || "glint", minLifeTime: look.life, maxLifeTime: look.life * 1.6, minEmitPower: look.power || 0, maxEmitPower: (look.power || 0) * 2, minSize: look.size, maxSize: look.size * 1.5, manualEmitCount: look.count || 1, gravity: look.gravity || [0, 0, 0], colorGradients: [ { timeFraction: 0, minColor: GATE_COL[look.first].concat(1), maxColor: GATE_COL[look.first].concat(1) }, { timeFraction: 1, minColor: GATE_COL[look.last].concat(0), maxColor: GATE_COL[look.last].concat(0) }, ], velocityGradients: [ { timeFraction: 0, factor: 1, factor2: 1 }, { timeFraction: 1, factor: 0.2, factor2: 0.2 }, ], blendMode: 1, hideDist: GATE_CFG.hideDist, }) }
function gateCloud(mid, halfWide, halfTall, look) { gateEmit([mid[0] - halfWide, mid[1] - halfTall, mid[2] - halfWide], [mid[0] + halfWide, mid[1] + halfTall, mid[2] + halfWide], look) }
function gateBox(cast, wide, tall, deep, col) { if (gateMeshes >= GATE_CFG.maxMeshes) return null
var scale = GATE_CFG.size
var ident = api.attemptCreateMeshEntity("Box", { width: wide * scale, height: tall * scale, depth: deep * scale, diffuseColor: [0, 0, 0], emissiveColor: GATE_COL[col], hideDist: GATE_CFG.hideDist })
if (!ident) return null
gateMeshes++
cast.made.push(ident)
return ident }
function gatePut(ident, spotX, spotY, spotZ, yaw, turned) { api.setPosition(ident, spotX, spotY, spotZ)
if (turned) api.setEntityRotation(ident, 0, yaw, 0) }
function gateDrop(cast, list) { list.forEach((ident) => { try { api.deleteMeshEntity(ident) } catch (err) {}
gateMeshes--
var slot = cast.made.indexOf(ident)
if (slot >= 0) cast.made.splice(slot, 1) })
list.length = 0 }
function gatePiece(cast, part, moment, first) { var scale = GATE_CFG.size
var angle = part.piece.angle + part.piece.spin * moment
var reach = part.piece.radius * scale
gatePut(part.ident, part.mid[0] + part.piece.offX * scale + Math.sin(angle) * reach, part.mid[1] + part.piece.lift, part.mid[2] + part.piece.offZ * scale + Math.cos(angle) * reach, angle, first || part.piece.spin !== 0) }
function gateSchema(cast, from, upto, ticks, yawFrom, yawUpto) { var nodes = {}
GATE_NODES.forEach((node) => { var first = (from[node] || [0, 0, 0]).slice()
var last = (upto[node] || [0, 0, 0]).slice()
if (GATE_TURNS.indexOf(node) >= 0) { first[1] += yawFrom || 0
last[1] += yawUpto || 0 }
if (!first.concat(last).some((value) => value)) return
var turn = (rot) => [gateRad(rot[0] * GATE_CFG.flip), gateRad(rot[1]), gateRad(rot[2])]
nodes[node] = { timeline: [{ timeFraction: 0, rotation: turn(first) }, { timeFraction: 1, rotation: turn(last) }] } })
return { animationDurationMs: ticks * 50, loop: false, nodeAnimations: nodes } }
function gateAnimate(cast, from, upto, ticks, yawFrom, yawUpto) { if (!GATE_CFG.animate) return
try { if (!from) return api.animateEntity(cast.owner, null, 0, 1)
api.animateEntity(cast.owner, gateSchema(cast, from, upto, ticks, yawFrom, yawUpto), 0, 1) } catch (err) { GATE_CFG.animate = false
try { api.sendMessage(cast.owner, "Portal animation stopped: " + err, { color: "orange" }) } catch (other) {} } }
function gateSlashMove(cast) { if (!GATE_CFG.animate) return
var nodes = {}
GATE_NODES.forEach((node) => { var keys = GATE_SLASH[node]
if (!keys) return
var turn = (rot) => [rot[0] * GATE_CFG.flip, rot[1], rot[2]]
nodes[node] = { timeline: [{ timeFraction: 0, rotation: turn(keys[0]) }, { timeFraction: GATE_CFG.slashShare, rotation: turn(keys[1]) }] } })
try { api.animateEntity(cast.owner, { animationDurationMs: GATE_CFG.slashMs, loop: false, nodeAnimations: nodes }, 0, 1) } catch (err) { GATE_CFG.animate = false } }
function gateSlashEnd(cast) { var out = {}
GATE_NODES.forEach((node) => { var keys = GATE_SLASH[node]
if (!keys) return
out[node] = [(keys[1][0] * 180) / Math.PI / GATE_CFG.flip, (keys[1][1] * 180) / Math.PI, (keys[1][2] * 180) / Math.PI] })
return out }
function gateWear(cast, worn) { if (!GATE_CFG.nodeMeshes || !worn === !cast.worn) return
cast.worn = worn
try { GATE_WORN.forEach((row) => { if (!worn) return api.updateEntityNodeMeshAttachment(cast.owner, row[0], null)
api.updateEntityNodeMeshAttachment(cast.owner, row[0], "Box", { width: row[1], height: row[2], depth: row[3], diffuseColor: [0, 0, 0], emissiveColor: GATE_COL[row[4]], hideDist: GATE_CFG.hideDist }, row[5], [0, 0, 0]) }) } catch (err) { GATE_CFG.nodeMeshes = false } }
function gateSize(cast, amount) { if (!GATE_CFG.shrink) return
try { api.setLifeformScale(cast.owner, amount)
cast.small = amount !== 1 } catch (err) { GATE_CFG.shrink = false } }
function gateHold(cast, held) { if (!held === !cast.held) return
cast.held = held
try { if (GATE_CFG.hidePlayer) api.setPlayerOpacity(cast.owner, held ? 0 : 1) } catch (err) {}
try { if (GATE_CFG.holdPlayer) { if (held) api.setClientOptions(cast.owner, { speedMultiplier: 0, jumpAmount: 0, invincible: true })
else { api.setClientOptionToDefault(cast.owner, "speedMultiplier")
api.setClientOptionToDefault(cast.owner, "jumpAmount")
api.setClientOptionToDefault(cast.owner, "invincible") } } } catch (err) {}
try { if (GATE_CFG.groundArrow && !held) api.setClientOptions(cast.owner, { groundArrowPath: null }) } catch (err) {} }
function gateClear(where) { try { return !api.getBlockSolidity(Math.floor(where[0]), Math.floor(where[1] + 0.2), Math.floor(where[2])) && !api.getBlockSolidity(Math.floor(where[0]), Math.floor(where[1] + 1.2), Math.floor(where[2])) } catch (err) { return true } }
function gateReach(from, face, far) { var best = [from[0], from[1], from[2]]
var steps = Math.max(1, Math.ceil(far * 2))
for (var num = 1; num <= steps; num++) { var spot = [from[0] + (face[0] * far * num) / steps, from[1], from[2] + (face[1] * far * num) / steps]
if (!gateClear(spot)) break
best = spot }
return best }
function gateFacing(playerId, fallback) { var seen = api.getPlayerFacingInfo(playerId).dir
var flat = Math.hypot(seen[0], seen[2])
return flat > 0.001 ? [seen[0] / flat, seen[2] / flat] : fallback }
function gateArrow(cast, moment) { var scale = GATE_CFG.size
var angle = Math.atan2(cast.aim[0], cast.aim[1])
for (var num = 0; num < 3; num++) { var far = (1.95 + num * 0.5 + ((moment % 10) / 10) * 0.5) * scale
var tipX = cast.centre[0] + cast.aim[0] * far
var tipZ = cast.centre[2] + cast.aim[1] * far
for (var side = 0; side < 2; side++) { var back = angle + Math.PI + (side ? 0.6 : -0.6)
var slot = num * 2 + side
if (!cast.arrow[slot]) cast.arrow[slot] = gateBox(cast, 0.08, 0.04, 0.5, num === 2 ? "mint" : "jade")
if (cast.arrow[slot]) gatePut(cast.arrow[slot], tipX + Math.sin(back) * 0.25 * scale, cast.centre[1] + 0.07, tipZ + Math.cos(back) * 0.25 * scale, back, true) } }
if (GATE_CFG.groundArrow && moment % 4 === 0) { try { api.setClientOptions(cast.owner, { groundArrowPath: { target: [cast.out[0], cast.out[1], cast.out[2]], colour: "#46eba5" } }) } catch (err) { GATE_CFG.groundArrow = false } } }
function gateHarm(cast) { var ids = api.getMobIds().concat(GATE_CFG.hitPlayers ? api.getPlayerIds() : [])
var reach = GATE_CFG.slashRadius * GATE_CFG.size
for (var idx = 0; idx < ids.length; idx++) { var ident = ids[idx]
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
gateCloud([where[0], where[1] + 1, where[2]], 0.3, 0.4, { life: 0.3, size: 0.2, count: 10, power: 3, first: "white", last: "jade" }) } }
function gateWobble(seed) { var raw = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
return raw - Math.floor(raw) }
function gateSlashPlan(cast) { var count = GATE_CFG.slashPieces
var way = GATE_CFG.slashWay < 0 ? -1 : 1
var front = gateFacing(cast.owner, cast.aim)
var start = Math.atan2(front[0], front[1])
var half = Math.PI - (GATE_CFG.slashGap * Math.PI) / 360
var sides = Math.max(2, Math.round(count / 2))
var plan = []
for (var side = 0; side < 2; side++) { for (var num = 0; num < sides; num++) { if (side && !num) continue
var share = sides > 1 ? num / (sides - 1) : 0
if (GATE_CFG.slashJitter && num && num < sides - 1) share = Math.min(0.97, Math.max(0.03, share + (gateWobble(side * 13 + num + 3) - 0.5) * 0.08))
var loose = GATE_CFG.slashJitter ? gateWobble(side * 29 + num + 41) : 0.5
plan.push({ share: share, side: side, born: Math.min(5, Math.floor(share * 6)), reach: GATE_CFG.slashRadius * 0.86 + (loose - 0.5) * 0.14, rise: 0.95 + (GATE_CFG.slashJitter ? (gateWobble(side * 31 + num + 17) - 0.5) * 0.18 : 0), deep: 0.55 + (GATE_CFG.slashJitter ? (gateWobble(side * 37 + num + 71) - 0.5) * 0.1 : 0), gone: 3 + Math.round((GATE_CFG.slashJitter ? gateWobble(side * 43 + num + 61) : 0.5) * 2), angle: start + way * (side ? 1 : -1) * share * half, }) } }
plan.forEach((piece) => { var near = Math.PI * 2
plan.forEach((other) => { if (other === piece) return
var apart = Math.abs(Math.atan2(Math.sin(other.angle - piece.angle), Math.cos(other.angle - piece.angle)))
if (apart < near) near = apart })
piece.step = Math.max(0.05, near) })
return plan }
function gateSlash(cast, age) { var scale = GATE_CFG.size
var way = GATE_CFG.slashWay < 0 ? -1 : 1
if (!cast.slashPlan) cast.slashPlan = gateSlashPlan(cast)
cast.slashPlan.forEach((piece) => { if (piece.born !== age) return
var reach = piece.reach * scale
var tall = cast.out[1] + piece.rise * scale
var long = 2 * reach * Math.tan(piece.step / 2) * 1.12
var outer = gateBox(cast, long / scale, 0.06, piece.deep, "jade")
var inner = gateBox(cast, (long * 0.9) / scale, 0.09, 0.16, "mint")
if (outer) gatePut(outer, cast.out[0] + Math.sin(piece.angle) * reach, tall, cast.out[2] + Math.cos(piece.angle) * reach, piece.angle, true)
if (inner) gatePut(inner, cast.out[0] + Math.sin(piece.angle) * (reach + 0.3 * scale), tall, (cast.out[2] + Math.cos(piece.angle) * (reach + 0.3 * scale)), piece.angle, true)
cast.slash.push({ gone: age + piece.gone, ids: [outer, inner].filter((made) => made) })
if (piece.share < 0.98) { gateCloud([cast.out[0] + Math.sin(piece.angle) * reach, tall, cast.out[2] + Math.cos(piece.angle) * reach], 0.3, 0.1, { life: 0.3, size: 0.14, count: 8, power: 4, dir1: [way * Math.cos(piece.angle) - 0.3, -0.1, -way * Math.sin(piece.angle) - 0.3], dir2: [way * Math.cos(piece.angle) + 0.3, 0.3, -way * Math.sin(piece.angle) + 0.3], first: "white", last: "jade" }) } })
for (var idx = cast.slash.length - 1; idx >= 0; idx--) { if (cast.slash[idx].gone <= age) { gateDrop(cast, cast.slash[idx].ids)
cast.slash.splice(idx, 1) } } }
function gateRun(cast, gate, moment) { var scale = GATE_CFG.size
var mid = gate.mid
if (gate.shut) { if (!gate.parts.length) return
var take = Math.ceil(gatePlan.length / GATE_STEP.close)
var gone = gate.parts.splice(Math.max(0, gate.parts.length - take), take)
gateDrop(cast, gone.map((part) => part.ident))
if (!gate.parts.length) gateCloud([mid[0], mid[1] + 0.2, mid[2]], 0.4, 0.1, { life: 0.4, size: 0.14, count: 14, power: 2, first: "jade", last: "gold" })
return }
for (var num = 0; num < gate.each && gate.next < gatePlan.length; num++) { var piece = gatePlan[gate.next++]
var ident = gateBox(cast, piece.wide, piece.tall, piece.deep, piece.col)
if (!ident) continue
var part = { ident: ident, piece: piece, mid: mid }
gate.parts.push(part)
gatePiece(cast, part, moment, true) }
gate.parts.forEach((part) => { if (part.piece.spin) gatePiece(cast, part, moment, false) })
if (moment % 2 === 0) gateCloud([mid[0], mid[1] + 0.3, mid[2]], 1.1 * scale, 0.2, { life: 0.6, size: 0.1, count: 3, power: 0.8, dir1: [-0.2, 1, -0.2], dir2: [0.2, 1.5, 0.2], first: "mint", last: "jade" })
if (moment % 5 === 0) gateCloud([mid[0], mid[1] + 0.2, mid[2]], 1.5 * scale, 0.1, { life: 0.5, size: 0.16, count: 2, power: 0.3, first: "white", last: "gold" })
if (moment % 7 === 0) gateCloud([mid[0] + Math.sin(moment) * 1.5 * scale, mid[1] + 0.2, mid[2] + Math.cos(moment) * 1.5 * scale], 0.1, 0.1, { texture: "square_particle", life: 0.8, size: 0.3, count: 3, power: 0.6, dir1: [-0.2, 1, -0.2], dir2: [0.2, 1.4, 0.2], first: "steam", last: "steam" }) }
function gateStep(cast) { var moment = cast.moment
var scale = GATE_CFG.size
if (cast.phase === "aim") { var here = api.getPosition(cast.owner)
cast.centre = [here[0], here[1], here[2]]
cast.aim = gateFacing(cast.owner, cast.aim)
cast.out = gateReach(cast.centre, cast.aim, Math.min(15, GATE_CFG.travel))
gateArrow(cast, moment)
if (moment === 0) gateAnimate(cast, GATE_POSE.rest, GATE_POSE.ready, 4)
else if (moment % 20 === 4) gateAnimate(cast, GATE_POSE.ready, GATE_POSE.ready, 20)
if (moment % 3 === 0) gateCloud([cast.out[0], cast.out[1] + 0.15, cast.out[2]], 0.7 * scale, 0.05, { life: 0.3, size: 0.12, count: 6, power: 0.3, dir1: [-0.2, 1, -0.2], dir2: [0.2, 1.5, 0.2], first: "mint", last: "jade" })
var aimTicks = Math.round(Math.min(GATE_CFG.aimTime, GATE_CFG.aimLimit) * 20)
if (moment < aimTicks && !cast.wantOut) return false
if (GATE_CFG.aimCancels && !cast.wantOut) { gateDrop(cast, cast.arrow.filter((made) => made))
cast.arrow.length = 0
return true }
cast.phase = "sink"
cast.fired = moment
cast.gates.push({ mid: cast.centre, parts: [], next: 0, each: Math.ceil(gatePlan.length / GATE_STEP.open), shut: false })
gateWear(cast, true)
gateAnimate(cast, GATE_POSE.ready, GATE_POSE.crouch, 2) }
var mid = cast.centre
var since = moment - cast.fired
if (cast.phase === "sink" && since === 2) gateAnimate(cast, GATE_POSE.crouch, GATE_POSE.leap, 2)
if (cast.phase === "sink" && since === 4) gateAnimate(cast, GATE_POSE.leap, GATE_POSE.tuck, 2, 0, 180)
if (cast.phase === "sink" && since >= 2) gateSize(cast, 1 - 0.16 * (since - 1))
cast.gates.forEach((gate) => gateRun(cast, gate, moment))
if (cast.phase === "sink") { var high = 1.8 * (1 - (since + 1) / GATE_STEP.sink)
gateCloud([mid[0], mid[1] + high * 0.5 + 0.1, mid[2]], 0.3, high * 0.5 + 0.1, { life: 0.35, size: 0.14, count: 8, power: 1.2, dir1: [-0.3, -1.5, -0.3], dir2: [0.3, -0.8, 0.3], first: "mint", last: "gold" })
if (GATE_CFG.holdPlayer) api.setPosition(cast.owner, mid[0], mid[1], mid[2])
if (GATE_CFG.hidePlayer && since === GATE_STEP.sink - 3) { try { api.setPlayerOpacity(cast.owner, 0.5) } catch (err) {} }
if (since >= GATE_STEP.sink - 1) { cast.phase = "inside"
gateWear(cast, false)
gateAnimate(cast, null)
gateHold(cast, true)
gateCloud([mid[0], mid[1] + 0.4, mid[2]], 0.6, 0.3, { life: 0.4, size: 0.2, count: 20, power: 3, first: "white", last: "jade" }) }
return false }
if (cast.phase === "inside") { cast.phase = "leave"
cast.left = moment
gateDrop(cast, cast.arrow.filter((made) => made))
cast.arrow.length = 0
gateHold(cast, false)
api.setPosition(cast.owner, cast.out[0], cast.out[1], cast.out[2])
cast.gates[0].shut = true
var second = { mid: cast.out, parts: [], next: 0, each: Math.ceil(gatePlan.length / 2), shut: false }
cast.gates.push(second)
gateRun(cast, second, moment)
gateWear(cast, true)
gateSlashMove(cast)
gateSize(cast, 0.6)
gateCloud([cast.out[0], cast.out[1] + 0.2, cast.out[2]], 1, 0.1, { life: 0.4, size: 0.2, count: 30, power: 3, dir1: [-1, 0.2, -1], dir2: [1, 1.5, 1], first: "white", last: "jade" })
gateCloud([cast.out[0], cast.out[1] + 0.2, cast.out[2]], 0.8, 0.1, { life: 0.5, size: 0.16, count: 16, power: 2, dir1: [-1, 0.5, -1], dir2: [1, 2, 1], first: "white", last: "gold" })
gateCloud([cast.out[0], cast.out[1] + 0.9, cast.out[2]], 0.3, 0.9, { life: 0.4, size: 0.14, count: 14, power: 1.5, dir1: [-0.3, 0.8, -0.3], dir2: [0.3, 1.6, 0.3], first: "mint", last: "gold" })
return false }
var age = moment - cast.left
if (age === 1) gateSize(cast, 0.85)
if (age === 2) gateSize(cast, 1)
if (age >= 1 && age <= GATE_STEP.spin) gateHarm(cast)
if (age >= 1) gateSlash(cast, age - 1)
var landed = GATE_STEP.spin + 1
var holdEnd = Math.max(landed, Math.round((GATE_CFG.slashMs * GATE_CFG.slashShare) / 50))
if (age === holdEnd && cast.gates[1]) cast.gates[1].shut = true
if (age === holdEnd) gateAnimate(cast, gateSlashEnd(cast), GATE_POSE.rest, GATE_STEP.settle)
return age >= holdEnd + GATE_STEP.settle && !cast.gates.some((gate) => gate.parts.length) }
function gateEnd(cast) { if (cast.small) gateSize(cast, 1)
try { gateHold(cast, false) } catch (err) {}
if (cast.phase === "sink" && GATE_CFG.hidePlayer) { try { api.setPlayerOpacity(cast.owner, 1) } catch (err) {} }
if (cast.phase === "aim" && GATE_CFG.groundArrow) { try { api.setClientOptions(cast.owner, { groundArrowPath: null }) } catch (err) {} }
gateWear(cast, false)
gateAnimate(cast, null)
gateDrop(cast, cast.made.slice()) }
function gateTick() { for (var idx = gateList.length - 1; idx >= 0; idx--) { var cast = gateList[idx]
var ended = true
try { ended = gateStep(cast)
cast.moment++ } catch (err) { try { api.sendMessage(cast.owner, "Portal stopped at tick " + cast.moment + ": " + err, { color: "orange" }) } catch (other) {} }
if (ended) { gateEnd(cast)
gateList.splice(idx, 1) } } }
function gearPortal(playerId) { var mine = gateList.filter((cast) => cast.owner === playerId)[0]
if (mine) { if (mine.phase === "aim") mine.wantOut = true
return false }
if (gateList.length >= GATE_CFG.maxCasts) { api.sendMessage(playerId, "Too many portals are open.", { color: "orange" })
return false }
var where = api.getPosition(playerId)
var face = gateFacing(playerId, [0, 1])
var from = [where[0], where[1], where[2]]
gateList.push({ owner: playerId, moment: 0, phase: "aim", aim: face, centre: from, out: from, fired: 0, gates: [], made: [], arrow: [], slash: [], hurt: {}, held: false, worn: false, wantOut: false })
return true }
globalThis.gearPortal = gearPortal
var gateOldTick = typeof tick === "function" ? tick : null
tick = (msec) => { if (gateOldTick) gateOldTick(msec)
gateTick() }
var gateOldChat = typeof onPlayerChat === "function" ? onPlayerChat : null
onPlayerChat = (playerId, message) => { if (GATE_CFG.chat && message.trim().toLowerCase() === GATE_CFG.chat) return gearPortal(playerId), false
if (gateOldChat) return gateOldChat(playerId, message) }
var gateOldClick = typeof onPlayerClick === "function" ? onPlayerClick : null
onPlayerClick = (playerId, wasAlt, spotX, spotY, spotZ, block, target) => { if (GATE_CFG.clickFires) { var mine = gateList.filter((cast) => cast.owner === playerId && cast.phase === "aim")[0]
if (mine) mine.wantOut = true }
if (gateOldClick) return gateOldClick(playerId, wasAlt, spotX, spotY, spotZ, block, target) }
