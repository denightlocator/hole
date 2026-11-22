package dev.orbit.client.module.impl.render;

import dev.orbit.client.module.Category;
import dev.orbit.client.module.Keybind;
import dev.orbit.client.module.Module;
import dev.orbit.client.module.setting.NumberSetting;
import dev.orbit.client.module.setting.StringSetting;
import dev.orbit.client.observation.ActivityHistory;
import dev.orbit.client.observation.ChunkVisibility;
import dev.orbit.client.observation.GeodeAgeHeuristic;
import dev.orbit.client.observation.GeodeAgeHeuristic.Age;
import dev.orbit.client.observation.ObservationLimits;
import dev.orbit.client.observation.OverlayColors;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientChunkEvents;
import net.fabricmc.fabric.api.client.rendering.v1.world.WorldRenderContext;
import net.minecraft.block.BlockState;
import net.minecraft.block.Blocks;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.font.TextRenderer;
import net.minecraft.client.render.VertexConsumerProvider;
import net.minecraft.client.util.math.MatrixStack;
import net.minecraft.client.world.ClientWorld;
import net.minecraft.util.hit.BlockHitResult;
import net.minecraft.util.hit.HitResult;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.Box;
import net.minecraft.util.math.ChunkPos;
import net.minecraft.util.math.Vec3d;
import net.minecraft.util.shape.VoxelShape;
import net.minecraft.world.RaycastContext;
import net.minecraft.world.chunk.Chunk;
import net.minecraft.world.chunk.ChunkSection;
import net.minecraft.world.chunk.ChunkStatus;
import org.joml.Matrix4f;
import org.lwjgl.glfw.GLFW;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Deque;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** A deliberately approximate, local observation of exposed amethyst, never a real geode age. */
public final class GeodeAge extends Module {
    private static final int BLOCKS_PER_TICK = 2048;
    private static final int MAX_GROWTH_CANDIDATES = 128;
    private static final int MAX_SURFACE_CANDIDATES = 64;
    private static final int MAX_LABELS = 8;
    private static final int MAX_CHUNK_TIMES = 8192;
    private static final long RESCAN_INTERVAL_MS = 2_000;
    private static final double GROUP_RADIUS_SQUARED = 8.0 * 8.0;
    private static final int[][] NEIGHBOUR_OFFSETS = {
            {1, 0, 0}, {-1, 0, 0}, {0, 1, 0}, {0, -1, 0}, {0, 0, 1}, {0, 0, -1}
    };

    private final NumberSetting range = addSetting(new NumberSetting("Range", 32, 8, 48, 4, "m"));
    private final NumberSetting agingAfter = addSetting(new NumberSetting("Aging After", 120, 10, 3600, 10, "s"));
    private final NumberSetting veryAgedAfter = addSetting(new NumberSetting("Very Aged After", 600, 10, 7200, 10, "s"));
    private final StringSetting freshColor = addSetting(new StringSetting("Fresh Color", "#A8E8FF"));
    private final StringSetting agingColor = addSetting(new StringSetting("Aging Color", "#C397FF"));
    private final StringSetting oldColor = addSetting(new StringSetting("Very Aged Color", "#FF9FDC"));
    private final NumberSetting opacity = addSetting(new NumberSetting("Opacity", 90, 0, 100, 5, "%"));
    private final NumberSetting labelScale = addSetting(new NumberSetting("Label Scale", 0.8, 0.5, 2, 0.1, "x"));

    private final Map<Long, Long> chunkLoadedSince = new LinkedHashMap<>();
    // Reserve separate budgets so a wall of plain amethyst cannot evict all budding blocks.
    private final Map<Long, BlockPos> growthCandidates = new LinkedHashMap<>();
    private final Map<Long, BlockPos> surfaceCandidates = new LinkedHashMap<>();
    private final Deque<SectionScan> pendingSections = new ArrayDeque<>();
    // Immutable tick-produced data, safely published to the drawing callback.
    private volatile RenderSnapshot renderSnapshot = RenderSnapshot.EMPTY;
    private volatile long trackingGeneration;
    private ClientWorld currentWorld;
    private long nextScanAt = Long.MIN_VALUE;
    private Vec3d lastScanOrigin;
    private int lastScanRange;

