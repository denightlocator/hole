package dev.orbit.client.gui;

import dev.orbit.client.Orbit;
import dev.orbit.client.hud.HudLayout;
import dev.orbit.client.hud.StatsHud;
import dev.orbit.client.module.Module;
import dev.orbit.client.module.ModuleRegistry;
import dev.orbit.client.module.impl.hud.ArmourHud;
import dev.orbit.client.module.impl.hud.FpsModule;
import dev.orbit.client.module.impl.hud.PingModule;
import dev.orbit.client.module.impl.hud.PotionHud;
import dev.orbit.client.module.setting.BoolSetting;
import dev.orbit.client.module.setting.Setting;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.Click;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.input.CharInput;
import net.minecraft.client.input.KeyInput;
import net.minecraft.text.Text;

import java.util.ArrayList;
import java.util.List;

/**
 * HUD editor - direct manipulation.
 *
 * <p>Elements are drawn at their real positions and dragged on screen; clicking one opens a popover
 * with its own settings. Hidden elements would be invisible and therefore unreachable, so
 * <b>Tab</b> toggles a ghost pass that shows every element, including the disabled ones, at reduced
 * opacity - that is the only way to turn a hidden element back on without leaving this screen.
 *
 * <p>Opened by typing {@code .hud} in chat. That is deliberate: it is reachable without a keybind
 * slot, and typing is how every other client is driven.
 */
public class HudEditorScreen extends Screen {
    private static final int POPOVER_W = 186;
    private static final int ROW_H = 16;
    private static final int SNAP = 8;

    private static final List<String> ELEMENTS = StatsHud.ALL;

    private String selected;
    private String dragging;
    private double dragOffsetX;
    private double dragOffsetY;
    private float ghostFade;   // 0 = hidden elements invisible, 1 = fully shown

    public HudEditorScreen() {
        super(Text.literal("Orbit HUD Editor"));
    }

    @Override
    public boolean shouldPause() {
        return false;
    }

    // ── layout ──────────────────────────────────────────────────────────
    /** Absolute position of an element for the current screen size. */
    private int[] positionOf(String id) {
        HudLayout.Anchor anchor = HudLayout.get(id);
        return new int[]{
                Math.round(anchor.xPercent() * this.width),
                Math.round(anchor.yPercent() * this.height)};
    }

    private int[] boundsOf(String id) {
        int[] pos = positionOf(id);
        int[] size = StatsHud.sizeOf(id);
        return new int[]{pos[0], pos[1], size[0], size[1]};
    }

    private String elementAt(double mouseX, double mouseY) {
        // topmost first: later elements draw over earlier ones
        for (int i = ELEMENTS.size() - 1; i >= 0; i--) {
            String id = ELEMENTS.get(i);
            int[] box = boundsOf(id);
            boolean visible = StatsHud.isEnabled(id) || ghostFade > 0.5f;
            if (visible && mouseX >= box[0] - 3 && mouseX <= box[0] + box[2] + 3
                    && mouseY >= box[1] - 3 && mouseY <= box[1] + box[3] + 3) {
                return id;
            }
        }
        return null;
    }

    // ── input ───────────────────────────────────────────────────────────
    @Override
    public boolean mouseClicked(Click click, boolean doubled) {
        double mouseX = click.x();
        double mouseY = click.y();

        // popover rows take priority: they sit over the canvas
        if (selected != null && handlePopoverClick(mouseX, mouseY)) {
            return true;
        }

        String hit = elementAt(mouseX, mouseY);
        if (hit == null) {
            selected = null;
            return true;
        }
        selected = hit;
        int[] pos = positionOf(hit);
        dragOffsetX = mouseX - pos[0];
        dragOffsetY = mouseY - pos[1];
        dragging = hit;
        return true;
    }

