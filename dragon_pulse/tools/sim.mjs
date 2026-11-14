// Runs world_code.js against a stand-in for the game's `api`.
// Checks the size limits, that nothing throws, and that every mesh is deleted.
// Usage: node tools/sim.mjs [--target] [--merge] [--dump frames.json]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const WORLD_LIMIT = 512000
const BLOCK_LIMIT = 32000
const world = fs.readFileSync(path.join(dir, 'world_code.js'), 'utf8')
const block = fs.readFileSync(path.join(dir, 'code_block.js'), 'utf8')

const args = process.argv.slice(2)
const withTarget = args.includes('--target') // a mob walks about, not where the caster looks
const dumpMerge = args.includes('--merge') // --dump records the two dragons that merge
const dumpAt = args.indexOf('--dump')
const NAMES = ['circle', 'emerge', 'seek', 'dive', 'coil', 'blast', 'smoke', 'mega', 'nuke', 'cloud']

const ALLOWED_BOX = ['width', 'height', 'depth', 'diffuseColor', 'emissiveColor', 'autoRotate', 'hideDist']
const PARTICLE = ['dir1', 'dir2', 'pos1', 'pos2', 'texture', 'minLifeTime', 'maxLifeTime', 'minEmitPower',
  'maxEmitPower', 'minSize', 'maxSize', 'manualEmitCount', 'gravity', 'colorGradients', 'velocityGradients', 'blendMode']
const TEXTURES = ['arrow', 'bubble', 'critical_hit', 'drift', 'effect_5', 'fishingFishSilhouette', 'generic_2',
  'glint', 'heart', 'scary_face', 'soul_0', 'square_particle', 'z-particle']
// names from SOUNDS_AND_MUSIC.md of the official docs
const SOUNDS = ['ominousBellHit', 'magicAccent2', 'harp_pling', 'lowDrum1', 'suspenseRiser', 'gorillaRoar1', 'hauntedHorrorImpact', 'bigDrumSwish1',
  'bearRoar3', 'sonarBeep', 'drumSwish1', 'zapAccent2', 'firecracker1', 'cannonFire2', 'bassattack', 'futureStrangePulse', 'zapAccent1',
  'cannonFire1', 'cannonFire3', 'lowDrum3']
const finite = (v) => (Array.isArray(v) ? v.every(finite) : typeof v === 'object' && v ? Object.values(v).every(finite) : typeof v !== 'number' || Number.isFinite(v))

