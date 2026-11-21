package net.minecraft.client.world;

import net.minecraft.world.chunk.ChunkStatus;
import net.minecraft.world.chunk.WorldChunk;

public class ClientChunkManager {
    private final ClientWorld world;

    public ClientChunkManager(ClientWorld world) { this.world = world; }

    public boolean isChunkLoaded(int x, int z) { return world.hasChunk(x, z); }

    public WorldChunk getChunk(int x, int z, ChunkStatus status, boolean create) {
        if (create) throw new AssertionError("unexpected chunk creation request");
        return world.hasChunk(x, z) ? world.getChunk(x, z) : null;
    }
}
