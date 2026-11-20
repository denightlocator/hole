import dev.orbit.client.gui.RoundedSpans;

/**
 * Measures how many quads the rounded-rect helpers emit, before and after span merging.
 *
 * <pre>
 * cd tools/selftest
 * javac -d out ../../src/main/java/dev/orbit/client/gui/RoundedSpans.java SpanSelfTest.java
 * java -cp out SpanSelfTest
 * </pre>
 */
public class SpanSelfTest {
    public static void main(String[] args) {
        // the shapes one ClickGUI frame actually draws, from ClickGuiScreen
        int[][] shapes = {
                {420, 340, 13},   // root window
                {94, 340, 9},     // category rail
                {158, 320, 9},    // inspector panel
                {160, 22, 6},     // module card (x40)
                {150, 6, 2},      // slider track
                {26, 14, 5},      // toggle pill
        };

        int oldTotal = 0;
        int newTotal = 0;
        System.out.printf("%-22s %8s %8s%n", "shape", "old", "new");
        for (int[] s : shapes) {
            int w = s[0];
            int h = s[1];
            int r = s[2];
            int repeats = (w == 160 && h == 22) ? 40 : 1;

            // old: one quad per pixel row; new: merged spans, measured from the real code
            int oldQuads = h * repeats;
            int newQuads = RoundedSpans.rows(h, r).length * repeats;

            oldTotal += oldQuads;
            newTotal += newQuads;
            System.out.printf("%4dx%-3d r%-2d x%-3d %8d %8d%n", w, h, r, repeats, oldQuads, newQuads);
        }

        // 15 outlines: old = 2 fills per row on the body + edges
        int outlineOld = 15 * (340 * 2);
        int outlineNew = 15 * (RoundedSpans.rows(340, 9).length * 2);
        oldTotal += outlineOld;
        newTotal += outlineNew;

        // one horizontal gradient slider: old = width * height individual 1px fills
        int hGradOld = 150 * 6;
        int hGradNew = 48 * RoundedSpans.rows(6, 2).length;
        oldTotal += hGradOld;
        newTotal += hGradNew;

        // two shadows, 3 layers each, on a 420x340 window
        int shadowOld = 2 * 3 * 340;
        int shadowNew = 2 * 3 * RoundedSpans.rows(340, 9).length;
        oldTotal += shadowOld;
        newTotal += shadowNew;

        System.out.println();
        System.out.printf("horizontal gradient:  old %d  new %d%n", hGradOld, hGradNew);
        System.out.printf("15 outlines:          old %d  new %d%n", outlineOld, outlineNew);
        System.out.printf("2 shadows x3 layers:  old %d  new %d%n", shadowOld, shadowNew);
        System.out.println();
        System.out.printf("TOTAL QUADS PER FRAME: old %d   new %d   (%.1fx fewer)%n",
                oldTotal, newTotal, oldTotal / (double) newTotal);

        System.out.println();
        System.out.println("raster equality check (merged spans vs per-row):");
        boolean ok = true;
        for (int height = 1; height <= 400; height++) {
            for (int radius = 0; radius <= 20; radius++) {
                int[] expected = new int[height];
                int clamped = Math.min(radius, height / 2);
                for (int row = 0; row < height; row++) {
                    expected[row] = RoundedSpans.inset(row, height, clamped);
                }
                for (int[] span : RoundedSpans.rows(height, radius)) {
                    for (int row = span[0]; row < span[1]; row++) {
                        if (expected[row] != span[2]) {
                            ok = false;
                        }
                    }
                }
            }
        }
        System.out.println(ok ? "  ok   every span row matches the per-row inset" : "  FAIL spans diverge");
        if (!ok) {
            System.exit(1);
        }
    }
}
