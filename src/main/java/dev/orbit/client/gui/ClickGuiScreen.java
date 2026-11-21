package dev.orbit.client.gui;

import dev.orbit.client.Orbit;
import dev.orbit.client.module.Category;
import dev.orbit.client.module.Keybind;
import dev.orbit.client.module.KeybindManager;
import dev.orbit.client.module.Module;
import dev.orbit.client.module.ModuleRegistry;
import dev.orbit.client.module.setting.BoolSetting;
import dev.orbit.client.module.setting.ColorSetting;
import dev.orbit.client.module.setting.ModeSetting;
import dev.orbit.client.module.setting.NumberSetting;
import dev.orbit.client.module.setting.StringSetting;
import dev.orbit.client.module.setting.Setting;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.Click;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.input.CharInput;
import net.minecraft.client.input.KeyInput;
import net.minecraft.client.util.InputUtil;
import net.minecraft.text.Text;
import net.minecraft.util.math.MathHelper;

import java.util.ArrayList;
import java.util.List;

/**
 * Orbit's Right Shift GUI: category rail, module grid, settings inspector, plus a theme editor
 * with presets, custom accent colours and gradient/rainbow modes.
 *
 * <p>Everything is drawn with {@link Rounded} so edges are soft instead of blocky, and every
 * surface colour comes from {@link Theme}, so switching theme re-tints the whole window.
 */
public class ClickGuiScreen extends Screen {

    // ── layout ──────────────────────────────────────────────────────────
    private static final int TITLEBAR_H = 24;
    private static final int RAIL_W = 94;
    private static final int INSPECTOR_W = 158;
    private static final int PAD = 8;
    private static final int SEARCH_H = 18;
    private static final int ROW_H = 20;
    private static final int ROW_GAP = 5;
    private static final int COL_GAP = 5;
    private static final int RADIUS = 9;

    // ── remembered between openings ─────────────────────────────────────
    private static Category lastCategory = Category.COMBAT;
    private static String lastName = null;

    // ── state ───────────────────────────────────────────────────────────
    private final List<Region> regions = new ArrayList<>();
    private Category category = lastCategory;
    private Module selected;
    private String query = "";
    private boolean queryFocused;
    private Module binding;
    private int listScroll;
    private int inspectorScroll;
    private boolean themeOpen;
    private StringSetting editingText;

    // drag state
    private NumberSetting dragNumber;
    private ColorSetting dragColor;
    private int dragChannel;
    private String dragThemeKey;
    private int dragTrackX;
    private int dragTrackW;

    // ── geometry ────────────────────────────────────────────────────────
    private int winX;
    private int winY;
    private int winW;
    private int winH;
    private int listX;
    private int listY;
    private int listW;
    private int inspectorX;
    private int inspectorTop;
    private int inspectorBottom;
    private int contentHeight;
    private int maxInspectorScroll;
    private int maxListScroll;

    public ClickGuiScreen() {
        super(Text.literal("Orbit"));
    }

    @Override
    protected void init() {
        if (lastName != null) {
            selected = ModuleRegistry.all().stream()
                    .filter(m -> m.getName().equals(lastName))
                    .findFirst()
                    .orElse(null);
        }
        category = lastCategory;
        inspectorScroll = 0;
        listScroll = 0;
    }

    // ════════════════════════════════════════════════════════════════════
    //  render
    // ════════════════════════════════════════════════════════════════════

    @Override
    public void render(DrawContext context, int mouseX, int mouseY, float delta) {
        renderBackground(context, mouseX, mouseY, delta);

        computeGeometry();
        regions.clear();

        drawWindow(context);
        drawTitlebar(context, mouseX, mouseY);
        drawRail(context, mouseX, mouseY);
        drawList(context, mouseX, mouseY);
        drawInspector(context, mouseX, mouseY);

        if (themeOpen) {
            drawThemePanel(context, mouseX, mouseY);
        }
        if (binding != null) {
            drawBindingOverlay(context);
        }
    }

    /**
     * Flat dim instead of vanilla's background.
     *
     * <p>Vanilla's implementation runs the menu blur: a full-screen, multi-pass blur of the world
     * every frame. Together with the old per-row drawing that is what pushed the menu to 15 fps. One
     * quad does the same job here - the world stays visible behind the window, which is the point of
     * a client GUI.
     */
    @Override
    public void renderBackground(DrawContext context, int mouseX, int mouseY, float delta) {
        context.fill(0, 0, width, height, 0x44000000);
    }

    private void computeGeometry() {
        winW = MathHelper.clamp(Math.round(width * 0.82f), 400, 660);
        winH = MathHelper.clamp(Math.round(height * 0.80f), 230, 380);
        winX = (width - winW) / 2;
        winY = (height - winH) / 2;

        listX = winX + RAIL_W + PAD;
        listY = winY + TITLEBAR_H + PAD;
        listW = winW - RAIL_W - INSPECTOR_W - PAD * 2;
        inspectorX = winX + winW - INSPECTOR_W;
        inspectorTop = winY + TITLEBAR_H + 4;
        inspectorBottom = winY + winH - PAD;
    }

