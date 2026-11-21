package dev.orbit.client.module;

import java.util.ArrayList;
import java.util.List;
import net.fabricmc.fabric.api.client.rendering.v1.world.WorldRenderContext;

public class Module {
    private boolean enabled;
    public final List<Object> settings = new ArrayList<>();

    public Module(String name, String description, Category category) { }
    public <T> T addSetting(T setting) { settings.add(setting); return setting; }
    public void setKeybind(Keybind keybind) { }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) {
        if (this.enabled != enabled) {
            this.enabled = enabled;
            if (enabled) onEnable(); else onDisable();
        }
    }
    public void onEnable() { }
    public void onDisable() { }
    public void onTick() { }
    public void onWorldRender(WorldRenderContext context) { }
}
