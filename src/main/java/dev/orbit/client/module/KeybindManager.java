package dev.orbit.client.module;

import dev.orbit.client.Orbit;
import net.fabricmc.fabric.api.client.keybinding.v1.KeyBindingHelper;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.option.KeyBinding;
import net.minecraft.client.util.InputUtil;
import net.minecraft.util.Identifier;
import org.lwjgl.glfw.GLFW;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Gives every module a vanilla {@link KeyBinding} (so binds can be edited in
 * Options - Controls - Orbit) and fires the toggles itself.
 *
 * <p>Toggling is driven by <b>polling</b> the key/mouse state each tick rather than by vanilla's
 * {@code wasPressed()} queue. That queue has two problems here: it is only fed while no screen is
 * open, and it is keyed by keyboard code - so a module bound to a mouse button never received
 * anything at all. Polling fixes both, and makes rebinding take effect immediately.
 *
 * <p>The vanilla binding stays authoritative for the Controls screen: any change made there is
 * mirrored back onto the module (and saved) on the next tick.
 */
public final class KeybindManager {
    private static final Map<Module, KeyBinding> BINDINGS = new LinkedHashMap<>();
    /** Previous polled state per module, for edge detection. */
    private static final Map<Module, Boolean> HELD = new LinkedHashMap<>();
    // Register the category with vanilla so key bindings sort and group consistently.
    private static final KeyBinding.Category CATEGORY =
            KeyBinding.Category.create(Identifier.of("orbit", "main"));

    private KeybindManager() {
    }

    public static KeyBinding.Category category() {
        return CATEGORY;
    }

    /** Registers one keybinding per module. Call once, after all modules are registered. */
    public static void registerAll() {
        for (Module module : ModuleRegistry.all()) {
            Keybind bind = module.getKeybind();
            // the input type has to match the bind: a mouse bind registered as KEYSYM is dead
            InputUtil.Type type = bind.isBound() ? bind.getType() : InputUtil.Type.KEYSYM;
            int code = bind.isBound() ? bind.getCode() : InputUtil.UNKNOWN_KEY.getCode();

            KeyBinding keyBinding = KeyBindingHelper.registerKeyBinding(new KeyBinding(
                    translationKey(module),
                    type,
                    code,
                    CATEGORY));

            BINDINGS.put(module, keyBinding);
            HELD.put(module, false);
        }
        Orbit.LOGGER.info("Registered {} module keybinds", BINDINGS.size());
    }

    public static KeyBinding get(Module module) {
        return BINDINGS.get(module);
    }

    /**
     * Changes a module's bind and pushes it into the vanilla binding.
     * Used by the GUI and by config loading.
     */
    public static void set(Module module, Keybind bind) {
        module.setKeybind(bind);
        KeyBinding keyBinding = BINDINGS.get(module);
        if (keyBinding != null) {
            keyBinding.setBoundKey(bind.isBound() ? bind.getKey() : InputUtil.UNKNOWN_KEY);
        }
        // a rebind must not fire the old or new key on the same tick
        HELD.put(module, true);
    }

    /** Called every client tick: mirrors Options-screen rebinds, then fires presses. */
    public static void tick(MinecraftClient client) {
        boolean noScreen = client.currentScreen == null;
        net.minecraft.client.util.Window window = client.getWindow();
        long handle = window.getHandle();

        for (Map.Entry<Module, KeyBinding> entry : BINDINGS.entrySet()) {
            Module module = entry.getKey();
            KeyBinding keyBinding = entry.getValue();

            // vanilla Controls rebind -> module (and config)
            Keybind fromVanilla = Keybind.parse(keyBinding.getBoundKeyTranslationKey());
            if (!fromVanilla.equals(module.getKeybind())) {
                module.setKeybind(fromVanilla);
                HELD.put(module, true);
                Orbit.config().markDirty();
            }

            Keybind bind = module.getKeybind();
            boolean down = noScreen && isHeld(window, handle, bind);
            boolean wasDown = Boolean.TRUE.equals(HELD.get(module));
            HELD.put(module, down);

            if (down && !wasDown) {
                module.toggle();
                Orbit.config().markDirty();
            }
        }
    }

    /** Raw key/mouse state, respecting whether the bind is a keyboard key or a mouse button. */
    private static boolean isHeld(net.minecraft.client.util.Window window, long handle, Keybind bind) {
        if (bind == null || !bind.isBound()) {
            return false;
        }
        if (bind.getType() == InputUtil.Type.MOUSE) {
            return GLFW.glfwGetMouseButton(handle, bind.getCode()) == GLFW.GLFW_PRESS;
        }
        return InputUtil.isKeyPressed(window, bind.getCode());
    }

    private static String translationKey(Module module) {
        return "key.orbit.module." + module.getName().toLowerCase().replace(' ', '_').replace("-", "_");
    }
}
