package dev.orbit.client.mixin;

import dev.orbit.client.module.ModuleRegistry;
import dev.orbit.client.module.impl.render.Crosshair;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.hud.InGameHud;
import net.minecraft.client.render.RenderTickCounter;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Replaces the vanilla crosshair.
 *
 * <p>Only the crosshair call is cancelled, not the whole HUD. The attack indicator is drawn inside
 * {@code renderCrosshair}, so it is lost when this module is on - worth knowing rather than being a
 * surprise in a fight.
 */
@Mixin(InGameHud.class)
public class InGameHudMixin {
    @Inject(method = "renderCrosshair", at = @At("HEAD"), cancellable = true)
    private void orbit$customCrosshair(DrawContext context, RenderTickCounter tickCounter, CallbackInfo info) {
        Crosshair crosshair = ModuleRegistry.get(Crosshair.class).orElse(null);
        if (crosshair == null || !crosshair.isEnabled()) {
            return;
        }
        crosshair.render(context, context.getScaledWindowWidth(), context.getScaledWindowHeight());
        info.cancel();
    }
}
