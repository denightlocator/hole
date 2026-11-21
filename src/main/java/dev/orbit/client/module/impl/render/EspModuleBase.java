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
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.font.TextRenderer;
import net.minecraft.client.network.ClientPlayerEntity;
import net.minecraft.client.render.Camera;
import net.minecraft.client.render.RenderLayer;
import net.minecraft.client.render.VertexConsumer;
import net.minecraft.client.render.VertexConsumerProvider;
import net.minecraft.client.util.math.MatrixStack;
import net.minecraft.util.hit.HitResult;
import net.minecraft.util.math.Box;
import net.minecraft.util.math.Vec3d;
import org.joml.Matrix4f;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Shared base for the ESP style modules (player tracking, mob ESP).
 *
 * <p>Owns the settings every box-and-tag overlay needs, the through-wall render loop, and the
 * billboard name tag maths. Subclasses only decide <em>what</em> to track: they implement
 * {@link #scan()} and return a list of {@link Target}s.
 *
 * <p>Colour is decided by the subclass, so player tracking can offer team colours and mob ESP can
 * offer hostiles/passives.
 */
public abstract class EspModuleBase extends Module {
    protected final BoolSetting boxes = addSetting(new BoolSetting("Boxes", true));
    protected final ModeSetting boxStyle = addSetting(new ModeSetting("Box Style", "3D", "3D", "2D"));
    protected final BoolSetting boxGradient = addSetting(new BoolSetting("Gradient Boxes", true));

    protected final BoolSetting nameTags = addSetting(new BoolSetting("Name Tags", true));
    protected final BoolSetting showDistance = addSetting(new BoolSetting("Distance", true));
    protected final BoolSetting showHealth = addSetting(new BoolSetting("Health Text", true));
    protected final NumberSetting tagScale = addSetting(new NumberSetting("Tag Scale", 1.0, 0.5, 2.0, 0.1, "x"));

    protected final BoolSetting lines = addSetting(new BoolSetting("Lines", false));
    protected final ModeSetting lineOrigin =
            addSetting(new ModeSetting("Line Origin", "Cursor", "Feet", "Eyes", "Cursor"));
    protected final NumberSetting cursorReach = addSetting(new NumberSetting("Cursor Distance", 8, 2, 48, 1, "m"));
    protected final BoolSetting lineGradient = addSetting(new BoolSetting("Gradient Lines", true));

    protected final ColorSetting staticColor = addSetting(new ColorSetting("Static Colour", 0xFF5AA9FF));

    protected final NumberSetting range = addSetting(new NumberSetting("Range", 64, 8, 256, 4, "m"));
    protected final NumberSetting lineWidth = addSetting(new NumberSetting("Line Width", 1.5, 1, 4, 0.5, ""));

    protected final BoolSetting ignoreInvisible = addSetting(new BoolSetting("Ignore Invisible", true));

    /** Rebuilt every tick by {@link #onTick()}; never null. */
    protected final List<Target> targets = new ArrayList<>();

    protected EspModuleBase(String name, String description, Category category) {
        super(name, description, category);
    }

    /** @return the targets visible this tick; the caller may return an empty list but not null. */
    protected abstract List<Target> scan();

    @Override
    public void onTick() {
        List<Target> scanned = scan();
        targets.clear();
        if (scanned != null && !scanned.isEmpty()) {
            targets.addAll(scanned);
        }
    }

    @Override
    public void onDisable() {
        targets.clear();
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
        Camera camera = client.gameRenderer.getCamera();

        Vec3d cameraPos = camera.getCameraPos();
        Vec3d origin = resolveOrigin(client, cameraPos);

        matrices.push();
        matrices.translate(-cameraPos.x, -cameraPos.y, -cameraPos.z);

        float width = (float) lineWidth.get();
        VertexConsumer vertices = consumers.getBuffer(layer);
        int originColour = lineGradient.get() ? Theme.accent() : 0xFFFFFFFF;

        for (Target target : targets) {
            if (boxes.get()) {
                if ("2D".equals(boxStyle.get())) {
                    drawScreenAlignedBox(matrices, vertices, camera, target, width);
                } else if (boxGradient.get()) {
                    EspRenderer.drawBox(vertices, matrices.peek().getPositionMatrix(), target.box(),
                            Theme.alpha(target.colour(), 0x30), target.colour(), width);
                } else {
                    EspRenderer.drawBox(vertices, matrices.peek().getPositionMatrix(), target.box(),
                            target.colour(), target.colour(), width);
                }
            }

            if (lines.get()) {
                Vec3d anchor = new Vec3d(
                        (target.box().minX + target.box().maxX) / 2.0,
                        target.box().minY,
                        (target.box().minZ + target.box().maxZ) / 2.0);
                int endColour = lineGradient.get() ? target.colour() : 0xFFFFDDDD;
                EspRenderer.drawLine(vertices, matrices.peek().getPositionMatrix(), origin, anchor,
                        originColour, endColour, width);
            }
        }

        if (nameTags.get()) {
            drawNameTags(client, matrices, consumers, camera);
        }

        matrices.pop();
    }

    /**
     * 2D variant: a rectangle that always faces the camera. Drawn in a space translated to the
     * target and rotated by the camera, so local XY is screen space.
     */
    private void drawScreenAlignedBox(MatrixStack matrices, VertexConsumer vertices, Camera camera,
                                      Target target, float width) {
        Box box = target.box();
        Vec3d centre = box.getCenter();

        matrices.push();
        matrices.translate(centre.x, centre.y, centre.z);
        matrices.multiply(camera.getRotation());
        Matrix4f matrix = matrices.peek().getPositionMatrix();

        float halfWidth = (float) Math.max(box.getLengthX(), box.getLengthZ()) / 2f + 0.08f;
        float halfHeight = (float) box.getLengthY() / 2f;
        int colour = target.colour();

        EspRenderer.drawLine(vertices, matrix, new Vec3d(-halfWidth, -halfHeight, 0),
                new Vec3d(halfWidth, -halfHeight, 0), colour, colour, width);
        EspRenderer.drawLine(vertices, matrix, new Vec3d(halfWidth, -halfHeight, 0),
                new Vec3d(halfWidth, halfHeight, 0), colour, colour, width);
        EspRenderer.drawLine(vertices, matrix, new Vec3d(halfWidth, halfHeight, 0),
                new Vec3d(-halfWidth, halfHeight, 0), colour, colour, width);
        EspRenderer.drawLine(vertices, matrix, new Vec3d(-halfWidth, halfHeight, 0),
                new Vec3d(-halfWidth, -halfHeight, 0), colour, colour, width);

        matrices.pop();
    }

    /** Billboarded name tag: label, distance, and optionally health, floating above the box. */
    private void drawNameTags(MinecraftClient client, MatrixStack matrices,
                              VertexConsumerProvider consumers, Camera camera) {
        TextRenderer font = client.textRenderer;

        for (Target target : targets) {
            String label = target.name();
            if (showDistance.get()) {
                label += "  " + Math.round(target.distance()) + "m";
            }

            Vec3d at = new Vec3d(
                    (target.box().minX + target.box().maxX) / 2.0,
                    target.box().maxY + 0.5,
                    (target.box().minZ + target.box().maxZ) / 2.0);

            matrices.push();
            matrices.translate(at.x, at.y, at.z);
            matrices.multiply(camera.getRotation());
            float scale = (float) (tagScale.get() * 0.025);
            // camera rotation cancels the view rotation, so local +x is screen right and local y
            // is flipped for text's top-down coordinates
            matrices.scale(scale, -scale, scale);
            Matrix4f matrix = matrices.peek().getPositionMatrix();

            font.draw(label, -font.getWidth(label) / 2f, 0, target.colour(), true, matrix, consumers,
                    TextRenderer.TextLayerType.SEE_THROUGH, 0, 0xF000F0);

            // targets without a health concept (dropped items) report maxHealth 0; skip the line
            if (showHealth.get() && target.maxHealth() > 0f) {
                String health = String.format("%.1f hp", target.health());
                font.draw(health, -font.getWidth(health) / 2f, 10, 0xFFCFCBDD, true, matrix, consumers,
                        TextRenderer.TextLayerType.SEE_THROUGH, 0, 0xF000F0);
            }

            matrices.pop();
        }
    }

    /** Where tracers start. Shared so every ESP module offers the same three options. */
    protected Vec3d resolveOrigin(MinecraftClient client, Vec3d cameraPos) {
        ClientPlayerEntity player = client.player;
        if (player == null) {
            return cameraPos;
        }
        return switch (lineOrigin.get()) {
            case "Feet" -> player.getEntityPos();
            case "Cursor" -> {
                HitResult hit = client.crosshairTarget;
                if (hit != null && hit.getType() != HitResult.Type.MISS) {
                    yield hit.getPos();
                }
                yield cameraPos.add(player.getRotationVec(1.0f).multiply(cursorReach.get()));
            }
            default -> player.getEyePos();
        };
    }

    // ── colour helpers ──────────────────────────────────────────────────
    /** Red at 0 health, yellow at half, green at full. */
    protected static int healthColour(float health, float maxHealth) {
        float fraction = maxHealth <= 0f ? 0f : Math.max(0f, Math.min(1f, health / maxHealth));
        float red;
        float green;
        if (fraction < 0.5f) {
            float t = fraction / 0.5f;
            red = 1f;
            green = t;
        } else {
            float t = (fraction - 0.5f) / 0.5f;
            red = 1f - t;
            green = 1f;
        }
        return 0xFF000000
                | ((int) (red * 255) << 16)
                | ((int) (green * 255) << 8)
                | 0x30;
    }

    /** Convenience for subclasses that filter an empty scan early. */
    protected static List<Target> none() {
        return Collections.emptyList();
    }

    /** One tracked entity: where it is, what to label it, and what colour it gets. */
    protected record Target(Box box, String name, double distance, float health, float maxHealth,
                            int colour) {
    }
}
