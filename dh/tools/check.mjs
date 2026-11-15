// Stand-in game test for the spinning particle circle. Run: node tools/check.mjs [--dump frames.json]
// It also writes code_block.js (the standalone code block) from the world code.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const code = fs.readFileSync(path.join(dir, 'world_code.js'), 'utf8')
const args = process.argv.slice(2)
const PARTICLE = ['dir1', 'dir2', 'pos1', 'pos2', 'texture', 'minLifeTime', 'maxLifeTime', 'minEmitPower', 'maxEmitPower', 'minSize', 'maxSize',
  'manualEmitCount', 'gravity', 'colorGradients', 'velocityGradients', 'blendMode']
const TEXTURES = ['square_particle', 'glint']
const SOUNDS = []
const finite = (v) => (Array.isArray(v) ? v.every(finite) : typeof v === 'object' && v ? Object.values(v).every(finite) : typeof v !== 'number' || Number.isFinite(v))
const fail = []
const check = (ok, msg) => { console.log((ok ? '  ok    ' : '  FAIL  ') + msg); if (!ok) fail.push(msg) }

// The api stub has no mesh functions at all: using one would throw.
function game(before = '', bare = false) {
  const s = { fx: [], now: 0, errors: [], sounds: [], said: [] }
  const need = (ok, msg) => { if (!ok) s.errors.push(msg) }
  s.api = {
    getPosition: () => [0.5, 10, 0.5],
    sendMessage: (id, m) => s.said.push(m),
    broadcastSound: (name, vol, rate, o) => { need(SOUNDS.includes(name) && finite([vol, rate, o.playerIdOrPos]), 'sound ' + name); s.sounds.push(name) },
    playParticleEffect: (o) => {
      need(PARTICLE.every((k) => k in o) && finite(o) && TEXTURES.includes(o.texture) && o.colorGradients.every((g) => g.minColor.length === 4 && g.maxColor.length === 4) && o.minLifeTime > 0 && o.minSize > 0, 'bad particle')
      s.fx.push({ n: s.now, a: o.pos1, b: o.pos2, p: o.pos1.map((v, i) => (v + o.pos2[i]) / 2), col: o.colorGradients[1].maxColor.slice(0, 3), grads: o.colorGradients, life: o.maxLifeTime, power: o.maxEmitPower, size: o.maxSize, count: o.manualEmitCount, dir: o.dir2, tex: o.texture })
    },
  }
  s.g = {}
  if (bare) { s.bare = { tick: undefined, onPlayerChat: undefined }; return s }
  s.run = new Function('api', 'globalThis', 'var tick, onPlayerChat;\n' + before + '\n' + code + '\nreturn { tick, onPlayerChat, RITE_CFG, riteList, ritePlan }')(s.api, s.g)
  return s
}
const play = (s, ticks, tick = s.run?.tick) => { for (let n = 0; n < ticks; n++) { tick(50); s.now++ } }

console.log('Sizes')
check(code.length <= 512000 && !code.includes('//'), `world_code.js is ${code.length} characters, no // comments`)

