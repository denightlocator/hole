package dev.orbit.client.module.setting;

import dev.orbit.client.gui.Theme;

/**
 * A colour setting stored as HSB so the GUI can offer compact hue/saturation/brightness sliders
 * (and so presets/gradients stay consistent with the theme system).
 */
public class ColorSetting extends Setting<Integer> {
    private float hue;
    private float saturation;
    private float brightness;

    public ColorSetting(String name, int defaultArgb) {
        super(name);
        setArgb(defaultArgb);
    }

    public ColorSetting(String name, float hue, float saturation, float brightness) {
        super(name);
        this.hue = hue;
        this.saturation = saturation;
        this.brightness = brightness;
    }

    public void setArgb(int argb) {
        float[] hsb = java.awt.Color.RGBtoHSB((argb >> 16) & 0xFF, (argb >> 8) & 0xFF, argb & 0xFF, null);
        this.hue = hsb[0] * 360f;
        this.saturation = hsb[1] * 100f;
        this.brightness = hsb[2] * 100f;
    }

    public float getHue() {
        return hue;
    }

    public void setHue(float value) {
        this.hue = ((value % 360f) + 360f) % 360f;
    }

    public float getSaturation() {
        return saturation;
    }

    public void setSaturation(float value) {
        this.saturation = Math.max(0f, Math.min(100f, value));
    }

    public float getBrightness() {
        return brightness;
    }

    public void setBrightness(float value) {
        this.brightness = Math.max(5f, Math.min(100f, value));
    }

    /** The colour, always fully opaque. */
    public int getRgb() {
        return 0xFF000000 | (Theme.hsb(hue, saturation, brightness, 255) & 0xFFFFFF);
    }

    /** A darker companion used for gradients. */
    public int getRgbDark() {
        return Theme.hsb(hue + 18f, saturation, Math.max(20f, brightness * 0.62f), 255);
    }

    @Override
    public Integer getValue() {
        return getRgb();
    }

    public String getHex() {
        return String.format("#%06X", getRgb() & 0xFFFFFF);
    }

    @Override
    public String displayValue() {
        return getHex();
    }

    // ── config round-trip ───────────────────────────────────────────────
    public String serialize() {
        return hue + ";" + saturation + ";" + brightness;
    }

    public void deserialize(String data) {
        String[] parts = data.split(";");
        if (parts.length != 3) {
            return;
        }
        try {
            setHue(Float.parseFloat(parts[0]));
            setSaturation(Float.parseFloat(parts[1]));
            setBrightness(Float.parseFloat(parts[2]));
        } catch (NumberFormatException ignored) {
            // keep defaults
        }
    }
}
