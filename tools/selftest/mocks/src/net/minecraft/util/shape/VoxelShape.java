package net.minecraft.util.shape;

import net.minecraft.util.math.Box;

public class VoxelShape {
    private final Box bounds;
    public VoxelShape(Box bounds) { this.bounds = bounds; }
    public boolean isEmpty() { return bounds == null; }
    public Box getBoundingBox() { return bounds; }
}