console.log('The circle')
const s = game()
const N = s.run.ritePlan.length
check(s.run.onPlayerChat('p1', 'hello') === undefined && s.run.onPlayerChat('p1', '!dh') === false && s.run.riteList.length === 1, '!dh opens it and is hidden from chat')
play(s, 420)
check(s.errors.length === 0, 'every particle call is well formed; no mesh is ever created (the test game has no mesh functions) ' + [...new Set(s.errors)].join('; '))
const floor = s.fx.filter((q) => q.tex === 'square_particle' && q.power === 0)
const rOf = (q) => Math.hypot(q.p[0] - 0.5, q.p[2] - 0.5)
const aOf = (q) => Math.atan2(q.p[0] - 0.5, q.p[2] - 0.5)
const live = (n) => floor.filter((q) => q.n <= n && q.n + q.life * 20 > n)
const at150 = live(150)
check(N === 270, `the pattern is ${N} points (70 + 64 + 56 on the rings, 16 on each line of the star), 2 particles on each`)
check(at150.length >= N && at150.length <= N * 1.8, `${at150.length} floor particles are alive at any moment, so every point of the pattern stays lit`)
const radii = (lo, hi) => at150.filter((q) => rOf(q) > lo && rOf(q) < hi).length
check(radii(4.95, 5.05) >= 70 && radii(4.45, 4.55) >= 64 && radii(3.85, 3.95) >= 56, 'three rings at 5, 4.5 and 3.9 blocks from the centre')
const inner = at150.filter((q) => rOf(q) < 3.8)
check(inner.length >= 70 && Math.min(...inner.map(rOf)) > 1.1 && Math.min(...inner.map(rOf)) < 1.3, `${inner.length} points inside the rings draw the star (its lines pass 1.2 blocks from the centre)`)
check(floor.every((q) => Math.abs(q.p[1] - 10.12) < 1e-9 && rOf(q) < 5.01), 'it lies flat on the floor and is 10 blocks across')
check(floor.every((q) => q.grads.every((g) => [g.minColor, g.maxColor].every((v) => v.join() === '255,62,18,1'))), 'floor particles are the same solid red (255, 62, 18) from the moment they appear until they are gone: no yellow start, no dark end, no fading')
const each = s.run.RITE_CFG.pointsPerTick
const idxOf = (n, k) => floor.filter((q) => q.n === n)[k]
const rounds = Math.ceil(N / each)
// the same plan point comes round again after N ticks (N * each emits = each full passes)
const turnOf = (k) => { const a = idxOf(60, k), b = idxOf(60 + N, k); return { r: rOf(a), same: Math.abs(rOf(a) - rOf(b)) < 1e-6, d: Math.atan2(Math.sin(aOf(b) - aOf(a)), Math.cos(aOf(b) - aOf(a))) } }
const turns = Array.from({ length: each }, (_, k) => turnOf(k))
const expect = ((N * 0.5) / 20) % (2 * Math.PI)
const wrap = (v) => Math.atan2(Math.sin(v), Math.cos(v))
check(turns.every((q) => q.same) && turns.every((q) => Math.abs(Math.abs(q.d) - Math.abs(wrap(expect))) < 1e-6), 'it spins: every point keeps its distance from the centre and turns 0.5 radians a second (a full turn in 12.6 s)')
check(turns.filter((q) => q.r > 4.4).every((q) => Math.sign(q.d) !== Math.sign(turns.find((x) => x.r < 3.95).d)), 'the two outer rings turn one way, the inner ring and the star the other way')
const early = floor.filter((q) => q.n === 0), later = floor.filter((q) => q.n === 30)
check(Math.max(...early.map(rOf)) < 1 && Math.max(...later.map(rOf)) > 4.9, 'it opens by growing out from the centre in 1.2 seconds')
const sparks = s.fx.filter((q) => q.tex === 'glint')
check(sparks.length === 420 && sparks.every((q) => rOf(q) < 0.01 && q.dir[1] > 0 && q.col.every((v) => v === 255)), 'white sparks rise from the centre every tick')
const glyphs = s.fx.filter((q) => q.tex === 'square_particle' && q.power > 0)
check(glyphs.length >= 100 && glyphs.every((q) => rOf(q) > 5.5 && rOf(q) < 9.2 && q.p[1] > 13 && q.p[1] < 19.5 && q.dir[1] < 0) && glyphs.some((q) => q.col[1] < 200), `${glyphs.length} short falling strings of white and pink squares appear in the air around it`)
const perTick = Math.max(...Array.from({ length: 420 }, (_, n) => s.fx.filter((q) => q.n === n).length))
check(perTick <= each + 3, `at most ${perTick} particle calls in a tick`)
check(s.sounds.length === 0 && !/sound/i.test(code), 'it makes no sound: there is no sound code left')
check(floor.every((q) => q.count === 2 && q.b[0] - q.a[0] <= 0.18 + 1e-9), 'each point is 2 particles within 0.09 blocks, so the lines are thicker and denser')

console.log('Closing')
const before = s.fx.length
check(s.g.dh === s.g.spinCircle && s.g.dh('p1') === false, '!dh again closes it (dh(playerId) is the same function)')
play(s, 30)
check(s.fx.length === before && s.run.riteList.length === 0, 'no more particles are emitted; the last ones fade within half a second')
const timed = game()
timed.run.RITE_CFG.duration = 3
timed.g.spinCircle('p1')
play(timed, 100)
check(timed.run.riteList.length === 0 && Math.max(...timed.fx.map((q) => q.n)) === 60, 'with duration 3 it ends by itself after 3 seconds')
const both = game('globalThis.seen = 0; tick = () => { globalThis.seen++ }; onPlayerChat = (id, m) => m === "x" ? "old" : undefined;')
both.run.tick(50)
check(both.run.onPlayerChat('p1', 'x') === 'old' && both.g.seen === 1, 'earlier tick and onPlayerChat still run')

console.log('Code block')
const noChat = code.slice(0, code.indexOf('var riteOldTick')).trimEnd().replace('  chat: "!dh",\n', '')
check(!noChat.includes('!dh') && !noChat.includes('tick ='), 'the code block has no chat command and does not rely on tick (the game does not run tick for code blocks)')
const blockCode = 'if (typeof spinCircleOnce !== "function") {\n  (function () {\n' + noChat + '\n  })()\n}\n' +
  'spinCircleOnce(myId, [thisPos[0] + 0.5, thisPos[1] + 1, thisPos[2] + 0.5])\n'
