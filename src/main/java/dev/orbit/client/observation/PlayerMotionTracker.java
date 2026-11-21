package dev.orbit.client.observation;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** Detects real movement of locally loaded players; merely appearing in a chunk is not activity. */
public final class PlayerMotionTracker {
    private static final double MIN_MOVEMENT_SQUARED = 0.05 * 0.05;
    private final Map<UUID, Position> previous = new HashMap<>();

    public void observe(UUID id, double x, double y, double z, long nowMillis, ActivityHistory history) {
        if (!Double.isFinite(x) || !Double.isFinite(y) || !Double.isFinite(z)) {
            return;
        }
        int chunkX = chunkCoordinate(x);
        int chunkZ = chunkCoordinate(z);
        Position before = previous.get(id);
        if (before == null) {
            previous.put(id, new Position(x, y, z, chunkX, chunkZ));
            return;
        }

        double dx = x - before.x();
        double dy = y - before.y();
        double dz = z - before.z();
        boolean crossed = before.chunkX() != chunkX || before.chunkZ() != chunkZ;
        if (crossed || dx * dx + dy * dy + dz * dz >= MIN_MOVEMENT_SQUARED) {
            if (crossed) {
                history.mark(before.chunkX(), before.chunkZ(), before.y(), nowMillis);
            }
            history.mark(chunkX, chunkZ, y, nowMillis);
            previous.put(id, new Position(x, y, z, chunkX, chunkZ));
        }
        // Keep the old sample for tiny movements so they accumulate instead of being lost.
    }

    public void retainPlayers(Set<UUID> loadedPlayers) {
        previous.keySet().retainAll(loadedPlayers);
    }

    public void clear() {
        previous.clear();
    }

    public static int chunkCoordinate(double coordinate) {
        return Math.floorDiv((int) Math.floor(coordinate), 16);
    }

    private record Position(double x, double y, double z, int chunkX, int chunkZ) { }
}