    public GeodeAge() {
        super("Geode Age", "Estimated age of exposed amethyst, from local observations only.", Category.RENDER);
        setKeybind(Keybind.keyboard(GLFW.GLFW_KEY_J));

        // Register once with the module. Nothing is sent to the server and no chunk is requested.
        ClientChunkEvents.CHUNK_LOAD.register((world, chunk) -> {
            if (isEnabled() && chunk != null) {
                ChunkPos pos = chunk.getPos();
                long generation = trackingGeneration;
                MinecraftClient.getInstance().execute(() -> {
                    if (generation == trackingGeneration) chunkLoaded(world, pos.x, pos.z);
                });
            }
        });
        ClientChunkEvents.CHUNK_UNLOAD.register((world, chunk) -> {
            if (isEnabled() && chunk != null) {
                ChunkPos pos = chunk.getPos();
                long generation = trackingGeneration;
                MinecraftClient.getInstance().execute(() -> {
                    if (generation == trackingGeneration) chunkUnloaded(world, pos.x, pos.z);
                });
            }
        });
    }

    @Override
    public void onEnable() {
        trackingGeneration++;
        clearState();
    }

    @Override
    public void onDisable() {
        trackingGeneration++;
        clearState();
    }

    @Override
    public void onTick() {
        MinecraftClient client = MinecraftClient.getInstance();
        ClientWorld world = client.world;
        switchWorld(world);
        if (world == null || client.player == null) {
            renderSnapshot = RenderSnapshot.EMPTY;
            return;
        }

        long now = nowMillis();
        Vec3d camera = client.gameRenderer.getCamera().getCameraPos();
        int scanRange = (int) ObservationLimits.clampOrDefault(range.get(), 8, 48, 32);
        if (lastScanOrigin != null && (lastScanOrigin.squaredDistanceTo(camera) > 16.0 * 16.0
                || lastScanRange != scanRange)) {
            pendingSections.clear();
            nextScanAt = Long.MIN_VALUE;
        }
        if (pendingSections.isEmpty() && now >= nextScanAt) {
            scheduleScan(world, camera, scanRange, now);
        }
        scanSomeBlocks(world, camera, scanRange);
        rememberLookedAtAmethyst(client, world, camera);
        updateVisibleMarkers(client, world, camera, scanRange, now);
    }

    @Override
    public void onWorldRender(WorldRenderContext context) {
        RenderSnapshot snapshot = renderSnapshot;
        VertexConsumerProvider consumers = context.consumers();
        if (snapshot.markers().isEmpty() || consumers == null) {
            return;
        }
        var camera = context.worldState().cameraRenderState;
        Vec3d cameraPos = camera.pos;
        MatrixStack matrices = context.matrices();
        TextRenderer font = MinecraftClient.getInstance().textRenderer;

        matrices.push();
        for (Marker marker : snapshot.markers()) {
            Vec3d position = marker.position();
            matrices.push();
            // Subtract in double precision before MatrixStack converts to floats.
            matrices.translate(position.x - cameraPos.x, position.y - cameraPos.y, position.z - cameraPos.z);
            matrices.multiply(camera.orientation);
            float scale = snapshot.scale();
            matrices.scale(scale, -scale, scale);
            Matrix4f matrix = matrices.peek().getPositionMatrix();
            // NORMAL is depth-tested: the indicator does not render through walls.
            font.draw(marker.text(), -font.getWidth(marker.text()) / 2f, 0, marker.argb(), true,
                    matrix, consumers, TextRenderer.TextLayerType.NORMAL, 0, 0xF000F0);
            matrices.pop();
        }
        matrices.pop();
    }

