package net.fabricmc.fabric.api.client.keybinding.v1;

import java.util.LinkedHashMap;
import java.util.Map;
import net.minecraft.client.option.KeyBinding;

public final class KeyBindingHelper {
    public static final Map<String, KeyBinding> registered = new LinkedHashMap<>();
    public static KeyBinding registerKeyBinding(KeyBinding key) {
        registered.put(key.name, key);
        return key;
    }
}
