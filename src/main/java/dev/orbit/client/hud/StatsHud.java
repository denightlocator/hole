package dev.orbit.client.hud;

import dev.orbit.client.gui.Rounded;
import dev.orbit.client.gui.Theme;
import dev.orbit.client.module.ModuleRegistry;
import dev.orbit.client.module.impl.hud.ArmourHud;
import dev.orbit.client.module.impl.hud.FpsModule;
import dev.orbit.client.module.impl.hud.PingModule;
import dev.orbit.client.module.impl.hud.PotionHud;
import net.fabricmc.fabric.api.client.rendering.v1.hud.HudElement;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.font.TextRenderer;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.network.PlayerListEntry;
import net.minecraft.client.render.RenderTickCounter;

import java.util.ArrayList;
import java.util.List;

/**
 * The HUD elements: FPS, ping, armour durability and potion timers.
 *
 * <p>Each element is a separate module, so each is switched off on its own. They are drawn through
 * {@link #renderElement} so the HUD editor can draw exactly the same thing at a dragged position -
 * preview and reality cannot drift apart.
 *
 * <p>Elements are multi-line now (four armour pieces, a list of effects). One line is the common case
 * and costs the same as before; the pill simply grows.
 */
public class StatsHud implements HudElement {
    public static final String FPS = "fps";
    public static final String PING = "ping";
    public static final String ARMOUR = "armour";
    public static final String POTIONS = "potions";

    /** Every element the editor knows about, in draw order. */
    public static final List<String> ALL = List.of(FPS, PING, ARMOUR, POTIONS);

    private static final int PAD_X = 5;
    private static final int PAD_Y = 3;
    private static final int RADIUS = 5;
    private static final int LINE_GAP = 1;

    @Override
    public void render(DrawContext context, RenderTickCounter tickCounter) {
        MinecraftClient client = MinecraftClient.getInstance();
        if (client.player == null || client.options.hudHidden) {
            return;
        }
        // the editor draws the elements itself so what you drag is exactly what you get
        if (client.currentScreen instanceof dev.orbit.client.gui.HudEditorScreen) {
            return;
        }
        for (String id : ALL) {
            if (!isEnabled(id)) {
                continue;
            }
            HudLayout.Anchor anchor = HudLayout.get(id);
            int x = Math.round(anchor.xPercent() * context.getScaledWindowWidth());
            int y = Math.round(anchor.yPercent() * context.getScaledWindowHeight());
            renderElement(context, id, x, y);
        }
    }

    public static boolean isEnabled(String id) {
        return switch (id) {
            case FPS -> ModuleRegistry.get(FpsModule.class).map(m -> m.isEnabled()).orElse(false);
            case PING -> ModuleRegistry.get(PingModule.class).map(m -> m.isEnabled()).orElse(false);
            case ARMOUR -> ModuleRegistry.get(ArmourHud.class).map(m -> m.isEnabled()).orElse(false);
            case POTIONS -> ModuleRegistry.get(PotionHud.class).map(m -> m.isEnabled()).orElse(false);
            default -> false;
        };
    }

    public static String displayName(String id) {
        return switch (id) {
            case FPS -> "FPS";
            case PING -> "Ping";
            case ARMOUR -> "Armour";
            case POTIONS -> "Potions";
            default -> id;
        };
    }

    /** Draws one element at an absolute position. Nothing is drawn when it has no content. */
    public static void renderElement(DrawContext context, String id, int x, int y) {
        List<HudContent.Line> lines = linesFor(id);
        if (lines.isEmpty()) {
            // nothing equipped / no effects: an empty pill would be a stray box on screen
            return;
        }

        MinecraftClient client = MinecraftClient.getInstance();
        TextRenderer font = client.textRenderer;

        int widest = 0;
        for (HudContent.Line line : lines) {
            widest = Math.max(widest, font.getWidth(line.text()));
        }
        int lineHeight = font.fontHeight + LINE_GAP;
        int width = widest + PAD_X * 2;
        int height = lines.size() * lineHeight - LINE_GAP + PAD_Y * 2;

        float scale = HudLayout.getScale(id);

        // Everything is drawn at the local origin inside a scaled matrix, so one transform handles
        // text, pill and border together. Drawing at absolute x/y and scaling afterwards would move
        // the element away from its anchor instead of growing it in place.
        context.getMatrices().pushMatrix();
        context.getMatrices().translate((float) x, (float) y);
        context.getMatrices().scale(scale, scale);

        Rounded.fill(context, 0, 0, width, height, RADIUS, 0x8C0B0E17);
        Rounded.outline(context, 0, 0, width, height, RADIUS, Theme.border());

        int lineY = PAD_Y;
        for (HudContent.Line line : lines) {
            context.drawText(font, line.text(), PAD_X, lineY, line.colour(), false);
            lineY += lineHeight;
        }

        context.getMatrices().popMatrix();
    }