    private void drawWindow(DrawContext context) {
        Rounded.shadow(context, winX, winY, winW, winH, RADIUS + 2, 4);
        Rounded.panel(context, winX, winY, winW, winH, RADIUS + 2,
                Theme.bgTop(), Theme.alpha(Theme.bg(), 236), Theme.border());
        // thin accent hairline along the top edge
        Rounded.fillHorizontal(context, winX + RADIUS, winY, winW - RADIUS * 2, 1, 0,
                Theme.alpha(Theme.accent(), 0x00), Theme.alpha(Theme.accent(), 0xAA));
        Rounded.fillHorizontal(context, winX + RADIUS, winY + 1, winW - RADIUS * 2, 1, 0,
                Theme.alpha(Theme.accentAlt(), 0x33), Theme.alpha(Theme.accent(), 0x33));
    }

    private void drawTitlebar(DrawContext context, int mouseX, int mouseY) {
        // accent dot
        Rounded.fill(context, winX + PAD + 1, winY + 9, 6, 6, 3, Theme.accent());
        context.drawText(textRenderer, "Orbit", winX + PAD + 12, winY + 8, Theme.text(), false);
        int wordEnd = winX + PAD + 12 + textRenderer.getWidth("Orbit") + 5;
        context.drawText(textRenderer, Orbit.VERSION, wordEnd, winY + 9, Theme.textFaint(), false);

        // theme button
        String themeLabel = "Theme";
        int themeW = textRenderer.getWidth(themeLabel) + 16;
        int themeX = winX + winW - themeW - PAD - 54;
        drawChip(context, themeX, winY + 6, themeW, 12, themeLabel, themeOpen, mouseX, mouseY);
        regions.add(new Region(themeX, winY + 6, themeW, 12, Kind.THEME_BUTTON, null, null, null, 0, ""));

        // keybind chip
        String hint = "RSHIFT";
        int hintW = textRenderer.getWidth(hint) + 12;
        int hintX = winX + winW - hintW - PAD;
        Rounded.fill(context, hintX, winY + 6, hintW, 12, 6, Theme.card());
        Rounded.outline(context, hintX, winY + 6, hintW, 12, 6, Theme.border());
        context.drawText(textRenderer, hint, hintX + 6, winY + 9, Theme.textFaint(), false);
    }

    private void drawRail(DrawContext context, int mouseX, int mouseY) {
        int railX = winX + 1;
        int railTop = winY + TITLEBAR_H;
        int railBottom = winY + winH - 1;
        Rounded.fill(context, railX, railTop, RAIL_W - 1, railBottom - railTop, 0, Theme.rail());

        int y = railTop + 6;
        for (Category cat : Category.values()) {
            boolean active = cat == category;
            boolean hovered = mouseX >= railX && mouseX < railX + RAIL_W - 1 && mouseY >= y && mouseY < y + ROW_H;

            if (active) {
                Rounded.fillGradient(context, railX + 4, y, RAIL_W - 9, ROW_H, 6,
                        Theme.alpha(Theme.accent(), 0x3A), Theme.alpha(Theme.accentAlt(), 0x18));
                Rounded.outline(context, railX + 4, y, RAIL_W - 9, ROW_H, 6, Theme.borderAccent());
                Rounded.fill(context, railX + 4, y + 4, 2, ROW_H - 8, 1, Theme.accent());
            } else if (hovered) {
                Rounded.fill(context, railX + 4, y, RAIL_W - 9, ROW_H, 6, Theme.cardHover());
            }

            int color = active ? Theme.text() : Theme.textMuted();
            OrbitThemeIcons.draw(context, cat.ordinal(), railX + 12, y + 6, color);
            context.drawText(textRenderer, cat.getDisplayName(), railX + 26, y + 7, color, false);

            int count = ModuleRegistry.byCategory(cat).size();
            if (count > 0) {
                String countText = String.valueOf(count);
                context.drawText(textRenderer, countText,
                        railX + RAIL_W - 12 - textRenderer.getWidth(countText), y + 7,
                        active ? Theme.accent() : Theme.textFaint(), false);
            }

            regions.add(new Region(railX + 4, y, RAIL_W - 9, ROW_H, Kind.CATEGORY, cat, null, null, 0, ""));
            y += ROW_H + 2;
        }
    }

    private void drawList(DrawContext context, int mouseX, int mouseY) {
        // search
        int searchY = listY;
        Rounded.fill(context, listX, searchY, listW, SEARCH_H, 6,
                queryFocused ? Theme.alpha(Theme.accent(), 0x14) : Theme.card());
        Rounded.outline(context, listX, searchY, listW, SEARCH_H, 6,
                queryFocused ? Theme.borderAccent() : Theme.border());
        OrbitThemeIcons.drawSearch(context, listX + 6, searchY + 5, Theme.textFaint());
        String shown = query.isEmpty() ? "Search modules" : query;
        context.drawText(textRenderer, shown, listX + 19, searchY + 5,
                query.isEmpty() ? Theme.textFaint() : Theme.text(), false);
        if (queryFocused && (System.currentTimeMillis() / 500) % 2 == 0) {
            int caretX = listX + 19 + (query.isEmpty() ? 0 : textRenderer.getWidth(query) + 1);
            context.fill(caretX, searchY + 4, caretX + 1, searchY + 13, Theme.accent());
        }
        regions.add(new Region(listX, searchY, listW, SEARCH_H, Kind.SEARCH, null, null, null, 0, ""));

        // grid
        int gridTop = searchY + SEARCH_H + 7;
        int gridBottom = winY + winH - PAD;
        List<Module> visible = ModuleRegistry.byCategory(category).stream()
                .filter(m -> query.isEmpty() || m.getName().toLowerCase().contains(query.toLowerCase()))
                .toList();

        int colW = (listW - COL_GAP) / 2;
        int rowsVisible = Math.max(1, (gridBottom - gridTop) / (ROW_H + ROW_GAP));
        int totalRows = (visible.size() + 1) / 2;
        maxListScroll = Math.max(0, totalRows - rowsVisible);
        listScroll = MathHelper.clamp(listScroll, 0, maxListScroll);

        if (visible.isEmpty()) {
            String empty = ModuleRegistry.byCategory(category).isEmpty() ? "Nothing here yet" : "No matches";
            context.drawCenteredTextWithShadow(textRenderer, empty, listX + listW / 2, gridTop + 16,
                    Theme.textFaint());
            return;
        }

        context.enableScissor(listX, gridTop, listX + listW, gridBottom);
        for (int i = 0; i < visible.size(); i++) {
            int row = i / 2 - listScroll;
            if (row < 0 || row >= rowsVisible) {
                continue;
            }
            int x = listX + (i % 2) * (colW + COL_GAP);
            int y = gridTop + row * (ROW_H + ROW_GAP);
            drawModuleCard(context, visible.get(i), x, y, colW, mouseX, mouseY);
        }
        context.disableScissor();

        if (maxListScroll > 0) {
            drawScrollbar(context, listX + listW - 2, gridTop, gridBottom - gridTop, rowsVisible, totalRows, listScroll);
        }
    }

