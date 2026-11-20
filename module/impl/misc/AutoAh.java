package dev.orbit.client.module.impl.misc;

import dev.orbit.client.Orbit;
import dev.orbit.client.module.Category;
import dev.orbit.client.module.Module;
import dev.orbit.client.module.setting.BoolSetting;
import dev.orbit.client.module.setting.NumberSetting;
import dev.orbit.client.module.setting.StringSetting;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.screen.ingame.HandledScreen;
import net.minecraft.client.network.ClientPlayerEntity;
import net.minecraft.component.DataComponentTypes;
import net.minecraft.component.type.LoreComponent;
import net.minecraft.item.ItemStack;
import net.minecraft.screen.ScreenHandler;
import net.minecraft.screen.slot.Slot;
import net.minecraft.screen.slot.SlotActionType;
import net.minecraft.text.Text;

import java.util.ArrayList;
import java.util.List;

/**
 * Auto AH - scans the auction house GUI for a target item, buys it under a price threshold, then
 * lists it again at a higher price, with delays, verification and a repeat loop.
 *
 * <h2>Safety rails (all deliberate)</h2>
 * <ul>
 *   <li><b>Dry Run</b> defaults to on: the whole cycle runs and reports what it <i>would</i> do,
 *       but no clicks are sent to the server until you turn it off.</li>
 *   <li>Nothing is clicked unless the open window's title matches the configured title filter, so
 *       the module cannot fire at a random chest.</li>
 *   <li>Only the container section of the handler is ever clicked - never the player inventory.</li>
 *   <li>Every action is spaced by {@code Action Delay} ticks plus jitter, with a hard cap on clicks
 *       per cycle.</li>
 *   <li>The item is counted in the inventory before and after buying, and again before selling.</li>
 *   <li>{@code Max Cycles} and {@code Stop On Error} bound the loop.</li>
 * </ul>
 *
 * <h2>Server specifics</h2>
 * Auction plugins differ: the price line, the confirm button and the sell flow all vary. The
 * settings below ({@code Open Command}, {@code Sell Command}, {@code Confirm Name}, {@code Currency},
 * {@code Price Hint}) exist so the module can be pointed at a given server's GUI/commands without
 * touching code. Everything that cannot be generalised is reported in chat instead of guessed.
 */
public class AutoAh extends Module {

    // ── config ──────────────────────────────────────────────────────────
    private final StringSetting itemTarget = addSetting(new StringSetting("Item", "diamond"));
    private final NumberSetting buyPrice = addSetting(new NumberSetting("Buy Price", 500, 0, 10_000_000, 1, ""));
    private final NumberSetting sellPrice = addSetting(new NumberSetting("Sell Price", 750, 0, 10_000_000, 1, ""));
    private final BoolSetting repeat = addSetting(new BoolSetting("Repeat", false));

    private final NumberSetting actionDelay = addSetting(new NumberSetting("Action Delay", 10, 4, 100, 1, "t"));
    private final NumberSetting scanTimeout = addSetting(new NumberSetting("Scan Timeout", 12, 2, 60, 1, "s"));
    private final NumberSetting maxCycles = addSetting(new NumberSetting("Max Cycles", 10, 1, 500, 1, ""));

    private final StringSetting openCommand = addSetting(new StringSetting("Open Command", "ah"));
    private final StringSetting searchCommand = addSetting(new StringSetting("Search Command", ""));
    private final StringSetting sellCommand = addSetting(new StringSetting("Sell Command", "ah sell {price}"));
    private final StringSetting windowTitle = addSetting(new StringSetting("Window Title", "auction"));
    private final StringSetting confirmName = addSetting(new StringSetting("Confirm Name", "confirm"));
    private final StringSetting currency = addSetting(new StringSetting("Currency", "$"));
    private final StringSetting priceHint = addSetting(new StringSetting("Price Hint", "price"));

    private final BoolSetting dryRun = addSetting(new BoolSetting("Dry Run", true));
    private final BoolSetting stopOnError = addSetting(new BoolSetting("Stop On Error", true));
    private final BoolSetting chatFeedback = addSetting(new BoolSetting("Chat Feedback", true));

