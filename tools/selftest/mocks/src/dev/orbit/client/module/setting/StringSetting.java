package dev.orbit.client.module.setting;

public class StringSetting {
    public final String name;
    private String value;

    public StringSetting(String name, String value) { this.name = name; this.value = value; }
    public String get() { return value; }
    public void set(String value) { this.value = value; }
}
