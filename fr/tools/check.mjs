// Stand-in game test for FR. Run: node tools/check.mjs [--dump frames.json]
// It also writes code_block.js (the standalone code block) from the world code.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const code = fs.readFileSync(path.join(dir, 'world_code.js'), 'utf8')
const args = process.argv.slice(2)
const PARTICLE = ['dir1', 'dir2', 'pos1', 'pos2', 'texture', 'minLifeTime', 'maxLifeTime', 'minEmitPower', 'maxEmitPower', 'minSize', 'maxSize',
  'manualEmitCount', 'gravity', 'colorGradients', 'velocityGradients', 'blendMode']
const BOX = ['width', 'height', 'depth', 'diffuseColor', 'emissiveColor', 'hideDist']
const TEXTURES = ['square_particle', 'glint']
const finite = (v) => (Array.isArray(v) ? v.every(finite) : typeof v === 'object' && v ? Object.values(v).every(finite) : typeof v !== 'number' || Number.isFinite(v))
const fail = []
const check = (ok, msg) => { console.log((ok ? '  ok    ' : '  FAIL  ') + msg); if (!ok) fail.push(msg) }

// The caster p1 stands at 0.5, 10, 0.5 and looks along +Z. The move lands 8 blocks ahead.
function game(before = '', bare = false) {
  const meshes = new Map()
  let next = 1
  const s = { meshes, fx: [], now: 0, errors: [], said: [], hurt: [], pushed: [], peak: 0, made: 0, calls: 0 }
  const where = { p1: [0.5, 10, 0.5], p2: [2.5, 10, 8.5], cow: [0.5, 10, 10.5], far: [0.5, 10, 14.5] }
  const need = (ok, msg) => { if (!ok) s.errors.push(msg) }
  s.api = {
    getPosition: (id) => where[id],
    getPlayerIds: () => ['p1', 'p2'],
    getMobIds: () => ['cow', 'far'],
    getPlayerFacingInfo: () => ({ camPos: [0.5, 11.6, 0.5], dir: [0, -0.2, 0.98] }),
    sendMessage: (id, m) => s.said.push(m),
    applyHealthChange: (id, n, by) => { s.hurt.push([id, n, by, s.now]) },
    applyImpulse: (id, x, y, z) => { need(finite([x, y, z]), 'bad impulse'); s.pushed.push([id, x, y, z]) },
    playParticleEffect: (o) => {
      s.calls++
      const times = o.colorGradients.map((g) => g.timeFraction)
      need(PARTICLE.every((k) => k in o) && finite(o) && TEXTURES.includes(o.texture) && o.colorGradients.every((g) => g.minColor.length === 4 && g.maxColor.length === 4) && o.minLifeTime > 0 && o.minSize > 0 && o.manualEmitCount >= 1 && times.every((v, i) => v >= 0 && v <= 1 && (!i || v > times[i - 1])), 'bad particle')
      s.fx.push({ n: s.now, a: o.pos1, b: o.pos2, p: o.pos1.map((v, i) => (v + o.pos2[i]) / 2), grads: o.colorGradients.map((g) => [g.timeFraction, g.maxColor]), life: o.maxLifeTime, minLife: o.minLifeTime, power: o.maxEmitPower, minPower: o.minEmitPower, size: o.maxSize, count: o.manualEmitCount, d1: o.dir1, d2: o.dir2, tex: o.texture, slow: o.velocityGradients[1].factor })
    },
    attemptCreateMeshEntity: (type, o) => {
      s.calls++; s.made++
      need(type === 'Box' && Object.keys(o).every((k) => BOX.includes(k)) && finite(o) && o.width > 0 && o.height > 0 && o.depth > 0, 'bad Box')
      const id = 'm' + next++
      meshes.set(id, { o, p: null, r: [0, 0, 0], born: s.now })
      s.peak = Math.max(s.peak, meshes.size)
      return id
    },
    setPosition: (id, x, y, z) => { s.calls++; need(meshes.has(id) && finite([x, y, z]), 'bad setPosition'); meshes.get(id).p = [x, y, z] },
    setEntityRotation: (id, x, y, z) => { s.calls++; need(meshes.has(id) && finite([x, y, z]) && x === 0 && z === 0, 'tilted mesh'); meshes.get(id).r = [x, y, z] },
    deleteMeshEntity: (id) => { s.calls++; need(meshes.delete(id), 'deleted twice') },
  }
  s.g = {}
  if (bare) { s.bare = { tick: undefined, onPlayerChat: undefined }; return s }
  s.run = new Function('api', 'globalThis', 'var tick, onPlayerChat;\n' + before + '\n' + code + '\nreturn { tick, onPlayerChat, FR_CFG, FR_RINGS, frList, frPlan, held: () => frMeshes }')(s.api, s.g)
  return s
}
function play(s, ticks) {
  const frames = []
  let worst = 0
  for (let n = 0; n < ticks; n++) {
    const calls = s.calls
    s.run.tick(50)
    worst = Math.max(worst, s.calls - calls)
    frames.push([...s.meshes.values()].filter((m) => m.p).map((m) => ({ ...m.o, p: m.p, r: m.r })))
    s.now++
  }
  return { frames, worst }
}

