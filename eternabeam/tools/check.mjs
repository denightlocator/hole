// Stand-in game test for the Eternabeam dragon. Run: node tools/check.mjs [--dump frames.json]
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

function game() {
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
  s.run = new Function('api', 'globalThis', 'var tick, onPlayerChat, onPlayerClick;' + code + 'return { tick, onPlayerChat, eternaList, eternaPlan }')(s.api, (s.g = {}))
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

const total = 128
const round = (v) => Math.round(v * 1000) / 1000

console.log('Building it')
const s = game()
const tagOf = (m) => s.run.eternaPlan[Number(m.id.slice(1)) - 1].tag
check(s.run.onPlayerChat('p1', 'hello') === undefined && s.run.onPlayerChat('p1', '!eternabeam') === false, '!eternabeam is hidden from chat and starts it')
const run = play(s, 22)
check(s.errors.length === 0, 'every api call is well formed and no mesh is ever tilted (' + [...new Set(s.errors)].join('; ') + ')')
check(run.frames[21].length === total && run.frames[10].length > 0 && run.frames[10].length < total, `it builds itself in ${Math.ceil(total / 6)} ticks, six boxes a tick: ${run.frames[10].length} boxes after 11 ticks, ${run.frames[21].length} at the end`)
const plan = s.run.eternaPlan
check(plan.length === total && plan.every((part) => part.wide > 0 && part.tall > 0 && part.deep > 0), `${total} boxes`)
check(plan.filter((p) => p.tag === "wing").length === 34 && plan.filter((p) => p.tag === 'tail').length === 34 && plan.filter((p) => p.tag === "head").length === 17, '34 move as the wings, 34 as the tail and 17 as the head')
const cols = new Set(plan.map((p) => p.col))
check(cols.size === 6, 'six colours: two navyblues, a lighter blue for the spine, two reds, and a hot pink glow for the core, the mouth and the eyes')

console.log('Where it stands')
const beast = run.frames[21]
const near = Math.min(...beast.map((m) => Math.hypot(m.p[0] - 0.5, m.p[2] - 0.5)))
const wide = Math.max(...beast.map((m) => Math.hypot(m.p[0] - 0.5, m.p[2] - 0.5)))
const tall = Math.max(...beast.map((m) => m.p[1] + m.o.height / 2)) - 10
const long = Math.max(...beast.map((m) => m.p[2])) - Math.min(...beast.map((m) => m.p[2]))
check(near > 2 && wide < 14 && tall > 3 && tall < 3.9 && long > 8.5 && long < 11, `it stands 7 blocks in front of the player: ${round(tall)} blocks tall, ${round(long)} blocks nose to tail tip, ${Math.round(near)} to ${Math.round(wide)} blocks away`)
check(beast.every((m) => m.p[1] - m.o.height / 2 >= 9.98), 'no box sinks below the floor')
const eyes = beast.filter((m) => m.o.emissiveColor.join() === '255,120,132')
check(eyes.length > 1 && Math.min(...eyes.map((m) => Math.hypot(m.p[0] - 0.5, m.p[2] - 0.5))) < 5, 'it faces the player: the hot glow is on the near side')
const reds = beast.filter((m) => m.o.emissiveColor.join() === '222,42,62').length
check(reds > 30 && reds < 90, `the red is spread all over it: ${reds} red boxes, on the snout, the ribs, the spikes, the claws and the wing spars`)
const mirror = plan.every((p) => Math.abs(p.x) <= 0.01 || plan.some((q) => Math.abs(q.x + p.x) < 1e-9 && Math.abs(q.y - p.y) < 1e-9 && Math.abs(q.z - p.z) < 1e-9))
check(mirror && plan.filter((p) => p.x > 0.01).length * 2 + plan.filter((p) => Math.abs(p.x) <= 0.01).length === total, 'it is left-right symmetric: every side piece has its twin')

console.log('The idle animation')
const w = play(s, 90)
const wingTip = 'm' + (plan.findIndex((p) => p.tag === 'wing' && p.idx >= 0.9) + 1)
const tipOf = (frame) => frame.filter((m) => m.id === wingTip)[0].p[1]
const wingRange = Math.max(...w.frames.map(tipOf)) - Math.min(...w.frames.map(tipOf))
const tailPiece = (frame) => frame.filter((m) => tagOf(m) === 'tail')[2]
const tailSpots = w.frames.map((f) => tailPiece(f).p)
const tailRange = Math.max(Math.max(...tailSpots.map((p) => p[0])) - Math.min(...tailSpots.map((p) => p[0])), Math.max(...tailSpots.map((p) => p[2])) - Math.min(...tailSpots.map((p) => p[2])))
const headYaw = w.frames.map((f) => f.filter((m) => tagOf(m) === 'head')[0].r)
check(wingRange > 0.8 && tailRange > 0.2 && Math.max(...headYaw) - Math.min(...headYaw) > 0.1, `it moves: the wings beat (${round(wingRange)} blocks of travel), the tail whips (${round(tailRange)}) and the head turns slowly`)
check(w.worst <= 110, `at most ${w.worst} api calls in a tick while it moves`)
check(s.meshes.size === total && s.said.length === 0, 'it stays silent and keeps all its boxes')

console.log('Taking it away')
s.run.onPlayerChat('p1', '!eternabeam')
const gone = play(s, 5)
check(s.run.eternaList.length === 0 && s.meshes.size === 0 && gone.frames[4].length === 0, 'a second !eternabeam takes every box away again')
const two = game()
two.run.onPlayerChat('p1', '!eternabeam')
two.run.onPlayerChat('p2', '!eternabeam')
const both = play(two, 22)
check(two.meshes.size === total * 2 && two.peak <= 400 && two.run.eternaList.length === 2, `two players can each have one: ${two.meshes.size} boxes, still under the 400 limit`)

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
  check(meshes.size === total && said.length === 0, `a click on the block builds the same ${total} boxes at once, silently`)
  check([...meshes.values()].every((m) => m.p[1] >= 8.98) && [...meshes.values()].every((m) => Math.abs(m.p[2] - 7.5) < 7), 'it stands in front of the player, on the ground')
  runBlock()
  check(meshes.size === 0, 'a second click takes it away')
}

check(code.length < 32000 && blockCode.length < 32000 && !code.includes('//') && !blockCode.includes('//'), `files fit a code block (world ${code.length}, block ${blockCode.length}) and have no // comments`)

if (args.includes('--dump')) {
  const out = { frames: [], start: [0.5, 10, 0.5] }
  const shot = (frame) => ({ meshes: frame.map((m) => ({ p: m.p.map(round), width: m.o.width, height: m.o.height, depth: m.o.depth, r: m.r, emissiveColor: m.o.emissiveColor })) })
  const again = game()
  again.run.onPlayerChat('p1', '!eternabeam')
  const shots = play(again, 60).frames
  out.frames = [shot(shots[26]), shot(shots[33]), shot(shots[40]), shot(shots[58])]
  fs.writeFileSync(args[args.indexOf('--dump') + 1], JSON.stringify(out))
}

console.log(fail.length ? `\n${fail.length} check(s) failed` : '\nAll checks passed')
process.exitCode = fail.length ? 1 : 0
