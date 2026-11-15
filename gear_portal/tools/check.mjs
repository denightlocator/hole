// Stand-in game test for the Gear Portal move. Run: node tools/check.mjs [--dump frames.json]
// It also writes code_block.js (a trigger block: it needs the World Code).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const code = fs.readFileSync(path.join(dir, 'world_code.js'), 'utf8')
const args = process.argv.slice(2)
const PARTICLE = ['dir1', 'dir2', 'pos1', 'pos2', 'texture', 'minLifeTime', 'maxLifeTime', 'minEmitPower', 'maxEmitPower', 'minSize', 'maxSize',
  'manualEmitCount', 'gravity', 'colorGradients', 'velocityGradients', 'blendMode']
const BOX = ['width', 'height', 'depth', 'diffuseColor', 'emissiveColor', 'hideDist']
const TEXTURES = ['square_particle', 'glint']
const SOUNDS = ['bigDrumSwish1', 'futureStrangePulse', 'zapAccent1', 'rpgKnifeSlice1']
const NODES = ['TorsoNode', 'HeadMesh', 'ArmRightMesh', 'ArmLeftMesh', 'LegLeftMesh', 'LegRightMesh']
const finite = (v) => (Array.isArray(v) ? v.every(finite) : typeof v === 'object' && v ? Object.values(v).every(finite) : typeof v !== 'number' || Number.isFinite(v))
const fail = []
const check = (ok, msg) => { console.log((ok ? '  ok    ' : '  FAIL  ') + msg); if (!ok) fail.push(msg) }

