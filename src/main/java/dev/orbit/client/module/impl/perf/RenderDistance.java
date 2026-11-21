package dev.orbit.client.module.impl.perf;

import dev.orbit.client.module.setting.NumberSetting;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.option.SimpleOption;

/**
 * Forces a chunk render distance regardless of the vanilla setting.
 *
 * <p>As the prototype warned, this can hurt more than help: a client that renders less than the
 * server sends just gets pop-in, and the chunk data is still built.
 */
public class RenderDistance extends OptionModule {
    private final NumberSetting chunks =
            addSetting(new NumberSetting("Chunks", 8, 2, 32, 1, ""));

    public RenderDistance() {
        super("Render Distance", "Forces a chunk distance. Can hurt more than help - see the README.");
    }

    @Override
    protected SimpleOption<?> option(MinecraftClient client) {
        return client.options.getViewDistance();
    }

    @Override
    protected Object forcedValue() {
        return (int) chunks.get();
    }
}
