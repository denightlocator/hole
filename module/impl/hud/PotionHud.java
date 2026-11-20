package dev.orbit.client.module.impl.hud;

import dev.orbit.client.module.Category;
import dev.orbit.client.module.Module;
import dev.orbit.client.module.setting.BoolSetting;

/** Active status effects with time remaining, as a HUD element. */
public class PotionHud extends Module {
    private final BoolSetting roman = addSetting(new BoolSetting("Roman Levels", true));
    private final BoolSetting hideAmbient = addSetting(new BoolSetting("Hide Ambient", false));

    public PotionHud() {
        super("Potion Timers", "Active potion effects and time left. Move it in the HUD editor.", Category.HUD);
    }

    public boolean usesRomanNumerals() {
        return roman.get();
    }

    public boolean hidesAmbient() {
        return hideAmbient.get();
    }
}
