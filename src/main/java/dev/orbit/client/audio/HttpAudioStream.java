package dev.orbit.client.audio;

import net.minecraft.client.sound.AudioStream;
import net.minecraft.client.sound.OggAudioStream;

import javax.sound.sampled.AudioFormat;
import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.ByteBuffer;

/**
 * Streams audio from an HTTP(S) URL.
 *
 * <p>Two formats are supported, and the format is detected from the bytes rather than trusted from
 * the URL, because radio servers lie about extensions constantly:
 * <ul>
 *   <li><b>Ogg Vorbis</b> - handed straight to vanilla's decoder.</li>
 *   <li><b>MP3</b> - decoded by {@link Mp3AudioStream} (JLayer).</li>
 * </ul>
 * Anything else (AAC, Opus/WebM, HLS playlists) is reported clearly instead of playing noise.
 *
 * <p>Connection is opened lazily on the first read so a failed URL fails at play time, and the
 * whole thing is streaming: nothing is buffered to disk, so an endless radio stream just keeps
 * working.
 */
public class HttpAudioStream implements AudioStream {
    private static final int CONNECT_TIMEOUT_MS = 8000;
    private static final int READ_TIMEOUT_MS = 15000;

    private final String url;
    private InputStream input;
    private AudioStream delegate;
    private boolean closed;

    public HttpAudioStream(String url) {
        this.url = url;
    }

    private void ensureOpen() throws IOException {
        if (delegate != null || closed) {
            return;
        }
        HttpURLConnection connection = (HttpURLConnection) URI.create(url).toURL().openConnection();
        connection.setConnectTimeout(CONNECT_TIMEOUT_MS);
        connection.setReadTimeout(READ_TIMEOUT_MS);
        // some radio servers refuse clients without a UA, and several reject HEAD/range probes
        connection.setRequestProperty("User-Agent", "OrbitClient/0.1.0");
        connection.setRequestProperty("Icy-MetaData", "0");
        connection.setInstanceFollowRedirects(true);
        connection.connect();

        if (connection.getResponseCode() >= 400) {
            throw new IOException("HTTP " + connection.getResponseCode() + " for " + url);
        }

        input = new BufferedInputStream(connection.getInputStream(), 64 * 1024);
        delegate = wrap(input);
    }

    /**
     * Sniffs the first bytes and picks a decoder.
     *
     * <p>The stream is wrapped in a {@link java.io.PushbackInputStream}-like buffer so the sniffed
     * bytes are still handed to the decoder.
     */
    private AudioStream wrap(InputStream raw) throws IOException {
        java.io.PushbackInputStream probe = new java.io.PushbackInputStream(raw, 12);
        byte[] header = new byte[12];
        int read = probe.read(header);
        if (read > 0) {
            probe.unread(header, 0, read);
        }

        boolean ogg = read >= 4 && header[0] == 'O' && header[1] == 'g' && header[2] == 'g' && header[3] == 'S';
        boolean id3 = read >= 3 && header[0] == 'I' && header[1] == 'D' && header[2] == '3';
        boolean mp3Frame = read >= 2 && (header[0] & 0xFF) == 0xFF && (header[1] & 0xE0) == 0xE0;

        if (ogg) {
            return new OggAudioStream(probe);
        }
        if (id3 || mp3Frame) {
            return new Mp3AudioStream(probe);
        }
        throw new IOException("Unsupported audio format at " + url
                + " - only Ogg Vorbis and MP3 can be decoded");
    }

    @Override
    public AudioFormat getFormat() {
        // the interface declares no checked exceptions; a connection failure surfaces from read()
        try {
            ensureOpen();
            return delegate.getFormat();
        } catch (IOException e) {
            throw new IllegalStateException("could not open " + url, e);
        }
    }

    @Override
    public ByteBuffer read(int size) throws IOException {
        ensureOpen();
        return delegate.read(size);
    }

    @Override
    public void close() throws IOException {
        closed = true;
        try {
            if (delegate != null) {
                delegate.close();
            }
        } finally {
            if (input != null) {
                input.close();
            }
        }
    }
}
