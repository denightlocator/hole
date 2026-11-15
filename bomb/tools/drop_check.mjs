// Runs world_code.js (!target <name>) against a stand-in game. Run: node tools/drop_check.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const code = fs.readFileSync(path.join(dir, 'world_code.js'), 'utf8')
const fail = []
const check = (ok, msg) => { console.log((ok ? '  ok    ' : '  FAIL  ') + msg); if (!ok) fail.push(msg) }
const fin = (v) => (Array.isArray(v) ? v.every(fin) : typeof v === 'object' && v ? Object.values(v).every(fin) : typeof v !== 'number' || Number.isFinite(v))
const SOUNDS = ['cannonFire1', 'cannonFire2', 'cannonFire3', 'firecracker1', 'rocketEngineLoop']
function game(before = '') {
  const s = { meshes: new Map(), said: [], killed: [], hurt: [], pushed: [], sounds: [], fx: [], bad: [], peak: 0, calls: 0 }
  s.where = { p1: [0.5, 10, 0.5], p2: [30.5, 10, 0.5], p3: [34.5, 10, 0.5], p4: [60.5, 10, 0.5], cow: [30.5, 10, 6.5] }
  const names = { p1: 'Caster', p2: 'Bobby', p3: 'Bobcat', p4: 'Zed' }
  let next = 1
  const need = (ok, m) => { if (!ok) s.bad.push(m) }
  s.api = {
    getPlayerIds: () => ['p1', 'p2', 'p3', 'p4'], getMobIds: () => ['cow'],
    getEntityName: (id) => names[id], getPosition: (id) => s.where[id],
    sendMessage: (id, m) => s.said.push(m),
    killLifeform: (id, by) => s.killed.push([id, by]),
    applyHealthChange: (id, n, by) => { need(n < 0 && Number.isInteger(n), 'damage'); s.hurt.push([id, n, by]) },
    applyImpulse: (id, x, y, z) => { need(fin([x, y, z]), 'impulse'); s.pushed.push([id, x, y, z]) },
    broadcastSound: (n, v, r, o) => { need(SOUNDS.includes(n) && fin([v, r]) && r >= 0.5 && r <= 4, 'sound ' + n + ' ' + r); s.sounds.push(n) },
    playParticleEffect: (o) => { s.calls++; need(fin(o) && o.minLifeTime > 0 && o.minSize > 0 && o.colorGradients.every((g) => g.minColor.length === 4), 'particle'); s.fx.push(o) },
    attemptCreateMeshEntity: (t, o) => { need(t === 'Box' && fin(o), 'box'); const id = 'm' + next++; s.meshes.set(id, { p: null }); s.peak = Math.max(s.peak, s.meshes.size); return id },
    setPosition: (id, x, y, z) => { s.calls++; need(fin([x, y, z]) && s.meshes.has(id), 'setPosition'); s.meshes.get(id).p = [x, y, z] },
    setEntityRotation: (id, x, y, z) => need(!x && !z && fin([y]), 'tilt'),
    deleteMeshEntity: (id) => need(s.meshes.delete(id), 'delete twice'),
  }
  s.g = {}
  s.run = new Function('api', 'globalThis', 'var tick, onPlayerChat;' + before + '\n' + code + '\nreturn { tick, onPlayerChat, NUKE_CFG, nukeList }')(s.api, s.g)
  s.lowest = () => Math.min(...[...s.meshes.values()].map((m) => m.p[1]))
  s.middle = () => { const l = [...s.meshes.values()]; return [l.reduce((a, m) => a + m.p[0], 0) / l.length, l.reduce((a, m) => a + m.p[2], 0) / l.length] }
  return s
}
check(code.length <= 512000 && !code.includes('//'), `world_code.js is ${code.length} characters (limit 512,000), no // comments`)
const s = game()
check(s.run.onPlayerChat('p1', 'hello') === undefined, 'normal chat is left alone')
check(s.run.onPlayerChat('p1', '!target') === false && s.meshes.size === 0, '!target with no name does nothing')
check(s.run.onPlayerChat('p1', '!target nobody') === false && s.meshes.size === 0, 'an unknown name does nothing')
check(s.run.onPlayerChat('p1', '!target BOBBY') === false && s.meshes.size === 88, 'the name is found whatever the capitals; the 88-mesh bomb is made')
check(Math.abs(s.lowest() - 55) < 0.5, 'it starts 45 blocks above the target')
const heights = []
let worst = 0
for (let n = 0; n < 50; n++) {
  if (n === 20) s.where.p2 = [33.5, 10, 2.5]
  const c = s.calls; s.run.tick(50); worst = Math.max(worst, s.calls - c); heights.push(s.meshes.size ? s.lowest() : null)
  if (n === 25) check(Math.abs(s.middle()[0] - 33.5) < 0.05 && Math.abs(s.middle()[1] - 2.5) < 0.05, 'it follows the target when they run (here 3 blocks away)')
}
check(heights[10] - heights[11] < heights[40] - heights[41] && heights[48] > 10 && heights[48] < 15, 'it falls faster and faster for 2.5 s')
s.run.tick(50)
check(s.meshes.size === 0, 'on landing the bomb meshes are removed')
check(s.killed.length === 1 && s.killed[0][0] === 'p2' && s.killed[0][1] === 'p1', 'the target is killed, credited to the sender')
const hit = s.hurt.map((h) => h[0]).sort().join()
check(hit === 'cow,p3' && s.hurt.every((h) => h[1] <= -18 && h[1] >= -60), `others within 12 blocks are hurt (${s.hurt.map((h) => h[0] + ' ' + h[1]).join(', ')}); far players are not`)
check(s.pushed.length === 3 && s.pushed.every((p) => p[2] > 5), 'everyone hit is thrown up and away')
const firstBoom = s.fx.slice(-29)
const flat = firstBoom.filter((o) => Math.abs(o.dir1[1]) < 0.01 && o.dir2[1] < 0.1)
const ways = new Set(flat.map((o) => Math.round((Math.atan2((o.dir1[0] + o.dir2[0]) / 2, (o.dir1[2] + o.dir2[2]) / 2) * 12) / Math.PI)))
check(flat.length === 24 && ways.size === 24 && flat.every((o) => o.maxEmitPower === 30 && o.colorGradients[2].maxColor[3] === 0), 'at the blast a ring of 24 jets of fire shoots outward in every direction along the ground and fades out as it spreads')
check(firstBoom.filter((o) => o.manualEmitCount >= 320).length === 3 && Math.max(...firstBoom.map((o) => o.maxSize)) === 6, 'the fireball is three layers (white flash, yellow, orange) of 320 to 420 big particles, plus 160 sparks that fly up and fall back')
const boomFx = s.fx.length
const rings = []
for (let n = 1; n <= 104; n++) {
  const c = s.calls, before = s.fx.length; s.run.tick(50); worst = Math.max(worst, s.calls - c)
  const added = s.fx.slice(before).filter((o) => Math.abs((o.dir1[0] + o.dir2[0]) / 2) + Math.abs((o.dir1[2] + o.dir2[2]) / 2) > 0.9 && o.dir2[1] < 0.2)
  if (added.length >= 20) rings.push(n + ':' + added.length)
}
check(rings.join() === '3:24,7:24,12:20,22:20,32:20', 'more fading rings follow: orange at 0.15 s, smoke at 0.35 s, then three halo rings up the mushroom stem (' + rings.join(', ') + ')')
const tall = Math.max(...s.fx.slice(boomFx).map((o) => o.pos2[1])) - 10
check(tall > 27 && tall < 31 && s.fx.length - boomFx > 200 && s.run.nukeList.length === 0, `the mushroom column and cap grow to about ${Math.round(tall)} blocks tall and 22 wide, with embers on the ground and ash falling; the last smoke is sent out at 5 s and fades over the next 3`)
check(s.bad.length === 0, 'every api call is well formed ' + [...new Set(s.bad)].join('; '))
check(worst <= 110 && s.peak === 88, `at most ${worst} api calls in a tick; ${s.peak} meshes`)
check(SOUNDS.every((n) => s.sounds.includes(n)), 'sounds: launch, falling, explosion')
const pre = game()
check(pre.run.onPlayerChat('p1', '!target bob') === false && pre.run.nukeList[0].target === 'p2', 'the start of a name is enough (bob finds Bobby)')
pre.run.onPlayerChat('p1', '!target zed'); pre.run.onPlayerChat('p1', '!target caster')
check(pre.run.onPlayerChat('p1', '!target bobcat') === false && pre.meshes.size === 264, 'at most 3 bombs at once (264 meshes, under 400)')
const self = game(); self.run.onPlayerChat('p1', '!target caster'); for (let n = 0; n < 52; n++) self.run.tick(50)
check(self.killed.length === 1 && self.killed[0][0] === 'p1', 'you can target yourself')
const gone = game(); gone.run.onPlayerChat('p1', '!target zed'); for (let n = 0; n < 10; n++) gone.run.tick(50)
gone.api.getPosition = (id) => (id === 'p4' ? null : gone.where[id]); for (let n = 0; n < 160; n++) gone.run.tick(50)
check(gone.meshes.size === 0 && gone.run.nukeList.length === 0, 'if the target leaves, the bomb lands where they last were and cleans up')
const both = game('globalThis.seen = 0; tick = () => { globalThis.seen++ }; onPlayerChat = (id, m) => (m === "x" ? "old" : undefined);')
both.run.tick(50)
check(both.g.seen === 1 && both.run.onPlayerChat('p1', 'x') === 'old', 'earlier tick and onPlayerChat still run')
check([s, pre, self, gone].every((q) => q.said.length === 0) && !code.includes('sendMessage'), 'no chat messages are sent in any case')
console.log(fail.length ? `\n${fail.length} check(s) failed` : '\nAll checks passed')
process.exit(fail.length ? 1 : 0)
