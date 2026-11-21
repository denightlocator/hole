package dev.orbit.client.module.impl.render;

import dev.orbit.client.module.Category;
import dev.orbit.client.module.impl.perf.OptionModule;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.option.SimpleOption;

/** No View Bob - stops the camera bobbing while you walk. */
public class NoViewBob extends OptionModule {
    public NoViewBob() {
        super("No View Bob", "Stops the camera bobbing while walking.", Category.RENDER);
    }

    @Override
    protected SimpleOption<?> option(MinecraftClient client) {
        return client.options.getBobView();
    }

    @Override
    protected Object forcedValue() {
        return Boolean.FALSE;
    }
}
