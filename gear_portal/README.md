# Gear Portal (Move 1)

Use the move and an arrow appears at once, showing where you will land. Use it again (or click) and it goes off: a steampunk gear portal opens under you, you drop in, come out of a second portal where the arrow pointed, and do a 360 slash straight away.

![preview](preview/portal.png)

The portal seen from above:

![portal from above](preview/top.png)

The picture is my own render of the test run, not a Bloxd screenshot. **The move has not been run inside Bloxd yet.**

## How to use it

1. Paste `world_code.js` (22k characters) into World Code.
2. Type `!portal` in chat: the arrow appears. Turn to aim. Then click, or type `!portal` again, to do the move. (`gearPortal(playerId)` from your own code does the same: first call aims, second call goes.)
3. Optional: paste `code_block.js` into a code block. Clicking the block casts the move for the player who clicked. It needs the World Code, because a code block runs only once per click and this move has to run for several seconds.

## What happens

| Step | What you see |
|---|---|
| Aim (3 s at most) | Three arrow heads on the floor in front of the player, there from the first tick, following where the player looks. Sparks mark the landing spot 6 blocks away. The caster also sees the game's own arrow strip. The player is visible and can walk; the arrow goes with them. |
| Go | On a click, a second `!portal`, or by itself on the 3 s mark. The landing spot is fixed at this moment. |
| 0 – 0.3 s | The first portal opens under the player's feet. The player crouches, leaps with arms up, and corkscrews down, shrinking and fading. |
| 0.3 s | The player lands where the arrow pointed. The second portal opens there and the first one folds away. |
| 0.3 – 0.7 s | A green band sweeps once round the player. Everything within 3 blocks takes 25 damage and is knocked away, straight away. The second portal folds away. |
| 0.3 – 0.9 s | The body plays the slash animation sped up to the same 0.4 s the band takes: the 10 s animation is run in 2.1 s, so the arms cross over in its first 399 ms. Then the pose eases back to a normal stand in 0.2 s. |

Set `aimTime` to 0 for no aiming step: one use, and the move goes off straight ahead. `aimLimit` is a hard cap of 3 s: the arrow never stays out longer, whatever `aimTime` says. With `aimCancels` set to true the 3 s limit takes the arrow away and drops the move instead of going off.

A wall in the way shortens the teleport.

## Parts

- **Two portals, 86 meshes each:** a clock face inside a big gear. Dark green face with a bright centre, 12 hour marks (the four main ones bigger and gold), a short hour hand and a long white minute hand that sweeps a full turn each second, a spoked wheel turning the other way, a gold rim with 12 gear teeth that turn slowly, and three small gears on the outside turning against each other. 28 of the 86 pieces move.
- **Slash, 34 meshes:** 17 green pieces with a bright edge, each shown for 0.15 to 0.25 s. The band starts in front of the player and runs out to both sides at once, the two ends going round the back and stopping 26° apart, so a small free area is left behind the player. The spacing, size, height and depth of each piece are a little uneven on purpose (`slashJitter`), so it does not look machine-made.
- **Arrow, 6 meshes**, plus the game's own arrow strip on the ground (only the caster sees that one).
- **Node meshes, 2:** a green blade on each arm and nothing else — no block on the hand, no plate on the back. They are on while dropping in and during the slash.
- **Particles:** green sparks rising from the portal, gold glints, grey steam puffs, a stream pulled down into the first portal, bursts on entering and leaving, sparks along the slash.
- **Player animation:** a ready pose with the blade arm pointing ahead while aiming; crouch, leap with arms up, half-turn corkscrew down while the player shrinks into the portal; coming out the player grows back and then plays the supplied slash animation (`GATE_SLASH`, run over 2.1 s so the arms cross over in 399 ms, level with the sweep of the green band), which is replaced by a 0.2 s easing back to a normal stand when the band is done.

At most 167 meshes exist at once. The only thing that ever lies on the floor is the gear clock portal itself; the 6 arrow heads are there only while aiming and are removed the instant the move goes off, and nothing at all is left once it is over.

## Settings (`GATE_CFG` at the top)

| Name | Default | Meaning |
|---|---|---|
| `travel` | 6 | blocks teleported from the first portal to the second (15 at most) |
| `aimTime` | 3 | seconds the arrow is shown before the move goes off by itself; 0 = no aiming |
| `slashRadius` | 3 | reach of the slash |
| `damage`, `knockback` | 25, 8 | what the slash does |
| `hitPlayers` | true | false = only mobs are hit |
| `clickFires` | true | a click while aiming does the move |
| `shrink` | true | the player shrinks while going down and grows back coming out (uses `setLifeformScale`) |
| `hidePlayer`, `holdPlayer` | true | invisible / held in place and safe for the moment inside the portal |
| `animate`, `nodeMeshes`, `groundArrow`, `sounds` | true | switch a part off |
| `slashPieces` | 18 | how many positions the band uses (17 pieces: the front one is shared) |
| `slashGap` | 26 | free angle in degrees left behind the player at the end |
| `slashJitter` | 1 | 1 = uneven spacing, height and length; 0 = a perfectly even ring |
| `slashWay` | -1 | which way the two ends of the band go round the player |
| `slashMs` | 2100 | length of the supplied slash animation in milliseconds (0.19 of it = 399 ms, the same as the band's 0.4 s sweep) |
| `slashShare` | 0.19 | the part of it where the arms cross over (the rest is a hold) |
| `aimLimit` | 3 | hard cap in seconds on how long the arrow stays out |
| `aimCancels` | false | true = the cap cancels the move instead of going off |
| `flip` | 1 | set to -1 if the player bends backwards instead of forwards |

## Not sure until it is tried in Bloxd

- Whether the poses bend the right way (`flip` fixes forward/backward).
- The slash animation is your schema with only its length changed (`slashMs` 2100 ms, `slashShare` 0.19). It is not clear how the game treats a shortened animation with keys at those fractions, so it may come out at a different speed than intended.
- Whether `shrink` behaves: it changes the player's real size for a moment. If the player gets stuck or stays small, set `shrink` to false.
- Where the three node meshes sit on the body.
- The name tag probably stays visible while the player is hidden.
- Whether the four sound names exist; a wrong name is skipped silently.
- Particle sizes and brightness.

## Test

```
node tools/check.mjs --dump frames.json
python tools/render.py frames.json preview/portal.png
```
