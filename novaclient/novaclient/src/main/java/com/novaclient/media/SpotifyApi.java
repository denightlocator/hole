package com.novaclient.media;

import com.google.gson.*;
import com.novaclient.util.Http;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.util.Util;

import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.*;

/**
 * Spotify Web API client using Authorization Code + PKCE (no client secret).
 * You create a free app at developer.spotify.com, add the redirect URI below, and paste its Client ID in the GUI.
 */
public final class SpotifyApi {
	public static final String REDIRECT = "http://127.0.0.1:8888/callback";
	private static final String API = "https://api.spotify.com/v1/me/player";
	private static final String SCOPES = "user-read-playback-state user-modify-playback-state user-read-currently-playing";

	public record Track(String title, String artist, String artUrl, long duration, long progress, boolean playing, long at) {}

	public static volatile Track current;
	public static volatile String status = "Not connected";
	public static volatile String note = "";
	public static volatile long noteAt, lastSeen;

	private static volatile String clientId = "", access, refresh;
	private static volatile long expiresAt;

	private static final ScheduledExecutorService EX = Executors.newScheduledThreadPool(2, r -> {
		Thread t = new Thread(r, "nova-spotify");
		t.setDaemon(true);
		return t;
	});

	private static Path file() { return FabricLoader.getInstance().getConfigDir().resolve("novaclient-spotify.json"); }

	public static void init() {
		try {
			if (Files.exists(file())) {
				JsonObject o = JsonParser.parseString(Files.readString(file())).getAsJsonObject();
				clientId = o.get("clientId").getAsString();
				refresh = o.get("refresh").getAsString();
				status = "Connected";
			}
		} catch (Exception ignored) {}
		EX.scheduleWithFixedDelay(() -> { try { poll(); } catch (Exception e) { status = "Network error"; } }, 3, 3, TimeUnit.SECONDS);
	}

	public static boolean connected() { return refresh != null; }
	private static void note(String s) { note = s; noteAt = System.currentTimeMillis(); }

	private static void save() {
		try {
			JsonObject o = new JsonObject();
			o.addProperty("clientId", clientId);
			o.addProperty("refresh", refresh);
			Files.writeString(file(), o.toString());
		} catch (Exception ignored) {}
	}

	public static void disconnect() {
		access = null; refresh = null; current = null; status = "Not connected";
		try { Files.deleteIfExists(file()); } catch (Exception ignored) {}
	}

	// ---------- login ----------

	public static void connect(String id) {
		if (id == null || id.isBlank()) { status = "Enter your Client ID first"; return; }
		clientId = id.trim();
		EX.execute(() -> {
			try {
				SecureRandom rnd = new SecureRandom();
				byte[] vb = new byte[48]; rnd.nextBytes(vb);
				String verifier = Base64.getUrlEncoder().withoutPadding().encodeToString(vb);
				String challenge = Base64.getUrlEncoder().withoutPadding()
						.encodeToString(MessageDigest.getInstance("SHA-256").digest(verifier.getBytes(StandardCharsets.US_ASCII)));
				String url = "https://accounts.spotify.com/authorize?response_type=code&client_id=" + enc(clientId)
						+ "&scope=" + enc(SCOPES) + "&redirect_uri=" + enc(REDIRECT)
						+ "&code_challenge_method=S256&code_challenge=" + challenge;
				try (ServerSocket ss = new ServerSocket(8888, 1, InetAddress.getByName("127.0.0.1"))) {
					ss.setSoTimeout(180_000);
					status = "Waiting for browser login...";
					Util.getOperatingSystem().open(URI.create(url));
					for (int i = 0; i < 5; i++) {
						try (Socket s = ss.accept()) {
							BufferedReader in = new BufferedReader(new InputStreamReader(s.getInputStream(), StandardCharsets.UTF_8));
							String line = in.readLine();
							if (line == null || !line.contains("/callback")) continue;
							String code = param(line, "code");
							String body = "<html><body style='font-family:sans-serif;background:#12121a;color:#fff;text-align:center;padding-top:80px'>"
									+ (code != null ? "<h2>Nova Client connected to Spotify</h2><p>You can close this tab.</p>" : "<h2>Login cancelled</h2>") + "</body></html>";
							byte[] b = body.getBytes(StandardCharsets.UTF_8);
							OutputStream out = s.getOutputStream();
							out.write(("HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: " + b.length + "\r\nConnection: close\r\n\r\n").getBytes());
							out.write(b);
							out.flush();
							if (code == null) { status = "Login cancelled"; return; }
							tokenCall("grant_type=authorization_code&code=" + enc(code) + "&redirect_uri=" + enc(REDIRECT)
									+ "&client_id=" + enc(clientId) + "&code_verifier=" + enc(verifier));
							return;
						}
					}
				}
			} catch (SocketTimeoutException e) {
				status = "Login timed out";
			} catch (Exception e) {
				status = "Login failed: " + e.getMessage();
			}
		});
	}

