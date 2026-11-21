package dev.orbit.client.module.impl.perf;

import net.minecraft.client.MinecraftClient;
import net.minecraft.client.option.SimpleOption;

/** Biome blend radius 0: no per-block colour blending across chunk borders. */
public class NoBiomeBlend extends OptionModule {
    public NoBiomeBlend() {
        super("No Biome Blend", "Removes biome colour blending. Cheaper chunk meshes.");
    }

    @Override
    protected SimpleOption<?> option(MinecraftClient client) {
        return client.options.getBiomeBlendRadius();
    }

    @Override
    protected Object forcedValue() {
        return 0;
    }
}
