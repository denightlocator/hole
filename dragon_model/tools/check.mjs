// Stand-in game test for the dragon model. Run: node tools/check.mjs [--dump frames.json]
// It also runs code_block.js: the block builds the same dragon on a click.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const code = fs.readFileSync(path.join(dir, 'world_code.js'), 'utf8')
const blockCode = fs.readFileSync(path.join(dir, 'code_block.js'), 'utf8')
const args = process.argv.slice(2)
const BOX = ['width', 'height', 'depth', 'diffuseColor', 'emissiveColor', 'hideDist']
const finite = (v) => (Array.isArray(v) ? v.every(finite) : typeof v === 'object' && v ? Object.values(v).every(finite) : typeof v !== 'number' || Number.isFinite(v))
const fail = []
const check = (ok, msg) => {
  console.log((ok ? '  ok    ' : '  FAIL  ') + msg)
  if (!ok) fail.push(msg)
}

function game(opts = {}) {
  const meshes = new Map()
  let next = 1
  const s = { meshes, now: 0, errors: [], said: [], peak: 0, calls: 0, look: [1, -0.2, 0] }
  s.where = { p1: [0.5, 10, 0.5], p2: [20.5, 10, 0.5] }
  const need = (ok, msg) => {
    if (!ok) s.errors.push(msg)
  }
  s.api = {
    getPosition: (id) => s.where[id],
    getPlayerFacingInfo: () => ({ camPos: [0, 0, 0], dir: s.look }),
    sendMessage: (id, message) => s.said.push(message),
    attemptCreateMeshEntity: (type, o) => {
      s.calls++
      need(type === 'Box' && Object.keys(o).every((k) => BOX.includes(k)) && finite(o) && o.width > 0 && o.height > 0 && o.depth > 0, 'bad mesh options')
      need(Array.isArray(o.emissiveColor) && o.emissiveColor.length === 3 && o.emissiveColor.every((v) => v >= 0 && v <= 255), 'bad colour')
      if (opts.refuse && meshes.size >= 380) return null
      const id = 'm' + next++
      meshes.set(id, { o, p: null, r: [0, 0, 0] })
      s.peak = Math.max(s.peak, meshes.size)
      need(meshes.size <= 400, 'over the 400 mesh limit')
      return id
    },
    setPosition: (id, x, y, z) => {
      s.calls++
      need(finite([x, y, z]) && meshes.has(id), 'bad setPosition')
      if (meshes.has(id)) meshes.get(id).p = [x, y, z]
    },
    setEntityRotation: (id, x, y, z) => {
      s.calls++
      need(meshes.has(id) && finite([x, y, z]) && x === 0 && z === 0, 'a mesh was tilted: only turning left or right is allowed')
      if (meshes.has(id)) meshes.get(id).r = [x, y, z]
    },
    deleteMeshEntity: (id) => {
      s.calls++
      need(meshes.delete(id), 'a mesh was deleted twice')
    },
  }
  s.run = new Function('api', 'globalThis', 'var tick, onPlayerChat, onPlayerClick;' + code + 'return { tick, onPlayerChat, dragonList, dragonPlan, dragonShow }')(s.api, s.g || (s.g = {}))
  return s
}

function play(s, ticks) {
  const frames = []
  let worst = 0
  for (let n = 0; n < ticks; n++) {
    const calls = s.calls
    s.run.tick(50)
    worst = Math.max(worst, s.calls - calls)
    frames.push([...s.meshes.entries()].filter((e) => e[1].p).map(([id, m]) => ({ id, p: m.p, r: m.r[1], o: m.o })))
    s.now++
  }
  return { frames, worst }
}

const total = 105
const sizeOf = (m) => [m.o.width, m.o.height, m.o.depth]
const round = (v) => Math.round(v * 1000) / 1000

