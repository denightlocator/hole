package com.novaclient.modules;

import com.novaclient.Theme;
import com.novaclient.module.*;
import com.novaclient.util.Gfx;
import com.novaclient.util.Input;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.option.GameOptions;

public class KeystrokesModule extends Module {
	private final Setting mouse = add(Setting.bool("mouse", "Show mouse buttons", true));
	private final Setting cps = add(Setting.bool("cps", "CPS on mouse buttons", true));
	private final Setting space = add(Setting.bool("space", "Show space bar", true));
	private final float[] anim = new float[7];

	public KeystrokesModule() { super("keystrokes", "Keystrokes", "WASD, mouse buttons and space with press animation", Category.PLAYER, true); }

	@Override public void tick(MinecraftClient mc) {
		w = 74;
		h = 48 + (mouse.b() ? 26 : 0) + (space.b() ? 18 : 0);
		if (!mouse.b() && !space.b()) h = 48;
	}

	private void key(DrawContext c, int i, String label, int x, int y, int kw, int kh, boolean down, String sub) {
		anim[i] += ((down ? 1f : 0f) - anim[i]) * 0.3f;
		int bg = Gfx.lerp(Theme.bg(), (Theme.accent() & 0xFFFFFF) | 0xC0000000, anim[i]);
		c.fill(x, y, x + kw, y + kh, bg);
		var tr = MinecraftClient.getInstance().textRenderer;
		if (sub == null) {
			Theme.text(c, label, x + (kw - tr.getWidth(label)) / 2, y + (kh - 8) / 2, Gfx.WHITE);
		} else {
			Theme.text(c, label, x + (kw - tr.getWidth(label)) / 2, y + 3, Gfx.WHITE);
			Gfx.small(c, sub, x + (kw - (int) (tr.getWidth(sub) * 0.75f)) / 2, y + 13, 0.75f, Gfx.GRAY);
		}
	}

	@Override public void render(DrawContext c) {
		GameOptions o = MinecraftClient.getInstance().options;
		key(c, 0, "W", 26, 0, 22, 22, o.forwardKey.isPressed(), null);
		key(c, 1, "A", 0, 24, 22, 22, o.leftKey.isPressed(), null);
		key(c, 2, "S", 26, 24, 22, 22, o.backKey.isPressed(), null);
		key(c, 3, "D", 52, 24, 22, 22, o.rightKey.isPressed(), null);
		int y = 48;
		if (mouse.b()) {
			key(c, 4, "LMB", 0, y, 36, 22, Input.leftDown, cps.b() ? String.valueOf(Input.cpsL()) : null);
			key(c, 5, "RMB", 38, y, 36, 22, Input.rightDown, cps.b() ? String.valueOf(Input.cpsR()) : null);
			y += 24;
		}
		if (space.b()) {
			key(c, 6, "", 0, y, 74, 14, o.jumpKey.isPressed(), null);
			c.fill(24, y + 6, 50, y + 8, 0xFFFFFFFF);
		}
	}
}
