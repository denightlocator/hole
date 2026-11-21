package net.minecraft.block;

import net.minecraft.client.world.ClientWorld;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.Box;
import net.minecraft.util.shape.VoxelShape;

public class BlockState {
    private final Block block;
    public BlockState(Block block) { this.block = block; }
    public Block getBlock() { return block; }
    public boolean isAir() { return block == Blocks.AIR; }
    public boolean isOf(Block other) { return block == other; }

    // Small, upward-facing cuboids approximate the vanilla bud outlines for regression tests.
    public VoxelShape getOutlineShape(ClientWorld world, BlockPos pos) {
        if (isAir()) return new VoxelShape(null);
        double height = block == Blocks.SMALL_AMETHYST_BUD ? 3 / 16.0
                : block == Blocks.MEDIUM_AMETHYST_BUD ? 4 / 16.0
                : block == Blocks.LARGE_AMETHYST_BUD ? 5 / 16.0
                : block == Blocks.AMETHYST_CLUSTER ? 7 / 16.0 : 1;
        double margin = height < 1 ? 3 / 16.0 : 0;
        return new VoxelShape(new Box(margin, 0, margin, 1 - margin, height, 1 - margin));
    }
}
