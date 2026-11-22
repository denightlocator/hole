package net.minecraft.client.world;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import net.minecraft.block.Block;
import net.minecraft.block.BlockState;
import net.minecraft.block.Blocks;
import net.minecraft.entity.player.PlayerEntity;
import net.minecraft.util.hit.BlockHitResult;
import net.minecraft.util.hit.HitResult;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.Box;
import net.minecraft.util.math.Vec3d;
import net.minecraft.world.RaycastContext;
import net.minecraft.world.World;
import net.minecraft.world.chunk.WorldChunk;

/** Deliberately simplified test world; it does not simulate Minecraft's full block shapes. */
public class ClientWorld extends World {
    public final List<PlayerEntity> players = new ArrayList<>();
    public final Map<Long, WorldChunk> chunks = new HashMap<>();
    public boolean forbidReads;
    public boolean forceRayMiss;
    public int raycastCalls;
    private final ClientChunkManager manager = new ClientChunkManager(this);

    private void checkReads() {
        if (forbidReads) throw new AssertionError("drawing must not read mutable world state");
    }

    private static long key(int x, int z) { return ((long) x << 32) | (z & 0xffffffffL); }
    public List<PlayerEntity> getPlayers() { checkReads(); return players; }
    public ClientChunkManager getChunkManager() { checkReads(); return manager; }
    public boolean hasChunk(int x, int z) { checkReads(); return chunks.containsKey(key(x, z)); }

    // In 1.21.11 this world-level method is unconditional, unlike the client chunk manager.
    public boolean isChunkLoaded(int x, int z) { checkReads(); return true; }

    public WorldChunk getChunk(int x, int z) {
        checkReads();
        if (!hasChunk(x, z)) throw new AssertionError("unloaded chunk accessed");
        return chunks.get(key(x, z));
    }

    public WorldChunk load(int x, int z) {
        WorldChunk chunk = new WorldChunk(this, x, z);
        chunks.put(key(x, z), chunk);
        return chunk;
    }

    public void unload(int x, int z) { chunks.remove(key(x, z)); }
    public int getBottomSectionCoord() { checkReads(); return -4; }
    public int getTopSectionCoord() { checkReads(); return 19; }
    public int getTopYInclusive() { checkReads(); return 319; }
    public int sectionCoordToIndex(int sectionY) { checkReads(); return sectionY + 4; }

    public void set(int x, int y, int z, Block block) {
        getChunk(x >> 4, z >> 4).sections[(y >> 4) + 4].set(x & 15, y & 15, z & 15, block);
    }

    public BlockState getBlockState(BlockPos pos) {
        checkReads();
        if (!hasChunk(pos.getX() >> 4, pos.getZ() >> 4)) return new BlockState(Blocks.AIR);
        int index = (pos.getY() >> 4) + 4;
        if (index < 0 || index >= 24) return new BlockState(Blocks.AIR);
        return getChunk(pos.getX() >> 4, pos.getZ() >> 4).sections[index]
                .getBlockState(pos.getX() & 15, pos.getY() & 15, pos.getZ() & 15);
    }

    public BlockHitResult raycast(RaycastContext context) {
        checkReads();
        if (!forceRayMiss) {
            // Sample simple cuboid shapes along the segment. This is NOT a replacement for
            // vanilla's precise voxel-shape raycast.
            for (int i = 1; i <= 1200; i++) {
                double t = i / 1200.0;
                Vec3d hit = new Vec3d(context.from.x + (context.to.x - context.from.x) * t,
                        context.from.y + (context.to.y - context.from.y) * t,
                        context.from.z + (context.to.z - context.from.z) * t);
                BlockPos pos = new BlockPos((int) Math.floor(hit.x), (int) Math.floor(hit.y),
                        (int) Math.floor(hit.z));
                BlockState state = getBlockState(pos);
                if (!state.isAir()) {
                    Box box = state.getOutlineShape(this, pos).getBoundingBox();
                    double x = hit.x - pos.getX(), y = hit.y - pos.getY(), z = hit.z - pos.getZ();
                    if (x >= box.minX && x <= box.maxX && y >= box.minY && y <= box.maxY
                            && z >= box.minZ && z <= box.maxZ) {
                        return new BlockHitResult(HitResult.Type.BLOCK, pos, hit);
                    }
                }
            }
        }
        return new BlockHitResult(HitResult.Type.MISS,
                new BlockPos((int) Math.floor(context.to.x), (int) Math.floor(context.to.y),
                        (int) Math.floor(context.to.z)), context.to);
    }
}
