package com.novaclient.module;

public enum Category {
	INFO("Info"), PLAYER("Player"), SERVER("Server"), MEDIA("Media"), CLIENT("Client");
	public final String label;
	Category(String l) { label = l; }
}