// p1 stands at 0.5, 10, 0.5 looking along +Z. A wall can be put in the way with opts.wall = z.
function game(opts = {}) {
  const meshes = new Map()
  let next = 1
  const s = { meshes, fx: [], now: 0, errors: [], said: [], hurt: [], pushed: [], sounds: [], anims: [], worn: {}, opacity: [], options: {}, optionLog: [], peak: 0, calls: 0, moves: [], look: [0, -0.2, 0.98] }
  s.where = { p1: [0.5, 10, 0.5], p2: [0.5, 10, 10.4], cow: [6.5, 10, 2.5], far: [0.5, 10, 14.5] }
  const need = (ok, msg) => { if (!ok) s.errors.push(msg) }
  const box = (o) => Object.keys(o).every((k) => BOX.includes(k)) && finite(o) && o.width > 0 && o.height > 0 && o.depth > 0
  s.api = {
    getPosition: (id) => s.where[id],
    getPlayerIds: () => ['p1', 'p2'],
    getMobIds: () => ['cow', 'far'],
    getPlayerFacingInfo: () => ({ camPos: [0, 0, 0], dir: s.look }),
    getBlockSolidity: (x, y, z) => { need(Number.isInteger(x) && Number.isInteger(y) && Number.isInteger(z), 'block coords must be whole numbers'); return opts.wall !== undefined && z >= opts.wall },
    sendMessage: (id, m) => s.said.push(m),
    applyHealthChange: (id, n, by) => { s.hurt.push([id, n, by, s.now]) },
    applyImpulse: (id, x, y, z) => { need(finite([x, y, z]), 'bad impulse'); s.pushed.push([id, x, y, z]) },
    broadcastSound: (name, vol, rate, o) => { need(SOUNDS.includes(name) && finite([vol, rate, o.playerIdOrPos]), 'sound ' + name); s.sounds.push(name) },
    setPlayerOpacity: (id, v) => { need(id === 'p1' && v >= 0 && v <= 1, 'bad opacity'); s.opacity.push([s.now, v]) },
    setClientOptions: (id, o) => { need(id === 'p1', 'options for the wrong player'); Object.assign(s.options, o); s.optionLog.push([s.now, o]) },
    setClientOptionToDefault: (id, k) => { delete s.options[k]; s.optionLog.push([s.now, k]) },
    animateEntity: (id, schema, from, speed) => {
      if (opts.noAnim) throw new Error('argument is too large')
      need(id === 'p1' && from === 0 && speed === 1, 'bad animate call')
      if (schema) need(schema.loop === false && schema.animationDurationMs > 0 && finite(schema) && Object.keys(schema.nodeAnimations).every((n) => NODES.includes(n)) && JSON.stringify(schema).length < 1200, 'bad or too big animation')
      s.anims.push([s.now, schema])
    },
    updateEntityNodeMeshAttachment: (id, node, type, o, off, rot) => {
      need(id === 'p1' && NODES.includes(node) && (type === null || (type === 'Box' && box(o) && finite([off, rot]) && off.length === 3)), 'bad node mesh')
      if (type) s.worn[node] = o; else delete s.worn[node]
    },
    playParticleEffect: (o) => {
      s.calls++
      need(PARTICLE.every((k) => k in o) && finite(o) && TEXTURES.includes(o.texture) && o.colorGradients.every((g) => g.minColor.length === 4 && g.maxColor.length === 4) && o.minLifeTime > 0 && o.minSize > 0, 'bad particle')
      s.fx.push({ n: s.now, a: o.pos1, b: o.pos2, col: o.colorGradients[0].maxColor.slice(0, 3), end: o.colorGradients[1].maxColor.slice(0, 3), life: o.maxLifeTime, minLife: o.minLifeTime, power: o.maxEmitPower, minPower: o.minEmitPower, size: o.maxSize, count: o.manualEmitCount, d1: o.dir1, d2: o.dir2 })
    },
    attemptCreateMeshEntity: (type, o) => {
      s.calls++
      need(type === 'Box' && box(o), 'bad Box')
      const id = 'm' + next++
      meshes.set(id, { o, p: null, r: [0, 0, 0] })
      s.peak = Math.max(s.peak, meshes.size)
      return id
    },
    updateMeshEntity: (id, type, o) => { s.calls++; need(meshes.has(id) && type === 'Box' && box(o), 'bad update'); if (meshes.has(id)) meshes.get(id).o = o },
    setPosition: (id, x, y, z) => {
      s.calls++
      need(finite([x, y, z]) && (meshes.has(id) || id === 'p1'), 'bad setPosition')
      if (id === 'p1') { s.where.p1 = [x, y, z]; s.moves.push([s.now, x, y, z]) } else if (meshes.has(id)) meshes.get(id).p = [x, y, z]
    },
    setEntityRotation: (id, x, y, z) => { s.calls++; need(meshes.has(id) && finite([x, y, z]) && x === 0 && z === 0, 'tilted mesh'); meshes.get(id).r = [x, y, z] },
    deleteMeshEntity: (id) => { s.calls++; need(meshes.delete(id), 'deleted twice') },
  }
  s.g = {}
  s.run = new Function('api', 'globalThis', 'var tick, onPlayerChat, onPlayerClick;\n' + (opts.before || '') + '\n' + code + '\nreturn { tick, onPlayerChat, onPlayerClick, GATE_CFG, gateList, gatePlan, held: () => gateMeshes }')(s.api, s.g)
  return s
}
function play(s, ticks, each) {
  const frames = []
  let worst = 0
  for (let n = 0; n < ticks; n++) {
    if (each) each(n)
    const calls = s.calls
    s.run.tick(50)
    worst = Math.max(worst, s.calls - calls)
    frames.push({ meshes: [...s.meshes.values()].filter((m) => m.p).map((m) => ({ ...m.o, p: m.p, r: m.r })), player: s.where.p1.slice(), opacity: s.opacity.length ? s.opacity[s.opacity.length - 1][1] : 1, worn: Object.keys(s.worn).length, phase: s.run.gateList[0] ? s.run.gateList[0].phase : 'done' })
    s.now++
  }
  return { frames, worst }
}

console.log('Sizes')
check(code.length <= 512000 && !code.includes('//'), `world_code.js is ${code.length} characters (World Code limit 512,000), no // comments`)

