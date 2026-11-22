package dev.orbit.client.perf;

/**
 * Flags the performance mixins read.
 *
 * <p>Mixins are hot paths - a mixin that walked the module registry on every entity or particle
 * would cost more than it saves. Modules write these plain volatile booleans on enable/disable
 * instead, so each check is a single field read.
 */
public final class PerfState {
    private PerfState() {
    }

    /** Weather rendering + sound muted. */
    public static volatile boolean noWeather;

    /** Entity name labels are not drawn. */
    public static volatile boolean hideNametags;

    /** Block breaking overlay is not drawn. */
    public static volatile boolean hideBlockBreaking;

    /** Grass, flowers and tall plants are not rendered. */
    public static volatile boolean hideGrass;

    /** Entities fully behind the camera are skipped. */
    public static volatile boolean entityCulling;

    /** Item frames and glow item frames are not drawn. */
    public static volatile boolean hideItemFrames;

    /** Squared distance under which entities are never culled. */
    public static volatile double entityCullMinSq = 4.0;

    /** Max particles that may be spawned per tick; 0 = unlimited. */
    public static volatile int particleBudget;

    /** True when every flag is idle, so the mixins can be skipped wholesale. */
    public static boolean idle() {
        return !noWeather && !hideNametags && !hideBlockBreaking && !hideGrass
                && !entityCulling && !hideItemFrames && particleBudget <= 0;
    }
}
