// Runs world_code.js against a stand-in for the game's `api`.
// Checks the size limits, that nothing throws, and that every mesh is deleted.
// Usage: node tools/sim.mjs [--target] [--dump frames.json]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const WORLD_LIMIT = 512000
const BLOCK_LIMIT = 32000
const world = fs.readFileSync(path.join(dir, 'world_code.js'), 'utf8')
const block = fs.readFileSync(path.join(dir, 'code_block.js'), 'utf8')

const args = process.argv.slice(2)
const withTarget = args.includes('--target')
const dumpAt = args.indexOf('--dump')

const ALLOWED_BOX = ['width', 'height', 'depth', 'diffuseColor', 'emissiveColor', 'autoRotate', 'hideDist']
const PARTICLE = ['dir1', 'dir2', 'pos1', 'pos2', 'texture', 'minLifeTime', 'maxLifeTime', 'minEmitPower',
  'maxEmitPower', 'minSize', 'maxSize', 'manualEmitCount', 'gravity', 'colorGradients', 'velocityGradients', 'blendMode']
const TEXTURES = ['arrow', 'bubble', 'critical_hit', 'drift', 'effect_5', 'fishingFishSilhouette', 'generic_2',
  'glint', 'heart', 'scary_face', 'soul_0', 'square_particle', 'z-particle']
const finite = (v) => (Array.isArray(v) ? v.every(finite) : typeof v === 'object' && v ? Object.values(v).every(finite) : typeof v !== 'number' || Number.isFinite(v))

function makeApi() {
  const meshes = new Map()
  let next = 1
  const s = { meshes, calls: 0, particles: [], peak: 0, hurt: [], messages: [], errors: [] }
  const pos = { caster: [0.5, 10, 0.5], dummy: [3.5, 12, 30.5] }
  const need = (ok, msg) => { if (!ok) s.errors.push(msg) }
  s.api = {
    getPlayerIds: () => (withTarget ? ['caster', 'dummy'] : ['caster']),
    getMobIds: () => [],
    getPosition: (id) => {
      if (id === 'dummy') pos.dummy = [pos.dummy[0] + 0.12, pos.dummy[1], pos.dummy[2]] // it walks
      if (!pos[id]) throw new Error('no entity ' + id)
      return pos[id]
    },
    getPlayerFacingInfo: () => ({ camPos: [0.5, 11.6, 0.5], dir: [0.1, 0.12, 0.99] }),
    raycastForBlock: () => null,
    getHeldItem: () => null,
    sendMessage: (id, m) => s.messages.push(m),
    broadcastSound: () => { s.calls++ },
    attemptCreateMeshEntity: (type, o) => {
      s.calls++
      need(type === 'Box', 'mesh type ' + type)
      need(Object.keys(o).every((k) => ALLOWED_BOX.includes(k)), 'unknown Box option')
      need(finite(o) && o.width > 0 && o.height > 0 && o.depth > 0, 'bad Box size')
      const id = 'm' + next++
      meshes.set(id, { o, p: null, r: null })
      s.peak = Math.max(s.peak, meshes.size)
      return id
    },
    updateMeshEntity: (id, type, o) => { s.calls++; need(meshes.has(id), 'update of a deleted mesh'); meshes.get(id).o = o },
    setPosition: (id, x, y, z) => { s.calls++; need(meshes.has(id) && finite([x, y, z]), 'bad setPosition'); meshes.get(id).p = [x, y, z] },
    setEntityRotation: (id, x, y, z) => { s.calls++; need(meshes.has(id) && finite([x, y, z]), 'bad rotation'); meshes.get(id).r = [x, y, z] },
    deleteMeshEntity: (id) => { s.calls++; need(meshes.delete(id), 'deleted twice') },
    playParticleEffect: (o) => {
      s.calls++
      need(PARTICLE.every((k) => k in o), 'particle option missing')
      need(finite(o), 'particle option is not a number')
      need(TEXTURES.includes(o.texture), 'texture ' + o.texture)
      need(o.colorGradients.every((g) => g.minColor.length === 4 && g.maxColor.length === 4), 'colour needs 4 numbers')
      s.particles.push(o)
    },
    applyImpulse: (id, x, y, z) => s.hurt.push(['push', id, x, y, z]),
    applyHealthChange: (id, n) => { need(Number.isInteger(n), 'damage must be an integer'); s.hurt.push(['hp', id, n]) },
  }
  return s
}