    private void drawModuleCard(DrawContext context, Module module, int x, int y, int w, int mouseX, int mouseY) {
        boolean on = module.isEnabled();
        boolean hovered = mouseX >= x && mouseX < x + w && mouseY >= y && mouseY < y + ROW_H;
        boolean isSelected = module == selected;

        if (on) {
            Rounded.fillGradient(context, x, y, w, ROW_H, 6,
                    Theme.alpha(Theme.accent(), 0x3C), Theme.alpha(Theme.accentAlt(), 0x14));
            Rounded.outline(context, x, y, w, ROW_H, 6, Theme.borderAccent());
            Rounded.glow(context, x, y, w, ROW_H, 6, 0x14);
        } else {
            Rounded.fill(context, x, y, w, ROW_H, 6, hovered ? Theme.cardHover() : Theme.card());
            Rounded.outline(context, x, y, w, ROW_H, 6, hovered ? Theme.border() : 0x14FFFFFF);
        }
        if (isSelected) {
            Rounded.fill(context, x + 3, y + 4, 2, ROW_H - 8, 1, Theme.accent());
        }

        int textColor = on ? Theme.text() : Theme.textMuted();
        int reserve = 34;
        if (module.isBound()) {
            String bindName = module.getKeybind().displayName();
            int bindW = textRenderer.getWidth(bindName) + 8;
            Rounded.fill(context, x + w - 30 - bindW, y + 5, bindW, 10, 3,
                    Theme.alpha(on ? Theme.accent() : 0xFF6C6679, 0x33));
            context.drawText(textRenderer, bindName, x + w - 26 - bindW, y + 6,
                    on ? Theme.accent() : Theme.textFaint(), false);
            reserve += bindW;
        }
        String label = textRenderer.trimToWidth(module.getName(), w - reserve - 8);
        context.drawText(textRenderer, label, x + 10, y + 6, textColor, false);
        drawSwitch(context, x + w - 28, y + 5, on);

        regions.add(new Region(x, y, w - 30, ROW_H, Kind.MODULE, module.getCategory(), module, null, 0, ""));
        regions.add(new Region(x + w - 30, y, 30, ROW_H, Kind.MODULE_TOGGLE, module.getCategory(), module, null, 0, ""));
    }