console.log('Aiming: the arrow appears at once')
const s = game()
check(s.run.onPlayerChat('p1', 'hello') === undefined && s.run.onPlayerChat('p1', '!portal') === false && s.run.gateList.length === 1, '!portal starts it and is hidden from chat')
// while aiming, the player turns to look along +X (to the right)
const run = play(s, 100, (n) => { if (n === 30) s.look = [0.98, -0.2, 0] })
check(s.errors.length === 0, 'every api call is well formed and every mesh is level (only turned left or right) ' + [...new Set(s.errors)].join('; '))
const arrowOf = (f) => f.meshes.filter((m) => Math.abs(m.depth - 0.5) < 1e-9 && Math.abs(m.width - 0.08) < 1e-9)
const midOf = (list) => [list.reduce((a, m) => a + m.p[0], 0) / list.length - 0.5, list.reduce((a, m) => a + m.p[2], 0) / list.length - 0.5]
check(run.frames[0].meshes.length === 6 && arrowOf(run.frames[0]).length === 6, 'on the very first tick only the arrow exists: 3 arrow heads on the floor, no portal yet')
const before = arrowOf(run.frames[20]), after = arrowOf(run.frames[40])
check(Math.abs(midOf(before)[0]) < 1e-6 && midOf(before)[1] > 2 && after.length === 6 && midOf(after)[0] > 2 && Math.abs(midOf(after)[1]) < 1e-6, 'the arrow points where the player is looking and follows when the player turns (here from ahead to the right)')
check(s.optionLog.some((o) => o[1].groundArrowPath && Math.abs(o[1].groundArrowPath.target[0] - 6.5) < 1e-6 && Math.abs(o[1].groundArrowPath.target[2] - 0.5) < 1e-6), 'the caster also gets the game\'s own arrow strip on the ground to the landing spot, 6 blocks away')
check(run.frames[40].opacity === 1 && run.frames[40].worn === 0 && !('speedMultiplier' in s.optionLog.filter((o) => o[0] < 60).reduce((a, o) => Object.assign(a, typeof o[1] === 'object' ? o[1] : {}), {})) && s.anims.every((a) => a[0] >= 60), 'while aiming the player is visible, free to walk, and nothing else has started')
check(s.fx.some((q) => q.n < 60 && Math.abs((q.a[0] + q.b[0]) / 2 - (q.n < 30 ? 0.5 : 6.5)) < 1e-6), 'sparks mark the landing spot')

console.log('The move itself: first portal under the player')
check(s.moves.filter((m) => m[0] < 66).every((m) => m[1] === 0.5 && m[2] === 10 && m[3] === 0.5), 'the player is not moved yet: the first portal opens right under their feet')
const N = s.run.gatePlan.length
const portal = run.frames[65].meshes.filter((m) => !arrowOf(run.frames[65]).includes(m))
check(N === 50 && run.frames[59].meshes.length === 6 && portal.length === N, `after 3 s of aiming the move goes off by itself; the portal (${N} meshes) opens under the player in 0.3 s`)
const farOf = (m, c = [0.5, 0.5]) => Math.hypot(m.p[0] - c[0], m.p[2] - c[1])
check(portal.every((m) => m.p[1] > 10 && m.p[1] < 10.15 && m.height <= 0.08 && farOf(m) < 1.51), 'it lies flat on the floor, 3 blocks across: gold rim, two cog rings, dark green disc, bright centre')
const spinA = run.frames[64].meshes, spinB = run.frames[65].meshes
const turning = spinA.filter((m, i) => !(Math.abs(m.depth - 0.5) < 1e-9 && Math.abs(m.width - 0.08) < 1e-9) && (m.p[0] !== spinB[i].p[0] || m.r[1] !== spinB[i].r[1]))
check(turning.length === 28 && turning.every((m) => Math.abs(farOf(m) - 1.22) < 1e-6 || farOf(m) < 0.75), 'the outer cog ring (12 teeth) turns one way and the inner cog (16 parts) the other way; rim and disc stay still')
check(s.anims[0][0] === 60 && s.anims[1][0] === 63 && s.anims[0][1].nodeAnimations.TorsoNode.timeline[1].rotation[0] > 0.3 && s.anims[1][1].nodeAnimations.ArmRightMesh.timeline[1].rotation[0] < -2.9, 'animation: the player braces, then throws the arms up and drops in')
check(run.frames[63].opacity === 0.5 && run.frames[65].opacity === 0, 'the player fades and is invisible when they are in')
const heldAt = s.optionLog.find((o) => o[1].speedMultiplier === 0)
check(heldAt && heldAt[0] === 65 && heldAt[1].invincible === true, 'for that moment the player cannot walk and cannot be hurt')
check(run.frames[62].worn === 3 && run.frames[65].worn === 0, 'the 3 worn meshes (blade on the right arm, brass block on the left, gear plate on the back) are on while dropping in')
check(arrowOf(run.frames[64]).length === 6 && Math.abs(midOf(arrowOf(run.frames[64]))[0] - midOf(after)[0]) < 0.6, 'the arrow stays where it was while the player drops in')

