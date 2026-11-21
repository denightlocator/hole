package net.minecraft.util.math;

import java.util.Objects;

public class BlockPos {
    private final int x, y, z;
    public BlockPos(int x, int y, int z) { this.x = x; this.y = y; this.z = z; }
    public int getX() { return x; }
    public int getY() { return y; }
    public int getZ() { return z; }
    public BlockPos toImmutable() { return new BlockPos(x, y, z); }
    public long asLong() { return ((long) (x & 0x3ffffff) << 38) | ((long) (z & 0x3ffffff) << 12) | (y & 4095); }
    @Override public boolean equals(Object value) {
        return value instanceof BlockPos p && x == p.x && y == p.y && z == p.z;
    }
    @Override public int hashCode() { return Objects.hash(x, y, z); }
}
