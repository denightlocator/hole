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

## It still needs one line in World Code

The code block only builds the meshes and stores a function. Something must call it 20 times a second:

```
tick = () => { if (globalThis.runTimer14) globalThis.runTimer14() }
```

If your World Code already has a `tick`, add the inside part to it instead.

## Test

`node tools/check.mjs` runs all 502 ticks against a stand-in game. Not run inside Bloxd. The filter's word list is not known, so the fix is based on the spots it starred in your paste.
