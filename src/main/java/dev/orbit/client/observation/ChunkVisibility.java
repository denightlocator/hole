package dev.orbit.client.observation;

/** Conservative horizontal grid traversal: an unknown chunk must never count as clear sight. */
public final class ChunkVisibility {
    private ChunkVisibility() { }

    @FunctionalInterface
    public interface LoadedChunks {
        boolean isLoaded(int chunkX, int chunkZ);
    }

    public static boolean pathIsLoaded(double fromX, double fromZ, double toX, double toZ,
                                       LoadedChunks chunks) {
        if (!Double.isFinite(fromX) || !Double.isFinite(fromZ)
                || !Double.isFinite(toX) || !Double.isFinite(toZ)) {
            return false;
        }
        int x = PlayerMotionTracker.chunkCoordinate(fromX);
        int z = PlayerMotionTracker.chunkCoordinate(fromZ);
        int endX = PlayerMotionTracker.chunkCoordinate(toX);
        int endZ = PlayerMotionTracker.chunkCoordinate(toZ);
        double dx = toX - fromX;
        double dz = toZ - fromZ;
        if (!Double.isFinite(dx) || !Double.isFinite(dz)
                || Math.abs((long) endX - x) + Math.abs((long) endZ - z) > 1024) {
            return false;
        }
        // A path exactly along a boundary touches both sides for its entire length.
        boolean alongXBoundary = dx == 0.0 && fromX % 16.0 == 0.0;
        boolean alongZBoundary = dz == 0.0 && fromZ % 16.0 == 0.0;
        if (!covered(chunks, x, z, alongXBoundary, alongZBoundary)) {
            return false;
        }
        // Comparisons, rather than Double.compare, treat negative zero as no movement.
        int stepX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
        int stepZ = dz > 0 ? 1 : dz < 0 ? -1 : 0;
        double deltaX = stepX == 0 ? Double.POSITIVE_INFINITY : 16.0 / Math.abs(dx);
        double deltaZ = stepZ == 0 ? Double.POSITIVE_INFINITY : 16.0 / Math.abs(dz);
        double nextX = stepX > 0 ? (x + 1.0) * 16.0 : x * 16.0;
        double nextZ = stepZ > 0 ? (z + 1.0) * 16.0 : z * 16.0;
        double tX = stepX == 0 ? Double.POSITIVE_INFINITY : (nextX - fromX) / dx;
        double tZ = stepZ == 0 ? Double.POSITIVE_INFINITY : (nextZ - fromZ) / dz;

        while (x != endX || z != endZ) {
            // If the endpoint lies exactly on a boundary, do not step past its chunk at t=1.
            double nextCrossingX = x == endX ? Double.POSITIVE_INFINITY : tX;
            double nextCrossingZ = z == endZ ? Double.POSITIVE_INFINITY : tZ;
            if (Double.isFinite(nextCrossingX) && Double.isFinite(nextCrossingZ)
                    && Math.abs(nextCrossingX - nextCrossingZ) <= 1.0e-12) {
                // A ray through a corner touches both neighbours as well as the diagonal. Treat
                // almost-equal crossings conservatively to allow for floating-point rounding.
                if (!chunks.isLoaded(x + stepX, z) || !chunks.isLoaded(x, z + stepZ)) {
                    return false;
                }
                x += stepX;
                z += stepZ;
                tX += deltaX;
                tZ += deltaZ;
            } else if (nextCrossingX < nextCrossingZ) {
                x += stepX;
                tX += deltaX;
            } else {
                z += stepZ;
                tZ += deltaZ;
            }
            if (!covered(chunks, x, z, alongXBoundary, alongZBoundary)) {
                return false;
            }
        }
        return true;
    }

    private static boolean covered(LoadedChunks chunks, int x, int z, boolean alongX, boolean alongZ) {
        return chunks.isLoaded(x, z)
                && (!alongX || chunks.isLoaded(x - 1, z))
                && (!alongZ || chunks.isLoaded(x, z - 1))
                && (!(alongX && alongZ) || chunks.isLoaded(x - 1, z - 1));
    }
}
