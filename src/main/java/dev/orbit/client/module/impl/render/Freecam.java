package dev.orbit.client.module.impl.render;

import dev.orbit.client.module.Category;
import dev.orbit.client.module.Module;
import dev.orbit.client.module.setting.BoolSetting;
import dev.orbit.client.module.setting.NumberSetting;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.network.ClientPlayerEntity;
import net.minecraft.util.math.MathHelper;
import net.minecraft.util.math.Vec3d;

/**
 * Freecam - detaches the camera from the player.
 *
 * <p>Positioning is deliberately split into two stages so both "smooth" and "momentum" are
 * real, independent behaviours:
 * <ul>
 *   <li><b>momentum</b>: key input drives a target velocity, the actual velocity chases it, so the
 *       camera accelerates, drifts and glides to a stop.</li>
 *   <li><b>smoothing</b>: the rendered position chases the simulated position, and the rendered
 *       rotation chases the mouse rotation.</li>
 * </ul>
 *
 * <p>Every interpolation is frame-rate independent: {@code t = 1 - exp(-rate * dt)} instead of a
 * fixed per-frame factor, so the feel does not change between 30 and 300 fps.
 *
 * <p>The camera itself is overridden in {@code CameraMixin} (tail of {@code Camera.update});
 * mouse look is redirected here from {@code MouseMixin}; the scroll wheel speed modifier is
 * transient and resets whenever the module is toggled.
 */
public class Freecam extends Module {
    /** Scroll wheel multiplier bounds. */
    private static final double MIN_SPEED_MULTIPLIER = 0.1;
    private static final double MAX_SPEED_MULTIPLIER = 5.0;
    /** One notch of the wheel = +10%. */
    private static final double SCROLL_STEP = 1.1;

    private final NumberSetting speed = addSetting(new NumberSetting("Speed", 12, 1, 40, 1, " b/s"));
    /**
     * Instant = move exactly as fast as the keys say, and stop the moment you let go. No
     * acceleration, no glide, no camera lag. The three smoothing sliders below only matter when
     * this is off.
     */
    private final BoolSetting instant = addSetting(new BoolSetting("Instant", true));
    private final NumberSetting momentum = addSetting(new NumberSetting("Momentum", 0, 0, 100, 1, "%"));
    private final NumberSetting smoothing = addSetting(new NumberSetting("Smoothing", 0, 0, 100, 1, "%"));
    private final NumberSetting rotationSmoothing = addSetting(new NumberSetting("Rotation Smoothing", 0, 0, 100, 1, "%"));
    private final BoolSetting verticalKeys = addSetting(new BoolSetting("Vertical Keys", true));
    /** The player stays put: no walking, jumping or sneaking while the camera is detached. */
    private final BoolSetting freezePlayer = addSetting(new BoolSetting("Freeze Player", true));
    private final BoolSetting sprintBoost = addSetting(new BoolSetting("Sprint Boost", true));

    // ── simulated state ─────────────────────────────────────────────────
    private Vec3d simulatedPos = Vec3d.ZERO;
    private Vec3d velocity = Vec3d.ZERO;
    private double speedMultiplier = 1.0;

    // ── rendered (smoothed) state ───────────────────────────────────────
    private Vec3d renderedPos = Vec3d.ZERO;
    private float targetYaw;
    private float targetPitch;
    private float renderedYaw;
    private float renderedPitch;

    private long lastFrameNanos = 0L;
    private boolean initialised = false;

    public Freecam() {
        super("Freecam", "Detaches the camera. WASD to fly, scroll to change speed.", Category.RENDER);
        setKeybind(dev.orbit.client.module.Keybind.keyboard(org.lwjgl.glfw.GLFW.GLFW_KEY_V));
    }

    // ════════════════════════════════════════════════════════════════════
    //  enable / disable
    // ════════════════════════════════════════════════════════════════════

