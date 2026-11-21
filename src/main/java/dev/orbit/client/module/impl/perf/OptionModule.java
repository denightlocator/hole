package dev.orbit.client.module.impl.perf;

import dev.orbit.client.module.Category;
import dev.orbit.client.module.Module;
import dev.orbit.client.perf.OptionGuard;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.option.SimpleOption;

/**
 * Base for the performance modules that work purely by forcing a vanilla option.
 *
 * <p>No mixin is involved: these are the settings a player could change by hand, and hijacking the
 * option means the change propagates everywhere vanilla reads it. The previous value is restored
 * when the module is switched off.
 */
public abstract class OptionModule extends Module {
    protected OptionModule(String name, String description) {
        this(name, description, Category.PERFORMANCE);
    }

    protected OptionModule(String name, String description, Category category) {
        super(name, description, category);
    }

    /** The vanilla option this module overrides. */
    protected abstract SimpleOption<?> option(MinecraftClient client);

    /** The value to force while enabled. */
    protected abstract Object forcedValue();

    @Override
    public void onEnable() {
        applyForced();
    }

    @Override
    public void onTick() {
        // opening the options screen, or a config reload, can write the old value back
        applyForced();
    }

    @Override
    public void onDisable() {
        MinecraftClient client = MinecraftClient.getInstance();
        if (client != null && client.options != null) {
            OptionGuard.restore(option(client));
        }
    }

    @SuppressWarnings("unchecked")
    private void applyForced() {
        MinecraftClient client = MinecraftClient.getInstance();
        if (client == null || client.options == null) {
            return;
        }
        SimpleOption<Object> target = (SimpleOption<Object>) (SimpleOption<?>) option(client);
        Object wanted = forcedValue();
        if (target == null || wanted == null) {
            return;
        }
        if (!wanted.equals(target.getValue())) {
            OptionGuard.apply(target, wanted);
        }
    }
}
