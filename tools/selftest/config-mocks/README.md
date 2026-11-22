# Config integration test doubles

`run-config-tests.sh` compiles the real `ConfigManager`, module/settings classes, title screen
module, both observation modules, and `HudLayout`. Only the Minecraft/Fabric runtime, the actual
keybinding bridge and unrelated GUI theme are replaced with small handwritten doubles. Gson is a
real dependency. This checks JSON persistence and module lifecycle, **not** Fabric runtime or game
rendering. These doubles are outside Gradle's source sets and are never packaged in the mod.
