package dev.orbit.client.module.impl.misc;

import dev.orbit.client.module.Category;
import dev.orbit.client.module.Module;
import dev.orbit.client.module.setting.BoolSetting;
import dev.orbit.client.module.setting.NumberSetting;
import dev.orbit.client.module.setting.StringSetting;

/**
 * Settings for Orbit's title screen. The screen itself is {@code OrbitTitleScreen}; this module is
 * what enables it and holds its configuration (so it is saved in orbit.json like everything else).
 */
public class TitleScreenModule extends Module {
    private final StringSetting wordmark = addSetting(new StringSetting("Wordmark", "ORBIT"));
    private final StringSetting tagline = addSetting(new StringSetting("Tagline", "CLIENT"));
    private final NumberSetting scrim = addSetting(new NumberSetting("Scrim", 78, 0, 95, 1, "%"));
    private final BoolSetting showMods = addSetting(new BoolSetting("Mods Button", true));
    private final BoolSetting showVersion = addSetting(new BoolSetting("Version Text", true));
    private final BoolSetting twinkle = addSetting(new BoolSetting("Twinkle", true));
    private final BoolSetting showAccount = addSetting(new BoolSetting("Account Card", true));
    private final BoolSetting showStats = addSetting(new BoolSetting("Client Card", true));
    private final BoolSetting showQuick = addSetting(new BoolSetting("Quick Actions", true));
    private final BoolSetting showKeybind = addSetting(new BoolSetting("Keybind Hint", true));

    public TitleScreenModule() {
        super("Title Screen", "Replaces the main menu with the Orbit starfield screen.", Category.MISC);
        setKeybind(dev.orbit.client.module.Keybind.UNBOUND);
        setEnabled(true);
    }

    public String getWordmark() {
        return wordmark.get().isBlank() ? "ORBIT" : wordmark.get();
    }

    public String getTagline() {
        return tagline.get().isBlank() ? "CLIENT" : tagline.get();
    }

    /** Left-hand scrim strength, 0..1. */
    public float getScrim() {
        return (float) (scrim.get() / 100.0);
    }

    public boolean showModsButton() {
        return showMods.get();
    }

    public boolean showVersion() {
        return showVersion.get();
    }

    public boolean showAccountCard() {
        return showAccount.get();
    }

    public boolean showStatsCard() {
        return showStats.get();
    }

    public boolean showQuickActions() {
        return showQuick.get();
    }

    public boolean showKeybindHint() {
        return showKeybind.get();
    }

    /** Slow brightness pulse over the sky, so the starfield is not completely static. */
    public boolean twinkles() {
        return twinkle.get();
    }
}
