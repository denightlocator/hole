package dev.orbitobserver.client.module;

/** The default keyboard code; vanilla stores any user rebinds in options.txt. */
public record Keybind(int code) {
    public static Keybind keyboard(int code) { return new Keybind(code); }
}
