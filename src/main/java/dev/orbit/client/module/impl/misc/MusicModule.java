package dev.orbit.client.module.impl.misc;

import dev.orbit.client.Orbit;
import dev.orbit.client.audio.TrackSoundInstance;
import dev.orbit.client.module.Category;
import dev.orbit.client.module.Module;
import dev.orbit.client.module.setting.BoolSetting;
import dev.orbit.client.module.setting.ModeSetting;
import dev.orbit.client.module.setting.StringSetting;
import dev.orbit.client.lyrics.LrcParser;
import dev.orbit.client.lyrics.LyricsClient;
import dev.orbit.client.module.setting.NumberSetting;
import net.minecraft.client.MinecraftClient;
import net.minecraft.util.Identifier;
import dev.orbit.client.audio.LocalAudioServer;

import java.util.ArrayList;
import java.util.List;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Music player - streams Ogg tracks from the jar or from {@code config/orbit/music/}.
 *
 * <p>Deliberately not Spotify: Spotify audio is DRM protected and can only be decoded by Spotify's
 * own clients, and their API only <em>controls</em> playback elsewhere. Nothing here needs an
 * account, a token or a network connection - it is a local file player wearing a client GUI.
 *
 * <p>Tracks loop seamlessly (the bundled ones are rendered so the tail wraps into the head), fire on
 * the vanilla {@code Music} volume slider, and pause with the game because they run through the
 * vanilla sound engine.
 */
public class MusicModule extends Module {
    /** Built-in tracks, in GUI order. */
    private static final String[][] BUILT_IN = {
            {"Deep Field", "deep_field"},
            {"Starfall", "starfall"},
            {"Void Drift", "void_drift"},
    };

    private final ModeSetting source =
            addSetting(new ModeSetting("Source", "Built-in", "Built-in", "My Folder", "Local Files", "URL"));
    private final StringSetting url = addSetting(new StringSetting("URL", ""));
    /** Absolute paths or file names inside config/orbit/music, separated by ";" or newlines. */
    private final StringSetting playlist = addSetting(new StringSetting("Playlist", ""));
    private final BoolSetting rescan = addSetting(new BoolSetting("Reload List", false));
    private final StringSetting titleOverride = addSetting(new StringSetting("Title", ""));
    private final StringSetting artistOverride = addSetting(new StringSetting("Artist", ""));
    private final ModeSetting track = addSetting(new ModeSetting("Track",
            "Deep Field", "Deep Field", "Starfall", "Void Drift"));
    private final NumberSetting folderTrack =
            addSetting(new NumberSetting("Folder Track #", 1, 1, 32, 1, ""));
    private final NumberSetting volume = addSetting(new NumberSetting("Volume", 65, 0, 100, 1, "%"));
    private final BoolSetting loop = addSetting(new BoolSetting("Loop", true));

    /** Momentary buttons: the GUI flips them, the tick below acts on the flip and clears them. */
    private final BoolSetting next = addSetting(new BoolSetting("Next Track", false));
    private final BoolSetting previous = addSetting(new BoolSetting("Previous Track", false));

    // transport: momentary buttons, same idea as next/previous
    private final BoolSetting playButton = addSetting(new BoolSetting("Play", false));
    private final BoolSetting pauseButton = addSetting(new BoolSetting("Pause / Resume", false));
    private final BoolSetting stopButton = addSetting(new BoolSetting("Stop", false));

    private final BoolSetting lyrics = addSetting(new BoolSetting("Lyrics", true));
    private final BoolSetting hud = addSetting(new BoolSetting("HUD", true));

    private TrackSoundInstance playing;
    private String playingKey = "";
    private int folderIndex = 1;

    // ── transport / HUD state ───────────────────────────────────────────
    /** Wall-clock anchor for the current position, in nanos; 0 when nothing is playing. */
    private long playAnchorNanos;
    /** Position carried over from previous play runs (pause, seek). */
    private long positionBaseMs;
    private boolean paused;

    private String title = "";
    private String artist = "";
    private List<LrcParser.Line> lyricLines = List.of();
    private String lyricSource = "";
    private boolean lyricsLoading;

    public MusicModule() {
        super("Music", "Plays Ogg tracks from the jar or from config/orbit/music.", Category.MISC);
        setKeybind(dev.orbit.client.module.Keybind.UNBOUND);
    }

    // ── lifecycle ───────────────────────────────────────────────────────
    @Override
    public void onEnable() {
        startCurrent();
    }

    @Override
    public void onDisable() {
        stopPlayback();
    }

