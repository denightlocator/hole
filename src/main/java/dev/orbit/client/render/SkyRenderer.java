package dev.orbit.client.render;

import com.mojang.blaze3d.pipeline.RenderPipeline;
import com.mojang.blaze3d.platform.DepthTestFunction;
import dev.orbit.client.Orbit;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gl.RenderPipelines;
import net.minecraft.client.render.RenderLayer;
import net.minecraft.client.render.RenderSetup;
import net.minecraft.client.render.VertexConsumer;
import net.minecraft.client.render.VertexConsumerProvider;
import net.minecraft.client.texture.NativeImage;
import net.minecraft.client.texture.NativeImageBackedTexture;
import net.minecraft.util.Identifier;
import org.joml.Matrix4f;

import java.util.HashMap;
import java.util.Map;

/**
 * Renders a baked sky image as a dome around the camera.
 *
 * <p>Why a dome and not a fullscreen blit: the game draws the sky with the camera's rotation
 * applied, so the image has to be real geometry or it will not move when you look around.
 *
 * <p>Three things had to be right, and the first version got all three wrong:
 * <ol>
 *   <li><b>UVs.</b> The cube-of-quads version gave the second triangle of every quad collinear UVs,
 *       collapsing it to one stretched texel. That is what made skies look "half and half".</li>
 *   <li><b>Projection.</b> Each wall sampled the whole image, so the picture tiled four times around
 *       the player with hard seams. Latitude now maps to {@code v}, longitude to {@code u}.</li>
 *   <li><b>Seam and poles.</b> The art is a painting of a sky, not a 360-degree panorama: its left
 *       and right edges do not match, and its top row is "far away", not "overhead". The texture is
 *       mirrored into a horizontally seamless strip, and the strip covers the sky above the horizon
 *       rather than wrapping over the top, so there is no pinch above the player's head.</li>
 * </ol>
 *
 * <p>The texture is uploaded explicitly - a bare {@code registerTexture(id)} leaves the GPU texture
 * null and crashes on the first draw (see the title screen notes in the README).
 */
public final class SkyRenderer {
    /** Dome radius: inside the far plane, far outside normal terrain. */
    private static final float RADIUS = 320f;

    private static final Map<Identifier, RenderLayer> LAYERS = new HashMap<>();
    private static boolean pipelineFailed;

    private SkyRenderer() {
    }

    /** A source image, mirrored into a seamless strip, plus the colour of its "far away" edge. */
    private record Prepared(Identifier texture, int zenithRgb) {
    }

    /** Cached prepared copies of the source art. */
    private static final Map<Identifier, Prepared> SEAMLESS = new HashMap<>();

    /**
     * Mirrors the art into a strip whose left and right edges match.
     *
     * <p>The source images are 1280x720 paintings of a sky - the left edge is not the right edge, so
     * wrapping them around 360 degrees leaves a visible vertical seam. Mirrored copy + reversed copy
     * is seamless by construction (the strip starts and ends on the same column). The cost is that
     * every feature appears twice, mirrored, which is invisible for soft skies and stars.
     */
    private static Prepared prepare(Identifier source) {
        Prepared cached = SEAMLESS.get(source);
        if (cached != null) {
            return cached;
        }
        try {
            MinecraftClient client = MinecraftClient.getInstance();
            NativeImage original = client.getResourceManager()
                    .getResource(source)
                    .map(resource -> {
                        try (var in = resource.getInputStream()) {
                            return NativeImage.read(in);
                        } catch (Exception e) {
                            return null;
                        }
                    })
                    .orElse(null);
            if (original == null) {
                throw new IllegalStateException("missing sky art: " + source);
            }

            int w = original.getWidth();
            int h = original.getHeight();
            int outW = w * 2;              // mirrored strip: seamless left-to-right
            int outH = outW / 2;           // 2:1 - a full equirectangular panorama
            NativeImage panorama = new NativeImage(outW, outH, false);

            // The art fills the band between ART_TOP_ELEVATION and the horizon. Above it the art's
            // top row is smeared up to the zenith; below the horizon its bottom row is smeared down
            // and darkened. Both smears are one-off, so the whole sky is covered with no gaps and no
            // pinching - the geometry is a plain sphere sampling this image.
            int artTop = Math.round(outH * (float) ((90.0 - ART_TOP_ELEVATION) / 180.0));
            int horizon = outH / 2;

            int topRgb = averageRow(original, 0, w, h);
            int bottomRgb = averageRow(original, h - 1, w, h);

            for (int y = 0; y < outH; y++) {
                if (y < artTop) {
                    // above the art: blend its top row into its own average colour. Copying the row
                    // instead would smear anything standing in the picture (a character, a mountain)
                    // into radial streaks across the whole sky.
                    float t = 1.0f - (artTop <= 1 ? 1.0f : y / (float) (artTop - 1));
                    rowBlend(original, panorama, 0, y, w, topRgb, t);
                } else if (y <= horizon) {
                    float t = (y - artTop) / (float) Math.max(1, horizon - artTop);
                    int srcRow = Math.round(t * (h - 1));
                    copyRow(original, panorama, srcRow, y, w);
                } else {
                    // reach the flat ground colour quickly: a slow blend leaves the art's bottom
                    // row smeared across everything below the horizon
                    float t = (y - horizon) / (float) Math.max(1, outH - 1 - horizon);
                    rowBlend(original, panorama, h - 1, y, w, shade(bottomRgb, 0.30f),
                            Math.min(1.0f, t * 3.0f));
                }
            }
            original.close();

            // colour of the top rows: what the sky fades to overhead
            int r = 0;
            int g = 0;
            int b = 0;
            int n = 0;
            for (int y = 0; y < Math.min(8, outH); y++) {
                for (int x = 0; x < outW; x += 4) {
                    int argb = panorama.getColorArgb(x, y);
                    r += (argb >> 16) & 0xFF;
                    g += (argb >> 8) & 0xFF;
                    b += argb & 0xFF;
                    n++;
                }
            }
            int zenith = 0xFF000000 | ((r / Math.max(1, n)) << 16) | ((g / Math.max(1, n)) << 8) | (b / Math.max(1, n));

            Identifier id = Identifier.of("orbit", "sky_panorama/" + source.getPath().replace('/', '_'));
            client.getTextureManager().registerTexture(id, new NativeImageBackedTexture(panorama::toString, panorama));
            Prepared prepared = new Prepared(id, zenith);
            SEAMLESS.put(source, prepared);
            return prepared;
        } catch (Throwable t) {
            Orbit.LOGGER.error("Could not build the sky panorama for {}", source, t);
            return new Prepared(source, 0xFFFFFFFF);
        }
    }

