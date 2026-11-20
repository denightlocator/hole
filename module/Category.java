package dev.orbit.client.module;

/**
 * Categories shown in the ClickGUI rail, in display order.
 */
public enum Category {
    COMBAT("Combat"),
    MOVEMENT("Movement"),
    PERFORMANCE("Performance"),
    RENDER("Render"),
    PLAYER("Player"),
    MISC("Misc"),
    HUD("Hud");

    private final String displayName;

    Category(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