    @Override
    public void onTick() {
        if (playButton.get()) {
            playButton.set(false);
            paused = false;
            if (playing == null) {
                startCurrent();
            }
            return;
        }
        if (pauseButton.get()) {
            pauseButton.set(false);
            togglePause();
            return;
        }
        if (stopButton.get()) {
            stopButton.set(false);
            stopPlayback();
            return;
        }

        if (next.get()) {
            next.set(false);
            advance(1);
            return;
        }
        if (previous.get()) {
            previous.set(false);
            advance(-1);
            return;
        }

        if (rescan.get()) {
            rescan.set(false);
            if ("Local Files".equals(source.get())) {
                serveLocal(folderIndex - 1);
                startCurrent();
            }
            return;
        }

        if (playing == null) {
            startCurrent();
            return;
        }

        // source / track / folder index changed from the GUI -> restart on the new one
        if (!currentKey().equals(playingKey)) {
            startCurrent();
            return;
        }

        playing.setVolume(volumeFraction());
    }

    // ── playback ────────────────────────────────────────────────────────
    private String currentKey() {
        return switch (source.get()) {
            case "Local Files" -> "local:" + folderIndex;
            case "My Folder" -> "folder:" + folderTrack.getInt();
            case "URL" -> "url:" + url.get().hashCode();
            default -> "builtin:" + track.get();
        };
    }

    private void advance(int direction) {
        if ("Local Files".equals(source.get())) {
            int count = Math.max(1, localFiles().size());
            folderIndex = Math.floorMod(folderIndex - 1 + direction, count) + 1;
            startCurrent();
            return;
        }

        if ("My Folder".equals(source.get())) {
            int count = Math.max(1, folderTracks().size());
            folderIndex = Math.floorMod(folderIndex - 1 + direction, count) + 1;
            folderTrack.set(folderIndex);
        } else {
            List<String> names = new ArrayList<>();
            for (String[] entry : BUILT_IN) {
                names.add(entry[0]);
            }
            int index = names.indexOf(track.get());
            int nextIndex = Math.floorMod(index < 0 ? 0 : index + direction, names.size());
            track.set(names.get(nextIndex));
        }
        startCurrent();
    }

    private void startCurrent() {
        stopPlayback();

        MinecraftClient client = MinecraftClient.getInstance();
        if (client.getSoundManager() == null) {
            return;
        }

        TrackSoundInstance instance = build();
        if (instance == null) {
            return;
        }

        try {
            client.getSoundManager().play(instance);
            playing = instance;
            playingKey = currentKey();
            // transport clock: lyrics and the progress bar read from here
            positionBaseMs = 0L;
            playAnchorNanos = System.nanoTime();
            paused = false;
            instance.setEndListener(this::onTrackEnded);
            updateMetadata();
            Orbit.LOGGER.info("Music: playing {}", playingKey);
        } catch (Throwable t) {
            Orbit.LOGGER.error("Music: could not start {}", playingKey, t);
            playing = null;
        }
    }

    private TrackSoundInstance build() {
        float vol = volumeFraction();

        if ("URL".equals(source.get())) {
            String link = url.get().trim();
            if (link.isEmpty()) {
                Orbit.LOGGER.warn("Music: URL source selected but the URL box is empty");
                return null;
            }
            if (!link.startsWith("http://") && !link.startsWith("https://")) {
                Orbit.LOGGER.warn("Music: only http(s) URLs are supported, got: {}", link);
                return null;
            }
            return new TrackSoundInstance(
                    Identifier.of("orbit", "music/url/" + Integer.toHexString(link.hashCode())),
                    () -> (net.minecraft.client.sound.AudioStream)
                            new dev.orbit.client.audio.HttpAudioStream(link),
                    vol,
                    loop.get());
        }

        if ("Local Files".equals(source.get())) {
            String served = serveLocal(folderIndex - 1);
            if (served == null) {
                return null;
            }
            String finalUrl = served;
            return new TrackSoundInstance(
                    Identifier.of("orbit", "music/local/" + (folderIndex - 1)),
                    () -> (net.minecraft.client.sound.AudioStream)
                            new dev.orbit.client.audio.HttpAudioStream(finalUrl),
                    vol,
                    loop.get());
        }

        if ("My Folder".equals(source.get())) {
            List<Path> files = folderTracks();
            if (files.isEmpty()) {
                Orbit.LOGGER.warn("Music: no .ogg files in {}", folder().toAbsolutePath());
                return null;
            }
            folderIndex = Math.min(Math.max(1, folderTrack.getInt()), files.size());
            Path file = files.get(folderIndex - 1);
            return new TrackSoundInstance(
                    Identifier.of("orbit", "music/folder/" + sanitise(file.getFileName().toString())),
                    () -> Files.newInputStream(file),
                    vol,
                    loop.get());
        }

        String id = "deep_field";
        for (String[] entry : BUILT_IN) {
            if (entry[0].equals(track.get())) {
                id = entry[1];
            }
        }
        Identifier resource = Identifier.of("orbit", "sounds/music/" + id + ".ogg");
        String finalId = id;
        return new TrackSoundInstance(
                Identifier.of("orbit", "music/" + finalId),
                () -> openResource(resource),
                vol,
                loop.get());
    }

