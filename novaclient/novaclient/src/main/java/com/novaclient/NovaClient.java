package com.novaclient;

import com.novaclient.gui.ClientGui;
import com.novaclient.media.SpotifyApi;
import com.novaclient.module.ConfigManager;
import com.novaclient.module.ModuleManager;
import com.novaclient.modules.YouTubeModule;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientLifecycleEvents;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.keybinding.v1.KeyBindingHelper;
import net.fabricmc.fabric.api.client.rendering.v1.hud.HudElementRegistry;
import net.fabricmc.fabric.api.client.rendering.v1.hud.VanillaHudElements;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.screen.GameMenuScreen;
import net.minecraft.client.gui.screen.TitleScreen;
import net.minecraft.client.option.KeyBinding;
import net.minecraft.client.util.InputUtil;
import net.minecraft.util.Identifier;
import org.lwjgl.glfw.GLFW;

public class NovaClient implements ClientModInitializer {
	public static KeyBinding openKey;
	private static boolean openWasDown;

	private static KeyBinding key(String id, int code, KeyBinding.Category cat) {
		return KeyBindingHelper.registerKeyBinding(new KeyBinding(id, InputUtil.Type.KEYSYM, code, cat));
	}

	@Override public void onInitializeClient() {
		KeyBinding.Category cat = KeyBinding.Category.create(Identifier.of("novaclient", "main"));
		openKey = key("key.novaclient.open", GLFW.GLFW_KEY_RIGHT_CONTROL, cat);
		KeyBinding spToggle = key("key.novaclient.sp_toggle", GLFW.GLFW_KEY_UNKNOWN, cat);
		KeyBinding spNext = key("key.novaclient.sp_next", GLFW.GLFW_KEY_UNKNOWN, cat);
		KeyBinding spPrev = key("key.novaclient.sp_prev", GLFW.GLFW_KEY_UNKNOWN, cat);
		KeyBinding ytNext = key("key.novaclient.yt_next", GLFW.GLFW_KEY_UNKNOWN, cat);

		ModuleManager.init();
		SpotifyApi.init();

		HudElementRegistry.attachElementBefore(VanillaHudElements.CHAT, Identifier.of("novaclient", "widgets"),
				(ctx, tickCounter) -> ModuleManager.renderHud(ctx));

		ClientTickEvents.END_CLIENT_TICK.register(mc -> {
			ModuleManager.tick(mc);
			while (openKey.wasPressed()) if (mc.currentScreen == null) mc.setScreen(new ClientGui());
			while (spToggle.wasPressed()) SpotifyApi.togglePlay();
			while (spNext.wasPressed()) SpotifyApi.next();
			while (spPrev.wasPressed()) SpotifyApi.previous();
			while (ytNext.wasPressed()) ModuleManager.MODULES.stream().filter(m -> m instanceof YouTubeModule)
					.forEach(m -> ((YouTubeModule) m).next());
			pollMenuKey(mc);
		});

		ClientLifecycleEvents.CLIENT_STOPPING.register(c -> ConfigManager.save());
	}

	/** Key bindings don't fire while a screen is open, so poll the key to also allow opening from title / pause menu. */
	private static void pollMenuKey(MinecraftClient mc) {
		boolean menu = mc.currentScreen instanceof TitleScreen || mc.currentScreen instanceof GameMenuScreen;
		int code = KeyBindingHelper.getBoundKeyOf(openKey).getCode();
		boolean down = code > 0 && GLFW.glfwGetKey(mc.getWindow().getHandle(), code) == GLFW.GLFW_PRESS;
		if (menu && down && !openWasDown) mc.setScreen(new ClientGui());
		openWasDown = down;
	}
}
