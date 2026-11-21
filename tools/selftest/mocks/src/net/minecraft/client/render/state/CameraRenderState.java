package net.minecraft.client.render.state;

import net.minecraft.util.math.Vec3d;
import org.joml.Quaternionf;

public class CameraRenderState {
    public Vec3d pos = new Vec3d(0.5, 64.5, 0.5);
    public Quaternionf orientation = new Quaternionf();
}
