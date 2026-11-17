/**
 * Browser stand-in for electron/preload.js so ui/ can run in a normal tab.
 * Keeps the same shape as the real bridge.
 */
(function () {
  'use strict';

  // ?demo=reskin points the "webview" at the fake chat app used to show the
  // re-skin engine; everything else stays on the plain demo page.
  const RESKIN_DEMO = (() => {
    try { return new URLSearchParams(location.search).get('demo') === 'reskin'; } catch { return false; }
  })();
  const DEMO_URL = RESKIN_DEMO ? '/reskin-demo' : '/demo';
  const KEY = 'arena-shell-preview-settings' + (RESKIN_DEMO ? '-reskin' : '');

  const DEFAULTS = {
    version: 1,
    homeUrl: DEMO_URL,
    connections: [
      { id: 'arena-agent', name: 'Arena Agent', url: DEMO_URL, icon: '◆' },
      { id: 'demo-docs', name: 'Docs', url: DEMO_URL, icon: 'D' },
      { id: 'demo-local', name: 'Local project', url: DEMO_URL, icon: 'L' }
    ],
    activeConnectionId: 'arena-agent',
    theme: 'arena',
    accent: '',
    fontFamily: '',
    monoFamily: '',
    fontSize: 14,
    radius: 10,
    density: 'cozy',
    uiScale: 1,
    animations: true,
    transparency: false,
    pageZoom: 1,
    pageStyling: 'subtle',
    customCss: '',
    sidebar: true,
    sidebarWidth: 248,
    showTitlebarUrl: true,
    showStatusbar: true,
    runScriptOnStartup: true,
    scriptPath: 'C:\\Program Files\\ArenaShell\\app\\app-start.bat',
    homeUrl: DEMO_URL,
    openDevTools: false
  };

  /**
   * The real app injects CSS into the <webview> from the main world. A browser
   * can't do that across an iframe boundary, so the preview forwards the same
   * tokens and the demo page applies them itself. Same input, same output.
   */
  function mirrorThemeToPage() {
    const frame = document.getElementById('webview');
    if (!frame || !frame.contentWindow || !window.ArenaThemes) return;
    frame.contentWindow.postMessage(
      {
        type: 'arena-theme',
        tokens: window.ArenaThemes.tokens(state),
        mode: state.pageStyling,
        customCss: state.customCss || '',
        zoom: state.pageZoom
      },
      '*'
    );
  }

  function load() {
    try {
      return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(KEY) || '{}'));
    } catch {
      return { ...DEFAULTS };
    }
  }

  let state = load();
  const save = () => localStorage.setItem(KEY, JSON.stringify(state));
  const changedCbs = [];
  const logCbs = [];
  const stateCbs = [];

  const demoLog = [
    { stream: 'shell', line: '[shell] startup run :: C:\\Program Files\\Arena Shell\\start.bat' },
    { stream: 'out', line: '' },
    { stream: 'out', line: '  ==========================================' },
    { stream: 'out', line: '     A R E N A   S H E L L   |   start.bat' },
    { stream: 'out', line: '  ==========================================' },
    { stream: 'out', line: '' },
    { stream: 'out', line: '  Date        : 17/11/2026 19:04:12,88' },
    { stream: 'out', line: '  User        : denightlocator' },
    { stream: 'out', line: '  Work dir    : C:\\Program Files\\Arena Shell' },
    { stream: 'out', line: '' },
    { stream: 'out', line: '  Ready. Handing control back to Arena Shell.' },
    { stream: 'shell', line: '[shell] script finished successfully — handing control back to the shell.' }
  ];

  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'arena-preview-ready') mirrorThemeToPage();
  });
  window.__mirrorThemeToPage = mirrorThemeToPage;

  // ---- browser feature stubs (mirror the real preload surface) ----------
  const listeners = {};
  const on = (ch) => (cb) => {
    listeners[ch] = listeners[ch] || [];
    listeners[ch].push(cb);
    return () => { listeners[ch] = listeners[ch].filter((f) => f !== cb); };
  };
  const emit = (ch, payload) => (listeners[ch] || []).forEach((cb) => cb(payload));

  let bookmarks = [
    { id: 'b1', url: 'https://arena.ai/agent', title: 'Arena Agent' },
    { id: 'b2', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', title: 'YouTube' },
    { id: 'b3', url: 'https://github.com/denightlocator/hole', title: 'hole' }
  ];

  const historyItems = [
    { url: 'https://arena.ai/agent', title: 'Arena Agent', at: Date.now() - 120000, visits: 12 },
    { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', title: 'A video — YouTube', at: Date.now() - 3600000, visits: 3 },
    { url: 'https://github.com/denightlocator/hole', title: 'denightlocator/hole', at: Date.now() - 7200000, visits: 7 },
    { url: 'https://example.com/docs/getting-started', title: 'Getting started', at: Date.now() - 86400000, visits: 1 }
  ];

  let adblockState = {
    enabled: true, blockAds: true, blockTrackers: true, cosmetic: true,
    blocked: 47, since: Date.now() - 18 * 60000,
    top: [
      { host: 'ad.doubleclick.net', count: 18 },
      { host: 'www.google-analytics.com', count: 12 },
      { host: 'securepubads.g.doubleclick.net', count: 9 },
      { host: 'static.criteo.net', count: 5 },
      { host: 'bat.bing.com', count: 3 }
    ],
    allowlist: [], rules: [], cosmeticCss: ''
  };

  let extState = [
    { id: 'x1', name: 'Dark Reader', version: '4.9.86', manifestVersion: 2, enabled: true, loaded: true,
      description: 'Dark mode for every website.' },
    { id: 'x2', name: 'uBlock Origin Lite', version: '1.56', manifestVersion: 3, enabled: true, loaded: false,
      description: 'Content blocker.',
      error: 'Service worker registration failed — MV3 background workers are not supported by this runtime.' }
  ];

  let dlState = [
    { id: 'd1', filename: 'electron-v33.4.11-win32-x64.zip', state: 'completed',
      received: 117440512, total: 117440512, url: 'https://github.com/electron/electron/releases/download/x.zip' },
    { id: 'd2', filename: 'screenshot.png', state: 'progressing',
      received: 420000, total: 900000, url: 'https://arena.ai/assets/screenshot.png' }
  ];

  let miniState = { video: null, playing: false };

  window.PREVIEW_MODE = true;
  window.arena = {
    settings: {
      get: async () => state,
      defaults: async () => ({ ...DEFAULTS }),
      set: async (patch) => {
        state = { ...state, ...patch };
        save();
        changedCbs.forEach((cb) => cb(state));
        setTimeout(mirrorThemeToPage, 30);
        return state;
      },
      reset: async () => {
        state = { ...DEFAULTS };
        save();
        changedCbs.forEach((cb) => cb(state));
        setTimeout(mirrorThemeToPage, 30);
        return state;
      },
      export: async () => ({ ok: true, path: 'arena-shell-settings.json' }),
      import: async () => ({ ok: false }),
      file: async () => 'C:\\Users\\you\\AppData\\Roaming\\Arena Shell\\settings.json',
      onChanged: (cb) => { changedCbs.push(cb); return () => {}; }
    },
    script: {
      run: async () => {
        setTimeout(() => {
          logCbs.forEach((cb) => cb(demoLog));
          stateCbs.forEach((cb) => cb({ running: true, code: null }));
          setTimeout(() => stateCbs.forEach((cb) => cb({ running: false, code: 0 })), 1600);
        }, 120);
        return { ok: true };
      },
      stop: async () => ({ ok: true }),
      state: async () => ({ state: { running: false, code: 0 }, log: demoLog }),
      path: async () => state.scriptPath || 'C:\\Program Files\\ArenaShell\\app\\app-start.bat',
      pick: async () => ({ ok: false }),
      reveal: async () => ({ ok: true }),
      onLog: (cb) => { logCbs.push(cb); return () => {}; },
      onState: (cb) => { stateCbs.push(cb); return () => {}; }
    },
    window: {
      minimize: async () => {},
      maximize: async () => false,
      close: async () => {},
      isMaximized: async () => false
    },
    app: {
      info: async () => ({
        version: '1.0.0',
        electron: '33.4.11 (preview)',
        chrome: '130.0.6723.191',
        node: '20.18.1',
        platform: 'win32',
        packaged: false,
        userData: 'C:\\Users\\you\\AppData\\Roaming\\Arena Shell'
      }),
      openExternal: async () => {},
      onMenuAction: () => () => {}
    },
    adblock: {
      get: async () => adblockState,
      set: async (patch) => {
        adblockState = { ...adblockState, ...patch };
        emit('adblock', adblockState);
        return adblockState;
      },
      resetStats: async () => {
        adblockState = { ...adblockState, blocked: 0, since: Date.now(), top: [] };
        emit('adblock', adblockState);
        return adblockState;
      },
      onChanged: on('adblock')
    },
    history: {
      list: async (q) => (q
        ? historyItems.filter((h) => (h.title + h.url).toLowerCase().includes(String(q).toLowerCase()))
        : historyItems),
      clear: async () => { historyItems.length = 0; return []; },
      remove: async (url) => {
        const i = historyItems.findIndex((h) => h.url === url);
        if (i >= 0) historyItems.splice(i, 1);
        return true;
      },
      suggest: async (q) => historyItems
        .filter((h) => (h.title + h.url).toLowerCase().includes(String(q).toLowerCase()))
        .slice(0, 6)
        .map((h) => ({ kind: 'history', title: h.title, url: h.url }))
    },
    bookmarks: {
      list: async () => bookmarks,
      add: async (p) => {
        const item = { id: 'b' + Date.now(), ...p };
        bookmarks = [item, ...bookmarks.filter((b) => b.url !== p.url)];
        emit('bookmarks', bookmarks);
        return item;
      },
      remove: async (id) => {
        bookmarks = bookmarks.filter((b) => b.id !== id);
        emit('bookmarks', bookmarks);
        return true;
      },
      update: async () => ({}),
      isBookmarked: async (url) => bookmarks.some((b) => b.url === url),
      onChanged: on('bookmarks')
    },
    downloads: {
      list: async () => dlState,
      clear: async () => { dlState = dlState.filter((d) => d.state === 'progressing'); return dlState; },
      open: async () => ({ ok: true }),
      reveal: async () => ({ ok: true }),
      folder: async () => '/home/you/Downloads',
      onChanged: on('downloads')
    },
    extensions: {
      list: async () => extState,
      install: async () => ({ ok: false, canceled: true }),
      folder: async () => '/home/you/.config/ArenaShell/extensions',
      setEnabled: async (id, enabled) => {
        extState = extState.map((e) => (e.id === id ? { ...e, enabled, loaded: enabled } : e));
        emit('extensions', extState);
        return { ok: true };
      },
      remove: async (id) => {
        extState = extState.filter((e) => e.id !== id);
        emit('extensions', extState);
        return { ok: true };
      },
      onChanged: on('extensions')
    },
    mini: {
      open: async (video) => {
        miniState = { video, playing: true };
        emit('mini', miniState);
        return { ok: true };
      },
      close: async () => {
        miniState = { video: null, playing: false };
        emit('mini', miniState);
        return true;
      },
      get: async () => miniState,
      focusSource: async () => true,
      setAlwaysOnTop: async () => true,
      onState: on('mini')
    },
    reskin: {
      profiles: async () => ({
        profiles: [
          { id: 'claude-code', name: 'Claude Code', description: 'Terminal-native transcript: monospace, prompt carets, terracotta accents.' },
          { id: 'minimal', name: 'Minimal', description: 'A blank structural canvas: your messages, one input, nothing else.' }
        ],
        version: '1.0.0'
      }),
      apply: async ({ profile, mapping }) => {
        const frame = document.getElementById('webview');
        const win = frame && frame.contentWindow;
        if (!win || !win.ArenaReskinEngine) return { ok: false, error: 'Demo frame not ready' };
        const P = win.ArenaReskinProfiles.get(profile);
        const old = win.document.getElementById('arena-reskin-style');
        if (old) old.remove();
        const style = win.document.createElement('style');
        style.id = 'arena-reskin-style';
        style.textContent = P.css;
        win.document.head.appendChild(style);
        if (win.__arenaReskin && win.__arenaReskin.mounted) win.__arenaReskin.unmount();
        const engine = new win.ArenaReskinEngine.ReskinEngine({ doc: win.document, win });
        const auto = engine.autoMap();
        const result = engine.mount(P, { ...auto, ...(mapping || {}) });
        win.__arenaReskin = engine;
        win.document.documentElement.classList.add('arena-rs-active');
        return { ok: result.ok, error: result.error || null, ...engine.status() };
      },
      remove: async () => {
        const win = document.getElementById('webview')?.contentWindow;
        if (win && win.__arenaReskin) win.__arenaReskin.unmount();
        return { ok: true };
      },
      status: async () => {
        const win = document.getElementById('webview')?.contentWindow;
        if (!win || !win.__arenaReskin) return { mounted: false };
        return win.__arenaReskin.status();
      },
      pick: async () => ({ ok: false, canceled: true })
    },
    youtube: {
      get: async () => ({ enabled: true, popoutOnNavigate: true, defaultQuality: '' }),
      set: async (patch) => patch,
      onState: () => () => {}
    },
    browser: {
      clearData: async () => true,
      exportStore: async () => ({}),
      onNavigate: on('navigate'),
      onToast: on('toast')
    },
    layout: { onSidebarWidth: () => () => {} }
  };
})();
