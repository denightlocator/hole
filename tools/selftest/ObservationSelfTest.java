import dev.orbit.client.observation.ActivityHistory;
import dev.orbit.client.observation.ChunkVisibility;
import dev.orbit.client.observation.GeodeAgeHeuristic;
import dev.orbit.client.observation.GeodeAgeHeuristic.Age;
import dev.orbit.client.observation.ObservationLimits;
import dev.orbit.client.observation.OverlayColors;
import dev.orbit.client.observation.PlayerMotionTracker;

import java.util.HashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;
import java.util.UUID;

/**
 * Pure-Java tests, independent of Minecraft/Fabric. From the project root:
 *
 * <pre>
 * mkdir -p /tmp/orbit-observation-test
 * javac -d /tmp/orbit-observation-test src/main/java/dev/orbit/client/observation/*.java \
 *     tools/selftest/ObservationSelfTest.java
 * java -cp /tmp/orbit-observation-test ObservationSelfTest
 * </pre>
 */
public class ObservationSelfTest {
    public static void main(String[] args) {
        testFadeAndEviction();
        testMovement();
        testChunkVisibility();
        testAgeHeuristic();
        testColors();
        testSettingLimits();
        System.out.println("ObservationSelfTest: all checks passed");
    }

    private static void testFadeAndEviction() {
        ActivityHistory history = new ActivityHistory(2);
        history.mark(-1, 0, 62, 1_000);
        List<ActivityHistory.Mark> start = history.snapshot(1_000, 10_000);
        check(start.size() == 1 && start.get(0).intensity() == 1f, "fresh mark");
        check(close(history.snapshot(6_000, 10_000).get(0).intensity(), 0.5), "linear fade");
        check(history.snapshot(11_000, 10_000).isEmpty(), "expired at exact boundary");

        history.mark(-1, 0, 63, 12_000);
        history.mark(0, -1, 64, 12_001);
        check(ActivityHistory.chunkKey(-1, 0) != ActivityHistory.chunkKey(0, -1), "signed chunk keys");
        history.mark(-1, 0, 65, 12_002); // refresh makes this the newest entry
        history.mark(1, 2, 66, 12_003);
        List<ActivityHistory.Mark> kept = history.snapshot(12_003, 1000);
        check(kept.size() == 2 && kept.get(0).chunkX() == -1 && kept.get(0).y() == 65,
                "oldest entry evicted; updated height retained");
        check(history.snapshot(11_000, 1000).get(0).intensity() == 1f, "future timestamps are clamped");
        history.mark(3, 4, Double.NaN, 12_003);
        check(history.snapshot(12_003, 1000).size() == 2, "invalid height ignored");
        history.clear();
        check(history.snapshot(12_003, 1000).isEmpty(), "world/session reset");
        history.mark(0, 0, 64, 0);
        check(history.snapshot(0, 0).isEmpty(), "nonpositive fade removes marks");
    }

    private static void testMovement() {
        ActivityHistory history = new ActivityHistory(10);
        PlayerMotionTracker motion = new PlayerMotionTracker();
        UUID player = UUID.fromString("11af35ad-2d23-48ea-84fd-426b5a1eb011");
        motion.observe(player, 1, 64, 1, 0, history);
        motion.observe(player, 1, 64, 1, 100, history);
        check(history.snapshot(100, 1000).isEmpty(), "stationary/spawning players do not mark chunks");
        motion.observe(player, 1.02, 64, 1, 200, history);
        motion.observe(player, 1.06, 64, 1, 300, history);
        check(history.snapshot(300, 1000).size() == 1, "small movement accumulates");
        motion.observe(player, -0.01, 64, 1, 400, history);
        List<ActivityHistory.Mark> crossing = history.snapshot(400, 1000);
        check(crossing.size() == 2 && crossing.stream().anyMatch(mark -> mark.chunkX() == -1),
                "crossing zero records both chunks using floor division");
        check(PlayerMotionTracker.chunkCoordinate(-16.01) == -2, "negative boundary");
        check(PlayerMotionTracker.chunkCoordinate(-16.0) == -1, "exact negative boundary");
        motion.retainPlayers(Set.of());
        history.clear();
        motion.observe(player, 99, 64, 1, 500, history);
        check(history.snapshot(500, 1000).isEmpty(), "departed player is not connected to a later spawn");
        motion.clear();
    }

