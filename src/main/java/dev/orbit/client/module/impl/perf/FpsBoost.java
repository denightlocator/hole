package dev.orbit.client.module.impl.perf;

import dev.orbit.client.module.Category;
import dev.orbit.client.module.Module;
import dev.orbit.client.module.ModuleRegistry;
import dev.orbit.client.module.setting.NumberSetting;
import dev.orbit.client.module.setting.Setting;

import java.util.ArrayList;
import java.util.List;

/**
 * FPS Boost - one switch for the cheap wins.
 *
 * <p>It is a bundle, not a fourth implementation: it enables the individual modules above, so their
 * settings and their restore-on-disable behaviour still apply. It remembers which ones it actually
 * switched on and, on disable, turns off only those - leaving anything the player had already
 * enabled alone.
 */
public class FpsBoost extends Module {
    private final NumberSetting entityDistance =
            addSetting(new NumberSetting("Entity Distance", 50, 10, 100, 5, "%"));

    private final List<Module> switchedOn = new ArrayList<>();

    public FpsBoost() {
        super("FPS Boost", "One switch for the cheap wins: clouds, weather, particles, shadows.",
                Category.PERFORMANCE);
    }

    @Override
    public void onEnable() {
        switchedOn.clear();

        switchOn(NoClouds.class);
        switchOn(Weather.class);
        switchOn(SimpleParticles.class);
        switchOn(HideShadows.class);
        switchOn(NoSmoothLighting.class);
        switchOn(FastLeaves.class);
        switchOn(EntityDistance.class);

        // push this module's slider into the child so the two cannot disagree
        ModuleRegistry.get(EntityDistance.class).ifPresent(module -> {
            for (Setting<?> setting : module.getSettings()) {
                if (setting instanceof NumberSetting number && "Distance".equals(number.getName())) {
                    number.set(entityDistance.get());
                }
            }
        });
    }

    private void switchOn(Class<? extends Module> type) {
        ModuleRegistry.get(type).ifPresent(module -> {
            if (!module.isEnabled()) {
                module.setEnabled(true);
                switchedOn.add(module);
            }
        });
    }

    @Override
    public void onDisable() {
        for (Module module : switchedOn) {
            module.setEnabled(false);
        }
        switchedOn.clear();
    }
}
