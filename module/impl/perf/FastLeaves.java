package dev.orbit.client.module.impl.perf;

import net.minecraft.client.MinecraftClient;
import net.minecraft.client.option.SimpleOption;

/** Solid leaves instead of cutout leaves - fewer transparent faces to sort and draw. */
public class FastLeaves extends OptionModule {
    public FastLeaves() {
        super("Fast Leaves", "Solid leaves instead of cutout leaves. Noticeable in forests.");
    }

    @Override
    protected SimpleOption<?> option(MinecraftClient client) {
        return client.options.getCutoutLeaves();
    }

    @Override
    protected Object forcedValue() {
        return Boolean.FALSE;
    }
}