    /** Reads a file stream. {@code ResourceManager#open} is what the jar contents need. */
    private static InputStream openResource(Identifier id) throws java.io.IOException {
        var optional = MinecraftClient.getInstance().getResourceManager().getResource(id);
        if (optional.isEmpty()) {
            throw new java.io.FileNotFoundException(id.toString());
        }
        return optional.get().getInputStream();
    }

    /**
     * Called from the sound thread when a stream runs dry.
     *
     * <p>Hopped back onto the client thread before touching any state: the sound engine thread must
     * never mutate module or screen state.
     */
    private void onTrackEnded() {
        MinecraftClient.getInstance().execute(() -> {
            if (!isEnabled()) {
                return;
            }
            if (loop.get()) {
                startCurrent();
            } else if (("Local Files".equals(source.get()) || "My Folder".equals(source.get()))
                    && (folderIndex < Math.max(1, localFiles().size()) || playlistTracks() > 1)) {
                advance(1);
            } else {
                stopPlayback();
            }
        });
    }

    private int playlistTracks() {
        return "Local Files".equals(source.get()) ? localFiles().size() : folderTracks().size();
    }

    /** Pause/resume. Audio keeps streaming at zero volume so the position is kept. */
    public void togglePause() {
        if (rescan.get()) {
            rescan.set(false);
            if ("Local Files".equals(source.get())) {
                serveLocal(folderIndex - 1);
                startCurrent();
            }
            return;
        }

        if (playing == null) {
            startCurrent();
            return;
        }
        paused = !paused;
        if (paused) {
            positionBaseMs = positionMs();
            playing.setVolume(0f);
        } else {
            playAnchorNanos = System.nanoTime();
            playing.setVolume(volumeFraction());
        }
    }

    /** Playback position in milliseconds; 0 when stopped. */
    public long positionMs() {
        if (playing == null) {
            return 0L;
        }
        if (paused || playAnchorNanos == 0L) {
            return positionBaseMs;
        }
        return positionBaseMs + (System.nanoTime() - playAnchorNanos) / 1_000_000L;
    }

    public boolean isPlaying() {
        return playing != null && !paused;
    }

    public boolean isPaused() {
        return playing != null && paused;
    }

    public String getTitle() {
        return title;
    }

    public String getArtist() {
        return artist;
    }

    public boolean showsHud() {
        return hud.get();
    }

    public boolean lyricsEnabled() {
        return lyrics.get();
    }

    /** The line that should be on screen right now, or {@code null}. */
    public LrcParser.Line activeLyric() {
        if (!lyrics.get() || lyricLines.isEmpty()) {
            return null;
        }
        return LrcParser.activeAt(lyricLines, positionMs());
    }

    public boolean lyricsLoading() {
        return lyricsLoading;
    }

    public boolean hasLyrics() {
        return !lyricLines.isEmpty();
    }

    // ── metadata + lyrics -------------------------------------------------
    /**
     * Works out what is playing and kicks off a lyric lookup.
     *
     * <p>Title/artist come from the module's overrides first, then from {@code "Artist - Title"}
     * in a filename or URL, then from the built-in track name. Overrides exist because a radio
     * stream URL contains no metadata at all.
     */
    private void updateMetadata() {
        String newTitle;
        String newArtist;

        if (!titleOverride.get().isBlank() || !artistOverride.get().isBlank()) {
            newTitle = titleOverride.get().trim();
            newArtist = artistOverride.get().trim();
        } else {
            String raw = rawName();
            String[] split = raw.split("\s+-\s+", 2);
            if (split.length == 2) {
                newArtist = split[0].trim();
                newTitle = split[1].trim();
            } else {
                newTitle = raw;
                newArtist = "";
            }
        }

        title = newTitle;
        artist = newArtist;

        String key = (newArtist + "|" + newTitle).toLowerCase();
        if (key.equals(lyricSource) || newTitle.isBlank()) {
            return;
        }
        lyricSource = key;
        lyricLines = List.of();
        if (!lyrics.get()) {
            return;
        }

        lyricsLoading = true;
        LyricsClient.fetch(newTitle, newArtist).thenAccept(result -> {
            lyricsLoading = false;
            result.ifPresent(found -> {
                lyricLines = found.lines();
                // trust the API's spelling over our guess when we had to guess
                if (artist.isBlank() && found.artist() != null) {
                    artist = found.artist();
                }
                if (title.isBlank() && found.track() != null) {
                    title = found.track();
                }
                Orbit.LOGGER.info("Music: {} lyric lines for {} - {}", found.lines().size(), title, artist);
            });
        });
    }

