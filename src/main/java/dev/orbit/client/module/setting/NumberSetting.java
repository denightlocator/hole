package dev.orbit.client.module.setting;

public class NumberSetting extends Setting<Double> {
    private final double min;
    private final double max;
    private final double step;
    private final String suffix;
    private double value;

    public NumberSetting(String name, double defaultValue, double min, double max, double step, String suffix) {
        super(name);
        this.min = min;
        this.max = max;
        this.step = step;
        this.suffix = suffix;
        this.value = clamp(defaultValue);
    }

    private double clamp(double v) {
        double clamped = Math.max(min, Math.min(max, v));
        if (step > 0) {
            clamped = Math.round(clamped / step) * step;
        }
        return clamped;
    }

    public double get() {
        return value;
    }

    public int getInt() {
        return (int) Math.round(value);
    }

    public void set(double v) {
        this.value = clamp(v);
    }

    public double getMin() {
        return min;
    }

    public double getMax() {
        return max;
    }

    @Override
    public Double getValue() {
        return value;
    }

    /** 0..1 position of the value on the track. */
    public float progress() {
        return (float) ((value - min) / (max - min));
    }

    @Override
    public String displayValue() {
        String text = step >= 1 ? String.valueOf((int) Math.round(value)) : String.format("%.1f", value);
        return text + suffix;
    }
}
