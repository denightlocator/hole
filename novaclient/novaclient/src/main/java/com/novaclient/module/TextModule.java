package com.novaclient.module;

import com.novaclient.Theme;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;

import java.util.List;

/** Base for simple "Label: value" widgets. */
public abstract class TextModule extends Module {
	public record Line(String label, String value, int color) {}

	protected List<Line> lines = List.of();

	protected TextModule(String id, String name, String desc, Category c) { super(id, name, desc, c, true); }

	protected abstract List<Line> build(MinecraftClient mc);

	@Override public void tick(MinecraftClient mc) {
		lines = build(mc);
		if (lines.isEmpty()) { w = 0; h = 0; return; }
		int mw = 0;
		for (Line l : lines) mw = Math.max(mw, mc.textRenderer.getWidth(l.label() + l.value()));
		w = mw + 12;
		h = lines.size() * 11 + 5;
	}

	@Override public void render(DrawContext ctx) {
		if (lines.isEmpty()) return;
		Theme.panel(ctx, 0, 0, w, h);
		int y = 4;
		for (Line l : lines) {
			Theme.text(ctx, l.label(), 6, y, Theme.accent());
			Theme.text(ctx, l.value(), 6 + MinecraftClient.getInstance().textRenderer.getWidth(l.label()), y, l.color());
			y += 11;
		}
	}
}
