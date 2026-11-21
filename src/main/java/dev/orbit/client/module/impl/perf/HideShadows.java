package dev.orbit.client.module.impl.perf;

import net.minecraft.client.MinecraftClient;
import net.minecraft.client.option.SimpleOption;

/** Turns off the entity shadow blobs under mobs and players. */
public class HideShadows extends OptionModule {
    public HideShadows() {
        super("Hide Shadows", "Turns off entity shadow blobs. Cheap, every frame.");
    }

    @Override
    protected SimpleOption<?> option(MinecraftClient client) {
        return client.options.getEntityShadows();
    }

    @Override
    protected Object forcedValue() {
        return Boolean.FALSE;
    }
}