console.log('Building it')
const s = game()
check(s.run.onPlayerChat('p1', 'hello') === undefined && s.run.onPlayerChat('p1', '!dragon') === false, '!dragon is hidden from chat and starts it')
const run = play(s, 18)
check(s.errors.length === 0, 'every api call is well formed and no mesh is ever tilted (' + [...new Set(s.errors)].join('; ') + ')')
check(run.frames[17].length === total && run.frames[8].length > 0 && run.frames[8].length < total, `it builds itself in 18 ticks, six boxes a tick, so it grows instead of popping: ${run.frames[8].length} boxes after 9 ticks, ${run.frames[17].length} at the end`)
const plan = s.run.dragonPlan
check(plan.length === total && plan.every((part) => part.wide > 0 && part.tall > 0 && part.deep > 0 && part.col in { body: 1, dark: 1, belly: 1, wing: 1, bone: 1, eye: 1, spike: 1 }), `${total} boxes: body, belly plates, neck, head, wings, legs, tail and spine spikes`)
check(plan.filter((p) => p.tag === 'wing').length === 32 && plan.filter((p) => p.tag === 'tail').length === 12 && plan.filter((p) => p.tag === 'head').length === 16, '32 move as wings, 12 as the tail and 16 as the head')

console.log('Where it stands')
const dragon = run.frames[17]
const far = Math.min(...dragon.map((m) => Math.hypot(m.p[0] - 0.5, m.p[2] - 0.5)))
const widest = Math.max(...dragon.map((m) => Math.hypot(m.p[0] - 0.5, m.p[2] - 0.5)))
const tallest = Math.max(...dragon.map((m) => m.p[1] + m.o.height / 2)) - 10
check(far > 2 && widest < 12.5 && tallest > 2.9 && tallest < 3.6, `it stands 6.5 blocks in front of the player, ${round(tallest)} blocks tall and ${Math.round(far)} to ${Math.round(widest)} blocks away`)
check(dragon.every((m) => m.p[1] - m.o.height / 2 >= 9.98), 'no box sinks below the floor')
const headAt = dragon.filter((m) => m.o.emissiveColor.join() === '255,206,96')
check(headAt.length === 2 && headAt.every((m) => Math.hypot(m.p[0] - 0.5, m.p[2] - 0.5) < far + 0.5), 'it faces the player: both glowing eyes are on the nearest side')
const mirrorPairs = plan.filter((p) => p.x > 0.01).length
check(mirrorPairs * 2 + plan.filter((p) => Math.abs(p.x) <= 0.01).length === plan.length && plan.every((p) => Math.abs(p.x) <= 0.01 || plan.some((q) => Math.abs(q.x + p.x) < 1e-9 && Math.abs(q.y - p.y) < 1e-9 && Math.abs(q.z - p.z) < 1e-9 && q.wide === p.wide)), 'it is left-right symmetric: every side piece has its twin')

console.log('The idle animation')
const tailPiece = (frame) => frame.find((m) => m.o.depth === 0.5 && Math.abs(m.o.width - 0.9) < 1e-9)
const w = play(s, 90)
const wingAt = (frame) => frame.filter((m) => m.o.emissiveColor.join() === '116,28,36').map((m) => m.p[1])
const wingRange = Math.max(...w.frames.map((f) => Math.max(...wingAt(f)))) - Math.min(...w.frames.map((f) => Math.min(...wingAt(f))))
const tailAt = (frame) => tailPiece(frame).p
const tailSpots = w.frames.map(tailAt)
const tailRange = Math.max(Math.max(...tailSpots.map((p) => p[0])) - Math.min(...tailSpots.map((p) => p[0])), Math.max(...tailSpots.map((p) => p[2])) - Math.min(...tailSpots.map((p) => p[2])))
const headYaw = w.frames.map((f) => f.filter((m) => m.o.emissiveColor.join() === '255,206,96')[0].r)
check(wingRange > 0.8 && tailRange > 0.2 && Math.max(...headYaw) - Math.min(...headYaw) > 0.1, `it breathes: the wings flap (${round(wingRange)} blocks of travel), the tail sways (${round(tailRange)}) and the head turns slowly`)
check(w.worst <= 70, `at most ${w.worst} api calls in a tick while it moves`)
check(s.meshes.size === total && s.said.length === 0, 'it stays silent and keeps all its boxes')

