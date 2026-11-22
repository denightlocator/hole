package dev.orbit.client.gui;

import java.util.ArrayList;
import java.util.List;

/**
 * Row geometry for rounded rectangles, with adjacent equal-inset rows merged into spans.
 *
 * <p>Deliberately free of Minecraft imports so {@code tools/selftest/SpanSelfTest.java} can measure
 * it. The old drawing code emitted one quad per pixel row; merging rows that share an inset produces
 * identical pixels with at most {@code 2 * radius + 1} quads instead of {@code height}.
 */
public final class RoundedSpans {
    private RoundedSpans() {
    }

    /** Horizontal inset of one row: 0 through the middle, up to {@code radius} at the corners. */
    public static int inset(int row, int height, int radius) {
        if (radius <= 0) {
            return 0;
        }
        int distance;
        if (row < radius) {
            distance = radius - row - 1;
        } else if (row >= height - radius) {
            distance = row - (height - radius);
        } else {
            return 0;
        }
        double dx = radius - Math.sqrt(Math.max(0.0, (double) radius * radius - (double) distance * distance));
        return (int) Math.round(dx);
    }

    /**
     * Merged spans as {@code {startRow, endRowExclusive, inset}}.
     *
     * <p>Guaranteed identical raster output to one quad per row, because the inset is constant inside
     * each span by construction.
     */
    public static int[][] rows(int height, int radius) {
        if (height <= 0) {
            return new int[0][];
        }
        int clamped = Math.min(radius, height / 2);
        List<int[]> spans = new ArrayList<>();
        int row = 0;
        while (row < height) {
            int inset = inset(row, height, clamped);
            int start = row;
            while (row < height && inset(row, height, clamped) == inset) {
                row++;
            }
            spans.add(new int[]{start, row, inset});
        }
        return spans.toArray(new int[0][]);
    }

    /** Number of vertical bands a gradient is split into, capped so tall panels stay cheap. */
    public static int gradientBands(int height, int cap) {
        return Math.max(1, Math.min(height, cap));
    }
}
