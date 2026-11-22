package dev.orbit.client.hud;

import dev.orbit.client.gui.Rounded;
import dev.orbit.client.gui.Theme;
import dev.orbit.client.lyrics.LrcParser;
import dev.orbit.client.module.ModuleRegistry;
import dev.orbit.client.module.impl.misc.MusicModule;
import net.fabricmc.fabric.api.client.rendering.v1.hud.HudElement;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.font.TextRenderer;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.render.RenderTickCounter;

/**
 * Now-playing overlay: title, artist, progress, and the current lyric line.
 *
 * <p>Two pieces, deliberately apart:
 * <ul>
 *   <li>a compact card in the top left, mirroring the GUI's rounded panel style;</li>
 *   <li>the active lyric line centred just above the hotbar, where it reads without covering the
 *       crosshair or the hotbar itself.</li>
 * </ul>
 *
 * <p>Everything is looked up from {@link MusicModule} each frame, including the playback position,
 * so lyrics stay in sync without this class owning any timing state.
 */
public class MusicHud implements HudElement {
    private static final int CARD_WIDTH = 168;
    private static final int MARGIN = 8;

    @Override
    public void render(DrawContext context, RenderTickCounter tickCounter) {
        MinecraftClient client = MinecraftClient.getInstance();
        if (client.player == null || client.options.hudHidden) {
            return;
        }
        MusicModule music = ModuleRegistry.get(MusicModule.class).orElse(null);
        if (music == null || !music.isEnabled() || !music.showsHud()) {
            return;
        }
        if (!music.isPlaying() && !music.isPaused()) {
            return;
        }

        TextRenderer font = client.textRenderer;
        drawCard(context, font, music);
        drawLyric(context, font, music, client);
    }

    private void drawCard(DrawContext context, TextRenderer font, MusicModule music) {
        String title = music.getTitle().isBlank() ? "Unknown track" : music.getTitle();
        String artist = music.getArtist().isBlank() ? "" : music.getArtist();
        String state = music.isPaused() ? "paused" : "playing";
        String time = formatTime(music.positionMs());

        int height = artist.isEmpty() ? 34 : 46;
        int x = MARGIN;
        int y = MARGIN;

        Rounded.panel(context, x, y, CARD_WIDTH, height, 8,
                Theme.alpha(0xFF12141F, 0xC0), Theme.alpha(0xFF0A0B12, 0xC0),
                Theme.alpha(Theme.accent(), 0x33));

        // accent tick, same language as the GUI's selected row
        Rounded.fill(context, x + 6, y + 7, 2, height - 14, 1, Theme.accent());

        String clipped = font.trimToWidth(title, CARD_WIDTH - 30);
        context.drawText(font, clipped, x + 13, y + 6, Theme.text(), false);
        if (!artist.isEmpty()) {
            context.drawText(font, font.trimToWidth(artist, CARD_WIDTH - 30), x + 13, y + 17,
                    Theme.textMuted(), false);
        }

        int barY = y + height - 12;
        int barWidth = CARD_WIDTH - 20;
        Rounded.fill(context, x + 10, barY, barWidth, 2, 1, Theme.alpha(0xFFFFFFFF, 0x22));
        // the track length is unknown for a radio stream, so the fill loops over 3 minutes
        long position = music.positionMs();
        float progress = (position % 180_000L) / 180_000f;
        Rounded.fill(context, x + 10, barY, (int) (barWidth * progress), 2, 1, Theme.accent());

        context.drawText(font, state, x + 10, y + height - 10, Theme.textFaint(), false);
        String stamp = time;
        context.drawText(font, stamp, x + CARD_WIDTH - 10 - font.getWidth(stamp), y + height - 10,
                Theme.textFaint(), false);
    }

    private void drawLyric(DrawContext context, TextRenderer font, MusicModule music,
                           MinecraftClient client) {
        if (!music.lyricsEnabled()) {
            return;
        }

        String line;
        LrcParser.Line active = music.activeLyric();
        if (active != null) {
            line = active.text();
        } else if (music.lyricsLoading()) {
            line = "loading lyrics...";
        } else if (!music.hasLyrics()) {
            line = "no synced lyrics found";
        } else {
            return;   // instrumental gap: draw nothing
        }

        int centerX = context.getScaledWindowWidth() / 2;
        int y = context.getScaledWindowHeight() - 62;
        String clipped = font.trimToWidth(line, context.getScaledWindowWidth() - 80);
        int width = font.getWidth(clipped);

        // subtle backing so text stays readable over bright terrain
        Rounded.fill(context, centerX - width / 2 - 4, y - 2, width + 8, 12, 4,
                Theme.alpha(0xFF000000, 0x55));
        context.drawText(font, clipped, centerX - width / 2, y, 0xFFFFFFFF, true);
    }

    private static String formatTime(long millis) {
        long seconds = millis / 1000;
        return (seconds / 60) + ":" + String.format("%02d", seconds % 60);
    }
}
