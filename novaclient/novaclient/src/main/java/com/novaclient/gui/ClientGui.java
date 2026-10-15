package com.novaclient.gui;

import com.novaclient.NovaClient;
import com.novaclient.Theme;
import com.novaclient.module.*;
import com.novaclient.util.Gfx;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.Click;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.input.KeyInput;
import net.minecraft.text.Text;
import org.joml.Matrix3x2fStack;

import java.util.*;

/** The main menu (Right Ctrl by default): module cards, categories, scroll, HUD editor button. */
public class ClientGui extends Screen {
	private static final int SIDE = 104, CARD_H = 38, GAP = 8;

	private final Screen prev;
	private final long opened = System.currentTimeMillis();
	private Category tab = null;
	private float scroll, target;
	private final Map<Module, Float> anim = new HashMap<>();
	private int px, py, pw, ph, cx, cy, cw, ch;

	public ClientGui() {
		super(Text.literal("Nova Client"));
		prev = MinecraftClient.getInstance().currentScreen;
	}

	@Override protected void init() {
		pw = Math.min(470, width - 16);
		ph = Math.min(290, height - 16);
		px = (width - pw) / 2;
		py = (height - ph) / 2;
		cx = px + SIDE + 6;
		cy = py + 32;
		cw = pw - SIDE - 12;
		ch = ph - 32 - 38;
	}

	@Override public boolean shouldPause() { return false; }

	@Override public void renderBackground(DrawContext c, int mx, int my, float d) { c.fill(0, 0, width, height, 0x90000000); }

	private List<Module> list() {
		List<Module> l = new ArrayList<>();
		for (Module m : ModuleManager.MODULES) if (tab == null || m.category == tab) l.add(m);
		return l;
	}

	private int cardW() { return (cw - GAP) / 2; }
	private int cardX(int i) { return cx + (i % 2) * (cardW() + GAP); }
	private int cardY(int i) { return cy + (i / 2) * (CARD_H + GAP) - (int) scroll; }

	private void button(DrawContext c, int x, int y, int w, int h, String label, boolean hov, boolean primary) {
		int acc = Theme.accent();
		int bg = primary ? (hov ? acc : (acc & 0xFFFFFF) | 0xCC000000) : (hov ? 0xFF33334A : 0xFF24243A);
		c.fill(x, y, x + w, y + h, bg);
		int tw = textRenderer.getWidth(label);
		c.drawText(textRenderer, label, x + (w - tw) / 2, y + (h - 8) / 2, primary ? 0xFF101018 : 0xFFFFFFFF, false);
	}

