package dev.orbit.client.perf;

import net.minecraft.client.option.SimpleOption;

import java.util.IdentityHashMap;
import java.util.Map;

/**
 * Applies and restores vanilla game options on behalf of the performance modules.
 *
 * <p>Every value is snapshotted the first time it is touched, so disabling a module puts the
 * player's own setting back instead of leaving a forced one behind. Two modules may fight over the
 * same option (FPS Boost and Clouds both set the cloud mode), so the snapshot is kept per option
 * rather than per module and only the first writer wins - which is why FPS Boost records the
 * children it enabled and turns off only those.
 */
public final class OptionGuard {
    private static final Map<SimpleOption<?>, Object> ORIGINALS = new IdentityHashMap<>();

    private OptionGuard() {
    }

    @SuppressWarnings("unchecked")
    public static <T> void apply(SimpleOption<T> option, T value) {
        if (option == null) {
            return;
        }
        ORIGINALS.putIfAbsent(option, option.getValue());
        option.setValue(value);
    }

    @SuppressWarnings("unchecked")
    public static void restore(SimpleOption<?> option) {
        if (option == null) {
            return;
        }
        Object original = ORIGINALS.remove(option);
        if (original == null) {
            return;
        }
        @SuppressWarnings("unchecked")
        SimpleOption<Object> raw = (SimpleOption<Object>) option;
        raw.setValue(original);
    }
}
