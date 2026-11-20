package dev.orbit.client.module.impl.hud;

import dev.orbit.client.module.Category;
import dev.orbit.client.module.Module;
import dev.orbit.client.module.setting.BoolSetting;

/** Armour and held-tool durability, as a HUD element. */
public class ArmourHud extends Module {
    private final BoolSetting percent = addSetting(new BoolSetting("Percent", true));
    private final BoolSetting hideEmpty = addSetting(new BoolSetting("Hide Empty Slots", true));

    public ArmourHud() {
        super("Armour Durability", "Armour and tool durability. Move it in the HUD editor.", Category.HUD);
    }

    public boolean showsPercent() {
        return percent.get();
    }

    public boolean hidesEmpty() {
        return hideEmpty.get();
    }
}
