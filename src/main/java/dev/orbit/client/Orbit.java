package dev.orbit.client;

import dev.orbit.client.gui.ClickGuiScreen;
import dev.orbit.client.hud.MusicHud;
import dev.orbit.client.module.KeybindManager;
import dev.orbit.client.module.Module;
import dev.orbit.client.module.ModuleRegistry;
import dev.orbit.client.config.ConfigManager;
import dev.orbit.client.module.impl.misc.AutoAh;
import dev.orbit.client.module.impl.misc.MusicModule;
import dev.orbit.client.module.impl.misc.TitleScreenModule;
import dev.orbit.client.module.impl.hud.FpsModule;
import dev.orbit.client.module.impl.hud.PingModule;
import dev.orbit.client.module.impl.perf.FpsBoost;
import dev.orbit.client.module.impl.perf.NoClouds;
import dev.orbit.client.module.impl.perf.Weather;
import dev.orbit.client.module.impl.perf.SimpleParticles;
import dev.orbit.client.module.impl.perf.HideShadows;
import dev.orbit.client.module.impl.perf.EntityDistance;
import dev.orbit.client.module.impl.perf.HideNametags;
import dev.orbit.client.module.impl.perf.FastLeaves;
import dev.orbit.client.module.impl.perf.NoSmoothLighting;
import dev.orbit.client.module.impl.perf.NoBiomeBlend;
import dev.orbit.client.module.impl.perf.LowMipmaps;
import dev.orbit.client.module.impl.perf.SimulationDistance;
import dev.orbit.client.module.impl.perf.HideItemFrames;

