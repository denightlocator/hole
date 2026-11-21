package dev.orbit.client.observation;

/** Defensive bounds for settings read from files or other integrations. */
public final class ObservationLimits {
    private ObservationLimits() { }

    public static double clampOrDefault(double value, double min, double max, double fallback) {
        if (!Double.isFinite(value)) {
            value = fallback;
        }
        return Math.max(min, Math.min(max, value));
    }
}
