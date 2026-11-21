package net.fabricmc.fabric.api.client.event.lifecycle.v1;

import java.util.ArrayList;
import java.util.List;
import net.minecraft.client.world.ClientWorld;
import net.minecraft.world.chunk.WorldChunk;

public class ClientChunkEvents {
    public interface Callback { void call(ClientWorld world, WorldChunk chunk); }
    public static class Event {
        private final List<Callback> callbacks = new ArrayList<>();
        public void register(Callback callback) { callbacks.add(callback); }
        public void fire(ClientWorld world, WorldChunk chunk) {
            for (Callback callback : callbacks) callback.call(world, chunk);
        }
    }
    public static final Event CHUNK_LOAD = new Event();
    public static final Event CHUNK_UNLOAD = new Event();
}
