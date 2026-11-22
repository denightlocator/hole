package dev.orbit.client.render;

import com.mojang.blaze3d.pipeline.RenderPipeline;
import com.mojang.blaze3d.platform.DepthTestFunction;
import dev.orbit.client.Orbit;
import net.minecraft.client.gl.RenderPipelines;
import net.minecraft.client.render.RenderLayer;
import net.minecraft.client.render.RenderSetup;
import net.minecraft.client.render.VertexConsumer;
import net.minecraft.util.Identifier;
import net.minecraft.util.math.Box;
import net.minecraft.util.math.Vec3d;
import org.joml.Matrix4f;

/**
 * Shared render plumbing for ESP style modules.
 *
 * <p>Vanilla's line layer is depth tested, so boxes drawn with it disappear behind terrain. This
 * class builds the same line pipeline with {@link DepthTestFunction#NO_DEPTH_TEST} and wraps it in
 * a {@link RenderLayer}, which is what makes the ESP visible through walls.
 *
 * <p>The three vanilla members needed for that are widened in {@code orbit.accesswidener}.
 */
public final class EspRenderer {
    /** Extra thickness so the box does not z-fight with the block's own faces. */
    private static final double INFLATE = 0.002;

    private static RenderLayer linesLayer;
    private static boolean initialised;

    private EspRenderer() {
    }

    /** @return the through-wall line layer, or {@code null} if the pipeline could not be created. */
    public static RenderLayer linesLayer() {
        if (!initialised) {
            initialised = true;
            try {
                RenderPipeline pipeline = RenderPipelines.register(
                        RenderPipeline.builder(RenderPipelines.RENDERTYPE_LINES_SNIPPET)
                                .withLocation(Identifier.of("orbit", "pipeline/esp_lines"))
                                .withDepthTestFunction(DepthTestFunction.NO_DEPTH_TEST)
                                .build());

                linesLayer = RenderLayer.of("orbit_esp_lines", RenderSetup.builder(pipeline).build());
                Orbit.LOGGER.info("ESP line pipeline ready");
            } catch (Throwable t) {
                Orbit.LOGGER.error("Could not build the through-wall line pipeline", t);
                linesLayer = null;
            }
        }
        return linesLayer;
    }

    /**
     * Draws the 12 edges of a box, fading from {@code bottomColor} at the bottom to
     * {@code topColor} at the top so boxes read as gradients instead of flat wireframes.
     */
    public static void drawBox(VertexConsumer vertices, Matrix4f matrix, Box box,
                               int bottomColor, int topColor, float lineWidth) {
        Box b = box.expand(INFLATE);
        double x1 = b.minX;
        double y1 = b.minY;
        double z1 = b.minZ;
        double x2 = b.maxX;
        double y2 = b.maxY;
        double z2 = b.maxZ;

        // bottom face
        line(vertices, matrix, x1, y1, z1, x2, y1, z1, bottomColor, bottomColor, lineWidth);
        line(vertices, matrix, x2, y1, z1, x2, y1, z2, bottomColor, bottomColor, lineWidth);
        line(vertices, matrix, x2, y1, z2, x1, y1, z2, bottomColor, bottomColor, lineWidth);
        line(vertices, matrix, x1, y1, z2, x1, y1, z1, bottomColor, bottomColor, lineWidth);
        // top face
        line(vertices, matrix, x1, y2, z1, x2, y2, z1, topColor, topColor, lineWidth);
        line(vertices, matrix, x2, y2, z1, x2, y2, z2, topColor, topColor, lineWidth);
        line(vertices, matrix, x2, y2, z2, x1, y2, z2, topColor, topColor, lineWidth);
        line(vertices, matrix, x1, y2, z2, x1, y2, z1, topColor, topColor, lineWidth);
        // verticals, one colour per end -> the gradient
        line(vertices, matrix, x1, y1, z1, x1, y2, z1, bottomColor, topColor, lineWidth);
        line(vertices, matrix, x2, y1, z1, x2, y2, z1, bottomColor, topColor, lineWidth);
        line(vertices, matrix, x2, y1, z2, x2, y2, z2, bottomColor, topColor, lineWidth);
        line(vertices, matrix, x1, y1, z2, x1, y2, z2, bottomColor, topColor, lineWidth);
    }

    /** Tracer line with a gradient from origin colour to target colour. */
    public static void drawLine(VertexConsumer vertices, Matrix4f matrix, Vec3d from, Vec3d to,
                                int fromColor, int toColor, float lineWidth) {
        line(vertices, matrix, from.x, from.y, from.z, to.x, to.y, to.z, fromColor, toColor, lineWidth);
    }

    private static void line(VertexConsumer vertices, Matrix4f matrix,
                             double x1, double y1, double z1,
                             double x2, double y2, double z2,
                             int color1, int color2, float lineWidth) {
        double dx = x2 - x1;
        double dy = y2 - y1;
        double dz = z2 - z1;
        double length = Math.sqrt(dx * dx + dy * dy + dz * dz);
        float nx = 0f;
        float ny = 1f;
        float nz = 0f;
        if (length > 1.0E-6) {
            nx = (float) (dx / length);
            ny = (float) (dy / length);
            nz = (float) (dz / length);
        }

        vertices.vertex(matrix, (float) x1, (float) y1, (float) z1)
                .color(color1)
                .normal(nx, ny, nz)
                .lineWidth(lineWidth);
        vertices.vertex(matrix, (float) x2, (float) y2, (float) z2)
                .color(color2)
                .normal(nx, ny, nz)
                .lineWidth(lineWidth);
    }
}
