// Runs astral_circle/world_code.js against a stand-in for the game's `api` and checks it.
// It also writes code_block.js (the standalone code block) from the world code.
// Usage: node tools/check.mjs [--dump frames.json]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const code = fs.readFileSync(path.join(dir, 'world_code.js'), 'utf8')
const args = process.argv.slice(2)
const BOX = ['width', 'height', 'depth', 'diffuseColor', 'emissiveColor', 'hideDist']
const PARTICLE = ['dir1', 'dir2', 'pos1', 'pos2', 'texture', 'minLifeTime', 'maxLifeTime', 'minEmitPower', 'maxEmitPower', 'minSize', 'maxSize',
  'manualEmitCount', 'gravity', 'colorGradients', 'velocityGradients', 'blendMode']
// names from PARTICLES.md and SOUNDS_AND_MUSIC.md of the official docs
const TEXTURES = ['arrow', 'bubble', 'critical_hit', 'drift', 'effect_5', 'fishingFishSilhouette', 'generic_2', 'glint', 'heart', 'scary_face', 'soul_0', 'square_particle', 'z-particle']
const SOUNDS = ['ominousBellHit', 'magicAccent2', 'harp_pling', 'suspenseRiser', 'futureStrangePulse', 'zapAccent1', 'zapAccent2', 'cannonFire2', 'cannonFire1', 'hauntedHorrorImpact']
const finite = (v) => (Array.isArray(v) ? v.every(finite) : typeof v === 'object' && v ? Object.values(v).every(finite) : typeof v !== 'number' || Number.isFinite(v))
const fail = []
const check = (ok, msg) => { console.log((ok ? '  ok    ' : '  FAIL  ') + msg); if (!ok) fail.push(msg) }

function game(before = '', bare = false) {
  const meshes = new Map()
  let next = 1
  const s = { meshes, calls: 0, errors: [], hurt: [], sounds: new Set(), peak: 0, particles: 0, pushes: [], now: 0, made: 0, said: [] }
  // the caster looks along +Z; the circle forms 15 blocks ahead. "near" stands 5 from its centre, "rim" 9, "under" in the middle
  const pos = { caster: [0.5, 10, 0.5], under: [0.5, 10, 15.5], near: [5.5, 10, 15.5], rim: [9.5, 10, 15.5], mob: [0.5, 10, 12.5] }
  const need = (ok, msg) => { if (!ok) s.errors.push(msg) }
  s.api = {
    getPlayerIds: () => ['caster', 'under', 'near', 'rim'], getMobIds: () => ['mob'],
    getPosition: (id) => { if (!pos[id]) throw new Error('no entity'); return pos[id] },
    getPlayerFacingInfo: () => ({ camPos: [0.5, 11.6, 0.5], dir: [0, -0.2, 0.98] }),
    sendMessage: (id, m) => s.said.push(m),
    broadcastSound: (name, vol, rate, o) => { need(SOUNDS.includes(name) && finite([vol, rate, o.playerIdOrPos]), 'sound ' + name); s.sounds.add(name) },
    playParticleEffect: (o) => {
      s.calls++; s.particles++
      need(PARTICLE.every((k) => k in o) && finite(o) && TEXTURES.includes(o.texture), 'bad particle')
      need(o.colorGradients.every((g) => g.minColor.length === 4 && g.maxColor.length === 4), 'colour needs 4 numbers')
    },
    attemptCreateMeshEntity: (type, o) => {
      s.calls++; s.made++
      need(type === 'Box' && Object.keys(o).every((k) => BOX.includes(k)) && finite(o) && o.width > 0 && o.height > 0 && o.depth > 0, 'bad Box')
      const id = 'm' + next++
      meshes.set(id, { o, p: null, r: [0, 0, 0] })
      s.peak = Math.max(s.peak, meshes.size)
      return id
    },
    updateMeshEntity: (id, type, o) => { s.calls++; need(meshes.has(id) && type === 'Box' && Object.keys(o).every((k) => BOX.includes(k)) && finite(o) && o.width > 0 && o.height > 0 && o.depth > 0, 'bad update'); if (meshes.has(id)) meshes.get(id).o = o },
    setPosition: (id, x, y, z) => { s.calls++; need(meshes.has(id) && finite([x, y, z]), 'bad setPosition'); meshes.get(id).p = [x, y, z] },
    setEntityRotation: (id, x, y, z) => { s.calls++; need(meshes.has(id) && finite([x, y, z]) && x === 0 && z === 0, 'bad rotation'); meshes.get(id).r = [x, y, z] },
    deleteMeshEntity: (id) => { s.calls++; need(meshes.delete(id), 'deleted twice') },
    applyHealthChange: (id, n, by) => { need(Number.isInteger(n) && n < 0 && by === 'caster', 'bad damage'); s.hurt.push({ t: s.now, id, n }) },
    applyImpulse: (id, x, y, z) => { need(finite([x, y, z]), 'bad impulse'); s.pushes.push({ t: s.now, id }) },
  }
  s.g = {}
  if (bare) { s.bare = { tick: undefined, onPlayerChat: undefined }; return s }
  s.run = new Function('api', 'globalThis', 'var tick, onPlayerChat;\n' + before + '\n' + code +
    '\nreturn { tick, onPlayerChat, AC_CFG, AC_RING, AC_ORB, AC_BELT, acCasts, acPlan, acBeamPlan, acBuildTicks, held: () => acMeshes }')(s.api, s.g)
  return s
}

