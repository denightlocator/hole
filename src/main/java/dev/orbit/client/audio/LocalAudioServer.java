package dev.orbit.client.audio;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Tiny loopback HTTP server that serves local audio files to the music player.
 *
 * <p>Bound to the loopback interface only, so nothing outside this machine can reach it, and the
 * path carries a random token so other local applications cannot trivially stream the user's files.
 * Port is 0 (let the OS choose) - a fixed port would collide with whatever else is running.
 *
 * <p>Range requests are supported properly ({@code 206}, {@code Content-Range},
 * {@code Accept-Ranges}) because that is what lets a player resume mid-file and it is the one thing
 * naive file servers get wrong.
 *
 * <p>Deliberately free of Minecraft imports so it can be exercised by
 * {@code tools/selftest/ServerSelfTest.java}.
 */
public final class LocalAudioServer {
    private static LocalAudioServer instance;

    private final List<Path> tracks = new CopyOnWriteArrayList<>();
    private HttpServer server;
    private String token;
    private int port;

    private LocalAudioServer() {
    }

    public static synchronized LocalAudioServer get() {
        if (instance == null) {
            instance = new LocalAudioServer();
        }
        return instance;
    }

    /** Starts the server if it is not already running. @return true when it is listening. */
    public synchronized boolean start() {
        if (server != null) {
            return true;
        }
        try {
            byte[] random = new byte[8];
            new SecureRandom().nextBytes(random);
            token = HexFormat.of().formatHex(random);

            // baseUrl() uses IPv4 loopback; bind to that same address even if Java prefers IPv6.
            server = HttpServer.create(new InetSocketAddress(InetAddress.getByName("127.0.0.1"), 0), 0);
            server.createContext("/", this::handle);
            server.setExecutor(null);   // single-threaded is plenty for one stream
            server.start();
            port = server.getAddress().getPort();
            return true;
        } catch (Throwable t) {
            server = null;
            return false;
        }
    }

    public synchronized void stop() {
        if (server != null) {
            server.stop(0);
            server = null;
        }
        tracks.clear();
    }

    public synchronized boolean running() {
        return server != null;
    }

    public synchronized int port() {
        return port;
    }

    /** Replaces the playlist; returns the base URL prefix, or {@code null} when not running. */
    public synchronized String setTracks(List<Path> files) {
        tracks.clear();
        for (Path file : files) {
            if (file != null && Files.isReadable(file)) {
                tracks.add(file);
            }
        }
        return server == null ? null : baseUrl();
    }

    public int trackCount() {
        return tracks.size();
    }

    /** {@code http://127.0.0.1:port/<token>} */
    public synchronized String baseUrl() {
        return port == 0 || token == null ? null : "http://127.0.0.1:" + port + "/" + token;
    }

    /** URL for a track index, or {@code null} when out of range or not running. */
    public synchronized String urlFor(int index) {
        String base = baseUrl();
        if (base == null || index < 0 || index >= tracks.size()) {
            return null;
        }
        return base + "/track/" + index;
    }

