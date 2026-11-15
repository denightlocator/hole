# Bomb (mesh model)

A bomb like the picture: olive egg-shaped body with a dark nose, two bands with lugs, and a square gold/orange tail box with teal fins inside. 88 meshes, about 4.8 blocks tall and 2 wide.

![preview](preview/bomb.png)

The picture is my own render, not a Bloxd screenshot. **Not run inside Bloxd yet.**

## How to use it

Paste `code_block.js` (3,855 characters) into a code block and click it. The bomb appears above the block, standing nose down. Click again to remove it. It works by itself; no World Code is needed.

## Settings (`bombSettings`, first line)

| Name | Default | Meaning |
|---|---|---|
| `scale` | 1 | size; 2 = twice as big |
| `lift` | 1 | blocks between the block and the nose |
| `turn` | 0 | turn left/right, in radians |

## Good to know

- It stands straight up (nose down), not tilted like the picture. Every piece is a level box that is only turned left or right, which is what has worked in game so far.
- The colours are flat; the green-to-orange light in the picture is not copied.

## Test

```
node tools/check.mjs --dump boxes.json
python tools/render.py boxes.json preview/bomb.png
```
