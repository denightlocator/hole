package dev.orbitobserver.client.render;

import net.minecraft.client.render.VertexConsumer;
import net.minecraft.util.math.Vec3d;
import org.joml.Matrix4f;

/** Emits ordinary depth-tested line vertices; it never changes the rendering pipeline. */
public final class EspRenderer {
    private EspRenderer() { }

    public static void drawLine(VertexConsumer vertices, Matrix4f matrix, Vec3d from, Vec3d to,
                                int fromColor, int toColor, float width) {
        double dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
        double length = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (!Double.isFinite(length) || length < 1.0e-9) return;
        float nx = (float) (dx / length), ny = (float) (dy / length), nz = (float) (dz / length);
        vertices.vertex(matrix, (float) from.x, (float) from.y, (float) from.z)
                .color(fromColor).normal(nx, ny, nz).lineWidth(width);
        vertices.vertex(matrix, (float) to.x, (float) to.y, (float) to.z)
                .color(toColor).normal(nx, ny, nz).lineWidth(width);
    }
}
