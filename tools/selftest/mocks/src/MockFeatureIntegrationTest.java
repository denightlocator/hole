import dev.orbit.client.module.Module;
import dev.orbit.client.module.impl.render.ChunkActivity;
import dev.orbit.client.module.impl.render.GeodeAge;
import dev.orbit.client.module.setting.NumberSetting;
import dev.orbit.client.module.setting.StringSetting;
import dev.orbit.client.observation.ActivityHistory;
import dev.orbit.client.render.EspRenderer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientChunkEvents;
import net.fabricmc.fabric.api.client.rendering.v1.world.WorldRenderContext;
import net.minecraft.block.BlockState;
import net.minecraft.block.Blocks;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.world.ClientWorld;
import net.minecraft.entity.player.PlayerEntity;
import net.minecraft.util.hit.BlockHitResult;
import net.minecraft.util.hit.HitResult;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.Vec3d;
import net.minecraft.world.chunk.WorldChunk;

import java.lang.reflect.Field;
import java.util.Map;
import java.util.UUID;

/**
 * Checks module control flow against tiny handwritten stubs, NOT Minecraft or Fabric.
 * Mixin weaving, real rendering, event semantics, and config persistence require separate tests.
 */
public class MockFeatureIntegrationTest {
    private static final MinecraftClient CLIENT = MinecraftClient.getInstance();
    private static final WorldRenderContext CONTEXT = new WorldRenderContext();

    public static void main(String[] args) throws ReflectiveOperationException {
        chunkTests();
        geodeTests();
        System.out.println("MockFeatureIntegrationTest: all checks passed");
    }

    private static void chunkTests() {
        ClientWorld world = new ClientWorld();
        world.load(0, 0);
        world.load(1, 0);
        world.load(3, 0);
        CLIENT.world = world;
        PlayerEntity me = new PlayerEntity(UUID.randomUUID(), 1, 64, 1);
        CLIENT.player = me;
        world.players.add(me);

        ChunkActivity activity = new ChunkActivity();
        activity.setEnabled(true);
        activity.onTick();
        check(renderActivity(activity, world) == 0, "stationary/spawning player must not mark");

        me.x = 1.2;
        activity.onTick();
        check(renderActivity(activity, world) == 4, "movement gives four outline edges");
        int alpha = EspRenderer.colors.get(0) >>> 24;
        check(alpha >= 85 && alpha <= 90, "default opacity applied");

        stringSetting(activity, "Color").set("#FF0000");
        numberSetting(activity, "Opacity").set(50);
        numberSetting(activity, "Line Width").set(2.5);
        activity.onTick();
        check(renderActivity(activity, world) == 4, "configured outline still drawn");
        check((EspRenderer.colors.get(0) & 0xFFFFFF) == 0xFF0000, "configured color applied");
        check((EspRenderer.colors.get(0) >>> 24) >= 126 && (EspRenderer.colors.get(0) >>> 24) <= 128,
                "configured opacity applied");
        check(EspRenderer.widths.get(0) == 2.5f, "configured line width applied");

        PlayerEntity other = new PlayerEntity(UUID.randomUUID(), 16.5, 64, 1);
        world.players.add(other);
        ChunkActivity.onBlockChanged(world, new BlockPos(16, 64, 1),
                new BlockState(Blocks.AIR), new BlockState(Blocks.STONE));
        activity.onTick();
        check(renderActivity(activity, world) == 8, "nearby block change marks second chunk");
        ChunkActivity.onBlockChanged(world, new BlockPos(48, 64, 1),
                new BlockState(Blocks.AIR), new BlockState(Blocks.STONE));
        activity.onTick();
        check(renderActivity(activity, world) == 8, "distant change has no nearby player");

        world.unload(1, 0);
        activity.onTick();
        check(renderActivity(activity, world) == 4, "unloaded chunk is not drawn");
        world.load(1, 0);
        activity.onTick();
        check(renderActivity(activity, world) == 8, "unexpired activity survives an unload/reload");

        activity.setEnabled(false);
        check(renderActivity(activity, world) == 0, "disable clears draw snapshot");
        ChunkActivity.onBlockChanged(world, new BlockPos(16, 64, 1),
                new BlockState(Blocks.AIR), new BlockState(Blocks.STONE));
        activity.setEnabled(true);
        activity.onTick();
        check(renderActivity(activity, world) == 0, "disabled events and prior history are cleared");
        ChunkActivity.onBlockChanged(world, new BlockPos(16, 64, 1),
                new BlockState(Blocks.WATER), new BlockState(Blocks.AIR));
        ChunkActivity.onBlockChanged(world, new BlockPos(16, 64, 1),
                new BlockState(Blocks.STONE), new BlockState(Blocks.STONE));
        activity.onTick();
        check(renderActivity(activity, world) == 0, "fluid-only and same-block changes ignored");
        ChunkActivity.onBlockChanged(world, new BlockPos(16, 64, 1),
                new BlockState(Blocks.WATER), new BlockState(Blocks.STONE));
        activity.onTick();
        check(renderActivity(activity, world) == 4, "solid placement into fluid is observed");
        ChunkActivity.onBlockChanged(world, new BlockPos(16, 64, 1),
                new BlockState(Blocks.STONE), new BlockState(Blocks.AIR));
        activity.onTick();
        check(renderActivity(activity, world) == 4, "block removal is observed");

        activity.setEnabled(false);
        activity.setEnabled(true);
        CLIENT.defer = true;
        ChunkActivity.onBlockChanged(world, new BlockPos(16, 64, 1),
                new BlockState(Blocks.AIR), new BlockState(Blocks.STONE));
        activity.setEnabled(false);
        activity.setEnabled(true);
        CLIENT.defer = false;
        CLIENT.flush();
        activity.onTick();
        check(renderActivity(activity, world) == 0, "queued event from earlier toggle is discarded");

        ClientWorld another = new ClientWorld();
        another.load(0, 0);
        another.players.add(me);
        CLIENT.world = another;
        activity.onTick();
        check(renderActivity(activity, another) == 0, "world switch clears activity");
        CLIENT.world = null;
        activity.onTick();
        check(renderActivity(activity, another) == 0, "disconnect clears activity");
        activity.setEnabled(false);
    }

