package dev.orbit.client.module.impl.render;

import dev.orbit.client.gui.Theme;
import dev.orbit.client.module.Category;
import dev.orbit.client.module.Module;
import dev.orbit.client.module.setting.BoolSetting;
import dev.orbit.client.module.setting.ColorSetting;
import dev.orbit.client.module.setting.ModeSetting;
import dev.orbit.client.module.setting.NumberSetting;
import dev.orbit.client.render.EspRenderer;
import net.fabricmc.fabric.api.client.rendering.v1.world.WorldRenderContext;
import net.minecraft.block.entity.BlockEntity;
import net.minecraft.block.entity.BlockEntityType;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.network.ClientPlayerEntity;
import net.minecraft.client.render.RenderLayer;
import net.minecraft.client.render.VertexConsumer;
import net.minecraft.client.render.VertexConsumerProvider;
import net.minecraft.client.util.math.MatrixStack;
import net.minecraft.client.world.ClientWorld;
import net.minecraft.util.hit.HitResult;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.Box;
import net.minecraft.util.math.Vec3d;
import net.minecraft.world.chunk.WorldChunk;
import org.joml.Matrix4f;

import java.util.ArrayList;
import java.util.List;

/**
 * Storage ESP - boxes around loaded chests, barrels and shulker boxes, drawn through walls,
 * colour coded per type with custom colours, vertical box gradients and tracer lines.
 *
 * <p>Line origin can be the feet, the eyes, or the <b>cursor</b>: the point the crosshair is
 * actually pointing at (block or entity hit), falling back to a point along the look ray when the
 * crosshair is pointing at nothing.
 */
public class StorageEsp extends Module {
    private final BoolSetting chests = addSetting(new BoolSetting("Chests", true));
    private final BoolSetting barrels = addSetting(new BoolSetting("Barrels", true));
    private final BoolSetting shulkers = addSetting(new BoolSetting("Shulker Boxes", true));

    private final ColorSetting chestColor = addSetting(new ColorSetting("Chest Color", 0xFFFFA53B));
    private final ColorSetting barrelColor = addSetting(new ColorSetting("Barrel Color", 0xFFB5783C));
    private final ColorSetting shulkerColor = addSetting(new ColorSetting("Shulker Color", 0xFFC774E8));

    private final BoolSetting outline = addSetting(new BoolSetting("Outline", true));
    private final BoolSetting boxGradient = addSetting(new BoolSetting("Gradient Boxes", true));

    private final BoolSetting tracers = addSetting(new BoolSetting("Lines", false));
    private final ModeSetting lineOrigin = addSetting(new ModeSetting("Line Origin", "Cursor", "Feet", "Eyes", "Cursor"));
    private final NumberSetting cursorReach = addSetting(new NumberSetting("Cursor Distance", 8, 2, 48, 1, "m"));
    private final BoolSetting lineGradient = addSetting(new BoolSetting("Gradient Lines", true));

    private final NumberSetting range = addSetting(new NumberSetting("Range", 48, 8, 128, 4, "m"));
    private final NumberSetting lineWidth = addSetting(new NumberSetting("Line Width", 1.5, 1, 4, 0.5, ""));

    private final List<Target> targets = new ArrayList<>();

    public StorageEsp() {
        super("Storage ESP", "Highlights loaded chests, barrels and shulker boxes through walls.", Category.RENDER);
    }

