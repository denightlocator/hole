package dev.orbit.client.gui;

import net.minecraft.util.math.MathHelper;

/**
 * Live theme state for the whole client.
 *
 * <p>The accent is stored as HSB so the theme editor can offer hue/saturation/brightness sliders,
 * and every surface colour is derived from the accent so a theme change re-tints the whole GUI.
 */
public final class Theme {
    public record Preset(String name, float hue, float saturation, float brightness) {
    }

    public static final java.util.List<Preset> PRESETS = java.util.List.of(
            new Preset("Orbit", 275f, 62f, 100f),
            new Preset("Cyan", 187f, 68f, 96f),
            new Preset("Sunset", 18f, 72f, 100f),
            new Preset("Mint", 158f, 62f, 92f),
            new Preset("Gold", 42f, 72f, 100f),
            new Preset("Rose", 338f, 70f, 100f),
            new Preset("Ice", 210f, 45f, 100f),
            new Preset("Mono", 250f, 4f, 96f));

    // ── state (persisted) ───────────────────────────────────────────────
    private static float hue = 275f;
    private static float saturation = 62f;
    private static float brightness = 100f;
    private static boolean gradient = true;
    private static boolean rainbow = false;
    private static float opacity = 0.88f;

    private Theme() {
    }

    // ── accessors ───────────────────────────────────────────────────────

    public static float getHue() {
        return hue;
    }

    public static void setHue(float value) {
        hue = value % 360f;
    }

    public static float getSaturation() {
        return saturation;
    }

    public static void setSaturation(float value) {
        saturation = MathHelper.clamp(value, 0f, 100f);
    }

    public static float getBrightness() {
        return brightness;
    }

    public static void setBrightness(float value) {
        brightness = MathHelper.clamp(value, 20f, 100f);
    }

    public static boolean isGradient() {
        return gradient;
    }

    public static void setGradient(boolean value) {
        gradient = value;
    }

    public static boolean isRainbow() {
        return rainbow;
    }

    public static void setRainbow(boolean value) {
        rainbow = value;
    }

    public static float getOpacity() {
        return opacity;
    }

    public static void setOpacity(float value) {
        opacity = MathHelper.clamp(value, 0.5f, 1f);
    }

    public static void applyPreset(Preset preset) {
        hue = preset.hue();
        saturation = preset.saturation();
        brightness = preset.brightness();
    }

    /** Name of the preset matching the current accent, or "Custom". */
    public static String presetName() {
        for (Preset preset : PRESETS) {
            if (Math.abs(preset.hue() - hue) < 1f
                    && Math.abs(preset.saturation() - saturation) < 1f
                    && Math.abs(preset.brightness() - brightness) < 1f) {
                return preset.name();
            }
        }
        return "Custom";
    }

    // ── derived colours ─────────────────────────────────────────────────

    /** Base accent, animated when rainbow mode is on. */
    public static int accent() {
        float h = hue;
        if (rainbow) {
            h = (float) ((System.currentTimeMillis() % 6000L) / 6000.0 * 360.0);
        }
        return hsb(h, saturation, brightness, 255);
    }

    /** Second accent used by gradients; offset in hue so it always complements. */
    public static int accentAlt() {
        float h = hue;
        if (rainbow) {
            h = (float) ((System.currentTimeMillis() % 6000L) / 6000.0 * 360.0);
        }
        return hsb(h + (gradient ? 32f : 0f), saturation, brightness, 255);
    }

    /** Gradient position 0..1 between accent and accentAlt. */
    public static int accentAt(float t) {
        return mix(accent(), accentAlt(), t);
    }

    public static int accentAlpha(int alpha) {
        return (alpha << 24) | (accent() & 0xFFFFFF);
    }

    // ── surfaces, tinted by the accent ──────────────────────────────────

    public static int bg() {
        return withOpacity(mix(0xFF0B0A10, accent(), 0.055f));
    }

    public static int bgTop() {
        return withOpacity(mix(0xFF14121C, accent(), 0.10f));
    }

    public static int rail() {
        return withOpacity(mix(0xFF06050A, accent(), 0.03f));
    }

    public static int card() {
        return mix(0x14FFFFFF, accent(), 0.10f);
    }

    public static int cardHover() {
        return mix(0x22FFFFFF, accent(), 0.12f);
    }

    public static int border() {
        return 0x22FFFFFF;
    }

    public static int borderAccent() {
        return accentAlpha(0x66);
    }

    public static int track() {
        return mix(0xFF23202E, accent(), 0.08f);
    }

    public static int text() {
        return 0xFFF1EFF7;
    }

    public static int textMuted() {
        return 0xFFA09AAD;
    }

    public static int textFaint() {
        return 0xFF6C6679;
    }

    public static int textOnAccent() {
        return 0xFF0D0A13;
    }

    // ── helpers ─────────────────────────────────────────────────────────

    private static int withOpacity(int color) {
        int alpha = (int) (opacity * 255f);
        return (alpha << 24) | (color & 0xFFFFFF);
    }

    public static int hsb(float h, float s, float b, int alpha) {
        int rgb = java.awt.Color.HSBtoRGB((h % 360f) / 360f, MathHelper.clamp(s / 100f, 0f, 1f),
                MathHelper.clamp(b / 100f, 0f, 1f));
        return (alpha << 24) | (rgb & 0xFFFFFF);
    }

    public static int mix(int from, int to, float t) {
        t = MathHelper.clamp(t, 0f, 1f);
        int a = (int) (((from >> 24) & 0xFF) + (((to >> 24) & 0xFF) - ((from >> 24) & 0xFF)) * t);
        int r = (int) (((from >> 16) & 0xFF) + (((to >> 16) & 0xFF) - ((from >> 16) & 0xFF)) * t);
        int g = (int) (((from >> 8) & 0xFF) + (((to >> 8) & 0xFF) - ((from >> 8) & 0xFF)) * t);
        int b = (int) ((from & 0xFF) + ((to & 0xFF) - (from & 0xFF)) * t);
        return (a << 24) | (r << 16) | (g << 8) | b;
    }

    public static int alpha(int color, int alpha) {
        return (alpha << 24) | (color & 0xFFFFFF);
    }

    public static int darken(int color, float amount) {
        return mix(color, 0xFF000000, amount);
    }
}
