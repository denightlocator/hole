package dev.orbit.client;

/** Minimal logger/entrypoint double for exercising the actual ConfigManager without a game. */
public final class Orbit {
    public static final String VERSION = "0.1.0";
    public static final Log LOGGER = new Log();
    public static final class Log {
        public void info(String message, Object... args) { }
        public void warn(String message, Object... args) { }
        public void error(String message, Object... args) { }
    }
}
