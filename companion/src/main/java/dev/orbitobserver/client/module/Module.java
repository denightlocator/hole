package dev.orbitobserver.client.module;

import dev.orbitobserver.client.module.setting.NumberSetting;
import dev.orbitobserver.client.module.setting.StringSetting;
import net.fabricmc.fabric.api.client.rendering.v1.world.WorldRenderContext;

import java.util.ArrayList;
import java.util.List;

/** Small private bridge for sharing the two observation modules without Orbit's missing core. */
public abstract class Module {
    private final List<Object> settings = new ArrayList<>();
    private volatile boolean enabled;
    private Keybind keybind;

    protected Module(String name, String description, Category category) { }

    protected final <T> T addSetting(T setting) {
        settings.add(setting);
        return setting;
    }

    protected final void setKeybind(Keybind keybind) { this.keybind = keybind; }
    public final Keybind keybind() { return keybind; }
    public final List<Object> settings() { return List.copyOf(settings); }
    public final boolean isEnabled() { return enabled; }

    public final void setEnabled(boolean enabled) {
        if (this.enabled != enabled) {
            this.enabled = enabled;
            if (enabled) onEnable(); else onDisable();
        }
    }

    public final <T> T setting(String name, Class<T> type) {
        for (Object setting : settings) {
            String candidate = setting instanceof NumberSetting number ? number.name()
                    : setting instanceof StringSetting string ? string.name() : null;
            if (name.equals(candidate) && type.isInstance(setting)) return type.cast(setting);
        }
        throw new IllegalArgumentException("Unknown setting: " + name);
    }

    public void onEnable() { }
    public void onDisable() { }
    public void onTick() { }
    public void onWorldRender(WorldRenderContext context) { }
}
