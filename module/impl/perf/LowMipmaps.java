package dev.orbit.client.module.impl.perf;

import net.minecraft.client.MinecraftClient;
import net.minecraft.client.option.SimpleOption;

/** Mipmap level 0: fewer texture levels to build, sharper-but-shimmering blocks. */
public class LowMipmaps extends OptionModule {
    public LowMipmaps() {
        super("Low Mipmaps", "Mipmap level 0. Saves texture memory; blocks shimmer at distance.");
    }

    @Override
    protected SimpleOption<?> option(MinecraftClient client) {
        return client.options.getMipmapLevels();
    }

    @Override
    protected Object forcedValue() {
        return 0;
    }
}
