package net.minecraft.world.chunk;

import net.minecraft.util.math.ChunkPos;

public class Chunk {
    public final ChunkPos pos;
    public final ChunkSection[] sections = new ChunkSection[24];
    public Chunk(int x, int z) {
        pos = new ChunkPos(x, z);
        for (int i = 0; i < sections.length; i++) sections[i] = new ChunkSection();
    }
    public ChunkSection[] getSectionArray() { return sections; }
    public ChunkPos getPos() { return pos; }
}
