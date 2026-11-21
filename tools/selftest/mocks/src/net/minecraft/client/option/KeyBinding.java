package net.minecraft.client.option;

import net.minecraft.client.util.InputUtil;
import net.minecraft.util.Identifier;

public class KeyBinding {
    public final String name;
    public final int defaultCode;
    private int presses;
    public KeyBinding(String name, InputUtil.Type type, int code, Category category) {
        this.name = name;
        this.defaultCode = code;
    }
    public boolean wasPressed() { if (presses > 0) { presses--; return true; } return false; }
    public void press() { presses++; }
    public record Category(Identifier id) {
        public static Category create(Identifier id) { return new Category(id); }
    }
}
