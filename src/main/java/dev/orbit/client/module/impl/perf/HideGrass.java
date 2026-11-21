package dev.orbit.client.module.impl.perf;

import dev.orbit.client.perf.PerfState;

/** Skips short grass, flowers and tall plants when chunks are built. */
public class HideGrass extends FlagModule {
    public HideGrass() {
        super("Hide Grass", "Skips grass, flowers and tall plants. Helps in fields.");
    }

    @Override
    protected void publish(boolean enabled) {
        PerfState.hideGrass = enabled;
    }
}