console.log('Sizes')
check(code.length <= 512000 && !code.includes('//'), `world_code.js is ${code.length} characters, no // comments`)

console.log('World Code: the move')
const s = game()
const N = s.run.frPlan.length
check(s.run.onPlayerChat('p1', 'hello') === undefined && s.run.onPlayerChat('p1', '!fr') === false && s.run.frList.length === 1, '!fr casts it and is hidden from chat')
const run = play(s, 100)
check(s.errors.length === 0, 'every api call is well formed and every mesh is level (only turned left or right) ' + [...new Set(s.errors)].join('; '))
const BASE = [0.5, 10, 8.5]
const tilt = (18 * Math.PI) / 180
const AX = [0, Math.cos(tilt), -Math.sin(tilt)]
const rel = (p) => p.map((v, i) => v - BASE[i])
const alongOf = (p) => rel(p).reduce((sum, v, i) => sum + v * AX[i], 0)
const offOf = (p) => { const r = rel(p), a = alongOf(p); return Math.hypot(...r.map((v, i) => v - AX[i] * a)) }
check(s.peak === 12 && s.made === 12, `${s.peak} meshes in all: 6 bars for the six-pointed star on the floor and 6 boxes for the fireball`)
const star = run.frames[10]
check(star.length === 6 && star.every((m) => Math.abs(m.p[1] - 10.08) < 1e-9 && Math.abs(m.depth - 3.1 * Math.sqrt(3)) < 1e-6 && Math.hypot(m.p[0] - 0.5, m.p[2] - 8.5) < 1.56), 'the star is two crossed triangles, 6.2 blocks across, flat on the floor 8 blocks in front of the caster')
const dots = s.fx.filter((q) => q.count === 1 && q.power === 0)
const ringOf = (q) => s.run.FR_RINGS.findIndex((r) => Math.abs(alongOf(q.p) - r[0]) < 1e-6 && Math.abs(offOf(q.p) - r[1]) < 1e-6)
check(dots.length > 1000 && dots.every((q) => ringOf(q) >= 0), `${N} ring points on 10 rings of different sizes (0.7 to 3.4 blocks), all square to one slanted line that leans 18 degrees back toward the caster`)
const aliveAt = (n) => dots.filter((q) => q.n <= n && q.n + q.minLife * 20 > n)
const seenRings = (n) => new Set(aliveAt(n).map(ringOf)).size
check(seenRings(2) === 1 && seenRings(10) > 3 && seenRings(10) < 7 && seenRings(30) === 10, `the rings appear one after another from the bottom up (${seenRings(2)}, ${seenRings(10)}, ${seenRings(30)} rings after 0.1, 0.5 and 1.5 s)`)
const lit = new Set(aliveAt(60).map((q) => q.p.map((v) => v.toFixed(3)).join()))
check(lit.size === N, `all ${N} ring points stay lit until the fireball lands (each is re-lit every 0.9 s)`)
const ball = (n) => run.frames[n].filter((m) => Math.abs(m.p[1] - 10.08) > 1e-9)
const flight = Array.from({ length: 26 }, (_, i) => ball(42 + i))
check(ball(41).length === 0 && flight.every((f) => f.length === 6 && f.every((m) => m.p.join() === f[0].p.join())), 'the fireball (6 boxes moving as one) appears 2.1 s in')
const alongs = flight.map((f) => alongOf(f[0].p))
check(flight.every((f) => offOf(f[0].p) < 1e-6) && alongs[0] > 12.9 && alongs[25] < 1e-6 && alongs.every((v, i) => !i || v < alongs[i - 1]) && alongs[0] - alongs[1] < alongs[24] - alongs[25], `it flies down the middle of the rings, from ${alongs[0].toFixed(1)} blocks up the line to the floor in 1.3 s, speeding up`)
const passes = s.fx.filter((q) => q.count === 14)
check(passes.length === 10 && passes.every((q, i) => Math.abs(alongOf(q.p) - s.run.FR_RINGS[9 - i][0]) < 1e-6), 'it passes through all 10 rings, top to bottom, and each ring throws off a burst as it goes through')
const trail = s.fx.filter((q) => q.count === 18)
check(trail.length === 26 && trail.every((q, i) => Math.abs(alongOf(q.p) - alongs[i]) < 1e-6), 'it leaves a thick gold trail (23 particles a tick)')
const stream = s.fx.filter((q) => q.count === 4 && q.tex === 'glint')
check(stream.length > 100 && stream.every((q) => offOf(q.p) < 1e-6 && q.d1[1] < 0), `${stream.length} bursts of gold sparks run down the line while it charges`)
const boom = s.fx.filter((q) => q.n === 68 && q.count >= 30)
check(boom.length === 5 && boom.reduce((sum, q) => sum + q.count, 0) === 200, 'when it lands: 200 particles burst out, with a shock ring along the floor')
check(ball(68).length === 0 && run.frames[77].length === 6 && run.frames[78].length === 0 && s.meshes.size === 0 && s.run.held() === 0 && s.run.frList.length === 0, 'the fireball is deleted on landing, the star half a second later; no mesh is left (3.9 s in all)')
check(s.hurt.length === 2 && s.hurt.every((h) => h[1] === -40 && h[2] === 'p1' && h[3] === 68) && s.hurt.map((h) => h[0]).sort().join() === 'cow,p2', 'it deals 40 damage on landing to everything within 4 blocks; the caster and a mob 6 blocks away are not touched')
check(s.pushed.length === 2 && s.pushed.find((q) => q[0] === 'cow')[3] > 9 && s.pushed.find((q) => q[0] === 'p2')[1] > 9, 'and knocks them away from the middle')
const perTick = Math.max(...Array.from({ length: 100 }, (_, n) => s.fx.filter((q) => q.n === n).length))
check(perTick <= 60 && run.worst <= 70, `at most ${perTick} particle calls and ${run.worst} api calls in a tick`)
const two = game()
two.g.fr('p1'); two.g.fr('p2')
check(two.g.fr('p1') === false && /Too many/.test(two.said[0]), 'two casts can run together (24 meshes); a third is refused')
const boomy = game()
boomy.api.setPosition = () => { throw new Error('nope') }
boomy.g.fr('p1')
play(boomy, 3)
check(/^Stopped at tick 0: Error: nope$/.test(boomy.said[0] || '') && boomy.meshes.size === 0 && boomy.run.frList.length === 0, 'if the game refuses a call it stops, cleans up and tells the caster')
const both = game('globalThis.seen = 0; tick = () => { globalThis.seen++ }; onPlayerChat = (id, m) => m === "x" ? "old" : undefined;')
both.run.tick(50)
check(both.run.onPlayerChat('p1', 'x') === 'old' && both.g.seen === 1, 'earlier tick and onPlayerChat still run')

