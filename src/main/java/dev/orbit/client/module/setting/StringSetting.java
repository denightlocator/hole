package dev.orbit.client.module.setting;

/**
 * Free-text setting (item names, command templates, window titles).
 * The inspector turns it into an editable field: click to focus, type, Esc/Enter to commit.
 */
public class StringSetting extends Setting<String> {
    private String value;

    public StringSetting(String name, String defaultValue) {
        super(name);
        this.value = defaultValue;
    }

    public String get() {
        return value;
    }

    public void set(String value) {
        this.value = value;
    }

    /** Replaces {@code {token}} placeholders. */
    public String format(String token, String replacement) {
        return value.replace("{" + token + "}", replacement);
    }

    @Override
    public String getValue() {
        return value;
    }

    @Override
    public String displayValue() {
        return value.isEmpty() ? "(empty)" : value;
    }
}