console.log('Out again with a 360 slash')
const leftAt = run.frames.findIndex((f) => f.phase === 'leave')
check(leftAt === 66, 'right after dropping in (0.3 s) the player is teleported')
check(run.frames[leftAt].player.map((v) => +v.toFixed(6)).join() === '6.5,10,0.5', 'the player lands 6 blocks away, exactly where the arrow pointed (to the right)')
check(run.frames[leftAt].opacity === 1 && !('speedMultiplier' in s.options) && !('jumpAmount' in s.options) && !('invincible' in s.options) && s.options.groundArrowPath === null, 'visible again; walking, jumping and damage are back to normal; the arrow strip is gone')
check(arrowOf(run.frames[leftAt]).length === 0 && run.frames[leftAt].worn === 3, 'arrow heads removed, worn meshes back on')
const ringOf = (f) => f.meshes.filter((m) => Math.abs(m.p[1] - 10.95) < 1e-9)
const sizes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((k) => ringOf(run.frames[leftAt + k]).length)
check(sizes[0] === 6 && Math.max(...sizes) === 24 && sizes[10] === 0, `the slash sweeps once round the player in 0.3 s as a green band with a bright edge (${sizes.join(', ')} meshes), then is gone`)
const allRing = new Set(); run.frames.slice(leftAt, leftAt + 12).forEach((f) => ringOf(f).forEach((m) => allRing.add(m.p.join())))
check(allRing.size === 36 && [...allRing].every((p) => { const q = p.split(',').map(Number); const r = Math.hypot(q[0] - 6.5, q[2] - 0.5); return Math.abs(r - 2.58) < 1e-6 || Math.abs(r - 2.88) < 1e-6 }), 'it is a full circle of 18 pieces, 2.6 to 2.9 blocks out, at chest height')
const yaws = s.anims.filter((a) => a[0] > leftAt && a[1] && a[1].animationDurationMs === 100).map((a) => a[1].nodeAnimations.TorsoNode.timeline.map((k) => Math.round((k.rotation[1] * 180) / Math.PI)))
check(yaws.map((y) => y.join('>')).join(' ') === '0>90 90>180 180>270 270>360', 'animation: arms out, the body turns a full 360 in four quarter turns (4 small calls), then settles')
check(s.anims[s.anims.length - 1][1] === null, 'the animation is stopped at the end')
check(s.hurt.length === 1 && s.hurt[0][0] === 'cow' && s.hurt[0][1] === -25 && s.hurt[0][2] === 'p1' && s.hurt[0][3] === leftAt + 1, 'the slash deals 25 damage once to everything within 3 blocks of where the player came out (a cow 2 blocks away); nothing else is touched')
check(s.pushed.length === 1 && s.pushed[0][3] > 7, 'and knocks it away')
const closed = run.frames.findIndex((f, i) => i > leftAt && f.meshes.length === 0)
if (args.includes('--why')) console.log(closed, leftAt, run.frames.slice(leftAt, leftAt + 16).map((f) => f.meshes.length).join(' '))
const secondAt = run.frames[leftAt].meshes.filter((m) => m.p[1] < 10.2 && Math.hypot(m.p[0] - 6.5, m.p[2] - 0.5) < 1.6).length
check(secondAt === 25 && run.frames[leftAt + 1].meshes.filter((m) => m.p[1] < 10.2 && Math.hypot(m.p[0] - 6.5, m.p[2] - 0.5) < 1.6).length === 50, 'the second portal (50 meshes) opens at the exit spot as the player arrives, complete 0.05 s later')
const firstLeft = (n) => run.frames[n].meshes.filter((m) => m.p[1] < 10.2 && Math.hypot(m.p[0] - 0.5, m.p[2] - 0.5) < 1.6).length
check(firstLeft(leftAt) === 50 && firstLeft(leftAt + 8) === 0, 'the first portal folds away in 0.4 s after the player has left it')
check(closed === leftAt + 17 && s.meshes.size === 0 && s.run.held() === 0 && s.run.gateList.length === 0 && Object.keys(s.worn).length === 0, `the second portal closes after the slash; no mesh is left ${((closed + 1) / 20).toFixed(1)} s after the cast`)
check(s.peak <= 130, `${s.peak} meshes at the most (limit 400)`)
check(run.worst <= 190, `at most ${run.worst} api calls in a tick`)
check(SOUNDS.every((n) => s.sounds.includes(n)), 'sounds for the portal, coming out and the slash')

