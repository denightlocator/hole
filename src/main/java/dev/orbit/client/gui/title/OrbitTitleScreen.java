package dev.orbit.client.gui.title;

import dev.orbit.client.Orbit;
import dev.orbit.client.gui.Rounded;
import dev.orbit.client.gui.Theme;
import dev.orbit.client.module.ModuleRegistry;
import dev.orbit.client.module.impl.misc.TitleScreenModule;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gl.RenderPipelines;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.screen.multiplayer.MultiplayerScreen;
import net.minecraft.client.gui.screen.option.OptionsScreen;
import net.minecraft.client.gui.screen.world.SelectWorldScreen;
import dev.orbit.client.gui.ClickGuiScreen;
import net.minecraft.client.realms.gui.screen.RealmsMainScreen;
import net.minecraft.SharedConstants;
import dev.orbit.client.gui.HudEditorScreen;
import dev.orbit.client.module.Module;
import net.minecraft.client.texture.ResourceTexture;
import net.minecraft.text.Text;
import net.minecraft.util.Identifier;
import net.minecraft.util.math.MathHelper;

/**
 * Orbit's main menu: a static starfield, a left scrim for legibility, the ORBIT wordmark and
 * custom-styled real widgets.
 *
 * <p>No animation and no per-frame drawing beyond a single texture blit plus two gradients, so this
 * costs essentially nothing on low-end machines.
 */
public class OrbitTitleScreen extends Screen {
    private static final Identifier BACKGROUND =
            Identifier.of("orbit", "textures/gui/title/starfield.png");

    /** Texture is uploaded once; a bare registerTexture() never uploads, see ensureBackground(). */
    private static boolean textureRegistered;

    /** Set if the background can never be uploaded; we then draw a gradient instead of crashing. */
    private static boolean textureFailed;

    /** Natural aspect of the background image. */
    private static final float IMAGE_ASPECT = 16f / 9f;

    /** Right-hand panel column. */
    private static final int CARD_W = 178;
    private static final int CARD_MARGIN = 22;
    private static final int CARD_GAP = 9;

    /** Below this the window is too narrow for a second column, so it is skipped entirely. */
    private static final int MIN_WIDTH_FOR_PANEL = 560;

    private int wordmarkX;
    private int wordmarkY;

    public OrbitTitleScreen() {
        super(Text.literal("Orbit"));
        ensureBackground();
    }

    /**
     * Uploads the background texture.
     *
     * <p>{@code TextureManager.registerTexture(Identifier)} only puts an <em>empty</em> {@link ResourceTexture}
     * into the map - the actual GPU upload happens during a resource reload, which has already passed by the
     * time the title screen exists. Drawing that texture throws
     * "Texture view does not exist, can't get it before something initializes it", so we load it ourselves:
     * {@code ReloadableTexture.reload(contents)} creates the GPU texture and uploads the pixels immediately.
     */
    private static void ensureBackground() {
        if (textureRegistered || textureFailed) {
            return;
        }
        try {
            MinecraftClient client = MinecraftClient.getInstance();
            ResourceTexture texture = new ResourceTexture(BACKGROUND);
            texture.reload(texture.loadContents(client.getResourceManager()));
            client.getTextureManager().registerTexture(BACKGROUND, texture);
            textureRegistered = true;
        } catch (Throwable t) {
            textureFailed = true;
            Orbit.LOGGER.error("Could not upload the title screen background; using a gradient instead", t);
        }
    }

    private TitleScreenModule settings() {
        return ModuleRegistry.get(TitleScreenModule.class).orElse(null);
    }

