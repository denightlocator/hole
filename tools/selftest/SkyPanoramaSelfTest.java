package dev.orbit.client.render;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;

/** Tests the same single-copy panorama pixels used by the Minecraft renderer. */
public final class SkyPanoramaSelfTest {
    public static void main(String[] args) throws Exception {
        final int width = 64;
        final int height = 8;
        final int blue = 0xFF112244;
        final int red = 0xFFFF0000;
        final int green = 0xFF00FF00;
        int[] original = new int[width * height];
        Arrays.fill(original, blue);
        for (int y = 0; y < height; y++) {
            original[y * width + 20] = red;
            original[y * width + 45] = green;
        }

        SkyPanorama.Image panorama = SkyPanorama.create(original, width, height);
        check(panorama.width() == 57, "one image plus an eight-pixel edge overlap");
        check(panorama.height() == 17, "vertical resolution preserves the source art band");
        int artRow = panorama.height() / 4; // well inside the unfaded art band
        int start = artRow * panorama.width();
        check(panorama.argb()[start + 20] == red, "red feature remains in its original orientation and colour");
        check(panorama.argb()[start + 45] == green, "second feature remains in its original location");
        int redCopies = 0;
        int greenCopies = 0;
        for (int x = 0; x < panorama.width() - 1; x++) {
            if (panorama.argb()[start + x] == red) redCopies++;
            if (panorama.argb()[start + x] == green) greenCopies++;
        }
        check(redCopies == 1 && greenCopies == 1, "distinct central features are not mirrored or repeated");
        for (int y = 0; y < panorama.height(); y++) {
            check(panorama.argb()[y * panorama.width()] == panorama.argb()[y * panorama.width() + panorama.width() - 1],
                    "left and right edge match at row " + y);
        }
        assertSolidRow(panorama, 0, "zenith is closed");
        assertSolidRow(panorama, panorama.height() - 1, "nadir is closed");

        // Two very different source edges should transition gradually, not snap at the wrap.
        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) original[y * width + x] = x < width / 2 ? red : blue;
        }
        SkyPanorama.Image joined = SkyPanorama.create(original, width, height);
        int seam = artRow * joined.width();
        for (int x = 1; x <= 8; x++) {
            check(maxRgbDifference(joined.argb()[seam + x - 1], joined.argb()[seam + x]) <= 64,
                    "cross-fade has no abrupt edge at column " + x);
        }
        check(joined.argb()[seam] == joined.argb()[seam + joined.width() - 1], "wrapped seam is exact");

        SkyPanorama.Image tiny = SkyPanorama.create(new int[4 * 2], 4, 2);
        assertSolidRow(tiny, 0, "tiny zenith is closed");
        assertSolidRow(tiny, tiny.height() - 1, "tiny nadir is closed");
        expectFailure(() -> SkyPanorama.create(null, 64, 8));
        expectFailure(() -> SkyPanorama.create(new int[3 * 2], 3, 2));
        expectFailure(() -> SkyPanorama.create(new int[8], 4, 3));
        for (int w = 4; w <= 31; w++) {
            for (int h = 2; h <= 10; h++) {
                int[] pixels = new int[w * h];
                for (int i = 0; i < pixels.length; i++) pixels[i] = 0xFF000000 | (i * 3571 & 0xFFFFFF);
                verifyPanorama(pixels, w, h, "small " + w + "x" + h);
            }
        }

        Path skies = Path.of("src/main/resources/assets/orbit/textures/gui/sky");
        List<Path> paths;
        try (var files = Files.list(skies)) {
            paths = files.filter(p -> p.toString().endsWith(".png")).sorted().toList();
        }
        check(paths.size() >= 9, "all bundled sky images are present");
        for (Path path : paths) {
            BufferedImage png = ImageIO.read(path.toFile());
            check(png != null, "PNG decodes: " + path);
            int w = png.getWidth(), h = png.getHeight();
            int[] pixels = png.getRGB(0, 0, w, h, null, 0, w);
            verifyPanorama(pixels, w, h, path.getFileName().toString());
        }
        System.out.println("SkyPanoramaSelfTest: synthetic, small dimensions, and " + paths.size()
                + " actual PNGs passed");
    }

    private static void verifyPanorama(int[] source, int width, int height, String name) {
        SkyPanorama.Image image = SkyPanorama.create(source, width, height);
        int overlap = Math.min(width / 2, Math.max(2, (int) Math.round(width / 8.0)));
        int period = width - overlap;
        check(image.width() == period + 1, name + ": expected single-copy width");
        check(image.argb().length == image.width() * image.height(), name + ": complete pixel array");
        for (int y = 0; y < image.height(); y++) {
            check(image.argb()[y * image.width()] == image.argb()[y * image.width() + period],
                    name + ": exact seam at row " + y);
        }
        assertSolidRow(image, 0, name + ": solid zenith");
        assertSolidRow(image, image.height() - 1, name + ": solid nadir");
        int artTop = Math.max(1, Math.min(image.height() - 3,
                (int) Math.round(image.height() * 10.0 / 180.0)));
        int artBottom = Math.max(artTop + 1, Math.min(image.height() - 2,
                (int) Math.round(image.height() * 95.0 / 180.0)));
        for (int y = 0; y <= artTop; y++) assertSolidRow(image, y, name + ": no zenith streaks");
        for (int y = artBottom; y < image.height(); y++) assertSolidRow(image, y, name + ": no nadir streaks");
        for (int y = artTop; y <= artBottom; y++) {
            double position = (y - artTop) / (double) (artBottom - artTop);
            if (position < 0.10 || position > 0.92) continue;
            int sourceY = (int) Math.round(position * (height - 1));
            for (int x = overlap; x < period; x++) {
                if (image.argb()[y * image.width() + x] != source[sourceY * width + x]) {
                    throw new AssertionError(name + ": unblended source changed at " + x + "," + y);
                }
            }
        }
    }

    private static void assertSolidRow(SkyPanorama.Image image, int y, String message) {
        int start = y * image.width();
        for (int x = 1; x < image.width(); x++) check(image.argb()[start + x] == image.argb()[start], message);
    }

    private static int maxRgbDifference(int a, int b) {
        return Math.max(Math.abs(((a >> 16) & 255) - ((b >> 16) & 255)),
                Math.max(Math.abs(((a >> 8) & 255) - ((b >> 8) & 255)), Math.abs((a & 255) - (b & 255))));
    }

    private static void expectFailure(Runnable action) {
        try {
            action.run();
        } catch (IllegalArgumentException expected) {
            return;
        }
        throw new AssertionError("Expected invalid image to be rejected");
    }

    private static void check(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }
}
