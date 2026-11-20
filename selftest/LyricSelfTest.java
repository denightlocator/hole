import dev.orbit.client.lyrics.LrcParser;
import dev.orbit.client.lyrics.LyricsClient;

import java.util.List;
import java.util.Optional;

/**
 * Standalone check for the lyrics matcher against the live LRCLIB API.
 *
 * <pre>
 * cd tools/selftest
 * javac -d out ../../src/main/java/dev/orbit/client/lyrics/*.java LyricSelfTest.java
 * java -cp out LyricSelfTest
 * </pre>
 *
 * The lyrics classes deliberately have no Minecraft imports so they can be tested like this.
 */
public class LyricSelfTest {
    public static void main(String[] args) throws Exception {
        String[][] cases = {
                {"All the Things She Said", "t.A.T.u."},
                {"All The Things She Said (Sped Up)", "t.A.T.u"},
                {"all the things she said", "tatu"},
                {"All the Things She Said", ""},
                {"t.A.T.u. - All the Things She Said", ""},
                {"Bohemian Rhapsody", "Queen"},
        };

        for (String[] c : cases) {
            long t0 = System.currentTimeMillis();
            Optional<LyricsClient.Result> result = LyricsClient.fetch(c[0], c[1]).get();
            long ms = System.currentTimeMillis() - t0;
            if (result.isEmpty()) {
                System.out.println("MISS  " + c[0] + " / " + c[1] + "  (" + ms + "ms)");
                continue;
            }
            LyricsClient.Result res = result.get();
            System.out.println("HIT   " + c[0] + " / " + c[1] + "  ->  " + res.track() + " - "
                    + res.artist() + "  lines=" + res.lines().size() + "  (" + ms + "ms)");
            for (long at : new long[]{12_000L, 20_000L, 60_000L}) {
                LrcParser.Line line = LrcParser.activeAt(res.lines(), at);
                System.out.println("        @" + at / 1000 + "s: "
                        + (line == null ? "(instrumental)" : line.timestamp() + "  " + line.text()));
            }
        }

        String lrc = "[ar:t.A.T.u.]\n[00:11.91][01:00.00] chorus line\n[00:15.5] half-second\n"
                + "[00:16.123] millis\n<00:17.00>word synced\n[00:18.00]";
        List<LrcParser.Line> lines = LrcParser.parse(lrc);
        System.out.println("\nparser: " + lines.size() + " lines");
        for (LrcParser.Line line : lines) {
            System.out.println("   " + line.millis() + "ms [" + line.text() + "]");
        }
        System.out.println("active@17000 -> " + LrcParser.activeAt(lines, 17_000L));
    }
}
