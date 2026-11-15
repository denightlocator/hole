// Runs code_block.js against a stand-in game for the full 502 ticks. Run: node tools/check.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const code = fs.readFileSync(path.join(dir, 'code_block.js'), 'utf8')
const fail = []
const check = (ok, msg) => { console.log((ok ? '  ok    ' : '  FAIL  ') + msg); if (!ok) fail.push(msg) }
const meshes = new Map(); let next = 1, peak = 0, fx = 0, bad = 0
const said = []
const fin = (v) => (Array.isArray(v) ? v.every(fin) : typeof v === 'object' && v ? Object.values(v).every(fin) : typeof v !== 'number' || Number.isFinite(v))
const api = {
  getPosition: () => [0.5, 10, 0.5],
  getPlayerFacingInfo: () => ({ dir: [1, 0, 0] }),
  attemptCreateMeshEntity: (t, o) => { if (!fin(o)) bad++; const id = 'm' + next++; meshes.set(id, { o, p: null }); peak = Math.max(peak, meshes.size); return id },
  deleteMeshEntity: (id) => { if (!meshes.delete(id)) throw new Error('no such mesh') },
  setPosition: (id, x, y, z) => { if (!fin([x, y, z]) || !meshes.has(id)) bad++; else meshes.get(id).p = [x, y, z] },
  setEntityRotation: (id, x, y, z) => { if (!fin([x, y, z])) bad++ },
  playParticleEffect: (o) => { fx++; if (!fin(o)) bad++ },
  broadcastMessage: (m) => said.push(m),
  broadcastSound: () => {},
}
const g = {}
check(!code.includes('*****') && !/===0|\.flick/.test(code) && !code.includes('//'), 'no starred-out spots, none of the patterns that got starred, no // comments')
check(code.length <= 32000, `code_block.js is ${code.length} characters (code block limit 32,000)`)
new Function('api', 'globalThis', 'myId', 'thisPos', code)(api, g, 'p1', [0, 9, 0])
check(typeof g.runTimer14 === 'function' && meshes.size === 47, 'one click builds the sword (20) and the stone (27) and sets the tick function')
const stone = [...meshes.values()]
let seenBlade = 0, rubble = 0, n = 0
while (g.runTimer14 && n < 600) {
  g.runTimer14(); n++
  if (n === 20) check(stone[30].p[0] > 6.5 && Math.abs(stone[30].p[2] - 0.5) < 6, 'the stone comes up 7 blocks ahead in the direction the player looks (also when the game calls it "dir")')
  if (n === 186) seenBlade = meshes.size
  if (n === 280) rubble = meshes.size
}
check(n === 502 && !g.runTimer14, 'it runs all 502 ticks (25 s) and then switches itself off')
check(!said.some((m) => /error/i.test(m)), 'no error message: ' + said.filter((m) => /error/i.test(m)).join('; '))
check(seenBlade === 20 + 27 + 1 + 18 + 5 && rubble > 30, 'bolt, clouds, flickering glow and rubble rings all appear')
check(meshes.size === 0 && g.excalParts14 === null, 'no mesh is left at the end')
check(peak <= 112 && bad === 0, `${peak} meshes at the most (its own cap is 112), ${fx} particle calls, every number is valid`)
console.log(fail.length ? `\n${fail.length} check(s) failed` : '\nAll checks passed')
process.exit(fail.length ? 1 : 0)