console.log('Leaving early and edge cases')
const early = game()
early.g.gearPortal('p1')
play(early, 20)
check(early.g.gearPortal('p1') === false && early.run.gateList.length === 1, '!portal again while aiming means "go now"')
const e2 = play(early, 8)
check(e2.frames[0].phase === 'sink' && e2.frames[6].phase === 'leave' && e2.frames[6].player[2] > 6.4, 'the move goes off at once and the player lands 6 blocks ahead')
const click = game()
click.g.gearPortal('p1')
play(click, 20)
click.run.onPlayerClick('p1', false, 0, 0, 0, 'Air', null)
check(play(click, 2).frames[0].phase === 'sink', 'a click while aiming also means "go now"')
const walked = game()
walked.g.gearPortal('p1')
play(walked, 10)
walked.where.p1 = [3.5, 10, 0.5]
const wk = play(walked, 60)
check(wk.frames[55].meshes.filter((m) => m.p[1] < 10.2 && Math.hypot(m.p[0] - 3.5, m.p[2] - 0.5) < 1.6).length === 50 && Math.abs(wk.frames[56].player[2] - 6.5) < 1e-9, 'if the player walks while aiming, the arrow and the first portal go with them')
const wall = game({ wall: 3 })
wall.g.gearPortal('p1')
const w = play(wall, 70)
check(w.frames[66].phase === 'leave' && Math.abs(w.frames[66].player[2] - 2.5) < 1e-9, 'a wall in the way shortens the teleport: the second portal opens in front of the wall')
const noAnim = game({ noAnim: true })
noAnim.g.gearPortal('p1')
play(noAnim, 100)
check(noAnim.run.GATE_CFG.animate === false && /animation stopped/.test(noAnim.said[0]) && noAnim.meshes.size === 0 && noAnim.run.gateList.length === 0, 'if the game refuses the animation, the move still plays without it and says so once')
const boom = game()
boom.g.gearPortal('p1')
play(boom, 20)
boom.api.getPosition = () => { throw new Error('gone') }
play(boom, 2)
check(/^Portal stopped at tick 20: Error: gone$/.test(boom.said[0] || '') && boom.meshes.size === 0 && boom.run.gateList.length === 0 && boom.options.groundArrowPath === null, 'if something fails while aiming: the arrow is removed and the move is dropped')
const late = game()
late.g.gearPortal('p1')
play(late, 66)
late.api.setPosition = () => { throw new Error('gone') }
play(late, 2)
check(/stopped at tick 66/.test(late.said[0] || '') && late.meshes.size === 0 && !('speedMultiplier' in late.options) && late.opacity[late.opacity.length - 1][1] === 1, 'if something fails while hidden: everything is removed and the player is made visible and free again')
const both = game({ before: 'globalThis.seen = 0; tick = () => { globalThis.seen++ }; onPlayerChat = (id, m) => m === "x" ? "old" : undefined; onPlayerClick = () => { globalThis.seen += 10 };' })
both.run.tick(50); both.run.onPlayerClick('p1')
check(both.run.onPlayerChat('p1', 'x') === 'old' && both.g.seen === 11, 'earlier tick, onPlayerChat and onPlayerClick still run')

console.log('Code block')
const blockCode = 'if (typeof gearPortal === "function") gearPortal(myId)\nelse api.sendMessage(myId, "Paste the portal code into World Code first.", { color: "orange" })\n'
fs.writeFileSync(path.join(dir, 'code_block.js'), blockCode)
{
  const g = game()
  new Function('api', 'globalThis', 'myId', 'thisPos', 'with (globalThis) {' + blockCode + '}')(g.api, g.g, 'p1', [0, 9, 0])
  check(g.run.gateList.length === 1, 'with the World Code pasted, clicking the block casts the move for the player who clicked')
  const said = []
  new Function('api', 'globalThis', 'myId', 'thisPos', 'with (globalThis) {' + blockCode + '}')({ sendMessage: (id, m) => said.push(m) }, {}, 'p1', [0, 9, 0])
  check(/World Code first/.test(said[0]), 'without it, the block says what is missing')
}

if (args.includes('--dump')) {
  const shot = (n) => ({ ...run.frames[n], fx: s.fx.filter((q) => q.n <= n && q.n + q.life * 20 > n).map((q) => ({ ...q, t: (n - q.n) / 20 })) })
  fs.writeFileSync(args[args.indexOf('--dump') + 1], JSON.stringify({ frames: [shot(20), shot(45), shot(61), shot(65), shot(66), shot(70)], start: [0.5, 10, 0.5] }))
}
console.log(fail.length ? `\n${fail.length} check(s) failed` : '\nAll checks passed')
process.exit(fail.length ? 1 : 0)
