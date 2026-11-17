/**
 * Browser stand-in for electron/preload.js so ui/ can run in a normal tab.
 * Keeps the same shape as the real bridge.
 */
(function () {
  'use strict';

  const KEY = 'arena-shell-preview-settings';

  const DEFAULTS = {
    version: 1,
    homeUrl: '/demo',
    connections: [
      { id: 'arena-agent', name: 'Arena Agent', url: '/demo', icon: '◆' },
      { id: 'demo-docs', name: 'Docs', url: '/demo', icon: 'D' },
      { id: 'demo-local', name: 'Local project', url: '/demo', icon: 'L' }
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
    scriptPath: '/app/start.bat',
    openDevTools: false
  };

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

  window.PREVIEW_MODE = true;
  window.arena = {
    settings: {
      get: async () => state,
      defaults: async () => ({ ...DEFAULTS }),
      set: async (patch) => {
        state = { ...state, ...patch };
        save();
        changedCbs.forEach((cb) => cb(state));
        return state;
      },
      reset: async () => {
        state = { ...DEFAULTS };
        save();
        changedCbs.forEach((cb) => cb(state));
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
      path: async () => state.scriptPath || '/app/start.bat',
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
    layout: { onSidebarWidth: () => () => {} }
  };
})();
