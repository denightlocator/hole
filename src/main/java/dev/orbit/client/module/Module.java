package dev.orbit.client.module;

import dev.orbit.client.module.setting.Setting;

import java.util.ArrayList;
import java.util.List;

/**
 * Data model the GUI renders. Deliberately thin - behaviour (tick hooks, etc.) gets added
 * once there are modules to put in it.
 */
public abstract class Module {
    private final String name;
    private final String description;
    private final Category category;
    private final List<Setting<?>> settings = new ArrayList<>();

    private boolean enabled;
    /** Bind that toggles this module instantly; see {@link KeybindManager}. */
    private Keybind keybind = Keybind.UNBOUND;

    protected Module(String name, String description, Category category) {
        this.name = name;
        this.description = description;
        this.category = category;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public Category getCategory() {
        return category;
    }

    public List<Setting<?>> getSettings() {
        return settings;
    }

    protected <T extends Setting<?>> T addSetting(T setting) {
        settings.add(setting);
        return setting;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        if (this.enabled == enabled) {
            return;
        }
        this.enabled = enabled;
        if (enabled) {
            onEnable();
        } else {
            onDisable();
        }
    }

    public void toggle() {
        setEnabled(!enabled);
    }

    public Keybind getKeybind() {
        return keybind;
    }

    public void setKeybind(Keybind keybind) {
        this.keybind = keybind == null ? Keybind.UNBOUND : keybind;
    }

    public boolean isBound() {
        return keybind.isBound();
    }

    public void onEnable() {
    }

    public void onDisable() {
    }

    /** Called every client tick while enabled. */
    /**
     * Whether this module should stop ticking while Orbit's own GUI is open.
     *
     * <p>Modules that drive other screens (Auto AH opens and closes the auction house) must opt in:
     * otherwise they keep working underneath the GUI - and closing a container screen while you are
     * setting something up makes the GUI disappear for no obvious reason.
     */
    public boolean pausesWhileGuiOpen() {
        return false;
    }

    public void onTick() {
    }

    /** Called during world rendering (after entities), only while enabled. */
    public void onWorldRender(net.fabricmc.fabric.api.client.rendering.v1.world.WorldRenderContext context) {
    }
}
