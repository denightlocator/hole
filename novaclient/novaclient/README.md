# Nova Client (Fabric, Minecraft 1.21.11)

A clean HUD / UI client. No combat or movement cheats - only screen widgets and menus.

## Build
Needs JDK 21 and Gradle 9 (or copy `src/`, `build.gradle`, `gradle.properties`, `settings.gradle`
into a fresh clone of `FabricMC/fabric-example-mod` and use its wrapper).

    gradle build          # jar ends up in build/libs/novaclient-1.0.0.jar
    gradle runClient      # launch a dev client

Drop the jar plus Fabric API 0.141.1+1.21.11 into your `mods` folder (Fabric Loader >= 0.18).
If Gradle complains about a version, set `loader_version` to the latest on fabricmc.net/develop.

## Using it
- **Right Ctrl** opens the menu (rebind in Controls -> Nova Client). Works in-game, on the title screen and the pause menu.
- Click a card to toggle a widget, right-click or "Settings >" for its options.
- **Edit HUD** lets you drag widgets (snap to edges/center), scroll to resize, right-click for settings.
- Config saves to `config/novaclient.json`.

## Widgets
FPS, CPS, Ping, Coordinates, Clock, Speed, Memory, Keystrokes (animated), Armor Status, Potion Effects,
Staff List, Server Info, Spotify, YouTube, and a Theme page (accent hue / rainbow, opacity, shadow, accent bar).

### Staff List
Reads the public tab list. A player counts as staff if their name is in your list, or their team prefix / tab
display name contains a keyword (owner, admin, mod, helper...). Edit both lists in its settings.
Optional chat alert when staff join. Vanished staff are of course not listed.

### Spotify
1. https://developer.spotify.com/dashboard -> Create app.
2. Add Redirect URI exactly: `http://127.0.0.1:8888/callback`
3. Copy the Client ID into Spotify -> Settings, press **Connect to Spotify**, approve in the browser.
Shows art, title, artist, progress. Play/pause/next/previous buttons in settings (and bindable keys) need Spotify Premium.
The refresh token is stored in `config/novaclient-spotify.json` - don't share that file.

### YouTube
Paste one or more links (comma separated). Shows thumbnail, title and channel via YouTube's oEmbed endpoint.
It is a link card: video does not play inside Minecraft. "Open in browser" launches the link; "Next link" cycles the queue.

## Notes
Written against 1.21.11 Yarn APIs (Click/KeyInput events, Matrix3x2fStack drawing, RenderPipelines, HudElementRegistry).
This code has not been compiled in the environment it was written in - if a mapping name is off, the error will point right at it.
