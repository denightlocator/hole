package net.minecraft.text;

public record Text(String value) {
    public static Text literal(String value) { return new Text(value); }
}