    private void drawInspector(DrawContext context, int mouseX, int mouseY) {
        Rounded.fill(context, inspectorX, inspectorTop, INSPECTOR_W - 1, inspectorBottom - inspectorTop, 6, Theme.rail());
        Rounded.outline(context, inspectorX, inspectorTop, INSPECTOR_W - 1, inspectorBottom - inspectorTop, 6, 0x10FFFFFF);

        int x = inspectorX + 10;
        int w = INSPECTOR_W - 20;
        int top = inspectorTop + 9;

        if (selected == null) {
            context.drawText(textRenderer, "No module selected", x, top, Theme.textFaint(), false);
            context.drawText(textRenderer, "Pick one on the left", x, top + 11, Theme.textFaint(), false);
            return;
        }

        // Keep the scrollable settings above the pinned keybind row. Input uses the same
        // viewport, so a clipped setting cannot steal a click from the keybind or titlebar.
        int bottom = InspectorViewport.bottom(inspectorBottom);
        context.enableScissor(inspectorX, InspectorViewport.top(inspectorTop),
                inspectorX + INSPECTOR_W - 2, bottom);

        int y = top - inspectorScroll;

        context.drawText(textRenderer, textRenderer.trimToWidth(selected.getName(), w), x, y,
                selected.isEnabled() ? Theme.accent() : Theme.text(), false);
        y += 11;
        Rounded.fillHorizontal(context, x, y, 26, 1, 0, Theme.accent(), Theme.alpha(Theme.accentAlt(), 0x00));
        y += 6;

        for (var line : textRenderer.wrapLines(Text.literal(selected.getDescription()), w)) {
            context.drawText(textRenderer, line, x, y, Theme.textFaint(), false);
            y += textRenderer.fontHeight + 1;
        }
        y += 8;

        for (Setting<?> setting : selected.getSettings()) {
            if (setting instanceof NumberSetting number) {
                y = drawNumberSetting(context, number, x, y, w, mouseX, mouseY);
            } else if (setting instanceof BoolSetting bool) {
                boolean hovered = isHovered(mouseX, mouseY, x, y - 1, w, 15);
                context.drawText(textRenderer, setting.getName(), x, y, hovered ? Theme.text() : Theme.textMuted(), false);
                drawSwitch(context, x + w - 20, y - 1, bool.get());
                regions.add(new Region(x + w - 24, y - 3, 26, 15, Kind.SETTING_TOGGLE,
                        selected.getCategory(), selected, setting, 0, ""));
                y += 19;
            } else if (setting instanceof ModeSetting mode) {
                context.drawText(textRenderer, mode.getName(), x, y, Theme.textFaint(), false);
                y += 11;
                List<String> modes = mode.getModes();
                int gap = 3;
                int segW = (w - (modes.size() - 1) * gap) / modes.size();
                for (int i = 0; i < modes.size(); i++) {
                    int segX = x + i * (segW + gap);
                    boolean sel = modes.get(i).equals(mode.get());
                    if (sel) {
                        Rounded.fillGradient(context, segX, y, segW, 13, 4,
                                Theme.alpha(Theme.accent(), 0x50), Theme.alpha(Theme.accentAlt(), 0x28));
                        Rounded.outline(context, segX, y, segW, 13, 4, Theme.borderAccent());
                    } else {
                        Rounded.fill(context, segX, y, segW, 13, 4, Theme.card());
                    }
                    String label = textRenderer.trimToWidth(modes.get(i), segW - 6);
                    context.drawCenteredTextWithShadow(textRenderer, label, segX + segW / 2, y + 3,
                            sel ? Theme.text() : Theme.textFaint());
                    regions.add(new Region(segX, y, segW, 13, Kind.MODE,
                            selected.getCategory(), selected, setting, i, ""));
                }
                y += 21;
            } else if (setting instanceof ColorSetting color) {
                y = drawColorSetting(context, color, x, y, w, mouseX, mouseY);
            } else if (setting instanceof StringSetting text) {
                y = drawStringSetting(context, text, x, y, w, mouseX, mouseY);
            }
        }

        contentHeight = (y + inspectorScroll) - top + 18;
        maxInspectorScroll = Math.max(0, contentHeight - (bottom - top));
        context.disableScissor();

        if (maxInspectorScroll > 0) {
            drawScrollbar(context, inspectorX + INSPECTOR_W - 4, inspectorTop + 4, bottom - inspectorTop - 8,
                    bottom - top, contentHeight, inspectorScroll);
        }

        // keybind row pinned to the bottom
        int bindY = inspectorBottom - 15;
        context.fill(inspectorX + 8, bindY - 5, inspectorX + INSPECTOR_W - 9, bindY - 4, 0x14FFFFFF);
        context.drawText(textRenderer, "Keybind", x, bindY, Theme.textFaint(), false);
        String keyName = selected.getKeybind().displayName();
        int keyW = textRenderer.getWidth(keyName) + 12;
        int keyX = x + w - keyW;
        Rounded.fill(context, keyX, bindY - 2, keyW, 12, 5, Theme.card());
        Rounded.outline(context, keyX, bindY - 2, keyW, 12, 5, Theme.border());
        context.drawText(textRenderer, keyName, keyX + 6, bindY, Theme.textMuted(), false);
        regions.add(new Region(keyX - 2, bindY - 4, keyW + 4, 16, Kind.BIND,
                selected.getCategory(), selected, null, 0, ""));
    }

    private int drawNumberSetting(DrawContext context, NumberSetting number, int x, int y, int w,
                                  int mouseX, int mouseY) {
        context.drawText(textRenderer, number.getName(), x, y, Theme.textMuted(), false);
        String value = number.displayValue();
        context.drawText(textRenderer, value, x + w - textRenderer.getWidth(value), y, Theme.accent(), false);

        int trackY = y + 11;
        drawTrack(context, x, trackY, w, number.progress());
        regions.add(new Region(x, trackY - 3, w, 10, Kind.SLIDER, selected.getCategory(), selected, number, 0, ""));
        return y + 22;
    }

    private int drawColorSetting(DrawContext context, ColorSetting color, int x, int y, int w,
                                 int mouseX, int mouseY) {
        String hex = color.getHex();
        context.drawText(textRenderer, color.getName(), x, y, Theme.textMuted(), false);
        context.drawText(textRenderer, hex, x + w - textRenderer.getWidth(hex), y, Theme.textFaint(), false);

        int swatchX = x + w - textRenderer.getWidth(hex) - 14;
        Rounded.fillGradient(context, swatchX, y - 1, 10, 10, 3, color.getRgb(), color.getRgbDark());
        Rounded.outline(context, swatchX, y - 1, 10, 10, 3, 0x33FFFFFF);

        // H / S / B mini sliders
        int[] channels = {0, 1, 2};
        float[] values = {color.getHue() / 360f, color.getSaturation() / 100f, color.getBrightness() / 100f};
        String[] labels = {"H", "S", "B"};
        int rowY = y + 12;
        for (int i = 0; i < channels.length; i++) {
            context.drawText(textRenderer, labels[i], x, rowY + 1, Theme.textFaint(), false);
            int trackX = x + 9;
            int trackW = w - 9;
            drawTrack(context, trackX, rowY + 2, trackW, values[i]);
            regions.add(new Region(trackX, rowY - 2, trackW, 9, Kind.COLOR_SLIDER,
                    selected.getCategory(), selected, color, channels[i], ""));
            rowY += 10;
        }
        return rowY + 6;
    }

