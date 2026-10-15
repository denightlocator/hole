package com.novaclient;

import com.novaclient.module.ModuleManager;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;

import java.awt.Color;

public final class Theme {
	public static int accent() {
		var t = ModuleManager.THEME;
		if (t == null) return 0xFF8A6BFF;
		float hue = t.rainbow.b() ? (System.currentTimeMillis() % 6000) / 6000f : t.hue.f() / 360f;
		return 0xFF000000 | (Color.HSBtoRGB(hue, 0.6f, 1f) & 0xFFFFFF);
	}

	public static int bg() {
		var t = ModuleManager.THEME;
		double o = t == null ? 55 : t.opacity.num;
		return ((int) (o / 100.0 * 255) << 24) | 0x0E0E16;
	}

	public static void panel(DrawContext c, int x, int y, int w, int h) {
		c.fill(x, y, x + w, y + h, bg());
		var t = ModuleManager.THEME;
		if (t == null || t.bar.b()) c.fill(x, y, x + 2, y + h, accent());
	}

	public static void text(DrawContext c, String s, int x, int y, int color) {
		var t = ModuleManager.THEME;
		c.drawText(MinecraftClient.getInstance().textRenderer, s, x, y, color, t == null || t.shadow.b());
	}
}
