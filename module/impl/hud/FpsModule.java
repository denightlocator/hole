package dev.orbit.client.module.impl.hud;

import dev.orbit.client.module.Category;
import dev.orbit.client.module.Module;
import dev.orbit.client.module.setting.BoolSetting;

/** Shows the frame rate. Position is set in the HUD editor, not here. */
public class FpsModule extends Module {
    private final BoolSetting label = addSetting(new BoolSetting("Label", true));
    private final BoolSetting colourByValue = addSetting(new BoolSetting("Colour By FPS", true));

    public FpsModule() {
        super("FPS", "Shows the frame rate. Move it in the HUD editor.", Category.HUD);
    }

    public boolean showsLabel() {
        return label.get();
    }

    /** Green when healthy, amber when playable, red when it is hurting. */
    public boolean coloursByValue() {
        return colourByValue.get();
    }
}
