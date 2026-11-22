package dev.orbit.client.module.impl.render;

import dev.orbit.client.module.Category;
import dev.orbit.client.module.setting.BoolSetting;
import dev.orbit.client.module.setting.ModeSetting;
import dev.orbit.client.module.setting.StringSetting;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.network.ClientPlayerEntity;
import net.minecraft.client.world.ClientWorld;
import net.minecraft.entity.Entity;
import net.minecraft.entity.ItemEntity;
import net.minecraft.item.ItemStack;
import net.minecraft.util.Formatting;
import net.minecraft.util.math.Box;
import net.minecraft.util.math.Vec3d;

import java.util.ArrayList;
import java.util.List;

/**
 * Item ESP - boxes and name tags around dropped items on the ground.
 *
 * <p>Same overlay as the other ESP modules (shared {@link EspModuleBase}); this one scans
 * {@link ItemEntity}s, labels them with stack size, and can colour by rarity or by whether the item
 * is on your watch list - which is the useful part when you are sorting loot or testing a map.
 */
public class ItemEsp extends EspModuleBase {
    /** Item stacks spawn at 0.25 blocks; the default box is fine, this just stops z-fighting. */
    private static final int MAX_TARGETS = 512;

    private final ModeSetting colorMode =
            addSetting(new ModeSetting("Colour Mode", "Rarity", "Rarity", "Watchlist", "Static", "All"));

    private final BoolSetting showCount = addSetting(new BoolSetting("Stack Count", true));
    private final BoolSetting ignoreAge = addSetting(new BoolSetting("Ignore Fresh Drops", false));

    /** Comma separated item ids or plain name fragments, e.g. {@code diamond, netherite_ingot}. */
    private final StringSetting watchlist =
            addSetting(new StringSetting("Watchlist", "diamond, emerald, netherite_ingot, shulker_box"));

    private final BoolSetting onlyWatchlist = addSetting(new BoolSetting("Only Watchlist", false));

    public ItemEsp() {
        super("Item ESP", "Boxes and name tags around dropped items, visible through walls.",
                Category.RENDER);
    }

    @Override
    protected List<Target> scan() {
        MinecraftClient client = MinecraftClient.getInstance();
        ClientWorld world = client.world;
        ClientPlayerEntity self = client.player;
        if (world == null || self == null) {
            return none();
        }

        double maxSquared = range.get() * range.get();
        float tickDelta = client.getRenderTickCounter().getTickProgress(false);
        List<String> watched = parseWatchlist();
        boolean watchOnly = onlyWatchlist.get();
        List<Target> found = new ArrayList<>();

        for (Entity entity : world.getEntities()) {
            if (found.size() >= MAX_TARGETS) {
                break;
            }
            if (!(entity instanceof ItemEntity item) || entity.isRemoved()) {
                continue;
            }
            // fresh drops are usually the ones you just threw away - optional noise filter
            if (ignoreAge.get() && item.getItemAge() < 20) {
                continue;
            }

            ItemStack stack = item.getStack();
            if (stack.isEmpty()) {
                continue;
            }

            boolean onWatchlist = matchesWatchlist(stack, watched);
            if (watchOnly && !onWatchlist) {
                continue;
            }

            double distanceSquared = self.squaredDistanceTo(item);
            if (distanceSquared > maxSquared) {
                continue;
            }

            String label = stack.getName().getString();
            if (showCount.get() && stack.getCount() > 1) {
                label += " x" + stack.getCount();
            }

            // items are small; interpolate so boxes do not jitter while they bob
            Vec3d lerped = item.getLerpedPos(tickDelta);
            Box box = item.getBoundingBox().offset(
                    lerped.x - item.getX(),
                    lerped.y - item.getY(),
                    lerped.z - item.getZ());

            found.add(new Target(box, label, Math.sqrt(distanceSquared),
                    // maxHealth 0 tells the name tag renderer not to print a health line
                    0f, 0f, colourFor(stack, onWatchlist)));
        }
        return found;
    }

    private int colourFor(ItemStack stack, boolean onWatchlist) {
        return switch (colorMode.get()) {
            case "Static" -> staticColor.getRgb();
            // on the watchlist = accent colour, everything else a dim grey so it recedes
            case "Watchlist" -> onWatchlist ? staticColor.getRgb() : 0xFF6E6E78;
            case "All" -> onWatchlist ? staticColor.getRgb() : rarityColour(stack);
            default -> rarityColour(stack);
        };
    }

    /** Vanilla rarity colour: common white, uncommon yellow, rare aqua, epic light purple. */
    private static int rarityColour(ItemStack stack) {
        Formatting formatting = stack.getRarity().getFormatting();
        Integer rgb = formatting.getColorValue();
        return rgb == null ? 0xFFFFFFFF : 0xFF000000 | (rgb & 0xFFFFFF);
    }

    /**
     * Matches by registry id or by display name fragment, so both {@code netherite_ingot} and
     * {@code Netherite Ingot} work without the player having to know which one we accept.
     */
    private static boolean matchesWatchlist(ItemStack stack, List<String> watched) {
        if (watched.isEmpty()) {
            return false;
        }
        String id = stack.getItem().toString().toLowerCase();
        String name = stack.getName().getString().toLowerCase();
        for (String needle : watched) {
            if (id.contains(needle) || name.contains(needle)) {
                return true;
            }
        }
        return false;
    }

    private List<String> parseWatchlist() {
        String raw = watchlist.get();
        if (raw.isBlank()) {
            return List.of();
        }
        List<String> needles = new ArrayList<>();
        for (String part : raw.split(",")) {
            String trimmed = part.trim().toLowerCase();
            if (!trimmed.isEmpty()) {
                needles.add(trimmed);
            }
        }
        return needles;
    }
}
