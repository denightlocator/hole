package com.novaclient.module;

import com.novaclient.gui.HudEditorScreen;
import com.novaclient.modules.*;
import com.novaclient.util.Input;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;

import java.util.ArrayList;
import java.util.List;

public final class ModuleManager {
	public static final List<Module> MODULES = new ArrayList<>();
	public static ThemeModule THEME;

	public static void init() {
		THEME = new ThemeModule();
		MODULES.add(new InfoModules.Fps().pos(0.005, 0.02, true));
		MODULES.add(new InfoModules.Cps().pos(0.005, 0.10, true));
		MODULES.add(new InfoModules.Ping().pos(0.005, 0.18, true));
		MODULES.add(new InfoModules.Coords().pos(0.005, 0.26, true));
		MODULES.add(new InfoModules.Clock().pos(0.5, 0.12, false));
		MODULES.add(new InfoModules.Speed().pos(0.005, 0.40, false));
		MODULES.add(new InfoModules.Memory().pos(0.005, 0.48, false));
		MODULES.add(new KeystrokesModule().pos(0.005, 0.70, true));
		MODULES.add(new ArmorModule().pos(0.995, 0.55, true));
		MODULES.add(new EffectsModule().pos(0.995, 0.20, true));
		MODULES.add(new StaffListModule().pos(0.995, 0.02, true));
		MODULES.add(new InfoModules.ServerInfo().pos(0.5, 0.02, false));
		MODULES.add(new SpotifyModule().pos(0.995, 0.99, true));
		MODULES.add(new YouTubeModule().pos(0.005, 0.99, false));
		MODULES.add(THEME);
		ConfigManager.load();
	}

	public static void tick(MinecraftClient mc) {
		Input.poll(mc);
		for (Module m : MODULES) if (m.enabled && m.hud) m.tick(mc);
	}

	public static void renderHud(DrawContext ctx) {
		MinecraftClient mc = MinecraftClient.getInstance();
		Input.poll(mc);
		if (mc.options.hudHidden || mc.currentScreen instanceof HudEditorScreen) return;
		int sw = mc.getWindow().getScaledWidth(), sh = mc.getWindow().getScaledHeight();
		for (Module m : MODULES) if (m.enabled && m.hud) m.draw(ctx, sw, sh);
	}
}
