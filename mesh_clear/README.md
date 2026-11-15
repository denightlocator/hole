# Remove every mesh (code block)

Paste `code_block.js` (804 characters) into a Code Block and click it. It
deletes every mesh within 150 blocks of the block, whoever or whatever made
it, and tells you how many it removed. It needs no World Code.
Sim-tested only; it has not been run in Bloxd.

How it works: it asks the game for every entity in a box of 150 blocks
around the block (`api.getEntitiesInRect`), skips players and mobs, and
calls `api.deleteMeshEntity` on the rest. That call only deletes meshes, so
dropped items and the like are left alone.

- To reach further, change `sweepReach` on the first line.
- If a hologram is open, it is closed properly first, so the next click on
  the hologram block opens a fresh one.
- Particles are not meshes and are not touched; they fade on their own.
- Not confirmed from here: that `getEntitiesInRect` lists mesh entities, and
  how big a box it accepts. If it reports "Removed 0 meshes" while meshes
  are standing there, tell me and I will switch to remembering mesh ids.

Check it: `node tools/check.mjs`
