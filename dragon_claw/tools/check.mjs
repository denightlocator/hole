// Runs dragon_claw/world_code.js against a stand-in for the game's `api` and checks it.
// It also writes animation/dragon_claw.bloxdmation (for the animation editor) from the
// pose table in the world code, so the two cannot drift apart.
// Usage: node tools/check.mjs [--dump frames.json]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const code = fs.readFileSync(path.join(dir, 'world_code.js'), 'utf8')
const args = process.argv.slice(2)
const NODES = ['TorsoNode', 'HeadMesh', 'ArmRightMesh', 'ArmLeftMesh', 'LegLeftMesh', 'LegRightMesh']
const BOX = ['width', 'height', 'depth', 'diffuseColor', 'emissiveColor', 'hideDist']
const PARTICLE = ['dir1', 'dir2', 'pos1', 'pos2', 'texture', 'minLifeTime', 'maxLifeTime', 'minEmitPower', 'maxEmitPower', 'minSize', 'maxSize',
  'manualEmitCount', 'gravity', 'colorGradients', 'velocityGradients', 'blendMode']
// names from PARTICLES.md and SOUNDS_AND_MUSIC.md of the official docs
const TEXTURES = ['arrow', 'bubble', 'critical_hit', 'drift', 'effect_5', 'fishingFishSilhouette', 'generic_2', 'glint', 'heart', 'scary_face', 'soul_0', 'square_particle', 'z-particle']
const SOUNDS = ['magicAccent2', 'rpgKnifeSlice1', 'rpgKnifeSlice2', 'drumSwish1', 'drumSwish2', 'bigDrumSwish1', 'zapAccent2']
const finite = (v) => (Array.isArray(v) ? v.every(finite) : typeof v === 'object' && v ? Object.values(v).every(finite) : typeof v !== 'number' || Number.isFinite(v))
const fail = []
const check = (ok, msg) => { console.log((ok ? '  ok    ' : '  FAIL  ') + msg); if (!ok) fail.push(msg) }

