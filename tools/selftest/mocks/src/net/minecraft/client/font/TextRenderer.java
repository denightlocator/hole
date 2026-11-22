package net.minecraft.client.font;

import java.util.ArrayList;
import java.util.List;
import net.minecraft.client.render.VertexConsumerProvider;
import org.joml.Matrix4f;

public class TextRenderer {
    public final List<String> labels = new ArrayList<>();
    public final List<Integer> colors = new ArrayList<>();
    public enum TextLayerType { NORMAL }
    public int getWidth(String text) { return text.length() * 6; }
    public void draw(String text, float x, float y, int color, boolean shadow, Matrix4f matrix,
                     VertexConsumerProvider consumers, TextLayerType layer, int background, int light) {
        labels.add(text);
        colors.add(color);
    }
}