function makeApi(mob) {
  const meshes = new Map()
  let next = 1
  const s = { meshes, calls: 0, particles: [], peak: 0, hurt: [], messages: [], errors: [], dead: [], sounds: new Set(), looks: new Set(), refused: 0, hung: 0, hurtAt: [], now: 0 }
  const pos = { caster: [0.5, 10, 0.5], other: [20.5, 10, 0.5], dummy: [-14.5, 10, 12.5] }
  const eyes = { caster: { camPos: [0.5, 11.6, 0.5], dir: [0.1, 0.12, 0.99] }, other: { camPos: [20.5, 11.6, 0.5], dir: [-0.1, 0.1, 0.99] } }
  const need = (ok, msg) => { if (!ok) s.errors.push(msg) }
  s.api = {
    getPlayerIds: () => ['caster', 'other'].filter((id) => !s.dead.includes(id)),
    getMobIds: () => (mob && !s.dead.includes('dummy') ? ['dummy'] : []),
    getBlock: (x, y, z) => { need(Number.isInteger(x + y + z), 'getBlock needs whole numbers'); return y < 10 ? 'Grass Block' : 'Air' },
    getPosition: (id) => {
      if (id === 'dummy') pos.dummy = [pos.dummy[0] + 0.04, pos.dummy[1], pos.dummy[2]] // it walks
      if (!pos[id] || s.dead.includes(id)) throw new Error('no entity ' + id)
      return pos[id]
    },
    getPlayerFacingInfo: (id) => eyes[id],
    getHeldItem: () => null,
    sendMessage: (id, m) => s.messages.push(m),
    broadcastSound: (name, vol, rate, o) => { s.calls++; need(SOUNDS.includes(name), 'sound ' + name); need(vol >= 0 && vol <= 1 && rate > 0 && finite(o.playerIdOrPos), 'bad sound'); s.sounds.add(name) },
    attemptCreateMeshEntity: (type, o) => {
      s.calls++
      if (meshes.size >= 399) { s.refused++; return null } // the limit: under 400
      need(type === 'Box' || type === 'Person', 'mesh type ' + type)
      if (type === 'Box') {
        need(Object.keys(o).every((k) => ALLOWED_BOX.includes(k)), 'unknown Box option')
        need(finite(o) && o.width > 0 && o.height > 0 && o.depth > 0, 'bad Box size')
      }
      const id = 'm' + next++
      meshes.set(id, { o: type === 'Box' ? o : { width: 0.05, height: 0.05, depth: 0.05 }, p: null, r: null, hung: [] })
      s.peak = Math.max(s.peak, meshes.size)
      return id
    },
    updateMeshEntity: (id, type, o) => { s.calls++; need(meshes.has(id), 'update of a deleted mesh'); meshes.get(id).o = o },
    setPosition: (id, x, y, z) => { s.calls++; need(meshes.has(id) && finite([x, y, z]), 'bad setPosition'); meshes.get(id).p = [x, y, z] },
    setEntityRotation: (id, x, y, z) => { s.calls++; need(meshes.has(id) && finite([x, y, z]), 'bad rotation'); meshes.get(id).r = [x, y, z] },
    // node meshes: kept on the entity they hang on, and gone when it is deleted
    updateEntityNodeMeshAttachment: (id, node, type, o, off, rot) => {
      s.calls++
      need(meshes.has(id) && node === 'TorsoNode' && type === 'Box', 'bad node mesh')
      need(Object.keys(o).every((k) => ALLOWED_BOX.includes(k)) && finite([o, off, rot]) && o.width > 0 && o.height > 0 && o.depth > 0 && off.length === 3 && rot.length === 3, 'bad node mesh option')
      if (meshes.has(id)) meshes.get(id).hung.push({ o, off, rot })
      s.hung++
    },
    deleteMeshEntity: (id) => { s.calls++; need(meshes.delete(id), 'deleted twice') },
    playParticleEffect: (o) => {
      s.calls++
      need(PARTICLE.every((k) => k in o), 'particle option missing')
      need(finite(o), 'particle option is not a number')
      need(TEXTURES.includes(o.texture), 'texture ' + o.texture)
      need(o.colorGradients.every((g) => g.minColor.length === 4 && g.maxColor.length === 4), 'colour needs 4 numbers')
      s.looks.add([o.minLifeTime, o.maxLifeTime].map((v) => +(v / 0.6).toFixed(2)).join(','))
      s.particles.push(o)
    },
    applyImpulse: (id, x, y, z) => { need(finite([x, y, z]), 'bad impulse'); s.hurt.push(['push', id]) },
    applyHealthChange: (id, n) => { need(Number.isInteger(n), 'damage must be an integer'); s.hurt.push(['hp', id, n]) },
    killLifeform: (id) => { s.hurtAt.push(s.now); s.hurt.push(['kill', id]); s.dead.push(id) },
  }
  return s
}

function load(mob) {
  const s = makeApi(mob)
  const g = {}
  // world code assigns tick = ..., so give it those names to assign to
  const game = new Function('api', 'globalThis', 'var tick, onPlayerChat, onPlayerAltAction;\n' + world +
    '\nreturn { tick, onPlayerChat, onPlayerAltAction, dpCasts, DP_CFG, held: () => dpMeshes }')(s.api, g)
  return { s, g, game }
}

// Where a node mesh is in the world: its offset turned by the entity it hangs on (pitch, then yaw).
function place(m, off) {
  const [rx, ry] = m.r || [0, 0]
  const y = off[1] * Math.cos(rx) - off[2] * Math.sin(rx)
  const z = off[1] * Math.sin(rx) + off[2] * Math.cos(rx)
  return [m.p[0] + off[0] * Math.cos(ry) + z * Math.sin(ry), m.p[1] + y, m.p[2] - off[0] * Math.sin(ry) + z * Math.cos(ry)]
}

// Runs until every cast has ended; returns one record per tick.
function run({ s, game }, limit = 600) {
  const frames = []
  let worst = 0
  while (game.dpCasts.length && frames.length < limit) {
    const before = s.calls
    s.now = frames.length
    const ph = Math.max(...game.dpCasts.map((c) => c.ph))
    game.tick(50)
    worst = Math.max(worst, s.calls - before)
    frames.push({ t: frames.length, ph, casts: game.dpCasts.length, meshes: [...s.meshes.values()].flatMap((m) => [{ ...m.o, p: m.p, r: m.r }, ...m.hung.map((h) => ({ ...h.o, p: place(m, h.off), r: [(m.r?.[0] || 0) + h.rot[0], (m.r?.[1] || 0) + h.rot[1], 0], node: true }))]), entities: s.meshes.size, fx: s.particles.splice(0) })
  }
  return { frames, worst }
}
const phases = (frames) => frames.filter((f, i) => !i || frames[i - 1].ph !== f.ph).map((f) => NAMES[f.ph] + ' @' + (f.t / 20).toFixed(2) + 's').join(', ')
const ys = (f) => f.meshes.filter((m) => m.p).map((m) => m.p[1])
const of = (frames, ph) => frames.filter((f) => f.ph === ph)

