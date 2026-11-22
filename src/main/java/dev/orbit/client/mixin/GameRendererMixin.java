package dev.orbit.client.mixin;

import dev.orbit.client.module.impl.render.Freecam;
import dev.orbit.client.module.impl.render.Zoom;
import net.minecraft.client.render.GameRenderer;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Hides the first-person hand while Freecam is on.
 *
 * <p>Vanilla picks the hand renderer from the player's perspective option, not from the camera, so
 * making the camera report third person (see {@code CameraMixin}) brings the body back but leaves a
 * floating arm in front of the lens. Cancelling here keeps the detached view clean.
 */
@Mixin(GameRenderer.class)
public class GameRendererMixin {

    /**
     * Applies the zoom by dividing the field of view.
     *
     * <p>{@code getFov} is private in 1.21.11, so injecting on its return value is the only way to
     * do this without changing the player's FOV option - which would be visible in Options and would
     * be saved that way if the game crashed while zoomed.
     */
    @Inject(method = "getFov", at = @At("RETURN"), cancellable = true)
    private void orbit$zoomFov(CallbackInfoReturnable<Float> info) {
        Zoom zoom = Zoom.active();
        if (zoom == null) {
            return;
        }
        float divisor = zoom.fovDivisor();
        if (divisor > 1.0001f) {
            info.setReturnValue(info.getReturnValue() / divisor);
        }
    }
    @Inject(method = "renderHand", at = @At("HEAD"), cancellable = true)
    private void orbit$noFirstPersonHand(CallbackInfo info) {
        if (Freecam.isActive()) {
            info.cancel();
        }
    }
}