function game(before = '') {
  const meshes = new Map()
  let next = 1
  const s = { meshes, calls: 0, errors: [], hurt: [], anims: [], hands: [], sounds: new Set(), peak: 0, particles: 0, pushes: [], now: 0 }
  // the caster looks along +Z; "front" is 3 blocks ahead, "behind" 3 back, "mid" 9 ahead, "edge" 14.5 ahead, "far" 16 ahead
  const pos = { caster: [0.5, 10, 0.5], front: [0.5, 10, 3.5], behind: [0.5, 10, -2.5], mid: [0.5, 10, 9.5], far: [0.5, 10, 16.5], edge: [0.5, 10, 15] }
  const need = (ok, msg) => { if (!ok) s.errors.push(msg) }
  s.pos = pos
  s.api = {
    getPlayerIds: () => ['caster', 'front', 'mid', 'far', 'edge'], getMobIds: () => ['behind'], getHeldItem: () => null,
    getPosition: (id) => { if (!pos[id]) throw new Error('no entity'); return pos[id] },
    getPlayerFacingInfo: () => ({ camPos: [0.5, 11.6, 0.5], dir: [0, -0.2, 0.98] }),
    sendMessage: () => {},
    broadcastSound: (name, vol, rate, o) => { need(SOUNDS.includes(name) && finite([vol, rate, o.playerIdOrPos]), 'sound ' + name); s.sounds.add(name) },
    playParticleEffect: (o) => {
      s.calls++; s.particles++
      need(PARTICLE.every((k) => k in o) && finite(o) && TEXTURES.includes(o.texture), 'bad particle')
      need(o.colorGradients.every((g) => g.minColor.length === 4 && g.maxColor.length === 4), 'colour needs 4 numbers')
    },
    attemptCreateMeshEntity: (type, o) => {
      s.calls++
      need(type === 'Box' && Object.keys(o).every((k) => BOX.includes(k)) && finite(o) && o.width > 0 && o.height > 0 && o.depth > 0, 'bad Box')
      const id = 'm' + next++
      meshes.set(id, { o, p: null, r: [0, 0, 0] })
      s.peak = Math.max(s.peak, meshes.size)
      return id
    },
    updateMeshEntity: (id, type, o) => { s.calls++; need(meshes.has(id) && type === 'Box' && Object.keys(o).every((k) => BOX.includes(k)) && finite(o) && o.width > 0 && o.depth > 0, 'bad update'); if (meshes.has(id)) meshes.get(id).o = o },
    setPosition: (id, x, y, z) => { s.calls++; need(meshes.has(id) && finite([x, y, z]), 'bad setPosition'); meshes.get(id).p = [x, y, z] },
    setEntityRotation: (id, x, y, z) => { s.calls++; need(meshes.has(id) && finite([x, y, z]), 'bad rotation'); meshes.get(id).r = [x, y, z] },
    deleteMeshEntity: (id) => { s.calls++; need(meshes.delete(id), 'deleted twice') },
    updateEntityNodeMeshAttachment: (id, node, type, o, off, rot) => {
      s.calls++
      need(id === 'caster' && NODES.includes(node), 'bad node ' + node)
      if (type !== null) need(type === 'Box' && Object.keys(o).every((k) => BOX.includes(k)) && finite([o, off, rot]) && off.length === 3 && rot.length === 3, 'bad node mesh')
      s.hands.push({ t: s.now, node, on: type !== null, o, off })
    },
    animateEntity: (id, schema, at, speed) => {
      s.calls++
      need(id === 'caster' && at === 0 && speed === 1, 'bad animateEntity arguments')
      s.anims.push({ t: s.now, schema })
    },
    applyHealthChange: (id, n, by) => { need(Number.isInteger(n) && n < 0 && by === 'caster', 'bad damage'); s.hurt.push({ t: s.now, id, n }) },
    applyImpulse: (id, x, y, z) => { need(finite([x, y, z]), 'bad impulse'); s.pushes.push({ t: s.now, id }) },
  }
  s.g = {}
  s.run = new Function('api', 'globalThis', 'var tick, onPlayerChat, onPlayerAltAction;\n' + before + '\n' + code +
    '\nreturn { tick, onPlayerChat, onPlayerAltAction, CLAW_CFG, CLAW_POSE, CLAW_NODES, CLAW_STEP, clawCasts, clawNodePose, clawSchema, held: () => clawMeshes }')(s.api, s.g)
  return s
}

function play(s, limit = 200) {
  const frames = []
  let worst = 0
  while (s.run.clawCasts.length && frames.length < limit) {
    const before = s.calls
    s.now = frames.length
    s.run.tick(50)
    worst = Math.max(worst, s.calls - before)
    frames.push({ t: frames.length, meshes: [...s.meshes.values()].filter((m) => m.p).map((m) => ({ ...m.o, p: m.p, r: m.r })), hands: s.hands.filter((h) => h.on).length > 0 && !s.hands.some((h) => !h.on) })
  }
  return { frames, worst }
}

console.log('Sizes')
check(code.length <= 32000, `world_code.js ${code.length} characters: fits World Code (512000) and one code block (32000)`)
check(!/\/\/|\/\*/.test(code), 'no comments')

