package dev.orbit.client.module.impl.perf;

import dev.orbit.client.perf.PerfState;

/** Skips the block breaking crack overlay. */
public class HideBlockBreaking extends FlagModule {
    public HideBlockBreaking() {
        super("Hide Block Breaking", "Hides the cracking overlay on blocks being mined.");
    }

    @Override
    protected void publish(boolean enabled) {
        PerfState.hideBlockBreaking = enabled;
    }
}
