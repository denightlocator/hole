package com.novaclient.modules;

import com.novaclient.module.*;
import com.novaclient.util.Gfx;
import net.minecraft.client.MinecraftClient;
import net.minecraft.entity.effect.StatusEffectInstance;

import java.util.ArrayList;
import java.util.List;

public class EffectsModule extends TextModule {
	private final Setting hideEmpty = add(Setting.bool("hide_empty", "Hide when no effects", true));

	public EffectsModule() { super("effects", "Potion Effects", "Active effects with timers", Category.PLAYER); }

	@Override protected List<Line> build(MinecraftClient mc) {
		List<Line> out = new ArrayList<>();
		if (mc.player != null) {
			for (StatusEffectInstance e : mc.player.getStatusEffects()) {
				var type = e.getEffectType().value();
				String time = e.isInfinite() ? "inf" : Gfx.time(e.getDuration() * 50L);
				out.add(new Line(type.getName().getString() + " " + (e.getAmplifier() + 1) + ": ", time, 0xFF000000 | type.getColor()));
			}
		}
		if (out.isEmpty() && !hideEmpty.b()) out.add(new Line("No effects", "", Gfx.GRAY));
		return out;
	}
}