    private void chunkLoaded(ClientWorld world, int x, int z) {
        MinecraftClient client = MinecraftClient.getInstance();
        if (!isEnabled() || client.world != world) {
            return;
        }
        switchWorld(world);
        rememberChunk(x, z, nowMillis());
        nextScanAt = Long.MIN_VALUE;
    }

    private void chunkUnloaded(ClientWorld world, int x, int z) {
        if (!isEnabled() || currentWorld != world) {
            return;
        }
        chunkLoadedSince.remove(ActivityHistory.chunkKey(x, z));
        growthCandidates.values().removeIf(pos -> (pos.getX() >> 4) == x && (pos.getZ() >> 4) == z);
        surfaceCandidates.values().removeIf(pos -> (pos.getX() >> 4) == x && (pos.getZ() >> 4) == z);
        renderSnapshot = RenderSnapshot.EMPTY;
    }

    private void rememberChunk(int x, int z, long now) {
        chunkLoadedSince.putIfAbsent(ActivityHistory.chunkKey(x, z), now);
        while (chunkLoadedSince.size() > MAX_CHUNK_TIMES) {
            Iterator<Long> iterator = chunkLoadedSince.keySet().iterator();
            iterator.next();
            iterator.remove();
        }
    }

    /** Find promising loaded sections; checking a section's palette avoids scanning empty stone. */
    private void scheduleScan(ClientWorld world, Vec3d camera, int scanRange, long now) {
        lastScanOrigin = camera;
        lastScanRange = scanRange;
        nextScanAt = now + RESCAN_INTERVAL_MS;
        int minX = blockFloor(camera.x - scanRange) >> 4;
        int maxX = blockFloor(camera.x + scanRange) >> 4;
        int minZ = blockFloor(camera.z - scanRange) >> 4;
        int maxZ = blockFloor(camera.z + scanRange) >> 4;
        int minY = Math.max(world.getBottomSectionCoord(), blockFloor(camera.y - scanRange) >> 4);
        int maxY = Math.min(world.getTopYInclusive() >> 4, blockFloor(camera.y + scanRange) >> 4);
        List<SectionScan> sections = new ArrayList<>();
        for (int x = minX; x <= maxX; x++) {
            for (int z = minZ; z <= maxZ; z++) {
                // ClientWorld.isChunkLoaded() is unconditional in 1.21.11. Query the actual client
                // cache with create=false so the scanner never tries to obtain an absent chunk.
                Chunk chunk = world.getChunkManager().getChunk(x, z, ChunkStatus.FULL, false);
                if (chunk == null) {
                    continue;
                }
                // If enabled after a chunk was loaded, this starts a lower-bound observation clock.
                rememberChunk(x, z, now);
                ChunkSection[] array = chunk.getSectionArray();
                for (int sectionY = minY; sectionY <= maxY; sectionY++) {
                    int index = world.sectionCoordToIndex(sectionY);
                    if (index >= 0 && index < array.length && array[index] != null
                            && array[index].hasAny(GeodeAge::isAmethystCandidate)) {
                        sections.add(new SectionScan(x, z, index, sectionY));
                    }
                }
            }
        }
        sections.sort(Comparator.comparingDouble(section -> section.distanceSquared(camera)));
        pendingSections.addAll(sections);
    }