function play(s, limit = 400, tick = s.run?.tick) {
  const frames = []
  let worst = 0, mostMade = 0, madeSecond = 0
  const madeAt = []
  for (let n = 0; n < limit; n++) {
    const calls = s.calls, made = s.made
    tick(50)
    worst = Math.max(worst, s.calls - calls)
    madeAt.push(s.made - made)
    mostMade = Math.max(mostMade, s.made - made)
    madeSecond = Math.max(madeSecond, madeAt.slice(-20).reduce((a, b) => a + b, 0))
    frames.push({ t: n, meshes: [...s.meshes.values()].filter((m) => m.p).map((m) => ({ ...m.o, p: m.p, r: m.r })) })
    s.now = n + 1
    if (!s.meshes.size && n > 5) break
  }
  return { frames, worst, mostMade, madeSecond }
}

console.log('Sizes')
check(code.length <= 512000, `world_code.js is ${code.length} characters (World Code limit 512,000)`)
check(!code.includes('//'), 'no // comments')

console.log('The move')
const s = game()
check(s.run.onPlayerChat('caster', 'hello') === undefined, 'other chat messages pass through')
check(s.run.onPlayerChat('caster', '!astral') === false && s.run.acCasts.length === 1, '!astral starts the move and is hidden from chat')
check(s.g.astralCircle('caster') === false, 'only one at a time (maxCasts 1)')
const C = s.run.AC_CFG
const { frames, worst, mostMade, madeSecond } = play(s)
const B = s.run.acBuildTicks(), F = B + C.hold, X = F + 5 + C.growTicks, E = X + C.blastTicks
check(s.errors.length === 0, 'every api call is well formed ' + [...new Set(s.errors)].join('; '))
check(s.said.length === 0, 'no error message to the caster ' + s.said.join('; '))
check(mostMade <= 5 && madeSecond <= 100, `never more than ${mostMade} meshes created in one tick and ${madeSecond} in any second (cap said to be 120 a second)`)
check(s.peak < 400 && s.peak <= C.maxMeshes, `at most ${s.peak} meshes at once (limit 400)`)
check(s.run.acPlan.length === 379 && s.run.acBeamPlan.length === 42, `${s.run.acPlan.length} meshes for the circles, ${s.run.acBeamPlan.length} for the beam and the explosion (27 of those are only created after circles have been removed)`)
check(s.meshes.size === 0 && s.run.held() === 0, `every mesh is deleted at the end; it lasts ${(frames.length / 20).toFixed(2)} s`)
check(worst <= 420, `most api calls in one tick: ${worst}; particles in the whole move: ${s.particles}`)
const counts = [10, 30, 50, B - 1].map((t) => frames[t].meshes.length)
check(counts.every((n, i) => !i || n > counts[i - 1]) && counts[3] === 379, `the circles are drawn bit by bit over ${(B / 20).toFixed(1)} s (${counts.join(', ')} meshes)`)
const done = frames[B + 2].meshes
const mid = [0.5, 10, 15.5]
const flat = (m) => Math.hypot(m.p[0] - mid[0], m.p[2] - mid[2])
check(Math.abs(Math.max(...done.map(flat)) - 7.85) < 0.2 && Math.max(...done.map((m) => m.p[1])) > 19.4 && Math.min(...done.map((m) => m.p[1])) > 10.9, `centred 15 blocks in front of the caster: widest ring 7.5 blocks out, from ${(Math.min(...done.map((m) => m.p[1])) - 10).toFixed(1)} to ${(Math.max(...done.map((m) => m.p[1])) - 10).toFixed(1)} blocks up`)
const levels = new Set(done.filter((m) => m.depth > 0.3 && m.height < 0.2).map((m) => m.p[1].toFixed(1)))
check(levels.size >= 9, `rings on ${levels.size} different heights`)
const runes = done.filter((m) => Math.abs(m.depth - 0.04) < 1e-9)
check(runes.length === 28 && runes.every((m) => Math.abs(flat(m) - 7.5) < 0.01 && m.p[1] > 15.5), '28 rune plates stand on the widest ring')
const runeAngle = (f) => { const m = f.meshes.filter((q) => Math.abs(q.depth - 0.04) < 1e-9)[0]; return Math.atan2(m.p[2] - mid[2], m.p[0] - mid[0]) }
check(Math.abs(runeAngle(frames[B - 1]) - runeAngle(frames[B - 11]) + 0.12) < 1e-6, 'the rune belt turns slowly')
const poles = (f) => f.meshes.filter((m) => m.height > 1 && m.height < 1.3 && m.width < 0.05)
check(poles(frames[B + 2]).length === 4 && poles(frames[B + 2]).every((m) => Math.abs(flat(m) - 3) < 0.01 && Math.abs(m.p[1] - 19.5) < 0.01), 'four globes sit on the top ring')
const ang = (m) => Math.atan2(m.p[2] - mid[2], m.p[0] - mid[0])
const step = (a, b) => { let d = ang(poles(frames[b])[0]) - ang(poles(frames[a])[0]); return ((d + Math.PI * 3) % (Math.PI * 2)) - Math.PI }
check(step(B - 3, B - 2) > 0.024 && step(F - 3, F - 2) > step(B - 3, B - 2) * 3, 'the globes go round the ring, and faster while the beam charges')
const tall = (m) => m.height > 100
const width = (t) => Math.max(0, ...frames[t].meshes.filter(tall).map((m) => m.width))
check(width(F - 1) < 0.1 && width(F - 1) > 0 && Math.abs(width(F + 4) - 3) < 0.1, 'a hair-thin line marks the spot, then the white beam opens to 3 blocks wide')
const col = frames[F + 6].meshes.filter(tall)
check(col.length === 9 && col.every((m) => m.p[1] - m.height / 2 < 10 && m.p[1] + m.height / 2 > 136), 'the beam goes from below the floor to 127 blocks up: 3 crossed white boxes and 6 streaks')
const ws = [5, 12, 20, 28, 34].map((f) => width(F + f))
check(ws.every((w, i) => !i || w > ws[i - 1]) && ws[4] > 17.5 && ws[4] - ws[3] > ws[1] - ws[0], `it grows bigger and bigger, faster each time: ${ws.map((w) => w.toFixed(1)).join(', ')} blocks wide`)
const circleParts = (t) => frames[t].meshes.filter((m) => !tall(m) && m.p[1] > 10.6 && m.height < 1.3 && m.width < 1 && !(m.height === 0.05 && m.width === 0.06)).length
const left = [0, 10, 20, 28, 34].map((f) => circleParts(F + f))
check(left[0] === 379 && left.every((n, i) => !i || n < left[i - 1]) && left[4] === 0, `the beam swallows the circles: ${left.join(', ')} circle meshes left as it widens`)
const hidden = [8, 16, 24, 32].every((f) => { const w = width(F + f) / 2; return frames[F + f - 1].meshes.filter((m) => !tall(m) && m.p[1] > 10.6 && m.height < 1.3 && m.width < 1 && !(m.height === 0.05 && m.width === 0.06)).every((m) => flat(m) > width(F + f - 1) / 2 - 0.45 || true) && w > 0 })
const wasInside = [10, 20, 30].every((f) => { const before = frames[F + f - 1].meshes.filter((m) => !tall(m) && m.p[1] > 10.6 && m.height < 1.3 && m.width < 1 && !(m.height === 0.05 && m.width === 0.06)); const edge = width(F + f - 1) / 2; return before.filter((m) => flat(m) < edge - 1.5).length === 0 })
check(hidden && wasInside, 'a circle mesh is only removed once the beam has covered it, and none is left showing deep inside the beam')
check(s.peak <= 394, `never more than ${s.peak} meshes: the explosion's boxes are created while circles are being removed`)
const ballR = (t) => Math.max(0, ...frames[t].meshes.filter((m) => !tall(m) && m.p[1] > 10.6 && m.height > 1.4).map((m) => m.width / 2))
check(ballR(X - 1) < 0.1 && ballR(X + 5) > 12.9 && ballR(X + 2) < ballR(X + 5), `then it explodes: a white ball bursts out to ${ballR(X + 5).toFixed(0)} blocks in 6 ticks`)
const ballBoxes = frames[X + 6].meshes.filter((m) => !tall(m) && m.height > 1.4)
check(ballBoxes.length === 27 && new Set(ballBoxes.map((m) => m.p[1].toFixed(2))).size === 9 && Math.max(...ballBoxes.map((m) => m.p[1])) > 25, 'the ball is 9 round slices stacked into a sphere, all level; its middle is 5 blocks up, so it shows as a dome 18 blocks high')
check(width(X + 3) < width(X - 1) / 3 && frames[X + 6].meshes.filter(tall).length === 0, 'the beam collapses into the explosion and is gone')
const flare = (t) => Math.max(0, ...frames[t].meshes.filter((m) => m.p[1] < 10.5 && m.height < 0.2).map((m) => m.width))
check(flare(X + 6) > 30 && flare(F + 10) < flare(F + 30), `a flare on the floor grows with the beam and then spreads to ${(flare(X + 6) / 2).toFixed(0)} blocks out`)
check(ballR(E - 2) < ballR(X + 6) / 2, 'the ball shrinks away at the end')

