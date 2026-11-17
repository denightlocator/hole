# Arena Shell

A one-file download: **`start.bat`** pulls the whole app from this repo and launches it. It connects to a website (default: `https://arena.ai/agent`) in its own window — same UI, same session, no browser tabs — with **custom themes** that re-skin both the shell and the site it loads (Claude Code, ChatGPT, Claude Light, Midnight Mono).

![Arena Shell](docs/screens/01-default-arena.png)

| Theme | Applied to the shell **and** the connected page |
| --- | --- |
| Claude Code | ![Claude Code](docs/screens/02-theme-claude-code.png) |
| ChatGPT (full re-skin) | ![ChatGPT](docs/screens/03-theme-chatgpt-reskin.png) |
| Claude Light (full re-skin) | ![Claude Light](docs/screens/04-theme-claude-light-reskin.png) |
| Midnight Mono (full re-skin) | ![Midnight](docs/screens/05-theme-midnight-reskin.png) |

---

## Download & run

### Yes — `start.bat` is the only file you need

Download **[`start.bat`](start.bat)** (right-click → Save link as). Put it anywhere — Desktop,
a folder, a USB stick — and double-click it.

It then does everything else by itself:

| Step | What happens | Size |
| --- | --- | --- |
| 1 | Fetches the app source from GitHub (`codeload` zip, no git needed) | ~3 MB |
| 2 | Fetches the Electron runtime matching `package.json` | ~110 MB, once |
| 3 | Installs both into `%LOCALAPPDATA%\ArenaShell` | — |
| 4 | Writes first-run settings (opens `https://arena.ai/agent`) | — |
| 5 | Launches the app | — |

Run it again any time. It asks GitHub whether the branch has new commits and
**updates itself** if so — steps 2–5 are skipped because the runtime and the zip
are cached in `%LOCALAPPDATA%\ArenaShellCache`, so an update takes a few seconds.

**Uninstall:** delete `%LOCALAPPDATA%\ArenaShell` (and optionally `ArenaShellCache`).

macOS / Linux: `bash start.sh` does the same thing.

`start.bat` takes no arguments, but you can edit the top of the file:

```bat
set "ARENA_REPO=denightlocator/hole"
set "ARENA_REF=arena/67ffee91-hole"   REM branch, tag, or commit sha
```

If `bootstrap.ps1` isn't sitting next to `start.bat`, the launcher downloads it
first — so `start.bat` really is enough on its own.

> Behind a corporate proxy that inspects TLS, run once with
> `set HTTPS_PROXY=http://host:port` and PowerShell 5.1+ will use it.

### Prefer a normal installer instead?

`dist:win` builds `Arena-Shell-Setup-1.0.0.exe` (installer) and
`Arena-Shell-Portable-1.0.0.exe` (no install). That bundles everything, so there
is no download step — at the cost of a much bigger file and no self-update.
To build it on CI, paste
[`docs/ci-build.yml`](docs/ci-build.yml) in as `.github/workflows/build.yml`
(this sandbox's token can't create workflow files), then
Actions → **Build Arena Shell** → **Run workflow**.

```bash
npm install
npm run dist:win        # -> dist/*.exe  (run on Windows)
npm start              # or just run it in place
```

## What it does on launch

1. Opens the shell window (theme applied instantly from your saved settings).
2. Runs **`app-start.bat`** — the in-app startup hook — via `cmd.exe /c`, streaming its stdout/stderr into the console.
3. Loads your connected website in an isolated `<webview>` and injects the theme.

There are two batch files, and the difference matters:

| File | Runs | Purpose |
| --- | --- | --- |
| `start.bat` | You double-click it | **Launcher:** downloads + updates the app, then starts it |
| `app-start.bat` | The app, on every boot | **Your hook:** start a local server, set env vars, run a proxy |

The app refuses to run the launcher from inside itself (that would recurse),
and `runScriptOnStartup` is seeded to `false` by the launcher since it already
ran your setup path once.

`app-start.bat` is yours to edit and exports a few variables other scripts can use:

| Variable | Meaning |
| --- | --- |
| `ARENA_SHELL` | `1` when running inside the app |
| `ARENA_SHELL_HOME` | folder the script was run from |
| `ARENA_SHELL_HOME_URL` | the URL the shell is about to open |

It will also auto-run `proxy.js` (if present, using `node`) and `helpers\boot.ps1` (if present). On macOS/Linux the equivalents are `start.sh` / `app-start.sh`.

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
start.bat              <- THE ONLY FILE YOU NEED: downloads + launches
start.sh               <- macOS/Linux launcher
bootstrap.ps1          <- download/install/update logic behind start.bat
bootstrap.sh           <- macOS/Linux version
app-start.bat          <- runs inside the app on boot (edit me)
app-start.sh           <- macOS/Linux equivalent
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
docs/ci-build.yml       build recipe for the .exe (paste into Actions)
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
