package dev.orbit.client.mixin;

import dev.orbit.client.module.ModuleRegistry;
import dev.orbit.client.module.impl.render.Freecam;
import dev.orbit.client.module.impl.render.Zoom;
import net.minecraft.client.Mouse;
import net.minecraft.client.network.ClientPlayerEntity;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.Redirect;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Mouse handling for the modules that need it.
 *
 * <p>One redirect covers freecam, zoom sensitivity and vanilla look, in that priority order - two
 * {@code @Redirect}s on the same call would be a conflict, and two separate injections would fight
 * over the same deltas.
 */
@Mixin(Mouse.class)
public abstract class MouseMixin {

    /**
     * {@code updateMouse} finishes by calling {@code player.changeLookDirection(dx, dy)} with the
     * already sensitivity-scaled and invert-adjusted deltas. Redirect keeps the player's view still
     * and gives those deltas to the free camera.
     */
    @Redirect(
            method = "updateMouse",
            at = @At(
                    value = "INVOKE",
                    target = "Lnet/minecraft/client/network/ClientPlayerEntity;changeLookDirection(DD)V"
            )
    )
    private void orbit$freecamLook(ClientPlayerEntity player, double deltaYaw, double deltaPitch) {
        // one redirect handles freecam, zoom and vanilla, in priority order
        Freecam freecam = ModuleRegistry.get(Freecam.class).orElse(null);
        if (freecam != null && freecam.isEnabled()) {
            freecam.onMouseLook(deltaYaw, deltaPitch);
            return;
        }

        // while zoomed, scale the delta so aiming stays proportional to what is on screen
        Zoom zoom = Zoom.active();
        double scale = zoom == null ? 1.0 : zoom.sensitivityScale();
        player.changeLookDirection(deltaYaw * scale, deltaPitch * scale);
    }

    /** Scroll wheel becomes the freecam speed modifier, or the zoom factor, instead of the hotbar. */
    @Inject(method = "onMouseScroll", at = @At("HEAD"), cancellable = true)
    private void orbit$freecamScroll(long window, double horizontal, double vertical, CallbackInfo info) {
        Freecam freecam = ModuleRegistry.get(Freecam.class).orElse(null);
        if (freecam != null && freecam.onScroll(vertical)) {
            info.cancel();
            return;
        }
        Zoom zoom = Zoom.active();
        if (zoom != null && zoom.consumesScroll()) {
            zoom.onScroll(vertical);
            info.cancel();
        }
    }
}
