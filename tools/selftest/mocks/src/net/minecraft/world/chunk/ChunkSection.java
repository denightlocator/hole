package net.minecraft.world.chunk;

import java.util.Arrays;
import java.util.function.Predicate;
import net.minecraft.block.Block;
import net.minecraft.block.BlockState;
import net.minecraft.block.Blocks;

public class ChunkSection {
    private final BlockState[] states = new BlockState[4096];
    public ChunkSection() { Arrays.fill(states, new BlockState(Blocks.AIR)); }
    public boolean hasAny(Predicate<BlockState> predicate) {
        for (BlockState state : states) if (predicate.test(state)) return true;
        return false;
    }
    public BlockState getBlockState(int x, int y, int z) { return states[(y << 8) | (z << 4) | x]; }
    public void set(int x, int y, int z, Block block) { states[(y << 8) | (z << 4) | x] = new BlockState(block); }
}