    /** Average colour of one row, sampled every few pixels. */
    private static int averageRow(NativeImage image, int row, int w, int h) {
        int r = 0;
        int g = 0;
        int b = 0;
        int n = 0;
        int safeRow = Math.min(Math.max(row, 0), h - 1);
        for (int x = 0; x < w; x += 4) {
            int argb = image.getColorArgb(x, safeRow);
            r += (argb >> 16) & 0xFF;
            g += (argb >> 8) & 0xFF;
            b += argb & 0xFF;
            n++;
        }
        n = Math.max(1, n);
        return 0xFF000000 | ((r / n) << 16) | ((g / n) << 8) | (b / n);
    }

    /** Writes a source row mixed toward {@code targetRgb} by {@code t}, mirrored on the right half. */
    private static void rowBlend(NativeImage src, NativeImage dst, int srcRow, int dstRow, int w,
                                 int targetRgb, float t) {
        float k = Math.min(1.0f, Math.max(0.0f, t));
        float tr = ((targetRgb >> 16) & 0xFF);
        float tg = ((targetRgb >> 8) & 0xFF);
        float tb = (targetRgb & 0xFF);
        for (int x = 0; x < w; x++) {
            int argb = src.getColorArgb(x, srcRow);
            int a = (argb >>> 24) & 0xFF;
            int r = Math.round(((argb >> 16) & 0xFF) * (1 - k) + tr * k);
            int g = Math.round(((argb >> 8) & 0xFF) * (1 - k) + tg * k);
            int b = Math.round((argb & 0xFF) * (1 - k) + tb * k);
            int mixed = (a << 24) | (r << 16) | (g << 8) | b;
            dst.setColor(x, dstRow, mixed);
            dst.setColor(w * 2 - 1 - x, dstRow, mixed);
        }
    }

    /** Copies one source row into the output row, mirrored on the right half. */
    private static void copyRow(NativeImage src, NativeImage dst, int srcRow, int dstRow, int w) {
        copyRowShaded(src, dst, srcRow, dstRow, w, 1.0f);
    }

    private static void copyRowShaded(NativeImage src, NativeImage dst, int srcRow, int dstRow,
                                      int w, float factor) {
        for (int x = 0; x < w; x++) {
            int argb = src.getColorArgb(x, srcRow);
            int shaded = factor >= 0.999f ? argb : shade(argb, factor);
            dst.setColor(x, dstRow, shaded);
            dst.setColor(w * 2 - 1 - x, dstRow, shaded);
        }
    }

    private static int shade(int argb, float factor) {
        int a = (argb >>> 24) & 0xFF;
        int r = Math.round(((argb >> 16) & 0xFF) * factor);
        int g = Math.round(((argb >> 8) & 0xFF) * factor);
        int b = Math.round((argb & 0xFF) * factor);
        return (a << 24) | (r << 16) | (g << 8) | b;
    }