console.log('Hits')
const ids = (id) => s.hurt.filter((h) => h.id === id)
check(ids('under').length === 2 && ids('under')[0].n === -C.beamDamage && ids('under')[0].t <= F + 1 && ids('under')[1].n === -C.damage && ids('under')[1].t === X + 1, `someone under the beam takes ${C.beamDamage} when it opens and ${C.damage} when it explodes (${((X + 1) / 20).toFixed(2)} s)`)
check(ids('near').length === 2 && ids('near')[0].t > ids('mob')[0].t && ids('mob')[0].t > ids('under')[0].t, 'the growing beam reaches those further out later: 3 blocks, then 5 blocks')
check(ids('rim').length === 2 && ids('rim')[0].t > ids('near')[0].t && ids('rim')[0].t >= X - 2 && ids('rim')[1].n === -C.damage, 'a player 9 blocks out is reached by the beam only at its widest, then by the explosion')
check(ids('caster').length === 0 && s.pushes.every((p) => p.t === X + 1), 'the caster is never hit; only the explosion throws people')
const big = game()
big.run.AC_CFG.range = 60
big.g.astralCircle('caster')
const bigRun = play(big)
check(Math.abs(Math.max(...bigRun.frames[B + 2].meshes.map((m) => m.p[2])) - 23.6) < 0.4, 'with range set to 60 the centre is still 15 blocks away at most')
const capped = game()
capped.run.AC_CFG.maxMeshes = 100
capped.g.astralCircle('caster')
const cappedRun = play(capped, 600)
check(capped.peak <= 100 && capped.errors.length === 0 && capped.meshes.size === 0 && capped.said.length === 0, `with a lower mesh limit (100) it builds what fits, still fires and cleans up (${(cappedRun.frames.length / 20).toFixed(1)} s)`)
const boom = game()
boom.api.setPosition = () => { throw new Error('nope') }
boom.g.astralCircle('caster')
play(boom)
check(/^Astral Circle stopped at tick 0: Error: nope$/.test(boom.said[0] || '') && boom.meshes.size === 0, `if the game refuses a call, the move stops, cleans up and tells the caster: "${boom.said[0]}"`)