console.log('The move')
const s = game()
check(s.run.onPlayerChat('caster', 'hello') === undefined, 'other chat messages pass through')
check(s.run.onPlayerChat('caster', '!claw') === false && s.run.clawCasts.length === 1, '!claw starts the move and is hidden from chat')
check(s.g.dragonClaw('caster') === false, 'a second claw by the same player waits until the first is over')
const { frames, worst } = play(s)
const T = s.run.CLAW_STEP
check(frames.length === T.end + 1, `it lasts ${(frames.length / 20).toFixed(2)} s`)
check(s.errors.length === 0, 'every api call is well formed ' + [...new Set(s.errors)].join('; '))
const at = (n) => frames[n].meshes
const marks = (n) => at(n).filter((m) => Math.abs(m.r[0]) > 0.05 || m.p[1] > 11.4 || m.p[1] < 10.9)
const grown = [...Array(T.draw).keys()].map((k) => at(T.slash1 + k).length)
check(grown[T.draw - 1] === 42 && grown.every((n, k) => !k || n > grown[k - 1]), `first claw: three slash marks, each 9 bright meshes on 5 wider dark ones, drawn bit by bit while the arm comes down (${grown.join(', ')} meshes)`)
const tall = (n) => { const y = at(n).filter((m) => Math.abs(m.r[0]) > 0.2).map((m) => m.p[1]); return Math.max(...y) - Math.min(...y) }
check(tall(T.slash1 + T.draw - 1) > 3.5 && Math.min(...at(T.slash1 + T.draw - 1).map((m) => m.p[1])) > 9.9, `each claw is ${tall(T.slash1 + T.draw - 1).toFixed(1)} blocks tall (lowest point ${(Math.min(...at(T.slash1 + T.draw - 1).map((m) => m.p[1])) - 10).toFixed(2)} above the floor)`)
const zs = (n) => at(n).filter((m) => m.depth < 1.2 && m.width < 0.45).map((m) => m.p[2] - 0.5)
const lead = (n) => Math.max(...at(n).filter((m) => Math.abs(m.r[0]) > 0.2).map((m) => m.p[2] - 0.5))
check(lead(T.slash1 + T.draw) === lead(T.slash1 + T.draw - 1) && lead(T.slash1 + T.draw + 3) - lead(T.slash1 + T.draw + 2) > lead(T.drop1 - 1) - lead(T.drop1 - 2), 'the marks hang for a moment, then shoot off fast and slow down at the end')
check(lead(T.slash1 + T.draw) < 3.6 && lead(T.drop1 - 1) > 9 && lead(T.drop1 - 1) <= 10, `the marks then fly forward: ${lead(T.slash1 + T.draw).toFixed(1)} blocks ahead when drawn, ${lead(T.drop1 - 1).toFixed(1)} when they end (range ${s.run.CLAW_CFG.range})`)
const ringOf = (n) => at(n).filter((m) => Math.abs(m.r[0]) < 1e-9 && Math.abs(m.p[1] - 11) < 0.2)
const radius = (n) => Math.max(...ringOf(n).map((m) => Math.hypot(m.p[0] - 0.5, m.p[2] - 0.5)))
const loop = at(T.spin + T.turn - 1)
const span = (k) => Math.max(...loop.map((m) => m.p[k])) - Math.min(...loop.map((m) => m.p[k]))
check(loop.length === 24 && span(1) > 1.5 && span(1) < 2.4 && span(0) > 3.6 && span(2) > 4.2 && Math.min(...loop.map((m) => m.p[1])) > 10, `spin: a ring of 16 bright and 8 dark meshes is drawn round the player, tilted (one side ${span(1).toFixed(1)} blocks higher than the other)`)
check(ringOf(T.dropSpin - 1).length === 24 && radius(T.dropSpin - 1) > 5.3, `then it levels out and widens to ${radius(T.dropSpin - 1).toFixed(1)} blocks`)
check(at(T.slash2 + T.draw - 1).filter((m) => Math.abs(m.r[0]) > 0.2).length >= 30, 'second claw: three more slash marks')
const slope = (n) => { const m = at(n).filter((q) => Math.abs(q.r[0]) > 0.2); const a = m[0], b = m[8]; return Math.sign((b.p[0] - a.p[0]) * (b.p[1] - a.p[1])) }
check(slope(T.slash1 + T.draw - 1) === -slope(T.slash2 + T.draw - 1), 'the two claws cross: one runs down to the left, the other down to the right')
check(s.meshes.size === 0 && s.run.held() === 0 && s.peak <= 110, `every mesh is deleted at the end; at most ${s.peak} at once`)
check(worst <= 160, `most api calls in one tick: ${worst}; particles in the whole move: ${s.particles}`)
check(s.sounds.size >= 6, `${s.sounds.size} different sounds, all names from the documentation`)

