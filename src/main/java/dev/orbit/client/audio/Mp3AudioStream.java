package dev.orbit.client.audio;

import javazoom.jl.decoder.Bitstream;
import javazoom.jl.decoder.Decoder;
import javazoom.jl.decoder.Header;
import javazoom.jl.decoder.SampleBuffer;
import net.minecraft.client.sound.AudioStream;

import javax.sound.sampled.AudioFormat;
import java.io.IOException;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;

/**
 * MP3 -> PCM decoder for the music player.
 *
 * <p>Vanilla's {@code OggAudioStream} handles Ogg Vorbis only, so MP3 files and MP3 internet radio
 * need their own decoder. JLayer decodes frame by frame; this class converts its output to the one
 * format the sound engine is fed here - 44100 Hz, 16-bit, stereo, little endian - resampling and
 * up/downmixing as needed, and keeps a carry position so consecutive frames join sample-accurately.
 *
 * <p>Everything is pull-based: {@link #read(int)} decodes only as much as the engine asks for, which
 * is what makes endless radio streams work without buffering the whole song.
 */
public class Mp3AudioStream implements AudioStream {
    private static final int OUT_RATE = 44100;
    private static final int OUT_CHANNELS = 2;
    private static final AudioFormat FORMAT =
            new AudioFormat(OUT_RATE, 16, OUT_CHANNELS, true, false);

    private final Bitstream bitstream;
    private final Decoder decoder = new Decoder();

    /** Sample-accurate resampler state carried between frames. */
    private double sourcePosition = 0.0;
    private int[] previous = new int[]{0, 0};
    private boolean finished;

    /** Leftover PCM, already converted, waiting to be handed out. */
    private byte[] pending = new byte[0];
    private int pendingOffset;

    public Mp3AudioStream(InputStream input) {
        this.bitstream = new Bitstream(input);
    }

    @Override
    public AudioFormat getFormat() {
        return FORMAT;
    }

    @Override
    public ByteBuffer read(int size) throws IOException {
        int wanted = Math.max(2, size - (size % 4));
        byte[] out = new byte[wanted];
        int written = 0;

        while (written < wanted) {
            if (pendingOffset < pending.length) {
                int take = Math.min(pending.length - pendingOffset, wanted - written);
                System.arraycopy(pending, pendingOffset, out, written, take);
                pendingOffset += take;
                written += take;
                continue;
            }
            if (finished || !decodeNextFrame()) {
                finished = true;
                break;
            }
        }

        if (written == 0) {
            return null;
        }
        ByteBuffer buffer = ByteBuffer.allocateDirect(written).order(ByteOrder.nativeOrder());
        buffer.put(out, 0, written);
        buffer.flip();
        return buffer;
    }

    /** Decodes one MP3 frame into {@link #pending}. @return false at end of stream. */
    private boolean decodeNextFrame() {
        try {
            Header header = bitstream.readFrame();
            if (header == null) {
                return false;
            }
            SampleBuffer samples = (SampleBuffer) decoder.decodeFrame(header, bitstream);
            short[] pcm = samples.getBuffer();
            int length = samples.getBufferLength();
            int channels = samples.getChannelCount();
            int rate = samples.getSampleFrequency();
            bitstream.closeFrame();

            pending = convert(pcm, length, channels, rate);
            pendingOffset = 0;
            return pending.length > 0;
        } catch (Throwable t) {
            // a corrupt frame mid-stream should not kill playback
            return false;
        }
    }

    /** Interleaved PCM -> 44.1 kHz stereo 16-bit little endian. */
    private byte[] convert(short[] pcm, int length, int channels, int rate) {
        if (length <= 0 || channels <= 0) {
            return new byte[0];
        }
        int frames = length / channels;
        double step = (double) rate / OUT_RATE;

        ByteBuffer out = ByteBuffer.allocate(frames * 2 * OUT_CHANNELS * 2)
                .order(ByteOrder.LITTLE_ENDIAN);

        double position = sourcePosition;
        while (position < frames - 1) {
            int index = (int) position;
            double fraction = position - index;

            for (int channel = 0; channel < OUT_CHANNELS; channel++) {
                int sourceChannel = Math.min(channel, channels - 1);
                int a = pcm[index * channels + sourceChannel];
                int b = pcm[(index + 1) * channels + sourceChannel];
                int sample = (int) Math.round(a + (b - a) * fraction);
                if (position < 1.0) {
                    // blend from the previous frame's last sample so frames join cleanly
                    sample = (int) Math.round(previous[channel] + (sample - previous[channel]) * position);
                }
                out.putShort((short) Math.max(Short.MIN_VALUE, Math.min(Short.MAX_VALUE, sample)));
            }
            position += step;
        }

        for (int channel = 0; channel < OUT_CHANNELS; channel++) {
            int sourceChannel = Math.min(channel, channels - 1);
            previous[channel] = pcm[(frames - 1) * channels + sourceChannel];
        }
        sourcePosition = position - frames;

        byte[] bytes = new byte[out.position()];
        out.flip();
        out.get(bytes);
        return bytes;
    }

    @Override
    public void close() throws IOException {
        finished = true;
        try {
            bitstream.close();
        } catch (Throwable ignored) {
            // closing an already-finished stream is not an error
        }
    }
}
