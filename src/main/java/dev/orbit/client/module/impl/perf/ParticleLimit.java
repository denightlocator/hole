package dev.orbit.client.module.impl.perf;

import dev.orbit.client.module.setting.NumberSetting;
import dev.orbit.client.perf.PerfState;

/**
 * Caps how many particles may be spawned per tick.
 *
 * <p>A per-tick spawn budget, not a live count: it stops the explosion of 3000 block-break particles
 * at the source, which is where the stutter comes from. Anything already alive keeps running.
 */
public class ParticleLimit extends FlagModule {
    private final NumberSetting perTick =
            addSetting(new NumberSetting("Per Tick", 400, 50, 4000, 50, ""));

    public ParticleLimit() {
        super("Particle Limit", "Caps particle spawns per tick. Stops particle-storm stutter.");
    }

    @Override
    protected void publish(boolean enabled) {
        PerfState.particleBudget = enabled ? (int) perTick.get() : 0;
    }
}