    // ── layout ──────────────────────────────────────────────────────────
    @Override
    protected void init() {
        MinecraftClient client = MinecraftClient.getInstance();
        TitleScreenModule settings = settings();

        int buttonWidth = 120;
        int buttonHeight = 16;
        int gap = 4;
        int x = leftColumnX();
        int y = (int) (height * 0.44f);

        addDrawableChild(new OrbitButton(x, y, buttonWidth, buttonHeight, "Singleplayer",
                () -> client.setScreen(new SelectWorldScreen(this)), false));
        y += buttonHeight + gap;
        addDrawableChild(new OrbitButton(x, y, buttonWidth, buttonHeight, "Multiplayer",
                () -> client.setScreen(new MultiplayerScreen(this)), true));
        y += buttonHeight + gap;

        // Mod Menu is optional; the button only appears when its screen class exists
        if ((settings == null || settings.showModsButton()) && modsScreenAvailable()) {
            addDrawableChild(new OrbitButton(x, y, buttonWidth, buttonHeight, "Mods",
                    this::openModsScreen, false));
            y += buttonHeight + gap;
        }

        addDrawableChild(new OrbitButton(x, y, buttonWidth, buttonHeight, "Realms",
                () -> client.setScreen(new RealmsMainScreen(this)), false));

        // footer row
        int footY = (int) (height * 0.83f);
        addDrawableChild(new OrbitButton(x, footY, 57, 14, "Options",
                () -> client.setScreen(new OptionsScreen(this, client.options)), false));
        addDrawableChild(new OrbitButton(x + 61, footY, 59, 14, "Quit",
                () -> client.scheduleStop(), false));

        wordmarkX = x;
        wordmarkY = (int) (height * 0.17f);

        // right column: quick actions live below the two info cards
        if (panelVisible()) {
            int cardX = panelX();
            int actionY = quickActionsY();
            addDrawableChild(new OrbitButton(cardX + 10, actionY, CARD_W - 20, 15, "Open Menu",
                    () -> client.setScreen(new ClickGuiScreen()), false));
            actionY += 19;
            addDrawableChild(new OrbitButton(cardX + 10, actionY, CARD_W - 20, 15, "HUD Editor",
                    () -> client.setScreen(new HudEditorScreen()), false));
            actionY += 19;
            if (modsScreenAvailable()) {
                addDrawableChild(new OrbitButton(cardX + 10, actionY, CARD_W - 20, 15, "Mods",
                        this::openModsScreen, false));
            }
        }
    }

    private int leftColumnX() {
        return Math.max(12, (int) (width * 0.06f));
    }

    // ── rendering ───────────────────────────────────────────────────────
    @Override
    public void renderBackground(DrawContext context, int mouseX, int mouseY, float deltaTicks) {
        TitleScreenModule settings = settings();
        float scrim = settings == null ? 0.78f : settings.getScrim();

        drawCoverBackground(context);

        // Left scrim: keeps the menu legible whatever the crop does.
        //
        // fillGradient() is VERTICAL in vanilla - top colour to bottom colour - so using it for a
        // left-to-right scrim produced two vertical gradients side by side, with a hard seam where
        // the second one started at 72% width. That seam was visible across the whole menu. A real
        // horizontal gradient is drawn as strips instead (capped at 48, so it stays cheap).
        int scrimEnd = (int) (width * 0.72f);
        Rounded.fillHorizontal(context, 0, 0, scrimEnd, height, 0,
                argb(scrim, 0x000000), argb(0f, 0x000000));
        Rounded.fillHorizontal(context, scrimEnd, 0, width - scrimEnd, height, 0,
                argb(0f, 0x000000), argb(scrim * 0.35f, 0x000000));

        // vertical vignette so the bottom edge does not cut hard
        context.fillGradient(0, height - (int) (height * 0.22f), width, height,
                argb(0f, 0x000000), argb(0.55f, 0x000000));
        context.fillGradient(0, 0, width, (int) (height * 0.10f),
                argb(0.45f, 0x000000), argb(0f, 0x000000));
    }

    /** Draws the starfield scaled to cover. Anchored so the hero star stays in frame. */
    private void drawCoverBackground(DrawContext context) {
        ensureBackground();
        if (!textureRegistered) {
            // fallback: deep-space gradient, always safe
            context.fillGradient(0, 0, width, height, 0xFF04060F, 0xFF000000);
            return;
        }

        float screenAspect = (float) width / height;

        float drawWidth;
        float drawHeight;
        if (screenAspect > IMAGE_ASPECT) {
            // wider than the image: fill the width, overflow vertically
            drawWidth = width;
            drawHeight = width / IMAGE_ASPECT;
        } else {
            drawHeight = height;
            drawWidth = height * IMAGE_ASPECT;
        }

        // anchor right: the hole lives on the right of the image
        int drawX = Math.round(width - drawWidth);
        int drawY = Math.round((height - drawHeight) / 2f);

        try {
            context.drawTexture(RenderPipelines.GUI_TEXTURED, BACKGROUND,
                    drawX, drawY, 0f, 0f,
                    Math.round(drawWidth), Math.round(drawHeight),
                    Math.round(drawWidth), Math.round(drawHeight));
        } catch (Throwable t) {
            // never take the game down over a background image
            textureFailed = true;
            Orbit.LOGGER.error("Title screen background draw failed; falling back to the vanilla menu", t);

            // disabling the module first is essential: otherwise the mixin swaps the vanilla
            // TitleScreen straight back to us and we would loop forever.
            TitleScreenModule module = settings();
            if (module != null) {
                module.setEnabled(false);
            }
            MinecraftClient.getInstance().setScreen(new net.minecraft.client.gui.screen.TitleScreen());
        }
    }

