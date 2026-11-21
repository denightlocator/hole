package dev.orbit.client.hud;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Where each HUD element sits, as a fraction of the screen.
 *
 * <p>Fractions rather than pixels on purpose: a position set at 1920x1080 stays visually in the same
 * corner at 2560x1440 or on a smaller window, instead of ending up halfway across the screen. The
 * editor writes here, the renderers read here, and {@code ConfigManager} persists the map.
 */
public final class HudLayout {
    /** Percentage of the screen, clamped so an element can never be dragged fully off it. */
    public record Anchor(float xPercent, float yPercent) {
        public Anchor clamp() {
            return new Anchor(
                    Math.min(1.0f, Math.max(0.0f, xPercent)),
                    Math.min(1.0f, Math.max(0.0f, yPercent)));
        }
    }

    /** Scale steps offered in the editor. Every step is a clean subdivision, so text stays crisp. */
    public static final float[] SCALE_STEPS = {0.75f, 1.0f, 1.25f, 1.5f, 1.75f, 2.0f};

    private static final Map<String, Anchor> ANCHORS = new LinkedHashMap<>();
    private static final Map<String, Anchor> DEFAULTS = new LinkedHashMap<>();
    private static final Map<String, Float> SCALES = new LinkedHashMap<>();
    private static final Map<String, Float> SCALE_DEFAULTS = new LinkedHashMap<>();

    static {
        // stacked down the top-left, the same corner the music card uses
        defaults("fps", 0.008f, 0.008f);
        defaults("ping", 0.008f, 0.038f);
        defaults("armour", 0.008f, 0.070f);
        defaults("potions", 0.008f, 0.150f);
    }

    private HudLayout() {
    }

    private static void defaults(String id, float x, float y) {
        DEFAULTS.put(id, new Anchor(x, y));
        ANCHORS.put(id, new Anchor(x, y));
        SCALE_DEFAULTS.put(id, 1.0f);
        SCALES.put(id, 1.0f);
    }

    /** Per-element text and box scale; 1.0 is the size the elements were designed at. */
    public static float getScale(String id) {
        return SCALES.getOrDefault(id, 1.0f);
    }

    public static void setScale(String id, float scale) {
        SCALES.put(id, Math.min(4.0f, Math.max(0.5f, scale)));
    }

    /** Moves one step up or down the scale ladder. */
    public static void stepScale(String id, int direction) {
        float current = getScale(id);
        int index = 0;
        float bestDelta = Float.MAX_VALUE;
        for (int i = 0; i < SCALE_STEPS.length; i++) {
            float delta = Math.abs(SCALE_STEPS[i] - current);
            if (delta < bestDelta) {
                bestDelta = delta;
                index = i;
            }
        }
        int next = Math.min(SCALE_STEPS.length - 1, Math.max(0, index + direction));
        setScale(id, SCALE_STEPS[next]);
    }

    public static Anchor get(String id) {
        return ANCHORS.getOrDefault(id, DEFAULTS.getOrDefault(id, new Anchor(0.008f, 0.008f)));
    }

    public static void set(String id, float xPercent, float yPercent) {
        ANCHORS.put(id, new Anchor(xPercent, yPercent).clamp());
    }

    public static void reset(String id) {
        ANCHORS.put(id, DEFAULTS.getOrDefault(id, new Anchor(0.008f, 0.008f)));
        SCALES.put(id, SCALE_DEFAULTS.getOrDefault(id, 1.0f));
    }

    public static Map<String, Float> scaleSnapshot() {
        return new LinkedHashMap<>(SCALES);
    }

    /** Restores loaded scales, ignoring ids this build does not know about. */
    public static void restoreScales(Map<String, Float> loaded) {
        for (Map.Entry<String, Float> entry : loaded.entrySet()) {
            if (SCALE_DEFAULTS.containsKey(entry.getKey())) {
                setScale(entry.getKey(), entry.getValue());
            }
        }
    }

    public static Map<String, Anchor> snapshot() {
        return new LinkedHashMap<>(ANCHORS);
    }

    /** Applies a loaded map, ignoring ids this build does not know about. */
    public static void restore(Map<String, Anchor> loaded) {
        for (Map.Entry<String, Anchor> entry : loaded.entrySet()) {
            if (DEFAULTS.containsKey(entry.getKey())) {
                ANCHORS.put(entry.getKey(), entry.getValue().clamp());
            }
        }
    }
}
