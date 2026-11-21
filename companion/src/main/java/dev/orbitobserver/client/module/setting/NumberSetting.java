package dev.orbitobserver.client.module.setting;

public final class NumberSetting {
    private final String name;
    private final double defaultValue;
    private final double min;
    private final double max;
    private double value;

    public NumberSetting(String name, double value, double min, double max, double step, String unit) {
        this.name = name;
        this.defaultValue = value;
        this.min = min;
        this.max = max;
        set(value);
    }

    public String name() { return name; }
    public double get() { return value; }
    public void set(double value) {
        if (!Double.isFinite(value)) value = defaultValue;
        this.value = Math.max(min, Math.min(max, value));
    }
}
