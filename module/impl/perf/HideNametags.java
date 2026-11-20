package dev.orbit.client.module.impl.perf;

import dev.orbit.client.perf.PerfState;

/** Skips drawing entity name labels. */
public class HideNametags extends FlagModule {
    public HideNametags() {
        super("Hide Nametags", "Stops drawing entity name labels.");
    }

    @Override
    protected void publish(boolean enabled) {
        PerfState.hideNametags = enabled;
    }
}
