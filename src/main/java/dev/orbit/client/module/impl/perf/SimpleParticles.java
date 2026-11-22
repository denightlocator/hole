package dev.orbit.client.module.impl.perf;

import dev.orbit.client.module.setting.ModeSetting;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.option.SimpleOption;
import net.minecraft.particle.ParticlesMode;

/** Forces vanilla's particle setting down. */
public class SimpleParticles extends OptionModule {
    private final ModeSetting mode = addSetting(new ModeSetting("Mode", "Minimal", "Minimal", "Decreased"));

    public SimpleParticles() {
        super("Simple Particles", "Forces vanilla's particle setting down. Big win in fights.");
    }

    @Override
    protected SimpleOption<?> option(MinecraftClient client) {
        return client.options.getParticles();
    }

    @Override
    protected Object forcedValue() {
        return "Decreased".equals(mode.get()) ? ParticlesMode.DECREASED : ParticlesMode.MINIMAL;
    }
}
