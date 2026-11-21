package dev.orbit.client.module;

/** InputUtil is supplied by Minecraft at runtime; this double keeps config strings testable. */
public final class Keybind {
    public static final Keybind UNBOUND = new Keybind("");
    private final String value;
    private Keybind(String value) { this.value = value; }
    public static Keybind keyboard(int code) {
        return new Keybind("key.keyboard." + (char) Character.toLowerCase(code));
    }
    public static Keybind parse(String value) { return value == null ? UNBOUND : new Keybind(value); }
    public static Keybind fromLegacyCode(int code) { return code == -1 ? UNBOUND : keyboard(code); }
    public boolean isBound() { return !value.isEmpty(); }
    public String serialize() { return value; }
}
