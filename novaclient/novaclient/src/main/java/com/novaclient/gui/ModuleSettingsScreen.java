package com.novaclient.gui;

import com.novaclient.Theme;
import com.novaclient.module.*;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.widget.ButtonWidget;
import net.minecraft.client.gui.widget.SliderWidget;
import net.minecraft.client.gui.widget.TextFieldWidget;
import net.minecraft.text.Text;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.function.DoubleConsumer;

public class ModuleSettingsScreen extends Screen {
	private final Screen parent;
	private final Module module;
	private record Lbl(String t, int x, int y) {}
	private final List<Lbl> labels = new ArrayList<>();

	public ModuleSettingsScreen(Screen parent, Module m) {
		super(Text.literal(m.name));
		this.parent = parent;
		this.module = m;
	}

	private static String fmt(double v, double step) {
		return step >= 1 ? String.valueOf((int) Math.round(v)) : String.format(Locale.ROOT, "%.2f", v);
	}

	private static final class NumSlider extends SliderWidget {
		private final String label; private final double min, max, step; private final DoubleConsumer set;
		NumSlider(int x, int y, int w, String label, double min, double max, double step, double cur, DoubleConsumer set) {
			super(x, y, w, 20, Text.empty(), (cur - min) / (max - min));
			this.label = label; this.min = min; this.max = max; this.step = step; this.set = set;
			updateMessage();
		}
		private double val() {
			double v = min + value * (max - min);
			return step > 0 ? Math.round(v / step) * step : v;
		}
		@Override protected void updateMessage() { setMessage(Text.literal(label + ": " + fmt(val(), step))); }
		@Override protected void applyValue() { set.accept(val()); }
	}

	@Override protected void init() {
		labels.clear();
		int total = 310, x0 = (width - total) / 2, y = 44, col = 0;

		List<Setting> all = new ArrayList<>(module.settings);
		if (module.hud) {
			addDrawableChild(new NumSlider(x0, y, 150, "Scale", 0.5, 2.5, 0.05, module.scale, v -> module.scale = (float) v));
			addDrawableChild(ButtonWidget.builder(Text.literal("Reset position"), b -> module.resetPos()).dimensions(x0 + 160, y, 150, 20).build());
			y += 26;
		}
		for (Setting s : all) {
			switch (s.type) {
				case STRING -> {
					if (col == 1) { col = 0; y += 24; }
					labels.add(new Lbl(s.label, x0, y));
					TextFieldWidget f = new TextFieldWidget(textRenderer, x0, y + 11, total, 18, Text.literal(s.label));
					f.setMaxLength(1000);
					f.setText(s.s());
					f.setChangedListener(t -> s.text = t);
					addDrawableChild(f);
					y += 36;
				}
				default -> {
					int x = x0 + col * 160;
					switch (s.type) {
						case BOOL -> {
							addDrawableChild(ButtonWidget.builder(Text.literal(s.label + ": " + (s.on ? "ON" : "OFF")), b -> {
								s.on = !s.on;
								b.setMessage(Text.literal(s.label + ": " + (s.on ? "ON" : "OFF")));
							}).dimensions(x, y, 150, 20).build());
						}
						case NUMBER -> addDrawableChild(new NumSlider(x, y, 150, s.label, s.min, s.max, s.step, s.num, v -> s.num = v));
						case ACTION -> addDrawableChild(ButtonWidget.builder(Text.literal(s.label), b -> s.action.run()).dimensions(x, y, 150, 20).build());
						default -> {}
					}
					if (++col == 2) { col = 0; y += 24; }
				}
			}
		}
		if (col == 1) y += 24;
		addDrawableChild(ButtonWidget.builder(Text.literal("Done"), b -> close()).dimensions(width / 2 - 50, Math.min(height - 28, y + 8), 100, 20).build());
	}

	@Override public void renderBackground(DrawContext c, int mx, int my, float d) { c.fill(0, 0, width, height, 0xC0000000); }

	@Override public void render(DrawContext c, int mx, int my, float d) {
		renderBackground(c, mx, my, d);
		c.fill(width / 2 - 165, 12, width / 2 + 165, 34, 0xF2121219);
		c.fill(width / 2 - 165, 12, width / 2 + 165, 14, Theme.accent());
		c.drawCenteredTextWithShadow(textRenderer, module.name + " settings", width / 2, 20, 0xFFFFFFFF);
		for (Lbl l : labels) c.drawText(textRenderer, l.t(), l.x(), l.y(), 0xFFA0A0B8, false);
		super.render(c, mx, my, d);
	}

	@Override public boolean shouldPause() { return false; }

	@Override public void close() {
		ConfigManager.save();
		client.setScreen(parent);
	}
}
