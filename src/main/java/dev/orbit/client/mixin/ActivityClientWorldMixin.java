package dev.orbit.client.mixin;

import dev.orbit.client.module.impl.render.ChunkActivity;
import net.minecraft.block.BlockState;
import net.minecraft.client.world.ClientWorld;
import net.minecraft.util.math.BlockPos;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** Observes an already-applied client-world change, without touching the logical server or packets. */
@Mixin(ClientWorld.class)
public abstract class ActivityClientWorldMixin {
    @Inject(method = "scheduleBlockRerenderIfNeeded", at = @At("HEAD"))
    private void orbit$observeBlockChange(BlockPos pos, BlockState before, BlockState after, CallbackInfo info) {
        ChunkActivity.onBlockChanged((ClientWorld) (Object) this, pos, before, after);
    }
}
