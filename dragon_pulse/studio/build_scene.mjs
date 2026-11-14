// Writes studio/dragon_pulse.scene.json: the particles of the move as a scene
// for the Bloxd Particle Studio (press Open there and pick the file).
//
//   node studio/build_scene.mjs                 write the scene
//   node studio/build_scene.mjs <studio folder> also check it with the studio's
//                                               own code, and write its export
//                                               to particles_only.code_block.js
//
// The scene is fired along +Z from the crate. Seconds match world_code.js fired at nothing.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const AGE = 0.6 // the studio's "life" is on the game's particle clock: 0.6 per second
const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('')
const C = {
  white: hex([255, 255, 255]), violet: hex([165, 70, 255]), orange: hex([255, 125, 30]), cyan: hex([40, 195, 255]),
  pink: hex([255, 95, 205]), blue: hex([75, 95, 255]), gold: hex([255, 205, 45]), smoke: hex([236, 239, 250]), shade: hex([118, 128, 176]),
}
const r2 = (v) => Math.round(v * 100) / 100

const objects = []
let n = 0
const group = (name, start) => {
  const id = 'dp-g' + ++n
  objects.push({ id, name, shape: 'group', pos: [0, 0, 0], rot: [0, 0, 0], scale: [1, 1, 1], start, open: false })
  return id
}
// seconds: how long it is seen. speed: blocks per second.
const add = (parent, name, shape, o) => {
  objects.push({
    id: 'dp-' + ++n, name, shape, parent, count: o.count, params: o.params || {},
    pos: o.pos.map(r2), rot: (o.rot || [0, 0, 0]).map(r2), scale: (o.scale || [1, 1, 1]).map(r2),
    texture: o.texture || 'square_particle', color: C[o.color], color2: o.color2 ? C[o.color2] : null,
    size: o.size[0], size2: o.size[1], life: r2(o.seconds * AGE), fade: true, fadeIn: !!o.fadeIn,
    blend: o.blend === undefined ? 2 : o.blend,
    move: (o.speed || [0, 0, 0]).map((v) => r2(v / AGE)), spread: r2((o.scatter || 0) / AGE),
    expand: r2((o.grow || 0) / AGE), gravity: r2((o.gravity || 0) / (AGE * AGE)), start: o.start || 0,
  })
}
// Rotation that turns a Line (it lies along X) to point along d.
const aim = (d) => {
  const l = Math.hypot(...d)
  return [0, (Math.atan2(d[2], d[0]) * 180) / Math.PI, (Math.asin(d[1] / l) * 180) / Math.PI]
}

const FROM = [0.5, 2.6, 2.7] // middle of the three orbs
const MERGE = [0.5, 2.6, 12.7] // where the beams meet
const GOAL = [0.5, 3.6, 40.5] // where the dragon bites
const ORBS = [['violet', 210], ['orange', 90], ['cyan', 330]]
const orbAt = (deg) => [FROM[0] + Math.cos((deg * Math.PI) / 180) * 0.9, FROM[1] + Math.sin((deg * Math.PI) / 180) * 0.9, FROM[2]]

// 1 CHARGE 0 to 0.8 s
let g = group('1 Charge (0.0 s)', 0)
for (const [col, deg] of ORBS) {
  add(g, `Orb ${col}: glow`, 'sphere', { count: 26, pos: orbAt(deg), scale: [0.42, 0.42, 0.42], texture: 'glint', color: col, color2: 'white', size: [0.25, 0.5], seconds: 0.8, fadeIn: true })
  add(g, `Orb ${col}: dust`, 'sphere', { count: 14, pos: orbAt(deg), scale: [1.1, 1.1, 1.1], color: col, size: [0.08, 0.16], seconds: 0.5, grow: -1.6, start: 0.15 })
}

// 2 BEAMS 0.8 to 1.5 s
g = group('2 Beams (0.8 s)', 0.8)
for (const [col, deg] of ORBS) {
  const a = orbAt(deg)
  const d = MERGE.map((v, i) => v - a[i])
  const len = Math.hypot(...d)
  add(g, `Beam ${col}`, 'line', { count: 28, pos: a.map((v, i) => v + d[i] / 2), rot: aim(d), scale: [len / 2, 1, 1], color: col, color2: 'white', size: [0.3, 0.55], seconds: 0.7, fadeIn: true })
  add(g, `Beam ${col}: sparks`, 'line', { count: 12, pos: a.map((v, i) => v + d[i] / 2), rot: aim(d), scale: [len / 2, 1, 1], texture: 'glint', color: col, color2: 'white', size: [0.15, 0.3], seconds: 0.5, scatter: 1.5, start: 0.2 })
}

// 3 DRAGON 1.5 to 3.0 s: flash, then the serpent flies to the goal
g = group('3 Dragon (1.5 s)', 1.5)
add(g, 'Merge flash', 'sphere', { count: 16, pos: MERGE, scale: [0.6, 0.6, 0.6], color: 'white', size: [1.5, 3.5], seconds: 0.25, grow: 5 })
add(g, 'Merge ring', 'circle', { count: 28, pos: MERGE, scale: [0.5, 0.5, 0.5], color: 'white', size: [0.3, 0.5], seconds: 0.4, grow: 14 })
const fly = (GOAL[2] - MERGE[2] - 7) / 1.5 // blocks per second
const body = { pos: [MERGE[0], MERGE[1] + 1.2, MERGE[2] + 7], rot: [0, 90, 0], seconds: 1.5, speed: [0, 0.8, fly] }
add(g, 'Skin pink and violet', 'wave', { ...body, count: 30, params: { waves: 1.5, height: 0.3 }, scale: [7, 5, 1], color: 'pink', color2: 'violet', size: [0.6, 1.1] })
add(g, 'Skin blue and orange', 'wave', { ...body, count: 22, params: { waves: 1.5, height: 0.3 }, scale: [7, 5, 1], color: 'blue', color2: 'orange', size: [0.5, 0.9], scatter: 0.5 })
add(g, 'White outline', 'wave', { ...body, count: 30, params: { waves: 1.5, height: 0.3 }, scale: [7, 5, 1], texture: 'glint', color: 'white', size: [0.5, 0.9], scatter: 0.3 })
add(g, 'Head glow', 'sphere', { ...body, count: 24, pos: [MERGE[0], MERGE[1] + 1.2, MERGE[2] + 14], scale: [1, 0.9, 1.2], color: 'white', color2: 'pink', size: [0.6, 1] })

