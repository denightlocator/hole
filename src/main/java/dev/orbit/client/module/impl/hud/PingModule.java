package dev.orbit.client.module.impl.hud;

import dev.orbit.client.module.Category;
import dev.orbit.client.module.Module;
import dev.orbit.client.module.setting.BoolSetting;

/** Shows the connection latency to the current server. */
public class PingModule extends Module {
    private final BoolSetting label = addSetting(new BoolSetting("Label", true));
    private final BoolSetting suffix = addSetting(new BoolSetting("Show ms", false));

    public PingModule() {
        super("Ping", "Shows latency to the server. Move it in the HUD editor.", Category.HUD);
    }

    public boolean showsLabel() {
        return label.get();
    }

    public boolean showsSuffix() {
        return suffix.get();
    }
}
