package dev.orbit.client.render;

import java.util.Arrays;

/**
 * Builds a single, horizontally wrapping 360x180 panorama from a flat sky image.
 *
 * <p>The source is not normally a 360-degree photograph. Instead of mirroring it (which produces
 * two moons, horizons, etc.), overlap a narrow strip from its right and left edges and cross-fade
 * them. The rest of the image appears once, in its original orientation. The source's top and
 * bottom fade into solid colours within the image, so the sphere closes at the poles without
 * extending the edge rows into long streaks.
 *
 * <p>This class uses ordinary ARGB arrays and has no Minecraft or GPU dependencies, so the exact
 * panorama preparation can also be tested without a running client.
 */
public final class SkyPanorama {
    // The art is a flat picture, not a real panorama. A wider vertical band keeps it less
    // squashed when its width is wrapped around the entire horizon.
    private static final double ART_TOP_ELEVATION = 80.0;
    private static final double ART_BOTTOM_ELEVATION = -5.0;
    private static final double TOP_EDGE_FADE = 0.10;
    private static final double BOTTOM_EDGE_FADE = 0.08;

    private SkyPanorama() {
    }

    public record Image(int width, int height, int[] argb) {
    }

    /**
     * Prepare the input in row-major ARGB order. The last column equals the first; the output height
     * retains the source's vertical detail within the art band. The source width must be at least
     * four pixels and its height at least two.
     */
    public static Image create(int[] source, int width, int height) {
        if (source == null || width < 4 || height < 2 || (long) width * height != source.length) {
            throw new IllegalArgumentException("Invalid sky image dimensions or pixel array");
        }

        // Mirroring a whole image repeats every feature. Use just one source and spend one eighth
        // of its width on an overlap, so each edge can transition into the other.
        int overlap = Math.min(width / 2, Math.max(2, (int) Math.round(width / 8.0)));
        int period = width - overlap;
        int outWidth = period + 1; // repeat the seam column only, never the complete image
        // UVs are normalized, so the pixel dimensions need not be 2:1. Reserve enough rows for
        // the art's elevation band to retain its source resolution rather than shrinking it.
        double requestedHeight = Math.ceil(height * 180.0 / (ART_TOP_ELEVATION - ART_BOTTOM_ELEVATION));
        if (requestedHeight > Integer.MAX_VALUE || (long) outWidth * (long) requestedHeight > Integer.MAX_VALUE) {
            throw new IllegalArgumentException("Sky panorama is too large");
        }
        int outHeight = Math.max(6, (int) requestedHeight);
        if ((long) outWidth * outHeight > Integer.MAX_VALUE) {
            throw new IllegalArgumentException("Sky panorama is too large");
        }
        int[] output = new int[outWidth * outHeight];

        int top = averageRow(source, width, 0);
        int bottom = averageRow(source, width, height - 1);
        int ground = shade(bottom, 0.30);
        int artTop = Math.max(1, Math.min(outHeight - 3,
                (int) Math.round(outHeight * (90.0 - ART_TOP_ELEVATION) / 180.0)));
        int artBottom = Math.max(artTop + 1, Math.min(outHeight - 2,
                (int) Math.round(outHeight * (90.0 - ART_BOTTOM_ELEVATION) / 180.0)));

        for (int y = 0; y < outHeight; y++) {
            int to = y * outWidth;
            if (y < artTop) {
                Arrays.fill(output, to, to + outWidth, top);
                continue;
            }
            if (y > artBottom) {
                double t = (y - artBottom) / (double) (outHeight - 1 - artBottom);
                int colour = mix(bottom, ground, smoothstep(Math.min(1.0, t * 3.0)));
                Arrays.fill(output, to, to + outWidth, colour);
                continue;
            }

            double position = (y - artTop) / (double) (artBottom - artTop);
            int sourceRow = (int) Math.round(position * (height - 1));
            int fadeTo = 0;
            double fade = 0;
            if (position < TOP_EDGE_FADE) {
                fadeTo = top;
                fade = smoothstep(1.0 - position / TOP_EDGE_FADE);
            } else if (position > 1.0 - BOTTOM_EDGE_FADE) {
                fadeTo = bottom;
                fade = smoothstep((position - (1.0 - BOTTOM_EDGE_FADE)) / BOTTOM_EDGE_FADE);
            }

            int from = sourceRow * width;
            for (int x = 0; x < period; x++) {
                int colour;
                if (x < overlap) {
                    double t = smoothstep(x / (double) (overlap - 1));
                    colour = mix(source[from + period + x], source[from + x], t);
                } else {
                    colour = source[from + x];
                }
                output[to + x] = fade == 0 ? colour : mix(colour, fadeTo, fade);
            }
            output[to + period] = output[to];
        }
        return new Image(outWidth, outHeight, output);
    }

    private static int averageRow(int[] pixels, int width, int row) {
        long a = 0, r = 0, g = 0, b = 0, count = 0;
        for (int x = 0; x < width; x += 4) {
            int colour = pixels[row * width + x];
            a += (colour >>> 24) & 0xFF;
            r += (colour >>> 16) & 0xFF;
            g += (colour >>> 8) & 0xFF;
            b += colour & 0xFF;
            count++;
        }
        return ((int) (a / count) << 24) | ((int) (r / count) << 16)
                | ((int) (g / count) << 8) | (int) (b / count);
    }

    private static int shade(int colour, double factor) {
        int a = (colour >>> 24) & 0xFF;
        int r = (int) Math.round(((colour >>> 16) & 0xFF) * factor);
        int g = (int) Math.round(((colour >>> 8) & 0xFF) * factor);
        int b = (int) Math.round((colour & 0xFF) * factor);
        return (a << 24) | (r << 16) | (g << 8) | b;
    }

    private static double smoothstep(double value) {
        double t = Math.max(0.0, Math.min(1.0, value));
        return t * t * (3.0 - 2.0 * t);
    }

    /** Blend in ARGB rather than NativeImage's raw ABGR layout. */
    private static int mix(int from, int to, double amount) {
        double t = Math.max(0, Math.min(1, amount));
        int a = blendChannel((from >>> 24) & 0xFF, (to >>> 24) & 0xFF, t);
        int r = blendChannel((from >>> 16) & 0xFF, (to >>> 16) & 0xFF, t);
        int g = blendChannel((from >>> 8) & 0xFF, (to >>> 8) & 0xFF, t);
        int b = blendChannel(from & 0xFF, to & 0xFF, t);
        return (a << 24) | (r << 16) | (g << 8) | b;
    }

    private static int blendChannel(int from, int to, double amount) {
        return (int) Math.round(from + (to - from) * amount);
    }
}
