package dev.orbit.client.module.setting;

public class NumberSetting {
    public final String name;
    private double value;

    public NumberSetting(String name, double value, double min, double max, double step, String unit) {
        this.name = name;
        this.value = value;
    }
    public double get() { return value; }
    public void set(double value) { this.value = value; }
}
