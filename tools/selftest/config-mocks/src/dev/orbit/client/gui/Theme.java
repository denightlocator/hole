package dev.orbit.client.gui;

/** Unrelated GUI state is stubbed; the real config and module classes are under test. */
public final class Theme {
    private static float hue, saturation, brightness, opacity = 1;
    private static boolean gradient, rainbow;
    public static float getHue() { return hue; }
    public static float getSaturation() { return saturation; }
    public static float getBrightness() { return brightness; }
    public static float getOpacity() { return opacity; }
    public static boolean isGradient() { return gradient; }
    public static boolean isRainbow() { return rainbow; }
    public static void setHue(float v) { hue = v; }
    public static void setSaturation(float v) { saturation = v; }
    public static void setBrightness(float v) { brightness = v; }
    public static void setOpacity(float v) { opacity = v; }
    public static void setGradient(boolean v) { gradient = v; }
    public static void setRainbow(boolean v) { rainbow = v; }
    public static int hsb(float h, float s, float b, int a) { return a << 24; }
}
