package com.novaclient.util;

import net.minecraft.client.MinecraftClient;
import org.lwjgl.glfw.GLFW;
import java.util.ArrayDeque;
import java.util.Deque;

/** Polls the mouse each frame (no mixins needed) to compute CPS and button state. */
public final class Input {
	public static boolean leftDown, rightDown;
	private static final Deque<Long> L = new ArrayDeque<>(), R = new ArrayDeque<>();

	public static void poll(MinecraftClient mc) {
		long win = mc.getWindow().getHandle();
		boolean l = GLFW.glfwGetMouseButton(win, 0) == GLFW.GLFW_PRESS;
		boolean r = GLFW.glfwGetMouseButton(win, 1) == GLFW.GLFW_PRESS;
		long now = System.currentTimeMillis();
		if (mc.currentScreen == null) {
			if (l && !leftDown) L.add(now);
			if (r && !rightDown) R.add(now);
		}
		leftDown = l;
		rightDown = r;
		while (!L.isEmpty() && now - L.peekFirst() > 1000) L.pollFirst();
		while (!R.isEmpty() && now - R.peekFirst() > 1000) R.pollFirst();
	}

	public static int cpsL() { return L.size(); }
	public static int cpsR() { return R.size(); }
}
