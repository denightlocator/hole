package dev.orbit.client.observation;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Session-only, bounded record of the last observed activity in each chunk. */
public final class ActivityHistory {
    private final int capacity;
    // In insertion order; updating a mark moves it to the end, so the oldest is evicted first.
    private final Map<Long, Entry> entries = new LinkedHashMap<>();

    public ActivityHistory(int capacity) {
        if (capacity < 1) {
            throw new IllegalArgumentException("capacity must be positive");
        }
        this.capacity = capacity;
    }

    public void mark(int chunkX, int chunkZ, double y, long nowMillis) {
        if (!Double.isFinite(y)) {
            return;
        }
        long key = chunkKey(chunkX, chunkZ);
        entries.remove(key);
        entries.put(key, new Entry(chunkX, chunkZ, y, nowMillis));
        while (entries.size() > capacity) {
            Iterator<Long> iterator = entries.keySet().iterator();
            iterator.next();
            iterator.remove();
        }
    }

    /** Removes expired marks and returns an immutable rendering snapshot, newest entries last. */
    public List<Mark> snapshot(long nowMillis, long fadeMillis) {
        List<Mark> result = new ArrayList<>(entries.size());
        Iterator<Entry> iterator = entries.values().iterator();
        while (iterator.hasNext()) {
            Entry entry = iterator.next();
            long elapsed = Math.max(0L, nowMillis - entry.lastActivityMillis());
            if (fadeMillis <= 0 || elapsed >= fadeMillis) {
                iterator.remove();
                continue;
            }
            float intensity = (float) (1.0 - elapsed / (double) fadeMillis);
            result.add(new Mark(entry.chunkX(), entry.chunkZ(), entry.y(), intensity));
        }
        return List.copyOf(result);
    }

    public void clear() {
        entries.clear();
    }

    public static long chunkKey(int x, int z) {
        return ((long) x << 32) | (z & 0xffffffffL);
    }

    private record Entry(int chunkX, int chunkZ, double y, long lastActivityMillis) { }

    public record Mark(int chunkX, int chunkZ, double y, float intensity) { }
}
