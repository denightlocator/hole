package com.novaclient.modules;

import com.novaclient.Theme;
import com.novaclient.module.*;
import com.novaclient.util.Gfx;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.entity.EquipmentSlot;
import net.minecraft.item.ItemStack;

import java.util.ArrayList;
import java.util.List;

public class ArmorModule extends Module {
	private final Setting hand = add(Setting.bool("hand", "Show held item", true));
	private List<ItemStack> items = List.of();

	public ArmorModule() { super("armor", "Armor Status", "Armor pieces with durability", Category.PLAYER, true); }

	@Override public void tick(MinecraftClient mc) {
		List<ItemStack> l = new ArrayList<>();
		if (mc.player != null) {
			EquipmentSlot[] slots = {EquipmentSlot.HEAD, EquipmentSlot.CHEST, EquipmentSlot.LEGS, EquipmentSlot.FEET};
			for (EquipmentSlot s : slots) { ItemStack st = mc.player.getEquippedStack(s); if (!st.isEmpty()) l.add(st); }
			if (hand.b()) { ItemStack st = mc.player.getEquippedStack(EquipmentSlot.MAINHAND); if (!st.isEmpty()) l.add(st); }
		}
		items = l;
		w = 62;
		h = Math.max(1, l.size()) * 18 + 2;
	}

	@Override public void render(DrawContext c) {
		Theme.panel(c, 0, 0, w, h);
		if (items.isEmpty()) { Theme.text(c, "No armor", 6, 5, Gfx.GRAY); return; }
		int y = 2;
		for (ItemStack st : items) {
			c.drawItem(st, 5, y);
			String t = "";
			int col = Gfx.WHITE;
			if (st.isDamageable()) {
				int left = st.getMaxDamage() - st.getDamage();
				t = String.valueOf(left);
				col = Gfx.lerp(Gfx.RED, Gfx.GREEN, left / (float) st.getMaxDamage());
			} else if (st.getCount() > 1) t = "x" + st.getCount();
			Theme.text(c, t, 26, y + 5, col);
			y += 18;
		}
	}
}
