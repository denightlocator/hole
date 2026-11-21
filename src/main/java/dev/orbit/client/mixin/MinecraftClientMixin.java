package dev.orbit.client.mixin;

import dev.orbit.client.gui.title.OrbitTitleScreen;
import dev.orbit.client.module.ModuleRegistry;
import dev.orbit.client.module.impl.misc.TitleScreenModule;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.screen.TitleScreen;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Swaps the vanilla title screen for Orbit's.
 *
 * <p>Hooking {@code setScreen} catches every path that shows the main menu (startup, quitting a
 * world, disconnect), and replacing rather than editing vanilla keeps the vanilla class untouched
 * for other mods. {@link OrbitTitleScreen} is not a {@link TitleScreen}, so this cannot recurse.
 */
@Mixin(MinecraftClient.class)
public abstract class MinecraftClientMixin {

    @Inject(method = "setScreen", at = @At("HEAD"), cancellable = true)
    private void orbit$replaceTitleScreen(Screen screen, CallbackInfo info) {
        if (!(screen instanceof TitleScreen)) {
            return;
        }
        TitleScreenModule module = ModuleRegistry.get(TitleScreenModule.class).orElse(null);
        if (module == null || !module.isEnabled()) {
            return;
        }
        MinecraftClient client = (MinecraftClient) (Object) this;
        // guard: if the custom screen fails to build, fall back to vanilla instead of crashing
        try {
            client.setScreen(new OrbitTitleScreen());
            info.cancel();
        } catch (Throwable t) {
            dev.orbit.client.Orbit.LOGGER.error("Falling back to the vanilla title screen", t);
            module.setEnabled(false);
        }
    }
}