    private static int renderActivity(ChunkActivity activity, ClientWorld world) {
        EspRenderer.colors.clear();
        EspRenderer.widths.clear();
        world.forbidReads = true;
        try {
            activity.onWorldRender(CONTEXT);
        } finally {
            world.forbidReads = false;
        }
        return EspRenderer.colors.size();
    }

    private static void geodeTests() throws ReflectiveOperationException {
        ClientWorld world = new ClientWorld();
        WorldChunk chunk = world.load(0, 0);
        setWorldAndCamera(world, new Vec3d(0.5, 64.5, 0.5));
        world.set(2, 64, 2, Blocks.BUDDING_AMETHYST);
        world.set(1, 64, 1, Blocks.STONE);
        GeodeAge age = new GeodeAge();
        age.setEnabled(true);
        ClientChunkEvents.CHUNK_LOAD.fire(world, chunk);
        age.onTick();
        check(renderAge(age, world).isEmpty(), "occluded budding amethyst is not labelled");

        world.set(1, 64, 1, Blocks.AIR);
        age.onTick();
        check(renderAge(age, world).contains("Fresh"), "exposed amethyst is fresh initially");
        Vec3d anchor = CONTEXT.matrices().translations.get(0).add(CONTEXT.worldState().cameraRenderState.pos);
        check(anchor.x < 2 && anchor.z < 2 && anchor.x > 1.9 && anchor.z > 1.9,
                "label is anchored just in front of the visible surface, not behind it");
        setObservedAge(age, 0, 0, 121_000);
        age.onTick();
        check(renderAge(age, world).contains("Aging"), "observed load time advances the age label");
        setObservedAge(age, 0, 0, 601_000);
        age.onTick();
        check(renderAge(age, world).contains("Very aged"), "longer load time advances to very aged");
        setObservedAge(age, 0, 0, 0);

        stringSetting(age, "Fresh Color").set("#012345");
        numberSetting(age, "Opacity").set(50);
        numberSetting(age, "Label Scale").set(1.0);
        age.onTick();
        check(renderAge(age, world).contains("Fresh"), "configured label still drawn");
        check(CLIENT.textRenderer.colors.get(0) == 0x80012345, "label color and opacity applied");
        check(CONTEXT.matrices().scales.get(0) == 0.025f, "label scale applied");

        world.forceRayMiss = true;
        age.onTick();
        check(renderAge(age, world).isEmpty(), "a ray that misses the block shape is not visible");
        world.forceRayMiss = false;
        world.set(2, 64, 2, Blocks.SMALL_AMETHYST_BUD);
        age.onTick();
        check(renderAge(age, world).contains("Fresh"),
                "ray reaches a visible bud smaller than the block's centre height");
        world.set(2, 64, 2, Blocks.MEDIUM_AMETHYST_BUD);
        age.onTick();
        check(renderAge(age, world).contains("Aging"), "visible medium bud changes the classification");
        world.set(2, 64, 2, Blocks.AMETHYST_CLUSTER);
        age.onTick();
        check(renderAge(age, world).contains("Very aged"), "visible cluster changes the classification");
        world.set(2, 64, 2, Blocks.BUDDING_AMETHYST);
        setObservedAge(age, 0, 0, 601_000);
        age.onTick();
        check(renderAge(age, world).contains("Very aged"), "old observation clock used before unload");

        ClientChunkEvents.CHUNK_UNLOAD.fire(world, chunk);
        check(renderAge(age, world).isEmpty(), "unload clears published labels immediately");
        world.unload(0, 0);
        age.onTick();
        check(renderAge(age, world).isEmpty(), "unloaded chunk is not scanned or labelled");
        WorldChunk reloaded = world.load(0, 0);
        world.set(2, 64, 2, Blocks.BUDDING_AMETHYST);
        ClientChunkEvents.CHUNK_LOAD.fire(world, reloaded);
        age.onTick();
        check(renderAge(age, world).contains("Fresh"), "reload starts a new observation clock");
        age.setEnabled(false);

        ClientWorld plain = new ClientWorld();
        WorldChunk plainChunk = plain.load(0, 0);
        setWorldAndCamera(plain, new Vec3d(0.5, 64.5, 0.5));
        plain.set(2, 64, 2, Blocks.AMETHYST_BLOCK);
        plain.set(1, 64, 1, Blocks.STONE);
        age.setEnabled(true);
        ClientChunkEvents.CHUNK_LOAD.fire(plain, plainChunk);
        age.onTick();
        check(renderAge(age, plain).isEmpty(), "occluded plain amethyst is not labelled");
        plain.set(1, 64, 1, Blocks.AIR);
        age.onTick();
        check(renderAge(age, plain).contains("Fresh"), "exposed plain amethyst is found automatically");
        age.setEnabled(false);

        ClientWorld lookedAt = new ClientWorld();
        WorldChunk lookedAtChunk = lookedAt.load(0, 0);
        setWorldAndCamera(lookedAt, new Vec3d(0.5, 64.5, 0.5));
        age.setEnabled(true);
        ClientChunkEvents.CHUNK_LOAD.fire(lookedAt, lookedAtChunk);
        age.onTick(); // no amethyst in this scan
        lookedAt.set(2, 64, 2, Blocks.AMETHYST_BLOCK);
        CLIENT.crosshairTarget = new BlockHitResult(HitResult.Type.BLOCK, new BlockPos(2, 64, 2));
        age.onTick();
        check(renderAge(age, lookedAt).contains("Fresh"), "targeting a new surface skips the rescan wait");
        CLIENT.crosshairTarget = null;
        age.setEnabled(false);

        ClientWorld dense = new ClientWorld();
        WorldChunk denseChunk = dense.load(0, 0);
        setWorldAndCamera(dense, new Vec3d(0.5, 64.5, 0.5));
        for (int x = 2; x < 16; x++) {
            for (int z = 2; z < 16; z++) dense.set(x, 64, z, Blocks.AMETHYST_BLOCK);
        }
        dense.set(10, 64, 1, Blocks.BUDDING_AMETHYST);
        age.setEnabled(true);
        ClientChunkEvents.CHUNK_LOAD.fire(dense, denseChunk);
        age.onTick();
        Field surfacesField = GeodeAge.class.getDeclaredField("surfaceCandidates");
        surfacesField.setAccessible(true);
        Map<?, ?> surfaces = (Map<?, ?>) surfacesField.get(age);
        Field growthField = GeodeAge.class.getDeclaredField("growthCandidates");
        growthField.setAccessible(true);
        Map<?, ?> growth = (Map<?, ?>) growthField.get(age);
        check(surfaces.size() == 64 && growth.size() == 1,
                "surface samples are capped separately and do not evict growth candidates");
        check(surfaces.containsKey(new BlockPos(2, 64, 2).asLong())
                        && !surfaces.containsKey(new BlockPos(15, 64, 15).asLong()),
                "bounded surface sampling keeps the nearest candidates");
        age.setEnabled(false);

        ClientWorld grouped = new ClientWorld();
        WorldChunk groupedChunk = grouped.load(0, 0);
        setWorldAndCamera(grouped, new Vec3d(0.5, 64.5, 0.5));
        grouped.set(2, 64, 4, Blocks.BUDDING_AMETHYST);
        grouped.set(4, 64, 2, Blocks.AMETHYST_CLUSTER);
        age.setEnabled(true);
        ClientChunkEvents.CHUNK_LOAD.fire(grouped, groupedChunk);
        age.onTick();
        check(renderAge(age, grouped).contains("Very aged") && CLIENT.textRenderer.labels.size() == 1,
                "nearby exposed buds form one group using the largest visible stage");
        age.setEnabled(false);

        ClientWorld gap = new ClientWorld();
        WorldChunk startChunk = gap.load(0, 0);
        WorldChunk targetChunk = gap.load(2, 0);
        setWorldAndCamera(gap, new Vec3d(0.5, 64.5, 0.5));
        gap.set(32, 64, 0, Blocks.BUDDING_AMETHYST);
        age.setEnabled(true);
        ClientChunkEvents.CHUNK_LOAD.fire(gap, startChunk);
        ClientChunkEvents.CHUNK_LOAD.fire(gap, targetChunk);
        age.onTick();
        check(renderAge(age, gap).isEmpty() && gap.raycastCalls == 0,
                "unknown chunk in sightline is rejected before vanilla-like raycast");
        WorldChunk bridge = gap.load(1, 0);
        ClientChunkEvents.CHUNK_LOAD.fire(gap, bridge);
        age.onTick();
        check(renderAge(age, gap).contains("Fresh"), "loaded sightline can show the label");
        age.setEnabled(false);

        // World change and queued lifecycle events must not leak data into the next session.
        ClientWorld another = new ClientWorld();
        WorldChunk anotherChunk = another.load(0, 0);
        setWorldAndCamera(another, new Vec3d(0.5, 64.5, 0.5));
        age.setEnabled(true);
        CLIENT.defer = true;
        ClientChunkEvents.CHUNK_LOAD.fire(another, anotherChunk);
        age.setEnabled(false);
        age.setEnabled(true);
        CLIENT.defer = false;
        CLIENT.flush();
        Field timestamps = GeodeAge.class.getDeclaredField("chunkLoadedSince");
        timestamps.setAccessible(true);
        check(((Map<?, ?>) timestamps.get(age)).isEmpty(), "old queued chunk-load event is discarded");
        numberSetting(age, "Range").set(1_000_000);
        age.onTick();
        Field scannedRange = GeodeAge.class.getDeclaredField("lastScanRange");
        scannedRange.setAccessible(true);
        check(scannedRange.getInt(age) == 48, "invalid large range cannot schedule an unbounded scan");
        numberSetting(age, "Range").set(Double.NaN);
        age.onTick();
        check(scannedRange.getInt(age) == 32, "non-finite range falls back to the default");
        numberSetting(age, "Range").set(32);
        check(renderAge(age, another).isEmpty(), "world switch has no prior geode labels");
        age.setEnabled(false);

        // The highest buildable section is inclusive in 1.21.11.
        ClientWorld high = new ClientWorld();
        WorldChunk highChunk = high.load(0, 0);
        setWorldAndCamera(high, new Vec3d(0.5, 319.5, 0.5));
        high.set(2, 319, 2, Blocks.BUDDING_AMETHYST);
        age.setEnabled(true);
        ClientChunkEvents.CHUNK_LOAD.fire(high, highChunk);
        age.onTick();
        check(renderAge(age, high).isEmpty(), "scan stops before the second half of the section");
        age.onTick();
        check(renderAge(age, high).contains("Fresh"), "highest section is scanned within the tick budget");
        age.setEnabled(false);
        check(renderAge(age, high).isEmpty(), "geode snapshot clears on disable");
    }

