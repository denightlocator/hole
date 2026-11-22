package dev.orbit.client.mixin;

import dev.orbit.client.perf.PerfState;
import net.minecraft.block.BlockState;
import net.minecraft.block.FlowerBlock;
import net.minecraft.block.ShortPlantBlock;
import net.minecraft.block.TallPlantBlock;
import net.minecraft.client.render.VertexConsumer;
import net.minecraft.client.render.block.BlockRenderManager;
import net.minecraft.client.render.model.BlockModelPart;
import net.minecraft.client.util.math.MatrixStack;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.BlockRenderView;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

import java.util.List;

/**
 * Skips vegetal clutter (grass, flowers, tall plants) while chunks are built.
 *
 * <p>This is the hook chunk meshing itself uses - {@code SectionBuilder} calls
 * {@code renderBlock} - so skipping here removes the geometry instead of drawing and discarding it,
 * and the saving lands in the section mesh rather than per frame.
 *
 * <p>Restricted to {@code PlantBlock} subclasses on purpose: a wider "hide all decoration" rule
 * would eat crops and saplings and make farms unreadable.
 */
@Mixin(BlockRenderManager.class)
public class BlockRenderManagerMixin {
    @Inject(method = "renderBlock", at = @At("HEAD"), cancellable = true)
    private void orbit$skipPlants(BlockState state, BlockPos pos, BlockRenderView world,
                                  MatrixStack matrices, VertexConsumer vertexConsumer,
                                  boolean cull, List<BlockModelPart> parts, CallbackInfo info) {
        if (!PerfState.hideGrass) {
            return;
        }
        if (state.getBlock() instanceof ShortPlantBlock
                || state.getBlock() instanceof FlowerBlock
                || state.getBlock() instanceof TallPlantBlock) {
            info.cancel();
        }
    }
}
