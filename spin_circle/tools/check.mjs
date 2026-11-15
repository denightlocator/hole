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
const SOUNDS = ['ominousBellHit', 'suspenseRiser', 'magicAccent2']
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
      s.fx.push({ n: s.now, a: o.pos1, b: o.pos2, p: o.pos1.map((v, i) => (v + o.pos2[i]) / 2), col: o.colorGradients[1].maxColor.slice(0, 3), life: o.maxLifeTime, power: o.maxEmitPower, size: o.maxSize, count: o.manualEmitCount, dir: o.dir2, tex: o.texture })
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
check(s.run.onPlayerChat('p1', 'hello') === undefined && s.run.onPlayerChat('p1', '!circle') === false && s.run.riteList.length === 1, '!circle opens it and is hidden from chat')
play(s, 320)
check(s.errors.length === 0, 'every particle call is well formed; no mesh is ever created (the test game has no mesh functions) ' + [...new Set(s.errors)].join('; '))
const floor = s.fx.filter((q) => q.tex === 'square_particle' && q.power === 0)
const rOf = (q) => Math.hypot(q.p[0] - 0.5, q.p[2] - 0.5)
const aOf = (q) => Math.atan2(q.p[0] - 0.5, q.p[2] - 0.5)
const live = (n) => floor.filter((q) => q.n <= n && q.n + q.life * 20 > n)
const at150 = live(150)
check(N > 180 && N < 260, `the pattern is ${N} points: three rings and a five-pointed star`)
check(at150.length >= N && at150.length <= N * 1.8, `${at150.length} floor particles are alive at any moment, so every point of the pattern stays lit`)
const radii = (lo, hi) => at150.filter((q) => rOf(q) > lo && rOf(q) < hi).length
check(radii(4.95, 5.05) >= 58 && radii(4.45, 4.55) >= 52 && radii(3.85, 3.95) >= 46, 'three rings at 5, 4.5 and 3.9 blocks from the centre')
const inner = at150.filter((q) => rOf(q) < 3.8)
check(inner.length >= 50 && Math.min(...inner.map(rOf)) > 1.1 && Math.min(...inner.map(rOf)) < 1.3, `${inner.length} points inside the rings draw the star (its lines pass 1.2 blocks from the centre)`)
check(floor.every((q) => Math.abs(q.p[1] - 10.12) < 1e-9 && rOf(q) < 5.01), 'it lies flat on the floor and is 10 blocks across')
check(floor.every((q) => q.col[0] > 200 && q.col[1] < 120 && q.col[2] < 60), 'floor particles are orange-red')
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
check(sparks.length === 320 && sparks.every((q) => rOf(q) < 0.01 && q.dir[1] > 0 && q.col.every((v) => v === 255)), 'white sparks rise from the centre every tick')
const glyphs = s.fx.filter((q) => q.tex === 'square_particle' && q.power > 0)
check(glyphs.length >= 100 && glyphs.every((q) => rOf(q) > 5.5 && rOf(q) < 9.2 && q.p[1] > 13 && q.p[1] < 19.5 && q.dir[1] < 0) && glyphs.some((q) => q.col[1] < 200), `${glyphs.length} short falling strings of white and pink squares appear in the air around it`)
const perTick = Math.max(...Array.from({ length: 320 }, (_, n) => s.fx.filter((q) => q.n === n).length))
check(perTick <= each + 3, `at most ${perTick} particle calls in a tick`)
check(s.sounds.includes('ominousBellHit'), 'a sound plays when it opens')

console.log('Closing')
const before = s.fx.length
check(s.g.spinCircle('p1') === false, '!circle again closes it')
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
const noChat = code.slice(0, code.indexOf('var riteOldChat')).trimEnd()
const blockCode = 'if (typeof spinCircleStill !== "function") {\n  (function () {\n' + noChat + '\n  })()\n  globalThis.riteSeen = -1\n}\n' +
  'var riteHere = [thisPos[0] + 0.5, thisPos[1] + 1, thisPos[2] + 0.5]\n' +
  'if (globalThis.riteSeen === spinCircleBeat()) spinCircleStill(myId, riteHere)\n' +
  'else spinCircle(myId, riteHere, true)\n' +
  'globalThis.riteSeen = spinCircleBeat()\n'
fs.writeFileSync(path.join(dir, 'code_block.js'), blockCode)
check(blockCode.length <= 32000 && !blockCode.includes('//') && !blockCode.includes('onPlayerChat'), `wrote code_block.js: ${blockCode.length} of 32,000 characters, no comments, no chat command`)
{
  const click = (g) => new Function('api', 'globalThis', 'myId', 'thisPos', 'with (globalThis) {' + blockCode + '}')(g.api, g.bare, 'p1', [0, 10, 0])
  const g1 = game('', true)
  click(g1)
  play(g1, 100, (ms) => g1.bare.tick(ms))
  const f = g1.fx.filter((q) => q.tex === 'square_particle' && q.power === 0 && q.n > 40)
  check(g1.errors.length === 0 && f.length > 2000 && f.every((q) => Math.abs(q.p[1] - 11.12) < 1e-9 && rOf(q) < 5.01), 'one click with no world code: the circle spins on top of the block, centred on it')
  click(g1)
  const n = g1.fx.length
  play(g1, 20, (ms) => g1.bare.tick(ms))
  check(g1.fx.length === n, 'clicking again closes it')
  const g2 = game('', true)
  click(g2)
  check(g2.fx.length === N && g2.fx.every((q) => q.life < 0.5 && rOf(q) > 1.1), 'the click itself draws the whole circle at full size straight away; tick then keeps it lit and spinning')
  click(g2)
  const still = g2.fx.slice(N)
  check(still.length === N && still.every((q) => q.life >= 8) && g2.errors.length === 0, `if the game never runs tick, that first circle is only a half-second flash; the second click then draws a still circle that lasts 8 seconds`)
  click(g2)
  check(g2.fx.length === 3 * N, 'and every further click draws it again')
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
  fs.writeFileSync(args[args.indexOf('--dump') + 1], JSON.stringify({ frames: [shot(8), shot(150), shot(170)], mid: [0.5, 10, 0.5] }))
}
console.log(fail.length ? `\n${fail.length} check(s) failed` : '\nAll checks passed')
process.exit(fail.length ? 1 : 0)