const s = makeApi()
const g = {}
// world code assigns tick = ..., so give it those names to assign to
const game = new Function('api', 'globalThis', 'var tick, onPlayerChat, onPlayerAltAction;\n' + world +
  '\nreturn { tick, onPlayerChat, onPlayerAltAction, dpCasts, held: () => dpMeshes }')(s.api, g)

const fail = []
const check = (ok, msg) => { console.log((ok ? '  ok    ' : '  FAIL  ') + msg); if (!ok) fail.push(msg) }

console.log('Sizes')
check(world.length <= WORLD_LIMIT, `world_code.js ${world.length} of ${WORLD_LIMIT} characters`)
check(block.length <= BLOCK_LIMIT, `code_block.js ${block.length} of ${BLOCK_LIMIT} characters`)
check(world.length <= BLOCK_LIMIT, `world_code.js would also fit a code block (${world.length} of ${BLOCK_LIMIT})`)

console.log('Cast' + (withTarget ? ' at a walking target' : ' at nothing'))
check(game.onPlayerChat('caster', 'hello') === undefined, 'other chat messages pass through')
check(game.onPlayerChat('caster', '!dp') === false, '!dp starts the move and is hidden from chat')
check(typeof g.dragonPulse === 'function', 'dragonPulse is reachable from code blocks')
const frames = []
let ticks = 0
let worst = 0
let phases = []
while (game.dpCasts.length && ticks < 400) {
  const c = game.dpCasts[0]
  const before = s.calls
  const ph = c.ph
  game.tick(50)
  worst = Math.max(worst, s.calls - before)
  if (phases[phases.length - 1]?.ph !== ph) phases.push({ ph, from: ticks })
  frames.push({ t: ticks, ph, meshes: [...s.meshes.values()].map((m) => ({ ...m.o, p: m.p, r: m.r })), fx: s.particles.splice(0) })
  ticks++
}
check(ticks < 400, `the move ends by itself (${ticks} ticks, ${(ticks / 20).toFixed(2)} s)`)
check(s.errors.length === 0, 'every api call is well formed' + (s.errors.length ? ': ' + [...new Set(s.errors)].join('; ') : ''))
check(s.meshes.size === 0 && game.held() === 0, 'every mesh is deleted at the end')
check(s.peak <= 70, `most meshes at once: ${s.peak}`)
check(worst <= 120, `most api calls in one tick: ${worst}`)
check(game.onPlayerChat('caster', '!dp') === false && game.dpCasts.length === 0 && s.messages.length === 1, 'cooldown holds a second cast back')
if (withTarget) check(s.hurt.some((h) => h[0] === 'hp' && h[1] === 'dummy' && h[2] < 0), 'the target is hurt: ' + JSON.stringify(s.hurt.filter((h) => h[0] === 'hp')))
else check(s.hurt.length === 0, 'the caster is not hurt')
console.log('Phases: ' + phases.map((p) => ['charge', 'beams', 'dragon', 'coil', 'blast', 'smoke'][p.ph] + ' @' + (p.from / 20).toFixed(2) + 's').join(', '))

if (dumpAt >= 0) fs.writeFileSync(args[dumpAt + 1], JSON.stringify(frames))
if (fail.length) { console.log(`\n${fail.length} check(s) failed`); process.exit(1) }
console.log('\nAll checks passed')