    @Override
    public void onEnable() {
        MinecraftClient client = MinecraftClient.getInstance();
        if (client.player == null) {
            // enabled from config before a world exists - begin() runs on the first frame instead
            initialised = false;
            return;
        }
        begin(client.player);
    }

    /** Snapshots the current player view so the free camera starts exactly where the player looks. */
    private void begin(ClientPlayerEntity player) {
        Vec3d eye = player.getEyePos();
        simulatedPos = eye;
        renderedPos = eye;
        velocity = Vec3d.ZERO;
        speedMultiplier = 1.0;   // scroll adjustments never carry across toggles
        targetYaw = player.getYaw();
        targetPitch = player.getPitch();
        renderedYaw = targetYaw;
        renderedPitch = targetPitch;
        lastFrameNanos = 0L;
        initialised = true;
    }

    @Override
    public void onDisable() {
        velocity = Vec3d.ZERO;
        speedMultiplier = 1.0;   // and are cleared again on the way out
        initialised = false;
        lastFrameNanos = 0L;
    }

    // ════════════════════════════════════════════════════════════════════
    //  input
    // ════════════════════════════════════════════════════════════════════

    /** Called from {@code MouseMixin} instead of {@code player.changeLookDirection}. */
    public void onMouseLook(double deltaYaw, double deltaPitch) {
        if (!isEnabled()) {
            return;
        }
        // same 0.15 scaling vanilla's changeLookDirection applies
        targetYaw = MathHelper.wrapDegrees(targetYaw + (float) deltaYaw * 0.15f);
        targetPitch = MathHelper.clamp(targetPitch + (float) deltaPitch * 0.15f, -90.0f, 90.0f);
    }

    /** Called from {@code MouseMixin}; returns true when the scroll was consumed. */
    public boolean onScroll(double verticalAmount) {
        if (!isEnabled() || verticalAmount == 0.0) {
            return false;
        }
        speedMultiplier = MathHelper.clamp(
                speedMultiplier * Math.pow(SCROLL_STEP, verticalAmount),
                MIN_SPEED_MULTIPLIER,
                MAX_SPEED_MULTIPLIER);
        return true;
    }

    public double getSpeedMultiplier() {
        return speedMultiplier;
    }

    /** Current effective speed in blocks per second, including the scroll multiplier. */
    public double getEffectiveSpeed() {
        return speed.get() * speedMultiplier;
    }

    // ════════════════════════════════════════════════════════════════════
    //  per-frame simulation
    // ════════════════════════════════════════════════════════════════════

