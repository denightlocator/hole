package dev.orbit.client.module.impl.render;

import dev.orbit.client.module.Category;
import dev.orbit.client.module.Keybind;
import dev.orbit.client.module.Module;
import dev.orbit.client.module.setting.NumberSetting;
import dev.orbit.client.module.setting.StringSetting;
import dev.orbit.client.observation.ActivityHistory;
import dev.orbit.client.observation.ObservationLimits;
import dev.orbit.client.observation.OverlayColors;
import dev.orbit.client.observation.PlayerMotionTracker;
import dev.orbit.client.render.EspRenderer;
import net.fabricmc.fabric.api.client.rendering.v1.world.WorldRenderContext;
import net.minecraft.block.BlockState;
import net.minecraft.block.Blocks;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.render.RenderLayers;
import net.minecraft.client.render.VertexConsumer;
import net.minecraft.client.render.VertexConsumerProvider;
import net.minecraft.client.util.math.MatrixStack;
import net.minecraft.client.world.ClientWorld;
import net.minecraft.entity.player.PlayerEntity;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.Vec3d;
import org.joml.Matrix4f;
import org.lwjgl.glfw.GLFW;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/** Client-observed activity, shown as fading, depth-tested chunk outlines. */
public final class ChunkActivity extends Module {
    private static final int DEFAULT_RGB = 0x65C7FF;
    private static final double BLOCK_ACTIVITY_RADIUS_SQUARED = 6.0 * 6.0;

    private final StringSetting colour = addSetting(new StringSetting("Color", "#65C7FF"));
    private final NumberSetting opacity = addSetting(new NumberSetting("Opacity", 35, 0, 100, 5, "%"));
    private final NumberSetting fadeSeconds = addSetting(new NumberSetting("Fade Time", 300, 10, 3600, 10, "s"));
    private final NumberSetting lineWidth = addSetting(new NumberSetting("Line Width", 1.5, 1, 4, 0.5, ""));

    // The mixin can cheaply ignore every block update while the module is disabled.
    private static volatile ChunkActivity active;
    private final ActivityHistory history = new ActivityHistory(2048);
    private final PlayerMotionTracker motion = new PlayerMotionTracker();
    // The render callback never touches mutable history, settings, or the client world.
    private volatile RenderSnapshot renderSnapshot = RenderSnapshot.EMPTY;
    private volatile long trackingGeneration;
    private ClientWorld currentWorld;

    public ChunkActivity() {
        super("Chunk Activity", "Fading outlines for locally observed player activity.", Category.RENDER);
        setKeybind(Keybind.keyboard(GLFW.GLFW_KEY_B));
    }

    @Override
    public void onEnable() {
        changeWorld(null);
        trackingGeneration++;
        active = this;
    }

    @Override
    public void onDisable() {
        if (active == this) {
            active = null;
        }
        trackingGeneration++;
        changeWorld(null);
    }

    @Override
    public void onTick() {
        MinecraftClient client = MinecraftClient.getInstance();
        ClientWorld world = client.world;
        changeWorld(world);
        if (world == null || client.player == null) {
            renderSnapshot = RenderSnapshot.EMPTY;
            return;
        }

        long now = nowMillis();
        Set<UUID> present = new HashSet<>();
        for (PlayerEntity player : world.getPlayers()) {
            UUID id = player.getUuid();
            present.add(id);
            motion.observe(id, player.getX(), player.getY(), player.getZ(), now, history);
        }
        motion.retainPlayers(present);
        updateRenderSnapshot(world, now);
    }

    /** Publish immutable draw data on the client tick, including loaded-chunk filtering and fading. */
    private void updateRenderSnapshot(ClientWorld world, long now) {
        int rgb = OverlayColors.rgbOrDefault(colour.get(), DEFAULT_RGB);
        double maxOpacity = ObservationLimits.clampOrDefault(opacity.get(), 0, 100, 35) / 100.0;
        List<Outline> outlines = new ArrayList<>();
        for (ActivityHistory.Mark mark : history.snapshot(now, fadeMillis())) {
            // ClientWorld.isChunkLoaded() always returns true in 1.21.11; use the real cache.
            if (!world.getChunkManager().isChunkLoaded(mark.chunkX(), mark.chunkZ())) {
                continue;
            }
            int argb = OverlayColors.withOpacity(rgb, maxOpacity * mark.intensity());
            if ((argb >>> 24) != 0) {
                outlines.add(new Outline(mark.chunkX(), mark.chunkZ(), mark.y() + 0.04, argb));
            }
        }
        float width = (float) ObservationLimits.clampOrDefault(lineWidth.get(), 1, 4, 1.5);
        renderSnapshot = new RenderSnapshot(List.copyOf(outlines), width);
    }

