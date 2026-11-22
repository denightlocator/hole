package dev.orbit.client.gui;

import net.minecraft.client.gui.DrawContext;

/**
 * Small pixel icons for the category rail.
 */
public final class OrbitThemeIcons {
    private static final String[] COMBAT = {
            "......##", ".....##.", "....##..", "...#.#..",
            "..#.#...", ".#.#....", "#.......", "........"
    };
    private static final String[] MOVEMENT = {
            "........", "...#....", "....#...", "#######.",
            "#######.", "....#...", "...#....", "........"
    };
    private static final String[] RENDER = {
            "...##...", "........", "#..##..#", "..####..",
            "..####..", "#..##..#", "........", "...##..."
    };
    private static final String[] PLAYER = {
            "..####..", "..####..", "........", ".######.",
            "########", "########", "........", "........"
    };
    private static final String[] MISC = {
            "........", "######..", "........", "####....",
            "........", "######..", "........", "........"
    };
    private static final String[] HUD = {
            "########", "#......#", "#......#", "########",
            "...##...", "..####..", "........", "........"
    };
    private static final String[] SEARCH = {
            "..###...", ".#...#..", "#.....#.", "#.....#.",
            ".#...#..", "..###.#.", "......##", ".......#"
    };

    private static final String[][] CATEGORY_ICONS = {COMBAT, MOVEMENT, RENDER, PLAYER, MISC, HUD};

    private OrbitThemeIcons() {
    }

    public static void draw(DrawContext context, int categoryIndex, int x, int y, int color) {
        drawPattern(context, CATEGORY_ICONS[Math.max(0, Math.min(CATEGORY_ICONS.length - 1, categoryIndex))],
                x, y, color);
    }

    public static void drawSearch(DrawContext context, int x, int y, int color) {
        drawPattern(context, SEARCH, x, y, color);
    }

    private static void drawPattern(DrawContext context, String[] pattern, int x, int y, int color) {
        for (int row = 0; row < pattern.length; row++) {
            String line = pattern[row];
            for (int col = 0; col < line.length(); col++) {
                if (line.charAt(col) != '.') {
                    context.fill(x + col, y + row, x + col + 1, y + row + 1, color);
                }
            }
        }
    }
}
