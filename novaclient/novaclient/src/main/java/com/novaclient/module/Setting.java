package com.novaclient.module;

public class Setting {
	public enum Type { BOOL, NUMBER, STRING, ACTION }

	public final String key, label;
	public final Type type;
	public boolean on;
	public double num, min, max, step = 1;
	public String text = "";
	public Runnable action;

	private Setting(String key, String label, Type type) { this.key = key; this.label = label; this.type = type; }

	public static Setting bool(String key, String label, boolean def) {
		Setting s = new Setting(key, label, Type.BOOL); s.on = def; return s;
	}
	public static Setting number(String key, String label, double def, double min, double max, double step) {
		Setting s = new Setting(key, label, Type.NUMBER); s.num = def; s.min = min; s.max = max; s.step = step; return s;
	}
	public static Setting string(String key, String label, String def) {
		Setting s = new Setting(key, label, Type.STRING); s.text = def; return s;
	}
	public static Setting action(String label, Runnable r) {
		Setting s = new Setting(label, label, Type.ACTION); s.action = r; return s;
	}

	public boolean b() { return on; }
	public int i() { return (int) Math.round(num); }
	public float f() { return (float) num; }
	public String s() { return text == null ? "" : text; }
}