    /**
     * Called after a block state actually changes in the client world. The callback does not
     * identify the actor: proximity is an approximation, not proof that a player placed/broke it.
     */
    public static void onBlockChanged(ClientWorld world, BlockPos pos, BlockState before, BlockState after) {
        ChunkActivity module = active;
        if (module == null || before == null || after == null || before.getBlock() == after.getBlock()
                || (isAirOrFluid(before) && isAirOrFluid(after))) {
            return;
        }
        MinecraftClient client = MinecraftClient.getInstance();
        long generation = module.trackingGeneration;
        // BlockPos may be mutable, and execute also handles a callback arriving off the client thread.
        BlockPos immutable = pos.toImmutable();
        client.execute(() -> {
            if (active != module || generation != module.trackingGeneration || !module.isEnabled()
                    || client.world != world || client.player == null) {
                return;
            }
            module.changeWorld(world);
            double x = immutable.getX() + 0.5;
            double y = immutable.getY() + 0.5;
            double z = immutable.getZ() + 0.5;
            for (PlayerEntity player : world.getPlayers()) {
                if (player.squaredDistanceTo(x, y, z) <= BLOCK_ACTIVITY_RADIUS_SQUARED) {
                    module.history.mark(immutable.getX() >> 4, immutable.getZ() >> 4,
                            immutable.getY() + 1.05, nowMillis());
                    break;
                }
            }
        });
    }

    @Override
    public void onWorldRender(WorldRenderContext context) {
        RenderSnapshot snapshot = renderSnapshot;
        VertexConsumerProvider consumers = context.consumers();
        if (snapshot.outlines().isEmpty() || consumers == null) {
            return;
        }
        Vec3d cameraPos = context.worldState().cameraRenderState.pos;
        MatrixStack matrices = context.matrices();
        VertexConsumer vertices = consumers.getBuffer(RenderLayers.linesTranslucent());

        matrices.push();
        Matrix4f matrix = matrices.peek().getPositionMatrix();
        for (Outline outline : snapshot.outlines()) {
            // Subtract in double precision before submitting floats to the render buffer.
            double x = (double) outline.chunkX() * 16.0 - cameraPos.x;
            double z = (double) outline.chunkZ() * 16.0 - cameraPos.z;
            double y = outline.y() - cameraPos.y;
            int argb = outline.argb();
            float width = snapshot.lineWidth();
            Vec3d a = new Vec3d(x, y, z);
            Vec3d b = new Vec3d(x + 16, y, z);
            Vec3d c = new Vec3d(x + 16, y, z + 16);
            Vec3d d = new Vec3d(x, y, z + 16);
            EspRenderer.drawLine(vertices, matrix, a, b, argb, argb, width);
            EspRenderer.drawLine(vertices, matrix, b, c, argb, argb, width);
            EspRenderer.drawLine(vertices, matrix, c, d, argb, argb, width);
            EspRenderer.drawLine(vertices, matrix, d, a, argb, argb, width);
        }
        matrices.pop();
    }

    private static boolean isAirOrFluid(BlockState state) {
        return state.isAir() || state.isOf(Blocks.WATER) || state.isOf(Blocks.LAVA);
    }

    private void changeWorld(ClientWorld world) {
        if (currentWorld != world) {
            history.clear();
            motion.clear();
            renderSnapshot = RenderSnapshot.EMPTY;
            currentWorld = world;
        }
    }

    private record Outline(int chunkX, int chunkZ, double y, int argb) { }

    private record RenderSnapshot(List<Outline> outlines, float lineWidth) {
        private static final RenderSnapshot EMPTY = new RenderSnapshot(List.of(), 1.0f);
    }

    private long fadeMillis() {
        return (long) (ObservationLimits.clampOrDefault(fadeSeconds.get(), 10, 3600, 300) * 1000.0);
    }

    private static long nowMillis() {
        return System.nanoTime() / 1_000_000L;
    }
}
