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

const NODES = ['TorsoNode', 'HeadMesh', 'ArmRightMesh', 'ArmLeftMesh', 'LegLeftMesh', 'LegRightMesh']
const finite = (v) => (Array.isArray(v) ? v.every(finite) : typeof v === 'object' && v ? Object.values(v).every(finite) : typeof v !== 'number' || Number.isFinite(v))
const fail = []
const check = (ok, msg) => { console.log((ok ? '  ok    ' : '  FAIL  ') + msg); if (!ok) fail.push(msg) }

// p1 stands at 0.5, 10, 0.5 looking along +Z. A wall can be put in the way with opts.wall = z.
function game(opts = {}) {
  const meshes = new Map()
  let next = 1
  const s = { meshes, fx: [], now: 0, errors: [], said: [], hurt: [], pushed: [], sounds: [], anims: [], worn: {}, opacity: [], scale: [], options: {}, optionLog: [], peak: 0, calls: 0, moves: [], look: [0, -0.2, 0.98] }
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
    broadcastSound: (name, vol, rate, o) => { need(false, 'a sound was played: ' + name); s.sounds.push(name) },
    setLifeformScale: (id, v) => { need(id === 'p1' && v > 0 && v <= 1, 'bad scale'); s.scale.push([s.now, v]) },
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
  s.run = new Function('api', 'globalThis', 'var tick, onPlayerChat, onPlayerClick;\n' + (opts.before || '') + '\n' + code + '\nreturn { tick, onPlayerChat, onPlayerClick, gateCfg, gateList, gatePlan, held: () => gateMeshes }')(s.api, s.g)
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
    frames.push({ meshes: [...s.meshes.entries()].filter((e) => e[1].p).map(([id, m]) => ({ ...m.o, p: m.p, r: m.r, id })), player: s.where.p1.slice(), opacity: s.opacity.length ? s.opacity[s.opacity.length - 1][1] : 1, worn: Object.keys(s.worn).length, phase: s.run.gateList[0] ? s.run.gateList[0].phase : 'done' })
    s.now++
  }
  return { frames, worst }
}

console.log('Sizes')
check(code.length <= 512000 && !code.includes('//'), `world_code.js is ${code.length} characters (World Code limit 512,000), no // comments`)

console.log('Aiming: the arrow appears at once')
const s = game()
check(s.run.onPlayerChat('p1', 'hello') === undefined && s.run.onPlayerChat('p1', '!move1') === false && s.run.gateList.length === 1, '!portal starts it and is hidden from chat')
// while aiming, the player turns to look along +X (to the right)
const run = play(s, 120, (n) => { if (n === 30) s.look = [0.98, -0.2, 0] })
check(s.errors.length === 0, 'every api call is well formed and every mesh is level (only turned left or right) ' + [...new Set(s.errors)].join('; '))
const arrowOf = (f) => f.meshes.filter((m) => Math.abs(m.depth - 0.5) < 1e-9 && Math.abs(m.width - 0.08) < 1e-9)
const midOf = (list) => [list.reduce((a, m) => a + m.p[0], 0) / list.length - 0.5, list.reduce((a, m) => a + m.p[2], 0) / list.length - 0.5]
check(run.frames[0].meshes.length === 6 && arrowOf(run.frames[0]).length === 6, 'on the very first tick only the arrow exists: 3 arrow heads on the floor, no portal yet')
const before = arrowOf(run.frames[20]), after = arrowOf(run.frames[40])
check(Math.abs(midOf(before)[0]) < 1e-6 && midOf(before)[1] > 2 && after.length === 6 && midOf(after)[0] > 2 && Math.abs(midOf(after)[1]) < 1e-6, 'the arrow points where the player is looking and follows when the player turns (here from ahead to the right)')
check(s.optionLog.some((o) => o[1].groundArrowPath && Math.abs(o[1].groundArrowPath.target[0] - 6.5) < 1e-6 && Math.abs(o[1].groundArrowPath.target[2] - 0.5) < 1e-6), 'the caster also gets the game\'s own arrow strip on the ground to the landing spot, 6 blocks away')
check(run.frames[40].opacity === 1 && run.frames[40].worn === 0 && !('speedMultiplier' in s.optionLog.filter((o) => o[0] < 60).reduce((a, o) => Object.assign(a, typeof o[1] === 'object' ? o[1] : {}), {})) && s.anims.filter((a) => a[0] < 60).map((a) => a[0]).join() === '0,4,24,44' && s.anims[0][1].nodeAnimations.ArmRightMesh.timeline[1].rotation[0] < -1.3, 'while aiming the player is visible and free to walk, and holds a ready pose with the blade arm pointing ahead')
check(s.fx.some((q) => q.n < 60 && Math.abs((q.a[0] + q.b[0]) / 2 - (q.n < 30 ? 0.5 : 6.5)) < 1e-6), 'sparks mark the landing spot')

