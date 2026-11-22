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
 * <p>Longitude maps to {@code u} and latitude maps to {@code v}. The source painting is used once,
 * with its left and right edges cross-faded and the poles filled by colour fades; see
 * {@link SkyPanorama}. This avoids mirrored copies of prominent features and closes the whole sphere.
 *
 * <p>The prepared image is uploaded using a {@link NativeImageBackedTexture}, not an uninitialized
 * resource texture.
 */
public final class SkyRenderer {
    /** Dome radius: inside the far plane, far outside normal terrain. */
    private static final float RADIUS = 320f;

    private static final Map<Identifier, RenderLayer> LAYERS = new HashMap<>();
    private static boolean pipelineFailed;

    private SkyRenderer() {
    }

    /** A prepared copy of a source painting, cached after it is uploaded. */
    private record Prepared(Identifier texture) {
    }

    private static final Map<Identifier, Prepared> PANORAMAS = new HashMap<>();

    /** Make the input image wrap once without mirroring it, then upload it as a dynamic texture. */
    private static Prepared prepare(Identifier source) {
        Prepared cached = PANORAMAS.get(source);
        if (cached != null) {
            return cached;
        }
        MinecraftClient client = MinecraftClient.getInstance();
        var resource = client.getResourceManager().getResource(source)
                .orElseThrow(() -> new IllegalStateException("missing sky art: " + source));
        try (var in = resource.getInputStream(); NativeImage original = NativeImage.read(in)) {
            SkyPanorama.Image prepared = SkyPanorama.create(
                    original.copyPixelsArgb(), original.getWidth(), original.getHeight());
            NativeImage panorama = new NativeImage(prepared.width(), prepared.height(), false);
            NativeImageBackedTexture texture = null;
            boolean registered = false;
            try {
                int[] pixels = prepared.argb();
                for (int y = 0; y < prepared.height(); y++) {
                    for (int x = 0; x < prepared.width(); x++) {
                        // get/copyPixelsArgb return ARGB; setColor writes ABGR and swaps red/blue.
                        panorama.setColorArgb(x, y, pixels[y * prepared.width() + x]);
                    }
                }
                Identifier id = Identifier.of("orbit", "sky_panorama/" + source.getPath().replace('/', '_'));
                texture = new NativeImageBackedTexture(() -> "Orbit sky " + source, panorama);
                client.getTextureManager().registerTexture(id, texture);
                registered = true; // the texture manager now owns the image
                Prepared result = new Prepared(id);
                PANORAMAS.put(source, result);
                return result;
            } finally {
                if (!registered) {
                    if (texture != null) {
                        texture.close();
                    } else {
                        panorama.close();
                    }
                }
            }
        } catch (Exception e) {
            throw new IllegalStateException("Could not build the sky panorama for " + source, e);
        }
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
