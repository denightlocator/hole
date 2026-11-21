package dev.orbit.client.module.impl.misc;

import dev.orbit.client.module.Category;
import dev.orbit.client.module.Module;
import dev.orbit.client.module.setting.BoolSetting;
import dev.orbit.client.module.setting.NumberSetting;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * Chat timestamps and duplicate collapsing.
 *
 * <p>Both are applied in {@code ChatHudMixin}, which is the single point every chat line passes
 * through - server chat, system messages and /commands alike.
 */
public class ChatTweaks extends Module {
    private static final DateTimeFormatter HHMM = DateTimeFormatter.ofPattern("HH:mm", Locale.ROOT);
    private static final DateTimeFormatter HHMMSS = DateTimeFormatter.ofPattern("HH:mm:ss", Locale.ROOT);

    private final BoolSetting timestamps = addSetting(new BoolSetting("Timestamps", true));
    private final BoolSetting seconds = addSetting(new BoolSetting("Show Seconds", false));
    private final BoolSetting antiSpam = addSetting(new BoolSetting("Anti Spam", true));
    private final NumberSetting window = addSetting(new NumberSetting("Window", 3, 1, 30, 1, "s"));
    private final BoolSetting repeatCount = addSetting(new BoolSetting("Repeat Count", true));

    // ── duplicate tracking, owned by the mixin ─────────────────────────
    private String lastText = "";
    private long lastMillis;
    private int repeats;

    public ChatTweaks() {
        super("Chat Tweaks", "Timestamps and duplicate message collapsing.", Category.MISC);
    }

    public boolean addsTimestamps() {
        return isEnabled() && timestamps.get();
    }

    public String prefix() {
        return "[" + LocalTime.now().format(seconds.get() ? HHMMSS : HHMM) + "] ";
    }

    public boolean collapsesDuplicates() {
        return isEnabled() && antiSpam.get();
    }

    public long windowMillis() {
        return (long) (window.get() * 1000);
    }

    public boolean showsRepeatCount() {
        return repeatCount.get();
    }

    /**
     * @return true when the line is a duplicate and should not be added
     */
    public boolean isDuplicate(String text) {
        long now = System.currentTimeMillis();
        if (text.equals(lastText) && now - lastMillis <= windowMillis()) {
            repeats++;
            lastMillis = now;
            return true;
        }
        lastText = text;
        lastMillis = now;
        repeats = 1;
        return false;
    }

    /** How many times the current run has repeated, including the first. */
    public int repeatCountValue() {
        return repeats;
    }

    public void resetCount() {
        repeats = 0;
        lastText = "";
    }
}