    /** Spend a fixed block budget per tick, resuming in the middle of a section if needed. */
    private void scanSomeBlocks(ClientWorld world, Vec3d camera, int scanRange) {
        int budget = BLOCKS_PER_TICK;
        double rangeSquared = (double) scanRange * scanRange;
        while (budget > 0 && !pendingSections.isEmpty()) {
            SectionScan scan = pendingSections.peekFirst();
            Chunk chunk = world.getChunkManager().getChunk(scan.chunkX, scan.chunkZ, ChunkStatus.FULL, false);
            if (chunk == null) {
                pendingSections.removeFirst();
                continue;
            }
            ChunkSection[] sections = chunk.getSectionArray();
            if (scan.index >= sections.length || sections[scan.index] == null) {
                pendingSections.removeFirst();
                continue;
            }
            ChunkSection section = sections[scan.index];
            while (budget > 0 && scan.cursor < 4096) {
                int local = scan.cursor++;
                budget--;
                int x = local & 15;
                int z = (local >> 4) & 15;
                int y = (local >> 8) & 15;
                BlockState state = section.getBlockState(x, y, z);
                if (!isAmethystCandidate(state)) {
                    continue;
                }
                BlockPos pos = new BlockPos(scan.chunkX * 16 + x, scan.sectionY * 16 + y, scan.chunkZ * 16 + z);
                if (distanceSquared(camera, pos) > rangeSquared) {
                    continue;
                }
                if (isGrowthCandidate(state)) {
                    rememberCandidate(growthCandidates, pos, MAX_GROWTH_CANDIDATES, camera);
                } else if (hasOpenNeighbour(world, pos)) {
                    rememberCandidate(surfaceCandidates, pos, MAX_SURFACE_CANDIDATES, camera);
                }
            }
            if (scan.cursor >= 4096) {
                pendingSections.removeFirst();
            }
        }
    }

    /** A looked-at surface can be added immediately instead of waiting for the next scan. */
    private void rememberLookedAtAmethyst(MinecraftClient client, ClientWorld world, Vec3d camera) {
        if (client.crosshairTarget instanceof BlockHitResult hit && hit.getType() == HitResult.Type.BLOCK) {
            BlockPos pos = hit.getBlockPos();
            if (world.getChunkManager().isChunkLoaded(pos.getX() >> 4, pos.getZ() >> 4)
                    && world.getBlockState(pos).isOf(Blocks.AMETHYST_BLOCK)) {
                rememberCandidate(surfaceCandidates, pos.toImmutable(), MAX_SURFACE_CANDIDATES, camera);
            }
        }
    }

    /** Only sample plain amethyst adjoining locally known air or fluid; never fetch an absent chunk. */
    private static boolean hasOpenNeighbour(ClientWorld world, BlockPos pos) {
        for (int[] offset : NEIGHBOUR_OFFSETS) {
            int x = pos.getX() + offset[0];
            int y = pos.getY() + offset[1];
            int z = pos.getZ() + offset[2];
            if (!world.getChunkManager().isChunkLoaded(x >> 4, z >> 4)) {
                continue;
            }
            BlockState neighbour = world.getBlockState(new BlockPos(x, y, z));
            if (neighbour.isAir() || neighbour.isOf(Blocks.WATER) || neighbour.isOf(Blocks.LAVA)) {
                return true;
            }
        }
        return false;
    }

    /** Keep bounded samples closest to the camera instead of letting a large wall evict them. */
    private static void rememberCandidate(Map<Long, BlockPos> candidates, BlockPos pos, int limit, Vec3d camera) {
        long key = pos.asLong();
        if (candidates.containsKey(key)) {
            return;
        }
        if (candidates.size() >= limit) {
            double farthest = distanceSquared(camera, pos);
            Long farthestKey = null;
            for (Map.Entry<Long, BlockPos> entry : candidates.entrySet()) {
                double distance = distanceSquared(camera, entry.getValue());
                if (distance > farthest) {
                    farthest = distance;
                    farthestKey = entry.getKey();
                }
            }
            if (farthestKey == null) {
                return;
            }
            candidates.remove(farthestKey);
        }
        candidates.put(key, pos);
    }

