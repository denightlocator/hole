package dev.orbit.client.mixin;

import dev.orbit.client.module.impl.render.Freecam;
import net.minecraft.client.network.ClientPlayerEntity;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Keeps the player's body still while Freecam is flying the camera.
 *
 * <p>{@code tickMovementInput} is where the movement keys are turned into a movement vector, so
 * cancelling it means the player does not walk, jump or sneak - the camera moves, the body does not.
 * Cancelling this rather than zeroing {@code Input.playerInput} afterwards is deliberate: input is
 * consumed during the player tick, which happens before the client tick event, so clearing it later
 * would still let one tick of movement through.
 */
@Mixin(ClientPlayerEntity.class)
public class ClientPlayerEntityMixin {
    @Inject(method = "tickMovementInput", at = @At("HEAD"), cancellable = true)
    private void orbit$freezeWhileFreecam(CallbackInfo info) {
        if (Freecam.freezesPlayer()) {
            info.cancel();
        }
    }
}