    /** @return a RenderLayer bound to the given sky texture, or {@code null} if unavailable. */
    public static RenderLayer layerFor(Identifier texture) {
        RenderLayer cached = LAYERS.get(texture);
        if (cached != null) {
            return cached;
        }
        if (pipelineFailed) {
            return null;
        }
        String safeName = "sky_" + texture.getPath().replace('/', '_');
        try {
            Identifier bound = prepare(texture).texture();
            RenderPipeline pipeline = RenderPipelines.register(
                    RenderPipeline.builder(RenderPipelines.POSITION_TEX_COLOR_SNIPPET)
                            .withLocation(Identifier.of("orbit", "pipeline/" + safeName))
                            .withDepthTestFunction(DepthTestFunction.LEQUAL_DEPTH_TEST)
                            .withDepthWrite(false)
                            .withCull(false)
                            .build());

            RenderLayer layer = RenderLayer.of("orbit_" + safeName,
                    RenderSetup.builder(pipeline).texture("Sampler0", bound).build());
            LAYERS.put(texture, layer);
            return layer;
        } catch (Throwable t) {
            pipelineFailed = true;
            Orbit.LOGGER.error("Could not build the sky dome pipeline for {}", texture, t);
            return null;
        }
    }

    /** Longitude segments: enough that the sphere reads as round, few enough to stay one draw call. */
    private static final int SEGMENTS = 96;

    /** Latitude rings over the whole sphere. */
    private static final int RINGS = 48;

    /**
     * Elevation the source art starts at, in degrees above the horizon.
     *
     * <p>The art is a painting of a sky, so it is placed in the band a player looks at; above it the
     * panorama is a smear of its top row, below the horizon a darker smear of its bottom row.
     */
    private static final double ART_TOP_ELEVATION = 60.0;

    /**
     * Draws the dome as a full sphere centred on the camera.
     *
     * <p>Every direction is covered, so no vanilla sky can leak through: the texture is a complete
     * 360x180 panorama built in {@link #prepare}. {@code v} runs 0 at the zenith to 1 at the nadir.
     *
     * @param matrix world matrix already translated by {@code -cameraPos}
     */
    public static boolean draw(Identifier texture, VertexConsumerProvider consumers, Matrix4f matrix,
                               double camX, double camY, double camZ, int tint) {
        RenderLayer layer = layerFor(texture);
        if (layer == null) {
            return false;
        }
        VertexConsumer v = consumers.getBuffer(layer);
        double r = RADIUS;

        for (int ring = 0; ring < RINGS; ring++) {
            // elevation from straight up (+90) to straight down (-90)
            double elev0 = Math.PI / 2 - Math.PI * ring / RINGS;
            double elev1 = Math.PI / 2 - Math.PI * (ring + 1) / RINGS;

            float v0 = (float) ring / RINGS;
            float v1 = (float) (ring + 1) / RINGS;

            double radius0 = Math.cos(elev0) * r;
            double y0 = Math.sin(elev0) * r;
            double radius1 = Math.cos(elev1) * r;
            double y1 = Math.sin(elev1) * r;

            for (int seg = 0; seg < SEGMENTS; seg++) {
                double az0 = 2.0 * Math.PI * seg / SEGMENTS;
                double az1 = 2.0 * Math.PI * (seg + 1) / SEGMENTS;
                float u0 = (float) seg / SEGMENTS;
                float u1 = (float) (seg + 1) / SEGMENTS;

                double sin0 = Math.sin(az0);
                double cos0 = Math.cos(az0);
                double sin1 = Math.sin(az1);
                double cos1 = Math.cos(az1);

                float ax = (float) (camX + radius0 * cos0);
                float az = (float) (camZ + radius0 * sin0);
                float bx = (float) (camX + radius0 * cos1);
                float bz = (float) (camZ + radius0 * sin1);
                float cx2 = (float) (camX + radius1 * cos1);
                float cz2 = (float) (camZ + radius1 * sin1);
                float dx = (float) (camX + radius1 * cos0);
                float dz = (float) (camZ + radius1 * sin0);

                v.vertex(matrix, ax, (float) (camY + y0), az).texture(u0, v0).color(tint);
                v.vertex(matrix, bx, (float) (camY + y0), bz).texture(u1, v0).color(tint);
                v.vertex(matrix, cx2, (float) (camY + y1), cz2).texture(u1, v1).color(tint);
                v.vertex(matrix, dx, (float) (camY + y1), dz).texture(u0, v1).color(tint);
            }
        }
        return true;
    }
}
