package dev.orbit.client.gui;

/** Tests that the inspector's render and hit-test bounds reserve the pinned keybind row. */
public final class InspectorViewportSelfTest {
    public static void main(String[] args) {
        int left = 100, right = 256, top = 40, bottom = 240;
        check(InspectorViewport.top(top) == 42, "top inset");
        check(InspectorViewport.bottom(bottom) == 220, "keybind row reserved");
        check(InspectorViewport.contains(100, 42, left, right, top, bottom), "top-left inside");
        check(InspectorViewport.contains(255, 219.5, left, right, top, bottom), "bottom-right inside");
        check(!InspectorViewport.contains(99.9, 100, left, right, top, bottom), "left clipped");
        check(!InspectorViewport.contains(256, 100, left, right, top, bottom), "right clipped");
        check(!InspectorViewport.contains(120, 41.9, left, right, top, bottom), "title area clipped");
        check(!InspectorViewport.contains(120, 220, left, right, top, bottom), "keybind area clipped");
        System.out.println("InspectorViewportSelfTest: all checks passed");
    }

    private static void check(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }
}