    /** Require the ray to hit each candidate's shape before using it in a visible label. */
    private void updateVisibleMarkers(MinecraftClient client, ClientWorld world, Vec3d camera,
                                      int scanRange, long now) {
        double rangeSquared = (double) scanRange * scanRange;
        List<BlockPos> nearby = new ArrayList<>();
        collectNearby(growthCandidates, true, world, camera, rangeSquared, nearby);
        collectNearby(surfaceCandidates, false, world, camera, rangeSquared, nearby);
        nearby.sort(Comparator.comparingDouble(pos -> distanceSquared(camera, pos)));
        List<MarkerGroup> groups = new ArrayList<>();
        ChunkVisibility.LoadedChunks loadedChunks = world.getChunkManager()::isChunkLoaded;
        for (BlockPos pos : nearby) {
            BlockState state = world.getBlockState(pos);
            VoxelShape shape = state.getOutlineShape(world, pos);
            if (shape.isEmpty()) {
                continue;
            }
            // Buds occupy only part of a block. A ray ending at the block centre can miss even a
            // fully visible bud, so aim inside its actual outline instead.
            Box bounds = shape.getBoundingBox();
            Vec3d center = new Vec3d(pos.getX() + (bounds.minX + bounds.maxX) / 2.0,
                    pos.getY() + (bounds.minY + bounds.maxY) / 2.0,
                    pos.getZ() + (bounds.minZ + bounds.maxZ) / 2.0);
            // Vanilla treats absent client chunks as air; unknown terrain is not clear sight.
            if (!ChunkVisibility.pathIsLoaded(camera.x, camera.z, center.x, center.z, loadedChunks)) {
                continue;
            }
            BlockHitResult hit = world.raycast(new RaycastContext(camera, center,
                    RaycastContext.ShapeType.OUTLINE, RaycastContext.FluidHandling.NONE, client.player));
            if (hit.getType() != HitResult.Type.BLOCK || !hit.getBlockPos().equals(pos)) {
                continue;
            }
            int stage = budStage(state);
            long key = ActivityHistory.chunkKey(pos.getX() >> 4, pos.getZ() >> 4);
            rememberChunk(pos.getX() >> 4, pos.getZ() >> 4, now);
            long elapsed = Math.max(0L, now - chunkLoadedSince.get(key));
            MarkerGroup group = null;
            for (MarkerGroup existing : groups) {
                if (distanceSquared(Vec3d.ofCenter(existing.anchor), pos) <= GROUP_RADIUS_SQUARED) {
                    group = existing;
                    break;
                }
            }
            if (group == null && groups.size() < MAX_LABELS) {
                // Anchor the text just outside the face actually seen by the camera.
                Vec3d surface = hit.getPos();
                Vec3d towardCamera = camera.subtract(surface);
                Vec3d labelPosition = towardCamera.lengthSquared() > 1.0e-12
                        ? surface.add(towardCamera.normalize().multiply(0.05)) : surface;
                group = new MarkerGroup(pos, labelPosition);
                groups.add(group);
            }
            if (group != null) {
                group.maxStage = Math.max(group.maxStage, stage);
                group.maxElapsed = Math.max(group.maxElapsed, elapsed);
            }
        }
        long aging = (long) (ObservationLimits.clampOrDefault(agingAfter.get(), 10, 3600, 120) * 1000.0);
        long veryAged = (long) (ObservationLimits.clampOrDefault(veryAgedAfter.get(), 10, 7200, 600) * 1000.0);
        double alpha = ObservationLimits.clampOrDefault(opacity.get(), 0, 100, 90) / 100.0;
        List<Marker> result = new ArrayList<>(groups.size());
        for (MarkerGroup group : groups) {
            Age age = GeodeAgeHeuristic.classify(group.maxElapsed, group.maxStage, aging, veryAged);
            int colour = OverlayColors.withOpacity(colourFor(age), alpha);
            if ((colour >>> 24) != 0) {
                result.add(new Marker(group.labelPosition, "Geode: " + age.label() + "*", colour));
            }
        }
        float scale = (float) (ObservationLimits.clampOrDefault(labelScale.get(), 0.5, 2, 0.8) * 0.025);
        renderSnapshot = new RenderSnapshot(List.copyOf(result), scale);
    }