console.log('The animation')
const A = s.anims
const P = s.run.CLAW_POSE
const steps = A.slice(0, -1)
check(A.length === P.length && A[A.length - 1].schema === null && steps.every((a, i) => a.t === P[i][0]), `${steps.length} small animations, one from each pose to the next, then the pose is reset at ${(A[A.length - 1].t / 20).toFixed(2)} s`)
const sizes = steps.map((a) => JSON.stringify(a.schema).length)
check(Math.max(...sizes) <= 800, `each call is small: ${Math.min(...sizes)} to ${Math.max(...sizes)} characters (the first version sent up to 2,600 at once)`)
check(steps.every((a, i) => a.schema.animationDurationMs === (P[i + 1][0] - P[i][0]) * 50 && a.schema.loop === false && finite(a.schema)), 'each lasts exactly until the next one starts')
check(steps.every((a) => Object.entries(a.schema.nodeAnimations).every(([n, v]) => NODES.includes(n) && v.timeline.length === 2 && v.timeline[0].timeFraction === 0 && v.timeline[1].timeFraction === 1 && Object.keys(v.timeline[0]).join() === 'timeFraction,rotation')), 'every body part has two keyframes, start and end, with a rotation only')
const end = (a, n) => a.schema.nodeAnimations[n]?.timeline[1].rotation ?? [0, 0, 0]
const start = (a, n) => a.schema.nodeAnimations[n]?.timeline[0].rotation ?? [0, 0, 0]
check(steps.every((a, i) => !i || NODES.every((n) => [0, 2].every((k) => Math.abs(start(a, n)[k] - end(steps[i - 1], n)[k]) < 0.011) && Math.abs(Math.sin(start(a, n)[1]) - Math.sin(end(steps[i - 1], n)[1])) < 0.02)), 'each one starts in the pose the one before ended in')
const spin = steps.filter((a) => a.t >= T.spin && a.t < T.spin + T.turn)
check(spin.length === 4 && spin.every((a, i) => Math.abs(end(a, 'TorsoNode')[1] - start(a, 'TorsoNode')[1] - Math.PI / 2) < 0.02 && Math.abs(end(a, 'LegLeftMesh')[1] - end(a, 'TorsoNode')[1]) < 0.02), 'the spin is four quarter turns of the torso, and the legs turn with it')
check(spin.every((a) => Math.abs(end(a, 'TorsoNode')[2] - 0.44) < 0.011 && !end(a, 'LegLeftMesh')[2]) && !end(steps[steps.length - 1], 'TorsoNode')[2], 'the body leans 25 degrees to the side all through the spin, the legs stay upright, and it is straight again afterwards')
check(Math.min(...steps.map((a) => end(a, 'ArmRightMesh')[0])) < -2.5 && Math.min(...steps.slice(8).map((a) => end(a, 'ArmLeftMesh')[0])) < -2.5, 'the right arm is raised for the first claw and the left arm for the second')

console.log('Node meshes')
const on = s.hands.filter((h) => h.on), off = s.hands.filter((h) => !h.on)
check(on.length === 14 && on.every((h) => h.t === 0) && new Set(on.map((h) => h.node)).size === 2, 'claws are attached to both arms at the start: 7 node meshes each (three talons of two pieces, and a blade)')
check(on[6].o.width > 0.25 && on[13].o.width > 0.25, 'the last one on each arm is the wide blade, so a claw shows even if the game keeps one mesh per node')
check(off.length === 2 && off.every((h) => h.t === T.rest + 3), 'and taken off again when the player is back at rest')

