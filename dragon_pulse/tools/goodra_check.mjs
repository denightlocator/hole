// Builds Goodra against a stand-in for the game's `api`, checks it, and
// (with --dump file.json) writes its meshes for tools/render_model.py.
// Usage: node tools/goodra_check.mjs [--dump goodra.json]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const world = fs.readFileSync(path.join(dir, 'world_code.js'), 'utf8')
const model = fs.readFileSync(path.join(dir, 'goodra.js'), 'utf8')
const args = process.argv.slice(2)
const dumpAt = args.indexOf('--dump')
const fail = []
const check = (ok, msg) => { console.log((ok ? '  ok    ' : '  FAIL  ') + msg); if (!ok) fail.push(msg) }
const finite = (v) => (Array.isArray(v) ? v.every(finite) : Number.isFinite(v))

function game(code, limit = Infinity) {
  const meshes = new Map()
  const s = { meshes, messages: [], particles: 0, errors: [] }
  let next = 1
  s.api = {
    getPlayerIds: () => ['p'], getMobIds: () => [], getHeldItem: () => null, getBlock: () => 'Air',
    getPosition: () => [10.5, 20, 10.5],
    getPlayerFacingInfo: () => ({ camPos: [10.5, 21.6, 10.5], dir: [0.6, -0.2, 0.77] }),
    sendMessage: (id, m) => s.messages.push(m),
    broadcastSound: () => {}, playParticleEffect: () => { s.particles++ }, applyImpulse: () => {}, applyHealthChange: () => {},
    updateMeshEntity: () => {},
    attemptCreateMeshEntity: (type, o) => {
      if (meshes.size >= limit) return null
      if (type !== 'Box' || !finite([o.width, o.height, o.depth]) || !(o.width > 0 && o.height > 0 && o.depth > 0)) s.errors.push('bad Box')
      const id = 'm' + next++
      meshes.set(id, { o, p: null, r: [0, 0, 0] })
      return id
    },
    setPosition: (id, x, y, z) => { if (!meshes.has(id) || !finite([x, y, z])) s.errors.push('bad setPosition'); else meshes.get(id).p = [x, y, z] },
    setEntityRotation: (id, x, y, z) => { if (!meshes.has(id) || !finite([x, y, z])) s.errors.push('bad rotation'); else meshes.get(id).r = [x, y, z] },
    deleteMeshEntity: (id) => { if (!meshes.delete(id)) s.errors.push('deleted twice') },
  }
  s.g = {}
  s.run = new Function('api', 'globalThis', 'var tick, onPlayerChat, onPlayerAltAction;\n' + code +
    '\nreturn { tick: (ms) => tick(ms), chat: (m) => onPlayerChat("p", m), cfg: GOODRA_CFG, parts: goodraParts, mesh: GOODRA_MESH, state: () => goodra, casts: typeof dpCasts === "undefined" ? null : dpCasts }')(s.api, s.g)
  return s
}
const ticks = (s, n) => { for (let i = 0; i < n; i++) s.run.tick(50) }

console.log('Sizes')
check(model.length <= 32000, `goodra.js ${model.length} characters: fits World Code (512000) and a code block (32000)`)
check((world + '\n' + model).length <= 512000, `world_code.js + goodra.js ${(world + '\n' + model).length} of 512000 characters`)

console.log('Goodra on its own')
let s = game(model)
const rows = Object.entries(s.run.mesh).flatMap(([g, list]) => list.map((r) => g + '.' + r[0]))
check(new Set(rows).size === rows.length, `${rows.length} rows in ${Object.keys(s.run.mesh).length} groups, every name used once`)
const counts = [1, 2, 3].map((d) => { s.run.cfg.detail = d; return s.run.parts().length })
console.log(`  detail 1, 2, 3: ${counts.join(', ')} meshes`)
check(counts.join() === '51,92,125', 'the counts are the ones the README gives')
check(s.run.chat('hello') === undefined, 'other chat messages pass through')
check(s.run.chat('!goodra') === false, '!goodra is taken and hidden from chat')
ticks(s, 1)
check(s.meshes.size === s.run.cfg.perTick, `it is built ${s.run.cfg.perTick} meshes per tick`)
ticks(s, 40)
check(s.meshes.size === counts[2] && s.errors.length === 0, `all ${counts[2]} meshes are made, every call well formed ${[...new Set(s.errors)].join('; ')}`)
const all = [...s.meshes.values()]
const ys = all.map((m) => m.p[1] - m.o.height / 2)
check(Math.min(...ys) > 20 - 0.05, `nothing is under the ground (lowest ${(Math.min(...ys) - 20).toFixed(2)})`)
console.log(`  stands ${(Math.max(...all.map((m) => m.p[1] + m.o.height / 2)) - 20).toFixed(2)} blocks tall at scale ${s.run.cfg.scale}`)
if (dumpAt >= 0) {
  s.run.cfg.scale = 1; s.run.chat('!goodra'); ticks(s, 40)
  fs.writeFileSync(args[dumpAt + 1], JSON.stringify([...s.meshes.values()].map((m) => ({ ...m.o, p: m.p.map((v, i) => v - [10.5, 20, 10.5][i]), r: m.r }))))
}
s.run.chat('!goodra off')
check(s.meshes.size === 0, '!goodra off deletes every mesh')
s.run.chat('!goodra pulse')
check(s.messages.length === 1, 'pulse without a Goodra says what to do')

console.log('Mesh limit of 50')
s = game(model, 50)
s.run.chat('!goodra'); ticks(s, 40)
check(s.meshes.size === 50 && s.messages.length === 1, 'it stops at the limit and tells the player once')

console.log('Without mesh turning')
s = game(model)
s.run.cfg.rotate = false
s.run.chat('!goodra'); ticks(s, 40)
check(all.length === s.meshes.size && [...s.meshes.values()].every((m) => m.r.every((v) => v === 0)), 'no mesh is turned')

console.log('Below world_code.js')
s = game(world + '\n' + model)
check(s.run.chat('!dp') === false && s.run.casts.length === 1, '!dp still casts')
ticks(s, 200)
check(s.run.casts.length === 0 && s.meshes.size === 0, 'the cast runs to its end')
s.run.chat('!goodra'); ticks(s, 60)
const before = s.particles
check(s.run.chat('!goodra pulse') === false && s.run.casts.length === 1, 'Goodra fires Dragon Pulse')
ticks(s, 3)
check(s.particles > before, 'the circle appears')
ticks(s, 200)
check(s.meshes.size === counts[2], 'after the move only Goodra is left')

if (fail.length) { console.log(`\n${fail.length} check(s) failed`); process.exit(1) }
console.log('\nAll checks passed')
