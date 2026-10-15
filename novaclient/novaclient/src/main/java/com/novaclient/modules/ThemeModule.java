package com.novaclient.modules;

import com.novaclient.module.*;
import net.minecraft.client.gui.DrawContext;

public class ThemeModule extends Module {
	public final Setting hue = add(Setting.number("hue", "Accent hue", 265, 0, 360, 1));
	public final Setting rainbow = add(Setting.bool("rainbow", "Rainbow accent", false));
	public final Setting opacity = add(Setting.number("opacity", "Panel opacity %", 55, 0, 100, 1));
	public final Setting shadow = add(Setting.bool("shadow", "Text shadow", true));
	public final Setting bar = add(Setting.bool("bar", "Accent bar", true));

	public ThemeModule() { super("theme", "Theme", "Accent color and panel style for every widget", Category.CLIENT, false); enabled = true; }
	@Override public void render(DrawContext ctx) {}
}
