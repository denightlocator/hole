package net.fabricmc.fabric.api.client.rendering.v1.world;

import net.minecraft.client.render.VertexConsumerProvider;
import net.minecraft.client.render.state.WorldRenderState;
import net.minecraft.client.util.math.MatrixStack;

/** Handwritten test double; this is not Fabric's implementation. */
public class WorldRenderContext {
    private final WorldRenderState state = new WorldRenderState();
    private final MatrixStack matrices = new MatrixStack();
    private final VertexConsumerProvider consumers = new VertexConsumerProvider();

    public MatrixStack matrices() { return matrices; }
    public VertexConsumerProvider consumers() { return consumers; }
    public WorldRenderState worldState() { return state; }
}
