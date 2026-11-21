package dev.orbit.client.lyrics;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Fetches time-synced lyrics from LRCLIB (lrclib.net), a free public API with no key or account.
 *
 * <p>Two endpoints are used, in order:
 * <ol>
 *   <li>{@code /api/get} - exact artist + track lookup. Fast path.</li>
 *   <li>{@code /api/search} - fuzzy list. Needed constantly in practice, because the same song has
 *       a dozen entries: sped up, remix, cover, "feat." variants. Results are scored here and the
 *       best match wins.</li>
 * </ol>
 *
 * <p>Matching is the hard part, so {@link #score} normalises hard: case, diacritics, punctuation,
 * bracketed suffixes such as {@code (Remastered 2003)}, {@code [Sped Up]}, {@code - Single},
 * {@code feat. X}, and the word {@code the}. So "All the Things She Said", "All The Things She
 * Said (Sped Up)" and "t.A.T.u. - All The Things She Said" all resolve to the same song.
 *
 * <p>No Minecraft types, so this can be tested standalone.
 */
public final class LyricsClient {
    private static final String BASE = "https://lrclib.net/api";
    private static final Pattern BRACKETS = Pattern.compile("\\([^)]*\\)|\\[[^]]*]");
    private static final Pattern SUFFIX = Pattern.compile("\\s-\\s.*$");
    private static final Pattern FEAT = Pattern.compile("\\s(feat|ft|featuring)\\.?\\s.*$");
    private static final Pattern NON_ALNUM = Pattern.compile("[^a-z0-9 ]");

    private static final boolean DEBUG = Boolean.getBoolean("orbit.lyrics.debug");

    private static final HttpClient HTTP = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(8))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    private LyricsClient() {
    }

    /** A resolved lyric sheet. */
    public record Result(String track, String artist, double durationSeconds,
                         List<LrcParser.Line> lines, boolean synced) {
        public boolean isEmpty() {
            return lines.isEmpty();
        }
    }

    /** Looks up synced lyrics. Never throws; returns empty on any failure. */
    public static CompletableFuture<Optional<Result>> fetch(String track, String artist) {
        return CompletableFuture.supplyAsync(() -> {
            Optional<Result> exact = tryGet(track, artist);
            if (exact.isPresent()) {
                return exact;
            }
            return trySearch(track, artist);
        });
    }

    private static Optional<Result> tryGet(String track, String artist) {
        try {
            String url = BASE + "/get?artist_name=" + enc(artist) + "&track_name=" + enc(track);
            String body = get(url);
            if (body == null || body.isBlank() || body.contains("\"code\":404")) {
                return Optional.empty();
            }
            Result result = parseItem(body);
            if (DEBUG) {
                System.out.println("[lyrics] get parsed track=" + (result == null ? "null" : result.track())
                        + " synced=" + (result != null && result.synced())
                        + " lines=" + (result == null ? -1 : result.lines().size()));
            }
            return result != null && !result.isEmpty() ? Optional.of(result) : Optional.empty();
        } catch (Throwable t) {
            if (DEBUG) {
                System.out.println("[lyrics] get failed: " + t);
                t.printStackTrace();
            }
            return Optional.empty();
        }
    }

    private static Optional<Result> trySearch(String track, String artist) {
        try {
            String url = BASE + "/search?q=" + enc(track + " " + artist);
            String body = get(url);
            if (body == null || body.isBlank()) {
                return Optional.empty();
            }
            List<String> items = splitTopLevelObjects(body);
            List<Scored> scored = new ArrayList<>();
            for (String item : items) {
                Result result = parseItem(item);
                if (result == null || result.isEmpty() || !result.synced()) {
                    continue;
                }
                scored.add(new Scored(result, score(result, track, artist)));
            }
            scored.sort(Comparator.comparingDouble((Scored s) -> s.score).reversed());
            if (scored.isEmpty()) {
                return Optional.empty();
            }
            if (DEBUG) {
                for (Scored s2 : scored) {
                    System.out.println("[lyrics] cand " + s2.result.track() + " - " + s2.result.artist()
                            + " score=" + String.format("%.2f", s2.score) + " lines=" + s2.result.lines().size());
                }
            }
            Scored best = scored.get(0);
            // a weak winner is worse than nothing: the HUD would show someone else's song
            return best.score >= 0.45 ? Optional.of(best.result) : Optional.empty();
        } catch (Throwable t) {
            if (DEBUG) {
                System.out.println("[lyrics] search failed: " + t);
                t.printStackTrace();
            }
            return Optional.empty();
        }
    }

    private record Scored(Result result, double score) {
    }

    /** 0..1 similarity between a candidate entry and what the player asked for. */
    static double score(Result candidate, String wantedTrack, String wantedArtist) {
        String trackA = normalise(candidate.track());
        String trackB = normalise(wantedTrack);
        String artistA = normalise(candidate.artist());
        String artistB = normalise(wantedArtist);

        double trackScore = similarity(trackA, trackB);
        double artistScore = artistB.isEmpty() ? 0.5 : similarity(artistA, artistB);

        double score = trackScore * 0.65 + artistScore * 0.35;

        // penalise the derivative versions that dominate search results
        String haystack = candidate.track().toLowerCase(Locale.ROOT);
        if (haystack.contains("sped up") || haystack.contains("nightcore")
                || haystack.contains("remix") || haystack.contains("karaoke")) {
            score -= 0.25;
        }
        return Math.max(0.0, Math.min(1.0, score));
    }

    /** Strips everything that differs between releases of the same song. */
    static String normalise(String value) {
        if (value == null) {
            return "";
        }
        String s = value.toLowerCase(Locale.ROOT);
        s = BRACKETS.matcher(s).replaceAll(" ");
        s = SUFFIX.matcher(s).replaceAll(" ");
        s = FEAT.matcher(s).replaceAll(" ");
        s = s.replace('&', ' ').replace('+', ' ');
        s = NON_ALNUM.matcher(s).replaceAll(" ");
        s = s.replaceAll("\\bthe\\b", " ");
        // rejoin spaced single letters so "t a t u" and "tatu" agree
        s = s.replaceAll("\\b([a-z])\\s+(?=[a-z]\\b)", "$1");
        return s.replaceAll("\\s+", " ").trim();
    }

    /** Token-overlap (Jaccard-ish) with a substring fallback; tolerant of extra words. */
    static double similarity(String a, String b) {
        if (a.isEmpty() || b.isEmpty()) {
            return 0.0;
        }
        if (a.equals(b)) {
            return 1.0;
        }
        if (a.contains(b) || b.contains(a)) {
            return 0.9;
        }
        String[] left = a.split(" ");
        String[] right = b.split(" ");
        int shared = 0;
        boolean[] used = new boolean[right.length];
        for (String token : left) {
            if (token.length() <= 1) {
                continue;
            }
            for (int i = 0; i < right.length; i++) {
                if (!used[i] && right[i].equals(token)) {
                    used[i] = true;
                    shared++;
                    break;
                }
            }
        }
        double coverage = (double) shared / Math.max(1, Math.max(left.length, right.length));
        // "tatu" vs "tatu" style near matches: compare collapsed strings too
        double collapsed = a.replace(" ", "").equals(b.replace(" ", "")) ? 1.0 : 0.0;
        return Math.max(coverage, collapsed);
    }

    // ── tiny JSON handling ──────────────────────────────────────────────
    // Deliberately not a full parser: the response shape is small and fixed.

    private static Result parseItem(String json) {
        String track = str(json, "trackName");
        String artist = str(json, "artistName");
        String synced = str(json, "syncedLyrics");
        double duration = num(json, "duration");

        if (track == null || synced == null || synced.isBlank()) {
            // no time-synced version: plainLyrics cannot drive a synced HUD
            return new Result(track, artist, duration, List.of(), false);
        }
        List<LrcParser.Line> lines = LrcParser.parse(synced.replace("\\n", "\n"));
        return new Result(track, artist, duration, lines, !lines.isEmpty());
    }

    /**
     * Reads a JSON string value without a regex.
     *
     * <p>This deliberately does not use a pattern: {@code "key"\s*:\s*"((?:[^"\\]|\\.)*)"} is
     * catastrophic on long values and overflows the stack on a 3 KB lyric sheet (found by the
     * self-test against the live API). A plain scanner is linear and cannot blow up.
     */
    private static String str(String json, String key) {
        int cursor = valueStart(json, key);
        if (cursor < 0 || cursor >= json.length() || json.charAt(cursor) != '"') {
            return null;
        }
        cursor++;
        StringBuilder out = new StringBuilder(256);
        while (cursor < json.length()) {
            char c = json.charAt(cursor);
            if (c == '\\') {
                cursor++;
                if (cursor >= json.length()) {
                    break;
                }
                char escape = json.charAt(cursor);
                switch (escape) {
                    case 'n' -> out.append('\n');
                    case 'r' -> out.append('\r');
                    case 't' -> out.append('\t');
                    case 'b' -> out.append('\b');
                    case 'f' -> out.append('\f');
                    case 'u' -> {
                        if (cursor + 4 < json.length()) {
                            try {
                                out.append((char) Integer.parseInt(json.substring(cursor + 1, cursor + 5), 16));
                                cursor += 4;
                            } catch (NumberFormatException ignored) {
                                // leave the escape out rather than corrupting the line
                            }
                        }
                    }
                    default -> out.append(escape);
                }
            } else if (c == '"') {
                break;
            } else {
                out.append(c);
            }
            cursor++;
        }
        return out.toString();
    }

    private static double num(String json, String key) {
        int cursor = valueStart(json, key);
        if (cursor < 0) {
            return 0.0;
        }
        int end = cursor;
        while (end < json.length() && "-+.0123456789eE".indexOf(json.charAt(end)) >= 0) {
            end++;
        }
        try {
            return Double.parseDouble(json.substring(cursor, end));
        } catch (NumberFormatException e) {
            return 0.0;
        }
    }

    /** Index of the first character of {@code key}'s value, or -1. */
    private static int valueStart(String json, String key) {
        String needle = "\"" + key + "\"";
        int at = json.indexOf(needle);
        if (at < 0) {
            return -1;
        }
        int cursor = at + needle.length();
        while (cursor < json.length() && Character.isWhitespace(json.charAt(cursor))) {
            cursor++;
        }
        if (cursor < json.length() && json.charAt(cursor) == ':') {
            cursor++;
        }
        while (cursor < json.length() && Character.isWhitespace(json.charAt(cursor))) {
            cursor++;
        }
        return cursor;
    }

    /** Splits a JSON array of objects into the individual object strings. */
    private static List<String> splitTopLevelObjects(String json) {
        List<String> out = new ArrayList<>();
        int depth = 0;
        int start = -1;
        boolean inString = false;
        for (int i = 0; i < json.length(); i++) {
            char c = json.charAt(i);
            if (c == '"' && (i == 0 || json.charAt(i - 1) != '\\')) {
                inString = !inString;
            }
            if (inString) {
                continue;
            }
            if (c == '{') {
                if (depth == 0) {
                    start = i;
                }
                depth++;
            } else if (c == '}') {
                depth--;
                if (depth == 0 && start >= 0) {
                    out.add(json.substring(start, i + 1));
                    start = -1;
                }
            }
        }
        return out;
    }

    private static String get(String url) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofSeconds(10))
                .header("User-Agent", "OrbitClient/0.1.0 (https://github.com/orbit-client)")
                .GET()
                .build();
        HttpResponse<String> response = HTTP.send(request, HttpResponse.BodyHandlers.ofString());
        if (DEBUG) {
            System.out.println("[lyrics] " + response.statusCode() + " " + url
                    + " -> " + response.body().substring(0, Math.min(160, response.body().length())));
        }
        return response.statusCode() == 200 ? response.body() : null;
    }

    private static String enc(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
    }
}