console.log('The move itself: first portal under the player')
check(s.moves.filter((m) => m[0] < 66).every((m) => m[1] === 0.5 && m[2] === 10 && m[3] === 0.5), 'the player is not moved yet: the first portal opens right under their feet')
const N = s.run.gatePlan.length
const portal = run.frames[65].meshes.filter((m) => !arrowOf(run.frames[65]).includes(m))
check(N === 86 && run.frames[59].meshes.length === 6 && portal.length === N, `after 3 s of aiming the move goes off by itself; the portal (${N} meshes) opens under the player in 0.3 s`)
const farOf = (m, c = [0.5, 0.5]) => Math.hypot(m.p[0] - c[0], m.p[2] - c[1])
check(portal.every((m) => m.p[1] > 10 && m.p[1] < 10.15 && m.height <= 0.1 && farOf(m) < 2.45), 'it lies flat on the floor: a clock face inside a big gear, with three small gears meshing on the outside')
const spinB = new Map(run.frames[70].meshes.map((m) => [m.id, m]))
const turning = run.frames[69].meshes.filter((m) => m.p[1] < 10.2 && Math.hypot(m.p[0] - 6.5, m.p[2] - 0.5) < 2.5 && spinB.has(m.id) && (m.p[0] !== spinB.get(m.id).p[0] || m.r[1] !== spinB.get(m.id).r[1]))
check(turning.length === 28, 'moving parts: the 12 big gear teeth, the spoked wheel, the two clock hands with their hub, and the three small gears (turning against each other); ' + turning.length + ' of 86 pieces move')
const hand = (f) => f.meshes.find((m) => Math.abs(m.depth - 1.04) < 1e-9)
check(Math.abs(Math.abs(hand(run.frames[65]).r[1] - hand(run.frames[64]).r[1]) - 0.32) < 1e-9, 'the long clock hand sweeps round fast (a full turn each second)')
const go = s.anims.filter((a) => a[0] >= 60 && a[0] < 66 && a[1])
check(go.map((a) => a[0]).join() === '60,62,64' && go[0][1].nodeAnimations.LegRightMesh.timeline[1].rotation[0] < -0.6 && go[1][1].nodeAnimations.ArmRightMesh.timeline[1].rotation[0] < -3 && Math.abs(go[2][1].nodeAnimations.TorsoNode.timeline[1].rotation[1] - Math.PI) < 1e-9, 'animation: crouch, leap with arms up, then a half-turn corkscrew down into the portal')
check(s.scale.filter((q) => q[0] < 66).map((q) => q[1].toFixed(2)).join() === '0.84,0.68,0.52,0.36', 'the player shrinks as they go down, so it looks like sinking into the portal')
check(run.frames[63].opacity === 0.5 && run.frames[65].opacity === 0, 'the player fades and is invisible when they are in')
const heldAt = s.optionLog.find((o) => o[1].speedMultiplier === 0)
check(heldAt && heldAt[0] === 65 && heldAt[1].invincible === true, 'for that moment the player cannot walk and cannot be hurt')
check(run.frames[62].worn === 2 && run.frames[65].worn === 0, 'the 2 worn meshes (a green blade on each arm, nothing else) are on while dropping in')
check(arrowOf(run.frames[64]).length === 6 && Math.abs(midOf(arrowOf(run.frames[64]))[0] - midOf(after)[0]) < 0.6, 'the arrow stays where it was while the player drops in')

