package dev.orbit.client.module.impl.perf;

import dev.orbit.client.module.setting.NumberSetting;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.option.SimpleOption;

/** Scales vanilla's entity render distance. Most of the real gain on busy servers. */
public class EntityDistance extends OptionModule {
    private final NumberSetting distance =
            addSetting(new NumberSetting("Distance", 50, 10, 100, 5, "%"));

    public EntityDistance() {
        super("Entity Distance", "Scales vanilla's entity render distance. Most of the real gain.");
    }

    @Override
    protected SimpleOption<?> option(MinecraftClient client) {
        return client.options.getEntityDistanceScaling();
    }

    @Override
    protected Object forcedValue() {
        return distance.get() / 100.0;
    }
}
