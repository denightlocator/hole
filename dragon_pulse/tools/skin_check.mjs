// Runs skin.js against a stand-in for the game's `api` and checks it.
// With --dump <skin> file.json it writes the skin for tools/render_model.py,
// on a guessed skeleton (the game does not publish where its nodes are).
// Usage: node tools/skin_check.mjs [--dump goodra skin.json]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const read = (f) => fs.readFileSync(path.join(dir, f), 'utf8')
const skin = read('skin.js')
const NODES = ['TorsoNode', 'HeadMesh', 'ArmRightMesh', 'ArmLeftMesh', 'LegLeftMesh', 'LegRightMesh']
const BOX = ['width', 'height', 'depth', 'diffuseColor', 'emissiveColor', 'hideDist']
const fail = []
const check = (ok, msg) => { console.log((ok ? '  ok    ' : '  FAIL  ') + msg); if (!ok) fail.push(msg) }
const finite = (v) => (Array.isArray(v) ? v.every(finite) : Number.isFinite(v))

function game(code) {
  const s = { calls: [], messages: [], errors: [], casts: 0 }
  s.api = {
    getPlayerIds: () => ['p'], getMobIds: () => [], getHeldItem: () => null, getBlock: () => 'Air',
    getPosition: () => [0.5, 10, 0.5], getPlayerFacingInfo: () => ({ camPos: [0.5, 11.6, 0.5], dir: [0, 0, 1] }),
    sendMessage: (id, m) => s.messages.push(m), broadcastSound: () => {}, playParticleEffect: () => {},
    attemptCreateMeshEntity: () => 'm' + Math.random(), setPosition: () => {}, setEntityRotation: () => {}, updateMeshEntity: () => {}, deleteMeshEntity: () => true,
    updateEntityNodeMeshAttachment: (id, node, type, o, offset, rot) => {
      if (id !== 'p' || !NODES.includes(node)) s.errors.push('bad node ' + node)
      if (type !== null) {
        if (type !== 'Box' || !Object.keys(o).every((k) => BOX.includes(k)) || !finite([o.width, o.height, o.depth, o.diffuseColor, o.emissiveColor, offset, rot]) || offset.length !== 3 || rot.length !== 3 || !(o.width > 0 && o.height > 0 && o.depth > 0)) s.errors.push('bad attachment on ' + node)
      }
      s.calls.push({ node, type, o, offset })
    },
  }
  s.run = new Function('api', 'globalThis', 'var tick, onPlayerChat, onPlayerAltAction;\n' + code +
    '\nreturn { chat: (m) => onPlayerChat("p", m), cfg: SKIN_CFG, skins: SKINS, casts: typeof dpCasts === "undefined" ? null : dpCasts }')(s.api, {})
  return s
}

console.log('Sizes')
check(skin.length <= 32000, `skin.js ${skin.length} characters: fits World Code (512000) and a code block (32000)`)
const all = [read('world_code.js'), read('goodra.js'), skin].join('\n')
check(all.length <= 512000, `world_code.js + goodra.js + skin.js ${all.length} of 512000 characters`)
check(!skin.includes('//'), 'no // comments')

let s = game(skin)
for (const name of Object.keys(s.run.skins)) {
  console.log('Skin ' + name)
  s.calls.length = 0
  check(s.run.chat('!skin ' + name) === false, `!skin ${name} is taken and hidden from chat`)
  const off = s.calls.slice(0, 6)
  const on = s.calls.slice(6)
  check(off.every((c) => c.type === null) && new Set(off.map((c) => c.node)).size === 6, 'the six nodes are cleared first')
  check(s.errors.length === 0, 'every call is well formed ' + [...new Set(s.errors)].join('; '))
  const last = {}
  on.forEach((c, i) => { last[c.node] = i })
  const base = Object.values(last).sort((a, b) => a - b)
  check(Object.keys(last).length === 6 && base[0] === on.length - 6, `${on.length} parts; the last one on each of the six nodes is its body part`)
  s.run.cfg.extras = false
  s.calls.length = 0
  s.run.chat('!skin ' + name)
  check(s.calls.length === 12, 'with extras off it is six parts, one per node')
  s.run.cfg.extras = true
}
s.calls.length = 0
s.run.chat('!skin off')
check(s.calls.length === 6 && s.calls.every((c) => c.type === null), '!skin off clears the six nodes')
s.run.chat('!skin nothing')
check(s.messages.length === 1, 'an unknown name lists the skins')
check(s.run.chat('hello') === undefined, 'other chat messages pass through')

console.log('Below world_code.js and goodra.js')
s = game(all)
check(s.run.chat('!dp') === false && s.run.casts.length === 1, '!dp still casts')
s.run.chat('!skin goodra')
check(s.calls.length > 6, '!skin still works')

const at = process.argv.indexOf('--dump')
if (at >= 0) {
  // where the nodes might be on a player 1.8 blocks tall: a guess, for the drawing only
  const BONE = { HeadMesh: [0, 1.5, 0], TorsoNode: [0, 1.1, 0], ArmRightMesh: [0.46, 1.45, 0], ArmLeftMesh: [-0.46, 1.45, 0], LegRightMesh: [0.16, 0.72, 0], LegLeftMesh: [-0.16, 0.72, 0] }
  const K = 3.4
  s = game(skin)
  s.run.chat('!skin ' + process.argv[at + 1])
  const meshes = s.calls.filter((c) => c.type).map((c) => ({
    width: c.o.width * K, height: c.o.height * K, depth: c.o.depth * K,
    diffuseColor: c.o.diffuseColor.some((v) => v) ? c.o.diffuseColor : c.o.emissiveColor,
    emissiveColor: c.o.emissiveColor.map((v) => v * (c.o.diffuseColor.some((d) => d) ? 1 : 0.3)),
    p: c.offset.map((v, i) => (v + BONE[c.node][i]) * K), r: [0, 0, 0],
  }))
  fs.writeFileSync(process.argv[at + 2], JSON.stringify(meshes))
}
if (fail.length) { console.log(`\n${fail.length} check(s) failed`); process.exit(1) }
console.log('\nAll checks passed')
