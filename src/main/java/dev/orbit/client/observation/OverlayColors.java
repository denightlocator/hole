package dev.orbit.client.observation;

/** Strict RGB parsing for the editable hex colour settings; opacity is controlled separately. */
public final class OverlayColors {
    private OverlayColors() { }

    public static int rgbOrDefault(String text, int fallback) {
        if (text == null) {
            return fallback & 0xFFFFFF;
        }
        String value = text.trim();
        if (value.startsWith("#")) {
            value = value.substring(1);
        }
        if (!value.matches("[0-9a-fA-F]{6}")) {
            return fallback & 0xFFFFFF;
        }
        return Integer.parseInt(value, 16);
    }

    public static int withOpacity(int rgb, double opacity) {
        if (!Double.isFinite(opacity)) {
            opacity = 0.0;
        }
        int alpha = (int) Math.round(255.0 * Math.max(0.0, Math.min(1.0, opacity)));
        return (alpha << 24) | (rgb & 0xFFFFFF);
    }
}