    /** Best guess at "Artist - Title" for the current source. */
    private String rawName() {
        if ("URL".equals(source.get())) {
            String link = url.get().trim();
            int slash = link.lastIndexOf('/');
            String tail = slash >= 0 ? link.substring(slash + 1) : link;
            return clean(tail.replaceAll("\\.[a-zA-Z0-9]{2,4}$", ""));
        }
        if ("Local Files".equals(source.get())) {
            List<Path> files = localFiles();
            if (!files.isEmpty()) {
                String name = files.get(Math.min(folderIndex, files.size()) - 1).getFileName().toString();
                return clean(name.replaceAll("\\.[a-zA-Z0-9]{2,4}$", ""));
            }
            return "";
        }
        if ("My Folder".equals(source.get())) {
            List<Path> files = folderTracks();
            if (!files.isEmpty()) {
                String name = files.get(Math.min(folderIndex, files.size()) - 1).getFileName().toString();
                return clean(name.replaceAll("\\.[a-zA-Z0-9]{2,4}$", ""));
            }
            return "";
        }
        for (String[] entry : BUILT_IN) {
            if (entry[0].equals(track.get())) {
                return entry[0];
            }
        }
        return "";
    }

    private static String clean(String value) {
        return value.replace('_', ' ').replace('+', ' ').replace("%20", " ").trim();
    }

    private void stopPlayback() {
        if (playing != null) {
            MinecraftClient client = MinecraftClient.getInstance();
            if (client.getSoundManager() != null) {
                client.getSoundManager().stop(playing);
            }
            playing = null;
        }
        playingKey = "";
    }

    private float volumeFraction() {
        return (float) (volume.get() / 100.0) * 0.6f;
    }

    // ── local files (served over loopback) ──────────────────────────────
    /**
     * Files for the {@code Local Files} source: the {@code Playlist} box when it has entries,
     * otherwise everything supported in {@code config/orbit/music}.
     */
    private List<Path> localFiles() {
        List<Path> files = new ArrayList<>();
        for (String entry : playlist.get().split("[;\n\r]")) {
            String trimmed = entry.trim();
            if (trimmed.isEmpty()) {
                continue;
            }
            if (trimmed.startsWith("~")) {
                trimmed = System.getProperty("user.home") + trimmed.substring(1);
            }
            Path candidate = trimmed.contains("/") || trimmed.contains("\\")
                    ? Path.of(trimmed)
                    : folder().resolve(trimmed);
            if (Files.isReadable(candidate) && supported(candidate)) {
                files.add(candidate);
            } else {
                Orbit.LOGGER.warn("Music: skipping unreadable playlist entry {}", trimmed);
            }
        }
        if (files.isEmpty()) {
            for (Path path : folderTracks()) {
                if (supported(path)) {
                    files.add(path);
                }
            }
        }
        return files;
    }

    private static boolean supported(Path path) {
        String name = path.getFileName().toString().toLowerCase();
        return name.endsWith(".mp3") || name.endsWith(".ogg") || name.endsWith(".oga")
                || name.endsWith(".wav") || name.endsWith(".m4a");
    }

    /** Keeps the loopback server's playlist in sync with what the player wants. */
    private String serveLocal(int index) {
        LocalAudioServer server = LocalAudioServer.get();
        if (!server.start()) {
            Orbit.LOGGER.error("Music: could not start the local audio server");
            return null;
        }
        List<Path> files = localFiles();
        if (files.isEmpty()) {
            Orbit.LOGGER.warn("Music: no playable files in the playlist or config/orbit/music");
            return null;
        }
        // the index comes from Next/Previous, which run before the list is known
        folderIndex = Math.floorMod(index, files.size()) + 1;
        server.setTracks(files);
        String url = server.urlFor(folderIndex - 1);
        if (url != null) {
            // visible in the GUI, and it is the same address HttpAudioStream consumes
            this.url.set(url);
        }
        return url;
    }

    // ── folder scanning ─────────────────────────────────────────────────
    public static Path folder() {
        return MinecraftClient.getInstance().runDirectory.toPath().resolve("config/orbit/music");
    }

    private static List<Path> folderTracks() {
        Path dir = folder();
        List<Path> files = new ArrayList<>();
        try {
            if (!Files.isDirectory(dir)) {
                Files.createDirectories(dir);
                return files;
            }
            try (var stream = Files.list(dir)) {
                stream.filter(p -> p.getFileName().toString().toLowerCase().endsWith(".ogg"))
                        .sorted(Comparator.comparing(p -> p.getFileName().toString().toLowerCase()))
                        .forEach(files::add);
            }
        } catch (Throwable t) {
            Orbit.LOGGER.warn("Music: could not read {}", dir, t);
        }
        return files;
    }

    private static String sanitise(String name) {
        return name.toLowerCase().replaceAll("[^a-z0-9]+", "_");
    }
}
