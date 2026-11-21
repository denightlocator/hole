package dev.orbit.client.module.setting;

import java.util.Arrays;
import java.util.List;

public class ModeSetting extends Setting<String> {
    private final List<String> modes;
    private String value;

    public ModeSetting(String name, String defaultMode, String... modes) {
        super(name);
        this.modes = Arrays.asList(modes);
        this.value = this.modes.contains(defaultMode) ? defaultMode : this.modes.get(0);
    }

    public List<String> getModes() {
        return modes;
    }

    public String get() {
        return value;
    }

    public void set(String value) {
        if (modes.contains(value)) {
            this.value = value;
        }
    }

    @Override
    public String getValue() {
        return value;
    }

    @Override
    public String displayValue() {
        return value;
    }

    @Override
    public void onClick() {
        int index = modes.indexOf(value);
        value = modes.get((index + 1) % modes.size());
    }
}
