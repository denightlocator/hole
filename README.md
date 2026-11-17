# Hole

One codebase. Runs as a **website** in the browser, installs as an **app** on phone and desktop.

---

## The short answer

You do **not** rebuild your site. You **wrap** it. There are four levels, depending on how "app-like" you need it:

| # | Approach | What it produces | Store? | Effort |
|---|----------|------------------|--------|--------|
| 1 | **PWA** (this repo, working now) | Website that installs to home screen / desktop, own icon, fullscreen, offline | No store needed (Chrome/Edge do offer Play Store listing) | ~30 min |
| 2 | **Capacitor** | Real native `.ipa` / `.apk` from the same HTML — App Store + Play Store | Yes | ~1 day + store review |
| 3 | **Electron / Tauri** | Windows / macOS / Linux desktop app | Optional (signed installers) | ~half a day |
| 4 | **Native WebView** (Swift / Kotlin) | Thin native shell around your site, full native SDK access | Yes | Most work, most control |

All four keep **the same UI and the same code**. That's the point.

---

## 1. PWA — already set up in this repo

Files that matter:

- `index.html` — the site. Notice `<link rel="manifest">`, the `theme-color` meta, `apple-mobile-web-app-*` meta tags.
- `manifest.json` — name, icon, colors, `display: "standalone"` (this is what removes the browser chrome and makes it feel like an app).
- `sw.js` — service worker, caches the page so it works with no connection.
- `icon.svg` — the app icon.
- `capacitor.config.ts` — for step 2.

**Run it:**

```bash
npm start          # serves on http://localhost:3000
```

Then:

- **Desktop Chrome/Edge** — install icon appears in the address bar, or press the "Install as App" button on the page.
- **iPhone Safari** — Share → *Add to Home Screen*.
- **Android Chrome** — ⋮ menu → *Install app*.

Requirements for a PWA to be installable: HTTPS (or localhost), a manifest with a name + a 192px and 512px icon, and a service worker with a fetch handler. All present here — `icon-192.png`, `icon-512.png` (also listed as `maskable`), and `apple-touch-icon.png` for iOS are generated from `icon.svg`.

When it's installed, `index.html` detects `display-mode: standalone` and switches to the "installed" state, so you can confirm it's really running as an app and not a tab.

**Same UI, same stuff** — literally the same `index.html`. Only difference: no address bar, so your CSS needs `viewport-fit=cover` + `env(safe-area-inset-*)` if you go fullscreen on iPhone.

---

## 2. Capacitor — App Store / Play Store

Capacitor drops your web files into a native iOS/Android project and gives you a bridge to native APIs (camera, push, files, in-app purchases).

```bash
npm install                                   # installs Capacitor
npx cap add ios                               # needs Xcode (macOS only)
npx cap add android                           # needs Android Studio
npx cap sync                                  # copies web assets into native projects
npx cap open ios                              # opens Xcode → run on device
npx cap open android                          # opens Android Studio → run on device
```

Edit `appId` in `capacitor.config.ts` first — it's your bundle ID, reverse-domain style (`com.yourname.hole`). When you change `index.html`, run `npx cap sync` again and the native app picks up the change.

Costs: Apple Developer $99/yr, Google Play $25 once. Both review submissions.

---

## 3. Electron / Tauri — desktop

```bash
npx --yes @electron-forge/cli init            # or: npm create tauri-app
```

Point its `loadURL` / `url` config at `index.html` (Electron) or set `frontendDist` (Tauri). Tauri gives far smaller binaries (~3 MB vs ~120 MB) because it uses the OS webview. Electron gives you one consistent Chromium everywhere.

---

## 4. Native WebView — maximum control

~40 lines for a shell that loads your URL:

**iOS (SwiftUI)**

```swift
import SwiftUI
import WebKit

struct WebView: UIViewRepresentable {
    func makeUIView(context: Context) -> WKWebView { WKWebView() }
    func updateUIView(_ webView: WKWebView, context: Context) {
        webView.load(URLRequest(url: URL(string: "https://your-site.com")!))
    }
}
```

**Android (Kotlin)**

```kotlin
webView.settings.javaScriptEnabled = true
webView.loadUrl("https://your-site.com")
```

Downside: no offline, and Apple rejects apps that are *only* a webview with no native value (App Store guideline 4.2).

---

## Which one should you pick?

- **Just want it on the home screen with an icon and offline?** → PWA. You're done. It's already in this repo.
- **Need to be in the App Store / Play Store?** → Capacitor.
- **Need native hardware the browser can't reach** (background BLE, deep file system, native push on iOS)? → Capacitor with native plugins, or native WebView.
- **Desktop software people download?** → Tauri.

Most products do PWA first (this week) and add Capacitor later when store presence or native APIs actually matter.
