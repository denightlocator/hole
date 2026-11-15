// Runs hologram/world_code.js against a stand-in for the game's `api` and checks it.
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
const TEXTURES = ['glint']
const SOUNDS = ['futureStrangePulse', 'sonarBeep', 'zapAccent2']
const finite = (v) => (Array.isArray(v) ? v.every(finite) : typeof v === 'object' && v ? Object.values(v).every(finite) : typeof v !== 'number' || Number.isFinite(v))
const fail = []
const check = (ok, msg) => { console.log((ok ? '  ok    ' : '  FAIL  ') + msg); if (!ok) fail.push(msg) }

function game(before = '', bare = false) {
  const meshes = new Map()
  let next = 1
  const s = { meshes, calls: 0, errors: [], sounds: new Set(), peak: 0, particles: 0, made: 0, said: [] }
  // the player stands at the origin and looks along +Z
  const pos = { p1: [0.5, 10, 0.5], p2: [8.5, 10, 0.5] }
  const need = (ok, msg) => { if (!ok) s.errors.push(msg) }
  s.api = {
    getPosition: (id) => pos[id],
    getPlayerFacingInfo: () => ({ camPos: [0.5, 11.6, 0.5], dir: [0, -0.2, 0.98] }),
    sendMessage: (id, m) => s.said.push(m),
    broadcastSound: (name, vol, rate, o) => { need(SOUNDS.includes(name) && finite([vol, rate, o.playerIdOrPos]), 'sound ' + name); s.sounds.add(name) },
    playParticleEffect: (o) => { s.calls++; s.particles++; need(PARTICLE.every((k) => k in o) && finite(o) && TEXTURES.includes(o.texture) && o.colorGradients.every((g) => g.minColor.length === 4 && g.maxColor.length === 4), 'bad particle') },
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
    setEntityRotation: (id, x, y, z) => { s.calls++; need(meshes.has(id) && finite([x, y, z]) && x === 0 && z === 0, 'tilted mesh'); meshes.get(id).r = [x, y, z] },
    deleteMeshEntity: (id) => { s.calls++; need(meshes.delete(id), 'deleted twice') },
  }
  s.g = {}
  if (bare) { s.bare = { tick: undefined, onPlayerChat: undefined }; return s }
  s.run = new Function('api', 'globalThis', 'var tick, onPlayerChat;\n' + before + '\n' + code +
    '\nreturn { tick, onPlayerChat, HOLO_CFG, HOLO_PANEL, holoList, holoPlan, held: () => holoMeshes }')(s.api, s.g)
  return s
}

function play(s, ticks, tick = s.run?.tick) {
  const frames = []
  let worst = 0, mostMade = 0
  for (let n = 0; n < ticks; n++) {
    const calls = s.calls, made = s.made
    tick(50)
    worst = Math.max(worst, s.calls - calls)
    mostMade = Math.max(mostMade, s.made - made)
    frames.push({ t: n, meshes: [...s.meshes.values()].filter((m) => m.p).map((m) => ({ ...m.o, p: m.p, r: m.r })) })
  }
  return { frames, worst, mostMade }
}

console.log('Sizes')
check(code.length <= 512000, `world_code.js is ${code.length} characters (World Code limit 512,000)`)
check(!code.includes('//'), 'no // comments')

