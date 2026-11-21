package net.minecraft.client.render;

import java.util.ArrayList;
import java.util.List;
import net.minecraft.util.math.Vec3d;
import org.joml.Matrix4f;

/** Records one entry per two-vertex line for companion rendering tests. */
public class VertexConsumer {
    public static final List<Integer> colors = new ArrayList<>();
    public static final List<Float> widths = new ArrayList<>();
    public static final List<Vec3d> positions = new ArrayList<>();
    private int vertexCount;
    private boolean firstVertex;

    public VertexConsumer vertex(Matrix4f matrix, float x, float y, float z) {
        firstVertex = vertexCount++ % 2 == 0;
        if (firstVertex) positions.add(new Vec3d(x, y, z));
        return this;
    }
    public VertexConsumer color(int color) { if (firstVertex) colors.add(color); return this; }
    public VertexConsumer normal(float x, float y, float z) { return this; }
    public VertexConsumer lineWidth(float width) { if (firstVertex) widths.add(width); return this; }
}