console.log('Out again with a 360 slash')
const leftAt = run.frames.findIndex((f) => f.phase === 'leave')
check(leftAt === 66, 'right after dropping in (0.3 s) the player is teleported')
check(run.frames[leftAt].player.map((v) => +v.toFixed(6)).join() === '6.5,10,0.5', 'the player lands 6 blocks away, exactly where the arrow pointed (to the right)')
check(run.frames[leftAt].opacity === 1 && !('speedMultiplier' in s.options) && !('jumpAmount' in s.options) && !('invincible' in s.options) && s.options.groundArrowPath === null, 'visible again; walking, jumping and damage are back to normal; the arrow strip is gone')
check(arrowOf(run.frames[leftAt]).length === 0 && run.frames[leftAt].worn === 2, 'arrow heads removed, worn meshes back on')
const ringOf = (f) => f.meshes.filter((m) => m.p[1] > 10.5)
const sizes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((k) => ringOf(run.frames[leftAt + k]).length)
check(sizes[0] === 6 && Math.max(...sizes) >= 22 && sizes[10] === 0, `the band grows out from the front of the player in both directions over 0.3 s (${sizes.join(', ')} meshes), then is gone`)
const angOf = (m) => Math.atan2(m.p[0] - 6.5, m.p[2] - 0.5)
const nearFront = (deg) => Math.abs(((deg - 90 + 540) % 360) - 180) < 1e-6
const relOf = (a) => (((a * 180) / Math.PI - 90 + 540) % 360) - 180
const earlyRing = [...new Set(ringOf(run.frames[leftAt + 1]).map((m) => Math.round(relOf(angOf(m)))))]
const laterRing = [...new Set(ringOf(run.frames[leftAt + 3]).map((m) => Math.round(relOf(angOf(m)))))]
check(earlyRing.length > 0 && Math.max(...earlyRing.map(Math.abs)) < 20 && Math.max(...laterRing.map(Math.abs)) > 55 && Math.min(...laterRing.map(Math.abs)) < 5, 'the band starts in front of the player and runs out to both sides at once, the two ends going round towards the back')
const spread = [...new Set(run.frames.slice(leftAt, leftAt + 9).flatMap((f) => ringOf(f).map((m) => Math.round(relOf(angOf(m)) * 10) / 10)))].sort((a, b) => a - b)
const far = Math.max(...spread.map(Math.abs))
check(spread.every((a) => Math.abs(a) < 170) && Math.abs(360 - 2 * far - 26) < 10, `the two ends stop ${Math.round(360 - 2 * far)}° apart, and that free area is behind the player, ${Math.round(180 - far)}° either side of straight behind`)
const steps = spread.map((a, i) => (i + 1 < spread.length ? spread[i + 1] - a : spread[0] + 360 - a))
check(Math.max(...steps) - Math.min(...steps) > 4 && Math.abs(spread.length - 17) < 3, `the pieces are not evenly spaced (${Math.round(Math.min(...steps))}° to ${Math.round(Math.max(...steps))}° apart), so the band does not look made by a machine`)
const allRing = new Set(); run.frames.slice(leftAt, leftAt + 12).forEach((f) => ringOf(f).forEach((m) => allRing.add(m.p.join())))
check(allRing.size === 34 && [...allRing].every((p) => { const q = p.split(',').map(Number); const r = Math.hypot(q[0] - 6.5, q[2] - 0.5); return r > 2.4 && r < 3.1 }), 'it is 17 pieces, 2.4 to 3.1 blocks out and at slightly uneven heights, each made of a wide green slab with a thin bright edge')
const slashMove = s.anims.filter((a) => a[0] === leftAt && a[1])[0][1]
const arm = (name, key, axis) => slashMove.nodeAnimations[name].timeline[key].rotation[axis]
check(Math.abs(slashMove.animationDurationMs * slashMove.nodeAnimations.TorsoNode.timeline[1].timeFraction - 400) < 3 && Math.abs(arm('ArmRightMesh', 0, 0) + 1.0821) < 1e-6 && Math.abs(arm('ArmLeftMesh', 1, 2) - 1.9024) < 1e-6 && Math.abs(arm('ArmRightMesh', 1, 2) + 2.0944) < 1e-6 && Math.abs(arm('LegLeftMesh', 0, 0) - 0.5411) < 1e-6, `the slash plays your animation sped up to the 360 instead of over 1.9 s: the arms cross over in ${Math.round(slashMove.animationDurationMs * 0.19)} ms, the same 0.4 s the band takes to sweep round`)
check(s.anims.filter((a) => a[0] >= leftAt && a[1]).every((a) => Object.values(a[1].nodeAnimations).every((n) => n.timeline.every((k) => Math.abs(k.rotation[1]) < 1e-9))), 'the body is no longer turned separately: that one animation does the whole slash')
const tail = s.anims.filter((a) => a[0] > leftAt && a[1]).map((a) => a[0] - leftAt + ':' + a[1].animationDurationMs)
check(tail.join() === '9:200' && s.scale.slice(-3).map((q) => q[1]).join() === '0.6,0.85,1', 'the pose eases back to a normal stand 0.2 s after the slash; the player grows back to full size while coming out')
check(s.anims[s.anims.length - 1][1] === null, 'the animation is stopped at the end')
check(s.hurt.length === 1 && s.hurt[0][0] === 'cow' && s.hurt[0][1] === -25 && s.hurt[0][2] === 'p1' && s.hurt[0][3] === leftAt + 1, 'the slash deals 25 damage once to everything within 3 blocks of where the player came out (a cow 2 blocks away); nothing else is touched')
check(s.pushed.length === 1 && s.pushed[0][3] > 7, 'and knocks it away')
const closed = run.frames.findIndex((f, i) => i > leftAt && f.meshes.length === 0)
if (args.includes('--why')) console.log(closed, leftAt, run.frames.slice(leftAt, leftAt + 16).map((f) => f.meshes.length).join(' '))
const secondAt = run.frames[leftAt].meshes.filter((m) => m.p[1] < 10.2 && Math.hypot(m.p[0] - 6.5, m.p[2] - 0.5) < 2.5).length
check(secondAt === 43 && run.frames[leftAt + 1].meshes.filter((m) => m.p[1] < 10.2 && Math.hypot(m.p[0] - 6.5, m.p[2] - 0.5) < 2.5).length === 86, 'the second portal (86 meshes) opens at the exit spot as the player arrives, complete 0.05 s later')
const firstLeft = (n) => run.frames[n].meshes.filter((m) => m.p[1] < 10.2 && Math.hypot(m.p[0] - 0.5, m.p[2] - 0.5) < 2.5).length
check(firstLeft(leftAt) === 86 && firstLeft(leftAt + 8) === 0, 'the first portal folds away in 0.4 s after the player has left it')
check(closed === leftAt + 17 && s.meshes.size === 0 && s.run.held() === 0 && s.run.gateList.length === 0 && Object.keys(s.worn).length === 0, `the second portal closes right after the slash; no mesh is left ${((closed + 1) / 20).toFixed(1)} s after the cast`)
check(s.peak <= 230, `${s.peak} meshes at the most (limit 400)`)
check(run.worst <= 230, `at most ${run.worst} api calls in a tick`)
check(s.sounds.length === 0 && !code.includes('broadcastSound'), 'it plays no sounds at all')