    /** @return true when the click was consumed by the popover. */
    private boolean handlePopoverClick(double mouseX, double mouseY) {
        int[] box = boundsOf(selected);
        int[] pop = popoverBox(box);

        if (!inside(mouseX, mouseY, pop[0], pop[1], pop[2], pop[3])) {
            return false;
        }

        Module module = moduleFor(selected);
        if (module == null) {
            return true;
        }

        int rowY = pop[1] + 22;
        // module on/off
        if (inside(mouseX, mouseY, pop[0] + 6, rowY, POPOVER_W - 12, ROW_H)) {
            module.toggle();
            saveConfig();
            return true;
        }
        rowY += ROW_H + 3;

        for (Setting<?> setting : module.getSettings()) {
            if (!(setting instanceof BoolSetting bool)) {
                continue;
            }
            if (inside(mouseX, mouseY, pop[0] + 6, rowY, POPOVER_W - 12, ROW_H)) {
                bool.set(!bool.get());
                saveConfig();
                return true;
            }
            rowY += ROW_H + 3;
        }

        // scale stepper: two small buttons either side of the value
        if (inside(mouseX, mouseY, pop[0] + 6, rowY, POPOVER_W - 12, ROW_H)) {
            if (mouseX < pop[0] + 30) {
                HudLayout.stepScale(selected, -1);
            } else if (mouseX > pop[0] + POPOVER_W - 30) {
                HudLayout.stepScale(selected, +1);
            }
            saveConfig();
            return true;
        }
        rowY += ROW_H + 3;

        // reset position and scale
        if (inside(mouseX, mouseY, pop[0] + 6, rowY + 2, POPOVER_W - 12, ROW_H)) {
            HudLayout.reset(selected);
            saveConfig();
        }
        return true;
    }

    @Override
    public boolean mouseDragged(Click click, double offsetX, double offsetY) {
        if (dragging == null) {
            return super.mouseDragged(click, offsetX, offsetY);
        }
        double wantedX = click.x() - dragOffsetX;
        double wantedY = click.y() - dragOffsetY;

        // snap to the grid unless shift is held
        boolean ctrl = (click.modifiers() & org.lwjgl.glfw.GLFW.GLFW_MOD_SHIFT) != 0;
        if (!ctrl) {
            wantedX = Math.round(wantedX / SNAP) * SNAP;
            wantedY = Math.round(wantedY / SNAP) * SNAP;
        }

        HudLayout.set(dragging, (float) (wantedX / this.width), (float) (wantedY / this.height));
        return true;
    }

    @Override
    public boolean mouseReleased(Click click) {
        if (dragging != null) {
            dragging = null;
            saveConfig();
        }
        return super.mouseReleased(click);
    }

    @Override
    public boolean keyPressed(KeyInput input) {
        int key = input.key();
        if (key == org.lwjgl.glfw.GLFW.GLFW_KEY_TAB) {
            ghostFade = ghostFade > 0.5f ? 0.0f : 1.0f;
            return true;
        }
        // [ and ] resize the selected element without opening the popover
        if (key == org.lwjgl.glfw.GLFW.GLFW_KEY_LEFT_BRACKET && selected != null) {
            HudLayout.stepScale(selected, -1);
            saveConfig();
            return true;
        }
        if (key == org.lwjgl.glfw.GLFW.GLFW_KEY_RIGHT_BRACKET && selected != null) {
            HudLayout.stepScale(selected, +1);
            saveConfig();
            return true;
        }
        if (key == org.lwjgl.glfw.GLFW.GLFW_KEY_R && selected != null) {
            HudLayout.reset(selected);
            saveConfig();
            return true;
        }
        return super.keyPressed(input);
    }

    @Override
    public boolean charTyped(CharInput input) {
        return false;
    }

    @Override
    public void close() {
        saveConfig();
        super.close();
    }

    private void saveConfig() {
        Orbit.config().markDirty();
    }

    // ── rendering ───────────────────────────────────────────────────────
    /** No blur: the game must stay readable while elements are being placed. */
    @Override
    public void renderBackground(DrawContext context, int mouseX, int mouseY, float delta) {
    }

    @Override
    public void render(DrawContext context, int mouseX, int mouseY, float delta) {
        // the world and the real HUD are already drawn behind this screen; only overlays go here
        drawOutlines(context);
        drawHintBar(context);
        if (selected != null) {
            drawPopover(context, mouseX, mouseY);
        }
        super.render(context, mouseX, mouseY, delta);
    }