    private int drawStringSetting(DrawContext context, StringSetting text, int x, int y, int w,
                                  int mouseX, int mouseY) {
        boolean focused = editingText == text;
        context.drawText(textRenderer, text.getName(), x, y, focused ? Theme.text() : Theme.textMuted(), false);
        y += 10;

        int fieldH = 13;
        Rounded.fill(context, x, y, w, fieldH, 5,
                focused ? Theme.alpha(Theme.accent(), 0x18) : Theme.card());
        Rounded.outline(context, x, y, w, fieldH, 5, focused ? Theme.borderAccent() : Theme.border());

        String shown = text.get();
        if (shown.isEmpty() && !focused) {
            context.drawText(textRenderer, "(empty)", x + 5, y + 3, Theme.textFaint(), false);
        } else {
            String trimmed = textRenderer.trimToWidth(shown, w - 10);
            context.drawText(textRenderer, trimmed, x + 5, y + 3, Theme.text(), false);
            if (focused && (System.currentTimeMillis() / 500) % 2 == 0) {
                int caretX = x + 5 + textRenderer.getWidth(trimmed) + 1;
                context.fill(caretX, y + 2, caretX + 1, y + fieldH - 2, Theme.accent());
            }
        }
        regions.add(new Region(x, y, w, fieldH, Kind.TEXT_FIELD,
                selected.getCategory(), selected, text, 0, ""));
        return y + fieldH + 8;
    }

    /** Slider track with an accent gradient fill and a rounded knob. */
    private void drawTrack(DrawContext context, int x, int y, int w, float progress) {
        int height = 3;
        Rounded.fill(context, x, y, w, height, 2, Theme.track());
        int filled = Math.round(w * MathHelper.clamp(progress, 0f, 1f));
        if (filled > 0) {
            Rounded.fillHorizontal(context, x, y, filled, height, 2, Theme.accent(), Theme.accentAlt());
        }
        int knobX = Math.max(x + 1, Math.min(x + w - 3, x + filled - 2));
        Rounded.fill(context, knobX - 1, y - 3, 4, height + 6, 2, Theme.text());
    }

    private void drawSwitch(DrawContext context, int x, int y, boolean on) {
        int w = 20;
        int h = 11;
        if (on) {
            Rounded.fillHorizontal(context, x, y, w, h, 5, Theme.accent(), Theme.accentAlt());
            Rounded.fill(context, x + w - 9, y + 1, 8, h - 2, 4, 0xFF17131F);
        } else {
            Rounded.fill(context, x, y, w, h, 5, Theme.track());
            Rounded.outline(context, x, y, w, h, 5, 0x18FFFFFF);
            Rounded.fill(context, x + 1, y + 1, 9, h - 2, 4, Theme.textFaint());
        }
    }

    private void drawChip(DrawContext context, int x, int y, int w, int h, String label, boolean active,
                          int mouseX, int mouseY) {
        boolean hovered = isHovered(mouseX, mouseY, x, y, w, h);
        if (active) {
            Rounded.fillGradient(context, x, y, w, h, 6,
                    Theme.alpha(Theme.accent(), 0x44), Theme.alpha(Theme.accentAlt(), 0x22));
            Rounded.outline(context, x, y, w, h, 6, Theme.borderAccent());
        } else {
            Rounded.fill(context, x, y, w, h, 6, hovered ? Theme.cardHover() : Theme.card());
            Rounded.outline(context, x, y, w, h, 6, Theme.border());
        }
        context.drawCenteredTextWithShadow(textRenderer, label, x + w / 2, y + (h - 8) / 2,
                active ? Theme.text() : Theme.textMuted());
    }

    private void drawScrollbar(DrawContext context, int x, int y, int height, int visible, int total, int scroll) {
        int barH = Math.max(14, (int) ((float) visible / total * height));
        int barY = y + (int) ((float) scroll / Math.max(1, total - visible) * (height - barH));
        Rounded.fill(context, x, y, 2, height, 1, 0x14FFFFFF);
        Rounded.fill(context, x, barY, 2, barH, 1, Theme.accent());
    }

    // ════════════════════════════════════════════════════════════════════
    //  theme editor
    // ════════════════════════════════════════════════════════════════════