    // ── right-hand panel ────────────────────────────────────────────────
    private boolean panelVisible() {
        return width >= MIN_WIDTH_FOR_PANEL;
    }

    private int panelX() {
        return width - CARD_W - CARD_MARGIN;
    }

    /** Where the card stack starts: aligned with the wordmark block. */
    private int panelY() {
        return wordmarkY - 6;
    }

    private int cardHeight(int contentRows) {
        return 16 + contentRows * 11 + 6;
    }

    /** Y of the quick-actions card, after the two info cards. */
    private int quickActionsY() {
        TitleScreenModule settings = settings();
        int y = panelY();
        if (settings == null || settings.showAccountCard()) {
            y += cardHeight(2) + CARD_GAP;
        }
        if (settings == null || settings.showStatsCard()) {
            y += cardHeight(4) + CARD_GAP;
        }
        return y + 16;
    }

    /** Draws a card shell and returns the y of its first content row. */
    private int drawCard(DrawContext context, int x, int y, int height, String title) {
        Rounded.panel(context, x, y, CARD_W, height, 9,
                Theme.alpha(Theme.card(), 0xE8), Theme.alpha(Theme.bg(), 0xF0), Theme.border());
        // title, letter-spaced and small
        context.drawText(textRenderer, spaced(title), x + 10, y + 7, Theme.textFaint(), false);
        Rounded.fillHorizontal(context, x + 10, y + 16, CARD_W - 20, 1, 0,
                Theme.alpha(Theme.accent(), 0x55), Theme.alpha(Theme.accent(), 0x00));
        return y + 21;
    }

    private void drawPanel(DrawContext context) {
        if (!panelVisible()) {
            return;
        }
        TitleScreenModule settings = settings();
        boolean account = settings == null || settings.showAccountCard();
        boolean stats = settings == null || settings.showStatsCard();
        boolean quick = settings == null || settings.showQuickActions();

        int x = panelX();
        int y = panelY();

        if (account) {
            drawAccountCard(context, x, y);
            y += cardHeight(2) + CARD_GAP;
        }
        if (stats) {
            drawStatsCard(context, x, y);
            y += cardHeight(4) + CARD_GAP;
        }
        if (quick) {
            int height = 22 + (modsScreenAvailable() ? 3 : 2) * 19;
            Rounded.panel(context, x, y, CARD_W, height, 9,
                    Theme.alpha(Theme.card(), 0xE8), Theme.alpha(Theme.bg(), 0xF0), Theme.border());
            context.drawText(textRenderer, spaced("QUICK"), x + 10, y + 7, Theme.textFaint(), false);
            Rounded.fillHorizontal(context, x + 10, y + 16, CARD_W - 20, 1, 0,
                    Theme.alpha(Theme.accent(), 0x55), Theme.alpha(Theme.accent(), 0x00));
            y += height + CARD_GAP;
        }

        if (settings == null || settings.showKeybindHint()) {
            String hint = "Right Shift  ·  open menu";
            context.drawText(textRenderer, hint, x + 2, y + 2, Theme.textFaint(), true);
        }
    }

    private void drawAccountCard(DrawContext context, int x, int y) {
        int contentY = drawCard(context, x, y, cardHeight(2), "PLAYER");

        String name = MinecraftClient.getInstance().getSession().getUsername();
        context.drawText(textRenderer, name, x + 10, contentY, Theme.text(), true);

        String status = MinecraftClient.getInstance().isInSingleplayer() ? "local world" : "signed in";
        context.drawText(textRenderer, status, x + 10, contentY + 11, Theme.textMuted(), false);

        // small state dot on the right
        Rounded.fill(context, x + CARD_W - 18, contentY + 2, 5, 5, 3, Theme.accent());
    }

