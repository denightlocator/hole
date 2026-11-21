package dev.orbitobserver.client;

import dev.orbitobserver.client.config.ObservationConfig;
import dev.orbitobserver.client.module.Module;
import dev.orbitobserver.client.module.impl.render.ChunkActivity;
import dev.orbitobserver.client.module.impl.render.GeodeAge;
import dev.orbitobserver.client.module.setting.NumberSetting;
import dev.orbitobserver.client.module.setting.StringSetting;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.keybinding.v1.KeyBindingHelper;
import net.fabricmc.fabric.api.client.rendering.v1.world.WorldRenderEvents;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.option.KeyBinding;
import net.minecraft.client.util.InputUtil;
import net.minecraft.text.Text;
import net.minecraft.util.Identifier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.file.Path;

/** Separate client-only entrypoint; no Orbit classes, network packets, or server hooks are used. */
public final class ObserverClient implements ClientModInitializer {
    private static final Logger LOG = LoggerFactory.getLogger("Orbit Observer");

    @Override
    public void onInitializeClient() {
        ChunkActivity chunk = new ChunkActivity();
        GeodeAge geode = new GeodeAge();
        Path file = FabricLoader.getInstance().getConfigDir().resolve("orbit-observer.properties");
        ObservationConfig loaded;
        try {
            loaded = ObservationConfig.loadOrCreate(file);
        } catch (IOException failure) {
            LOG.warn("Cannot load {}; using in-memory defaults without overwriting it", file, failure);
            loaded = ObservationConfig.defaultsOnly(file);
        }
        final ObservationConfig config = loaded;
        applySettings(config, chunk, geode);
        chunk.setEnabled(config.bool("chunk.enabled"));
        geode.setEnabled(config.bool("geode.enabled"));

        KeyBinding.Category category = KeyBinding.Category.create(Identifier.of("orbit_observer", "main"));
        KeyBinding chunkKey = KeyBindingHelper.registerKeyBinding(new KeyBinding(
                "key.orbit_observer.chunk_activity", InputUtil.Type.KEYSYM, chunk.keybind().code(), category));
        KeyBinding geodeKey = KeyBindingHelper.registerKeyBinding(new KeyBinding(
                "key.orbit_observer.geode_age", InputUtil.Type.KEYSYM, geode.keybind().code(), category));

        WorldRenderEvents.AFTER_ENTITIES.register(context -> {
            if (chunk.isEnabled()) chunk.onWorldRender(context);
            if (geode.isEnabled()) geode.onWorldRender(context);
        });
        ClientTickEvents.END_CLIENT_TICK.register(client -> {
            boolean changed = false;
            while (chunkKey.wasPressed()) {
                if (client.currentScreen == null) {
                    chunk.setEnabled(!chunk.isEnabled());
                    announce(client, "Chunk Activity", chunk.isEnabled());
                    changed = true;
                }
            }
            while (geodeKey.wasPressed()) {
                if (client.currentScreen == null) {
                    geode.setEnabled(!geode.isEnabled());
                    announce(client, "Geode Age", geode.isEnabled());
                    changed = true;
                }
            }
            if (changed) {
                try {
                    config.saveEnabled(chunk.isEnabled(), geode.isEnabled());
                } catch (IOException failure) {
                    LOG.warn("Cannot save toggle state to {}; changes apply for this session only", file, failure);
                }
            }
            if (chunk.isEnabled()) chunk.onTick();
            if (geode.isEnabled()) geode.onTick();
        });
        LOG.info("Orbit Observer initialized (client-only)");
    }

    private static void applySettings(ObservationConfig config, ChunkActivity chunk, GeodeAge geode) {
        string(chunk, "Color", config.text("chunk.color"));
        number(chunk, "Opacity", config.number("chunk.opacity"));
        number(chunk, "Fade Time", config.number("chunk.fadeSeconds"));
        number(chunk, "Line Width", config.number("chunk.lineWidth"));

        number(geode, "Range", config.number("geode.range"));
        number(geode, "Aging After", config.number("geode.agingAfter"));
        number(geode, "Very Aged After", config.number("geode.veryAgedAfter"));
        string(geode, "Fresh Color", config.text("geode.freshColor"));
        string(geode, "Aging Color", config.text("geode.agingColor"));
        string(geode, "Very Aged Color", config.text("geode.veryAgedColor"));
        number(geode, "Opacity", config.number("geode.opacity"));
        number(geode, "Label Scale", config.number("geode.labelScale"));
    }

    private static void number(Module module, String name, double value) {
        module.setting(name, NumberSetting.class).set(value);
    }

    private static void string(Module module, String name, String value) {
        module.setting(name, StringSetting.class).set(value);
    }

    private static void announce(MinecraftClient client, String name, boolean enabled) {
        if (client.player != null) {
            client.player.sendMessage(Text.literal("[Orbit Observer] " + name + ": "
                    + (enabled ? "on" : "off")), true);
        }
    }
}
