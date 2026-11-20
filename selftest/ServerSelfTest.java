import dev.orbit.client.audio.LocalAudioServer;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

/**
 * Exercises the loopback audio server for real: it starts it, then makes HTTP requests at it.
 *
 * <pre>
 * cd tools/selftest
 * javac -d out ../../src/main/java/dev/orbit/client/audio/LocalAudioServer.java ServerSelfTest.java
 * java -cp out ServerSelfTest
 * </pre>
 *
 * Checks the four things that actually break in a hand-written file server: content type, byte
 * length, Range slicing, and out-of-range rejection.
 */
public class ServerSelfTest {
    private static int failures = 0;

    public static void main(String[] args) throws Exception {
        Path dir = Files.createTempDirectory("orbit-audio");
        Path ogg = dir.resolve("All the Things She Said - t.A.T.u..ogg");
        Path mp3 = dir.resolve("track.mp3");

        byte[] payload = new byte[100_000];
        for (int i = 0; i < payload.length; i++) {
            payload[i] = (byte) (i % 251);
        }
        Files.write(ogg, payload);
        Files.write(mp3, payload);

        LocalAudioServer server = LocalAudioServer.get();
        check("server starts", server.start());
        check("port assigned", server.port() > 0);
        server.setTracks(List.of(ogg, mp3));

        String url = server.urlFor(0);
        System.out.println("url: " + url);
        check("url is loopback", url != null && url.startsWith("http://127.0.0.1:"));

        HttpClient http = HttpClient.newHttpClient();

        // 1. full GET: status, content type, exact length
        HttpResponse<byte[]> full = http.send(
                HttpRequest.newBuilder(URI.create(url)).GET().build(),
                HttpResponse.BodyHandlers.ofByteArray());
        check("200 OK", full.statusCode() == 200);
        check("content-type audio/ogg", "audio/ogg".equals(full.headers().firstValue("Content-Type").orElse("")));
        check("accept-ranges: bytes", "bytes".equals(full.headers().firstValue("Accept-Ranges").orElse("")));
        check("full body length", full.body().length == payload.length);

        // 2. MP3 content type
        HttpResponse<byte[]> mp3Response = http.send(
                HttpRequest.newBuilder(URI.create(server.urlFor(1))).GET().build(),
                HttpResponse.BodyHandlers.ofByteArray());
        check("content-type audio/mpeg", "audio/mpeg".equals(
                mp3Response.headers().firstValue("Content-Type").orElse("")));

        // 3. Range request -> 206 with exactly the requested slice
        HttpResponse<byte[]> partial = http.send(
                HttpRequest.newBuilder(URI.create(url)).header("Range", "bytes=1000-1999").GET().build(),
                HttpResponse.BodyHandlers.ofByteArray());
        check("206 partial", partial.statusCode() == 206);
        check("content-range header", "bytes 1000-1999/100000".equals(
                partial.headers().firstValue("Content-Range").orElse("")));
        check("partial length 1000", partial.body().length == 1000);
        check("partial bytes correct", partial.body()[0] == payload[1000]
                && partial.body()[999] == payload[1999]);

        // 4. open-ended range to EOF
        HttpResponse<byte[]> tail = http.send(
                HttpRequest.newBuilder(URI.create(url)).header("Range", "bytes=90000-").GET().build(),
                HttpResponse.BodyHandlers.ofByteArray());
        check("open-ended range length", tail.body().length == 10_000);

        // 5. unsatisfiable range -> 416
        HttpResponse<byte[]> bad = http.send(
                HttpRequest.newBuilder(URI.create(url)).header("Range", "bytes=999999-").GET().build(),
                HttpResponse.BodyHandlers.ofByteArray());
        check("416 on bad range", bad.statusCode() == 416);

        // 6. unknown / untokened paths 404
        HttpResponse<byte[]> missing = http.send(
                HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + server.port() + "/audio.mp3"))
                        .GET().build(),
                HttpResponse.BodyHandlers.ofByteArray());
        check("404 without token", missing.statusCode() == 404);

        HttpResponse<byte[]> outOfRange = http.send(
                HttpRequest.newBuilder(URI.create(server.baseUrl() + "/track/99")).GET().build(),
                HttpResponse.BodyHandlers.ofByteArray());
        check("404 for bad index", outOfRange.statusCode() == 404);

        server.stop();
        check("server stops", !server.running());

        System.out.println(failures == 0 ? "\nALL CHECKS PASSED" : "\n" + failures + " CHECK(S) FAILED");
        if (failures > 0) {
            System.exit(1);
        }
    }

    private static void check(String label, boolean ok) {
        System.out.println((ok ? "  ok   " : "  FAIL ") + label);
        if (!ok) {
            failures++;
        }
    }
}