// 4 BITE 3.0 to 3.6 s: two yellow stars
g = group('4 Bite (3.0 s)', 3)
add(g, 'Star 1', 'firework', { count: 36, params: { rays: 12, inner: 0.25 }, pos: [GOAL[0] - 0.8, GOAL[1] + 0.2, GOAL[2]], scale: [1.2, 1.2, 1.2], texture: 'critical_hit', color: 'gold', color2: 'orange', size: [0.4, 0.9], seconds: 0.4, grow: 5, start: 0.1 })
add(g, 'Star 2', 'firework', { count: 36, params: { rays: 12, inner: 0.25 }, pos: [GOAL[0] + 0.9, GOAL[1] + 0.7, GOAL[2]], scale: [1.2, 1.2, 1.2], texture: 'critical_hit', color: 'gold', color2: 'orange', size: [0.4, 0.9], seconds: 0.4, grow: 5, start: 0.35 })

// 5 BLAST 3.6 s
g = group('5 Blast (3.6 s)', 3.6)
add(g, 'White flash', 'sphere', { count: 30, pos: GOAL, scale: [1.5, 1.5, 1.5], color: 'white', size: [1.5, 3.5], seconds: 0.3, grow: 6 })
add(g, 'Shock ring', 'circle', { count: 36, pos: GOAL, scale: [0.5, 0.5, 0.5], color: 'white', size: [0.3, 0.5], seconds: 0.45, grow: 16 })

// 6 SMOKE 3.8 to 5.2 s
g = group('6 Smoke (3.8 s)', 3.8)
add(g, 'Smoke', 'ball', { count: 40, pos: [GOAL[0], GOAL[1] + 1.5, GOAL[2]], scale: [2.6, 2.2, 2.6], color: 'smoke', color2: 'shade', size: [1.5, 3], seconds: 1.4, blend: 1, grow: 0.8, speed: [0, 0.5, 0] })
add(g, 'Sparks', 'scatter', { count: 30, pos: [GOAL[0], GOAL[1] + 0.5, GOAL[2]], scale: [2.5, 2.5, 2.5], texture: 'glint', color: 'violet', color2: 'pink', size: [0.25, 0.5], seconds: 1.2, scatter: 1.2 })

const scene = { app: 'bloxd-particle-studio', version: 1, objects }
const file = path.join(here, 'dragon_pulse.scene.json')
fs.writeFileSync(file, '{"app":"bloxd-particle-studio","version":1,"objects":[\n' + objects.map((o) => JSON.stringify(o)).join(',\n') + '\n]}\n')
console.log(`wrote ${path.relative(process.cwd(), file)}: ${objects.length} entries`)

// Optional: let the studio's own code read the scene and export it.
if (process.argv[2]) {
  const lib = (f) => import(pathToFileURL(path.resolve(process.argv[2], 'js', f)).href)
  const { sanitizeScene, objectPoints, isGroup } = await lib('scene.js')
  const { generateCode } = await lib('codegen.js')
  const clean = sanitizeScene(JSON.parse(fs.readFileSync(file, 'utf8')))
  let bad = 0
  for (const o of clean.objects) {
    const raw = objects.find((r) => r.id === o.id)
    for (const k of Object.keys(raw)) if (JSON.stringify(raw[k]) !== JSON.stringify(o[k])) { bad++; console.log(`  changed by the studio: ${o.name}.${k} ${JSON.stringify(raw[k])} -> ${JSON.stringify(o[k])}`) }
  }
  // the beams must really run from the orbs to the merge point
  for (const o of clean.objects.filter((x) => x.name.startsWith('Beam') && !x.name.includes('sparks'))) {
    const pts = objectPoints(o)
    const end = pts.reduce((a, b) => (b[2] > a[2] ? b : a))
    const miss = Math.hypot(...end.map((v, i) => v - MERGE[i]))
    if (miss > 0.05) { bad++; console.log(`  ${o.name} misses the merge point by ${miss.toFixed(2)}`) }
  }
  const leaves = clean.objects.filter((o) => !isGroup(o))
  const block = generateCode(clean.objects, { maxChars: 32000, maxLines: Infinity, precision: 20 })
  const world = generateCode(clean.objects, { target: 'world', precision: 20 })
  console.log(`studio check: ${bad ? bad + ' problem(s)' : 'scene loads unchanged'}, ${leaves.length} objects, ${block.particles} particles`)
  console.log(`studio export: ${block.parts.length} code block(s) of ${block.parts.map((p) => p.chars).join(', ')} characters (limit 32000); as World Code ${world.parts[0].chars} characters (limit 512000)`)
  fs.writeFileSync(path.join(here, 'particles_only.code_block.js'), block.parts[0].code + '\n')
  if (bad || block.parts.length !== 1) process.exit(1)
}