	@Override public void render(DrawContext c, int mx, int my, float delta) {
		renderBackground(c, mx, my, delta);
		float t = Math.min(1f, (System.currentTimeMillis() - opened) / 180f);
		float e = 1 - (float) Math.pow(1 - t, 3);
		float s = 0.92f + 0.08f * e;
		Matrix3x2fStack ms = c.getMatrices();
		ms.pushMatrix();
		ms.translate(width / 2f, height / 2f);
		ms.scale(s, s);
		ms.translate(-width / 2f, -height / 2f);

		int acc = Theme.accent();
		c.fill(px, py, px + pw, py + ph, 0xF2121219);
		c.fill(px, py, px + pw, py + 2, acc);
		c.fill(px, py + 2, px + SIDE, py + ph, 0xFF0E0E15);
		c.drawText(textRenderer, "NOVA CLIENT", px + 12, py + 12, acc, true);
		c.drawText(textRenderer, tab == null ? "All modules" : tab.label + " modules", cx, py + 12, 0xFFFFFFFF, false);

		// sidebar tabs
		int ty = py + 34;
		List<Category> tabs = new ArrayList<>();
		tabs.add(null);
		tabs.addAll(Arrays.asList(Category.values()));
		for (Category cat : tabs) {
			boolean sel = tab == cat, hov = Gfx.in(mx, my, px + 6, ty, SIDE - 12, 20);
			if (sel) { c.fill(px + 6, ty, px + SIDE - 6, ty + 20, (acc & 0xFFFFFF) | 0x40000000); c.fill(px + 6, ty, px + 8, ty + 20, acc); }
			else if (hov) c.fill(px + 6, ty, px + SIDE - 6, ty + 20, 0x20FFFFFF);
			c.drawText(textRenderer, cat == null ? "All" : cat.label, px + 14, ty + 6, sel ? 0xFFFFFFFF : Gfx.GRAY, false);
			ty += 22;
		}

		// cards
		List<Module> l = list();
		float total = ((l.size() + 1) / 2) * (CARD_H + GAP);
		float max = Math.max(0, total - ch);
		target = Math.max(0, Math.min(max, target));
		scroll += (target - scroll) * 0.35f;
		c.enableScissor(cx, cy, cx + cw, cy + ch);
		for (int i = 0; i < l.size(); i++) {
			Module m = l.get(i);
			int x = cardX(i), y = cardY(i), w = cardW();
			if (y + CARD_H < cy || y > cy + ch) continue;
			boolean hov = Gfx.in(mx, my, x, y, w, CARD_H) && Gfx.in(mx, my, cx, cy, cw, ch);
			c.fill(x, y, x + w, y + CARD_H, hov ? 0xFF2A2A3C : 0xFF1E1E2C);
			float a = anim.getOrDefault(m, m.enabled ? 1f : 0f);
			a += ((m.enabled ? 1f : 0f) - a) * 0.3f;
			anim.put(m, a);
			boolean toggleable = m.hud;
			c.fill(x, y, x + 2, y + CARD_H, toggleable ? Gfx.lerp(0xFF444458, acc, a) : acc);
			c.drawText(textRenderer, m.name, x + 8, y + 7, 0xFFFFFFFF, false);
			Gfx.small(c, Gfx.trim(m.desc, (int) ((w - 50) / 0.75f)), x + 8, y + 21, 0.75f, 0xFF8888A0);
			if (toggleable) {
				int sx = x + w - 30, sy = y + 7;
				c.fill(sx, sy, sx + 24, sy + 12, Gfx.lerp(0xFF3A3A4E, acc, a));
				int kx = sx + 2 + (int) (12 * a);
				c.fill(kx, sy + 2, kx + 8, sy + 10, 0xFFFFFFFF);
			}
			if (!m.settings.isEmpty()) {
				boolean sh = Gfx.in(mx, my, x + w - 52, y + 22, 48, 14);
				Gfx.small(c, "Settings >", x + w - 46, y + 26, 0.75f, sh ? acc : 0xFF8888A0);
			}
		}
		c.disableScissor();
		if (max > 0) {
			int bh = Math.max(16, (int) (ch * ch / (ch + max)));
			int by = cy + (int) ((ch - bh) * (scroll / max));
			c.fill(cx + cw + 2, by, cx + cw + 4, by + bh, (acc & 0xFFFFFF) | 0x99000000);
		}

		// footer
		int fy = py + ph - 30;
		String hint = NovaClient.openKey.getBoundKeyLocalizedText().getString() + " closes this menu";
		c.drawText(textRenderer, hint, cx, fy + 6, 0xFF6C6C84, false);
		button(c, px + pw - 170, fy, 84, 20, "Edit HUD", Gfx.in(mx, my, px + pw - 170, fy, 84, 20), false);
		button(c, px + pw - 80, fy, 68, 20, "Done", Gfx.in(mx, my, px + pw - 80, fy, 68, 20), true);
		ms.popMatrix();
	}

	@Override public boolean mouseClicked(Click click, boolean doubled) {
		double mx = click.x(), my = click.y();
		int btn = click.button();
		if (btn != 0 && btn != 1) return false;

		int ty = py + 34;
		List<Category> tabs = new ArrayList<>();
		tabs.add(null);
		tabs.addAll(Arrays.asList(Category.values()));
		for (Category cat : tabs) {
			if (Gfx.in(mx, my, px + 6, ty, SIDE - 12, 20)) { tab = cat; scroll = target = 0; return true; }
			ty += 22;
		}
		int fy = py + ph - 30;
		if (Gfx.in(mx, my, px + pw - 170, fy, 84, 20)) { client.setScreen(new HudEditorScreen(this)); return true; }
		if (Gfx.in(mx, my, px + pw - 80, fy, 68, 20)) { close(); return true; }

		if (Gfx.in(mx, my, cx, cy, cw, ch)) {
			List<Module> l = list();
			for (int i = 0; i < l.size(); i++) {
				Module m = l.get(i);
				int x = cardX(i), y = cardY(i), w = cardW();
				if (!Gfx.in(mx, my, x, y, w, CARD_H)) continue;
				boolean gear = !m.settings.isEmpty() && Gfx.in(mx, my, x + w - 52, y + 22, 48, 14);
				if (gear || btn == 1 || !m.hud) { if (!m.settings.isEmpty()) client.setScreen(new ModuleSettingsScreen(this, m)); }
				else m.enabled = !m.enabled;
				return true;
			}
		}
		return super.mouseClicked(click, doubled);
	}

	@Override public boolean mouseScrolled(double mx, double my, double h, double v) { target -= (float) v * 28; return true; }

	@Override public boolean keyPressed(KeyInput input) {
		if (NovaClient.openKey.matchesKey(input)) { close(); return true; }
		return super.keyPressed(input);
	}

	@Override public void close() {
		ConfigManager.save();
		client.setScreen(prev);
	}
}
