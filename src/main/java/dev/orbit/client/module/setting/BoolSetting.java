package dev.orbit.client.module.setting;

public class BoolSetting extends Setting<Boolean> {
    private boolean value;

    public BoolSetting(String name, boolean defaultValue) {
        super(name);
        this.value = defaultValue;
    }

    public boolean get() {
        return value;
    }

    public void set(boolean value) {
        this.value = value;
    }

    @Override
    public Boolean getValue() {
        return value;
    }

    @Override
    public String displayValue() {
        return value ? "on" : "off";
    }

    @Override
    public void onClick() {
        value = !value;
    }
}
