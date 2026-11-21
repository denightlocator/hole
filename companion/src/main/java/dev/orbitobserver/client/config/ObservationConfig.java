package dev.orbitobserver.client.config;

import java.io.IOException;
import java.io.Reader;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.FileAlreadyExistsException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.util.Map;
import java.util.Properties;

/** Independent, client-local settings file. It never reads or changes Orbit's own configuration. */
public final class ObservationConfig {
    private static final String HEADER = "Orbit Observer settings. Edit while Minecraft is closed; "
            + "rebind keys in Options > Controls.";
    private static final Map<String, String> DEFAULTS = Map.ofEntries(
            Map.entry("chunk.enabled", "false"),
            Map.entry("chunk.color", "#65C7FF"),
            Map.entry("chunk.opacity", "35"),
            Map.entry("chunk.fadeSeconds", "300"),
            Map.entry("chunk.lineWidth", "1.5"),
            Map.entry("geode.enabled", "false"),
            Map.entry("geode.range", "32"),
            Map.entry("geode.agingAfter", "120"),
            Map.entry("geode.veryAgedAfter", "600"),
            Map.entry("geode.freshColor", "#A8E8FF"),
            Map.entry("geode.agingColor", "#C397FF"),
            Map.entry("geode.veryAgedColor", "#FF9FDC"),
            Map.entry("geode.opacity", "90"),
            Map.entry("geode.labelScale", "0.8")
    );

    private final Path path;
    private final Properties values;

    private ObservationConfig(Path path, Properties values) {
        this.path = path;
        this.values = values;
    }

    /** Creates a default file if absent; never replaces an existing file during initialization. */
    public static ObservationConfig loadOrCreate(Path path) throws IOException {
        Path absolute = path.toAbsolutePath();
        Files.createDirectories(absolute.getParent());
        try (Writer writer = Files.newBufferedWriter(absolute, StandardCharsets.UTF_8,
                StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE)) {
            defaults().store(writer, HEADER);
        } catch (FileAlreadyExistsException ignored) {
            // Preserve the user's file and read it below.
        }
        return new ObservationConfig(absolute, read(absolute));
    }

    /** Used only if the file cannot be read; future saves still require a successful reread. */
    public static ObservationConfig defaultsOnly(Path path) {
        return new ObservationConfig(path.toAbsolutePath(), defaults());
    }

    public String text(String key) {
        return values.getProperty(key, requireDefault(key));
    }

    public double number(String key) {
        double fallback = Double.parseDouble(requireDefault(key));
        try {
            double value = Double.parseDouble(text(key).trim());
            return Double.isFinite(value) ? value : fallback;
        } catch (NumberFormatException ignored) {
            return fallback;
        }
    }

    public boolean bool(String key) {
        String value = text(key).trim();
        if (value.equalsIgnoreCase("true")) return true;
        if (value.equalsIgnoreCase("false")) return false;
        return Boolean.parseBoolean(requireDefault(key));
    }

    /**
     * Reread before saving so external setting changes and unknown keys are not silently lost.
     * A malformed or unreadable file is never replaced with defaults.
     */
    public void saveEnabled(boolean chunkEnabled, boolean geodeEnabled) throws IOException {
        Properties current = read(path);
        current.setProperty("chunk.enabled", Boolean.toString(chunkEnabled));
        current.setProperty("geode.enabled", Boolean.toString(geodeEnabled));
        Path parent = path.getParent();
        Path temp = Files.createTempFile(parent, ".orbit-observer-", ".tmp");
        try {
            try (Writer writer = Files.newBufferedWriter(temp, StandardCharsets.UTF_8)) {
                current.store(writer, HEADER);
            }
            try {
                Files.move(temp, path, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
            } catch (AtomicMoveNotSupportedException ignored) {
                Files.move(temp, path, StandardCopyOption.REPLACE_EXISTING);
            }
        } finally {
            Files.deleteIfExists(temp);
        }
    }

    private static Properties read(Path path) throws IOException {
        Properties result = defaults();
        try (Reader reader = Files.newBufferedReader(path, StandardCharsets.UTF_8)) {
            try {
                result.load(reader);
            } catch (IllegalArgumentException malformed) {
                throw new IOException("Malformed properties file: " + path, malformed);
            }
        }
        return result;
    }

    private static Properties defaults() {
        Properties properties = new Properties();
        properties.putAll(DEFAULTS);
        return properties;
    }

    private static String requireDefault(String key) {
        String value = DEFAULTS.get(key);
        if (value == null) throw new IllegalArgumentException("Unknown config key: " + key);
        return value;
    }
}