import dev.orbit.client.module.impl.perf.HideGrass;
import dev.orbit.client.module.impl.perf.HideBlockBreaking;
import dev.orbit.client.module.impl.perf.EntityCulling;
import dev.orbit.client.module.impl.perf.ParticleLimit;
import dev.orbit.client.module.impl.perf.RenderDistance;
import dev.orbit.client.module.impl.render.Freecam;
import dev.orbit.client.module.impl.render.Zoom;
import dev.orbit.client.module.impl.render.Crosshair;
import dev.orbit.client.module.impl.render.ChunkActivity;
import dev.orbit.client.module.impl.render.GeodeAge;
import dev.orbit.client.module.impl.misc.ChatTweaks;
import dev.orbit.client.module.impl.misc.ContainerPreview;
import dev.orbit.client.module.impl.hud.ArmourHud;
import dev.orbit.client.module.impl.hud.PotionHud;
import dev.orbit.client.module.impl.render.NoFog;
import dev.orbit.client.module.impl.render.NoHurtCam;
import dev.orbit.client.module.impl.render.NoViewBob;
import dev.orbit.client.module.impl.player.AutoSprint;
import dev.orbit.client.module.impl.render.Fullbright;
import dev.orbit.client.module.impl.render.ItemEsp;
import dev.orbit.client.module.impl.render.SkyModule;
import dev.orbit.client.module.impl.render.MobEsp;
import dev.orbit.client.module.impl.render.PlayerTracking;
import dev.orbit.client.module.impl.render.StorageEsp;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.keybinding.v1.KeyBindingHelper;
import net.fabricmc.fabric.api.client.message.v1.ClientSendMessageEvents;
import net.fabricmc.fabric.api.client.rendering.v1.hud.HudElementRegistry;
import net.fabricmc.fabric.api.client.rendering.v1.world.WorldRenderEvents;
import net.minecraft.client.option.KeyBinding;
import dev.orbit.client.gui.HudEditorScreen;
import dev.orbit.client.hud.StatsHud;
import net.minecraft.client.MinecraftClient;
import net.minecraft.util.Identifier;
import net.minecraft.client.util.InputUtil;
import org.lwjgl.glfw.GLFW;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Orbit Client - entrypoint.
 *
 * Registers the Right Shift GUI keybind. The module registry starts empty; modules get
 * registered from {@link #onInitializeClient()}.
 */
public class Orbit implements ClientModInitializer {
    public static final String NAME = "Orbit";
    public static final String VERSION = "0.1.0";
    public static final Logger LOGGER = LoggerFactory.getLogger("Orbit");

    public static ConfigManager config() {
        return CONFIG;
    }

    private static KeyBinding openGuiKey;
    private static final ConfigManager CONFIG = new ConfigManager();

    @Override
    public void onInitializeClient() {
        ModuleRegistry.register(new AutoAh());
        ModuleRegistry.register(new TitleScreenModule());
        ModuleRegistry.register(new Freecam());
        ModuleRegistry.register(new Fullbright());
        ModuleRegistry.register(new Zoom());
        ModuleRegistry.register(new NoFog());
        ModuleRegistry.register(new NoHurtCam());
        ModuleRegistry.register(new NoViewBob());
        ModuleRegistry.register(new AutoSprint());
        ModuleRegistry.register(new Crosshair());
        ModuleRegistry.register(new ChunkActivity());
        ModuleRegistry.register(new GeodeAge());
        ModuleRegistry.register(new ChatTweaks());
        ModuleRegistry.register(new ContainerPreview());
        ModuleRegistry.register(new ArmourHud());
        ModuleRegistry.register(new PotionHud());
        ModuleRegistry.register(new FpsBoost());
        ModuleRegistry.register(new NoClouds());
        ModuleRegistry.register(new Weather());
        ModuleRegistry.register(new SimpleParticles());
        ModuleRegistry.register(new HideShadows());
        ModuleRegistry.register(new EntityDistance());
        ModuleRegistry.register(new HideNametags());
        ModuleRegistry.register(new HideGrass());
        ModuleRegistry.register(new HideBlockBreaking());
        ModuleRegistry.register(new EntityCulling());
        ModuleRegistry.register(new ParticleLimit());
        ModuleRegistry.register(new RenderDistance());
        ModuleRegistry.register(new FastLeaves());
        ModuleRegistry.register(new NoSmoothLighting());
        ModuleRegistry.register(new NoBiomeBlend());
        ModuleRegistry.register(new LowMipmaps());
        ModuleRegistry.register(new SimulationDistance());
        ModuleRegistry.register(new FpsModule());
        ModuleRegistry.register(new PingModule());
        ModuleRegistry.register(new HideItemFrames());


        ModuleRegistry.register(new StorageEsp());
        ModuleRegistry.register(new PlayerTracking());
        ModuleRegistry.register(new MobEsp());
        ModuleRegistry.register(new ItemEsp());
        ModuleRegistry.register(new SkyModule());
        ModuleRegistry.register(new MusicModule());

        // one real keybinding per module (keyboard or mouse), visible in Options -> Controls
        KeybindManager.registerAll();

        // restore modules / settings / binds before anything else touches them
        CONFIG.load();

        // world space rendering for ESP modules; runs after entities, before debug renderers
        WorldRenderEvents.AFTER_ENTITIES.register(context -> {
            for (Module module : ModuleRegistry.all()) {
                if (module.isEnabled()) {
                    module.onWorldRender(context);
                }
            }
        });

        openGuiKey = KeyBindingHelper.registerKeyBinding(new KeyBinding(
                "key.orbit.open_gui",
                InputUtil.Type.KEYSYM,
                GLFW.GLFW_KEY_RIGHT_SHIFT,
                KeybindManager.category()));

        ClientTickEvents.END_CLIENT_TICK.register(client -> {
            while (openGuiKey.wasPressed()) {
                if (client.currentScreen == null) {
                    client.setScreen(new ClickGuiScreen());
                }
            }
            boolean orbitGuiOpen = client.currentScreen instanceof ClickGuiScreen;
            for (Module module : ModuleRegistry.all()) {
                // ticks run even while a screen is open (Auto AH drives container GUIs), except for
                // modules that would close or replace what the player is looking at
                if (module.isEnabled() && !(orbitGuiOpen && module.pausesWhileGuiOpen())) {
                    module.onTick();
                }
            }

            // binds: instant enable/disable, plus mirroring of vanilla Controls rebinds
            KeybindManager.tick(client);
        });

        // now-playing overlay, drawn last so it sits above the vanilla HUD
        HudElementRegistry.addLast(Identifier.of("orbit", "music_hud"), new MusicHud());
        HudElementRegistry.addLast(Identifier.of("orbit", "stats_hud"), new StatsHud());

        // ".hud" typed in chat opens the HUD editor instead of sending the line. Chat is the entry
        // point on purpose: no keybind slot used, and it works from anywhere you can type.
        ClientSendMessageEvents.ALLOW_CHAT.register(message -> {
            String trimmed = message.trim();
            if (!trimmed.equalsIgnoreCase(".hud") && !trimmed.equalsIgnoreCase("/.hud")) {
                return true;
            }
            MinecraftClient.getInstance().execute(
                    () -> MinecraftClient.getInstance().setScreen(new HudEditorScreen()));
            return false;
        });

        // container previews are appended to the tooltip, which is the only place the contents are
        // known before the container is opened
        net.fabricmc.fabric.api.client.item.v1.ItemTooltipCallback.EVENT.register((stack, ctx, type, lines) -> {
            ModuleRegistry.get(ContainerPreview.class)
                    .ifPresent(preview -> preview.appendTooltip(stack, lines));
        });

        // periodic flush of anything the GUI marked dirty
        ClientTickEvents.END_CLIENT_TICK.register(client -> CONFIG.tick());

        LOGGER.info("{} v{} initialized ({} modules)", NAME, VERSION, ModuleRegistry.all().size());
    }
}
