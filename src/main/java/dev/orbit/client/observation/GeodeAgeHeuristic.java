package dev.orbit.client.observation;

/**
 * A visual heuristic, not a measurement of a geode's real age. Buds grow randomly, may be
 * harvested, and the client cannot know how long a chunk was ticking before it was loaded here.
 */
public final class GeodeAgeHeuristic {
    private GeodeAgeHeuristic() { }

    public enum Age {
        FRESH("Fresh"), AGING("Aging"), VERY_AGED("Very aged");

        private final String label;

        Age(String label) {
            this.label = label;
        }

        public String label() {
            return label;
        }
    }

    /**
     * @param locallyLoadedMillis time since this client observed the chunk loaded (a lower bound
     *                            if the display was enabled after the chunk had already loaded)
     * @param visibleBudStage 0 for budding amethyst, 1-3 for buds, 4 for a full cluster
     */
    public static Age classify(long locallyLoadedMillis, int visibleBudStage,
                               long agingAfterMillis, long veryAgedAfterMillis) {
        long elapsed = Math.max(0L, locallyLoadedMillis);
        long aging = Math.max(1L, agingAfterMillis);
        long veryAged = Math.max(aging, veryAgedAfterMillis);
        if (visibleBudStage >= 4 || elapsed >= veryAged) {
            return Age.VERY_AGED;
        }
        if (visibleBudStage >= 2 || elapsed >= aging) {
            return Age.AGING;
        }
        return Age.FRESH;
    }
}