    /**
     * Advances the simulation by one frame and returns the camera pose to apply.
     * Called once per frame from {@code CameraMixin}; returns {@code null} when there is nothing
     * to apply. The pose is applied there because {@code Camera.setPos}/{@code setRotation} are
     * protected - only the mixin can reach them.
     */
    public CameraState tickSimulation() {
        if (!isEnabled()) {
            return null;
        }
        MinecraftClient client = MinecraftClient.getInstance();
        ClientPlayerEntity player = client.player;
        if (player == null) {
            return null;
        }
        if (!initialised) {
            // enabled from config before a world existed
            begin(player);
        }

        float deltaSeconds = deltaSeconds();

        // ── direction from keybinds, in the camera's yaw space ──
        double forward = 0.0;
        double strafe = 0.0;
        double up = 0.0;
        if (client.options.forwardKey.isPressed()) {
            forward += 1.0;
        }
        if (client.options.backKey.isPressed()) {
            forward -= 1.0;
        }
        if (client.options.leftKey.isPressed()) {
            strafe += 1.0;
        }
        if (client.options.rightKey.isPressed()) {
            strafe -= 1.0;
        }
        if (verticalKeys.get()) {
            if (client.options.jumpKey.isPressed()) {
                up += 1.0;
            }
            if (client.options.sneakKey.isPressed()) {
                up -= 1.0;
            }
        }

        double boost = sprintBoost.get() && client.options.sprintKey.isPressed() ? 2.5 : 1.0;
        double speedNow = speed.get() * speedMultiplier * boost;

        double yawRadians = Math.toRadians(targetYaw);
        double sin = Math.sin(yawRadians);
        double cos = Math.cos(yawRadians);

        // forward is -Z rotated by yaw; strafe is +X rotated by yaw
        Vec3d wish = new Vec3d(
                (-sin * forward + cos * strafe),
                up,
                (cos * forward + sin * strafe));

        if (wish.lengthSquared() > 1.0E-6) {
            wish = wish.normalize().multiply(speedNow);
        } else {
            wish = Vec3d.ZERO;
        }

        if (instant.get()) {
            // straight to the requested velocity, straight to the requested pose: zero lag
            velocity = wish;
            simulatedPos = simulatedPos.add(velocity.multiply(deltaSeconds));
            renderedPos = simulatedPos;
            renderedYaw = targetYaw;
            renderedPitch = targetPitch;
        } else {
            // momentum: chase the requested velocity. high momentum -> slow response
            double momentum01 = momentum.get() / 100.0;
            double response = MathHelper.lerp(momentum01, 26.0, 2.5);
            double velocityBlend = smoothingFactor(response, deltaSeconds);
            velocity = velocity.add(wish.subtract(velocity).multiply(velocityBlend));

            simulatedPos = simulatedPos.add(velocity.multiply(deltaSeconds));

            // smoothing: rendered position chases the simulation
            double positionRate = MathHelper.lerp(smoothing.get() / 100.0, 40.0, 3.0);
            renderedPos = renderedPos.add(
                    simulatedPos.subtract(renderedPos).multiply(smoothingFactor(positionRate, deltaSeconds)));

            // rotation: rendered angles chase the mouse angles (shortest path for yaw)
            double rotationRate = MathHelper.lerp(rotationSmoothing.get() / 100.0, 45.0, 4.0);
            double rotationBlend = smoothingFactor(rotationRate, deltaSeconds);
            renderedYaw = MathHelper.lerpAngleDegrees((float) rotationBlend, renderedYaw, targetYaw);
            renderedPitch = MathHelper.lerp((float) rotationBlend, renderedPitch, targetPitch);
        }

        return new CameraState(renderedPos, renderedYaw, renderedPitch);
    }

    /** Camera pose for one frame. */
    public record CameraState(Vec3d pos, float yaw, float pitch) {
    }

    /**
     * Frame-rate independent interpolation factor: {@code 1 - exp(-rate * dt)}.
     * Identical smoothing at any frame rate, and it never overshoots above 1.
     */
    private static double smoothingFactor(double rate, float deltaSeconds) {
        return 1.0 - Math.exp(-rate * deltaSeconds);
    }

    /** Real seconds since the previous frame, clamped so a stall cannot teleport the camera. */
    private float deltaSeconds() {
        long now = System.nanoTime();
        if (lastFrameNanos == 0L) {
            lastFrameNanos = now;
            return 0.0f;
        }
        float dt = (now - lastFrameNanos) / 1.0E9f;
        lastFrameNanos = now;
        return MathHelper.clamp(dt, 0.0f, 0.1f);
    }

    /**
     * True while the camera is detached.
     *
     * <p>Read by {@code CameraMixin} (which makes the camera report third-person, so vanilla stops
     * skipping the player's own model) and by {@code GameRendererMixin} (which hides the first-person
     * hand, since your body is now on screen instead).
     */
    public static boolean isActive() {
        return dev.orbit.client.module.ModuleRegistry.get(Freecam.class)
                .map(Module::isEnabled)
                .orElse(false);
    }

    /** True when the local player's movement input should be suppressed. */
    public static boolean freezesPlayer() {
        return dev.orbit.client.module.ModuleRegistry.get(Freecam.class)
                .map(module -> module.isEnabled() && module.freezePlayer.get())
                .orElse(false);
    }

    public Vec3d getRenderedPos() {
        return renderedPos;
    }
}