console.log('Code block (runs only at the click: particles only, no meshes)')
const cut = code.slice(0, code.indexOf('var frOldTick')).trimEnd().replace('  chat: "!fr",\n', '')
const blockCode = 'if (typeof frOnce !== "function") {\n  (function () {\n' + cut + '\n  })()\n}\n' +
  'frOnce(myId, [thisPos[0] + 0.5, thisPos[1] + 1, thisPos[2] + 0.5])\n'
fs.writeFileSync(path.join(dir, 'code_block.js'), blockCode)
check(blockCode.length <= 32000 && !blockCode.includes('//') && !blockCode.includes('onPlayerChat') && !blockCode.includes('!fr'), `wrote code_block.js: ${blockCode.length} of 32,000 characters, no comments, no chat command`)
const g1 = game('', true)
new Function('api', 'globalThis', 'myId', 'thisPos', 'with (globalThis) {' + blockCode + '}')(g1.api, g1.bare, 'p1', [0, 9, 8])
{
  check(g1.errors.length === 0 && g1.meshes.size === 0 && g1.made === 0, 'one click: no mesh is created (a code block could never move or remove it)')
  const rings = g1.fx.filter((q) => q.count === 1 && ringOf(q) >= 0)
  check(rings.length === N && rings.every((q) => q.minLife === 4.5), `all ${N} ring points are emitted on the click and last 4.5 s`)
  const starDots = g1.fx.filter((q) => q.count === 1 && Math.abs(q.p[1] - 10.13) < 1e-9)
  check(starDots.length === 84, 'the star on the floor is 84 particles instead of 6 meshes')
  const fire = g1.fx.filter((q) => q.count === 30)
  const speed = fire[0].power, fly = fire[0].life
  check(fire.length === 1 && Math.abs(alongOf(fire[0].p) - 13) < 1e-6 && fire[0].minPower === speed && fire[0].slow === 1 && fire[0].d1.every((v, i) => Math.abs(v + AX[i]) < 1e-9) && Math.abs(speed * fly - 13) < 1e-6, `the fireball is a clump of 30 big particles thrown down the line: it reaches the floor after ${fly.toFixed(2)} s at a steady speed`)
  const trail = g1.fx.filter((q) => q.count === 12)
  // a trail puff must turn visible when the fireball gets there
  const onTime = trail.every((q) => { const shows = q.grads.find((g) => g[1][3] === 1)[0] * q.life; const there = (13 - alongOf(q.p)) / speed; return Math.abs(shows - there) < 0.12 && q.grads[0][1][3] === 0 })
  check(trail.length === 26 && onTime, 'its trail is 26 puffs waiting unseen along the line; each turns visible as the fireball reaches it')
  const flash = g1.fx.filter((q) => q.count === 26 || q.count === 60)
  check(flash.length === 2 && flash.every((q) => q.grads[1][1][3] === 0 && Math.abs(q.grads[2][0] * q.life - fly) < 1e-6), 'the landing flash waits unseen on the floor and shows the moment the fireball arrives')
  check(g1.hurt.length === 0, 'no damage from the code block version')
  check(g1.fx.length <= 460, `${g1.fx.length} particle calls on the click`)
}