    // ── scanning ────────────────────────────────────────────────────────
    @Override
    public void onTick() {
        targets.clear();

        MinecraftClient client = MinecraftClient.getInstance();
        ClientWorld world = client.world;
        ClientPlayerEntity player = client.player;
        if (world == null || player == null) {
            return;
        }

        double maxDistance = range.get();
        double maxSquared = maxDistance * maxDistance;
        Vec3d eye = player.getEyePos();

        int chunkRadius = (int) Math.ceil(maxDistance / 16.0) + 1;
        int centerChunkX = player.getBlockPos().getX() >> 4;
        int centerChunkZ = player.getBlockPos().getZ() >> 4;

        for (int chunkX = centerChunkX - chunkRadius; chunkX <= centerChunkX + chunkRadius; chunkX++) {
            for (int chunkZ = centerChunkZ - chunkRadius; chunkZ <= centerChunkZ + chunkRadius; chunkZ++) {
                WorldChunk chunk = world.getChunk(chunkX, chunkZ);
                if (chunk == null || chunk.isEmpty()) {
                    continue;
                }
                for (BlockPos pos : chunk.getBlockEntityPositions()) {
                    BlockEntity blockEntity = chunk.getBlockEntity(pos);
                    if (blockEntity == null) {
                        continue;
                    }
                    ColorSetting color = colorOf(blockEntity.getType());
                    if (color == null) {
                        continue;
                    }
                    Vec3d center = Vec3d.ofCenter(pos);
                    if (eye.squaredDistanceTo(center) > maxSquared) {
                        continue;
                    }
                    targets.add(new Target(new Box(pos), color.getRgb(), color.getRgbDark()));
                }
            }
        }
    }

    /** @return the colour setting for a block entity type, or {@code null} when not tracked. */
    private ColorSetting colorOf(BlockEntityType<?> type) {
        if (type == BlockEntityType.CHEST || type == BlockEntityType.TRAPPED_CHEST) {
            return chests.get() ? chestColor : null;
        }
        if (type == BlockEntityType.BARREL) {
            return barrels.get() ? barrelColor : null;
        }
        if (type == BlockEntityType.SHULKER_BOX) {
            return shulkers.get() ? shulkerColor : null;
        }
        return null;
    }

    // ── rendering ───────────────────────────────────────────────────────
    @Override
    public void onWorldRender(WorldRenderContext context) {
        if (targets.isEmpty()) {
            return;
        }
        RenderLayer layer = EspRenderer.linesLayer();
        if (layer == null) {
            return;
        }

        MinecraftClient client = MinecraftClient.getInstance();
        VertexConsumerProvider consumers = context.consumers();
        MatrixStack matrices = context.matrices();

        Vec3d cameraPos = client.gameRenderer.getCamera().getCameraPos();
        Vec3d origin = resolveOrigin(client, cameraPos);

        matrices.push();
        matrices.translate(-cameraPos.x, -cameraPos.y, -cameraPos.z);
        Matrix4f matrix = matrices.peek().getPositionMatrix();

        VertexConsumer vertices = consumers.getBuffer(layer);
        float width = (float) lineWidth.get();
        int originColor = lineGradient.get() ? Theme.accent() : 0xFFFFFFFF;

        for (Target target : targets) {
            if (outline.get()) {
                if (boxGradient.get()) {
                    EspRenderer.drawBox(vertices, matrix, target.box(), target.colorDark(), target.color(), width);
                } else {
                    EspRenderer.drawBox(vertices, matrix, target.box(), target.color(), target.color(), width);
                }
            }
            if (tracers.get()) {
                int endColor = lineGradient.get() ? target.color() : 0xFFFFDDDD;
                EspRenderer.drawLine(vertices, matrix, origin, target.box().getCenter(),
                        originColor, endColor, width);
            }
        }

        matrices.pop();
    }

    /**
     * Where tracers start.
     *
     * <p>{@code Cursor} uses the crosshair's actual hit point, so lines appear to grow out of the
     * cursor and reach to each storage. With nothing under the crosshair it projects forward along
     * the look ray by {@code Cursor Distance} instead.
     */
    private Vec3d resolveOrigin(MinecraftClient client, Vec3d cameraPos) {
        ClientPlayerEntity player = client.player;
        if (player == null) {
            return cameraPos;
        }
        return switch (lineOrigin.get()) {
            case "Feet" -> player.getEntityPos();
            case "Eyes" -> player.getEyePos();
            default -> {
                HitResult hit = client.crosshairTarget;
                if (hit != null && hit.getType() != HitResult.Type.MISS) {
                    yield hit.getPos();
                }
                yield cameraPos.add(player.getRotationVec(1.0f).multiply(cursorReach.get()));
            }
        };
    }

    @Override
    public void onDisable() {
        targets.clear();
    }

    private record Target(Box box, int color, int colorDark) {
    }
}