console.log('Leaving early and edge cases')
const early = game()
early.g.gearPortal('p1')
play(early, 20)
check(early.g.gearPortal('p1') === false && early.run.gateList.length === 1, '!move1 again while aiming means "go now"')
const e2 = play(early, 8)
check(e2.frames[0].phase === 'sink' && e2.frames[6].phase === 'leave' && e2.frames[6].player[2] > 6.4, 'the move goes off at once and the player lands 6 blocks ahead')
const hard = game()
hard.run.gateCfg.aimTime = 9
hard.g.gearPortal('p1')
const h2 = play(hard, 63)
check(h2.frames[59].phase === 'aim' && h2.frames[60].phase === 'sink', 'the arrow never stays out longer than 3 s: even with aimTime set to 9, the move goes off on the 3 s mark')
const stop = game()
stop.run.gateCfg.aimCancels = true
stop.g.gearPortal('p1')
const s2 = play(stop, 63)
check(s2.frames[61].meshes.length === 0 && stop.meshes.size === 0 && stop.run.gateList.length === 0 && stop.options.groundArrowPath === null, 'with aimCancels on, the 3 s limit takes the arrow away and drops the move instead')
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
check(wk.frames[55].meshes.filter((m) => m.p[1] < 10.2 && Math.hypot(m.p[0] - 3.5, m.p[2] - 0.5) < 2.5 && !(Math.abs(m.depth - 0.5) < 1e-9 && Math.abs(m.width - 0.08) < 1e-9)).length === 86 && Math.abs(wk.frames[56].player[2] - 6.5) < 1e-9, 'if the player walks while aiming, the arrow and the first portal go with them')
const wall = game({ wall: 3 })
wall.g.gearPortal('p1')
const w = play(wall, 70)
check(w.frames[66].phase === 'leave' && Math.abs(w.frames[66].player[2] - 2.5) < 1e-9, 'a wall in the way shortens the teleport: the second portal opens in front of the wall')
const noAnim = game({ noAnim: true })
noAnim.g.gearPortal('p1')
play(noAnim, 140)
check(noAnim.run.gateCfg.animate === false && /animation stopped/.test(noAnim.said[0]) && noAnim.meshes.size === 0 && noAnim.run.gateList.length === 0, 'if the game refuses the animation, the move still plays without it and says so once')
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
