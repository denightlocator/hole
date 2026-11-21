package dev.orbit.client.module.setting;

/**
 * Base setting. The GUI picks a widget based on the concrete subclass.
 */
public abstract class Setting<T> {
    private final String name;

    protected Setting(String name) {
        this.name = name;
    }

    public String getName() {
        return name;
    }

    public abstract T getValue();

    /** Right-hand side text in the inspector. */
    public abstract String displayValue();

    /** Click behaviour for toggles and modes. */
    public void onClick() {
    }
}
