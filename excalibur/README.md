# Excalibur (your code, repaired)

`code_block.js` is the Excalibur code you sent, with the spots that Bloxd's word filter starred out put back in a form the filter did not touch.

## What was changed

| Was (starred out as `*****`) | Now |
|---|---|
| `t%3===0` (2 places) | `third`, set once per tick as `!(t%3)` |
| `(t-T_IMP)%3===0` | `!(since%3)` |
| `t%2===0` | `even`, set once per tick as `!(t%2)` |
| `sw[i].flick` | `part.blink` (the property is renamed everywhere) |

Also: the two `//` comment lines are removed, and the facing direction is read from `dirXyz` or `dir`, whichever the game gives.
Nothing else is changed: same sword, stone, timing and particles.

## Easiest way: World Code only

Paste `world_code.js` into World Code and type `!excalibur` in chat. It is the same code wrapped in a function, with the tick and the chat command included, and World Code is not put through the code-block word filter. `excalibur(playerId)` also works from your own code.

## Code block way

`code_block.js` builds the meshes 40 blocks under the floor and stores a function that moves them. Something in World Code must call that function 20 times a second, or nothing ever appears:

```
tick = () => { if (globalThis.runTimer14) globalThis.runTimer14() }
```

If `world_code.js` is pasted, that is already taken care of.

## Test

`node tools/check.mjs` runs all 502 ticks against a stand-in game. Not run inside Bloxd. The filter's word list is not known, so the fix is based on the spots it starred in your paste.