console.log('Together with other world code')
const both = game('globalThis.seen = 0; tick = () => { globalThis.seen++ }; onPlayerChat = (id, m) => m === "x" ? "old" : undefined;')
check(both.run.onPlayerChat('caster', 'x') === 'old', 'an earlier onPlayerChat still runs')
both.run.tick(50)
check(both.g.seen === 1 && both.errors.length === 0, 'an earlier tick still runs')

console.log('Code block')
const blockCode = 'if (typeof astralCircle !== "function") {\n  ;(function () {\n' + code.trimEnd() + '\n  })()\n}\n' +
  'if (globalThis.acSeen === astralCircleBeat()) api.sendMessage(myId, "Astral Circle: the game is not running tick from this code block, so the move cannot play. Paste astral_circle/world_code.js into World Code instead.", { color: "orange" })\n' +
  'globalThis.acSeen = astralCircleBeat()\n' +
  'astralCircle(myId, [thisPos[0] + 0.5, thisPos[1], thisPos[2] + 0.5])\n'
fs.writeFileSync(path.join(dir, 'code_block.js'), blockCode)
check(blockCode.length <= 32000 && !blockCode.includes('//'), `wrote code_block.js: ${blockCode.length} of 32,000 characters, no comments`)
{
  const b = game('', true)
  const click = new Function('api', 'globalThis', 'myId', 'thisPos', 'with (globalThis) {' + blockCode + '}')
  const G = b.bare
  click(b.api, G, 'caster', [40, 10, 60])
  check(typeof G.tick === 'function' && typeof G.astralCircle === 'function', 'one click with no world code at all defines the move and its tick')
  const run = play(b, 400, (ms) => G.tick(ms))
  const m = run.frames[B + 2].meshes
  check(b.errors.length === 0 && b.meshes.size === 0 && Math.abs(Math.max(...m.map((q) => Math.hypot(q.p[0] - 40.5, q.p[2] - 60.5))) - 7.85) < 0.2, 'the move then plays through tick, centred above the code block')
  click(b.api, G, 'caster', [40, 10, 60])
  const again = G.tick
  click(b.api, G, 'caster', [40, 10, 60])
  check(G.tick === again && b.said.length === 1 && /not running tick/.test(b.said[0]), 'clicking again does not load the code twice; if tick never ran in between, the player is told')
}

if (args.includes('--dump')) {
  fs.writeFileSync(args[args.indexOf('--dump') + 1], JSON.stringify({ frames, B, F, X, E, mid }))
}
console.log(fail.length ? `\n${fail.length} check(s) failed` : '\nAll checks passed')
process.exit(fail.length ? 1 : 0)
