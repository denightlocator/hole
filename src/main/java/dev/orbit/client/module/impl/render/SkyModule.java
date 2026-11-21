package dev.orbit.client.module.impl.render;

import dev.orbit.client.module.Category;
import dev.orbit.client.module.Module;
import dev.orbit.client.module.ModuleRegistry;
import dev.orbit.client.module.setting.BoolSetting;
import dev.orbit.client.module.setting.ModeSetting;
import dev.orbit.client.render.SkyRenderer;
import net.fabricmc.fabric.api.client.rendering.v1.world.WorldRenderContext;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.render.Camera;
import net.minecraft.util.Identifier;
import net.minecraft.util.math.Vec3d;
import org.joml.Matrix4f;

/**
 * Custom Sky - replaces the vanilla sky with a baked image dome.
 *
 * <p>Vanilla sky rendering is cancelled in {@code WorldRendererMixin}; the dome itself is drawn here
 * just before terrain so depth testing hides it correctly behind blocks.
 */
public class SkyModule extends Module {
    /** Sky id -> texture. The ids are what appear in the GUI, so keep them human readable. */
    public static final String[][] SKIES = {
            {"Anime / Starfall", "anime"},
            {"Interstellar", "interstellar"},
            {"Blood Moon", "eclipse"},
            {"Synthwave", "synthwave"},
            {"Aurora", "aurora"},
            {"Nebula", "nebula"},
            {"Void", "void"},
            {"Clear Day", "day"},
    };

    private final ModeSetting sky = addSetting(new ModeSetting("Sky",
            "Anime / Starfall",
            "Anime / Starfall", "Interstellar", "Blood Moon", "Synthwave",
            "Aurora", "Nebula", "Void", "Clear Day"));

    private final BoolSetting keepClouds = addSetting(new BoolSetting("Keep Clouds", true));
    private final BoolSetting hideVanillaSky = addSetting(new BoolSetting("Replace Vanilla Sky", true));

    public SkyModule() {
        super("Custom Sky", "Replaces the sky with a baked image dome.", Category.RENDER);
    }

    /** @return the texture for the selected sky. */
    public static Identifier textureFor(String displayName) {
        for (String[] entry : SKIES) {
            if (entry[0].equals(displayName)) {
                return Identifier.of("orbit", "textures/gui/sky/" + entry[1] + ".png");
            }
        }
        return Identifier.of("orbit", "textures/gui/sky/anime.png");
    }

    public Identifier currentTexture() {
        return textureFor(sky.get());
    }

    public boolean replacesVanillaSky() {
        return hideVanillaSky.get();
    }

    public boolean keepsClouds() {
        return keepClouds.get();
    }

    /** Set by the mixin when the vanilla sky pass is skipped. */
    public static boolean isReplacing() {
        return ModuleRegistry.get(SkyModule.class)
                .map(module -> module.isEnabled() && module.replacesVanillaSky())
                .orElse(false);
    }

    @Override
    public void onWorldRender(WorldRenderContext context) {
        MinecraftClient client = MinecraftClient.getInstance();
        if (client.world == null) {
            return;
        }

        Camera camera = client.gameRenderer.getCamera();
        Vec3d cameraPos = camera.getCameraPos();

        context.matrices().push();
        context.matrices().translate(-cameraPos.x, -cameraPos.y, -cameraPos.z);
        Matrix4f matrix = context.matrices().peek().getPositionMatrix();

        boolean drawn = SkyRenderer.draw(currentTexture(), context.consumers(), matrix,
                cameraPos.x, cameraPos.y, cameraPos.z, 0xFFFFFFFF);
        if (!drawn) {
            // pipeline failed: stop claiming the sky so the mixin lets vanilla draw again
            hideVanillaSky.set(false);
            dev.orbit.client.Orbit.LOGGER.warn("Custom Sky disabled: dome could not be drawn");
        }

        context.matrices().pop();
    }
}
