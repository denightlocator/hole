package dev.orbit.client.module.impl.render;

import dev.orbit.client.module.Category;
import dev.orbit.client.module.Module;
import net.minecraft.client.render.fog.FogRenderer;

/**
 * Removes distance fog, the underwater murk and the lava/void haze.
 *
 * <p>1.21.11 keeps a single static switch in {@code FogRenderer} that the whole fog pipeline respects,
 * so this flips that rather than injecting into the per-frame fog buffer. Widened in
 * {@code orbit.accesswidener} because the field is private. Note this is all-or-nothing: vanilla's
 * switch is global, so underwater murk cannot be kept while distance fog is removed.
 */
public class NoFog extends Module {
    public NoFog() {
        super("No Fog", "Removes distance fog, underwater murk and void haze.", Category.RENDER);
    }

    @Override
    public void onEnable() {
        setEnabledState(false);
    }

    @Override
    public void onDisable() {
        setEnabledState(true);
    }

    @Override
    public void onTick() {
        // the graphics options screen can toggle fog back on
        setEnabledState(false);
    }

    private static void setEnabledState(boolean fogOn) {
        try {
            FogRenderer.fogEnabled = fogOn;
        } catch (Throwable ignored) {
            // never take the game down over fog
        }
    }
}
