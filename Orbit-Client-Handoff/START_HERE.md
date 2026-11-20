# Orbit Client — complete source handoff

This package is for a **new chat/session** that needs to continue work on the existing Orbit Client project. Give the session the outer ZIP and ask it to read this file, restore the project, inspect the source, and then work on your next request.

## What is in this ZIP?

The outer ZIP has just **three files**:

1. `START_HERE.md` — this guide and project handoff.
2. `restore_orbit.py` — a cross-platform extraction helper using Python's standard library.
3. `orbit-client-project.tar.xz` — the complete source-project snapshot, compressed as one file.

The source bundle preserves **all 157 project files** from the previous source ZIP, including every Java file, runtime asset, Gradle file, license, helper script, README, original artwork and design prototype. It is not necessary to upload those 157 files separately. **Restoring the project does recreate those individual files**; they are needed to edit and build it normally. The bundle is compressed and identical image assets were grouped for better compression; files are not deleted or changed to achieve that.

The generated Gradle cache, `build/`, game `run/` directory, compiled `.class` files and prebuilt mod JAR are intentionally not included. These can be recreated, and the game directory may contain personal settings. Dependencies are downloaded when building.

## Restore the complete project

First extract the outer ZIP. In a terminal in the extracted folder, run:

```bash
python3 restore_orbit.py
# On Windows, if needed: py -3 restore_orbit.py
```

The script verifies the bundle's SHA-256, validates its contents, and creates an `orbit-client` folder beside itself. It refuses to overwrite an existing `orbit-client` folder. To restore somewhere else or list the packed paths without extracting:

```bash
python3 restore_orbit.py --dest /path/to/a/new/parent-folder
python3 restore_orbit.py --list
```

The source bundle's SHA-256 is `b983203909032ebac16ade48d51f0e06bd3e4f849b3cf0a501856e2bc0d47a31`. The script needs Python 3 with its usual `lzma` module; it does not need external packages or internet access. If you prefer a standard archive tool, `tar -xJf orbit-client-project.tar.xz` also restores the project in the current folder; unlike the helper, plain `tar` may overwrite existing files.

## What the next assistant should do

1. Restore the bundle, read this handoff and the project's `README.md`, and inspect the actual files before making changes. The code is the source of truth; some older README passages are historical and may not describe the current implementation perfectly.
2. Ask what the user wants next if they have not said; **do not add features or modules without being asked**. Do not implement a previous suggestion merely because it appears in chat history.
3. When changes affect a visual design or layout, show a prototype before coding and wait for the user's choice. The user previously chose design A for the main GUI, Deep Field for the title screen and variant B for the HUD editor.
4. Keep the user's existing preferences and constraints below. After an authorized change, build and test as far as the environment permits. Clearly distinguish successful compilation from in-game runtime testing.

### Project and versions

- Name: **Orbit Client**. Mod ID `orbit`; Java package `dev.orbit.client`.
- Fabric **Minecraft 1.21.11** (not 26.3); Java 21; Fabric Loader 0.17.2; Fabric API `0.141.6+1.21.11`; Yarn `1.21.11+build.6`; Fabric Loom 1.16.3; Gradle 9.9.1.
- Client-side utility mod, Krypton/Meteor-inspired. Open its ClickGUI with **Right Shift**.
- User-facing settings, module toggles and HUD positions/scales are saved in `config/orbit.json` by `ConfigManager`.

### Build and install

Install JDK 21 and Gradle 9.9.1, then run:

```bash
cd orbit-client
gradle build
# Built mod: build/libs/orbit-0.1.0.jar
```

There is **no Gradle wrapper** in this snapshot. The build needs internet access for Fabric/Minecraft dependencies. On a compatible Debian/Ubuntu system with `sudo`, `bash tools/build.sh` can install the expected Java/Gradle paths and build. For development, `gradle runClient` launches a dev instance when a graphical environment is available. To install the built mod, put the JAR in `.minecraft/mods` alongside Fabric API, with a Fabric Loader installation for Minecraft 1.21.11.

The previous session reported a successful Gradle build of this source. **The recent modules and HUD-scale feature have not been confirmed in a running Minecraft client in that session.** Do not claim they were runtime-tested without doing so. Some standalone self-test sources live in `tools/selftest/`; read their headers for commands.

### Code map

