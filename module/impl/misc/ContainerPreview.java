package dev.orbit.client.module.impl.misc;

import dev.orbit.client.module.Category;
import dev.orbit.client.module.Module;
import dev.orbit.client.module.setting.BoolSetting;
import dev.orbit.client.module.setting.NumberSetting;
import net.minecraft.component.DataComponentTypes;
import net.minecraft.component.type.ContainerComponent;
import net.minecraft.item.ItemStack;
import net.minecraft.text.MutableText;
import net.minecraft.text.Text;
import net.minecraft.util.Formatting;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Lists a container's contents in the item tooltip.
 *
 * <p>Only containers whose contents travel with the item can be previewed: shulker boxes and bundles
 * carry a {@code ContainerComponent}. A placed chest does not - the client is never sent its contents
 * until it is opened - so this deliberately does nothing for them rather than showing an empty box and
 * implying the chest is empty.
 *
 * <p>Stacks are merged by item and sorted by count, so a shulker of 27 diamonds reads as one line
 * instead of twenty-seven.
 */
public class ContainerPreview extends Module {
    private final NumberSetting maxLines = addSetting(new NumberSetting("Max Lines", 6, 1, 20, 1, ""));
    private final BoolSetting totals = addSetting(new BoolSetting("Show Total", true));

    public ContainerPreview() {
        super("Container Preview", "Lists shulker and bundle contents in the tooltip.", Category.MISC);
    }

    /** Called from the tooltip callback registered in Orbit. */
    public void appendTooltip(ItemStack stack, List<Text> lines) {
        if (!isEnabled() || stack.isEmpty()) {
            return;
        }
        ContainerComponent container = stack.get(DataComponentTypes.CONTAINER);
        if (container == null) {
            return;
        }

        // merge by item name, keep first-seen order of appearance
        Map<String, Integer> counts = new LinkedHashMap<>();
        int totalItems = 0;
        for (ItemStack inside : container.iterateNonEmpty()) {
            if (inside.isEmpty()) {
                continue;
            }
            String name = inside.getName().getString();
            counts.merge(name, inside.getCount(), Integer::sum);
            totalItems += inside.getCount();
        }
        if (counts.isEmpty()) {
            return;
        }

        lines.add(Text.empty());
        lines.add(Text.literal("Contains:").formatted(Formatting.DARK_GRAY));

        int shown = 0;
        int limit = (int) maxLines.get();
        for (Map.Entry<String, Integer> entry : counts.entrySet()) {
            if (shown++ >= limit) {
                int hidden = counts.size() - limit;
                lines.add(Text.literal("  +" + hidden + " more").formatted(Formatting.DARK_GRAY));
                break;
            }
            MutableText line = Text.literal("  " + entry.getValue() + "× ").formatted(Formatting.GRAY);
            line.append(Text.literal(entry.getKey()).formatted(Formatting.WHITE));
            lines.add(line);
        }

        if (totals.get()) {
            lines.add(Text.literal("  " + totalItems + " items total").formatted(Formatting.DARK_GRAY));
        }
    }
}
