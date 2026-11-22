import dev.orbitobserver.client.ObserverClient;
import dev.orbitobserver.client.config.ObservationConfig;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.keybinding.v1.KeyBindingHelper;
import net.fabricmc.fabric.api.client.rendering.v1.world.WorldRenderContext;
import net.fabricmc.fabric.api.client.rendering.v1.world.WorldRenderEvents;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.option.KeyBinding;
import net.minecraft.client.render.VertexConsumer;
import net.minecraft.client.world.ClientWorld;
import net.minecraft.block.Blocks;
import net.minecraft.entity.player.PlayerEntity;
import net.minecraft.util.hit.BlockHitResult;
import net.minecraft.util.hit.HitResult;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.Vec3d;
import org.lwjgl.glfw.GLFW;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.UUID;

/** Companion adapter tests with handwritten doubles; not a real Fabric runtime test. */
public final class CompanionSelfTest {
    public static void main(String[] args) throws Exception {
        Path temp = Files.createTempDirectory("orbit-observer-tests");
        try {
            testConfig(temp.resolve("config"));
            testClient(temp.resolve("client"));
            System.out.println("CompanionSelfTest: all checks passed");
        } finally {
            try (var paths = Files.walk(temp)) {
                paths.sorted(Comparator.reverseOrder()).forEach(path -> {
                    try { Files.deleteIfExists(path); } catch (IOException failure) { throw new RuntimeException(failure); }
                });
            }
        }
    }

    private static void testConfig(Path directory) throws Exception {
        Path file = directory.resolve("orbit-observer.properties");
        ObservationConfig config = ObservationConfig.loadOrCreate(file);
        check(Files.isRegularFile(file), "default config created");
        check(!config.bool("chunk.enabled") && config.number("chunk.fadeSeconds") == 300, "defaults");
        Files.writeString(file, "chunk.enabled=true\nchunk.fadeSeconds=NaN\n"
                + "chunk.opacity=broken\ncustom.value=keep-me\n", StandardCharsets.UTF_8);
        config = ObservationConfig.loadOrCreate(file);
        check(config.bool("chunk.enabled"), "existing file is read");
        check(config.number("chunk.fadeSeconds") == 300 && config.number("chunk.opacity") == 35,
                "invalid numeric values use defaults");
        config.saveEnabled(false, true);
        String saved = Files.readString(file);
        check(saved.contains("custom.value=keep-me") && saved.contains("geode.enabled=true")
                && saved.contains("chunk.enabled=false"), "toggle save preserves external keys");
        String malformed = "chunk.color=\\uZZZZ\n";
        Files.writeString(file, malformed);
        try {
            config.saveEnabled(true, true);
            throw new AssertionError("malformed settings should not be overwritten");
        } catch (IOException expected) {
            check(Files.readString(file).equals(malformed), "malformed settings preserved");
        }
    }

    private static void testClient(Path configDir) throws Exception {
        Files.createDirectories(configDir);
        Files.writeString(configDir.resolve("orbit-observer.properties"),
                "chunk.color=#FF3300\nchunk.opacity=25\nchunk.lineWidth=9\n"
                        + "geode.freshColor=#123456\ngeode.opacity=50\n");
        FabricLoader.getInstance().configDir = configDir;
        new ObserverClient().onInitializeClient();
        check(WorldRenderEvents.AFTER_ENTITIES.callbacks.size() == 1, "world render hook registered");
        check(ClientTickEvents.END_CLIENT_TICK.callbacks.size() == 1, "tick hook registered");
        KeyBinding chunk = KeyBindingHelper.registered.get("key.orbit_observer.chunk_activity");
        KeyBinding geode = KeyBindingHelper.registered.get("key.orbit_observer.geode_age");
        check(chunk != null && chunk.defaultCode == GLFW.GLFW_KEY_B, "chunk default key");
        check(geode != null && geode.defaultCode == GLFW.GLFW_KEY_J, "geode default key");
        Path file = configDir.resolve("orbit-observer.properties");
        MinecraftClient client = MinecraftClient.getInstance();
        client.currentScreen = new Object();
        chunk.press();
        ClientTickEvents.END_CLIENT_TICK.fire(client);
        check(!ObservationConfig.loadOrCreate(file).bool("chunk.enabled"), "key ignored with screen open");
        client.currentScreen = null;
        chunk.press();
        ClientTickEvents.END_CLIENT_TICK.fire(client);
        check(ObservationConfig.loadOrCreate(file).bool("chunk.enabled"), "chunk toggle persists");
        geode.press();
        ClientTickEvents.END_CLIENT_TICK.fire(client);
        check(ObservationConfig.loadOrCreate(file).bool("geode.enabled"), "geode toggle persists");

        // Verify the adapter emits camera-relative line vertices with double precision at far coordinates.
        ClientWorld world = new ClientWorld();
        world.load(1_000_000, 0);
        world.load(1_000_001, 0);
        PlayerEntity player = new PlayerEntity(UUID.randomUUID(), 16_000_000.5, 64, 0.5);
        world.players.add(player);
        client.world = world;
        client.player = player;
        client.gameRenderer.getCamera().pos = new Vec3d(16_000_000.25, 64.5, 0.5);
        world.set(16_000_002, 64, 0, Blocks.AMETHYST_BLOCK);
        client.crosshairTarget = new BlockHitResult(HitResult.Type.BLOCK, new BlockPos(16_000_002, 64, 0));
        ClientTickEvents.END_CLIENT_TICK.fire(client);
        player.x = 16_000_016.5;
        ClientTickEvents.END_CLIENT_TICK.fire(client);
        WorldRenderContext context = new WorldRenderContext();
        context.worldState().cameraRenderState.pos = new Vec3d(16_000_000.25, 64.5, 0.5);
        VertexConsumer.colors.clear();
        VertexConsumer.widths.clear();
        VertexConsumer.positions.clear();
        client.textRenderer.labels.clear();
        client.textRenderer.colors.clear();
        WorldRenderEvents.AFTER_ENTITIES.fire(context);
        check(!VertexConsumer.positions.isEmpty(), "activity outlines reach line renderer");
        check(VertexConsumer.positions.stream().anyMatch(pos -> Math.abs(pos.x + 0.25) < 0.001),
                "far-world line vertices preserve sub-block precision");
        check(VertexConsumer.widths.stream().allMatch(width -> width == 4.0f), "line width clamped and applied");
        check(VertexConsumer.colors.stream().allMatch(color -> (color & 0xffffff) == 0xff3300),
                "configured chunk color applied");
        check(client.textRenderer.labels.stream().anyMatch(label -> label.contains("Fresh")),
                "geode label reaches renderer");
        check(client.textRenderer.colors.stream().anyMatch(color -> (color & 0xffffff) == 0x123456
                && (color >>> 24) == 128), "geode color and opacity applied");
    }

    private static void check(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }
}