    // ── runtime ─────────────────────────────────────────────────────────
    private enum State {
        IDLE, OPEN_AH, WAIT_FOR_AH, SCAN, BUY, WAIT_FOR_CONFIRM, CONFIRM_BUY, VERIFY_BUY,
        SELL, VERIFY_SELL, COOLDOWN, DONE
    }

    private State state = State.IDLE;
    private int delayCounter;
    private int stateTicks;
    private int cycle;
    private int clicksThisCycle;
    private int failures;
    private int baselineCount;
    private int pendingSlot = -1;
    private double pendingPrice = -1;
    private String lastError = "";
    private boolean searchSent;

    private static final int MAX_CLICKS_PER_CYCLE = 12;

    public AutoAh() {
        super("Auto AH", "Buys a target item under a price, re-lists it higher, optionally repeats.", Category.MISC);
    }

    // ════════════════════════════════════════════════════════════════════
    //  lifecycle
    // ════════════════════════════════════════════════════════════════════

    @Override
    public void onEnable() {
        resetCycle();
        cycle = 0;
        failures = 0;
        lastError = "";
        if (dryRun.get()) {
            feedback("§eDry Run is ON§7 - the cycle will report actions without clicking anything.");
        }
        if (itemTarget.get().isBlank()) {
            fail("No target item set.");
        }
    }

    @Override
    public void onDisable() {
        state = State.IDLE;
        delayCounter = 0;
    }

    private void resetCycle() {
        state = State.OPEN_AH;
        delayCounter = actionDelay.getInt();
        stateTicks = 0;
        clicksThisCycle = 0;
        pendingSlot = -1;
        pendingPrice = -1;
        searchSent = false;
    }

    // ════════════════════════════════════════════════════════════════════
    //  the state machine
    // ════════════════════════════════════════════════════════════════════

    @Override
    public boolean pausesWhileGuiOpen() {
        return true;
    }

    @Override
    public void onTick() {
        MinecraftClient client = MinecraftClient.getInstance();
        ClientPlayerEntity player = client.player;
        if (player == null || client.world == null) {
            return;
        }

        stateTicks++;
        if (delayCounter > 0 && --delayCounter > 0) {
            return;
        }

        switch (state) {
            case OPEN_AH -> openAuctionHouse(client, player);
            case WAIT_FOR_AH -> waitForAuctionHouse(client);
            case SCAN -> scan(client, player);
            case BUY -> buy(client, player);
            case WAIT_FOR_CONFIRM -> waitForConfirm(client);
            case CONFIRM_BUY -> confirmBuy(client, player);
            case VERIFY_BUY -> verifyBuy(client, player);
            case SELL -> sell(client, player);
            case VERIFY_SELL -> verifySell(client, player);
            case COOLDOWN -> cooldown();
            case DONE -> setEnabled(false);
            default -> {
            }
        }
    }

    private void openAuctionHouse(MinecraftClient client, ClientPlayerEntity player) {
        if (cycle >= maxCycles.getInt()) {
            feedback("§7Cycle limit reached (" + maxCycles.getInt() + "), stopping.");
            state = State.DONE;
            return;
        }
        cycle++;
        clicksThisCycle = 0;

        if (isAuctionWindow(client)) {
            report("cycle " + cycle + ": auction house already open");
            state = State.SCAN;
            stateTicks = 0;
            delay(actionDelay.getInt());
            return;
        }
        report("cycle " + cycle + ": opening the auction house");

        if (!dryRun.get()) {
            String command = openCommand.format("item", itemTarget.get());
            if (!command.isBlank()) {
                player.networkHandler.sendChatCommand(stripSlash(command));
            }
        }
        state = State.WAIT_FOR_AH;
        stateTicks = 0;
        delay(actionDelay.getInt() * 2);
    }

