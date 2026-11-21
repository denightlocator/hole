# Observation module test doubles

The Java files in `src/` are tiny, handwritten stand-ins for just the APIs used by the two new
modules. They exist only so `bash tools/selftest/run-observation-tests.sh` can exercise module
control flow without a Minecraft installation. They are outside Gradle's source sets and must not
be packaged in the mod.

The fake world samples simple cuboid shapes; it does **not** reproduce Minecraft raycasting,
rendering, chunk loading, or event/mixin execution. Passing these tests does not establish binary
compatibility or replace a Fabric build and in-game test. The companion adapter tests exercise the
real properties-file reader/writer and mock key events, but they do not test Orbit's missing config
manager, actual Minecraft keybindings, or runtime mixin injection.
