package dev.orbit.client.module.impl.perf;

import dev.orbit.client.module.setting.NumberSetting;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.option.SimpleOption;

/**
 * Forces a simulation distance: how many chunks of entities/block ticks run client-side.
 *
 * <p>This is the one that actually costs CPU on busy servers, and unlike render distance it does not
 * change what you see - just how far away things keep ticking.
 */
public class SimulationDistance extends OptionModule {
    private final NumberSetting chunks =
            addSetting(new NumberSetting("Chunks", 5, 2, 32, 1, ""));

    public SimulationDistance() {
        super("Simulation Distance", "Caps client-side entity/block ticking distance. Real CPU win.");
    }

    @Override
    protected SimpleOption<?> option(MinecraftClient client) {
        return client.options.getSimulationDistance();
    }

    @Override
    protected Object forcedValue() {
        return (int) chunks.get();
    }
}
