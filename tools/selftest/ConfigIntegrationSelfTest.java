import dev.orbit.client.config.ConfigManager;
import dev.orbit.client.module.Module;
import dev.orbit.client.module.ModuleRegistry;
import dev.orbit.client.module.impl.misc.TitleScreenModule;
import dev.orbit.client.module.impl.render.ChunkActivity;
import dev.orbit.client.module.impl.render.GeodeAge;
import dev.orbit.client.module.setting.NumberSetting;
import dev.orbit.client.module.setting.Setting;
import dev.orbit.client.module.setting.StringSetting;
import net.fabricmc.loader.api.FabricLoader;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;

/** Real config/module round-trip with a stubbed Fabric/Minecraft environment. */
public final class ConfigIntegrationSelfTest {
    public static void main(String[] args) throws Exception {
        Path directory = Files.createTempDirectory("orbit-config-test-");
        try {
            FabricLoader.getInstance().configDir = directory;
            TitleScreenModule title = new TitleScreenModule();
            ChunkActivity chunk = new ChunkActivity();
            GeodeAge geode = new GeodeAge();
            ModuleRegistry.register(title);
            ModuleRegistry.register(chunk);
            ModuleRegistry.register(geode);
            check(title.isEnabled(), "title starts enabled");
            title.setEnabled(false);
            chunk.setEnabled(true);
            geode.setEnabled(true);
            string(chunk, "Color").set("#A1B2C3");
            number(chunk, "Opacity").set(55);
            number(chunk, "Fade Time").set(420);
            number(geode, "Range").set(40);
            string(geode, "Aging Color").set("#445566");
            ConfigManager config = new ConfigManager();
            config.save();
            check(Files.isRegularFile(directory.resolve("orbit.json")), "config written");

            // Simulate a new client process without reusing enabled module objects.
            chunk.setEnabled(false);
            geode.setEnabled(false);
            ModuleRegistry.all().clear();
            TitleScreenModule restoredTitle = new TitleScreenModule();
            ChunkActivity restoredChunk = new ChunkActivity();
            GeodeAge restoredGeode = new GeodeAge();
            ModuleRegistry.register(restoredTitle);
            ModuleRegistry.register(restoredChunk);
            ModuleRegistry.register(restoredGeode);
            new ConfigManager().load();
            check(!restoredTitle.isEnabled(), "saved false disables default-on title screen");
            check(restoredChunk.isEnabled() && restoredGeode.isEnabled(), "saved feature toggles restored");
            check(string(restoredChunk, "Color").get().equals("#A1B2C3"), "chunk color round-trip");
            check(number(restoredChunk, "Opacity").get() == 55, "chunk opacity round-trip");
            check(number(restoredChunk, "Fade Time").get() == 420, "chunk fade round-trip");
            check(number(restoredGeode, "Range").get() == 40, "geode range round-trip");
            check(string(restoredGeode, "Aging Color").get().equals("#445566"), "geode color round-trip");
            check(restoredChunk.getKeybind().serialize().equals("key.keyboard.b"), "chunk key round-trip");
            check(restoredGeode.getKeybind().serialize().equals("key.keyboard.j"), "geode key round-trip");
            restoredChunk.setEnabled(false);
            restoredGeode.setEnabled(false);
            System.out.println("ConfigIntegrationSelfTest: all checks passed");
        } finally {
            ModuleRegistry.all().clear();
            try (var paths = Files.walk(directory)) {
                paths.sorted(Comparator.reverseOrder()).forEach(path -> {
                    try { Files.deleteIfExists(path); } catch (IOException failure) { throw new RuntimeException(failure); }
                });
            }
        }
    }

    private static NumberSetting number(Module module, String name) {
        return (NumberSetting) setting(module, name);
    }
    private static StringSetting string(Module module, String name) {
        return (StringSetting) setting(module, name);
    }
    private static Setting<?> setting(Module module, String name) {
        return module.getSettings().stream().filter(setting -> name.equals(setting.getName()))
                .findFirst().orElseThrow();
    }
    private static void check(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }
}
