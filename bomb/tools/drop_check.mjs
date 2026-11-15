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
check(s.run.onPlayerChat('p1', '!target') === false && /Use: !target/.test(s.said.pop()), '!target with no name explains how to use it')
check(s.run.onPlayerChat('p1', '!target nobody') === false && /No player called "nobody"/.test(s.said.pop()) && s.meshes.size === 0, 'an unknown name gives a message and no bomb')
check(s.run.onPlayerChat('p1', '!target BOBBY') === false && /Bomb sent to Bobby/.test(s.said.pop()) && s.meshes.size === 88, 'the name is found whatever the capitals; the 88-mesh bomb is made')
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
check(hit === 'cow,p3' && s.hurt.every((h) => h[1] <= -18 && h[1] >= -60), `others within 9 blocks are hurt (${s.hurt.map((h) => h[0] + ' ' + h[1]).join(', ')}); far players are not`)
check(s.pushed.length === 3 && s.pushed.every((p) => p[2] > 5), 'everyone hit is thrown up and away')
const boomFx = s.fx.length
for (let n = 0; n < 45; n++) { const c = s.calls; s.run.tick(50); worst = Math.max(worst, s.calls - c) }
check(s.fx.length - boomFx > 150 && s.run.nukeList.length === 0, 'fireball, shock ring, then a mushroom column and cap for 2 s; then it is finished')
check(s.bad.length === 0, 'every api call is well formed ' + [...new Set(s.bad)].join('; '))
check(worst <= 110 && s.peak === 88, `at most ${worst} api calls in a tick; ${s.peak} meshes`)
check(SOUNDS.every((n) => s.sounds.includes(n)), 'sounds: launch, falling, explosion')
const pre = game()
check(pre.run.onPlayerChat('p1', '!target bob') === false && pre.run.nukeList[0].target === 'p2', 'the start of a name is enough (bob finds Bobby)')
pre.run.onPlayerChat('p1', '!target zed'); pre.run.onPlayerChat('p1', '!target caster')
check(pre.run.onPlayerChat('p1', '!target bobcat') === false && /Too many/.test(pre.said.pop()) && pre.meshes.size === 264, 'at most 3 bombs at once (264 meshes, under 400)')
const self = game(); self.run.onPlayerChat('p1', '!target caster'); for (let n = 0; n < 52; n++) self.run.tick(50)
check(self.killed.length === 1 && self.killed[0][0] === 'p1', 'you can target yourself')
const gone = game(); gone.run.onPlayerChat('p1', '!target zed'); for (let n = 0; n < 10; n++) gone.run.tick(50)
gone.api.getPosition = (id) => (id === 'p4' ? null : gone.where[id]); for (let n = 0; n < 90; n++) gone.run.tick(50)
check(gone.meshes.size === 0 && gone.run.nukeList.length === 0 && !gone.said.some((m) => /stopped/.test(m)), 'if the target leaves, the bomb lands where they last were and cleans up')
const both = game('globalThis.seen = 0; tick = () => { globalThis.seen++ }; onPlayerChat = (id, m) => (m === "x" ? "old" : undefined);')
both.run.tick(50)
check(both.g.seen === 1 && both.run.onPlayerChat('p1', 'x') === 'old', 'earlier tick and onPlayerChat still run')
console.log(fail.length ? `\n${fail.length} check(s) failed` : '\nAll checks passed')
process.exit(fail.length ? 1 : 0)
