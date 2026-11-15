# DH (spinning circle, particles only)

A glowing orange-red circle on the floor with a five-pointed star inside
it, made of particles only. No meshes are used. Rebuilt from your
screenshot. Sim-tested only; it has not been run in Bloxd.

![four views of the circle](preview/circle.png)

The picture is drawn by `tools/render.py` from the test run. It is not a
screenshot of the game; real particles will look softer.

## Use it

- **World Code:** paste `world_code.js` (about 7,200 characters) and type
  `!dh`. It opens under your feet. `!dh` again closes it. If other
  world code is there too, paste this **after** it.
- **Code Block, no World Code needed:** paste `code_block.js` (7,155 of
  32,000 characters) and click the block. The circle opens on top of the
  block, centred on it. Click again to close.

About the code block: the click draws the whole circle at once, and `tick`
then keeps it lit and spinning. That needs the game to call a `tick` that a
code block assigned, which is not documented. If the game does not do that,
the first click is only a half-second flash, and from the second click on
each click draws the circle as a still picture that lasts 8 seconds. It
cannot spin without `tick`; use World Code for that.

From other code: `dh(playerId)` or `dh(playerId, [x, y, z])`. In the code
block version the function is called `spinCircle`, because a two-letter name
could be caught by the word filter.

## What it is

| Part | Particles | Moves |
|---|---|---|
| Two outer rings | 70 and 64 points, at 5 and 4.5 blocks from the centre | Turn one way |
| Inner ring | 56 points at 3.9 blocks | Turns the other way |
| Star | 80 points, 16 on each of its 5 lines, tips on the inner ring | Turns with the inner ring |
| Sparks | White, 3 every tick | Rise from the centre and slow down |
| Falling strings | Short strings of small white and pink squares, 6 to 9 blocks out and 3 to 9 up | Drift down and fade |

The pattern is 270 points with 2 particles on each, set within 0.09 blocks
of the point so the lines look thick and solid. It is 10 blocks across and
lies flat on the floor. It makes no sound. It
grows out from the centre in 1.2 seconds, then turns at 0.5 radians a second
(a full turn every 12.6 seconds).

Particles fade, so the points are re-lit all the time: 45 each tick, so each
point comes round again every 6 ticks, at its new turned position. That is
at most 48 particle calls a tick (up to about 800 floor particles alive at once). If the game drops particles at that rate,
lower `pointsPerTick` (each point then lives longer and the turning looks
more stepped).

## Settings (`RITE_CFG`)

| Name | Meaning |
|---|---|
| `chat` | Chat command (`!dh`) |
| `size` | Scale (1 = 10 blocks across) |
| `spin` | Turning speed in radians a second (0.5). 0 = still |
| `pointsPerTick` | Points re-lit each tick (45) |
| `perPoint` | Particles on each point (2). 1 = thinner lines, 3 = denser, at no change in calls |
| `thick` | How far those particles may sit from the point, in blocks (0.09) |
| `sparks`, `glyphs` | The rising sparks and the falling strings; false = off |
| `growTicks` | Ticks to grow to full size (24) |
| `duration` | Seconds until it closes by itself; 0 = stays until toggled off |
| `stillLife` | Seconds a still picture lasts when `tick` does not run (8) |
| `hideDist` | Visible up to 120 blocks |
| `maxCircles` | How many can be open at once (2) |

Colours are in `RITE_COL`, ring sizes and directions in `RITE_RINGS`
(`[radius, points, direction]`), the star in `RITE_STAR`.

The code uses long names throughout so the code-block word filter has
nothing to star out (see the Hologram README); `tools/check.mjs` tests this.

## Check it

```
node tools/check.mjs --dump /tmp/rite.json
python tools/render.py /tmp/rite.json preview/circle.png
```

`code_block.js` is generated from `world_code.js` by `tools/check.mjs`; do not
edit it by hand.