console.log('Word filter (the game stars out words in code blocks, which breaks the code)')
{
  const SHORT = ['sx', 'pp', 'fk', 'fu', 'bj', 'hj', 'mf', 'bs', 'af', 'kys', 'wtf', 'ass', 'cum', 'tit', 'fag', 'sex', 'gay', 'hoe', 'vag', 'dik', 'fuk', 'fck', 'sht', 'bch', 'cok', 'kkk', 'nig', 'std', 'poo', 'pee', 'bum', 'sob', 'pos', 'pms', 'xxx', 'die', 'kms', 'gtfo', 'stfu', 'lmao', 'hell', 'damn', 'crap', 'piss', 'dick', 'cock', 'anal', 'anus', 'butt', 'slut', 'rape', 'kill', 'porn', 'suck', 'nazi', 'homo', 'arse', 'boob', 'jizz', 'orgy', 'wank', 'tard', 'shit', 'fuck', 'tits', 'dumb', 'noob', 'hate', 'sexy', 'nude', 'meth', 'coke', 'weed', 'drug', 'pedo', 'cunt', 'twat', 'dyke', 'spic', 'jerk', 'puss', 'turd', 'fart', 'milf', 'thot', 'simp']
  const LONG = SHORT.filter((w) => w.length >= 4).concat(['bitch', 'nigg', 'penis', 'vagin', 'pussy', 'whore', 'idiot', 'stupid', 'retard', 'faggot', 'bastard', 'asshole', 'suicide', 'murder', 'horny', 'satan', 'demon'])
  const leet = (w) => w.replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't').replace(/8/g, 'b')
  const tokens = blockCode.split(/\s+/).filter(Boolean)
  const words = tokens.map((tok) => tok.toLowerCase().replace(/[^a-z0-9]/g, ''))
  const tiny = [...new Set(tokens.filter((tok, i) => /[^A-Za-z0-9]/.test(tok) && /[a-z]/.test(words[i]) && words[i].length <= 2))]
  check(tiny.length === 0, 'no piece of code shrinks to a 1 or 2 letter word when its punctuation is removed' + (tiny.length ? ': ' + tiny.slice(0, 8).join('  ') : ''))
  const exact = [...new Set(tokens.filter((tok, i) => !/^[0-9]+$/.test(words[i]) && (SHORT.includes(words[i]) || SHORT.includes(leet(words[i])))))]
  check(exact.length === 0, 'no piece of code reads as a filtered word' + (exact.length ? ': ' + exact.slice(0, 8).join('  ') : ''))
  const inside = [...new Set(tokens.filter((tok, i) => LONG.some((w) => words[i].includes(w) || leet(words[i]).includes(w))))]
  check(inside.length === 0, 'no piece of code has a filtered word of 4+ letters inside it' + (inside.length ? ': ' + inside.slice(0, 8).join('  ') : ''))
  const names = [...new Set(blockCode.replace(/"(?:[^"\\]|\\.)*"/g, '""').match(/[A-Za-z_$][A-Za-z0-9_$]*/g))].filter((w) => w.length <= 2 && !['if', 'PI'].includes(w))
  check(names.length === 0, 'no 1 or 2 letter names are left in the code' + (names.length ? ': ' + names.join(' ') : ''))
}

if (args.includes('--dump')) {
  const shot = (n) => ({ meshes: run.frames[n], fx: s.fx.filter((q) => q.n <= n && q.n + q.life * 20 > n).map((q) => ({ ...q, t: (n - q.n) / 20 })) })
  const once = (t) => ({ meshes: [], fx: g1.fx.filter((q) => q.life > t).map((q) => ({ ...q, t })) })
  fs.writeFileSync(args[args.indexOf('--dump') + 1], JSON.stringify({ frames: [shot(14), shot(38), shot(56), shot(64), shot(70), once(2.6)], base: BASE, player: [0.5, 10, 0.5] }))
}
console.log(fail.length ? `\n${fail.length} check(s) failed` : '\nAll checks passed')
process.exit(fail.length ? 1 : 0)
