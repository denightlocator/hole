package dev.orbit.client.module.impl.render;

import dev.orbit.client.gui.Theme;
import dev.orbit.client.module.Category;
import dev.orbit.client.module.Module;
import dev.orbit.client.module.setting.BoolSetting;
import dev.orbit.client.module.setting.ModeSetting;
import dev.orbit.client.module.setting.NumberSetting;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.util.math.MathHelper;

/**
 * Custom crosshair.
 *
 * <p>Vanilla's crosshair is cancelled in {@code InGameHudMixin} and drawn here instead, centred on
 * the screen. Note the attack indicator is drawn inside the same vanilla method, so it goes with it -
 * that is a real cost of replacing the crosshair, not an oversight.
 */
public class Crosshair extends Module {
    private final ModeSetting style = addSetting(new ModeSetting("Style", "Cross + Dot",
            "Cross", "Dot", "Circle", "Cross + Dot"));
    private final NumberSetting size = addSetting(new NumberSetting("Size", 8, 2, 20, 1, " px"));
    private final NumberSetting gap = addSetting(new NumberSetting("Gap", 2, 0, 8, 1, " px"));
    private final NumberSetting thickness = addSetting(new NumberSetting("Thickness", 1, 1, 3, 1, " px"));
    private final BoolSetting useTheme = addSetting(new BoolSetting("Theme Colour", true));
    private final NumberSetting opacity = addSetting(new NumberSetting("Opacity", 100, 20, 100, 5, "%"));

    public Crosshair() {
        super("Crosshair", "Replaces the vanilla crosshair.", Category.RENDER);
    }

    /** Draws the crosshair centred in the given context. */
    public void render(DrawContext context, int screenWidth, int screenHeight) {
        int centreX = screenWidth / 2;
        int centreY = screenHeight / 2;
        int colour = colour();

        String mode = style.get();
        boolean drawCross = mode.startsWith("Cross");
        boolean drawDot = mode.contains("Dot");
        boolean drawCircle = mode.equals("Circle");

        int arm = (int) size.get();
        int inner = (int) gap.get();
        int thick = (int) thickness.get();
        int half = thick / 2;

        if (drawCross) {
            // four arms around the centre, leaving the gap empty
            context.fill(centreX - inner - arm, centreY - half, centreX - inner, centreY - half + thick, colour);
            context.fill(centreX + inner, centreY - half, centreX + inner + arm, centreY - half + thick, colour);
            context.fill(centreX - half, centreY - inner - arm, centreX - half + thick, centreY - inner, colour);
            context.fill(centreX - half, centreY + inner, centreX - half + thick, centreY + inner + arm, colour);
        }

        if (drawDot) {
            int dotSize = Math.max(1, thick);
            context.fill(centreX - dotSize / 2, centreY - dotSize / 2,
                    centreX - dotSize / 2 + dotSize, centreY - dotSize / 2 + dotSize, colour);
        }

        if (drawCircle) {
            drawRing(context, centreX, centreY, arm, colour);
        }
    }

    /** Midpoint circle: one quad per ring pixel, cheap at these radii. */
    private void drawRing(DrawContext context, int centreX, int centreY, int radius, int colour) {
        if (radius < 2) {
            context.fill(centreX, centreY, centreX + 1, centreY + 1, colour);
            return;
        }
        int x = radius;
        int y = 0;
        int error = 1 - radius;

        while (x >= y) {
            plot(context, centreX, centreY, x, y, colour);
            plot(context, centreX, centreY, y, x, colour);
            y++;
            if (error < 0) {
                error += 2 * y + 1;
            } else {
                x--;
                error += 2 * (y - x) + 1;
            }
        }
    }

    private void plot(DrawContext context, int centreX, int centreY, int x, int y, int colour) {
        context.fill(centreX + x, centreY + y, centreX + x + 1, centreY + y + 1, colour);
        context.fill(centreX - x, centreY + y, centreX - x + 1, centreY + y + 1, colour);
        context.fill(centreX + x, centreY - y, centreX + x + 1, centreY - y + 1, colour);
        context.fill(centreX - x, centreY - y, centreX - x + 1, centreY - y + 1, colour);
        context.fill(centreX + y, centreY + x, centreX + y + 1, centreY + x + 1, colour);
        context.fill(centreX - y, centreY + x, centreX - y + 1, centreY + x + 1, colour);
        context.fill(centreX + y, centreY - x, centreX + y + 1, centreY - x + 1, colour);
        context.fill(centreX - y, centreY - x, centreX - y + 1, centreY - x + 1, colour);
    }

    private int colour() {
        int alpha = MathHelper.clamp((int) (opacity.get() / 100.0 * 255.0), 0, 255);
        int rgb = useTheme.get() ? (Theme.accent() & 0xFFFFFF) : 0xFFFFFF;
        return (alpha << 24) | rgb;
    }
}
