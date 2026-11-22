package dev.orbit.client.module.impl.render;

import dev.orbit.client.module.Category;
import dev.orbit.client.module.setting.BoolSetting;
import dev.orbit.client.module.setting.ModeSetting;
import dev.orbit.client.module.setting.StringSetting;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.network.AbstractClientPlayerEntity;
import net.minecraft.client.world.ClientWorld;
import net.minecraft.entity.player.PlayerEntity;
import net.minecraft.scoreboard.Team;
import net.minecraft.util.math.Box;
import net.minecraft.util.math.Vec3d;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Player Tracking - boxes, tracers and name tags around other players.
 *
 * <p>All drawing, tagging and tracer maths lives in {@link EspModuleBase}; this class only decides
 * which players to track and what colour each one gets.
 *
 * <p>Colour coding supports four modes: health (red -> green), scoreboard team colour, an explicit
 * per-name colour list, or one static colour.
 */
public class PlayerTracking extends EspModuleBase {
    private final ModeSetting colorMode =
            addSetting(new ModeSetting("Colour Mode", "Health", "Health", "Team", "Name", "Static"));
    private final StringSetting nameColours =
            addSetting(new StringSetting("Name Colours", "Steve=#FF5555, Alex=#55FF55"));
    private final BoolSetting ignoreSpectators = addSetting(new BoolSetting("Ignore Spectators", true));

    /** Parsed cache for {@link #nameColours}; rebuilt only when the raw string changes. */
    private final Map<String, Integer> parsedNames = new HashMap<>();
    private String parsedNamesSource = "";

    public PlayerTracking() {
        super("Player Tracking",
                "Boxes, tracers and name tags around other players, visible through walls.",
                Category.RENDER);
    }

    @Override
    protected List<Target> scan() {
        MinecraftClient client = MinecraftClient.getInstance();
        ClientWorld world = client.world;
        if (world == null || client.player == null) {
            return none();
        }
        refreshNameColours();

        double maxSquared = range.get() * range.get();
        float tickDelta = client.getRenderTickCounter().getTickProgress(false);
        List<Target> found = new ArrayList<>();

        // world.getPlayers() is already limited to the loaded client world, so this is the
        // cheapest correct scan - no entity collection iteration needed.
        for (AbstractClientPlayerEntity player : world.getPlayers()) {
            if (player == client.player || player.isRemoved()) {
                continue;
            }
            if (ignoreSpectators.get() && player.isSpectator()) {
                continue;
            }
            if (ignoreInvisible.get() && player.isInvisible()) {
                continue;
            }
            double distanceSquared = client.player.squaredDistanceTo(player);
            if (distanceSquared > maxSquared) {
                continue;
            }

            // interpolate so boxes stay attached between ticks instead of stuttering
            Vec3d lerped = player.getLerpedPos(tickDelta);
            Box box = player.getBoundingBox().offset(
                    lerped.x - player.getX(),
                    lerped.y - player.getY(),
                    lerped.z - player.getZ());

            found.add(new Target(box, player.getName().getString(), Math.sqrt(distanceSquared),
                    player.getHealth(), player.getMaxHealth(), colourFor(player)));
        }
        return found;
    }

    /** @return packed ARGB for the current colour mode. */
    private int colourFor(PlayerEntity player) {
        return switch (colorMode.get()) {
            case "Static" -> staticColor.getRgb();
            case "Team" -> {
                Team team = player.getScoreboardTeam();
                // getTeamColorValue() returns white when there is no team, which would look like
                // an explicit white choice, so fall back to the static colour instead.
                yield team == null ? staticColor.getRgb() : 0xFF000000 | (player.getTeamColorValue() & 0xFFFFFF);
            }
            case "Name" -> parsedNames.getOrDefault(player.getName().getString().toLowerCase(),
                    staticColor.getRgb());
            default -> healthColour(player.getHealth(), player.getMaxHealth());
        };
    }

    /** Parses {@code "Name=#RRGGBB, Other=#AARRGGBB"} once per change. */
    private void refreshNameColours() {
        String raw = nameColours.get();
        if (raw.equals(parsedNamesSource)) {
            return;
        }
        parsedNamesSource = raw;
        parsedNames.clear();

        for (String entry : raw.split(",")) {
            String[] parts = entry.split("=");
            if (parts.length != 2) {
                continue;
            }
            String name = parts[0].trim().toLowerCase();
            String hex = parts[1].trim().replace("#", "");
            try {
                int value = Integer.parseInt(hex, 16);
                // allow both RRGGBB and AARRGGBB
                if (hex.length() <= 6) {
                    value |= 0xFF000000;
                }
                parsedNames.put(name, value);
            } catch (NumberFormatException ignored) {
                // a typo in one entry must not break the rest of the list
            }
        }
    }
}
