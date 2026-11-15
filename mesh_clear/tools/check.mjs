// Stand-in test for the "remove every mesh" code block. Run: node tools/check.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const code = fs.readFileSync(path.join(dir, 'code_block.js'), 'utf8')
const holo = fs.readFileSync(path.join(dir, '..', 'hologram', 'code_block.js'), 'utf8')
const fail = []
const check = (ok, msg) => { console.log((ok ? '  ok    ' : '  FAIL  ') + msg); if (!ok) fail.push(msg) }

const ents = new Map()
let next = 1
const said = []
const api = {
  getPlayerIds: () => ['p1', 'p2'],
  getMobIds: () => ['sheep'],
  getPosition: () => [0.5, 10, 0.5],
  getPlayerFacingInfo: () => ({ camPos: [0.5, 11.6, 0.5], dir: [0, -0.2, 0.98] }),
  sendMessage: (id, m) => said.push(m),
  broadcastSound: () => {},
  playParticleEffect: () => {},
  getEntitiesInRect: (lo, hi) => [...ents.entries()].filter(([, e]) => e.p.every((v, i) => v >= lo[i] && v <= hi[i])).map(([id]) => id),
  attemptCreateMeshEntity: () => { const id = 'm' + next++; ents.set(id, { kind: 'mesh', p: [0, 0, 0] }); return id },
  updateMeshEntity: () => {},
  setPosition: (id, x, y, z) => { ents.get(id).p = [x, y, z] },
  setEntityRotation: () => {},
  // like the game might: refuses anything that is not a mesh
  deleteMeshEntity: (id) => { const e = ents.get(id); if (!e) return false; if (e.kind === 'item') throw new Error('not a mesh'); if (e.kind !== 'mesh') return false; ents.delete(id); return true },
}
ents.set('p1', { kind: 'player', p: [0.5, 10, 0.5] })
ents.set('p2', { kind: 'player', p: [5, 10, 5] })
ents.set('sheep', { kind: 'mob', p: [3, 10, 3] })
ents.set('drop', { kind: 'item', p: [2, 10, 2] })
const g = {}
const click = (src, pos) => new Function('api', 'globalThis', 'myId', 'thisPos', 'with (globalThis) {' + src + '}')(api, g, 'p1', pos)

for (let i = 0; i < 40; i++) api.setPosition(api.attemptCreateMeshEntity(), i - 20, 10 + (i % 5), 7)
api.setPosition(api.attemptCreateMeshEntity(), 400, 10, 0)
click(holo, [0, 10, 4])
const meshes = () => [...ents.values()].filter((e) => e.kind === 'mesh').length
check(meshes() === 161, '40 loose meshes, a 120-mesh hologram and 1 mesh far away exist before the click')
click(code, [0, 10, 0])
check(meshes() === 1, 'one click removes every mesh within 150 blocks, whoever made it (the one 400 blocks away stays)')
check(['p1', 'p2', 'sheep', 'drop'].every((id) => ents.has(id)), 'players, mobs and dropped items are left alone')
check(said[0] === 'Removed 160 meshes within 150 blocks.', `it reports: "${said[0]}"`)
click(holo, [0, 10, 4])
check(meshes() === 121, 'the hologram block knows it was cleared: the next click on it opens a fresh hologram (not "close")')
click(code, [0, 10, 0])
click(code, [0, 10, 0])
check(said[2] === 'Removed 0 meshes within 150 blocks.', 'clicking it with nothing to remove does no harm')
check(code.length <= 32000 && !code.includes('//'), `code_block.js is ${code.length} of 32,000 characters, no comments`)
const tokens = code.split(/\s+/).filter(Boolean)
const tiny = tokens.filter((tok) => /[^A-Za-z0-9]/.test(tok) && /[a-z]/.test(tok.toLowerCase().replace(/[^a-z0-9]/g, '')) && tok.toLowerCase().replace(/[^a-z0-9]/g, '').length <= 2)
const names = [...new Set(code.replace(/"(?:[^"\\]|\\.)*"/g, '""').match(/[A-Za-z_$][A-Za-z0-9_$]*/g))].filter((w) => w.length <= 2 && w !== 'if')
check(tiny.length === 0 && names.length === 0, 'no short names for the word filter to catch ' + tiny.concat(names).join(' '))
console.log(fail.length ? `\n${fail.length} check(s) failed` : '\nAll checks passed')
process.exit(fail.length ? 1 : 0)
