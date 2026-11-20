package dev.orbit.client.module.impl.render;

import dev.orbit.client.Orbit;
import dev.orbit.client.module.Category;
import dev.orbit.client.module.Module;
import dev.orbit.client.module.setting.NumberSetting;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.option.SimpleOption;

/**
 * Fullbright - renders the world fully lit regardless of light level.
 *
 * <p>Implementation note: vanilla clamps the gamma option to 0..1 through its slider validator, so
 * {@code getGamma().setValue(10)} silently does nothing useful. Instead this writes the option's
 * backing field directly (widened in {@code orbit.accesswidener}), which is exactly the value the
 * lightmap reads each frame in {@code LightmapTextureManager.update}. That means no mixin, no
 * per-frame work, and it survives the option being re-read.
 *
 * <p>The original value is captured on enable and restored on disable, so switching the module off
 * puts your brightness back where it was rather than leaving the world blown out.
 */
public class Fullbright extends Module {
    private final NumberSetting brightness =
            addSetting(new NumberSetting("Brightness", 15, 1, 15, 1, "x"));

    private Double previousGamma;

    public Fullbright() {
        super("Fullbright", "Fully lit world with no darkness or cave shadows.", Category.RENDER);
        setKeybind(dev.orbit.client.module.Keybind.keyboard(org.lwjgl.glfw.GLFW.GLFW_KEY_G));
    }

    @Override
    public void onEnable() {
        MinecraftClient client = MinecraftClient.getInstance();
        if (client.options == null) {
            return;
        }
        SimpleOption<Double> gamma = client.options.getGamma();
        if (previousGamma == null) {
            previousGamma = gamma.getValue();
        }
        writeGamma(gamma, brightness.get());
    }

    @Override
    public void onTick() {
        MinecraftClient client = MinecraftClient.getInstance();
        if (client.options == null) {
            return;
        }
        SimpleOption<Double> gamma = client.options.getGamma();
        // the options screen or a config reload can write the field back; keep ours in place
        double wanted = brightness.get();
        if (gamma.getValue() == null || Math.abs(gamma.getValue() - wanted) > 0.001) {
            writeGamma(gamma, wanted);
        }
    }

    @Override
    public void onDisable() {
        MinecraftClient client = MinecraftClient.getInstance();
        if (client.options == null) {
            previousGamma = null;
            return;
        }
        SimpleOption<Double> gamma = client.options.getGamma();
        if (previousGamma != null) {
            writeGamma(gamma, previousGamma);
            previousGamma = null;
        } else {
            writeGamma(gamma, 0.5);
        }
    }

    /**
     * Sets the gamma value without going through the validator that caps it at 1.0.
     *
     * <p>Written reflectively-free via the access widener; a failure here must not take the game
     * down, so it logs and disables itself.
     */
    @SuppressWarnings("unchecked")
    private void writeGamma(SimpleOption<Double> gamma, double value) {
        try {
            //noinspection unchecked
            ((SimpleOption<Object>) (SimpleOption<?>) gamma).value = value;
        } catch (Throwable t) {
            Orbit.LOGGER.error("Fullbright: could not write the gamma option", t);
            setEnabled(false);
        }
    }
}
