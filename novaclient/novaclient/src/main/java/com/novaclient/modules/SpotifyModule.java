package com.novaclient.modules;

import com.novaclient.Theme;
import com.novaclient.media.SpotifyApi;
import com.novaclient.module.*;
import com.novaclient.util.Gfx;
import com.novaclient.util.WebImage;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;

public class SpotifyModule extends Module {
	private final Setting clientId = add(Setting.string("client_id", "Spotify Client ID", ""));
	private final Setting art = add(Setting.bool("art", "Album art", true));
	private final Setting progress = add(Setting.bool("progress", "Progress bar", true));

	public SpotifyModule() {
		super("spotify", "Spotify", "Now playing card with album art and controls", Category.MEDIA, true);
		add(Setting.action("Connect to Spotify", () -> SpotifyApi.connect(clientId.s())));
		add(Setting.action("Disconnect", SpotifyApi::disconnect));
		add(Setting.action("Previous", SpotifyApi::previous));
		add(Setting.action("Play / Pause", SpotifyApi::togglePlay));
		add(Setting.action("Next", SpotifyApi::next));
	}

	@Override public void tick(MinecraftClient mc) {
		SpotifyApi.lastSeen = System.currentTimeMillis();
		w = 180;
		h = progress.b() ? 52 : 40;
	}

	@Override public void render(DrawContext c) {
		Theme.panel(c, 0, 0, w, h);
		boolean showArt = art.b();
		int tx = showArt ? 52 : 8;
		SpotifyApi.Track t = SpotifyApi.current;
		String note = System.currentTimeMillis() - SpotifyApi.noteAt < 4000 ? SpotifyApi.note : "";

		if (showArt) {
			var tex = t == null ? null : WebImage.get(t.artUrl(), 64, 64);
			if (tex != null) Gfx.image(c, tex.id(), 5, 5, 40, 40, 64, 64);
			else c.fill(5, 5, 45, 45, 0xFF2A2A3C);
		}
		if (t == null) {
			Theme.text(c, "Spotify", tx, 8, 0xFF1ED760);
			String msg = !note.isEmpty() ? note : SpotifyApi.connected() ? "Nothing playing" : SpotifyApi.status;
			Theme.text(c, Gfx.trim(msg, w - tx - 6), tx, 20, Gfx.GRAY);
			return;
		}
		Theme.text(c, Gfx.trim(t.title(), w - tx - 6), tx, 7, Gfx.WHITE);
		Theme.text(c, Gfx.trim(!note.isEmpty() ? note : t.artist(), w - tx - 6), tx, 18, note.isEmpty() ? Gfx.GRAY : Gfx.YELLOW);
		if (progress.b()) {
			long p = Math.min(t.duration(), t.progress() + (t.playing() ? System.currentTimeMillis() - t.at() : 0));
			int bw = w - tx - 6;
			c.fill(tx, 32, tx + bw, 35, 0x55FFFFFF);
			c.fill(tx, 32, tx + (int) (bw * (p / (double) Math.max(1, t.duration()))), 35, 0xFF1ED760);
			String right = Gfx.time(t.duration());
			Gfx.small(c, Gfx.time(p), tx, 39, 0.75f, Gfx.GRAY);
			Gfx.small(c, right, tx + bw - (int) (MinecraftClient.getInstance().textRenderer.getWidth(right) * 0.75f), 39, 0.75f, Gfx.GRAY);
		}
	}
}
