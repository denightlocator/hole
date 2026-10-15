package com.novaclient.util;

import net.minecraft.client.MinecraftClient;
import net.minecraft.client.font.TextRenderer;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gl.RenderPipelines;
import org.joml.Matrix3x2fStack;
import net.minecraft.util.Identifier;

public final class Gfx {
	public static final int WHITE = 0xFFFFFFFF, GRAY = 0xFFA0A0B8, GREEN = 0xFF55FF55, YELLOW = 0xFFFFDD55, RED = 0xFFFF5555;

	public static MinecraftClient mc() { return MinecraftClient.getInstance(); }

	public static int lerp(int a, int b, float t) {
		t = Math.max(0, Math.min(1, t));
		int r = 0;
		for (int s = 0; s <= 24; s += 8) {
			int ca = (a >> s) & 255, cb = (b >> s) & 255;
			r |= ((int) (ca + (cb - ca) * t) & 255) << s;
		}
		return r;
	}

	public static String trim(String s, int maxW) {
		TextRenderer tr = mc().textRenderer;
		if (tr.getWidth(s) <= maxW) return s;
		return tr.trimToWidth(s, Math.max(0, maxW - tr.getWidth(".."))) + "..";
	}

	public static void small(DrawContext c, String s, int x, int y, float sc, int col) {
		Matrix3x2fStack m = c.getMatrices();
		m.pushMatrix();
		m.translate((float) x, (float) y);
		m.scale(sc, sc);
		c.drawText(mc().textRenderer, s, 0, 0, col, false);
		m.popMatrix();
	}

	/** Draws a texture of texW x texH scaled into a drawW x drawH box. */
	public static void image(DrawContext c, Identifier id, int x, int y, int drawW, int drawH, int texW, int texH) {
		Matrix3x2fStack m = c.getMatrices();
		m.pushMatrix();
		m.translate((float) x, (float) y);
		m.scale(drawW / (float) texW, drawH / (float) texH);
		c.drawTexture(RenderPipelines.GUI_TEXTURED, id, 0, 0, 0f, 0f, texW, texH, texW, texH);
		m.popMatrix();
	}

	public static String time(long ms) {
		long s = Math.max(0, ms / 1000);
		return (s / 60) + ":" + String.format("%02d", s % 60);
	}

	public static boolean in(double mx, double my, int x, int y, int w, int h) {
		return mx >= x && mx < x + w && my >= y && my < y + h;
	}
}