    private void drawStatsCard(DrawContext context, int x, int y) {
        int contentY = drawCard(context, x, y, cardHeight(4), "CLIENT");

        int total = ModuleRegistry.all().size();
        long active = ModuleRegistry.all().stream().filter(Module::isEnabled).count();

        row(context, x + 10, contentY, "Version", Orbit.VERSION);
        row(context, x + 10, contentY + 11, "Minecraft", gameVersion());
        row(context, x + 10, contentY + 22, "Modules", active + " / " + total);
        row(context, x + 10, contentY + 33, "Theme", Theme.presetName());
    }

    /** Game version string, without touching shared mutable state. */
    private static String gameVersion() {
        try {
            return net.fabricmc.loader.api.FabricLoader.getInstance()
                    .getModContainer("minecraft")
                    .map(container -> container.getMetadata().getVersion().getFriendlyString())
                    .orElse(SharedConstants.CURRENT_SERIES);
        } catch (Throwable t) {
            return SharedConstants.CURRENT_SERIES;
        }
    }

    /** One label/value line inside a card. */
    private void row(DrawContext context, int x, int y, String label, String value) {
        context.drawText(textRenderer, label, x, y, Theme.textMuted(), false);
        int valueWidth = textRenderer.getWidth(value);
        context.drawText(textRenderer, value, x + CARD_W - 20 - valueWidth, y, Theme.text(), false);
    }

    @Override
    public void render(DrawContext context, int mouseX, int mouseY, float deltaTicks) {
        // twinkle: one extra translucent pass over the whole screen, costs almost nothing
        TitleScreenModule twinkleSettings = settings();
        if (textureRegistered && twinkleSettings != null && twinkleSettings.twinkles()) {
            float t = (float) (System.nanoTime() / 1_000_000_000.0);
            int a = (int) (10 + 9 * Math.sin(t * 0.9f)) << 24;
            context.fill(0, 0, width, height, a | 0x0B1B3A);
        }

        super.render(context, mouseX, mouseY, deltaTicks);

        drawPanel(context);

        TitleScreenModule settings = settings();
        String wordmark = settings == null ? "ORBIT" : settings.getWordmark();
        String tagline = settings == null ? "CLIENT" : settings.getTagline();

        // wordmark, scaled up with the matrix stack
        context.getMatrices().pushMatrix();
        context.getMatrices().translate(wordmarkX, wordmarkY);
        context.getMatrices().scale(3.0f, 3.0f);
        context.drawText(textRenderer, wordmark, 0, 0, 0xFFFFFFFF, true);
        context.getMatrices().popMatrix();

        // tagline below, letter-spaced
        String spaced = spaced(tagline);
        context.drawText(textRenderer, spaced, wordmarkX + 2, wordmarkY + 22, Theme.textMuted(), true);

        // hairline under the wordmark, tinted with the theme accent
        Rounded.fillHorizontal(context, wordmarkX, wordmarkY + 17, 46, 1, 0,
                Theme.accent(), Theme.alpha(Theme.accent(), 0x00));

        // footer meta
        if (settings == null || settings.showVersion()) {
            String meta = "Orbit " + Orbit.VERSION + "  ·  Fabric";
            context.drawText(textRenderer, meta, wordmarkX, height - 14, Theme.textFaint(), true);
        }
    }

    private static String spaced(String text) {
        StringBuilder builder = new StringBuilder();
        for (int i = 0; i < text.length(); i++) {
            builder.append(text.charAt(i));
            if (i < text.length() - 1) {
                builder.append(' ');
            }
        }
        return builder.toString();
    }

    private static int argb(float alpha, int rgb) {
        int a = MathHelper.clamp((int) (alpha * 255f), 0, 255);
        return (a << 24) | (rgb & 0xFFFFFF);
    }

    // ── optional Mod Menu integration ───────────────────────────────────
    private static boolean modsScreenAvailable() {
        try {
            Class.forName("com.terraformersmc.modmenu.gui.ModsScreen");
            return true;
        } catch (Throwable t) {
            return false;
        }
    }

    private void openModsScreen() {
        try {
            Class<?> type = Class.forName("com.terraformersmc.modmenu.gui.ModsScreen");
            Object screen = type.getConstructor(Screen.class).newInstance(this);
            MinecraftClient.getInstance().setScreen((Screen) screen);
        } catch (Throwable t) {
            Orbit.LOGGER.warn("Mod Menu is not available: {}", t.toString());
        }
    }

    @Override
    public boolean shouldPause() {
        return false;
    }
}