console.log('Taking it away')
s.run.onPlayerChat('p1', '!dragon')
const gone = play(s, 4)
check(s.run.dragonList.length === 0 && s.meshes.size === 0 && gone.frames[3].length === 0, 'a second !dragon takes every box away again')
const two = game()
two.run.onPlayerChat('p1', '!dragon')
two.run.onPlayerChat('p2', '!dragon')
const both = play(two, 18)
check(two.meshes.size === total * 2 && two.peak <= 400 && both.worst <= 120, `two players can each have one: ${two.meshes.size} meshes, still under the 400 limit, ${both.worst} api calls in the busiest tick`)
check(two.run.dragonList.length === 2 && Math.abs(two.run.dragonList[1].at[0] - 27) < 1e-9, 'each dragon stands in front of its own player')

console.log('The code block')
{
  const meshes = new Map()
  let next = 1
  const said = []
  const api = {
    getPlayerFacingInfo: () => ({ dir: [0, -0.2, 1] }),
    attemptCreateMeshEntity: (type, o) => {
      const id = 'b' + next++
      meshes.set(id, { o, p: null, r: [0, 0, 0] })
      return id
    },
    setPosition: (id, x, y, z) => {
      if (meshes.has(id)) meshes.get(id).p = [x, y, z]
    },
    setEntityRotation: (id, x, y, z) => {
      if (x !== 0 || z !== 0) throw new Error('tilted')
      if (meshes.has(id)) meshes.get(id).r = [x, y, z]
    },
    deleteMeshEntity: (id) => meshes.delete(id),
    sendMessage: (id, m) => said.push(m),
  }
  const space = {}
  const runBlock = () => new Function('api', 'globalThis', 'myId', 'thisPos', blockCode)(api, space, 'p1', [0, 9, 0])
  runBlock()
  check(meshes.size === total && said.length === 0, `a click on the block builds the same ${total} meshes at once, silently`)
  check([...meshes.values()].every((m) => m.p[1] >= 8.98) && [...meshes.values()].every((m) => Math.abs(m.p[2] - 6.5) < 6), 'it stands in front of the player, on the ground')
  runBlock()
  check(meshes.size === 0, 'a second click takes it away')

  function check(ok, msg) {
    console.log((ok ? '  ok    ' : '  FAIL  ') + msg)
    if (!ok) fail.push(msg)
  }
}

check(code.length < 32000 && blockCode.length < 32000 && !code.includes('//') && !blockCode.includes('//'), `files are small enough (world ${code.length}, block ${blockCode.length}) and have no // comments`)
check(JSON.stringify(s.run.dragonPlan) === JSON.stringify(plan) && blockCode.includes('add(0, 1.3, 0, 1.4, 1.15, 2.5, 0, "body")'), 'the block uses the same model as the World Code')

if (args.includes('--dump')) {
  const out = { frames: [], start: [0.5, 10, 0.5] }
  const shot = (frame) => ({ meshes: frame.map((m) => ({ p: m.p.map(round), width: m.o.width, height: m.o.height, depth: m.o.depth, r: m.r, emissiveColor: m.o.emissiveColor })) })
  const again = game()
  again.run.onPlayerChat('p1', '!dragon')
  const shots = play(again, 45).frames
  out.frames = [shot(shots[19]), shot(shots[26]), shot(shots[33]), shot(shots[44])]
  fs.writeFileSync(args[args.indexOf('--dump') + 1], JSON.stringify(out))
}

console.log(fail.length ? `\n${fail.length} check(s) failed` : '\nAll checks passed')
process.exitCode = fail.length ? 1 : 0
