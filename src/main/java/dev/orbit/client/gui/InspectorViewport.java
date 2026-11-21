package dev.orbit.client.gui;

/** Shared clipping bounds for the scrollable inspector; the keybind row stays outside them. */
final class InspectorViewport {
    private InspectorViewport() {
    }

    static int top(int inspectorTop) {
        return inspectorTop + 2;
    }

    static int bottom(int inspectorBottom) {
        return inspectorBottom - 20;
    }

    static boolean contains(double x, double y, int left, int right, int inspectorTop, int inspectorBottom) {
        return x >= left && x < right && y >= top(inspectorTop) && y < bottom(inspectorBottom);
    }
}