fs.writeFileSync(path.join(dir, 'code_block.js'), blockCode)
check(blockCode.length <= 32000 && !blockCode.includes('//') && !blockCode.includes('onPlayerChat'), `wrote code_block.js: ${blockCode.length} of 32,000 characters, no comments, no chat command`)
let onceShots = null
{
  const click = (g) => new Function('api', 'globalThis', 'myId', 'thisPos', 'with (globalThis) {' + blockCode + '}')(g.api, g.bare, 'p1', [0, 10, 0])
  const g1 = game('', true)
  g1.api.playParticleEffect = ((old) => (o) => { old(o); Object.assign(g1.fx[g1.fx.length - 1], { grav: o.gravity, vel: o.dir1.map((v) => v * o.minEmitPower), minPower: o.minEmitPower, minLife: o.minLifeTime, vg: o.velocityGradients }) })(g1.api.playParticleEffect)
  click(g1)
  const ring = g1.fx.filter((q) => q.tex === 'square_particle')
  check(g1.errors.length === 0 && ring.length === N && g1.fx.length === N + 1, `one click, nothing else needed: all ${N} points are emitted at once, plus one burst of sparks`)
  check(ring.every((q) => q.minLife === 6 && q.life === 6 && q.minPower === q.power && q.vg.every((v) => v.factor === 1) && q.grads.every((v) => v.maxColor.join() === '255,62,18,1')), 'every particle lives 6 seconds, solid red, with an exact speed')
  // where a particle is after t seconds: start + speed * t + half the pull * t squared
  const whereAt = (q, t) => q.p.map((v, i) => v + q.vel[i] * t + 0.5 * q.grav[i] * t * t)
  const worst = (t) => {
    const th = t / 6
    const turn = Math.atan2(th, 1 - th * th / 2), grow = Math.sqrt(1 + th ** 4 / 4)
    let bad = 0
    for (const q of ring) {
      const r0 = Math.hypot(q.p[0] - 0.5, q.p[2] - 0.5), a0 = Math.atan2(q.p[0] - 0.5, q.p[2] - 0.5)
      const dirn = Math.abs(r0 - 5) < 0.01 || Math.abs(r0 - 4.5) < 0.01 ? -1 : 1
      const w = whereAt(q, t)
      const ex = [0.5 + Math.sin(a0 + dirn * turn) * r0 * grow, 0.5 + Math.cos(a0 + dirn * turn) * r0 * grow]
      bad = Math.max(bad, Math.hypot(w[0] - ex[0], w[2] - ex[1]), Math.abs(w[1] - 11.12))
    }
    return { bad, turn: (turn * 180) / Math.PI, grow }
  }
  const half = worst(3), end = worst(6)
  check([1, 2, 3, 4, 5, 6].every((t) => worst(t).bad < 1e-9), 'the particles themselves carry the turn: each one is thrown sideways and pulled toward the centre, so the whole pattern turns as one piece without any more code running')
  check(Math.abs(end.turn - 63.4) < 0.1 && Math.abs(half.turn - 29.7) < 0.1, `it turns ${half.turn.toFixed(0)} degrees in the first 3 seconds and ${end.turn.toFixed(0)} degrees in all; the two outer rings go the other way, so they slide ${(2 * end.turn).toFixed(0)} degrees past the star`)
  check(end.grow < 1.12 && half.grow < 1.01, `side effect: it also grows a little while turning, ${((half.grow - 1) * 100).toFixed(1)}% after 3 seconds and ${((end.grow - 1) * 100).toFixed(0)}% at the end`)
  click(g1)
  check(g1.fx.length === 2 * (N + 1), 'every click starts it again')
  onceShots = [0, 3, 6].map((t) => ring.map((q) => ({ ...q, a: whereAt(q, t), b: whereAt(q, t), p: whereAt(q, t), power: 0, age: 0 })))
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
  const exact = [...new Set(tokens.filter((tok, i) => SHORT.includes(words[i]) || SHORT.includes(leet(words[i]))))]
  check(exact.length === 0, 'no piece of code reads as a filtered word' + (exact.length ? ': ' + exact.slice(0, 8).join('  ') : ''))
  const inside = [...new Set(tokens.filter((tok, i) => LONG.some((w) => words[i].includes(w) || leet(words[i]).includes(w))))]
  check(inside.length === 0, 'no piece of code has a filtered word of 4+ letters inside it' + (inside.length ? ': ' + inside.slice(0, 8).join('  ') : ''))
  const names = [...new Set(blockCode.replace(/"(?:[^"\\]|\\.)*"/g, '""').match(/[A-Za-z_$][A-Za-z0-9_$]*/g))].filter((w) => w.length <= 2 && !['if', 'PI'].includes(w))
  check(names.length === 0, 'no 1 or 2 letter names are left in the code' + (names.length ? ': ' + names.join(' ') : ''))
}

if (args.includes('--dump')) {
  const shot = (n) => s.fx.filter((q) => q.n <= n && q.n + q.life * 20 > n).map((q) => ({ ...q, age: (n - q.n) / (q.life * 20) }))
  fs.writeFileSync(args[args.indexOf('--dump') + 1], JSON.stringify({ frames: [shot(8), shot(150), shot(170)], once: onceShots, mid: [0.5, 10, 0.5] }))
}
console.log(fail.length ? `\n${fail.length} check(s) failed` : '\nAll checks passed')
process.exit(fail.length ? 1 : 0)
