package dev.orbit.client.gui;

import net.minecraft.client.gui.DrawContext;

/**
 * Rounded rectangle + gradient drawing built out of plain fills, so the GUI does not look like a
 * grid of hard-edged blocks.
 *
 * <p><b>Performance note.</b> These used to emit one quad per pixel row - a 340 px panel cost 340
 * draw commands, a horizontal gradient cost one quad <i>per pixel</i>, and a full ClickGUI frame came
 * to roughly 15,000 quads. That is what made the menu drop the game to 15 fps. Rows are now merged
 * into spans of equal inset (at most {@code 2 * radius + 1} per rectangle, and pixel-identical), and
 * gradients are capped at a fixed number of bands. Same picture, ~10x fewer draw commands - see
 * {@link RoundedSpans} and {@code tools/selftest/SpanSelfTest.java}.
 */
public final class Rounded {
    /** Cap on gradient bands: keeps tall panels cheap without visible banding on subtle colours. */
    private static final int GRADIENT_BANDS = 64;

    /** Cap on strips for horizontal gradients (columns are what used to cost one quad each). */
    private static final int HORIZONTAL_STRIPS = 48;

    private Rounded() {
    }

    /** Opaque filled rounded rectangle. */
    public static void fill(DrawContext context, int x, int y, int width, int height, int radius, int color) {
        if (width <= 0 || height <= 0) {
            return;
        }
        int r = Math.min(radius, Math.min(width, height) / 2);
        for (int[] span : RoundedSpans.rows(height, r)) {
            context.fill(x + span[2], y + span[0], x + width - span[2], y + span[1], color);
        }
    }

    /** Vertical gradient, rounded. */
    public static void fillGradient(DrawContext context, int x, int y, int width, int height, int radius,
                                    int topColor, int bottomColor) {
        if (width <= 0 || height <= 0) {
            return;
        }
        int r = Math.min(radius, Math.min(width, height) / 2);
        int bands = RoundedSpans.gradientBands(height, GRADIENT_BANDS);
        int[][] spans = RoundedSpans.rows(height, r);

        for (int band = 0; band < bands; band++) {
            int bandStart = height * band / bands;
            int bandEnd = height * (band + 1) / bands;
            float t = height <= 1 ? 0f : (bandStart + (bandEnd - bandStart) * 0.5f) / (height - 1);
            int colour = Theme.mix(topColor, bottomColor, t);

            // clip the spans against this band
            for (int[] span : spans) {
                int start = Math.max(span[0], bandStart);
                int end = Math.min(span[1], bandEnd);
                if (start < end) {
                    context.fill(x + span[2], y + start, x + width - span[2], y + end, colour);
                }
            }
        }
    }

    /** Horizontal gradient, rounded. Cost is bounded by {@link #HORIZONTAL_STRIPS} columns. */
    public static void fillHorizontal(DrawContext context, int x, int y, int width, int height, int radius,
                                      int leftColor, int rightColor) {
        if (width <= 0 || height <= 0) {
            return;
        }
        int r = Math.min(radius, Math.min(width, height) / 2);
        int strips = Math.max(1, Math.min(width, HORIZONTAL_STRIPS));
        int[][] spans = RoundedSpans.rows(height, r);

        for (int strip = 0; strip < strips; strip++) {
            int stripStart = width * strip / strips;
            int stripEnd = width * (strip + 1) / strips;
            if (stripEnd <= stripStart) {
                continue;
            }
            float t = width <= 1 ? 0f : (stripStart + (stripEnd - stripStart) * 0.5f) / (width - 1);
            int colour = Theme.mix(leftColor, rightColor, t);

            for (int[] span : spans) {
                int start = Math.max(stripStart, span[2]);
                int end = Math.min(stripEnd, width - span[2]);
                if (start < end) {
                    context.fill(x + start, y + span[0], x + end, y + span[1], colour);
                }
            }
        }
    }

    /** 1px rounded outline. */
    public static void outline(DrawContext context, int x, int y, int width, int height, int radius, int color) {
        if (width <= 2 || height <= 2) {
            return;
        }
        int r = Math.min(radius, Math.min(width, height) / 2);
        for (int[] span : RoundedSpans.rows(height, r)) {
            int start = span[0];
            int end = span[1];
            int inset = span[2];

            if (start == 0) {
                context.fill(x + inset, y, x + width - inset, y + 1, color);
            }
            if (end == height) {
                context.fill(x + inset, y + height - 1, x + width - inset, y + height, color);
            }

            int bodyStart = Math.max(start, 1);
            int bodyEnd = Math.min(end, height - 1);
            if (bodyStart < bodyEnd) {
                context.fill(x + inset, y + bodyStart, x + inset + 1, y + bodyEnd, color);
                context.fill(x + width - inset - 1, y + bodyStart, x + width - inset, y + bodyEnd, color);
            }
        }
    }

    /** Rounded panel with a vertical gradient body and a border. */
    public static void panel(DrawContext context, int x, int y, int width, int height, int radius,
                             int topColor, int bottomColor, int borderColor) {
        fillGradient(context, x, y, width, height, radius, topColor, bottomColor);
        outline(context, x, y, width, height, radius, borderColor);
    }

    /** Soft shadow: a few progressively larger translucent rounded rects. */
    public static void shadow(DrawContext context, int x, int y, int width, int height, int radius, int layers) {
        for (int i = layers; i >= 1; i--) {
            int alpha = 0x10 / i + 0x04;
            fill(context, x - i, y - i, width + i * 2, height + i * 2, radius + i, (alpha << 24));
        }
    }

    /** Accent glow around an element. */
    public static void glow(DrawContext context, int x, int y, int width, int height, int radius, int alpha) {
        int color = Theme.accentAlpha(alpha);
        fill(context, x - 1, y - 1, width + 2, height + 2, radius + 1, color);
    }
}
