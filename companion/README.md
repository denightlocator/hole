# Orbit Observer (independent Fabric companion)

> The root project now includes these features directly in the full Orbit client. The companion is
> an optional fallback; don't install it alongside the combined Orbit jar or both copies may respond
> to the same keys and render duplicate overlays.

This is a **separate client-only Fabric mod**, not a replacement for Orbit or an addition to
Orbit's GUI. It reuses the two observation modules from `../src/main/java` under an isolated package.
Neither feature sends packets or requires a server mod.

**Status:** the self-tests pass using handwritten Minecraft/Fabric doubles, but this companion has
**not** been built against the real dependencies or tested in Minecraft. The development sandbox
cannot reach the Gradle distribution and Fabric/Mojang dependency servers, so no installable jar
has been produced here. Compatibility, mixin application and in-game rendering remain unverified.

## Build and install (on a machine with dependency access)

You need the entire repository, **JDK 21**, and Internet access to Gradle, Fabric, Maven Central,
and Mojang. From this directory:

```bash
./gradlew build
```

On Windows, use `gradlew.bat build` instead. If the build succeeds, install the **remapped**
`build/libs/orbit-observer-0.1.0.jar` (not a `-dev` or sources jar) in your Minecraft mods folder.
Use Minecraft 1.21.11, Fabric Loader **0.17.3 or newer**, and Fabric API **0.141.6+1.21.11 or newer**
for Minecraft 1.21.11. Orbit is optional, and the combined Orbit jar already contains the same
features. The first build downloads Gradle and dependencies; the wrapper verifies the distribution
checksum. The repository's optional GitHub Actions workflow template is for the **combined Orbit
client**, not this optional companion; see [`tools/ci/README.md`](../tools/ci/README.md).

## Controls and configuration

Both features default to **off**. In a world, press **B** for Chunk Activity and **J** for Geode Age.
Both keys can be rebound in Minecraft's **Options → Controls → Key Binds → Orbit Observer**. Check for
conflicts with Orbit and other mods. Toggle state is saved; turning a feature off clears its local
history. Editing a settings file does not reload it while Minecraft is running.

The companion creates `config/orbit-observer.properties` in the Minecraft instance directory on
first launch. Edit it while Minecraft is closed. These are the defaults:

```properties
chunk.enabled=false
chunk.color=#65C7FF
chunk.opacity=35
chunk.fadeSeconds=300
chunk.lineWidth=1.5
geode.enabled=false
geode.range=32
geode.agingAfter=120
geode.veryAgedAfter=600
geode.freshColor=#A8E8FF
geode.agingColor=#C397FF
geode.veryAgedColor=#FF9FDC
geode.opacity=90
geode.labelScale=0.8
```

Colours are six-digit RGB hex; opacity is a percentage. The numeric bounds are: chunk opacity 0–100,
fade 10–3600 seconds, line width 1–4; geode range 8–48 blocks, thresholds 10–3600 / 10–7200 seconds,
opacity 0–100, label scale 0.5–2. Out-of-range values are clamped, and invalid values use defaults.
The very-aged threshold is effectively at least the aging threshold. The keys themselves are saved
by Minecraft, not in this file. Toggles reread and rewrite the properties file to retain unknown
settings, but comments and ordering may change. If the file is malformed or inaccessible it is not
overwritten; defaults are used for that session and a warning is logged.

## Interpretation and limits

* **Chunk Activity:** recent local player movement and observed block-type changes near players
  refresh a fading horizontal chunk outline. Nearby block changes are only *possibly* caused by
  the player. Activity outside the client's view can be missed; natural events can be false positives.
* **Geode Age:** exposed amethyst and bud stages are grouped and shown as Fresh, Aging or Very aged.
  The locally observed chunk-load duration and growth stages are a rough visual heuristic, **not an
  actual age**. A player-placed amethyst block can be labelled. Unloaded chunks, walls, glass or a
  calcite-only shell can prevent a label. Observations reset when the chunk unloads or feature turns off.

Read the top-level README for further behavioral detail. Test from the repository root with
`bash tools/selftest/run-observation-tests.sh` (JDK 21 and Python 3); mocks do not prove real API
compatibility or graphics behavior.
