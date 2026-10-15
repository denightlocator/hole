package com.novaclient.module;

import com.google.gson.*;
import net.fabricmc.loader.api.FabricLoader;

import java.nio.file.Files;
import java.nio.file.Path;

public final class ConfigManager {
	private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();

	private static Path path() { return FabricLoader.getInstance().getConfigDir().resolve("novaclient.json"); }

	public static void load() {
		try {
			Path p = path();
			if (!Files.exists(p)) return;
			JsonObject root = JsonParser.parseString(Files.readString(p)).getAsJsonObject();
			for (Module m : ModuleManager.MODULES)
				if (root.has(m.id)) m.fromJson(root.getAsJsonObject(m.id));
		} catch (Exception e) { System.err.println("[Nova] config load failed: " + e); }
	}

	public static void save() {
		try {
			JsonObject root = new JsonObject();
			for (Module m : ModuleManager.MODULES) root.add(m.id, m.toJson());
			Files.writeString(path(), GSON.toJson(root));
		} catch (Exception e) { System.err.println("[Nova] config save failed: " + e); }
	}
}