    /** Ghosts first (so real elements stay on top), then selection outlines. */
    private void drawOutlines(DrawContext context) {
        for (String id : ELEMENTS) {
            int[] box = boundsOf(id);
            boolean enabled = StatsHud.isEnabled(id);

            if (!enabled) {
                if (ghostFade <= 0.5f) {
                    continue;
                }
                // ghost: same element, drawn as an outline so it can be found and switched on
                Rounded.outline(context, box[0] - 1, box[1] - 1, box[2] + 2, box[3] + 2, 5, 0x66FFFFFF);
                context.drawText(client.textRenderer, StatsHud.displayName(id) + " (off)",
                        box[0] + box[2] + 6, box[1] + 2, 0xCCFFFFFF, true);
                continue;
            }

            // draw the element itself: the live HUD is suppressed while this screen is open
            StatsHud.renderElement(context, id, box[0], box[1]);

            boolean isSelected = id.equals(selected);
            int colour = isSelected ? Theme.accent() : 0x55FFFFFF;
            Rounded.outline(context, box[0] - 1, box[1] - 1, box[2] + 2, box[3] + 2, 5, colour);
            if (isSelected) {
                Rounded.glow(context, box[0] - 1, box[1] - 1, box[2] + 2, box[3] + 2, 5, 0x44000000);
            }
        }
    }

    private void drawHintBar(DrawContext context) {
        String hint = "drag to move · [ ] = scale · shift = free · R = reset · Tab = hidden · Esc = close";
        int w = client.textRenderer.getWidth(hint) + 16;
        int x = (this.width - w) / 2;
        int y = this.height - 22;
        Rounded.fill(context, x, y, w, 15, 6, 0xCC0B0E17);
        Rounded.outline(context, x, y, w, 15, 6, Theme.border());
        context.drawText(client.textRenderer, hint, x + 8, y + 4, Theme.textMuted(), false);
    }

    /** Popover position for an element: to its right, flipped left when it would go off screen. */
    private int[] popoverBox(int[] elementBox) {
        Module module = moduleFor(selected);
        int rows = 1 + (module == null ? 0 : boolCount(module)) + 2;   // + scale row + reset
        int height = 22 + rows * (ROW_H + 3) + 6;

        int x = elementBox[0] + elementBox[2] + 10;
        if (x + POPOVER_W > this.width) {
            x = elementBox[0] - POPOVER_W - 10;
        }
        int y = Math.min(Math.max(4, elementBox[1]), this.height - height - 30);
        return new int[]{x, y, POPOVER_W, height};
    }

    private void drawPopover(DrawContext context, int mouseX, int mouseY) {
        int[] box = boundsOf(selected);
        int[] pop = popoverBox(box);

        Rounded.shadow(context, pop[0], pop[1], pop[2], pop[3], 9, 2);
        Rounded.panel(context, pop[0], pop[1], pop[2], pop[3], 9,
                Theme.card(), Theme.bg(), Theme.border());

        context.drawText(client.textRenderer, StatsHud.displayName(selected), pop[0] + 8, pop[1] + 7,
                Theme.text(), true);

        Module module = moduleFor(selected);
        int rowY = pop[1] + 22;

        drawToggle(context, pop[0] + 6, rowY, "Enabled",
                module != null && module.isEnabled(), mouseX, mouseY);
        rowY += ROW_H + 3;

        if (module != null) {
            for (Setting<?> setting : module.getSettings()) {
                if (setting instanceof BoolSetting bool) {
                    drawToggle(context, pop[0] + 6, rowY, setting.getName(), bool.get(), mouseX, mouseY);
                    rowY += ROW_H + 3;
                }
            }
        }

        drawScaleRow(context, pop[0] + 6, rowY, mouseX, mouseY);
        rowY += ROW_H + 3;

        boolean over = inside(mouseX, mouseY, pop[0] + 6, rowY + 2, POPOVER_W - 12, ROW_H);
        Rounded.fill(context, pop[0] + 6, rowY + 2, POPOVER_W - 12, ROW_H, 5,
                over ? Theme.cardHover() : Theme.track());
        context.drawText(client.textRenderer, "Reset position",
                pop[0] + 6 + (POPOVER_W - 12 - client.textRenderer.getWidth("Reset position")) / 2,
                rowY + 2 + (ROW_H - 8) / 2, Theme.textMuted(), false);
    }

