package net.minecraft.world;

import net.minecraft.entity.player.PlayerEntity;
import net.minecraft.util.math.Vec3d;

public class RaycastContext {
    public final Vec3d from, to;
    public RaycastContext(Vec3d from, Vec3d to, ShapeType shape, FluidHandling fluid, PlayerEntity player) {
        this.from = from; this.to = to;
    }
    public enum ShapeType { OUTLINE }
    public enum FluidHandling { NONE }
}
