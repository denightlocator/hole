package dev.orbit.client.module.impl.perf;

import net.minecraft.client.MinecraftClient;
import net.minecraft.client.option.SimpleOption;

/** Turns off smooth lighting (ambient occlusion), which is computed while chunks are meshed. */
public class NoSmoothLighting extends OptionModule {
    public NoSmoothLighting() {
        super("No Smooth Lighting", "Turns off ambient occlusion. Helps chunk building and caves.");
    }

    @Override
    protected SimpleOption<?> option(MinecraftClient client) {
        return client.options.getAo();
    }

    @Override
    protected Object forcedValue() {
        return Boolean.FALSE;
    }
}
