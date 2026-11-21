package dev.orbit.client.mixin;

import dev.orbit.client.module.ModuleRegistry;
import dev.orbit.client.module.impl.misc.ChatTweaks;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.hud.ChatHud;
import net.minecraft.text.MutableText;
import net.minecraft.text.Text;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.ModifyVariable;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Chat timestamps and duplicate collapsing.
 *
 * <p>Every chat line - player chat, system messages, command output - ends up in
 * {@code ChatHud.addMessage(Text)}, so that is the one place worth touching.
 *
 * <p>Two injections rather than one: the timestamp is a change to the argument, which only
 * {@code @ModifyVariable} can do, and the duplicate check has to cancel the call, which only
 * {@code @Inject} can do.
 */
@Mixin(ChatHud.class)
public class ChatHudMixin {

    /** Set while we inject our own repeat summary, so it is never itself collapsed. */
    @Unique
    private boolean orbit$injectingSummary;

    @ModifyVariable(method = "addMessage(Lnet/minecraft/text/Text;)V", at = @At("HEAD"), argsOnly = true)
    private Text orbit$timestamp(Text message) {
        if (orbit$injectingSummary) {
            return message;
        }
        ChatTweaks tweaks = ModuleRegistry.get(ChatTweaks.class).orElse(null);
        if (tweaks == null || !tweaks.addsTimestamps()) {
            return message;
        }
        MutableText prefix = Text.literal(tweaks.prefix()).formatted(net.minecraft.util.Formatting.DARK_GRAY);
        return prefix.append(message);
    }

    @Inject(method = "addMessage(Lnet/minecraft/text/Text;)V", at = @At("HEAD"), cancellable = true)
    private void orbit$collapseDuplicates(Text message, CallbackInfo info) {
        if (orbit$injectingSummary) {
            return;
        }
        ChatTweaks tweaks = ModuleRegistry.get(ChatTweaks.class).orElse(null);
        if (tweaks == null || !tweaks.collapsesDuplicates()) {
            return;
        }

        // compare without the timestamp we just added, so a run that spans a minute still collapses
        String plain = message.getString();
        String key = plain.replaceFirst("^\\[\\d{2}:\\d{2}(:\\d{2})?] ", "");

        if (!tweaks.isDuplicate(key)) {
            return;
        }
        info.cancel();

        // every few repeats, say so once instead of leaving the player wondering why nothing appears
        if (tweaks.showsRepeatCount() && tweaks.repeatCountValue() % 4 == 0) {
            int count = tweaks.repeatCountValue();
            orbit$injectingSummary = true;
            try {
                MinecraftClient.getInstance().execute(() -> {
                    MinecraftClient client = MinecraftClient.getInstance();
                    if (client.inGameHud != null) {
                        client.inGameHud.getChatHud().addMessage(Text.literal("  ↑ repeated " + count + "x")
                                .formatted(net.minecraft.util.Formatting.DARK_GRAY));
                    }
                });
            } finally {
                // the message is queued, not sent yet; clear on the next tick
                MinecraftClient.getInstance().execute(() -> orbit$injectingSummary = false);
            }
        }
    }
}
