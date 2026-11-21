package dev.orbit.client.module.impl.perf;

import dev.orbit.client.module.setting.NumberSetting;
import dev.orbit.client.perf.PerfState;

/**
 * Skips entities that are fully behind the camera.
 *
 * <p>Honest about the gain: vanilla already frustum-culls, so this only catches entities whose
 * bounding box straddles the near plane or that sit just outside it - typically a handful per frame.
 * It is not the large win "entity culling" is often advertised as.
 */
public class EntityCulling extends FlagModule {
    private final NumberSetting minDistance =
            addSetting(new NumberSetting("Min Distance", 8, 2, 64, 2, "b"));

    public EntityCulling() {
        super("Entity Culling", "Skips entities fully behind the camera. Small, honest gain.");
    }

    @Override
    protected void publish(boolean enabled) {
        PerfState.entityCulling = enabled;
        double blocks = minDistance.get();
        PerfState.entityCullMinSq = blocks * blocks;
    }
}
