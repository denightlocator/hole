package dev.orbit.client.render;

import net.minecraft.client.render.VertexConsumerProvider;
import net.minecraft.util.Identifier;
import org.joml.Matrix4f;

/** Test double for SkyModule's selection and fallback flow, not a Minecraft renderer. */
public final class SkyRenderer {
    public static Identifier lastTexture;
    public static boolean drawSucceeds = true;

    public static boolean draw(Identifier texture, VertexConsumerProvider consumers, Matrix4f matrix,
                               double camX, double camY, double camZ, int tint) {
        lastTexture = texture;
        return drawSucceeds;
    }
}