    /** Size of an element as it will be drawn, for hit-testing and outlines. */
    public static int[] sizeOf(String id) {
        MinecraftClient client = MinecraftClient.getInstance();
        TextRenderer font = client.textRenderer;
        List<HudContent.Line> lines = linesFor(id);

        float scale = HudLayout.getScale(id);

        if (lines.isEmpty()) {
            // editor still needs a box to grab when the element has nothing to show
            return new int[]{
                    Math.round((font.getWidth(displayName(id)) + PAD_X * 2) * scale),
                    Math.round((font.fontHeight + PAD_Y * 2) * scale)};
        }

        int widest = 0;
        for (HudContent.Line line : lines) {
            widest = Math.max(widest, font.getWidth(line.text()));
        }
        int lineHeight = font.fontHeight + LINE_GAP;
        return new int[]{
                Math.round((widest + PAD_X * 2) * scale),
                Math.round((lines.size() * lineHeight - LINE_GAP + PAD_Y * 2) * scale)};
    }

    /** Text for an element, or an empty list when it has nothing to show. */
    public static List<HudContent.Line> linesFor(String id) {
        MinecraftClient client = MinecraftClient.getInstance();
        List<HudContent.Line> lines = new ArrayList<>();

        switch (id) {
            case FPS -> {
                FpsModule module = ModuleRegistry.get(FpsModule.class).orElse(null);
                int fps = client.getCurrentFps();
                String number = String.valueOf(fps);
                String text = module != null && module.showsLabel() ? "FPS " + number : number;
                int colour = module != null && module.coloursByValue()
                        ? (fps >= 120 ? Theme.accent() : fps >= 60 ? 0xFFF5C26B : 0xFFF26B6B)
                        : Theme.text();
                lines.add(new HudContent.Line(text, colour));
            }
            case PING -> {
                PingModule module = ModuleRegistry.get(PingModule.class).orElse(null);
                int ping = pingOf(client);
                String number = ping < 0 ? "—" : String.valueOf(ping);
                String text = module != null && module.showsLabel() ? "PING " + number : number;
                if (module != null && module.showsSuffix() && ping >= 0) {
                    text = text + " ms";
                }
                int colour = ping < 0 ? Theme.textMuted()
                        : ping < 80 ? Theme.accent() : ping < 200 ? 0xFFF5C26B : 0xFFF26B6B;
                lines.add(new HudContent.Line(text, colour));
            }
            case ARMOUR -> {
                ArmourHud module = ModuleRegistry.get(ArmourHud.class).orElse(null);
                if (module != null) {
                    lines.addAll(HudContent.armour(module.showsPercent(), module.hidesEmpty()));
                }
            }
            case POTIONS -> {
                PotionHud module = ModuleRegistry.get(PotionHud.class).orElse(null);
                if (module != null) {
                    lines.addAll(HudContent.potions(module.usesRomanNumerals(), module.hidesAmbient()));
                }
            }
            default -> {
            }
        }
        return lines;
    }

    /** Latency of the local player, or -1 when there is no entry yet (singleplayer, joining). */
    private static int pingOf(MinecraftClient client) {
        if (client.getNetworkHandler() == null || client.player == null) {
            return -1;
        }
        PlayerListEntry entry = client.getNetworkHandler().getPlayerListEntry(client.player.getUuid());
        return entry == null ? -1 : entry.getLatency();
    }
}
