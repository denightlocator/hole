package net.fabricmc.fabric.api.client.event.lifecycle.v1;

import java.util.ArrayList;
import java.util.List;
import net.minecraft.client.MinecraftClient;

public final class ClientTickEvents {
    public interface EndTick { void onEndTick(MinecraftClient client); }
    public static final Event END_CLIENT_TICK = new Event();
    public static final class Event {
        public final List<EndTick> callbacks = new ArrayList<>();
        public void register(EndTick callback) { callbacks.add(callback); }
        public void fire(MinecraftClient client) { callbacks.forEach(callback -> callback.onEndTick(client)); }
    }
}
