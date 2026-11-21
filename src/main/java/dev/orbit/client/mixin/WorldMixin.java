package dev.orbit.client.mixin;

import dev.orbit.client.perf.PerfState;
import net.minecraft.world.World;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Mutes the rain/thunder gradients for the Weather module.
 *
 * <p>Targets {@code World} rather than {@code ClientWorld}: the gradients are declared here and
 * inherited, and a mixin can only inject into methods present in its own target's bytecode.
 * Everything that draws or fogs weather reads these two values, so zeroing them kills rain, snow
 * and the grey sky tint in one place.
 */
@Mixin(World.class)
public class WorldMixin {
    @Inject(method = "getRainGradient", at = @At("HEAD"), cancellable = true)
    private void orbit$noRain(CallbackInfoReturnable<Float> info) {
        if (PerfState.noWeather) {
            info.setReturnValue(0.0F);
        }
    }

    @Inject(method = "getThunderGradient", at = @At("HEAD"), cancellable = true)
    private void orbit$noThunder(CallbackInfoReturnable<Float> info) {
        if (PerfState.noWeather) {
            info.setReturnValue(0.0F);
        }
    }
}
