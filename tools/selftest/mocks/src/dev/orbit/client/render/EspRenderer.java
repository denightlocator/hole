package dev.orbit.client.render;

import java.util.ArrayList;
import java.util.List;
import net.minecraft.client.render.VertexConsumer;
import net.minecraft.util.math.Vec3d;
import org.joml.Matrix4f;

public class EspRenderer {
    public static final List<Integer> colors = new ArrayList<>();
    public static final List<Float> widths = new ArrayList<>();

    public static void drawLine(VertexConsumer vertices, Matrix4f matrix, Vec3d from, Vec3d to,
                                int fromColor, int toColor, float width) {
        colors.add(fromColor);
        widths.add(width);
    }
}
