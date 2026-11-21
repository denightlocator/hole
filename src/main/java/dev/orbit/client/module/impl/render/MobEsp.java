package dev.orbit.client.module.impl.render;

import dev.orbit.client.module.Category;
import dev.orbit.client.module.setting.BoolSetting;
import dev.orbit.client.module.setting.ModeSetting;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.network.ClientPlayerEntity;
import net.minecraft.client.world.ClientWorld;
import net.minecraft.entity.Entity;
import net.minecraft.entity.LivingEntity;
import net.minecraft.entity.decoration.ArmorStandEntity;
import net.minecraft.entity.mob.Monster;
import net.minecraft.entity.passive.PassiveEntity;
import net.minecraft.entity.player.PlayerEntity;
import net.minecraft.util.math.Box;
import net.minecraft.util.math.Vec3d;

import java.util.ArrayList;
import java.util.List;

/**
 * Mob ESP - boxes, tracers and name tags around living entities that are not players.
 *
 * <p>Same rendering as player tracking (it all lives in {@link EspModuleBase}); this class filters
 * the world's entities into hostiles, passives and everything else, and colours them by category or
 * by health.
 */
public class MobEsp extends EspModuleBase {
    /** Category buckets used by the filters and the category colour mode. */
    private static final int HOSTILE = 0;
    private static final int PASSIVE = 1;
    private static final int OTHER = 2;

    private static final int HOSTILE_COLOR = 0xFFFF5555;
    private static final int PASSIVE_COLOR = 0xFF55FF55;
    private static final int OTHER_COLOR = 0xFF5AA9FF;

    /** Hard ceiling so a crowded mob farm cannot turn this into a frame killer. */
    private static final int MAX_TARGETS = 256;

    private final ModeSetting colorMode =
            addSetting(new ModeSetting("Colour Mode", "Category", "Category", "Health", "Static"));

    private final BoolSetting hostiles = addSetting(new BoolSetting("Hostiles", true));
    private final BoolSetting passives = addSetting(new BoolSetting("Passives", true));
    private final BoolSetting others = addSetting(new BoolSetting("Other Entities", false));
    private final BoolSetting armorStands = addSetting(new BoolSetting("Armor Stands", false));
    private final BoolSetting ignoreNamed = addSetting(new BoolSetting("Ignore Named", false));

    public MobEsp() {
        super("Mob ESP",
                "Boxes, tracers and name tags around mobs, visible through walls.",
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
        List<Target> found = new ArrayList<>();

        for (Entity entity : world.getEntities()) {
            if (found.size() >= MAX_TARGETS) {
                break;
            }
            if (!(entity instanceof LivingEntity living) || entity instanceof PlayerEntity) {
                continue;
            }
            if (entity.isRemoved()) {
                continue;
            }
            // armor stands get their own switch instead of riding on the "other" bucket, so
            // enabling one cannot drag in every other odd living entity
            if (entity instanceof ArmorStandEntity) {
                if (!armorStands.get()) {
                    continue;
                }
            } else if (!allowed(categoryOf(living))) {
                continue;
            }
            if (ignoreInvisible.get() && entity.isInvisible()) {
                continue;
            }
            if (ignoreNamed.get() && entity.hasCustomName()) {
                continue;
            }

            double distanceSquared = self.squaredDistanceTo(entity);
            if (distanceSquared > maxSquared) {
                continue;
            }

            // interpolate so the box does not lag a tick behind a walking mob
            Vec3d lerped = entity.getLerpedPos(tickDelta);
            Box box = entity.getBoundingBox().offset(
                    lerped.x - entity.getX(),
                    lerped.y - entity.getY(),
                    lerped.z - entity.getZ());

            found.add(new Target(box, entity.getName().getString(), Math.sqrt(distanceSquared),
                    living.getHealth(), living.getMaxHealth(), colourFor(living, categoryOf(living))));
        }
        return found;
    }

    private static int categoryOf(LivingEntity entity) {
        if (entity instanceof Monster) {
            return HOSTILE;
        }
        if (entity instanceof PassiveEntity) {
            return PASSIVE;
        }
        return OTHER;
    }

    private boolean allowed(int category) {
        return switch (category) {
            case HOSTILE -> hostiles.get();
            case PASSIVE -> passives.get();
            default -> others.get();
        };
    }

    private int colourFor(LivingEntity entity, int category) {
        return switch (colorMode.get()) {
            case "Health" -> healthColour(entity.getHealth(), entity.getMaxHealth());
            case "Static" -> staticColor.getRgb();
            default -> switch (category) {
                case HOSTILE -> HOSTILE_COLOR;
                case PASSIVE -> PASSIVE_COLOR;
                default -> OTHER_COLOR;
            };
        };
    }
}
