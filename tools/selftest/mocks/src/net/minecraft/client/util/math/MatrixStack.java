package net.minecraft.client.util.math;

import java.util.ArrayList;
import java.util.List;
import net.minecraft.util.math.Vec3d;
import org.joml.Matrix4f;
import org.joml.Quaternionf;

public class MatrixStack {
    public final List<Vec3d> translations = new ArrayList<>();
    public final List<Float> scales = new ArrayList<>();
    public void push() { }
    public void pop() { }
    public void translate(double x, double y, double z) { translations.add(new Vec3d(x, y, z)); }
    public void multiply(Quaternionf rotation) { }
    public void scale(float x, float y, float z) { scales.add(x); }
    public Entry peek() { return new Entry(); }

    public static class Entry {
        public Matrix4f getPositionMatrix() { return new Matrix4f(); }
    }
}
