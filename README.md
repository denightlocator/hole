# Arena Shell

A downloadable desktop app that **runs `start.bat` on launch**, then **connects to a website** (default: `https://arena.ai/agent`) in its own window — same UI, same session, no browser tabs — with **custom themes** that re-skin both the shell and the site it loads (Claude Code, ChatGPT, Claude Light, Midnight Mono).

![Arena Shell](docs/screens/01-default-arena.png)

---

## Download & run

### Option A — grab a prebuilt Windows `.exe` (recommended)

1. Go to the **Actions** tab → **Build Arena Shell** → **Run workflow**.
2. When it finishes, open the run and download the **`arena-shell-windows`** artifact.
3. Unzip it and run:
   - **`Arena-Shell-Portable-1.0.0.exe`** — no install, just double-click.
   - **`Arena-Shell-Setup-1.0.0.exe`** — normal installer (Start-menu entry, uninstaller).

You can also tag a release and the workflow attaches both `.exe` files to it:

```bash
git tag v1.0.0 && git push origin v1.0.0
```

### Option B — build it yourself

```bash
npm install
npm run dist:win     # -> dist/*.exe   (run this on Windows)
npm start            # or just run it locally without packaging
```

Other platforms: `npm run dist:linux` (AppImage), or `npx electron-builder --mac`.

---

## What it does on launch

1. Opens the shell window (theme applied instantly from your saved settings).
2. Runs **`start.bat`** — the real file in the app folder, via `cmd.exe /c` — and streams its stdout/stderr into the in-app console.
3. Loads your connected website in an isolated `<webview>` and injects the theme.

`start.bat` is yours to edit. It's a normal batch file with commented sections, and it exports a few variables other scripts can use:

| Variable | Meaning |
| --- | --- |
| `ARENA_SHELL` | `1` when running inside the app |
| `ARENA_SHELL_HOME` | folder the script was run from |
| `ARENA_SHELL_HOME_URL` | the URL the shell is about to open |

It will also auto-run `proxy.js` (if present, using `node`) and `helpers\boot.ps1` (if present). On macOS/Linux the equivalent is `start.sh`.

Press **Ctrl+`** (or the terminal icon) any time to open the live script console, and **Ctrl+,** for settings.

---

## Theming

Five presets ship in `ui/themes.js`:

| Theme | Look |
| --- | --- |
| **Arena Shell** | Deep space navy, violet glow *(default)* |
| **Claude Code** | Near-black, monospace, terracotta prompts |
| **ChatGPT** | Flat `#212121` canvas, sidebar rail, green accent |
| **Claude (Light)** | Warm paper background, terracotta buttons |
| **Midnight Mono** | Near-black, hairline borders, cyan accent |

Each theme is just a set of design tokens (backgrounds, borders, text, accent, fonts, radius, shadow). Changing a token repaints **everything** — the shell chrome *and* the connected web app.

### Custom stuff you can change in-app (Settings → Appearance / Web app / Advanced)

- Accent color, UI font, monospace font
- Base font size, corner radius, interface scale, density (compact / cozy / roomy)
- Animations on/off, translucent chrome, sidebar + status bar visibility
- **Page restyling level**: `Off` · `Subtle` (scrollbars, selection, fonts) · `Full re-skin` (forces backgrounds/text — makes a light site dark)
- Page zoom
- **Custom CSS** injected straight into the connected site

Settings + connections + window bounds live in one JSON file:

```
%APPDATA%\Arena Shell\settings.json      (Windows)
~/Library/Application Support/Arena Shell/settings.json   (macOS)
~/.config/Arena Shell/settings.json      (Linux)
```

**Export / Import / Reset** are in Settings → Advanced.

### Adding your own theme

Add an entry to `THEMES` in `ui/themes.js` — no build step:

```js
'my-theme': {
  name: 'My Theme',
  blurb: 'Short description shown on the card.',
  swatch: ['#101014', '#ff7a45'],
  tokens: { 'bg-app': '#101014', 'accent': '#ff7a45', /* ...rest of the token bag */ },
  page: { background: '#101014', text: '#f2f2f2', scheme: 'dark', font: null }
}
```

---

## Shortcuts

| Keys | Action |
| --- | --- |
| `Ctrl/Cmd + ,` | Settings |
| `Ctrl/Cmd + B` | Toggle sidebar |
| `` Ctrl/Cmd + ` `` | Toggle script console |
| `Ctrl/Cmd + L` | Focus the URL bar |
| `Ctrl/Cmd + N` | New connection |
| `Ctrl/Cmd + R` | Run the start script |
| `Ctrl/Cmd + Shift + R` | Reload the web page |
| `Esc` | Close settings / modal |

---

## Project layout

```
start.bat              <- the script the app runs (edit me)
start.sh               <- macOS/Linux equivalent
electron/
  main.js              window, IPC, start-script runner, menu
  preload.js           narrow contextBridge API (no generic invoke)
  settings-store.js    atomic JSON settings with debounced writes
ui/
  index.html           shell layout
  shell.css            chrome styles, entirely token-driven
  shell.js             renderer: webview, settings, console
  themes.js            theme tokens -> CSS variables + injected page CSS
scripts/
  preview-server.js    run the UI in a normal browser (no Electron needed)
  screenshot.js        dev-only screenshot pass
test/main.test.cjs     headless checks for main-process behaviour
.github/workflows/     builds the .exe on CI
```

## Developing

```bash
npm install
npm start                 # run the real app
npm test                  # headless checks: settings, IPC, script runner
npm run preview           # http://localhost:4600 — UI in a browser, stubbed bridge
```

`npm start` downloads the Electron binary on first run. If you're behind a corporate
TLS-inspecting proxy and that download fails, set `NODE_EXTRA_CA_CERTS` to your
proxy's root certificate (or `ELECTRON_SKIP_BINARY_DOWNLOAD=1` if the binary is
already cached).

## Notes & limitations

- Arena Shell is a **shell**, not a fork: it renders the connected site in a
  Chromium `<webview>` and injects CSS. Nothing is reverse-engineered, and the
  site's own JS keeps running.
- Logins/persistence use the app's own profile, separate from your browser — you
  may need to sign in once inside the shell.
- `Full re-skin` is deliberately blunt (it forces background/text colors). On
  complex sites a few elements may need patching via **Custom CSS**; `Subtle` is
  the safe default.
- External links open in your real browser instead of hijacking the shell.

## License

MIT
