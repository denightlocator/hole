package dev.orbit.client.mixin;

import dev.orbit.client.perf.PerfState;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.render.Camera;
import net.minecraft.client.render.Frustum;
import net.minecraft.client.render.entity.EntityRenderManager;
import net.minecraft.entity.Entity;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Skips entities that are entirely behind the camera.
 *
 * <p>Uses the camera's horizontal plane (a JOML vector in 1.21.11) as a half-space test. Entities
 * closer than a couple of blocks are never culled, and neither is the camera entity, so nothing pops
 * out of view at arm's length.
 */
@Mixin(EntityRenderManager.class)
public class EntityRenderManagerMixin {
    @Inject(method = "shouldRender", at = @At("HEAD"), cancellable = true)
    private void orbit$cullBehind(Entity entity, Frustum frustum, double x, double y, double z,
                                  CallbackInfoReturnable<Boolean> info) {
        if (entity == null) {
            return;
        }
        if (PerfState.hideItemFrames && entity.getType() == net.minecraft.entity.EntityType.ITEM_FRAME
                || PerfState.hideItemFrames && entity.getType() == net.minecraft.entity.EntityType.GLOW_ITEM_FRAME) {
            info.setReturnValue(false);
            return;
        }
        if (!PerfState.entityCulling) {
            return;
        }

        MinecraftClient client = MinecraftClient.getInstance();
        if (client == null || client.gameRenderer == null) {
            return;
        }
        Camera camera = client.gameRenderer.getCamera();
        if (camera == null || !camera.isReady() || camera.getFocusedEntity() == entity) {
            return;
        }

        double dx = x - camera.getCameraPos().x;
        double dy = y - camera.getCameraPos().y;
        double dz = z - camera.getCameraPos().z;

        double distanceSq = dx * dx + dy * dy + dz * dz;
        if (distanceSq < PerfState.entityCullMinSq) {
            return;   // never cull something close, whatever the slider says
        }

        if (camera.getHorizontalPlane().dot((float) dx, (float) dy, (float) dz) < 0.0F) {
            info.setReturnValue(false);
        }
    }
}
