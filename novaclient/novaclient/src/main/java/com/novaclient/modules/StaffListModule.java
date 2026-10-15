package com.novaclient.modules;

import com.novaclient.Theme;
import com.novaclient.module.*;
import com.novaclient.util.Gfx;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.network.PlayerListEntry;
import net.minecraft.scoreboard.Team;
import net.minecraft.text.Text;
import net.minecraft.util.Formatting;

import java.util.*;

/**
 * Lists staff currently visible in the tab list. A player counts as staff if their name is in your list,
 * or their team prefix / tab display name contains one of the keywords. Uses only public tab-list data.
 */
public class StaffListModule extends Module {
	private final Setting names = add(Setting.string("names", "Staff names (comma separated)", ""));
	private final Setting keywords = add(Setting.string("keywords", "Rank keywords", "owner,admin,mod,helper,staff,developer,manager,support"));
	private final Setting notify = add(Setting.bool("notify", "Chat alert on join", true));
	private final Setting hideEmpty = add(Setting.bool("hide_empty", "Hide when none online", false));

	private record Entry(String name, String rank, int color) {}

	private List<Entry> staff = List.of();
	private final Set<String> known = new HashSet<>();
	private Object lastWorld;
	private int counter, joinTicks;

	public StaffListModule() { super("staff", "Staff List", "Shows staff members online (from the tab list)", Category.SERVER, true); }

	private static List<String> split(String s) {
		List<String> l = new ArrayList<>();
		for (String p : s.toLowerCase().split("[,;\\n]")) if (!p.isBlank()) l.add(p.trim());
		return l;
	}

	@Override public void tick(MinecraftClient mc) {
		var tr = mc.textRenderer;
		if (mc.world != lastWorld) { lastWorld = mc.world; known.clear(); staff = List.of(); counter = 20; joinTicks = 0; }
		joinTicks++;
		if (++counter >= 10 && mc.world != null && mc.getNetworkHandler() != null) {
			counter = 0;
			List<String> nameSet = split(names.s()), kws = split(keywords.s());
			List<Entry> found = new ArrayList<>();
			for (PlayerListEntry e : mc.getNetworkHandler().getPlayerList()) {
				String name = e.getProfile().name();
				Team team = mc.world.getScoreboard().getScoreHolderTeam(name);
				String prefix = team != null ? team.getPrefix().getString().trim() : "";
				String disp = e.getDisplayName() != null ? e.getDisplayName().getString().replace(name, "").trim() : "";
				String tag = (prefix + " " + disp).trim();
				String low = tag.toLowerCase();
				boolean isStaff = nameSet.contains(name.toLowerCase()) || (!low.isEmpty() && kws.stream().anyMatch(low::contains));
				if (!isStaff) continue;
				int col = 0xFFFFFFFF;
				if (team != null && team.getColor() != null && team.getColor().getColorValue() != null) col = 0xFF000000 | team.getColor().getColorValue();
				found.add(new Entry(name, Gfx.trim(tag, 70), col));
			}
			found.sort(Comparator.comparing(Entry::rank).thenComparing(Entry::name));
			if (notify.b()) {
				Set<String> now = new HashSet<>();
				for (Entry en : found) {
					now.add(en.name());
					if (joinTicks > 100 && !known.contains(en.name()))
						mc.inGameHud.getChatHud().addMessage(Text.literal("[Nova] ").formatted(Formatting.AQUA)
								.append(Text.literal(en.name() + " (staff) is online").formatted(Formatting.YELLOW)));
				}
				known.clear(); known.addAll(now);
			} else known.clear();
			staff = found;
		}
		if (staff.isEmpty() && hideEmpty.b()) { w = 0; h = 0; return; }
		int mw = tr.getWidth("Staff Online (" + staff.size() + ")");
		for (Entry e : staff) mw = Math.max(mw, tr.getWidth((e.rank().isEmpty() ? "" : e.rank() + " ") + e.name()));
		if (staff.isEmpty()) mw = Math.max(mw, tr.getWidth("Nobody online"));
		w = mw + 12;
		h = 16 + Math.max(1, staff.size()) * 11;
	}


	@Override public void render(DrawContext c) {
		Theme.panel(c, 0, 0, w, h);
		Theme.text(c, "Staff Online (" + staff.size() + ")", 6, 4, Theme.accent());
		if (staff.isEmpty()) { Theme.text(c, "Nobody online", 6, 16, Gfx.GRAY); return; }
		var tr = MinecraftClient.getInstance().textRenderer;
		int y = 16;
		for (Entry e : staff) {
			int x = 6;
			if (!e.rank().isEmpty()) { Theme.text(c, e.rank(), x, y, e.color()); x += tr.getWidth(e.rank() + " "); }
			Theme.text(c, e.name(), x, y, Gfx.WHITE);
			y += 11;
		}
	}
}