    private void drawThemePanel(DrawContext context, int mouseX, int mouseY) {
        int w = Math.min(winW - 44, 330);
        int h = 236;
        int x = winX + (winW - w) / 2;
        int y = winY + (winH - h) / 2;

        Rounded.shadow(context, x, y, w, h, 11, 4);
        Rounded.panel(context, x, y, w, h, 11, Theme.bgTop(), Theme.alpha(Theme.bg(), 250), Theme.borderAccent());

        context.drawText(textRenderer, "Theme", x + 14, y + 12, Theme.text(), false);
        String presetName = Theme.presetName();
        context.drawText(textRenderer, presetName, x + 14 + textRenderer.getWidth("Theme") + 6, y + 13,
                Theme.textFaint(), false);

        // close chip
        int closeX = x + w - 26;
        drawChip(context, closeX, y + 9, 14, 14, "x", false, mouseX, mouseY);
        regions.add(new Region(closeX, y + 9, 14, 14, Kind.THEME_CLOSE, null, null, null, 0, ""));

        // presets
        int presetTop = y + 32;
        int columns = 4;
        int chipH = 20;
        int gap = 5;
        int chipW = (w - 28 - (columns - 1) * gap) / columns;
        for (int i = 0; i < Theme.PRESETS.size(); i++) {
            Theme.Preset preset = Theme.PRESETS.get(i);
            int px = x + 14 + (i % columns) * (chipW + gap);
            int py = presetTop + (i / columns) * (chipH + gap);
            boolean active = preset.name().equals(presetName);

            Rounded.fill(context, px, py, chipW, chipH, 6, active ? Theme.cardHover() : Theme.card());
            Rounded.outline(context, px, py, chipW, chipH, 6, active ? Theme.borderAccent() : Theme.border());
            int swatch = Theme.hsb(preset.hue(), preset.saturation(), preset.brightness(), 255);
            Rounded.fillHorizontal(context, px + 1, py + chipH - 4, chipW - 2, 3, 1, swatch,
                    Theme.hsb(preset.hue() + 32f, preset.saturation(), preset.brightness(), 255));
            context.drawCenteredTextWithShadow(textRenderer, preset.name(), px + chipW / 2, py + 5,
                    active ? Theme.text() : Theme.textMuted());
            regions.add(new Region(px, py, chipW, chipH, Kind.THEME_PRESET, null, null, null, i, ""));
        }

        // sliders
        int sliderTop = presetTop + 2 * (chipH + gap) + 8;
        int sliderW = w - 28;
        sliderTop = themeSlider(context, x + 14, sliderTop, sliderW, "Hue", (int) Theme.getHue() + "°",
                Theme.getHue() / 360f, "hue", mouseX, mouseY);
        sliderTop = themeSlider(context, x + 14, sliderTop, sliderW, "Saturation", (int) Theme.getSaturation() + "%",
                Theme.getSaturation() / 100f, "sat", mouseX, mouseY);
        sliderTop = themeSlider(context, x + 14, sliderTop, sliderW, "Brightness", (int) Theme.getBrightness() + "%",
                Theme.getBrightness() / 100f, "bri", mouseX, mouseY);
        sliderTop = themeSlider(context, x + 14, sliderTop, sliderW, "Panel Opacity",
                Math.round(Theme.getOpacity() * 100f) + "%", (Theme.getOpacity() - 0.5f) / 0.5f, "opacity",
                mouseX, mouseY);

        // toggles
        int toggleY = sliderTop + 4;
        int toggleW = (sliderW - 6) / 2;
        drawToggleChip(context, x + 14, toggleY, toggleW, "Gradient", Theme.isGradient(), mouseX, mouseY);
        regions.add(new Region(x + 14, toggleY, toggleW, 18, Kind.THEME_TOGGLE, null, null, null, 0, "gradient"));
        drawToggleChip(context, x + 14 + toggleW + 6, toggleY, toggleW, "Rainbow", Theme.isRainbow(), mouseX, mouseY);
        regions.add(new Region(x + 14 + toggleW + 6, toggleY, toggleW, 18, Kind.THEME_TOGGLE, null, null, null, 1, "rainbow"));
    }

    private int themeSlider(DrawContext context, int x, int y, int w, String label, String valueText,
                            float progress, String key, int mouseX, int mouseY) {
        boolean active = key.equals(dragThemeKey);
        context.drawText(textRenderer, label, x, y, active ? Theme.text() : Theme.textMuted(), false);
        context.drawText(textRenderer, valueText, x + w - textRenderer.getWidth(valueText), y, Theme.accent(), false);
        int trackY = y + 12;
        drawTrack(context, x, trackY, w, progress);
        regions.add(new Region(x, trackY - 4, w, 11, Kind.THEME_SLIDER, null, null, null, 0, key));
        return y + 26;
    }

    private void drawToggleChip(DrawContext context, int x, int y, int w, String label, boolean on,
                                int mouseX, int mouseY) {
        boolean hovered = isHovered(mouseX, mouseY, x, y, w, 18);
        Rounded.fill(context, x, y, w, 18, 6, on ? Theme.alpha(Theme.accent(), 0x30)
                : (hovered ? Theme.cardHover() : Theme.card()));
        Rounded.outline(context, x, y, w, 18, 6, on ? Theme.borderAccent() : Theme.border());
        context.drawText(textRenderer, label, x + 8, y + 5, on ? Theme.text() : Theme.textMuted(), false);
        drawSwitch(context, x + w - 26, y + 4, on);
    }

    private void drawBindingOverlay(DrawContext context) {
        String text = "Press a key or mouse button for " + binding.getName() + "  -  Esc clears";
        int y = winY + winH - 17;
        Rounded.fill(context, winX + 2, y, winW - 4, 15, 6, 0xC0100C18);
        context.drawCenteredTextWithShadow(textRenderer, text, winX + winW / 2, y + 4, Theme.accent());
    }

    // ════════════════════════════════════════════════════════════════════
    //  input
    // ════════════════════════════════════════════════════════════════════