    private void waitForAuctionHouse(MinecraftClient client) {
        if (isAuctionWindow(client)) {
            String search = searchCommand.format("item", itemTarget.get());
            // only send the search command once per cycle, otherwise this loops forever
            if (!searchSent && !search.isBlank() && client.player != null && !dryRun.get()) {
                searchSent = true;
                closeContainerScreen(client);
                delay(actionDelay.getInt());
                client.player.networkHandler.sendChatCommand(stripSlash(search));
                stateTicks = 0;
                return;
            }
            searchSent = true;
            state = State.SCAN;
            stateTicks = 0;
            delay(actionDelay.getInt());
            return;
        }
        if (stateTicks > scanTimeout.getInt() * 20) {
            fail("Auction window never opened (title filter: \"" + windowTitle.get() + "\").");
        }
    }

    private void scan(MinecraftClient client, ClientPlayerEntity player) {
        if (!isAuctionWindow(client)) {
            state = State.WAIT_FOR_AH;
            stateTicks = 0;
            return;
        }
        ScreenHandler handler = player.currentScreenHandler;
        int containerSlots = containerSlotCount(client, handler);
        String target = itemTarget.get().toLowerCase();
        double threshold = buyPrice.get();

        List<Integer> candidates = new ArrayList<>();
        double cheapest = Double.MAX_VALUE;
        int cheapestSlot = -1;

        for (int i = 0; i < containerSlots; i++) {
            Slot slot = handler.getSlot(i);
            ItemStack stack = slot.getStack();
            if (stack.isEmpty()) {
                continue;
            }
            if (!stack.getName().getString().toLowerCase().contains(target)) {
                continue;
            }
            double price = priceOf(stack);
            if (price < 0) {
                continue;
            }
            candidates.add(i);
            if (price <= threshold && price < cheapest) {
                cheapest = price;
                cheapestSlot = i;
            }
        }

        if (candidates.isEmpty()) {
            info("no listings matching \"" + itemTarget.get() + "\" on this page");
            afterFailedCycle();
            return;
        }
        if (cheapestSlot < 0) {
            info("found " + candidates.size() + " matching listing(s) but none at or below "
                    + formatMoney(threshold));
            afterFailedCycle();
            return;
        }

        baselineCount = countTarget(player);
        pendingSlot = cheapestSlot;
        pendingPrice = cheapest;
        report("buying \"" + itemTarget.get() + "\" for " + formatMoney(cheapest)
                + " (limit " + formatMoney(threshold) + "), inventory has " + baselineCount);

        state = State.BUY;
        delay(actionDelay.getInt());
    }

    private void buy(MinecraftClient client, ClientPlayerEntity player) {
        if (!isAuctionWindow(client)) {
            afterFailedCycle();
            return;
        }
        if (clicksThisCycle >= MAX_CLICKS_PER_CYCLE) {
            fail("click budget for this cycle used up.");
            return;
        }
        if (dryRun.get()) {
            info("dry run: would click slot " + pendingSlot + " to buy at " + formatMoney(pendingPrice));
            state = State.VERIFY_BUY;
            stateTicks = 0;
            return;
        }
        clickSlot(client, player, pendingSlot);
        state = State.WAIT_FOR_CONFIRM;
        stateTicks = 0;
        delay(actionDelay.getInt() * 2);
    }

    private void waitForConfirm(MinecraftClient client) {
        int slot = findSlotByName(client, confirmName.get());
        if (slot >= 0) {
            state = State.CONFIRM_BUY;
            return;
        }
        // no confirm GUI: assume the purchase was immediate once the delay elapsed
        if (stateTicks > actionDelay.getInt() * 3) {
            state = State.VERIFY_BUY;
            stateTicks = 0;
        }
    }

    private void confirmBuy(MinecraftClient client, ClientPlayerEntity player) {
        int slot = findSlotByName(client, confirmName.get());
        if (slot < 0) {
            state = State.VERIFY_BUY;
            stateTicks = 0;
            return;
        }
        if (clicksThisCycle >= MAX_CLICKS_PER_CYCLE) {
            fail("click budget for this cycle used up.");
            return;
        }
        if (!dryRun.get()) {
            clickSlot(client, player, slot);
        } else {
            info("dry run: would click slot " + slot + " to confirm the purchase");
        }
        state = State.VERIFY_BUY;
        stateTicks = 0;
        delay(actionDelay.getInt() * 2);
    }

