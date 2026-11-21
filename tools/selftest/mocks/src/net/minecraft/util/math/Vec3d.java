package net.minecraft.util.math;

public class Vec3d {
    public final double x, y, z;
    public Vec3d(double x, double y, double z) { this.x = x; this.y = y; this.z = z; }
    public double squaredDistanceTo(Vec3d v) { return subtract(v).lengthSquared(); }
    public Vec3d subtract(Vec3d v) { return new Vec3d(x - v.x, y - v.y, z - v.z); }
    public Vec3d add(Vec3d v) { return new Vec3d(x + v.x, y + v.y, z + v.z); }
    public double lengthSquared() { return x * x + y * y + z * z; }
    public Vec3d normalize() {
        double length = Math.sqrt(lengthSquared());
        return length < 1.0e-4 ? new Vec3d(0, 0, 0) : multiply(1 / length);
    }
    public Vec3d multiply(double value) { return new Vec3d(x * value, y * value, z * value); }
    public static Vec3d ofCenter(BlockPos p) { return new Vec3d(p.getX() + .5, p.getY() + .5, p.getZ() + .5); }
}
