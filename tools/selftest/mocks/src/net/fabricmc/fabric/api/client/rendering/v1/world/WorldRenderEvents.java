package net.fabricmc.fabric.api.client.rendering.v1.world;

import java.util.ArrayList;
import java.util.List;

public final class WorldRenderEvents {
    public interface AfterEntities { void afterEntities(WorldRenderContext context); }
    public static final Event AFTER_ENTITIES = new Event();
    public static final class Event {
        public final List<AfterEntities> callbacks = new ArrayList<>();
        public void register(AfterEntities callback) { callbacks.add(callback); }
        public void fire(WorldRenderContext context) { callbacks.forEach(callback -> callback.afterEntities(context)); }
    }
}