    private static void testChunkVisibility() {
        Set<Long> loaded = new HashSet<>();
        loaded.add(ActivityHistory.chunkKey(0, 0));
        loaded.add(ActivityHistory.chunkKey(2, 0));
        ChunkVisibility.LoadedChunks cache = (x, z) -> loaded.contains(ActivityHistory.chunkKey(x, z));
        check(!ChunkVisibility.pathIsLoaded(1, 1, 33, 1, cache), "unloaded gap is not clear sight");
        loaded.add(ActivityHistory.chunkKey(1, 0));
        check(ChunkVisibility.pathIsLoaded(1, 1, 33, 1, cache), "loaded horizontal path");
        check(!ChunkVisibility.pathIsLoaded(-0.1, 1, 0.1, 1, cache), "negative chunk checked");
        loaded.add(ActivityHistory.chunkKey(-1, 0));
        check(ChunkVisibility.pathIsLoaded(-0.1, 1, 0.1, 1, cache), "crossing zero with both chunks loaded");
        check(ChunkVisibility.pathIsLoaded(-0.0, 1, 0.0, 1, cache), "negative zero does not step");
        check(ChunkVisibility.pathIsLoaded(16, 16, 32, 0, (x, z) -> true),
                "negative endpoint on a chunk boundary does not overshoot");
        check(!ChunkVisibility.pathIsLoaded(1, 1, 17, 17, (x, z) -> x == z),
                "a corner-crossing path checks adjacent unknown chunks");
        check(!ChunkVisibility.pathIsLoaded(16, 1, 16, 40, (x, z) -> x == 1),
                "a path along an X boundary checks the other side");
        check(ChunkVisibility.pathIsLoaded(16, 1, 16, 40, (x, z) -> x == 0 || x == 1),
                "a boundary path is valid when both sides are loaded");
        check(!ChunkVisibility.pathIsLoaded(1, 0, 40, 0, (x, z) -> z == 0),
                "a path along a Z boundary checks the other side");
        check(!ChunkVisibility.pathIsLoaded(0, 0, 0, 0, (x, z) -> x == 0 || z == 0),
                "a stationary point at a corner checks all four chunks");
        check(!ChunkVisibility.pathIsLoaded(Double.NaN, 1, 0, 1, cache), "invalid camera coordinates");
        check(!ChunkVisibility.pathIsLoaded(1, 1, 1_000_000, 1, (x, z) -> true), "path traversal bounded");

        // Deterministic fuzzing: every chunk touched by dense samples must have been checked.
        Random random = new Random(42);
        for (int i = 0; i < 300; i++) {
            double x0 = random.nextDouble() * 160 - 80, z0 = random.nextDouble() * 160 - 80;
            double x1 = random.nextDouble() * 160 - 80, z1 = random.nextDouble() * 160 - 80;
            Set<Long> visited = new HashSet<>();
            check(ChunkVisibility.pathIsLoaded(x0, z0, x1, z1, (x, z) -> {
                visited.add(ActivityHistory.chunkKey(x, z));
                return true;
            }), "fully loaded path");
            for (int step = 0; step <= 1000; step++) {
                double t = step / 1000.0;
                int x = PlayerMotionTracker.chunkCoordinate(x0 + (x1 - x0) * t);
                int z = PlayerMotionTracker.chunkCoordinate(z0 + (z1 - z0) * t);
                check(visited.contains(ActivityHistory.chunkKey(x, z)), "path skipped a chunk");
            }
        }
    }

    private static void testAgeHeuristic() {
        check(GeodeAgeHeuristic.classify(0, 0, 120_000, 600_000) == Age.FRESH, "fresh budding block");
        check(GeodeAgeHeuristic.classify(119_999, 1, 120_000, 600_000) == Age.FRESH, "fresh boundary");
        check(GeodeAgeHeuristic.classify(120_000, 0, 120_000, 600_000) == Age.AGING, "aging boundary");
        check(GeodeAgeHeuristic.classify(0, 2, 120_000, 600_000) == Age.AGING, "visible medium bud");
        check(GeodeAgeHeuristic.classify(600_000, 0, 120_000, 600_000) == Age.VERY_AGED, "old boundary");
        check(GeodeAgeHeuristic.classify(0, 4, 120_000, 600_000) == Age.VERY_AGED, "visible cluster");
        check(GeodeAgeHeuristic.classify(-10, 0, 120_000, 1) == Age.FRESH,
                "negative age and reversed thresholds are safe");
        check(GeodeAgeHeuristic.classify(120_000, 0, 120_000, 1) == Age.VERY_AGED,
                "very-aged threshold never precedes aging threshold");
    }

    private static void testColors() {
        check(OverlayColors.rgbOrDefault(" #aBc012 ", 0) == 0xABC012, "hex color");
        check(OverlayColors.rgbOrDefault("not a color", 0xFF65C7FF) == 0x65C7FF, "invalid color fallback");
        check(OverlayColors.rgbOrDefault(null, 0x123456) == 0x123456, "null color fallback");
        check(OverlayColors.withOpacity(0x65C7FF, 0.5) == 0x8065C7FF, "opacity");
        check(OverlayColors.withOpacity(0x65C7FF, 2.0) == 0xFF65C7FF, "opacity clamped");
        check(OverlayColors.withOpacity(0x65C7FF, Double.NaN) == 0x0065C7FF, "invalid opacity safe");
    }

    private static void testSettingLimits() {
        check(ObservationLimits.clampOrDefault(99, 8, 48, 32) == 48, "range upper bound");
        check(ObservationLimits.clampOrDefault(-1, 8, 48, 32) == 8, "range lower bound");
        check(ObservationLimits.clampOrDefault(Double.NaN, 8, 48, 32) == 32, "NaN uses default");
        check(ObservationLimits.clampOrDefault(Double.POSITIVE_INFINITY, 8, 48, 32) == 32,
                "non-finite setting uses default");
    }

    private static boolean close(double a, double b) {
        return Math.abs(a - b) < 0.0001;
    }

    private static void check(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }
}
