package net.minecraft.client;

import java.util.ArrayList;
import java.util.List;
import net.minecraft.client.font.TextRenderer;
import net.minecraft.client.render.GameRenderer;
import net.minecraft.client.world.ClientWorld;
import net.minecraft.entity.player.PlayerEntity;
import net.minecraft.util.hit.HitResult;

public class MinecraftClient {
    private static final MinecraftClient INSTANCE = new MinecraftClient();
    public HitResult crosshairTarget;
    public Object currentScreen;
    public ClientWorld world;
    public PlayerEntity player;
    public final GameRenderer gameRenderer = new GameRenderer();
    public final TextRenderer textRenderer = new TextRenderer();
    public boolean defer;
    public final List<Runnable> queued = new ArrayList<>();

    public static MinecraftClient getInstance() { return INSTANCE; }
    public void execute(Runnable task) { if (defer) queued.add(task); else task.run(); }
    public void flush() {
        for (Runnable task : new ArrayList<>(queued)) task.run();
        queued.clear();
    }
}
