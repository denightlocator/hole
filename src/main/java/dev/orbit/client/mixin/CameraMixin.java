package dev.orbit.client.mixin;

import dev.orbit.client.module.ModuleRegistry;
import dev.orbit.client.module.impl.render.Freecam;
import net.minecraft.client.render.Camera;
import net.minecraft.entity.Entity;
import net.minecraft.util.math.Vec3d;
import net.minecraft.world.World;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Lets Freecam take over the camera after vanilla has positioned it.
 *
 * <p>{@code GameRenderer.updateCameraState} reads {@code getCameraPos()} / {@code getRotation()}
 * after {@code Camera.update} returns, so writing the position here is picked up by the whole
 * render pipeline (culling, entity pass, block outline, ...).
 */
@Mixin(Camera.class)
public abstract class CameraMixin {

    @Shadow
    protected abstract void setPos(Vec3d pos);

    @Shadow
    protected abstract void setRotation(float yaw, float pitch);

    /**
     * Makes the detached camera report third person.
     *
     * <p>Vanilla's entity loop skips {@code camera.getFocusedEntity()} whenever
     * {@code !camera.isThirdPerson()} - that is how your own model is hidden in first person. A
     * freecam is positioned by this mixin, so the flag stayed false and your body was skipped too.
     * Reporting third person is the one-line way to get it back, and it keeps vanilla's own rules
     * for everything else.
     */
    @Inject(method = "isThirdPerson", at = @At("HEAD"), cancellable = true)
    private void orbit$thirdPersonWhileFreecam(CallbackInfoReturnable<Boolean> info) {
        if (Freecam.isActive()) {
            info.setReturnValue(true);
        }
    }

    @Inject(method = "update", at = @At("TAIL"))
    private void orbit$freecam(World area, Entity focusedEntity, boolean thirdPerson, boolean inverseView,
                               float tickProgress, CallbackInfo info) {
        Freecam freecam = ModuleRegistry.get(Freecam.class).orElse(null);
        if (freecam == null || !freecam.isEnabled()) {
            return;
        }
        Freecam.CameraState state = freecam.tickSimulation();
        if (state == null) {
            return;
        }
        setPos(state.pos());
        setRotation(state.yaw(), state.pitch());
    }
}
