package dev.orbit.client.module.impl.perf;

import net.minecraft.client.MinecraftClient;
import net.minecraft.client.option.CloudRenderMode;
import net.minecraft.client.option.SimpleOption;

/** Hides vanilla clouds. The single biggest win in any sky-heavy scene. */
public class NoClouds extends OptionModule {
    public NoClouds() {
        super("No Clouds", "Hides vanilla clouds - the biggest single win in open sky.");
    }

    @Override
    protected SimpleOption<?> option(MinecraftClient client) {
        return client.options.getCloudRenderMode();
    }

    @Override
    protected Object forcedValue() {
        return CloudRenderMode.OFF;
    }
}
