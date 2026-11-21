package dev.orbit.client.mixin;

import dev.orbit.client.module.impl.render.SkyModule;
import dev.orbit.client.perf.PerfState;
import dev.orbit.client.render.SkyRenderer;
import net.minecraft.client.render.WorldRenderer;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Skips vanilla sky rendering while Custom Sky is on.
 *
 * <p>Only the sky pass is cancelled - sun, moon, stars and the horizon gradient all live in
 * {@code renderSky}, so they go with it, which is what a sky replacement should do. Clouds are a
 * separate pass and are untouched, so {@code Keep Clouds} still works.
 *
 * <p>Guarded by {@link SkyRenderer#layerFor}: if the dome pipeline could not be built we let vanilla
 * draw instead of rendering an empty sky.
 */
@Mixin(WorldRenderer.class)
public class WorldRendererMixin {
    /** Hides the cracking overlay on blocks being mined. */
    @Inject(method = "fillBlockBreakingProgressRenderState", at = @At("HEAD"), cancellable = true)
    private void orbit$hideBreaking(CallbackInfo info) {
        if (PerfState.hideBlockBreaking) {
            info.cancel();
        }
    }

    @Inject(method = "renderSky", at = @At("HEAD"), cancellable = true)
    private void orbit$replaceSky(CallbackInfo info) {
        if (!SkyModule.isReplacing()) {
            return;
        }
        SkyModule module = dev.orbit.client.module.ModuleRegistry.get(SkyModule.class).orElse(null);
        if (module == null || SkyRenderer.layerFor(module.currentTexture()) == null) {
            return;
        }
        info.cancel();
    }
}
