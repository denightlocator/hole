package dev.orbit.client.module.impl.perf;

import dev.orbit.client.perf.PerfState;

/** Skips rendering item frames and glow item frames. */
public class HideItemFrames extends FlagModule {
    public HideItemFrames() {
        super("Hide Item Frames", "Skips item frames and glow item frames.");
    }

    @Override
    protected void publish(boolean enabled) {
        PerfState.hideItemFrames = enabled;
    }
}
