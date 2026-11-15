# Hologram

A player-sized holographic computer made of meshes, in the style of the
floating screens in the Iron Man films: three screens, an arc overhead, a
key board, a turning wire globe and a projector ring on the floor.
Sim-tested only; it has not been run in Bloxd.

![four views of the hologram](preview/hologram.png)

The picture is drawn by `tools/render.py` from the test run, with a
player-sized figure for scale. It is not a screenshot of the game.

## Use it

Either way works on its own.

- **World Code:** paste `world_code.js` (about 14,600 characters) and type
  `!holo`. It opens 2 blocks in front of you, facing you. `!holo` again
  closes it. If other world code is there too, paste this **after** it.
- **Code Block, no World Code needed:** paste `code_block.js` (14,419 of
  32,000 characters) into a Code Block and click it. The whole hologram
  appears at once on top of the block, facing whoever clicked. Click again
  to remove it. There is no chat command in this version.

About the code block: a click creates all 214 meshes in the same instant, so
it does not depend on anything else running. Two things follow from that:

- If the game caps how many meshes can be created per second (you mentioned
  about 120), the top part may be missing. Then use the World Code version,
  which builds 5 a tick.
- The moving parts need the game to call a `tick` that a code block
  assigned, which is not documented. If it does, the hologram moves; if not,
  it is a still picture.

From other code: `hologram(playerId)`, `hologram(playerId, [x, y, z])`, or
`hologram(playerId, [x, y, z], [fx, fz])` to choose the direction it faces.

## What it is made of (214 meshes)

| Part | Meshes | What | Moves |
|---|---|---|---|
| Floor projector | 52 | Two rings, 8 pins, 4 spokes, an emitter block, a thin light line up the middle, a small ring | Two markers run round the outer ring |
| Globe | 17 | Wire globe of three hoops and a pole, at chest height | Turns |
| Main screen | 27 | Corner brackets, title bar, orange status block, 6 text lines, a 6-bar chart, a scan line | Text types out, holds and clears; bars rise and fall; the scan line sweeps up and down |
| Left screen | 33 | Brackets, a round gauge drawn in pixel steps, crosshair, 3 text lines | An orange needle dot goes round the gauge; text types |
| Right screen | 29 | Brackets, a grid, a graph of 8 dots, 2 text lines | The graph ripples; text types |
| Arc overhead | 27 | A double curved line behind the screens with 7 hanging tick marks | |
| Key board | 29 | 27 flat keys in 3 rows at waist height, between two rails | Keys light up two at a time |

It is 2.5 blocks tall and 3.3 wide. It boots from the floor up in 2.1
seconds, 5 meshes a tick (100 a second, under the 120 a second cap you
mentioned), and closes 30 a tick.

Once it is up it costs at most 46 api calls a tick. With `animate: false` it
costs none.

Every mesh is level, only turned left or right, never tilted. So it does not
depend on which way the game tilts meshes, which was the suspected cause of
the Dragon Claw slashes merging. That is also why the round gauge is drawn in
pixel steps instead of slanted lines.

Meshes cannot be see-through in Bloxd, so the "hologram" look comes from thin
glowing lines and empty space, not from transparency.

## Settings (`HOLO_CFG`)

| Name | Meaning |
|---|---|
| `chat` | Chat command (`!holo`) |
| `distance` | Blocks in front of the player where it opens (2) |
| `size` | Scale (1 = player sized) |
| `spawnPerTick` | Meshes created per tick while booting (5) |
| `animate` | false = build it and leave it still |
| `sounds`, `hideDist` | Sounds on; visible up to 60 blocks |
| `maxHolos` | How many can be open at once (1). Two would be 428 meshes, over the 400 limit |
| `maxMeshes` | 399 |

Colours are in `HOLO_COL` (`bright`, `cyan`, `blue`, `dim`, and `warn` for
the orange accents). Screen positions and sizes are in `HOLO_PANEL`.

## Check it

```
node tools/check.mjs --dump /tmp/holo.json
python tools/render.py /tmp/holo.json preview/hologram.png
```

`code_block.js` is generated from `world_code.js` by `tools/check.mjs`; do not
edit it by hand.
