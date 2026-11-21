package dev.orbit.client.hud;

import net.minecraft.client.MinecraftClient;
import net.minecraft.client.network.ClientPlayerEntity;
import net.minecraft.entity.EquipmentSlot;
import net.minecraft.entity.effect.StatusEffectInstance;
import net.minecraft.item.ItemStack;
import net.minecraft.item.Items;
import net.minecraft.registry.entry.RegistryEntry;
import net.minecraft.entity.effect.StatusEffect;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

/**
 * Text for the multi-line HUD elements.
 *
 * <p>Kept as plain strings with a colour attached, so the same text can be drawn by the HUD and by
 * the editor at a dragged position without either one owning layout.
 */
public final class HudContent {
    /** One line: text plus its ARGB colour. */
    public record Line(String text, int colour) {
    }

    private HudContent() {
    }

    /** Equipped armour, one line per worn piece, worst piece first is *not* used - slot order reads better. */
    public static List<Line> armour(boolean showPercent, boolean hideEmpty) {
        MinecraftClient client = MinecraftClient.getInstance();
        ClientPlayerEntity player = client.player;
        List<Line> lines = new ArrayList<>();
        if (player == null) {
            return lines;
        }

        EquipmentSlot[] slots = {
                EquipmentSlot.HEAD, EquipmentSlot.CHEST, EquipmentSlot.LEGS, EquipmentSlot.FEET};
        String[] labels = {"H", "C", "L", "B"};

        for (int i = 0; i < slots.length; i++) {
            ItemStack stack = player.getEquippedStack(slots[i]);
            if (stack.isEmpty() || stack.isOf(Items.AIR)) {
                if (!hideEmpty) {
                    lines.add(new Line(labels[i] + "  —", 0xFF6B7391));
                }
                continue;
            }
            if (!stack.isDamageable()) {
                lines.add(new Line(labels[i] + "  " + stack.getName().getString(), 0xFFC9D3EA));
                continue;
            }

            int max = stack.getMaxDamage();
            int left = max - stack.getDamage();
            float fraction = max <= 0 ? 0f : left / (float) max;
            String number = showPercent
                    ? Math.round(fraction * 100) + "%"
                    : left + "/" + max;
            lines.add(new Line(labels[i] + "  " + number, durabilityColour(fraction)));
        }

        // held tool, if it can break
        ItemStack held = player.getMainHandStack();
        if (!held.isEmpty() && held.isDamageable()) {
            int max = held.getMaxDamage();
            int left = max - held.getDamage();
            float fraction = max <= 0 ? 0f : left / (float) max;
            String number = showPercent ? Math.round(fraction * 100) + "%" : left + "/" + max;
            lines.add(new Line("T  " + number, durabilityColour(fraction)));
        }
        return lines;
    }

    private static int durabilityColour(float fraction) {
        if (fraction > 0.6f) {
            return 0xFF9FE8D6;
        }
        return fraction > 0.25f ? 0xFFF5C26B : 0xFFF26B6B;
    }

    /** Active status effects, longest remaining first. */
    public static List<Line> potions(boolean romanNumerals, boolean hideAmbient) {
        MinecraftClient client = MinecraftClient.getInstance();
        ClientPlayerEntity player = client.player;
        List<Line> lines = new ArrayList<>();
        if (player == null) {
            return lines;
        }

        List<StatusEffectInstance> effects = new ArrayList<>(player.getStatusEffects());
        effects.removeIf(effect -> hideAmbient && effect.isAmbient());
        effects.sort(Comparator.comparingInt(StatusEffectInstance::getDuration).reversed());

        for (StatusEffectInstance effect : effects) {
            String name = effectName(effect.getEffectType());
            String level = effect.getAmplifier() > 0
                    ? " " + (romanNumerals ? roman(effect.getAmplifier() + 1) : String.valueOf(effect.getAmplifier() + 1))
                    : "";
            String time = effect.isInfinite() ? "∞" : mmss(effect.getDuration());
            lines.add(new Line(name + level + "  " + time, effectColour(effect.getEffectType())));
        }
        return lines;
    }

    private static String effectName(RegistryEntry<StatusEffect> entry) {
        // "Speed", "Jump Boost" - drop the word "Potion" some names carry
        return translate(entry).replace(" Potion", "");
    }

    private static String translate(RegistryEntry<StatusEffect> entry) {
        try {
            return net.minecraft.text.Text.translatable(
                            entry.value().getTranslationKey())
                    .getString();
        } catch (Throwable t) {
            return "effect";
        }
    }

    private static int effectColour(RegistryEntry<StatusEffect> entry) {
        try {
            return 0xFF000000 | (entry.value().getColor() & 0xFFFFFF);
        } catch (Throwable t) {
            return 0xFFC9D3EA;
        }
    }

    private static String mmss(int ticks) {
        int totalSeconds = Math.max(0, ticks / 20);
        return String.format(Locale.ROOT, "%d:%02d", totalSeconds / 60, totalSeconds % 60);
    }

    private static String roman(int value) {
        return switch (value) {
            case 1 -> "I";
            case 2 -> "II";
            case 3 -> "III";
            case 4 -> "IV";
            case 5 -> "V";
            case 6 -> "VI";
            case 7 -> "VII";
            case 8 -> "VIII";
            case 9 -> "IX";
            case 10 -> "X";
            default -> String.valueOf(value);
        };
    }
}
