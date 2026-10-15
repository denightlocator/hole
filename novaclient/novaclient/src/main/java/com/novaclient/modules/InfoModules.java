package com.novaclient.modules;

import com.novaclient.module.*;
import com.novaclient.util.Gfx;
import com.novaclient.util.Input;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.network.PlayerListEntry;
import net.minecraft.util.math.Direction;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

/** All the small "Label: value" widgets. */
public final class InfoModules {
	private static TextModule.Line line(String l, String v) { return new TextModule.Line(l, v, Gfx.WHITE); }

	public static class Fps extends TextModule {
		public Fps() { super("fps", "FPS", "Frames per second", Category.INFO); }
		@Override protected List<Line> build(MinecraftClient mc) { return List.of(line("FPS: ", String.valueOf(mc.getCurrentFps()))); }
	}

	public static class Cps extends TextModule {
		public Cps() { super("cps", "CPS", "Left / right clicks per second", Category.INFO); }
		@Override protected List<Line> build(MinecraftClient mc) {
			return List.of(line("CPS: ", Input.cpsL() + " | " + Input.cpsR()));
		}
	}

	public static class Ping extends TextModule {
		public Ping() { super("ping", "Ping", "Your latency to the server", Category.INFO); }
		@Override protected List<Line> build(MinecraftClient mc) {
			int ping = -1;
			if (mc.getNetworkHandler() != null && mc.player != null) {
				PlayerListEntry e = mc.getNetworkHandler().getPlayerListEntry(mc.player.getUuid());
				if (e != null) ping = e.getLatency();
			}
			int col = ping < 0 ? Gfx.GRAY : ping < 80 ? Gfx.GREEN : ping < 150 ? Gfx.YELLOW : Gfx.RED;
			return List.of(new Line("Ping: ", ping < 0 ? "-" : ping + " ms", col));
		}
	}

	public static class Coords extends TextModule {
		private final Setting decimals = add(Setting.number("decimals", "Decimals", 0, 0, 2, 1));
		private final Setting dir = add(Setting.bool("direction", "Show direction", true));
		public Coords() { super("coords", "Coordinates", "XYZ position and facing", Category.INFO); }
		@Override protected List<Line> build(MinecraftClient mc) {
			String f = "%." + decimals.i() + "f";
			double x = 0, y = 0, z = 0;
			if (mc.player != null) { x = mc.player.getX(); y = mc.player.getY(); z = mc.player.getZ(); }
			String xyz = String.format(Locale.ROOT, f + "  " + f + "  " + f, x, y, z);
			if (!dir.b() || mc.player == null) return List.of(line("XYZ: ", xyz));
			Direction d = mc.player.getHorizontalFacing();
			String n = d.asString();
			return List.of(line("XYZ: ", xyz), line("Facing: ", Character.toUpperCase(n.charAt(0)) + n.substring(1)));
		}
	}

	public static class Clock extends TextModule {
		private final Setting h24 = add(Setting.bool("h24", "24-hour clock", true));
		private final Setting sec = add(Setting.bool("seconds", "Show seconds", false));
		public Clock() { super("clock", "Clock", "Your real-world time", Category.INFO); }
		@Override protected List<Line> build(MinecraftClient mc) {
			String p = (h24.b() ? "HH:mm" : "hh:mm") + (sec.b() ? ":ss" : "") + (h24.b() ? "" : " a");
			return List.of(line("", LocalTime.now().format(DateTimeFormatter.ofPattern(p, Locale.ENGLISH))));
		}
	}

	public static class Speed extends TextModule {
		private double px, pz, speed;
		public Speed() { super("speed", "Speed", "Horizontal speed in blocks per second", Category.PLAYER); }
		@Override protected List<Line> build(MinecraftClient mc) {
			if (mc.player != null) {
				double dx = mc.player.getX() - px, dz = mc.player.getZ() - pz;
				speed += (Math.sqrt(dx * dx + dz * dz) * 20 - speed) * 0.3;
				px = mc.player.getX(); pz = mc.player.getZ();
			}
			return List.of(line("Speed: ", String.format(Locale.ROOT, "%.1f b/s", speed)));
		}
	}

	public static class Memory extends TextModule {
		public Memory() { super("memory", "Memory", "Java heap usage", Category.INFO); }
		@Override protected List<Line> build(MinecraftClient mc) {
			Runtime r = Runtime.getRuntime();
			long used = (r.totalMemory() - r.freeMemory()) >> 20, max = r.maxMemory() >> 20;
			return List.of(line("Mem: ", used + " / " + max + " MB"));
		}
	}

	public static class ServerInfo extends TextModule {
		public ServerInfo() { super("server", "Server Info", "Address and player count", Category.SERVER); }
		@Override protected List<Line> build(MinecraftClient mc) {
			String ip = mc.isInSingleplayer() ? "Singleplayer" : mc.getCurrentServerEntry() != null ? mc.getCurrentServerEntry().address : "-";
			int n = mc.getNetworkHandler() == null ? 0 : mc.getNetworkHandler().getPlayerList().size();
			return List.of(line("IP: ", ip), line("Players: ", String.valueOf(n)));
		}
	}
}
