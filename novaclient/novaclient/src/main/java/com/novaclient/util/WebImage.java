package com.novaclient.util;

import net.minecraft.client.MinecraftClient;
import net.minecraft.client.texture.NativeImage;
import net.minecraft.client.texture.NativeImageBackedTexture;
import net.minecraft.util.Identifier;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/** Async image downloader -> cropped/resized GPU texture. Call get() every frame; returns null while loading. */
public final class WebImage {
	public record Tex(Identifier id, int w, int h) {}

	private static final Map<String, Tex> READY = new LinkedHashMap<>();
	private static final Set<String> LOADING = ConcurrentHashMap.newKeySet();
	private static final AtomicInteger COUNTER = new AtomicInteger();

	public static Tex get(String url, int w, int h) {
		if (url == null || url.isEmpty()) return null;
		String key = url + "|" + w + "x" + h;
		Tex t = READY.get(key);
		if (t != null) return t;
		if (LOADING.add(key)) {
			Http.EX.execute(() -> {
				try {
					byte[] png = toPng(Http.get(url).data(), w, h);
					MinecraftClient mc = MinecraftClient.getInstance();
					mc.execute(() -> {
						try {
							NativeImage img = NativeImage.read(new ByteArrayInputStream(png));
							Identifier id = Identifier.of("novaclient", "web/img_" + COUNTER.incrementAndGet());
							mc.getTextureManager().registerTexture(id, new NativeImageBackedTexture(() -> "novaclient_web", img));
							READY.put(key, new Tex(id, w, h));
							evict(mc);
						} catch (Exception ignored) {}
					});
				} catch (Exception ignored) {}
			});
		}
		return null;
	}

	private static void evict(MinecraftClient mc) {
		Iterator<Map.Entry<String, Tex>> it = READY.entrySet().iterator();
		while (READY.size() > 12 && it.hasNext()) {
			Map.Entry<String, Tex> e = it.next();
			mc.getTextureManager().destroyTexture(e.getValue().id());
			LOADING.remove(e.getKey());
			it.remove();
		}
	}

	/** Center-crop to w:h and area-average downscale. Pure pixel math (no Graphics2D). */
	private static byte[] toPng(byte[] bytes, int w, int h) throws Exception {
		BufferedImage src = ImageIO.read(new ByteArrayInputStream(bytes));
		if (src == null) throw new IllegalStateException("bad image");
		int sw = src.getWidth(), sh = src.getHeight();
		double target = (double) w / h, cw = sw, ch = sh;
		if (sw / (double) sh > target) cw = sh * target; else ch = sw / target;
		double cx = (sw - cw) / 2, cy = (sh - ch) / 2;
		BufferedImage dst = new BufferedImage(w, h, BufferedImage.TYPE_INT_ARGB);
		for (int y = 0; y < h; y++) {
			int y0 = Math.min(sh - 1, (int) (cy + y * ch / h));
			int y1 = Math.min(sh, Math.max(y0 + 1, (int) Math.ceil(cy + (y + 1) * ch / h)));
			for (int x = 0; x < w; x++) {
				int x0 = Math.min(sw - 1, (int) (cx + x * cw / w));
				int x1 = Math.min(sw, Math.max(x0 + 1, (int) Math.ceil(cx + (x + 1) * cw / w)));
				long a = 0, r = 0, g = 0, b = 0, n = 0;
				for (int yy = y0; yy < y1; yy++)
					for (int xx = x0; xx < x1; xx++) {
						int p = src.getRGB(xx, yy);
						a += p >>> 24; r += (p >> 16) & 255; g += (p >> 8) & 255; b += p & 255; n++;
					}
				if (n == 0) n = 1;
				dst.setRGB(x, y, (int) (a / n) << 24 | (int) (r / n) << 16 | (int) (g / n) << 8 | (int) (b / n));
			}
		}
		ByteArrayOutputStream out = new ByteArrayOutputStream();
		ImageIO.write(dst, "png", out);
		return out.toByteArray();
	}
}
