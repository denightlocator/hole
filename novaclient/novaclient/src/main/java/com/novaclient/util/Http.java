package com.novaclient.util;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.*;

public final class Http {
	public record Resp(int code, byte[] data) {
		public String text() { return new String(data, StandardCharsets.UTF_8); }
	}

	public static final ExecutorService EX = Executors.newFixedThreadPool(3, r -> {
		Thread t = new Thread(r, "nova-http");
		t.setDaemon(true);
		return t;
	});

	public static Resp req(String method, String url, Map<String, String> headers, byte[] body) throws IOException {
		HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
		c.setRequestMethod(method);
		c.setConnectTimeout(8000);
		c.setReadTimeout(10000);
		c.setRequestProperty("User-Agent", "NovaClient/1.0");
		if (headers != null) headers.forEach(c::setRequestProperty);
		if (method.equals("POST") || method.equals("PUT")) {
			c.setDoOutput(true);
			try (OutputStream o = c.getOutputStream()) { if (body != null) o.write(body); }
		}
		int code = c.getResponseCode();
		InputStream in = code >= 400 ? c.getErrorStream() : c.getInputStream();
		byte[] data = in == null ? new byte[0] : in.readAllBytes();
		c.disconnect();
		return new Resp(code, data);
	}

	public static Resp get(String url) throws IOException { return req("GET", url, null, null); }
}
