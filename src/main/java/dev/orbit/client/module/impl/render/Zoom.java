package dev.orbit.client.module.impl.render;

import dev.orbit.client.module.Category;
import dev.orbit.client.module.Module;
import dev.orbit.client.module.ModuleRegistry;
import dev.orbit.client.module.setting.BoolSetting;
import dev.orbit.client.module.setting.NumberSetting;
import net.minecraft.util.math.MathHelper;

/**
 * Zoom - hold a key to narrow the field of view, like OptiFine's zoom.
 *
 * <p>The FOV itself is divided in {@code GameRendererMixin}: {@code GameRenderer.getFov} is private,
 * so a mixin on its return value is the only way to change it without touching the player's FOV
 * setting (which would be visible in Options and restored wrongly on crash).
 *
 * <p>The zoom eases in and out rather than snapping, and the mouse sensitivity is scaled by the same
 * factor while zoomed - without that, a 4x zoom is unusable because the smallest hand movement throws
 * the view across the screen.
 */
public class Zoom extends Module {
    private final NumberSetting factor = addSetting(new NumberSetting("Factor", 4.0, 1.5, 12.0, 0.5, "x"));
    private final NumberSetting smoothness = addSetting(new NumberSetting("Smoothness", 45, 0, 95, 5, "%"));
    private final BoolSetting scrollAdjust = addSetting(new BoolSetting("Scroll Adjust", true));
    private final BoolSetting reduceSensitivity = addSetting(new BoolSetting("Lower Sensitivity", true));

    private long lastFrameNanos;
    private float current = 1.0f;   // 1 = not zoomed, factor = fully zoomed

    public Zoom() {
        super("Zoom", "Hold the bind to zoom in. Scroll to adjust while zoomed.", Category.RENDER);
        setKeybind(dev.orbit.client.module.Keybind.keyboard(org.lwjgl.glfw.GLFW.GLFW_KEY_Z));
    }

    /** True while the key is actually held (the module can be on without zooming). */
    public boolean zooming() {
        return isEnabled() && getKeybind().isHeld();
    }

    /** Dampens the player's FOV by this divisor. Called from the render thread. */
    public float fovDivisor() {
        tick();
        return Math.max(1.0f, current);
    }

    /** Mouse sensitivity multiplier, so aiming stays proportional while zoomed. */
    public double sensitivityScale() {
        if (!reduceSensitivity.get() || current <= 1.001f) {
            return 1.0;
        }
        return 1.0 / Math.sqrt(current);
    }

    public boolean consumesScroll() {
        return isEnabled() && scrollAdjust.get() && getKeybind().isHeld();
    }

    /** Wheel while zoomed changes the factor instead of the hotbar. */
    public void onScroll(double vertical) {
        if (!consumesScroll() || vertical == 0) {
            return;
        }
        double next = factor.get() + Math.signum(vertical) * 0.5;
        factor.set(MathHelper.clamp(next, 1.5, 12.0));
    }

    @Override
    public void onDisable() {
        current = 1.0f;
        lastFrameNanos = 0L;
    }

    /** Eases {@link #current} toward the target. Frame-rate independent. */
    private void tick() {
        long now = System.nanoTime();
        float dt = lastFrameNanos == 0L ? 0.0f : (now - lastFrameNanos) / 1.0E9f;
        lastFrameNanos = now;
        dt = MathHelper.clamp(dt, 0.0f, 0.1f);

        float target = zooming() ? (float) factor.get() : 1.0f;

        double smooth01 = smoothness.get() / 100.0;
        if (smooth01 <= 0.001) {
            current = target;
            return;
        }
        double rate = MathHelper.lerp(smooth01, 30.0, 4.0);
        double blend = 1.0 - Math.exp(-rate * dt);
        current += (target - current) * (float) blend;
        if (Math.abs(target - current) < 0.002f) {
            current = target;
        }
    }

    /** Convenience for the mixin and the HUD, so neither has to null-check the registry. */
    public static Zoom active() {
        return ModuleRegistry.get(Zoom.class).orElse(null);
    }
}