    @Override
    public boolean mouseClicked(Click click, boolean doubled) {
        double mouseX = click.x();
        double mouseY = click.y();

        if (binding != null) {
            // capture the mouse button as the bind (left = 0, right = 1, ...)
            setBind(binding, Keybind.mouse(click.button()));
            binding = null;
            return true;
        }

        for (Region region : regions) {
            if (!region.contains(mouseX, mouseY)) {
                continue;
            }
            if (region.kind.isInspectorSetting() && !InspectorViewport.contains(mouseX, mouseY,
                    inspectorX, inspectorX + INSPECTOR_W - 2, inspectorTop, inspectorBottom)) {
                continue;
            }
            // while the theme editor is open it is modal - only its own controls react
            if (themeOpen && !region.kind.isTheme()) {
                continue;
            }
            switch (region.kind) {
                case THEME_BUTTON -> {
                    themeOpen = !themeOpen;
                    queryFocused = false;
                    return true;
                }
                case THEME_CLOSE -> {
                    themeOpen = false;
                    return true;
                }
                case THEME_PRESET -> {
                    Theme.applyPreset(Theme.PRESETS.get(region.index));
                    touchConfig();
                    return true;
                }
                case THEME_SLIDER -> {
                    dragThemeKey = region.key;
                    dragTrackX = region.x;
                    dragTrackW = region.w;
                    applyThemeSlider(region.key, ((mouseX - region.x) / (double) region.w));
                    return true;
                }
                case THEME_TOGGLE -> {
                    if ("gradient".equals(region.key)) {
                        Theme.setGradient(!Theme.isGradient());
                    } else {
                        Theme.setRainbow(!Theme.isRainbow());
                    }
                    touchConfig();
                    return true;
                }
                case CATEGORY -> {
                    category = region.category;
                    lastCategory = category;
                    listScroll = 0;
                    queryFocused = false;
                    return true;
                }
                case SEARCH -> {
                    queryFocused = true;
                    return true;
                }
                case MODULE -> {
                    selected = region.module;
                    lastName = selected.getName();
                    inspectorScroll = 0;
                    queryFocused = false;
                    return true;
                }
                case MODULE_TOGGLE -> {
                    selected = region.module;
                    lastName = selected.getName();
                    inspectorScroll = 0;
                    region.module.toggle();
                    touchConfig();
                    return true;
                }
                case SETTING_TOGGLE -> {
                    if (region.setting != null) {
                        region.setting.onClick();
                        touchConfig();
                    }
                    return true;
                }
                case SLIDER -> {
                    if (region.setting instanceof NumberSetting number) {
                        dragNumber = number;
                        dragTrackX = region.x;
                        dragTrackW = region.w;
                        applyNumberSlider(mouseX);
                    }
                    return true;
                }
                case COLOR_SLIDER -> {
                    if (region.setting instanceof ColorSetting color) {
                        dragColor = color;
                        dragChannel = region.index;
                        dragTrackX = region.x;
                        dragTrackW = region.w;
                        applyColorSlider(mouseX);
                    }
                    return true;
                }
                case TEXT_FIELD -> {
                    editingText = region.setting instanceof StringSetting text ? text : null;
                    queryFocused = false;
                    return true;
                }
                case MODE -> {
                    if (region.setting instanceof ModeSetting mode) {
                        mode.set(mode.getModes().get(region.index));
                        touchConfig();
                    }
                    return true;
                }
                case BIND -> {
                    if (click.button() == 0) {
                        binding = region.module;
                    }
                    return true;
                }
                default -> {
                }
            }
        }
        if (themeOpen) {
            themeOpen = false;
        }
        editingText = null;
        queryFocused = false;
        return super.mouseClicked(click, doubled);
    }

    @Override
    public boolean mouseDragged(Click click, double offsetX, double offsetY) {
        if (dragNumber != null) {
            applyNumberSlider(click.x());
            return true;
        }
        if (dragColor != null) {
            applyColorSlider(click.x());
            return true;
        }
        if (dragThemeKey != null) {
            applyThemeSlider(dragThemeKey, (click.x() - dragTrackX) / (double) dragTrackW);
            return true;
        }
        return super.mouseDragged(click, offsetX, offsetY);
    }

    @Override
    public boolean mouseReleased(Click click) {
        dragNumber = null;
        dragColor = null;
        dragThemeKey = null;
        return super.mouseReleased(click);
    }

    @Override
    public boolean mouseScrolled(double mouseX, double mouseY, double horizontal, double vertical) {
        double step = -Math.signum(vertical) * 12;
        boolean overInspector = mouseX >= inspectorX && mouseX <= inspectorX + INSPECTOR_W
                && mouseY >= inspectorTop && mouseY <= inspectorBottom;
        if (overInspector && maxInspectorScroll > 0) {
            inspectorScroll = (int) MathHelper.clamp(inspectorScroll + step, 0, maxInspectorScroll);
            return true;
        }
        if (maxListScroll > 0) {
            listScroll = (int) MathHelper.clamp(listScroll - Math.signum(vertical), 0, maxListScroll);
            return true;
        }
        return super.mouseScrolled(mouseX, mouseY, horizontal, vertical);
    }

    private void applyNumberSlider(double mouseX) {
        if (dragNumber == null) {
            return;
        }
        float progress = (float) MathHelper.clamp((mouseX - dragTrackX) / Math.max(1, dragTrackW), 0f, 1f);
        dragNumber.set(dragNumber.getMin() + progress * (dragNumber.getMax() - dragNumber.getMin()));
        touchConfig();
    }

