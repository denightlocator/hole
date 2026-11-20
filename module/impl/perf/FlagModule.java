package dev.orbit.client.module.impl.perf;

import dev.orbit.client.module.Category;
import dev.orbit.client.module.Module;

/**
 * Base for the performance modules that need a mixin hook rather than a game option.
 *
 * <p>The mixin reads a flag in {@link dev.orbit.client.perf.PerfState}, so switching the module on
 * writes one boolean and costs nothing per frame beyond that read.
 */
public abstract class FlagModule extends Module {
    protected FlagModule(String name, String description) {
        super(name, description, Category.PERFORMANCE);
    }

    /** Publish the enabled state to the mixin flag. */
    protected abstract void publish(boolean enabled);

    @Override
    public void onEnable() {
        publish(true);
    }

    @Override
    public void onTick() {
        // keeps slider-backed flags (particle budget, cull radius) live instead of needing a toggle
        publish(isEnabled());
    }

    @Override
    public void onDisable() {
        publish(false);
    }
}
