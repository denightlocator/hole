package net.minecraft.entity.player;

import java.util.UUID;

public class PlayerEntity {
    public final UUID id;
    public double x, y, z;
    public PlayerEntity(UUID id, double x, double y, double z) {
        this.id = id; this.x = x; this.y = y; this.z = z;
    }
    public void sendMessage(net.minecraft.text.Text message, boolean overlay) { }
    public UUID getUuid() { return id; }
    public double getX() { return x; }
    public double getY() { return y; }
    public double getZ() { return z; }
    public double squaredDistanceTo(double x, double y, double z) {
        double dx = this.x - x, dy = this.y - y, dz = this.z - z;
        return dx * dx + dy * dy + dz * dz;
    }
}
