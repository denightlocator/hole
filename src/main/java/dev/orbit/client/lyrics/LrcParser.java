package dev.orbit.client.lyrics;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Parses LRC lyrics into timed lines.
 *
 * <p>Deliberately free of Minecraft types so it can be unit tested standalone (see
 * {@code tools/LyricsSelfTest.java}).
 *
 * <p>Handles the things real LRC files actually contain: several timestamps on one line
 * ({@code [00:12.00][01:30.00] chorus}), {@code mm:ss}, {@code mm:ss.SS}, {@code mm:ss.SSS},
 * metadata tags ({@code [ar:]}, {@code [ti:]}), blank lines used as pauses, and word-level
 * timestamps of the Enhanced LRC form ({@code <00:12.50>}), which are stripped.
 */
public final class LrcParser {
    private static final Pattern TIMESTAMP =
            Pattern.compile("\\[(\\d{1,3}):(\\d{1,2})(?:[.:](\\d{1,3}))?]");
    private static final Pattern WORD_TIMESTAMP =
            Pattern.compile("<\\d{1,3}:\\d{1,2}(?:[.:]\\d{1,3})?>");

    private LrcParser() {
    }

    /** @return timed lines sorted by time, or an empty list when nothing parsed. */
    public static List<Line> parse(String lrc) {
        List<Line> lines = new ArrayList<>();
        if (lrc == null || lrc.isBlank()) {
            return lines;
        }

        for (String raw : lrc.split("\\R")) {
            String row = raw.trim();
            if (row.isEmpty()) {
                continue;
            }

            Matcher matcher = TIMESTAMP.matcher(row);
            List<Long> times = new ArrayList<>();
            int lastEnd = 0;
            while (matcher.find()) {
                long minutes = Long.parseLong(matcher.group(1));
                long seconds = Long.parseLong(matcher.group(2));
                String fraction = matcher.group(3);
                long millis = 0;
                if (fraction != null) {
                    // ".5" means 500 ms, ".05" 50 ms, ".005" 5 ms
                    millis = Long.parseLong(fraction) * (long) Math.pow(10, 3 - fraction.length());
                }
                times.add(minutes * 60_000 + seconds * 1_000 + millis);
                lastEnd = matcher.end();
            }
            if (times.isEmpty()) {
                continue;   // metadata tags like [ar:...]
            }

            String text = WORD_TIMESTAMP.matcher(row.substring(lastEnd)).replaceAll("").trim();
            for (long time : times) {
                lines.add(new Line(time, text));
            }
        }

        lines.sort(Comparator.comparingLong(Line::millis));
        return lines;
    }

    /**
     * @return the line that should be highlighted at {@code positionMs}, or {@code null} before the
     *         first line starts. Blank lines (LRC pauses) still count, so the previous line clears.
     */
    public static Line activeAt(List<Line> lines, long positionMs) {
        if (lines == null || lines.isEmpty()) {
            return null;
        }
        Line active = null;
        for (Line line : lines) {
            if (line.millis() > positionMs) {
                break;
            }
            active = line;
        }
        if (active != null && active.text().isEmpty()) {
            return null;   // instrumental gap
        }
        return active;
    }

    /** One lyric line. */
    public record Line(long millis, String text) {
        public long seconds() {
            return millis / 1000;
        }

        /** {@code m:ss} for display. */
        public String timestamp() {
            return (millis / 60_000) + ":" + String.format("%02d", (millis / 1_000) % 60);
        }
    }
}