console.log('The hologram')
const s = game()
const N = s.run.holoPlan.length
check(s.run.onPlayerChat('p1', 'hello') === undefined, 'other chat messages pass through')
check(s.run.onPlayerChat('p1', '!holo') === false && s.run.holoList.length === 1, '!holo opens it and is hidden from chat')
const boot = play(s, 120)
check(s.errors.length === 0, 'every api call is well formed and every mesh is level (only turned left or right) ' + [...new Set(s.errors)].join('; '))
check(boot.mostMade <= 5, `never more than ${boot.mostMade} meshes created in one tick (100 a second)`)
check(N < 400 && s.peak === N, `${N} meshes (limit 400)`)
const upAt = boot.frames.findIndex((f) => f.meshes.length === N)
const grow = [5, 15, 25, upAt].map((t) => boot.frames[t].meshes.length)
const topOf = (f) => Math.max(...f.meshes.map((m) => m.p[1] + m.height / 2))
check(grow.every((n, i) => !i || n > grow[i - 1]) && topOf(boot.frames[5]) < topOf(boot.frames[25]), `it boots from the floor up in ${((upAt + 1) / 20).toFixed(1)} s (${grow.join(', ')} meshes)`)
const done = boot.frames[100].meshes
const span = (k) => [Math.min(...done.map((m) => m.p[k])), Math.max(...done.map((m) => m.p[k]))]
const H = topOf(boot.frames[100]) - 10
check(H > 2.3 && H < 2.7 && span(0)[1] - span(0)[0] < 3.6 && span(0)[1] - span(0)[0] > 2.6, `player sized: ${H.toFixed(1)} blocks tall, ${(span(0)[1] - span(0)[0]).toFixed(1)} wide`)
check(Math.abs((span(0)[0] + span(0)[1]) / 2 - 0.5) < 0.05 && span(2)[0] > 0.9 && span(2)[1] < 4, `it stands 2 blocks in front of the player (from ${(span(2)[0] - 0.5).toFixed(1)} to ${(span(2)[1] - 0.5).toFixed(1)} blocks ahead)`)
const plates = done.filter((m) => Math.abs(m.depth - 0.02) < 1e-9 && Math.abs(m.width - 0.02) > 1e-9)
const yaws = new Set(plates.map((m) => (((m.r[1] % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)).toFixed(2)))
check(yaws.size === 3, 'three flat screens: one straight ahead and one turned in on each side')
const main = plates.filter((m) => Math.abs(Math.cos(m.r[1]) + 1) < 1e-6)
check(main.length > 20 && main.every((m) => Math.abs(m.p[2] - 2.75) < 0.05), `the main screen faces the player, ${main.length} parts on it`)
const sides = plates.filter((m) => Math.abs(Math.cos(m.r[1]) + 1) > 1e-6)
check(sides.every((m) => (m.p[0] - 0.5) * Math.sin(m.r[1]) < 0), 'both side screens are turned toward the player')
const flatOnes = done.filter((m) => m.height <= 0.05 && Math.abs(m.depth - 0.02) > 1e-9)
check(flatOnes.length > 60, `${flatOnes.length} parts lie flat: floor rings, the arc overhead and the 27-key board`)

console.log('It moves')
const a = boot.frames[100].meshes, b = boot.frames[110].meshes
const moved = a.filter((m, i) => m.p.some((v, k) => Math.abs(v - b[i].p[k]) > 1e-6) || m.width !== b[i].width || m.height !== b[i].height || m.emissiveColor !== b[i].emissiveColor).length
check(moved >= 30 && moved < N / 2, `${moved} of the ${N} parts change within half a second (globe, text lines, bars, graph, needle, scan line, keys, markers)`)
const texts = (f) => f.meshes.filter((m) => Math.abs(m.height - 0.028) < 1e-9).map((m) => m.width)
const widths = boot.frames.slice(60, 120).map((f) => texts(f)[0])
check(Math.min(...widths) < 0.1 && Math.max(...widths) > 0.25, 'text lines type themselves out, hold, and clear')
const rest = play(s, 40)
check(rest.worst <= 80, `at most ${Math.max(boot.worst, rest.worst)} api calls in a tick while it boots, ${rest.worst} once it is up`)
const still = game()
still.run.HOLO_CFG.animate = false
still.g.hologram('p1')
play(still, 80)
const quiet = still.calls
play(still, 20)
check(still.calls === quiet && still.meshes.size === N, 'with animate off it is built and then costs no api calls at all')

console.log('Closing')
check(s.g.hologram('p1') === false, '!holo again closes it')
const close = play(s, 20)
check(s.meshes.size === 0 && s.run.held() === 0 && s.run.holoList.length === 0, 'every mesh is deleted')
const two = game()
two.g.hologram('p1')
check(two.g.hologram('p2') === false && /already open/.test(two.said[0]), 'a second player is told one is already open (maxHolos 1)')
const boom = game()
boom.api.setPosition = () => { throw new Error('nope') }
boom.g.hologram('p1')
play(boom, 3)
check(/^Hologram stopped at tick 0: Error: nope$/.test(boom.said[0] || '') && boom.meshes.size === 0, `if the game refuses a call it stops, cleans up and tells the player: "${boom.said[0]}"`)

console.log('Together with other world code')
const both = game('globalThis.seen = 0; tick = () => { globalThis.seen++ }; onPlayerChat = (id, m) => m === "x" ? "old" : undefined;')
both.run.tick(50)
check(both.run.onPlayerChat('p1', 'x') === 'old' && both.g.seen === 1, 'earlier tick and onPlayerChat still run')

console.log('Code block')
const noChat = code.slice(0, code.indexOf('var holoOldChat')).trimEnd()
check(noChat.length < code.length - 100 && !noChat.includes('onPlayerChat'), 'the code block version has no chat command in it')
const blockCode = 'if (typeof hologramInstant !== "function") {\n  (function () {\n' + noChat + '\n  })()\n}\n' +
  'hologramInstant(myId, [thisPos[0] + 0.5, thisPos[1] + 1, thisPos[2] + 0.5])\n'
fs.writeFileSync(path.join(dir, 'code_block.js'), blockCode)
check(blockCode.length <= 32000 && !blockCode.includes('//'), `wrote code_block.js: ${blockCode.length} of 32,000 characters, no comments`)
{
  const click = (g, who) => new Function('api', 'globalThis', 'myId', 'thisPos', 'with (globalThis) {' + blockCode + '}')(g.api, g.bare, who || 'p1', [0, 10, 4])
  const g2 = game('', true)
  click(g2)
  const m = [...g2.meshes.values()].map((q) => ({ ...q.o, p: q.p, r: q.r }))
  const low = Math.min(...m.map((q) => q.p[1] - q.height / 2))
  const xs = [Math.min(...m.map((q) => q.p[0])), Math.max(...m.map((q) => q.p[0]))]
  check(g2.errors.length === 0 && m.length === N && m.every((q) => q.p), `one click, no world code, tick never run: all ${N} meshes are there straight away`)
  check(low > 10.99 && low < 11.1 && Math.abs((xs[0] + xs[1]) / 2 - 0.5) < 0.05, 'it stands on top of the block')
  const mainZ = m.filter((q) => Math.abs(q.depth - 0.02) < 1e-9 && Math.abs(q.width - 0.02) > 1e-9 && Math.abs(Math.cos(q.r[1]) + 1) < 1e-6)
  check(mainZ.length > 20 && mainZ.every((q) => q.p[2] > 4.5), 'it faces the player who clicked (the main screen is on the far side of the block)')
  click(g2)
  check(g2.meshes.size === 0, 'the second click removes it, also without tick')
  click(g2)
  check(g2.meshes.size === N, 'the third click shows it again')
  click(g2, 'p2')
  check(g2.meshes.size === 0, 'another player clicking closes it too (never two at once)')
  const g1 = game('', true)
  click(g1)
  const snap = () => JSON.stringify([...g1.meshes.values()].map((q) => [q.p, q.o.width, q.o.height, q.o.emissiveColor]))
  const before = snap()
  const made = g1.made
  play(g1, 30, (ms) => g1.bare.tick(ms))
  check(g1.meshes.size === N && snap() !== before && g1.errors.length === 0, 'if the game does run tick from a code block, the same hologram also moves')
  click(g1)
  play(g1, 5, (ms) => g1.bare.tick(ms))
  check(g1.meshes.size === 0, 'and one click still closes it')
}

if (args.includes('--dump')) fs.writeFileSync(args[args.indexOf('--dump') + 1], JSON.stringify({ frames: [boot.frames[12], boot.frames[100], boot.frames[110]], player: [0.5, 10, 0.5] }))
console.log(fail.length ? `\n${fail.length} check(s) failed` : '\nAll checks passed')
process.exit(fail.length ? 1 : 0)