    private void verifyBuy(MinecraftClient client, ClientPlayerEntity player) {
        int now = countTarget(player);
        if (dryRun.get() || now > baselineCount) {
            report("bought; inventory now holds " + now + " \"" + itemTarget.get() + "\"");
            closeContainerScreen(client);
            state = State.SELL;
            stateTicks = 0;
            delay(actionDelay.getInt() * 2);
            return;
        }
        if (stateTicks > scanTimeout.getInt() * 20) {
            afterFailedCycle();
        }
    }

    private void sell(MinecraftClient client, ClientPlayerEntity player) {
        // requirement: never try to sell something we do not actually hold
        int held = countTarget(player);
        if (held <= 0) {
            fail("nothing to sell - \"" + itemTarget.get() + "\" is not in the inventory.");
            return;
        }
        int hotbarSlot = findHotbarSlot(player);
        if (hotbarSlot < 0) {
            fail("held item is not in the hotbar; cannot select it to list.");
            return;
        }

        double price = sellPrice.get();
        report("listing " + held + " for " + formatMoney(price) + " (hotbar slot " + (hotbarSlot + 1) + ")");

        if (!dryRun.get()) {
            player.getInventory().setSelectedSlot(hotbarSlot);
            String command = sellCommand.format("price", String.valueOf((long) price))
                    .replace("{item}", itemTarget.get());
            if (!command.isBlank()) {
                player.networkHandler.sendChatCommand(stripSlash(command));
            }
        } else {
            info("dry run: would send \"" + sellCommand.format("price", String.valueOf((long) price)) + "\"");
        }

        baselineCount = held;
        state = State.VERIFY_SELL;
        stateTicks = 0;
        delay(actionDelay.getInt() * 3);
    }

    private void verifySell(MinecraftClient client, ClientPlayerEntity player) {
        int now = countTarget(player);
        if (dryRun.get() || now < baselineCount) {
            report("listed");
            failures = 0;
            if (repeat.get()) {
                state = State.COOLDOWN;
                stateTicks = 0;
                delay(actionDelay.getInt() * 4);
            } else {
                feedback("§aCycle complete.");
                state = State.DONE;
            }
            return;
        }
        if (stateTicks > scanTimeout.getInt() * 20) {
            afterFailedCycle();
        }
    }

    private void cooldown() {
        if (!repeat.get()) {
            state = State.DONE;
            return;
        }
        resetCycle();
    }

    /** Counts a failed attempt; either restarts (Repeat) or stops. */
    private void afterFailedCycle() {
        failures++;
        if (stopOnError.get() && failures >= 2) {
            fail(lastError.isEmpty() ? "two failed cycles in a row." : lastError);
            return;
        }
        if (repeat.get()) {
            info("restarting cycle");
            state = State.COOLDOWN;
            stateTicks = 0;
            delay(actionDelay.getInt() * 5);
        } else {
            feedback("§eStopped: " + (lastError.isEmpty() ? "cycle did not complete." : lastError));
            state = State.DONE;
        }
    }

    private void fail(String reason) {
        lastError = reason;
        feedback("§c" + reason);
        Orbit.LOGGER.warn("Auto AH: {}", reason);
        state = State.DONE;
    }

    // ════════════════════════════════════════════════════════════════════
    //  helpers
    // ════════════════════════════════════════════════════════════════════

    private void delay(int ticks) {
        // rate limit with a little jitter so clicks are not perfectly periodic
        double jitter = 1.0 + (Math.random() - 0.5) * 0.4;
        delayCounter = Math.max(2, (int) (ticks * jitter));
    }

