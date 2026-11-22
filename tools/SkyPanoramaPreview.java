import dev.orbit.client.render.SkyPanorama;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Path;

/** Offline adapter: run the production panorama builder on a PNG for projection previews. */
public final class SkyPanoramaPreview {
    public static void main(String[] args) throws IOException {
        if (args.length != 2) {
            throw new IllegalArgumentException("Usage: SkyPanoramaPreview input.png panorama.png");
        }
        BufferedImage source = ImageIO.read(Path.of(args[0]).toFile());
        if (source == null) {
            throw new IOException("Could not decode PNG: " + args[0]);
        }
        int width = source.getWidth();
        int height = source.getHeight();
        SkyPanorama.Image panorama = SkyPanorama.create(
                source.getRGB(0, 0, width, height, null, 0, width), width, height);
        BufferedImage output = new BufferedImage(panorama.width(), panorama.height(), BufferedImage.TYPE_INT_ARGB);
        output.setRGB(0, 0, panorama.width(), panorama.height(), panorama.argb(), 0, panorama.width());
        if (!ImageIO.write(output, "png", Path.of(args[1]).toFile())) {
            throw new IOException("PNG writer is unavailable");
        }
    }
}
