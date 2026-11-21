package dev.orbit.client.mixin;

import dev.orbit.client.perf.PerfState;
import net.minecraft.client.sound.SoundInstance;
import net.minecraft.client.sound.SoundManager;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Drops the rain and thunder loops while the Weather module is on.
 *
 * <p>The gradients only cover rendering - the loops are separate instances played every tick, so
 * they have to be filtered at the source. Matching on the {@code weather.} namespace path keeps this
 * narrow: no other sound is touched.
 */
@Mixin(SoundManager.class)
public class SoundManagerMixin {
    @Inject(method = "play(Lnet/minecraft/client/sound/SoundInstance;I)V", at = @At("HEAD"), cancellable = true)
    private void orbit$muteWeather(SoundInstance sound, int delay, CallbackInfo info) {
        if (!PerfState.noWeather || sound == null || sound.getId() == null) {
            return;
        }
        String path = sound.getId().getPath();
        if (path.startsWith("weather.")) {
            info.cancel();
        }
    }
}
