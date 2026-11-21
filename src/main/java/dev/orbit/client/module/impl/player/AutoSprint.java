package dev.orbit.client.module.impl.player;

import dev.orbit.client.module.Category;
import dev.orbit.client.module.Module;
import dev.orbit.client.module.setting.BoolSetting;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.network.ClientPlayerEntity;

/**
 * Auto Sprint - keeps you sprinting while you are actually moving forward.
 *
 * <p>Deliberately narrow: it only re-applies sprint when the forward key is held, you are on the
 * ground or already in the air, and hunger would not have stopped vanilla anyway. The client sends no
 * extra packets - this is the same client-side sprint the sprint key sets - so it is not a movement
 * exploit, and it turns itself off when the forward key is released so you can still walk slowly.
 */
public class AutoSprint extends Module {
    private final BoolSetting onlyForward = addSetting(new BoolSetting("Only Forward", true));
    private final BoolSetting keepWhenHungry = addSetting(new BoolSetting("Ignore Hunger", false));

    public AutoSprint() {
        super("Auto Sprint", "Sprints automatically while moving forward.", Category.PLAYER);
    }

    @Override
    public void onTick() {
        MinecraftClient client = MinecraftClient.getInstance();
        ClientPlayerEntity player = client.player;
        if (player == null || client.currentScreen != null) {
            return;
        }

        boolean movingForward = client.options.forwardKey.isPressed();
        if (onlyForward.get() && !movingForward) {
            return;
        }
        if (!onlyForward.get() && !movingForward
                && !client.options.leftKey.isPressed() && !client.options.rightKey.isPressed()) {
            return;
        }

        if (player.isSneaking() || player.isUsingItem() || player.horizontalCollision && !movingForward) {
            return;
        }
        if (!keepWhenHungry.get() && player.getHungerManager().getFoodLevel() <= 6) {
            return;
        }
        if (!player.isSprinting()) {
            player.setSprinting(true);
        }
    }
}