    private void clickSlot(MinecraftClient client, ClientPlayerEntity player, int slot) {
        if (client.interactionManager == null) {
            return;
        }
        client.interactionManager.clickSlot(player.currentScreenHandler.syncId, slot, 0,
                SlotActionType.PICKUP, player);
        clicksThisCycle++;
    }

    /**
     * Closes the container window Auto AH is driving - and nothing else.
     *
     * <p>This used to be a bare {@code setScreen(null)}, which also closed whatever the player had
     * open, including Orbit's own ClickGUI. If Auto AH finished a search step while you were in the
     * GUI, the GUI vanished for no apparent reason.
     */
    private void closeContainerScreen(MinecraftClient client) {
        if (client.currentScreen instanceof HandledScreen<?>) {
            client.setScreen(null);
        }
    }

    private boolean isAuctionWindow(MinecraftClient client) {
        Screen screen = client.currentScreen;
        if (!(screen instanceof HandledScreen)) {
            return false;
        }
        String filter = windowTitle.get().toLowerCase();
        if (filter.isBlank()) {
            return true;
        }
        return screen.getTitle().getString().toLowerCase().contains(filter);
    }

    /** Container slots only - the last 36 slots of a chest handler belong to the player. */
    private int containerSlotCount(MinecraftClient client, ScreenHandler handler) {
        int size = handler.slots.size();
        if (client.currentScreen instanceof HandledScreen<?> handled) {
            int playerSlots = 36;
            return Math.max(0, size - playerSlots);
        }
        return size;
    }

    private int findSlotByName(MinecraftClient client, String needle) {
        ClientPlayerEntity player = client.player;
        if (player == null || needle.isBlank() || !(client.currentScreen instanceof HandledScreen)) {
            return -1;
        }
        ScreenHandler handler = player.currentScreenHandler;
        int containerSlots = containerSlotCount(client, handler);
        String lower = needle.toLowerCase();
        for (int i = 0; i < containerSlots; i++) {
            ItemStack stack = handler.getSlot(i).getStack();
            if (stack.isEmpty()) {
                continue;
            }
            if (stack.getName().getString().toLowerCase().contains(lower)) {
                return i;
            }
        }
        return -1;
    }

    private double priceOf(ItemStack stack) {
        LoreComponent lore = stack.get(DataComponentTypes.LORE);
        List<String> lines = new ArrayList<>();
        if (lore != null) {
            for (Text line : lore.lines()) {
                lines.add(PriceParser.stripFormatting(line.getString()));
            }
        }
        return PriceParser.parse(lines, currency.get(), priceHint.get());
    }

    private int countTarget(ClientPlayerEntity player) {
        String target = itemTarget.get().toLowerCase();
        int total = 0;
        var inventory = player.getInventory();
        for (int i = 0; i < inventory.size(); i++) {
            ItemStack stack = inventory.getStack(i);
            if (!stack.isEmpty() && stack.getName().getString().toLowerCase().contains(target)) {
                total += stack.getCount();
            }
        }
        return total;
    }

    private int findHotbarSlot(ClientPlayerEntity player) {
        String target = itemTarget.get().toLowerCase();
        var inventory = player.getInventory();
        for (int i = 0; i < 9; i++) {
            ItemStack stack = inventory.getStack(i);
            if (!stack.isEmpty() && stack.getName().getString().toLowerCase().contains(target)) {
                return i;
            }
        }
        return -1;
    }

    private static String stripSlash(String command) {
        return command.startsWith("/") ? command.substring(1) : command;
    }

    private static String formatMoney(double amount) {
        return String.format("%,.0f", amount);
    }

    private void report(String message) {
        feedback("§d[Auto AH] §7" + message);
        Orbit.LOGGER.info("Auto AH: {}", message);
    }

    private void info(String message) {
        feedback("§7[Auto AH] " + message);
        Orbit.LOGGER.info("Auto AH: {}", message);
    }

    private void feedback(String message) {
        if (!chatFeedback.get()) {
            return;
        }
        MinecraftClient client = MinecraftClient.getInstance();
        if (client.player != null) {
            client.player.sendMessage(Text.literal(message), false);
        }
    }
}
