# Dragon Claw

A close-range move: the player claws, turns a full 360, and claws again.
Sim-tested only; it has not been run in Bloxd.

![six moments of the move](preview/moments.png)

The picture is drawn by `tools/render.py` with the player posed the way the
animation editor poses it. It is not a screenshot of the game.

## Use it

Paste `world_code.js` into World Code. If Dragon Pulse or other world code is
there too, paste this **after** it: it keeps the earlier `tick`, chat and
right-click handlers working. Then type `!claw`.

From other code: `dragonClaw(playerId)`.

## What happens (1.55 s)

| Seconds | Player animation | Meshes and particles | Hit |
|---|---|---|---|
| 0.00–0.45 | Right arm goes up and back, then rakes down across the body | Claws appear on both hands (node meshes). Three slash marks of 7 meshes each are drawn in front, top to bottom, with sparks at the tips | 0.25 s: everything in front, within `range` |
| 0.45–0.85 | Arms out, full turn in four quarter steps; the legs go round with the body | A ring of 14 meshes is drawn round the player as they turn; a ring of 18 particles flies outward | 0.65 s: everything all round, within `spinRange` |
| 0.85–1.35 | Left arm goes up and back, then rakes down the other way | Three more slash marks, crossing the first | 1.10 s: everything in front |
| 1.35–1.50 | Pose is reset | Claws are taken off | |

At most 21 mesh entities at once and 50 api calls in one tick.

## Range

`CLAW_MAX_RANGE` is 15. Whatever `range` and `spinRange` are set to, nothing
further than 15 blocks is hit.

## The animation

The poses are in `CLAW_POSE` in `world_code.js`: one row per keyframe, with the
time in ticks (20 a second) and, per body part, its turn in degrees `[x, y, z]`,
the same numbers the animation editor shows. A third value on a row is how far
the whole body has turned (the spin).

The game gets it as 12 small `api.animateEntity` calls, one from each pose to
the next, of 600 to 750 characters each. The first version sent three calls of
up to 2,600 characters and the game refused them ("argument is too large").
Only rotations are sent, rounded to two decimals.

If the game refuses an animation call, the move goes on without the animation
and the reason is shown to the caster in chat.

To look at it or change it in the editor
(https://tridentify.github.io/animation-editor/):

- `animation/Dragon Claw.bloxdmation`: open it with the editor's file import.
- `animation/animation_only.code_block.js`: the same animation as
  `api.animateEntity` code, for the editor's "import code". It is not meant
  to be run in the game by itself.

Both files are written by `node tools/check.mjs` from `CLAW_POSE`, so they
always match the world code. Changes made in the editor do not come back by
themselves: send the changed file and the numbers can be carried over.

## Settings (`CLAW_CFG`)

| Setting | Meaning |
|---|---|
| `chat` | Chat command, `""` for none |
| `item` | Name of a held item that casts it on right click, `""` for none |
| `range` | Blocks in front that the two claws reach (15 at most) |
| `spinRange` | Blocks all round that the spin reaches (15 at most) |
| `damage`, `spinDamage` | Damage of each claw and of the spin |
| `knockback` | Push on everything that is hit |
| `lunge` | Push forward on the player at each claw, 0 for none |
| `hitPlayers` | Whether other players are hit, or only mobs |
| `animate` | Whether the player is animated |
| `flip` | 1 or -1: which way the arms and body lean. Set -1 if the arms swing backward in the game |
| `nodeClaws` | Whether claws are attached to the hands |
| `sounds`, `hideDist`, `maxCasts`, `maxMeshes` | As in Dragon Pulse |

Colours are in `CLAW_COL` (white, core, edge, deep), sounds in `CLAW_SND`,
timings in ticks in `CLAW_STEP`.

## Meshes (`CLAW_MESH`)

| Group | Rows | What |
|---|---|---|
| `talon` | 7 | One slash mark from end to end: place along it (-1 to 1), thickness, colour |
| `mark` | 3 | The three marks of one claw: sideways offset, length, thickness |
| `ring` | 14 | The ring of the spin: place round it, thickness, colour |
| `hand` | 4 | Node meshes on each arm: three talons, then a wide blade |

The blade is attached last on purpose. The documentation only shows one node
mesh per body part; if the game keeps only the last one, the blade is what
shows, and if it keeps all of them, the talons show as well.

## Not known until it runs in the game

- Which way `api.animateEntity` turns each part. The poses follow the editor's
  preview. If the arms swing backward, set `flip: -1`.
- Whether the legs follow the torso by themselves (then they would turn twice in
  the spin).
- Which side the game puts the right arm on; the first slash mark is drawn on
  the side the editor's model has it.
- Whether a body part can carry more than one node mesh (see above).
- Taking the claws off clears both arm nodes, so an arm piece of a node-mesh
  skin (`!skin`) is removed too.

## Check it

```
cd dragon_claw
node tools/check.mjs --dump /tmp/claw.json
python tools/render.py /tmp/claw.json preview/moments.png
```
