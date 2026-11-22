package dev.orbit.client.gui;

import java.util.List;

/** Tests wrapping and hit-box geometry for long lists such as the Custom Sky selector. */
public final class InspectorModeLayoutSelfTest {
    public static void main(String[] args) {
        InspectorModeLayout.Result shortList = InspectorModeLayout.arrange(138, new int[] {20, 40, 30});
        check(shortList.height() == 13, "short mode lists stay on one row");
        check(shortList.cells().get(0).width() == 44 && shortList.cells().get(2).x() == 94,
                "three-option segmented controls retain their old sizing");

        int[] skyLabels = {82, 65, 60, 58, 34, 78, 34, 23, 50};
        InspectorModeLayout.Result sky = InspectorModeLayout.arrange(138, skyLabels);
        check(sky.cells().size() == 9 && sky.height() > 13, "all nine skies wrap into readable rows");
        for (InspectorModeLayout.Cell cell : sky.cells()) {
            check(cell.width() >= skyLabels[cell.index()] + 12, "sky label fits its clickable box");
        }
        verifyLayout(sky, 138, skyLabels.length);

        InspectorModeLayout.Result narrow = InspectorModeLayout.arrange(4, new int[] {5, 5, 5});
        verifyLayout(narrow, 4, 3);
        check(narrow.height() == 45, "even a very narrow inspector wraps without overlap");
        check(InspectorModeLayout.arrange(100, new int[0]).height() == 0, "empty options have no height");

        // The drawing code and the click regions use these same cells; verify bounds for varied lists.
        for (int width = 1; width <= 200; width++) {
            for (int count = 1; count <= 15; count++) {
                int[] labels = new int[count];
                for (int i = 0; i < count; i++) labels[i] = (i * 37 + width) % 180;
                verifyLayout(InspectorModeLayout.arrange(width, labels), width, count);
            }
        }
        System.out.println("InspectorModeLayoutSelfTest: all checks passed");
    }

    private static void verifyLayout(InspectorModeLayout.Result result, int width, int count) {
        List<InspectorModeLayout.Cell> cells = result.cells();
        check(cells.size() == count, "all options retained");
        for (int i = 0; i < cells.size(); i++) {
            InspectorModeLayout.Cell cell = cells.get(i);
            check(cell.index() == i, "choice index preserved");
            check(cell.x() >= 0 && cell.y() >= 0 && cell.width() > 0 && cell.x() + cell.width() <= width,
                    "choice remains within inspector bounds");
            check(cell.y() + 13 <= result.height(), "result includes the entire clickable row");
            if (i > 0) {
                InspectorModeLayout.Cell previous = cells.get(i - 1);
                check(cell.y() >= previous.y(), "rows remain ordered");
                if (cell.y() == previous.y()) {
                    check(cell.x() >= previous.x() + previous.width() + 3, "same-row boxes do not overlap");
                } else {
                    check(cell.y() >= previous.y() + 16, "new rows do not overlap");
                }
            }
        }
    }

    private static void check(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }
}
