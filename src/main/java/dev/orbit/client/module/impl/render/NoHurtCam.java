package dev.orbit.client.module.impl.render;

import dev.orbit.client.module.Category;
import dev.orbit.client.module.impl.perf.OptionModule;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.option.SimpleOption;

/**
 * No Hurt Cam - removes the camera tilt when you take damage.
 *
 * <p>Vanilla exposes this as a slider (`Damage Tilt`), so this simply forces it to 0 and restores the
 * player's own value on disable. No mixin needed.
 */
public class NoHurtCam extends OptionModule {
    public NoHurtCam() {
        super("No Hurt Cam", "Removes the camera tilt when you take damage.", Category.RENDER);
    }

    @Override
    protected SimpleOption<?> option(MinecraftClient client) {
        return client.options.getDamageTiltStrength();
    }

    @Override
    protected Object forcedValue() {
        return 0.0;
    }
}