const fail = []
const check = (ok, msg) => { console.log((ok ? '  ok    ' : '  FAIL  ') + msg); if (!ok) fail.push(msg) }

console.log('Sizes')
check(world.length <= WORLD_LIMIT, `world_code.js ${world.length} of ${WORLD_LIMIT} characters`)
check(block.length <= BLOCK_LIMIT, `code_block.js ${block.length} of ${BLOCK_LIMIT} characters`)
check(!/\/\/|\/\*/.test(world), 'world_code.js has no comments')

console.log('One cast' + (withTarget ? ' with a mob walking nearby' : ' with only another player around'))
const one = load(withTarget)
check(one.game.onPlayerChat('caster', 'hello') === undefined, 'other chat messages pass through')
check(one.game.onPlayerChat('caster', '!dp') === false, '!dp starts the move and is hidden from chat')
check(typeof one.g.dragonPulse === 'function', 'dragonPulse is reachable from code blocks')
const a = run(one)
const F = a.frames
const circle = of(F, 0)
const flat = circle[circle.length - 1]
check(flat.meshes.length === 124 && Math.max(...ys(flat)) < 18 && Math.min(...ys(flat)) > 10, `the summoning circle stands on the floor (${flat.meshes.length} meshes, ${(circle.length / 20).toFixed(2)} s)`)
const out = of(F, 1)
check(out[0].t >= 40, `the dragon comes out after ${(out[0].t / 20).toFixed(2)} s`)
check(Math.min(...ys(out[2])) < 10 && Math.max(...ys(out[out.length - 1])) > 10 + 14, `it comes up through the floor and dashes ${(Math.max(...ys(out[out.length - 1])) - 10).toFixed(1)} blocks into the air`)
check(of(F, 2).length >= 10, `it circles up there while it finds a target (${(of(F, 2).length / 20).toFixed(2)} s)`)
const dive = of(F, 3)
check(dive.length > 5 && dive[0].meshes[0].p[1] - dive[dive.length - 1].meshes[0].p[1] > 8, `it dives (${(dive[0].meshes[0].p[1] - dive[dive.length - 1].meshes[0].p[1]).toFixed(1)} blocks down)`)
const victim = withTarget ? 'dummy' : 'other'
check(one.s.hurt.some((h) => h[0] === 'kill' && h[1] === victim), `the target (${victim}) is killed: ` + JSON.stringify(one.s.hurt.filter((h) => h[0] !== 'push')))
check(!one.s.hurt.some((h) => h[1] === 'caster'), 'the caster is not hurt')
check(F.length < 600, `the move ends by itself (${(F.length / 20).toFixed(2)} s)`)
check(one.s.errors.length === 0, 'every api call is well formed' + (one.s.errors.length ? ': ' + [...new Set(one.s.errors)].join('; ') : ''))
check(one.s.meshes.size === 0 && one.game.held() === 0, 'every mesh is deleted at the end')
check(one.s.sounds.size >= 14, `${one.s.sounds.size} different sounds play, all of them names from the documentation`)
check(one.s.peak < 400 && one.s.refused === 0, `under 400 meshes at once: at most ${one.s.peak}, and none was refused`)
check(a.worst <= 350, `most api calls in one tick: ${a.worst}`)
console.log('  Phases: ' + phases(F))