console.log('Hits')
const hitsOf = (id) => s.hurt.filter((h) => h.id === id)
check(hitsOf('front').length === 3, `a player 3 blocks in front is hit by both claws and the spin (${hitsOf('front').map((h) => h.n + ' at ' + (h.t / 20).toFixed(2) + ' s').join(', ')})`)
check(hitsOf('behind').length === 1 && hitsOf('behind')[0].n === -s.run.CLAW_CFG.spinDamage, 'a mob 3 blocks behind is only hit by the spin')
check(hitsOf('mid').length === 2 && hitsOf('mid').every((h) => h.n === -s.run.CLAW_CFG.damage) && hitsOf('mid')[0].t > hitsOf('front')[0].t, `a player 9 blocks in front is hit by both flying claws, later than the near one (${hitsOf('mid').map((h) => (h.t / 20).toFixed(2) + ' s').join(', ')})`)
check(hitsOf('far').length === 0 && hitsOf('edge').length === 0 && hitsOf('caster').length === 0, 'players 14.5 and 16 blocks away and the caster are not hit')
const big = game()
big.run.CLAW_CFG.range = 50
big.run.CLAW_CFG.spinRange = 50
big.g.dragonClaw('caster')
play(big)
check(big.hurt.some((h) => h.id === 'edge') && !big.hurt.some((h) => h.id === 'far') && big.errors.length === 0, 'with range set to 50 it still stops at 15 blocks: 14.5 is hit, 16 is not')
const quiet = game()
quiet.api.animateEntity = () => { throw new Error('argument is too large') }
quiet.api.sendMessage = (id, m) => quiet.said = m
quiet.g.dragonClaw('caster')
const q = play(quiet)
check(q.frames.length === T.end + 1 && quiet.meshes.size === 0 && quiet.hurt.length > 0, `if the game refuses the animation, the move still runs without it and tells the caster why: "${quiet.said}"`)

console.log('Together with other world code')
const both = game('var seen = []; tick = () => seen.push("tick"); onPlayerChat = (id, m) => (m === "!dp" ? false : undefined)')
check(both.run.onPlayerChat('caster', '!dp') === false && both.run.onPlayerChat('caster', '!claw') === false, 'pasted after other code, the earlier chat command still works')

console.log('Animation editor file')
const keyframes = s.run.CLAW_POSE.map((row) => ({
  time: row[0] / 20,
  data: Object.fromEntries(s.run.CLAW_NODES.map((node) => {
    const r = s.run.clawNodePose(row, node)
    return [node, { position: { x: 0, y: 0, z: 0 }, rotation: { x: r[0], y: r[1], z: r[2] } }]
  })),
}))
const file = { format: 'bloxdmation', version: 3, animationLength: 1.35, loop: false, keyframes, speed: 1, name: 'Dragon Claw', lerp: 'linear' }
const b64 = Buffer.from(JSON.stringify(file), 'utf8').toString('base64')
const out = path.join(dir, 'animation', 'Dragon Claw.bloxdmation')
fs.writeFileSync(out, b64)
const back = JSON.parse(Buffer.from(fs.readFileSync(out, 'utf8').trim(), 'base64').toString('utf8'))
check(back.format === 'bloxdmation' && back.version === 3 && back.keyframes.length === P.length && back.keyframes.every((k) => NODES.every((n) => finite(k.data[n]))), `wrote animation/Dragon Claw.bloxdmation: ${back.keyframes.length} keyframes, ${b64.length} characters`)
// the same calls as the game gets, as code the editor's "import code" understands
const asCode = steps.map((a, i) => i === 0
  ? 'let playerId = myId\napi.animateEntity(playerId, ' + JSON.stringify(a.schema) + ', 0, 1)'
  : 'addAnimation((speed) => {\n    api.animateEntity(playerId, ' + JSON.stringify(a.schema) + ', 0, speed)\n}, ' + a.t * 50 + ', 1)').join('\n\n')
fs.writeFileSync(path.join(dir, 'animation', 'animation_only.code_block.js'), asCode + '\n')
check(asCode.length <= 32000, `wrote animation/animation_only.code_block.js: ${asCode.length} characters`)

if (args.includes('--dump')) {
  fs.writeFileSync(args[args.indexOf('--dump') + 1], JSON.stringify({ frames, pose: keyframes }))
}
if (fail.length) { console.log(`\n${fail.length} check(s) failed`); process.exit(1) }
console.log('\nAll checks passed')