| What | Where to look |
| --- | --- |
| Client entry point, module registration, events | `src/main/java/dev/orbit/client/Orbit.java` |
| Main ClickGUI, theme, rounded shapes, HUD editor | `src/main/java/dev/orbit/client/gui/` |
| Title screen | `gui/title/OrbitTitleScreen.java`, `OrbitButton.java` |
| FPS, ping, armour, potions, layout and scaling | `hud/StatsHud.java`, `HudContent.java`, `HudLayout.java` |
| Music overlay, card and lyrics | `hud/MusicHud.java` |
| Categories, settings, keybinds and registry | `module/` and `module/setting/` |
| Feature implementations | `module/impl/` (`misc`, `player`, `render`, `perf`, `hud`) |
| Mixin hooks | `mixin/`, `src/main/resources/orbit.mixins.json`, `orbit.accesswidener` |
| Persisted configuration | `config/ConfigManager.java` |
| Music playback, loopback server and lyric fetching | `audio/`, `lyrics/` |
| Textures, generated music and Fabric metadata | `src/main/resources/` |
| Build setup and standalone tests | `build.gradle`, `gradle.properties`, `settings.gradle`, `tools/` |
| Design references and artwork | root `*-prototype*.html`/previews and `art/` |

The registered modules include Storage ESP, Freecam, Player Tracking, Mob ESP, Item ESP, Custom Sky, Fullbright, Zoom, No Fog, No Hurt Cam, No View Bob, Auto Sprint, performance options, Auto AH, music, chat tweaks, container preview, custom crosshair and FPS/ping/armour/potion HUD elements. Inspect the code for precise behavior rather than assuming all features were runtime verified.

### User choices and important constraints

- Never reintroduce the cancelled animated/black-hole/video title background. The accepted title background is a **still starfield**. Some old experimental artwork remains in `art/` as reference; it is not permission to use it. Do not put a version beside the title wordmark or use the rejected “event horizon simulator” splash.
- Keep the rounded, less-blocky look and user-customizable themes/colours. Preserve **paste support** in text/URL fields.
- The custom sky must be seamless and surround the player. Performance controls must remain client-side and reversible: no extra packet hooks or anticheat exposure. Auto Sprint should use the ordinary client sprint flag, without suppressing sneaking or item use; no anticheat-evasion additions.
- Auto AH has **Dry Run on by default**. The user said server staff allow their intended use, which was not independently verified.
- Every HUD element should be individually toggleable. The HUD editor must be accessible **from chat** by typing `.hud`; the title-screen button is an additional entry point.
- The editor currently includes FPS, ping, armour and potions. Select an element and use `[`/`]` or its popover to change scale from 0.75× to 2×. `R` resets position and scale; Tab reveals hidden elements. `MusicHud` is a separate overlay and is not currently in `StatsHud.ALL` or that editor's scale controls; do not imply otherwise.
- Direct-URL and local-file music playback are included. Do not silently reintroduce the previously rejected/unbundled yt-dlp YouTube/SoundCloud extraction plan.

### Known limitations and things to verify

- Placed chest contents are not sent to the client before opening, so they cannot be honestly previewed from a hover alone. `ContainerPreview` currently reads `DataComponentTypes.CONTAINER`; its documented bundle support should be verified rather than assumed.
- The crosshair module cancels vanilla's `renderCrosshair`, so the vanilla attack indicator also disappears while that module is enabled.
- `ChatHudMixin` targets `ChatHud.addMessage(Text)`; verify behavior for player/signed chat and its repeat-summary scheduling in a real client before claiming all chat is covered. The previous session had not verified those injection paths at runtime.
- Verify HUD scaling, its saved settings, editor hitboxes and text rendering in-game. Non-integer text scale can look soft; the separate music overlay is not part of those four editor entries.
- The title-screen scrim uses `Rounded.fillHorizontal`; vanilla `DrawContext.fillGradient` is vertical, which caused the earlier visible seam. Avoid reintroducing that misuse. Avoid vanilla full-screen blur in the custom screens and per-pixel drawing loops that caused GUI lag.
- The earlier conversation offered, but did **not** authorize, additions such as diagnostics, module error isolation, adaptive performance, toast notifications, waypoints and config profiles. Do not build them unless the user asks.

## Example prompt for the next session

> Please read `START_HERE.md` in this Orbit Client handoff, restore and inspect the project, and then help me with: **[describe the task you want]**. Preserve the existing project and its listed constraints.
