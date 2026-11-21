package net.minecraft.util.hit;

import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.Vec3d;

public class BlockHitResult extends HitResult {
    private final Type type;
    private final BlockPos blockPos;
    private final Vec3d hitPos;

    public BlockHitResult(Type type, BlockPos blockPos) {
        this(type, blockPos, Vec3d.ofCenter(blockPos));
    }

    public BlockHitResult(Type type, BlockPos blockPos, Vec3d hitPos) {
        this.type = type;
        this.blockPos = blockPos;
        this.hitPos = hitPos;
    }

    public Type getType() { return type; }
    public BlockPos getBlockPos() { return blockPos; }
    public Vec3d getPos() { return hitPos; }
}
