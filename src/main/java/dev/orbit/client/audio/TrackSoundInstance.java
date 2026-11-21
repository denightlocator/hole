package dev.orbit.client.audio;

import net.fabricmc.fabric.api.client.sound.v1.FabricSoundInstance;
import net.minecraft.client.sound.AudioStream;
import net.minecraft.client.sound.OggAudioStream;
import net.minecraft.client.sound.Sound;
import net.minecraft.client.sound.SoundInstance;
import net.minecraft.client.sound.SoundLoader;
import net.minecraft.client.sound.WeightedSoundSet;
import net.minecraft.sound.SoundCategory;
import net.minecraft.util.Identifier;
import net.minecraft.util.math.floatprovider.ConstantFloatProvider;

import java.io.IOException;
import java.io.InputStream;
import java.util.concurrent.CompletableFuture;

/**
 * A streamed music track that lives outside the resource pack system.
 *
 * <p>Vanilla resolves sounds through {@code sounds.json} and a {@link SoundLoader}. Fabric's
 * {@link FabricSoundInstance} exposes {@link #getAudioStream}, which is the hook that lets us hand
 * the engine a decoder for <em>any</em> Ogg file - one shipped in the jar, or one the player dropped
 * into the config folder. Everything downstream (OpenAL streaming, the Music volume slider, pausing
 * with the game) is vanilla's, so this costs nothing extra.
 */
public class TrackSoundInstance implements SoundInstance, FabricSoundInstance {
    /** How the bytes are obtained; called again each time the track restarts. */
    @FunctionalInterface
    public interface Source {
        InputStream open() throws IOException;
    }

    /** Builds an {@link AudioStream} outright - used when the decoder is not Ogg (HTTP/MP3). */
    @FunctionalInterface
    public interface StreamFactory {
        AudioStream open() throws IOException;
    }

    private final Identifier id;
    private final Source source;
    private final StreamFactory factory;
    private final boolean loop;
    private final Sound placeholder;

    private float volume;
    /** Called once when the decoder reports end-of-stream (runs on the sound thread). */
    private Runnable endListener;

    /** Vanilla-decodable source: bytes are handed to {@code OggAudioStream}. */
    public TrackSoundInstance(Identifier id, Source source, float volume, boolean loop) {
        this(id, source, null, volume, loop);
    }

    /** Pre-built decoder, e.g. {@code HttpAudioStream} which picks Ogg or MP3 itself. */
    public TrackSoundInstance(Identifier id, StreamFactory factory, float volume, boolean loop) {
        this(id, null, factory, volume, loop);
    }

    private TrackSoundInstance(Identifier id, Source source, StreamFactory factory,
                               float volume, boolean loop) {
        this.id = id;
        this.source = source;
        this.factory = factory;
        this.volume = volume;
        this.loop = loop;
        // never actually loaded - only used for the record's bookkeeping fields
        this.placeholder = new Sound(id, ConstantFloatProvider.create(1.0f),
                ConstantFloatProvider.create(1.0f), 1, Sound.RegistrationType.FILE, true, false, 0);
    }

    @Override
    public CompletableFuture<AudioStream> getAudioStream(SoundLoader loader, Identifier id, boolean loop) {
        try {
            AudioStream stream = factory != null
                    ? factory.open()
                    : new OggAudioStream(source.open());
            return CompletableFuture.completedFuture(new Watched(stream, this));
        } catch (Throwable t) {
            return CompletableFuture.failedFuture(t);
        }
    }

    public void setVolume(float volume) {
        this.volume = volume;
    }

    public void setEndListener(Runnable listener) {
        this.endListener = listener;
    }

    private void fireEnded() {
        Runnable listener = endListener;
        if (listener != null) {
            listener.run();
        }
    }

    /**
     * Delegating stream that reports end-of-stream. The sound engine gives no callback when a
     * stream runs dry, so a playlist has no way to advance without watching {@code read} return
     * null. Fires at most once per stream.
     */
    private static final class Watched implements AudioStream {
        private final AudioStream delegate;
        private final TrackSoundInstance owner;
        private boolean fired;

        Watched(AudioStream delegate, TrackSoundInstance owner) {
            this.delegate = delegate;
            this.owner = owner;
        }

        @Override
        public javax.sound.sampled.AudioFormat getFormat() {
            return delegate.getFormat();
        }

        @Override
        public java.nio.ByteBuffer read(int size) throws java.io.IOException {
            java.nio.ByteBuffer buffer = delegate.read(size);
            if (buffer == null && !fired) {
                fired = true;
                owner.fireEnded();
            }
            return buffer;
        }

        @Override
        public void close() throws java.io.IOException {
            delegate.close();
        }
    }

    @Override
    public Identifier getId() {
        return id;
    }

    @Override
    public WeightedSoundSet getSoundSet(net.minecraft.client.sound.SoundManager manager) {
        return new WeightedSoundSet(id, null);
    }

    @Override
    public Sound getSound() {
        return placeholder;
    }

    @Override
    public SoundCategory getCategory() {
        // so the vanilla "Music" volume slider controls it
        return SoundCategory.MUSIC;
    }

    @Override
    public boolean isRepeatable() {
        return loop;
    }

    @Override
    public boolean isRelative() {
        return true;
    }

    @Override
    public int getRepeatDelay() {
        return 0;
    }

    @Override
    public float getVolume() {
        return volume;
    }

    @Override
    public float getPitch() {
        return 1.0f;
    }

    @Override
    public double getX() {
        return 0;
    }

    @Override
    public double getY() {
        return 0;
    }

    @Override
    public double getZ() {
        return 0;
    }

    @Override
    public AttenuationType getAttenuationType() {
        return AttenuationType.NONE;
    }

    @Override
    public boolean shouldAlwaysPlay() {
        // keep playing when the Creative inventory opens, like background music
        return true;
    }
}