    private static void setWorldAndCamera(ClientWorld world, Vec3d camera) {
        CLIENT.world = world;
        PlayerEntity player = new PlayerEntity(UUID.randomUUID(), camera.x, camera.y, camera.z);
        world.players.add(player);
        CLIENT.player = player;
        CLIENT.crosshairTarget = null;
        CLIENT.gameRenderer.getCamera().pos = camera;
        CONTEXT.worldState().cameraRenderState.pos = camera;
    }

    private static String renderAge(GeodeAge age, ClientWorld world) {
        CLIENT.textRenderer.labels.clear();
        CLIENT.textRenderer.colors.clear();
        CONTEXT.matrices().translations.clear();
        CONTEXT.matrices().scales.clear();
        world.forbidReads = true;
        try {
            age.onWorldRender(CONTEXT);
        } finally {
            world.forbidReads = false;
        }
        return String.join(", ", CLIENT.textRenderer.labels);
    }

    @SuppressWarnings("unchecked")
    private static void setObservedAge(GeodeAge age, int chunkX, int chunkZ, long elapsedMillis)
            throws ReflectiveOperationException {
        Field field = GeodeAge.class.getDeclaredField("chunkLoadedSince");
        field.setAccessible(true);
        Map<Long, Long> times = (Map<Long, Long>) field.get(age);
        times.put(ActivityHistory.chunkKey(chunkX, chunkZ), System.nanoTime() / 1_000_000L - elapsedMillis);
    }

    private static NumberSetting numberSetting(Module module, String name) {
        for (Object setting : module.settings) {
            if (setting instanceof NumberSetting number && number.name.equals(name)) return number;
        }
        throw new AssertionError("missing number setting " + name);
    }

    private static StringSetting stringSetting(Module module, String name) {
        for (Object setting : module.settings) {
            if (setting instanceof StringSetting string && string.name.equals(name)) return string;
        }
        throw new AssertionError("missing string setting " + name);
    }

    private static void check(boolean ok, String message) {
        if (!ok) throw new AssertionError(message);
    }
}
