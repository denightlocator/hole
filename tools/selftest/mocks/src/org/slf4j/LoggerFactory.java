package org.slf4j;

public final class LoggerFactory {
    private static final Logger LOGGER = new Logger() { };
    public static Logger getLogger(String name) { return LOGGER; }
}
