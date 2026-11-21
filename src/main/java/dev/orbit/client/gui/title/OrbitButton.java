package dev.orbit.client.gui.title;

import dev.orbit.client.gui.Rounded;
import dev.orbit.client.gui.Theme;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.Click;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.widget.ClickableWidget;
import net.minecraft.text.Text;

/**
 * Orbit's title screen button: still a real widget (focus, narration, keyboard navigation and the
 * vanilla click sound all work), only the drawing is ours.
 */
public class OrbitButton extends ClickableWidget {
    private final Runnable action;
    private final boolean primary;

    public OrbitButton(int x, int y, int width, int height, String label, Runnable action, boolean primary) {
        super(x, y, width, height, Text.literal(label));
        this.action = action;
        this.primary = primary;
    }

    @Override
    protected void renderWidget(DrawContext context, int mouseX, int mouseY, float deltaTicks) {
        boolean hovered = isHovered();
        int accent = Theme.accent();

        if (primary) {
            Rounded.fillGradient(context, getX(), getY(), width, height, 5,
                    Theme.alpha(accent, hovered ? 0x5A : 0x40), Theme.alpha(accent, hovered ? 0x26 : 0x14));
            Rounded.outline(context, getX(), getY(), width, height, 5, Theme.alpha(accent, hovered ? 0xCC : 0x88));
        } else {
            Rounded.fill(context, getX(), getY(), width, height, 5,
                    hovered ? Theme.alpha(accent, 0x2A) : 0x2EFFFFFF);
            Rounded.outline(context, getX(), getY(), width, height, 5,
                    hovered ? Theme.alpha(accent, 0x99) : 0x38FFFFFF);
        }

        // accent tick on the left edge
        Rounded.fill(context, getX() + 3, getY() + (height - 7) / 2, 1, 7, 0,
                hovered || primary ? accent : Theme.textFaint());

        var font = MinecraftClient.getInstance().textRenderer;
        context.drawText(font, getMessage().getString(), getX() + 10,
                getY() + (height - font.fontHeight) / 2 + 1,
                hovered ? Theme.text() : 0xFFE4E1EC, false);
    }

    @Override
    public void onClick(Click click, boolean doubled) {
        playClickSound(MinecraftClient.getInstance().getSoundManager());
        action.run();
    }

    @Override
    protected void appendClickableNarrations(net.minecraft.client.gui.screen.narration.NarrationMessageBuilder builder) {
        builder.put(net.minecraft.client.gui.screen.narration.NarrationPart.TITLE, getMessage());
    }
}
