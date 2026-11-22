package dev.orbit.client.config;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import dev.orbit.client.Orbit;
import dev.orbit.client.hud.HudLayout;
import dev.orbit.client.module.Keybind;
import dev.orbit.client.module.KeybindManager;
import dev.orbit.client.module.Module;
import dev.orbit.client.module.ModuleRegistry;
import dev.orbit.client.gui.Theme;
import dev.orbit.client.module.setting.BoolSetting;
import dev.orbit.client.module.setting.ColorSetting;
import dev.orbit.client.module.setting.ModeSetting;
import dev.orbit.client.module.setting.NumberSetting;
import dev.orbit.client.module.setting.StringSetting;
import dev.orbit.client.module.setting.Setting;
import net.fabricmc.loader.api.FabricLoader;

import java.io.IOException;
import java.io.Reader;
import java.io.Writer;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

/**
 * Persists module state, keybinds and settings to {@code config/orbit.json}.
 *
 * <p>Transient state is intentionally not saved: for example Freecam's scroll wheel speed modifier
 * always resets to 1.0 on toggle, only the base {@code Speed} setting is persisted.
 */
public final class ConfigManager {
    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();
    private static final int AUTOSAVE_TICKS = 100;

    private final Path path = FabricLoader.getInstance().getConfigDir().resolve("orbit.json");
    private boolean dirty;
    private int tickCounter;

    public void markDirty() {
        dirty = true;
    }

    /** Called every client tick; writes at most once every five seconds. */
    public void tick() {
        if (dirty && ++tickCounter >= AUTOSAVE_TICKS) {
            tickCounter = 0;
            save();
        } else if (!dirty) {
            tickCounter = 0;
        }
    }

    public Path getPath() {
        return path;
    }

    // ── save ────────────────────────────────────────────────────────────
    public void save() {
        JsonObject root = new JsonObject();
        root.addProperty("version", Orbit.VERSION);

        JsonObject theme = new JsonObject();
        theme.addProperty("hue", Theme.getHue());
        theme.addProperty("saturation", Theme.getSaturation());
        theme.addProperty("brightness", Theme.getBrightness());
        theme.addProperty("gradient", Theme.isGradient());
        theme.addProperty("rainbow", Theme.isRainbow());
        theme.addProperty("opacity", Theme.getOpacity());
        root.add("theme", theme);

        JsonArray modules = new JsonArray();
        for (Module module : ModuleRegistry.all()) {
            JsonObject entry = new JsonObject();
            entry.addProperty("name", module.getName());
            entry.addProperty("enabled", module.isEnabled());
            entry.addProperty("bind", module.getKeybind().serialize());

            JsonObject settings = new JsonObject();
            for (Setting<?> setting : module.getSettings()) {
                if (setting instanceof BoolSetting bool) {
                    settings.addProperty(setting.getName(), bool.get());
                } else if (setting instanceof NumberSetting number) {
                    settings.addProperty(setting.getName(), number.get());
                } else if (setting instanceof ModeSetting mode) {
                    settings.addProperty(setting.getName(), mode.get());
                } else if (setting instanceof ColorSetting color) {
                    settings.addProperty(setting.getName(), color.serialize());
                } else if (setting instanceof StringSetting text) {
                    settings.addProperty(setting.getName(), text.get());
                }
            }
            entry.add("settings", settings);
            modules.add(entry);
        }
        root.add("modules", modules);

        // HUD positions: fractions of the screen, so a layout survives a resolution change
        JsonObject hud = new JsonObject();
        for (Map.Entry<String, HudLayout.Anchor> entry : HudLayout.snapshot().entrySet()) {
            JsonObject anchor = new JsonObject();
            anchor.addProperty("x", entry.getValue().xPercent());
            anchor.addProperty("y", entry.getValue().yPercent());
            anchor.addProperty("scale", HudLayout.getScale(entry.getKey()));
            hud.add(entry.getKey(), anchor);
        }
        root.add("hud", hud);

        try {
            Files.createDirectories(path.getParent());
            try (Writer writer = Files.newBufferedWriter(path)) {
                GSON.toJson(root, writer);
            }
            dirty = false;
            tickCounter = 0;
        } catch (IOException e) {
            Orbit.LOGGER.error("Failed to save Orbit config", e);
        }
    }