    // ── request handling ────────────────────────────────────────────────
    private void handle(HttpExchange exchange) throws IOException {
        try {
            String path = exchange.getRequestURI().getPath();
            String prefix = "/" + token + "/track/";
            if (!path.startsWith(prefix)) {
                respond(exchange, 404, "text/plain", "not found".getBytes());
                return;
            }

            int index;
            try {
                index = Integer.parseInt(path.substring(prefix.length()));
            } catch (NumberFormatException e) {
                respond(exchange, 400, "text/plain", "bad track index".getBytes());
                return;
            }

            List<Path> snapshot = new ArrayList<>(tracks);
            if (index < 0 || index >= snapshot.size()) {
                respond(exchange, 404, "text/plain", "no such track".getBytes());
                return;
            }

            Path file = snapshot.get(index);
            long length = Files.size(file);
            String contentType = contentType(file.getFileName().toString());

            exchange.getResponseHeaders().set("Content-Type", contentType);
            exchange.getResponseHeaders().set("Accept-Ranges", "bytes");
            exchange.getResponseHeaders().set("Cache-Control", "no-store");

            String range = exchange.getRequestHeaders().getFirst("Range");
            if (range != null && range.startsWith("bytes=")) {
                long[] span = parseRange(range.substring(6), length);
                if (span == null) {
                    exchange.getResponseHeaders().set("Content-Range", "bytes */" + length);
                    respond(exchange, 416, "text/plain", new byte[0]);
                    return;
                }
                long start = span[0];
                long end = span[1];
                long count = end - start + 1;

                exchange.getResponseHeaders().set("Content-Range",
                        "bytes " + start + "-" + end + "/" + length);
                exchange.sendResponseHeaders(206, count);
                try (OutputStream out = exchange.getResponseBody()) {
                    streamSlice(file, start, count, out);
                }
                return;
            }

            // HEAD gets the headers only, which players use to probe support
            if ("HEAD".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.getResponseHeaders().set("Content-Length", String.valueOf(length));
                exchange.sendResponseHeaders(200, -1);
                exchange.close();
                return;
            }

            exchange.sendResponseHeaders(200, length);
            try (OutputStream out = exchange.getResponseBody()) {
                streamSlice(file, 0, length, out);
            }
        } catch (Throwable t) {
            try {
                respond(exchange, 500, "text/plain", ("error: " + t).getBytes());
            } catch (Throwable ignored) {
                // client went away; nothing useful to do
            }
        } finally {
            exchange.close();
        }
    }

    /** Copies {@code count} bytes starting at {@code start}. */
    private static void streamSlice(Path file, long start, long count, OutputStream out)
            throws IOException {
        try (var channel = Files.newByteChannel(file)) {
            channel.position(start);
            byte[] buffer = new byte[16 * 1024];
            long remaining = count;
            while (remaining > 0) {
                int want = (int) Math.min(buffer.length, remaining);
                int read = channel.read(java.nio.ByteBuffer.wrap(buffer, 0, want));
                if (read <= 0) {
                    break;
                }
                out.write(buffer, 0, read);
                remaining -= read;
            }
            out.flush();
        }
    }

    /** Parses {@code start-end} / {@code start-} / {@code -suffix}; null when unsatisfiable. */
    static long[] parseRange(String spec, long length) {
        try {
            int dash = spec.indexOf('-');
            if (dash < 0) {
                return null;
            }
            String left = spec.substring(0, dash).trim();
            String right = spec.substring(dash + 1).trim();

            long start;
            long end;
            if (left.isEmpty()) {
                // suffix form: last N bytes
                long suffix = Long.parseLong(right);
                if (suffix <= 0) {
                    return null;
                }
                start = Math.max(0, length - suffix);
                end = length - 1;
            } else {
                start = Long.parseLong(left);
                end = right.isEmpty() ? length - 1 : Long.parseLong(right);
            }
            if (start < 0 || start >= length || end < start) {
                return null;
            }
            return new long[]{start, Math.min(end, length - 1)};
        } catch (NumberFormatException e) {
            return null;
        }
    }

    static String contentType(String name) {
        String lower = name.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".mp3")) {
            return "audio/mpeg";
        }
        if (lower.endsWith(".ogg") || lower.endsWith(".oga")) {
            return "audio/ogg";
        }
        if (lower.endsWith(".wav")) {
            return "audio/wav";
        }
        if (lower.endsWith(".m4a") || lower.endsWith(".aac")) {
            return "audio/mp4";
        }
        return "application/octet-stream";
    }

    private static void respond(HttpExchange exchange, int status, String type, byte[] body)
            throws IOException {
        exchange.getResponseHeaders().set("Content-Type", type);
        exchange.sendResponseHeaders(status, body.length == 0 ? -1 : body.length);
        if (body.length > 0) {
            try (OutputStream out = exchange.getResponseBody()) {
                out.write(body);
            }
        }
    }
}
