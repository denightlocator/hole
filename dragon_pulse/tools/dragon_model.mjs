// Lays the dragon of world_code.js out straight, for tools/render_model.py.
// Usage: node tools/dragon_model.mjs out.json [detail] [head]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const world = fs.readFileSync(path.join(dir, 'world_code.js'), 'utf8')
const detail = Number(process.argv[3] || 3)
const g = new Function('api', 'globalThis', 'var tick, onPlayerChat, onPlayerAltAction;\n' + world +
  `\nreturn { head: dpRows("head", ${detail}), body: dpRows("body", ${detail}), tail: dpRows("tail", ${detail}), col: DP_COL }`)({}, {})
const headOnly = process.argv[4] === 'head'
const K = headOnly ? 2.1 : 0.5 // so that it fits the picture
const shift = headOnly ? 0.3 : 9.5
const rows = headOnly ? g.head : [...g.head, ...g.body, ...g.tail]
// a part with an aim points its depth along that direction: [forward, right, up]
const turn = (a) => { const l = Math.hypot(...a); return [-Math.asin(a[2] / l), Math.atan2(a[1], a[0]), 0] }
const meshes = rows.map((r) => ({
  width: r[1] * K, height: r[2] * K, depth: r[3] * K,
  diffuseColor: g.col[r[4]], emissiveColor: g.col[r[4]].map((v) => v * 0.3),
  p: [r[6] * K, 3.2 + r[7] * K, (r[5] + shift) * K], r: r[9] ? turn(r[9]) : [0, 0, 0],
}))
fs.writeFileSync(process.argv[2], JSON.stringify(meshes))
console.log(`detail ${detail}: head ${g.head.length}, body ${g.body.length}, orbs and trail ${g.tail.length}, together ${g.head.length + g.body.length + g.tail.length} meshes`)
