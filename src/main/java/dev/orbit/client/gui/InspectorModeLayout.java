package dev.orbit.client.gui;

import java.util.ArrayList;
import java.util.List;

/** Positions mode choices in the inspector, wrapping long lists rather than crushing their labels. */
final class InspectorModeLayout {
    private static final int GAP = 3;
    private static final int HEIGHT = 13;
    private static final int ROW_STEP = 16;

    private InspectorModeLayout() {
    }

    record Cell(int index, int x, int y, int width) {
    }

    record Result(List<Cell> cells, int height) {
    }

    /** {@code labelWidths} are the font-measured widths, in the same units as {@code available}. */
    static Result arrange(int available, int[] labelWidths) {
        if (available < 1 || labelWidths == null) {
            throw new IllegalArgumentException("Invalid mode layout dimensions");
        }
        List<Cell> cells = new ArrayList<>();
        if (labelWidths.length == 0) {
            return new Result(List.of(), 0);
        }

        if (labelWidths.length <= 3 && available >= labelWidths.length + (labelWidths.length - 1) * GAP) {
            int segmentWidth = Math.max(1, (available - (labelWidths.length - 1) * GAP) / labelWidths.length);
            for (int i = 0; i < labelWidths.length; i++) {
                cells.add(new Cell(i, i * (segmentWidth + GAP), 0, segmentWidth));
            }
            return new Result(List.copyOf(cells), HEIGHT);
        }

        int x = 0;
        int y = 0;
        for (int i = 0; i < labelWidths.length; i++) {
            int cellWidth = (int) Math.min(available, Math.max(36L, Math.max(0L, labelWidths[i]) + 12L));
            if (x > 0 && x + cellWidth > available) {
                x = 0;
                y += ROW_STEP;
            }
            cells.add(new Cell(i, x, y, cellWidth));
            x += cellWidth + GAP;
        }
        return new Result(List.copyOf(cells), y + HEIGHT);
    }
}
