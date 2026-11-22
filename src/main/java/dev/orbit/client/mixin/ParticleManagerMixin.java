package dev.orbit.client.mixin;

import dev.orbit.client.perf.PerfState;
import net.minecraft.client.particle.Particle;
import net.minecraft.client.particle.ParticleManager;
import net.minecraft.particle.ParticleEffect;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Caps particle spawns per tick.
 *
 * <p>The budget is reset in {@code tick}, so a single explosion cannot spawn thousands of particles
 * in one frame - that spike, not the steady-state count, is what causes the hitch.
 */
@Mixin(ParticleManager.class)
public class ParticleManagerMixin {
    @Unique
    private int orbit$spawnedThisTick;

    @Inject(method = "tick", at = @At("HEAD"))
    private void orbit$resetBudget(CallbackInfo info) {
        orbit$spawnedThisTick = 0;
    }

    @Inject(method = "addParticle(Lnet/minecraft/particle/ParticleEffect;DDDDDD)Lnet/minecraft/client/particle/Particle;",
            at = @At("HEAD"), cancellable = true)
    private void orbit$limitParticles(ParticleEffect effect, double x, double y, double z,
                                      double velocityX, double velocityY, double velocityZ,
                                      CallbackInfoReturnable<Particle> info) {
        int budget = PerfState.particleBudget;
        if (budget <= 0) {
            return;
        }
        if (++orbit$spawnedThisTick > budget) {
            info.setReturnValue(null);
        }
    }
}
