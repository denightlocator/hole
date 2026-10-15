package com.novaclient.gui;

import com.novaclient.Theme;
import com.novaclient.module.*;
import com.novaclient.util.Gfx;
import net.minecraft.client.gui.Click;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.text.Text;

import java.util.ArrayList;
import java.util.List;

/** Drag widgets anywhere (they snap to edges + center), scroll over one to resize, right-click for its settings. */
public class HudEditorScreen extends Screen {
	private final Screen parent;
	private Module drag;
	private double offX, offY;
	private boolean snapX, snapY;

	public HudEditorScreen(Screen parent) {
		super(Text.literal("HUD Editor"));
		this.parent = parent;
	}

	private List<Module> hud() {
		List<Module> l = new ArrayList<>();
		for (Module m : ModuleManager.MODULES) if (m.hud && m.enabled) l.add(m);
		return l;
	}

	@Override public boolean shouldPause() { return false; }
	@Override public void renderBackground(DrawContext c, int mx, int my, float d) { c.fill(0, 0, width, height, 0x60000000); }

	@Override public void render(DrawContext c, int mx, int my, float delta) {
		renderBackground(c, mx, my, delta);
		int acc = Theme.accent();
		if (drag != null && snapX) c.fill(width / 2, 0, width / 2 + 1, height, (acc & 0xFFFFFF) | 0x99000000);
		if (drag != null && snapY) c.fill(0, height / 2, width, height / 2 + 1, (acc & 0xFFFFFF) | 0x99000000);

		for (Module m : hud()) {
			m.draw(c, width, height);
			int x = m.px(width), y = m.py(height), w = (int) (m.ew() * m.scale), h = (int) (m.eh() * m.scale);
			boolean hov = Gfx.in(mx, my, x, y, w, h) || m == drag;
			int col = hov ? acc : 0x88FFFFFF;
			c.fill(x - 1, y - 1, x + w + 1, y, col);
			c.fill(x - 1, y + h, x + w + 1, y + h + 1, col);
			c.fill(x - 1, y, x, y + h, col);
			c.fill(x + w, y, x + w + 1, y + h, col);
			if (m.w <= 0) c.fill(x, y, x + w, y + h, 0x33FFFFFF);
			if (hov) Gfx.small(c, m.name + "  " + Math.round(m.scale * 100) + "%", x, y - 9, 0.8f, 0xFFFFFFFF);
		}

		c.drawCenteredTextWithShadow(textRenderer, "Drag to move  |  Scroll to resize  |  Right-click for settings", width / 2, 8, 0xFFFFFFFF);
		int by = height - 30;
		boolean h1 = Gfx.in(mx, my, width / 2 - 104, by, 100, 20), h2 = Gfx.in(mx, my, width / 2 + 4, by, 100, 20);
		c.fill(width / 2 - 104, by, width / 2 - 4, by + 20, h1 ? 0xFF33334A : 0xFF24243A);
		c.fill(width / 2 + 4, by, width / 2 + 104, by + 20, h2 ? acc : (acc & 0xFFFFFF) | 0xCC000000);
		c.drawCenteredTextWithShadow(textRenderer, "Reset all", width / 2 - 54, by + 6, 0xFFFFFFFF);
		c.drawText(textRenderer, "Done", width / 2 + 54 - textRenderer.getWidth("Done") / 2, by + 6, 0xFF101018, false);
	}

	@Override public boolean mouseClicked(Click click, boolean doubled) {
		double mx = click.x(), my = click.y();
		int btn = click.button();
		int by = height - 30;
		if (btn == 0 && Gfx.in(mx, my, width / 2 - 104, by, 100, 20)) { for (Module m : ModuleManager.MODULES) if (m.hud) m.resetPos(); return true; }
		if (btn == 0 && Gfx.in(mx, my, width / 2 + 4, by, 100, 20)) { close(); return true; }
		List<Module> l = hud();
		for (int i = l.size() - 1; i >= 0; i--) {
			Module m = l.get(i);
			int x = m.px(width), y = m.py(height);
			if (!Gfx.in(mx, my, x, y, (int) (m.ew() * m.scale), (int) (m.eh() * m.scale))) continue;
			if (btn == 0) { drag = m; offX = mx - x; offY = my - y; }
			else if (btn == 1 && !m.settings.isEmpty()) client.setScreen(new ModuleSettingsScreen(this, m));
			else if (btn == 1) { /* no settings */ }
			return true;
		}
		return super.mouseClicked(click, doubled);
	}

	@Override public boolean mouseDragged(Click click, double dx, double dy) {
		if (drag == null || click.button() != 0) return super.mouseDragged(click, dx, dy);
		int mw = (int) (drag.ew() * drag.scale), mh = (int) (drag.eh() * drag.scale);
		double nx = click.x() - offX, ny = click.y() - offY;
		snapX = snapY = false;
		if (Math.abs(nx) < 5) nx = 0;
		else if (Math.abs(nx + mw - width) < 5) nx = width - mw;
		else if (Math.abs(nx + mw / 2.0 - width / 2.0) < 5) { nx = (width - mw) / 2.0; snapX = true; }
		if (Math.abs(ny) < 5) ny = 0;
		else if (Math.abs(ny + mh - height) < 5) ny = height - mh;
		else if (Math.abs(ny + mh / 2.0 - height / 2.0) < 5) { ny = (height - mh) / 2.0; snapY = true; }
		drag.setPos(nx, ny, width, height);
		return true;
	}

	@Override public boolean mouseReleased(Click click) {
		drag = null; snapX = snapY = false;
		return super.mouseReleased(click);
	}

	@Override public boolean mouseScrolled(double mx, double my, double h, double v) {
		List<Module> l = hud();
		for (int i = l.size() - 1; i >= 0; i--) {
			Module m = l.get(i);
			if (Gfx.in(mx, my, m.px(width), m.py(height), (int) (m.ew() * m.scale), (int) (m.eh() * m.scale))) {
				m.scale = Math.max(0.5f, Math.min(2.5f, m.scale + (float) v * 0.1f));
				return true;
			}
		}
		return false;
	}

	@Override public void close() {
		ConfigManager.save();
		client.setScreen(parent);
	}
}
