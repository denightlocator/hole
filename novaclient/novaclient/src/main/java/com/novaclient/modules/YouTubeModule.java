package com.novaclient.modules;

import com.google.gson.*;
import com.novaclient.Theme;
import com.novaclient.module.*;
import com.novaclient.util.Gfx;
import com.novaclient.util.Http;
import com.novaclient.util.WebImage;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.util.Util;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * YouTube link card: thumbnail, title and channel for a video link (or a comma-separated queue of links).
 * It does NOT play video in-game - "Open" sends the link to your browser.
 */
public class YouTubeModule extends Module {
	private final Setting urls = add(Setting.string("urls", "Video link(s), comma separated", ""));
	private final Setting thumb = add(Setting.bool("thumb", "Show thumbnail", true));

	private int index;
	private volatile String title = "", channel = "", thumbUrl = "", state = "";
	private String loadedFor = null;

	public YouTubeModule() {
		super("youtube", "YouTube", "Video card with thumbnail, title and channel", Category.MEDIA, true);
		add(Setting.action("Load / refresh", this::load));
		add(Setting.action("Next link", this::next));
		add(Setting.action("Open in browser", this::open));
	}

	private List<String> list() {
		List<String> l = new ArrayList<>();
		for (String p : urls.s().split("[,\\s]+")) if (p.startsWith("http")) l.add(p);
		return l;
	}

	private String cur() { List<String> l = list(); return l.isEmpty() ? null : l.get(Math.floorMod(index, l.size())); }

	public void next() { index++; load(); }

	public void open() {
		String u = cur();
		if (u != null) try { Util.getOperatingSystem().open(URI.create(u)); } catch (Exception ignored) {}
	}

	public void load() {
		String u = cur();
		if (u == null) { state = "Add a link in settings"; return; }
		loadedFor = u;
		state = "Loading...";
		Http.EX.execute(() -> {
			try {
				Http.Resp r = Http.get("https://www.youtube.com/oembed?format=json&url=" + URLEncoder.encode(u, StandardCharsets.UTF_8));
				if (r.code() != 200) { state = "Couldn't load (" + r.code() + ")"; return; }
				JsonObject o = JsonParser.parseString(r.text()).getAsJsonObject();
				title = o.get("title").getAsString();
				channel = o.get("author_name").getAsString();
				thumbUrl = o.has("thumbnail_url") ? o.get("thumbnail_url").getAsString() : "";
				state = "";
			} catch (Exception e) { state = "Network error"; }
		});
	}

	@Override public void tick(MinecraftClient mc) {
		String u = cur();
		if (u != null && !u.equals(loadedFor)) load();
		w = 168;
		h = thumb.b() ? 124 : 38;
	}

	@Override public void render(DrawContext c) {
		Theme.panel(c, 0, 0, w, h);
		c.fill(w - 3, 0, w, h, 0xFFFF2D2D);
		int y = 5;
		if (thumb.b()) {
			var tex = WebImage.get(thumbUrl, 160, 90);
			if (tex != null) Gfx.image(c, tex.id(), 4, 4, 160, 90, 160, 90);
			else c.fill(4, 4, 164, 94, 0xFF1E1E2C);
			y = 99;
		}
		if (!state.isEmpty() || title.isEmpty()) {
			Theme.text(c, "YouTube", 8, y, 0xFFFF4444);
			Theme.text(c, Gfx.trim(state.isEmpty() ? "Add a link in settings" : state, w - 16), 8, y + 11, Gfx.GRAY);
			return;
		}
		Theme.text(c, Gfx.trim(title, w - 16), 8, y, Gfx.WHITE);
		int n = list().size();
		Theme.text(c, Gfx.trim(channel, w - 40), 8, y + 11, Gfx.GRAY);
		if (n > 1) Gfx.small(c, (Math.floorMod(index, n) + 1) + "/" + n, w - 28, y + 12, 0.8f, Gfx.GRAY);
	}
}