console.log('Two dragons that meet')
const two = load(true)
two.game.onPlayerChat('caster', '!dp')
for (let i = 0; i < 3; i++) two.game.tick(50)
two.game.onPlayerChat('other', '!dp')
check(two.game.dpCasts.length === 2 && two.s.messages.length === 0, 'there is no cooldown: two casts run together')
const b = run(two)
const M = b.frames
const mega = of(M, 7)
check(mega.length > 0 && mega[0].casts === 1, `they merge into one dragon at ${((mega[0]?.t + 3) / 20).toFixed(2)} s`)
const big = Math.max(...mega[mega.length - 1].meshes.map((m) => m.width))
check(big > 3, `the merged dragon is ${two.game.DP_CFG.megaScale} times the size (skull ${big.toFixed(1)} blocks wide)`)
check(Math.max(...ys(mega[mega.length - 1])) - Math.max(...ys(mega[0])) > 12, `it climbs ${(Math.max(...ys(mega[mega.length - 1])) - Math.max(...ys(mega[0]))).toFixed(1)} blocks`)
const nuke = of(M, 8)
const fly = of(F, 3)
const last = fly[fly.length - 1]
check(last.meshes.length === 113 + 30 && one.s.looks.has('1,1.6'), `cloud orbs and a tapering trail follow the dragon (${last.meshes.length - 113} more meshes) with particles that fade`)
const tall = (f) => Math.max(0, ...f.meshes.map((m) => m.height))
const bl = of(F, 5)
check(tall(bl[0]) < tall(bl[4]) && tall(bl[9]) > 40 && bl[9].meshes.length === 10, `a fast beam shoots ${tall(bl[9]).toFixed(0)} blocks up in ${(10 / 20).toFixed(2)} s`)
check(bl[10].meshes.length === 18 && bl[25].meshes.length === 18 && bl[26].meshes.length === 28 && !one.s.hurtAt.some((t) => t < bl[26].t), `a second beam joins it, waits ${(16 / 20).toFixed(2)} s, then explodes; nobody is hurt before that`)
check(nuke[11].meshes.length === 10 && tall(nuke[11]) > 50 && nuke[12].meshes.length === 18 && nuke[31].meshes.length === 28, `the nuke is a beam too (${tall(nuke[11]).toFixed(0)} blocks tall), with a second beam that waits before it explodes`)
const widest = Math.max(...nuke.flatMap((f) => f.meshes.filter((m) => m.height > 20).map((m) => m.width)))
check(widest > 10 && !M.some((f) => f.meshes.some((m) => m.width > 12 && m.height > 12 && m.depth > 12)), `the nuke is a beam ${widest.toFixed(1)} blocks thick with a ring on the ground, and there is no fireball`)
check(two.s.hurt.some((h) => h[0] === 'kill' && h[1] === 'dummy'), 'the nuke kills the mob under it')
check(!two.s.hurt.some((h) => h[1] === 'caster' || h[1] === 'other'), 'neither caster is hurt')
check(two.s.errors.length === 0, 'every api call is well formed' + (two.s.errors.length ? ': ' + [...new Set(two.s.errors)].join('; ') : ''))
check(two.game.dpCasts.length === 0 && two.s.meshes.size === 0 && two.game.held() === 0, 'it ends and every mesh is deleted')
check(two.s.peak < 400 && two.s.refused === 0, `two dragons together stay under 400 meshes: at most ${two.s.peak}, and none was refused`)
check(b.worst <= 580, `most api calls in one tick: ${b.worst}`)
console.log('  Phases: ' + phases(M))

console.log('Node meshes (!dp nodes box)')
const nd = load(withTarget)
check(nd.game.onPlayerChat('caster', '!dp nodes box') === false && nd.game.DP_CFG.nodes === 'box' && nd.s.messages.length === 1, '!dp nodes box turns them on and says so')
nd.game.onPlayerChat('caster', '!dp')
const c = run(nd)
const N = c.frames
const nc = of(N, 0)
const nflat = nc[nc.length - 1]
check(nflat.entities === 9 && nflat.meshes.length === 124 + 9, `the circle is ${nflat.entities} mesh entities carrying ${nflat.meshes.length - nflat.entities} node meshes`)
const same = (a, b) => a.every((m) => b.some((o) => Math.hypot(...m.p.map((v, i) => v - o.p[i])) < 0.02 && Math.abs(m.width - o.width) < 1e-6))
check(same(flat.meshes, nflat.meshes), 'every piece is where the mesh-entity circle has it')
const nfly = of(N, 3)
const nlast = nfly[nfly.length - 1]
check(nlast.entities === 143 - 55 + 1, `the dragon is ${nlast.entities} mesh entities: its 55-part head is one entity`)
const headAt = (f) => f.meshes.filter((m) => m.width > 1.39 && m.width < 1.41 && m.depth > 1.39 && m.depth < 1.41)[0]
check(Math.hypot(...headAt(nlast).p.map((v, i) => v - headAt(last).p[i])) < 0.02 && same(last.meshes, nlast.meshes), 'the head sits and points the same as without node meshes')
check(nd.s.errors.length === 0 && nd.s.meshes.size === 0 && nd.game.held() === 0, 'every call is well formed and everything is deleted at the end' + [...new Set(nd.s.errors)].join('; '))
console.log(`  most mesh entities at once: ${nd.s.peak} (without node meshes ${one.s.peak}); node meshes attached: ${nd.s.hung}; most api calls in one tick: ${c.worst}`)
check(nd.game.onPlayerChat('caster', '!dp nodes off') === false && nd.game.DP_CFG.nodes === '', '!dp nodes off goes back to mesh entities')

if (dumpAt >= 0) fs.writeFileSync(args[dumpAt + 1], JSON.stringify(args.includes('--nodes') ? N : dumpMerge ? M : F))
if (fail.length) { console.log(`\n${fail.length} check(s) failed`); process.exit(1) }
console.log('\nAll checks passed')