    /**
     * Scale row: {@code −  1.25x  +}.
     *
     * <p>Stepped rather than a slider on purpose - the steps are clean subdivisions, so HUD text stays
     * crisp, and a stepper needs no drag tracking inside a popover that is already handling clicks.
     */
    private void drawScaleRow(DrawContext context, int x, int y, int mouseX, int mouseY) {
        int w = POPOVER_W - 12;
        Rounded.fill(context, x, y, w, ROW_H, 5, Theme.track());

        boolean overMinus = inside(mouseX, mouseY, x, y, 24, ROW_H);
        boolean overPlus = inside(mouseX, mouseY, x + w - 24, y, 24, ROW_H);
        Rounded.fill(context, x + 2, y + 2, 22, ROW_H - 4, 4,
                overMinus ? Theme.cardHover() : Theme.border());
        Rounded.fill(context, x + w - 24, y + 2, 22, ROW_H - 4, 4,
                overPlus ? Theme.cardHover() : Theme.border());

        context.drawText(client.textRenderer, "−", x + 11, y + (ROW_H - 8) / 2, Theme.text(), false);
        context.drawText(client.textRenderer, "+", x + w - 15, y + (ROW_H - 8) / 2, Theme.text(), false);

        String value = scaleLabel(HudLayout.getScale(selected));
        int valueWidth = client.textRenderer.getWidth(value);
        context.drawText(client.textRenderer, value, x + (w - valueWidth) / 2, y + (ROW_H - 8) / 2,
                Theme.accent(), false);
    }

    private static String scaleLabel(float scale) {
        if (Math.abs(scale - Math.round(scale)) < 0.001f) {
            return Math.round(scale) + "x";
        }
        return String.format(java.util.Locale.ROOT, "%.2fx", scale);
    }

    /** One row with a label and a pill switch. */
    private void drawToggle(DrawContext context, int x, int y, String label, boolean on,
                            int mouseX, int mouseY) {
        int w = POPOVER_W - 12;
        boolean over = inside(mouseX, mouseY, x, y, w, ROW_H);
        Rounded.fill(context, x, y, w, ROW_H, 5, over ? Theme.cardHover() : Theme.track());
        context.drawText(client.textRenderer, label, x + 7, y + (ROW_H - 8) / 2,
                on ? Theme.text() : Theme.textMuted(), false);

        int pillW = 20;
        int pillX = x + w - pillW - 6;
        int pillY = y + (ROW_H - 9) / 2;
        Rounded.fill(context, pillX, pillY, pillW, 9, 4, on ? Theme.accent() : Theme.border());
        Rounded.fill(context, on ? pillX + pillW - 7 : pillX + 2, pillY + 2, 5, 5, 3,
                on ? 0xFF0B0E17 : Theme.textFaint());
    }

    // ── helpers ─────────────────────────────────────────────────────────
    private static Module moduleFor(String id) {
        if (StatsHud.FPS.equals(id)) {
            return ModuleRegistry.get(FpsModule.class).orElse(null);
        }
        if (StatsHud.PING.equals(id)) {
            return ModuleRegistry.get(PingModule.class).orElse(null);
        }
        if (StatsHud.ARMOUR.equals(id)) {
            return ModuleRegistry.get(ArmourHud.class).orElse(null);
        }
        if (StatsHud.POTIONS.equals(id)) {
            return ModuleRegistry.get(PotionHud.class).orElse(null);
        }
        return null;
    }

    private static int boolCount(Module module) {
        int count = 0;
        for (Setting<?> setting : module.getSettings()) {
            if (setting instanceof BoolSetting) {
                count++;
            }
        }
        return count;
    }

    private static boolean inside(double mouseX, double mouseY, int x, int y, int w, int h) {
        return mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h;
    }
}
