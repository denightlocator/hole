package dev.orbitobserver.client.module.setting;

public final class StringSetting {
    private final String name;
    private final String defaultValue;
    private String value;

    public StringSetting(String name, String value) {
        this.name = name;
        this.defaultValue = value;
        this.value = value;
    }

    public String name() { return name; }
    public String get() { return value; }
    public void set(String value) { this.value = value == null ? defaultValue : value; }
}
