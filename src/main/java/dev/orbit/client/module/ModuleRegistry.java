package dev.orbit.client.module;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Module registry. Empty for now - {@link #register(Module)} is what modules get added through.
 */
public final class ModuleRegistry {
    private static final List<Module> MODULES = new ArrayList<>();

    private ModuleRegistry() {
    }

    public static void register(Module module) {
        MODULES.add(module);
    }

    public static List<Module> all() {
        return MODULES;
    }

    public static List<Module> byCategory(Category category) {
        return MODULES.stream().filter(m -> m.getCategory() == category).toList();
    }

    public static Optional<Module> byName(String name) {
        return MODULES.stream().filter(m -> m.getName().equalsIgnoreCase(name)).findFirst();
    }

    public static <T extends Module> Optional<T> get(Class<T> type) {
        return MODULES.stream().filter(type::isInstance).map(type::cast).findFirst();
    }

    public static int activeCount(Category category) {
        return (int) MODULES.stream().filter(m -> m.getCategory() == category && m.isEnabled()).count();
    }
}