    private void applyColorSlider(double mouseX) {
        if (dragColor == null) {
            return;
        }
        float progress = (float) MathHelper.clamp((mouseX - dragTrackX) / Math.max(1, dragTrackW), 0f, 1f);
        switch (dragChannel) {
            case 0 -> dragColor.setHue(progress * 360f);
            case 1 -> dragColor.setSaturation(progress * 100f);
            default -> dragColor.setBrightness(5f + progress * 95f);
        }
        touchConfig();
    }

    private void applyThemeSlider(String key, double progress) {
        float p = (float) MathHelper.clamp(progress, 0.0, 1.0);
        switch (key) {
            case "hue" -> Theme.setHue(p * 360f);
            case "sat" -> Theme.setSaturation(p * 100f);
            case "bri" -> Theme.setBrightness(20f + p * 80f);
            case "opacity" -> Theme.setOpacity(0.5f + p * 0.5f);
            default -> {
                return;
            }
        }
        touchConfig();
    }

    private void touchConfig() {
        Orbit.config().markDirty();
    }

    @Override
    public boolean keyPressed(KeyInput input) {
        int key = input.key();

        // clipboard: typing arrives as charTyped, but Ctrl+V never reaches it, so paste has to be
        // handled here. Without this the URL box (and every other text field) is paste-proof.
        boolean control = (input.modifiers() & org.lwjgl.glfw.GLFW.GLFW_MOD_CONTROL) != 0;
        if (key == InputUtil.GLFW_KEY_V && control) {
            if (editingText != null) {
                editingText.set(editingText.get() + sanitiseClipboard());
                touchConfig();
                return true;
            }
            if (queryFocused) {
                query += sanitiseClipboard();
                return true;
            }
        }

        if (binding != null) {
            setBind(binding, key == InputUtil.GLFW_KEY_ESCAPE ? Keybind.UNBOUND : Keybind.keyboard(key));
            binding = null;
            return true;
        }

        if (editingText != null) {
            if (key == InputUtil.GLFW_KEY_ESCAPE || key == InputUtil.GLFW_KEY_ENTER) {
                editingText = null;
                touchConfig();
                return true;
            }
            if (key == InputUtil.GLFW_KEY_BACKSPACE) {
                String value = editingText.get();
                if (!value.isEmpty()) {
                    editingText.set(value.substring(0, value.length() - 1));
                }
                return true;
            }
        }

        if (themeOpen && key == InputUtil.GLFW_KEY_ESCAPE) {
            themeOpen = false;
            return true;
        }

        if (queryFocused) {
            if (key == InputUtil.GLFW_KEY_ESCAPE) {
                queryFocused = false;
                return true;
            }
            if (key == InputUtil.GLFW_KEY_BACKSPACE) {
                if (!query.isEmpty()) {
                    query = query.substring(0, query.length() - 1);
                }
                return true;
            }
        }

        if (key == InputUtil.GLFW_KEY_RIGHT_SHIFT) {
            close();
            return true;
        }
        return super.keyPressed(input);
    }

    /** Clipboard text minus anything that would corrupt a config value or a command string. */
    private static String sanitiseClipboard() {
        String clip = MinecraftClient.getInstance().keyboard.getClipboard();
        if (clip == null) {
            return "";
        }
        // newlines and tabs would break the single-line fields and the JSON config
        return clip.replaceAll("[\\r\\n\\t]", "").trim();
    }

    @Override
    public boolean charTyped(CharInput input) {
        if (editingText != null) {
            if (input.isValidChar()) {
                editingText.set(editingText.get() + input.asString());
                touchConfig();
            }
            return true;
        }
        if (queryFocused && input.isValidChar()) {
            query += input.asString();
            return true;
        }
        return super.charTyped(input);
    }

    @Override
    public void close() {
        lastCategory = category;
        lastName = selected == null ? null : selected.getName();
        Orbit.config().save();
        super.close();
    }

    @Override
    public boolean shouldPause() {
        return false;
    }

    // ════════════════════════════════════════════════════════════════════
    //  helpers
    // ════════════════════════════════════════════════════════════════════

    private static boolean isHovered(int mouseX, int mouseY, int x, int y, int w, int h) {
        return mouseX >= x && mouseX < x + w && mouseY >= y && mouseY < y + h;
    }

    /** Applies a bind in one place: module, vanilla keybinding and config. */
    private void setBind(Module module, Keybind bind) {
        KeybindManager.set(module, bind);
        touchConfig();
    }

    private enum Kind {
        CATEGORY, MODULE, MODULE_TOGGLE, SEARCH, SETTING_TOGGLE, SLIDER, COLOR_SLIDER, TEXT_FIELD, MODE, BIND,
        THEME_BUTTON, THEME_CLOSE, THEME_PRESET, THEME_SLIDER, THEME_TOGGLE;

        boolean isTheme() {
            return this == THEME_BUTTON || this == THEME_CLOSE || this == THEME_PRESET
                    || this == THEME_SLIDER || this == THEME_TOGGLE;
        }

        boolean isInspectorSetting() {
            return this == SETTING_TOGGLE || this == SLIDER || this == COLOR_SLIDER
                    || this == TEXT_FIELD || this == MODE;
        }
    }

    private record Region(int x, int y, int w, int h, Kind kind, Category category, Module module,
                          Setting<?> setting, int index, String key) {
        boolean contains(double mouseX, double mouseY) {
            return mouseX >= x && mouseX < x + w && mouseY >= y && mouseY < y + h;
        }
    }
}
