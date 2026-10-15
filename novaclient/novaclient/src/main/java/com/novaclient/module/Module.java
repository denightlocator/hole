package com.novaclient.module;

import com.google.gson.JsonObject;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import org.joml.Matrix3x2fStack;

import java.util.ArrayList;
import java.util.List;

public abstract class Module {
	public final String id, name, desc;
	public final Category category;
	public final boolean hud;
	public boolean enabled;
	/** Position as a fraction (0..1) of the free screen space, so layouts survive resizes / GUI scale changes. */
	public double fx, fy, defFx, defFy;
	public float scale = 1f;
	/** Content size in unscaled pixels, kept up to date by tick(). */
	public int w, h;
	public final List<Setting> settings = new ArrayList<>();

	protected Module(String id, String name, String desc, Category category, boolean hud) {
		this.id = id; this.name = name; this.desc = desc; this.category = category; this.hud = hud;
	}

	public Module pos(double x, double y, boolean on) {
		fx = defFx = x; fy = defFy = y; enabled = on; return this;
	}

	protected Setting add(Setting s) { settings.add(s); return s; }

	public void resetPos() { fx = defFx; fy = defFy; scale = 1f; }

	/** Draws at (0,0); the caller has already translated + scaled. */
	public abstract void render(DrawContext ctx);
	public void tick(MinecraftClient mc) {}

	public int ew() { return Math.max(w, 50); }
	public int eh() { return Math.max(h, 14); }
	public int px(int sw) { return (int) (fx * Math.max(0, sw - ew() * scale)); }
	public int py(int sh) { return (int) (fy * Math.max(0, sh - eh() * scale)); }

	public void setPos(double x, double y, int sw, int sh) {
		double fw = sw - ew() * scale, fh = sh - eh() * scale;
		fx = fw <= 0 ? 0 : Math.max(0, Math.min(1, x / fw));
		fy = fh <= 0 ? 0 : Math.max(0, Math.min(1, y / fh));
	}

	public void draw(DrawContext ctx, int sw, int sh) {
		if (w <= 0 || h <= 0) return;
		Matrix3x2fStack ms = ctx.getMatrices();
		ms.pushMatrix();
		ms.translate((float) px(sw), (float) py(sh));
		ms.scale(scale, scale);
		render(ctx);
		ms.popMatrix();
	}

	public JsonObject toJson() {
		JsonObject o = new JsonObject();
		o.addProperty("enabled", enabled);
		o.addProperty("fx", fx); o.addProperty("fy", fy); o.addProperty("scale", scale);
		JsonObject st = new JsonObject();
		for (Setting s : settings) switch (s.type) {
			case BOOL -> st.addProperty(s.key, s.on);
			case NUMBER -> st.addProperty(s.key, s.num);
			case STRING -> st.addProperty(s.key, s.text);
			default -> {}
		}
		o.add("settings", st);
		return o;
	}

	public void fromJson(JsonObject o) {
		try {
			if (o.has("enabled")) enabled = o.get("enabled").getAsBoolean();
			if (o.has("fx")) fx = o.get("fx").getAsDouble();
			if (o.has("fy")) fy = o.get("fy").getAsDouble();
			if (o.has("scale")) scale = o.get("scale").getAsFloat();
			if (o.has("settings")) {
				JsonObject st = o.getAsJsonObject("settings");
				for (Setting s : settings) {
					if (!st.has(s.key)) continue;
					switch (s.type) {
						case BOOL -> s.on = st.get(s.key).getAsBoolean();
						case NUMBER -> s.num = st.get(s.key).getAsDouble();
						case STRING -> s.text = st.get(s.key).getAsString();
						default -> {}
					}
				}
			}
		} catch (Exception ignored) {}
	}
}