    private static void collectNearby(Map<Long, BlockPos> candidates, boolean growth, ClientWorld world,
                                      Vec3d camera, double rangeSquared, List<BlockPos> result) {
        Iterator<BlockPos> iterator = candidates.values().iterator();
        while (iterator.hasNext()) {
            BlockPos pos = iterator.next();
            if (!world.getChunkManager().isChunkLoaded(pos.getX() >> 4, pos.getZ() >> 4)
                    || distanceSquared(camera, pos) > rangeSquared) {
                iterator.remove();
                continue;
            }
            BlockState state = world.getBlockState(pos);
            if (growth ? isGrowthCandidate(state) : state.isOf(Blocks.AMETHYST_BLOCK)) {
                result.add(pos);
            } else {
                iterator.remove();
            }
        }
    }

    private int colourFor(Age age) {
        return switch (age) {
            case FRESH -> OverlayColors.rgbOrDefault(freshColor.get(), 0xA8E8FF);
            case AGING -> OverlayColors.rgbOrDefault(agingColor.get(), 0xC397FF);
            case VERY_AGED -> OverlayColors.rgbOrDefault(oldColor.get(), 0xFF9FDC);
        };
    }

    private static boolean isAmethystCandidate(BlockState state) {
        return state.isOf(Blocks.AMETHYST_BLOCK) || isGrowthCandidate(state);
    }

    private static boolean isGrowthCandidate(BlockState state) {
        return !state.isOf(Blocks.AMETHYST_BLOCK) && budStage(state) >= 0;
    }

    private static int budStage(BlockState state) {
        if (state.isOf(Blocks.BUDDING_AMETHYST) || state.isOf(Blocks.AMETHYST_BLOCK)) return 0;
        if (state.isOf(Blocks.SMALL_AMETHYST_BUD)) return 1;
        if (state.isOf(Blocks.MEDIUM_AMETHYST_BUD)) return 2;
        if (state.isOf(Blocks.LARGE_AMETHYST_BUD)) return 3;
        if (state.isOf(Blocks.AMETHYST_CLUSTER)) return 4;
        return -1;
    }

    private void switchWorld(ClientWorld world) {
        if (currentWorld != world) {
            clearState();
            currentWorld = world;
        }
    }

    private void clearState() {
        currentWorld = null;
        chunkLoadedSince.clear();
        growthCandidates.clear();
        surfaceCandidates.clear();
        pendingSections.clear();
        renderSnapshot = RenderSnapshot.EMPTY;
        lastScanOrigin = null;
        nextScanAt = Long.MIN_VALUE;
    }

    private static int blockFloor(double value) {
        return (int) Math.floor(value);
    }

    private static double distanceSquared(Vec3d from, BlockPos to) {
        double x = from.x - (to.getX() + 0.5);
        double y = from.y - (to.getY() + 0.5);
        double z = from.z - (to.getZ() + 0.5);
        return x * x + y * y + z * z;
    }

    private static long nowMillis() {
        return System.nanoTime() / 1_000_000L;
    }

    private record Marker(Vec3d position, String text, int argb) { }

    private record RenderSnapshot(List<Marker> markers, float scale) {
        private static final RenderSnapshot EMPTY = new RenderSnapshot(List.of(), 0.025f);
    }

    private static final class MarkerGroup {
        private final BlockPos anchor;
        private final Vec3d labelPosition;
        private int maxStage;
        private long maxElapsed;

        private MarkerGroup(BlockPos anchor, Vec3d labelPosition) {
            this.anchor = anchor;
            this.labelPosition = labelPosition;
        }
    }

    private static final class SectionScan {
        private final int chunkX;
        private final int chunkZ;
        private final int index;
        private final int sectionY;
        private int cursor;

        private SectionScan(int chunkX, int chunkZ, int index, int sectionY) {
            this.chunkX = chunkX;
            this.chunkZ = chunkZ;
            this.index = index;
            this.sectionY = sectionY;
        }

        private double distanceSquared(Vec3d camera) {
            double dx = chunkX * 16.0 + 8.0 - camera.x;
            double dy = sectionY * 16.0 + 8.0 - camera.y;
            double dz = chunkZ * 16.0 + 8.0 - camera.z;
            return dx * dx + dy * dy + dz * dz;
        }
    }
}
