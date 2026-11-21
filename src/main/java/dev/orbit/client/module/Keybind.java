package dev.orbit.client.module;

import net.minecraft.client.util.InputUtil;

/**
 * A single bindable input: a keyboard key or a mouse button, plus the "unbound" state.
 *
 * <p>Serialises as the vanilla translation key ({@code key.keyboard.v}, {@code key.mouse.left}) so
 * config files stay readable and self-describing.
 */
public final class Keybind {
    public static final Keybind UNBOUND = new Keybind(InputUtil.UNKNOWN_KEY);

    private final InputUtil.Key key;

    private Keybind(InputUtil.Key key) {
        this.key = key;
    }

    public static Keybind of(InputUtil.Key key) {
        return key == null ? UNBOUND : new Keybind(key);
    }

    public static Keybind keyboard(int keyCode) {
        return new Keybind(InputUtil.Type.KEYSYM.createFromCode(keyCode));
    }

    public static Keybind mouse(int button) {
        return new Keybind(InputUtil.Type.MOUSE.createFromCode(button));
    }

    /** Parses a translation key; anything unknown becomes {@link #UNBOUND}. */
    public static Keybind parse(String translationKey) {
        if (translationKey == null || translationKey.isBlank()) {
            return UNBOUND;
        }
        try {
            InputUtil.Key parsed = InputUtil.fromTranslationKey(translationKey);
            return parsed.getCode() == -1 ? UNBOUND : new Keybind(parsed);
        } catch (Throwable t) {
            return UNBOUND;
        }
    }

    public InputUtil.Key getKey() {
        return key;
    }

    public int getCode() {
        return key.getCode();
    }

    public InputUtil.Type getType() {
        return key.getCategory();
    }

    public boolean isBound() {
        return !this.equals(UNBOUND) && key.getCode() != -1;
    }

    /** Human readable name shown in the GUI ("V", "Left Shift", "Mouse Left"). */
    /**
     * True while this bind is physically held down.
     *
     * <p>Distinct from a toggle: Zoom and Freecam need "held", the module keybinds need "pressed".
     * Mouse buttons are handled too, so a zoom bound to a side button works the same way.
     */
    public boolean isHeld() {
        if (!isBound()) {
            return false;
        }
        long handle = net.minecraft.client.MinecraftClient.getInstance().getWindow().getHandle();
        if (getType() == InputUtil.Type.MOUSE) {
            return org.lwjgl.glfw.GLFW.glfwGetMouseButton(handle, getCode()) == org.lwjgl.glfw.GLFW.GLFW_PRESS;
        }
        return org.lwjgl.glfw.GLFW.glfwGetKey(handle, getCode()) == org.lwjgl.glfw.GLFW.GLFW_PRESS;
    }

    public String displayName() {
        if (!isBound()) {
            return "none";
        }
        String name = key.getLocalizedText().getString();
        // vanilla returns a single letter for keyboard keys; keep it short
        return name;
    }

    public String serialize() {
        return isBound() ? key.getTranslationKey() : "";
    }

    @Override
    public boolean equals(Object other) {
        if (!(other instanceof Keybind bind)) {
            return false;
        }
        return key.getCode() == bind.key.getCode() && key.getCategory() == bind.key.getCategory();
    }

    @Override
    public int hashCode() {
        return key.getCode() * 31 + key.getCategory().ordinal();
    }

    @Override
    public String toString() {
        return displayName();
    }

    /** Convenience for callers that only have an integer key code. */
    public static Keybind fromLegacyCode(int code) {
        return code == -1 ? UNBOUND : keyboard(code);
    }
}
