package net.minecraft.client.render;

import net.minecraft.util.math.Vec3d;
import org.joml.Quaternionf;

public class Camera {
    public Vec3d pos = new Vec3d(0.5, 64.5, 0.5);
    public Vec3d getCameraPos() { return pos; }
    public Quaternionf getRotation() { return new Quaternionf(); }
}
