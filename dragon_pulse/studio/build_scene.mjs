// Writes studio/dragon_pulse.scene.json: the particles of the move as a scene
// for the Bloxd Particle Studio (press Open there and pick the file).
//
//   node studio/build_scene.mjs                 write the scene
//   node studio/build_scene.mjs <studio folder> also check it with the studio's
//                                               own code, and write its export
//                                               to particles_only.code_block.js
//
// The scene holds the effects that are particles instead of meshes, side by side along +X.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const AGE = 0.6 // the studio's "life" is on the game's particle clock: 0.6 per second
const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('')
const C = {
  crimson: hex([235, 26, 46]), blood: hex([132, 8, 24]), wine: hex([64, 12, 58]), night: hex([38, 12, 80]),
  smoke: hex([58, 40, 70]), shade: hex([26, 16, 36]),
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

// The four effects that are particles instead of meshes. Each stands on its own
// spot along +X so they can be looked at side by side; in the move they play at
// the dragon, at the target and at the blast.
let g = group('1 Cloud orb (follows the dragon)', 0)
add(g, 'Orb: cloud', 'sphere', { count: 9, pos: [0, 3, 0], scale: [0.45, 0.45, 0.45], color: 'wine', color2: 'night', size: [0.55, 0.95], seconds: 0.36, blend: 1, grow: 0.4 })
add(g, 'Orb: core', 'sphere', { count: 6, pos: [0, 3, 0], scale: [0.1, 0.1, 0.1], texture: 'glint', color: 'crimson', color2: 'blood', size: [0.15, 0.35], seconds: 0.7 })

g = group('2 Bite star', 0.5)
add(g, 'Star', 'firework', { count: 48, params: { rays: 12, inner: 0.25 }, pos: [6, 3, 0], scale: [1.2, 1.2, 1.2], texture: 'critical_hit', color: 'crimson', color2: 'blood', size: [0.3, 0.6], seconds: 0.33, grow: 9 })

g = group('3 Shock rings of the blast', 1)
add(g, 'Ring on the ground', 'circle', { count: 40, pos: [16, 0.4, 0], scale: [1.6, 1.6, 1.6], color: 'crimson', color2: 'wine', size: [0.5, 0.9], seconds: 0.57, grow: 40 })
add(g, 'Ring in the middle', 'circle', { count: 32, pos: [16, 2, 0], scale: [1.6, 1.6, 1.6], color: 'blood', color2: 'wine', size: [0.5, 0.9], seconds: 0.57, grow: 28, start: 0.15 })
add(g, 'Ring on top', 'circle', { count: 24, pos: [16, 3.6, 0], scale: [1.6, 1.6, 1.6], color: 'blood', color2: 'wine', size: [0.5, 0.9], seconds: 0.57, grow: 16, start: 0.3 })

g = group('4 Smoke after the blast', 1.9)
add(g, 'Smoke ball', 'sphere', { count: 26, pos: [16, 1.5, 0], scale: [2.6, 2.6, 2.6], color: 'smoke', color2: 'shade', size: [1.6, 3], seconds: 1.6, blend: 1, grow: 1.2, speed: [0, 0.8, 0] })
add(g, 'Smoke ball, second puff', 'sphere', { count: 14, pos: [16, 2.3, 0], scale: [1.9, 1.9, 1.9], color: 'smoke', color2: 'shade', size: [1.6, 3], seconds: 1.6, blend: 1, grow: 1.2, speed: [0, 0.8, 0], start: 0.4 })
add(g, 'Dust ring', 'circle', { count: 20, pos: [16, 0.5, 0], scale: [2.4, 2.4, 2.4], color: 'smoke', color2: 'shade', size: [1.6, 3], seconds: 1.6, blend: 1, grow: 4 })

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
  const leaves = clean.objects.filter((o) => !isGroup(o))
  const block = generateCode(clean.objects, { maxChars: 32000, maxLines: Infinity, precision: 20 })
  const world = generateCode(clean.objects, { target: 'world', precision: 20 })
  console.log(`studio check: ${bad ? bad + ' problem(s)' : 'scene loads unchanged'}, ${leaves.length} objects, ${block.particles} particles`)
  console.log(`studio export: ${block.parts.length} code block(s) of ${block.parts.map((p) => p.chars).join(', ')} characters (limit 32000); as World Code ${world.parts[0].chars} characters (limit 512000)`)
  // without the studio's one comment line, like the other files to paste
  fs.writeFileSync(path.join(here, 'particles_only.code_block.js'), block.parts[0].code.replace(/^\/\/.*\n/, '') + '\n')
  if (bad || block.parts.length !== 1) process.exit(1)
}
