package org.slf4j;

public interface Logger {
    default void info(String format, Object... args) { }
    default void warn(String format, Object... args) { }
}