    // ── load ────────────────────────────────────────────────────────────
    public void load() {
        if (!Files.exists(path)) {
            return;
        }
        try (Reader reader = Files.newBufferedReader(path)) {
            JsonElement parsed = JsonParser.parseReader(reader);
            if (!parsed.isJsonObject()) {
                return;
            }
            JsonObject root = parsed.getAsJsonObject();

            if (root.has("theme") && root.get("theme").isJsonObject()) {
                JsonObject theme = root.getAsJsonObject("theme");
                if (theme.has("hue")) {
                    Theme.setHue(theme.get("hue").getAsFloat());
                }
                if (theme.has("saturation")) {
                    Theme.setSaturation(theme.get("saturation").getAsFloat());
                }
                if (theme.has("brightness")) {
                    Theme.setBrightness(theme.get("brightness").getAsFloat());
                }
                if (theme.has("gradient")) {
                    Theme.setGradient(theme.get("gradient").getAsBoolean());
                }
                if (theme.has("rainbow")) {
                    Theme.setRainbow(theme.get("rainbow").getAsBoolean());
                }
                if (theme.has("opacity")) {
                    Theme.setOpacity(theme.get("opacity").getAsFloat());
                }
            }

            if (root.has("hud") && root.get("hud").isJsonObject()) {
                JsonObject hud = root.getAsJsonObject("hud");
                Map<String, HudLayout.Anchor> anchors = new java.util.HashMap<>();
                for (String id : hud.keySet()) {
                    if (hud.get(id).isJsonObject()) {
                        JsonObject anchor = hud.getAsJsonObject(id);
                        float x = anchor.has("x") ? anchor.get("x").getAsFloat() : 0.008f;
                        float y = anchor.has("y") ? anchor.get("y").getAsFloat() : 0.008f;
                        anchors.put(id, new HudLayout.Anchor(x, y));
                        // older configs have no scale; keep the default instead of resetting it to 0
                        if (anchor.has("scale")) {
                            HudLayout.setScale(id, anchor.get("scale").getAsFloat());
                        }
                    }
                }
                HudLayout.restore(anchors);
            }

            if (!root.has("modules") || !root.get("modules").isJsonArray()) {
                return;
            }

            for (JsonElement element : root.getAsJsonArray("modules")) {
                if (!element.isJsonObject()) {
                    continue;
                }
                JsonObject entry = element.getAsJsonObject();
                if (!entry.has("name")) {
                    continue;
                }
                String name = entry.get("name").getAsString();
                ModuleRegistry.byName(name).ifPresent(module -> {
                    // settings first so onEnable() sees the loaded values
                    if (entry.has("settings") && entry.get("settings").isJsonObject()) {
                        JsonObject settings = entry.getAsJsonObject("settings");
                        for (Setting<?> setting : module.getSettings()) {
                            JsonElement value = settings.get(setting.getName());
                            if (value != null && value.isJsonPrimitive()) {
                                apply(setting, value);
                            }
                        }
                    }
                    // supports both the readable form and the old integer form
                    if (entry.has("bind") && entry.get("bind").isJsonPrimitive()) {
                        KeybindManager.set(module, Keybind.parse(entry.get("bind").getAsString()));
                    } else if (entry.has("key") && entry.get("key").isJsonPrimitive()) {
                        KeybindManager.set(module, Keybind.fromLegacyCode(entry.get("key").getAsInt()));
                    }
                    // Apply both states: some modules (such as Title Screen) start enabled.
                    if (entry.has("enabled") && entry.get("enabled").isJsonPrimitive()) {
                        module.setEnabled(entry.get("enabled").getAsBoolean());
                    }
                });
            }
            Orbit.LOGGER.info("Loaded Orbit config from {}", path);
        } catch (Exception e) {
            Orbit.LOGGER.error("Failed to load Orbit config", e);
        }
    }

    private void apply(Setting<?> setting, JsonElement value) {
        try {
            if (setting instanceof BoolSetting bool) {
                bool.set(value.getAsBoolean());
            } else if (setting instanceof NumberSetting number) {
                number.set(value.getAsDouble());
            } else if (setting instanceof ModeSetting mode) {
                mode.set(value.getAsString());
            } else if (setting instanceof ColorSetting color) {
                color.deserialize(value.getAsString());
            } else if (setting instanceof StringSetting text) {
                text.set(value.getAsString());
            }
        } catch (RuntimeException e) {
            Orbit.LOGGER.warn("Skipping unreadable setting {}", setting.getName());
        }
    }
}