	private static String param(String requestLine, String key) {
		int q = requestLine.indexOf('?');
		if (q < 0) return null;
		String qs = requestLine.substring(q + 1, requestLine.indexOf(' ', q));
		for (String kv : qs.split("&")) {
			String[] p = kv.split("=", 2);
			if (p[0].equals(key) && p.length > 1) return URLDecoder.decode(p[1], StandardCharsets.UTF_8);
		}
		return null;
	}

	private static String enc(String s) { return URLEncoder.encode(s, StandardCharsets.UTF_8); }

	private static boolean tokenCall(String form) {
		try {
			Http.Resp r = Http.req("POST", "https://accounts.spotify.com/api/token",
					Map.of("Content-Type", "application/x-www-form-urlencoded"), form.getBytes(StandardCharsets.UTF_8));
			if (r.code() != 200) {
				status = "Auth error (" + r.code() + ") - check Client ID / redirect URI";
				if (r.code() == 400 && form.startsWith("grant_type=refresh_token")) { refresh = null; status = "Session expired - reconnect"; }
				return false;
			}
			JsonObject o = JsonParser.parseString(r.text()).getAsJsonObject();
			access = o.get("access_token").getAsString();
			if (o.has("refresh_token")) refresh = o.get("refresh_token").getAsString();
			expiresAt = System.currentTimeMillis() + o.get("expires_in").getAsLong() * 1000;
			save();
			status = "Connected";
			return true;
		} catch (Exception e) {
			status = "Network error";
			return false;
		}
	}

	private static boolean ensureToken() {
		if (refresh == null) return false;
		if (access != null && System.currentTimeMillis() < expiresAt - 30_000) return true;
		return tokenCall("grant_type=refresh_token&refresh_token=" + enc(refresh) + "&client_id=" + enc(clientId));
	}

	private static Map<String, String> auth() { return Map.of("Authorization", "Bearer " + access); }

	// ---------- playback ----------

	private static void poll() throws Exception {
		if (refresh == null || System.currentTimeMillis() - lastSeen > 2500) return;
		if (!ensureToken()) return;
		Http.Resp r = Http.req("GET", API + "/currently-playing?additional_types=episode", auth(), null);
		if (r.code() == 204 || r.data().length == 0) { current = null; return; }
		if (r.code() == 401) { expiresAt = 0; return; }
		if (r.code() != 200) return;
		JsonObject o = JsonParser.parseString(r.text()).getAsJsonObject();
		if (!o.has("item") || o.get("item").isJsonNull()) { current = null; return; }
		JsonObject item = o.getAsJsonObject("item");
		String artist = "";
		if (item.has("artists")) {
			StringBuilder sb = new StringBuilder();
			for (JsonElement a : item.getAsJsonArray("artists")) { if (sb.length() > 0) sb.append(", "); sb.append(a.getAsJsonObject().get("name").getAsString()); }
			artist = sb.toString();
		} else if (item.has("show")) artist = item.getAsJsonObject("show").get("publisher").getAsString();
		JsonArray imgs = null;
		if (item.has("album")) imgs = item.getAsJsonObject("album").getAsJsonArray("images");
		else if (item.has("images")) imgs = item.getAsJsonArray("images");
		String art = imgs != null && imgs.size() > 0 ? imgs.get(imgs.size() - 1).getAsJsonObject().get("url").getAsString() : "";
		long prog = o.has("progress_ms") && !o.get("progress_ms").isJsonNull() ? o.get("progress_ms").getAsLong() : 0;
		current = new Track(item.get("name").getAsString(), artist, art, item.get("duration_ms").getAsLong(), prog,
				o.get("is_playing").getAsBoolean(), System.currentTimeMillis());
	}

	private static void cmd(String method, String path) {
		if (refresh == null) { note("Spotify not connected"); return; }
		EX.execute(() -> {
			try {
				if (!ensureToken()) return;
				Http.Resp r = Http.req(method, API + path, auth(), null);
				if (r.code() == 403) note("Spotify Premium is required for controls");
				else if (r.code() == 404) note("No active Spotify device - start playing somewhere");
				else { Thread.sleep(450); poll(); }
			} catch (Exception e) { note("Network error"); }
		});
	}

	public static void togglePlay() {
		Track t = current;
		if (t != null) current = new Track(t.title(), t.artist(), t.artUrl(), t.duration(), t.progress(), !t.playing(), System.currentTimeMillis());
		cmd("PUT", t != null && t.playing() ? "/pause" : "/play");
	}
	public static void next() { cmd("POST", "/next"); }
	public static void previous() { cmd("POST", "/previous"); }
}
