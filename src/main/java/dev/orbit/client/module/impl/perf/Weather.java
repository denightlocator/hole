package dev.orbit.client.module.impl.perf;

import dev.orbit.client.perf.PerfState;

/** Stops rain and snow rendering, along with the rain and thunder loops. */
public class Weather extends FlagModule {
    public Weather() {
        super("Weather", "Hides rain and snow, and mutes the rain and thunder loops.");
    }

    @Override
    protected void publish(boolean enabled) {
        PerfState.noWeather = enabled;
    }
}
