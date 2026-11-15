// Runs code_block.js against a stand-in game. Run: node tools/check.mjs [--dump boxes.json]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const code = fs.readFileSync(path.join(dir, 'code_block.js'), 'utf8')
const fail = []
const check = (ok, msg) => { console.log((ok ? '  ok    ' : '  FAIL  ') + msg); if (!ok) fail.push(msg) }
const meshes = new Map(); let next = 1, bad = 0; const said = []
const fin = (v) => (Array.isArray(v) ? v.every(fin) : typeof v === 'object' && v ? Object.values(v).every(fin) : typeof v !== 'number' || Number.isFinite(v))
const api = {
  attemptCreateMeshEntity: (t, o) => { if (t !== 'Box' || !fin(o) || !(o.width > 0 && o.height > 0 && o.depth > 0)) bad++; const id = 'm' + next++; meshes.set(id, { ...o, p: null, r: [0, 0, 0] }); return id },
  deleteMeshEntity: (id) => { if (!meshes.delete(id)) bad++ },
  setPosition: (id, x, y, z) => { if (!fin([x, y, z])) bad++; meshes.get(id).p = [x, y, z] },
  setEntityRotation: (id, x, y, z) => { if (!fin([x, y, z]) || x || z) bad++; meshes.get(id).r = [x, y, z] },
  sendMessage: (id, m) => said.push(m),
}
const g = {}
const click = () => new Function('api', 'globalThis', 'myId', 'thisPos', 'with (globalThis) {' + code + '}')(api, g, 'p1', [0, 9, 0])
const words = code.split(/\s+/).map((w) => w.replace(/[^a-zA-Z0-9]/g, '')).filter(Boolean)
check(code.length <= 32000 && !code.includes('//') && !/===\s*0|\*\*/.test(code), `code_block.js is ${code.length} characters (limit 32,000), no comments, none of the patterns the filter starred before`)
check(!words.some((w) => /^[a-zA-Z]{1,2}$/.test(w) && !['if', 'in'].includes(w)), 'no one- or two-letter names')
click()
const list = [...meshes.values()]
check(list.length === 88 && bad === 0, `one click builds the bomb from ${list.length} meshes, every one a level box with valid numbers`)
const ys = list.map((m) => [m.p[1] - m.height / 2, m.p[1] + m.height / 2])
const low = Math.min(...ys.map((y) => y[0])), high = Math.max(...ys.map((y) => y[1]))
const wide = Math.max(...list.map((m) => Math.hypot(m.p[0] - 0.5, m.p[2] - 0.5)))
check(Math.abs(low - 11) < 0.02 && high - low > 4.7 && high - low < 5 && wide < 1.2, `it stands nose down above the block: ${(high - low).toFixed(1)} blocks tall, about 2 wide, nose 1 block above the block`)
click()
check(meshes.size === 0, 'a second click removes it')
click()
check(meshes.size === 88, 'a third click builds it again')
check(said.length === 0 && !code.includes('sendMessage'), 'it sends no chat messages')
const args = process.argv.slice(2)
if (args.includes('--dump')) fs.writeFileSync(args[args.indexOf('--dump') + 1], JSON.stringify([...meshes.values()]))
console.log(fail.length ? `\n${fail.length} check(s) failed` : '\nAll checks passed')
process.exit(fail.length ? 1 : 0)
