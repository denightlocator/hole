'use strict';

/**
 * Arena Shell — main process.
 *
 * Responsibilities:
 *   - create the frameless shell window (custom titlebar, settings, etc.)
 *   - host the <webview> that shows the connected website
 *   - run the in-app startup hook (app-start.bat / app-start.sh)
 *   - browser services: ad blocking, extensions, downloads, history
 *   - the always-on-top mini player for YouTube
 *   - persist settings to userData/settings.json
 */

const {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  Menu,
  dialog,
  session,
  webContents,
  nativeTheme
} = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const { SettingsStore } = require('./settings-store');
const { BrowserStore } = require('./browser-store');
const { AdBlocker } = require('./adblock');
const { ExtensionManager } = require('./extensions');
const youtube = require('./youtube');

const isDev = process.argv.includes('--dev');
const isWindows = process.platform === 'win32';

/**
 * Read `--name=value` from argv. Everything after a bare `--` is app-specific
 * (the launcher passes its options there), so search the whole tail.
 */
function argValue(name) {
  const prefix = `--${name}=`;
  for (const raw of process.argv) {
    const arg = raw.replace(/^"+|"+$/g, '');
    if (arg.startsWith(prefix)) return arg.slice(prefix.length);
  }
  return null;
}

// The launcher (start.bat -> bootstrap.ps1) tells us where it installed things.
const installDir = argValue('install-dir');
const settingsFileArg = argValue('settings-file');

let mainWindow = null;
let settings = null;
let browserStore = null;
let adBlocker = null;
let extensions = null;
let miniWindow = null;
let miniState = { video: null, playing: false };
let miniDrag = null;
let miniResize = null;
let miniNormalSize = null;

// The webviews use their own session so extensions/adblock/zoom stay isolated
// from the shell UI itself.
const BROWSE_PARTITION = 'persist:arena-browse';
let scriptLog = [];
let scriptState = { running: false, code: null, startedAt: null, endedAt: null, command: '' };

const MAX_LOG_LINES = 500;

/* ------------------------------------------------------------------ */
/* paths                                                               */
/* ------------------------------------------------------------------ */

/**
 * The in-app startup hook.
 *
 * NOTE: this is deliberately NOT start.bat / start.sh - those are the
 * *launcher* (they download this app and then run it). Running the launcher
 * from inside the app would recurse forever, so the app runs app-start.*
 * instead, and refuses anything that looks like a launcher.
 */
function bundledScriptPath() {
  const name = isWindows ? 'app-start.bat' : 'app-start.sh';
  const candidates = [
    // launcher install: app/app-start.* lives next to the sources
    installDir ? path.join(installDir, 'app', name) : null,
    app.isPackaged ? path.join(process.resourcesPath, name) : null,
    app.isPackaged ? path.join(path.dirname(app.getPath('exe')), name) : null,
    path.join(__dirname, '..', name),
    path.join(process.cwd(), name)
  ].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p)) || candidates[0];
}

function iconPath() {
  const candidates = [
    path.join(__dirname, '..', 'assets', 'icon.png'),
    path.join(process.resourcesPath || '', 'assets', 'icon.png')
  ].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p)) || undefined;
}

/* ------------------------------------------------------------------ */
/* start script                                                        */
/* ------------------------------------------------------------------ */

function pushLog(chunk, stream) {
  const text = String(chunk).replace(/\r\n/g, '\n');
  for (const line of text.split('\n')) {
    if (line === '' && text.length > 2) continue;
    scriptLog.push({ t: Date.now(), stream: stream || 'out', line });
  }
  if (scriptLog.length > MAX_LOG_LINES) scriptLog = scriptLog.slice(-MAX_LOG_LINES);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('script:log', scriptLog.slice(-60));
    mainWindow.webContents.send('script:state', scriptState);
  }
}

function runStartScript({ onStartup = false } = {}) {
  if (scriptState.running) return { ok: false, error: 'A script is already running.' };

  const configured = settings.get().scriptPath;
  const scriptPath = configured && fs.existsSync(configured) ? configured : bundledScriptPath();

  if (!fs.existsSync(scriptPath)) {
    pushLog(`[shell] ${path.basename(scriptPath)} not found at ${scriptPath}`, 'err');
    return { ok: false, error: `${path.basename(scriptPath)} was not found.` };
  }

  // Guard: never let the in-app hook re-run the launcher (that would spawn
  // another shell, which would spawn another launcher, forever).
  const base = path.basename(scriptPath).toLowerCase();
  if (/^start\.(bat|cmd|sh|ps1)$/.test(base)) {
    pushLog('[shell] refusing to run the launcher from inside the app.', 'err');
    return {
      ok: false,
      error: 'That is the launcher (start.bat), not the startup script. Use app-start.bat instead.'
    };
  }

  const cwd = path.dirname(scriptPath);
  const command = isWindows ? 'cmd.exe' : '/bin/bash';
  const args = isWindows ? ['/c', path.basename(scriptPath)] : [scriptPath];

  scriptState = {
    running: true,
    code: null,
    startedAt: Date.now(),
    endedAt: null,
    command: `${path.basename(command)} ${args.join(' ')}`
  };
  scriptLog = [];
  pushLog(`[shell] ${onStartup ? 'startup run' : 'manual run'} :: ${scriptPath}`, 'shell');

  let child;
  try {
    child = spawn(command, args, {
      cwd,
      windowsHide: true,
      env: {
        ...process.env,
        ARENA_SHELL: '1',
        ARENA_SHELL_HOME_URL: settings.get().homeUrl,
        ARENA_SHELL_CWD: cwd
      }
    });
  } catch (err) {
    scriptState.running = false;
    pushLog(`[shell] failed to launch: ${err.message}`, 'err');
    return { ok: false, error: err.message };
  }

  child.stdout.on('data', (d) => pushLog(d, 'out'));
  child.stderr.on('data', (d) => pushLog(d, 'err'));

  child.on('error', (err) => {
    scriptState.running = false;
    pushLog(`[shell] spawn error: ${err.message}`, 'err');
  });

  child.on('close', (code, signal) => {
    scriptState.running = false;
    scriptState.code = code;
    scriptState.endedAt = Date.now();
    pushLog(
      code === 0
        ? '[shell] script finished successfully — handing control back to the shell.'
        : `[shell] script exited with code ${code}${signal ? ` (${signal})` : ''}.`,
      code === 0 ? 'shell' : 'err'
    );
  });

  return { ok: true, path: scriptPath };
}

function stopScript() {
  // Best effort: the script is detached from the window lifecycle, so we only
  // report state. Killing arbitrary child trees cross-platform is out of scope.
  if (!scriptState.running) return { ok: false, error: 'Nothing is running.' };
  scriptState.running = false;
  scriptState.code = 'stopped';
  scriptState.endedAt = Date.now();
  pushLog('[shell] script marked as stopped by the user.', 'shell');
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* settings plumbing                                                   */
/* ------------------------------------------------------------------ */

function broadcastSettings() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('settings:changed', settings.get());
}

function applyWindowSettings() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const s = settings.get();
  if (typeof s.sidebarWidth === 'number') {
    mainWindow.webContents.send('layout:sidebar', s.sidebarWidth);
  }
}

/* ------------------------------------------------------------------ */
/* mini player (always on top)                                         */
/* ------------------------------------------------------------------ */

const MINI_SIZES = {
  normal: { width: 420, height: 300 },
  large: { width: 640, height: 440 }
};

function miniHtmlPath() {
  return path.join(__dirname, '..', 'ui', 'mini-player.html');
}

function broadcastMiniState() {
  const send = (win, channel, payload) => {
    if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
  };
  send(miniWindow, 'mini:video', miniState.video);
  send(miniWindow, 'mini:playing', miniState.playing);
  send(mainWindow, 'mini:state', miniState);
}

function createMiniWindow(video) {
  const size = MINI_SIZES.normal;
  const b = (settings.get().windowBounds || {});
  const x = typeof b.x === 'number' ? Math.max(0, b.x + (b.width || 1300) - size.width - 40) : undefined;
  const y = typeof b.y === 'number' ? b.y + 70 : undefined;

  miniWindow = new BrowserWindow({
    width: size.width,
    height: size.height,
    x,
    y,
    minWidth: 280,
    minHeight: 200,
    frame: false,
    transparent: process.platform === 'darwin',
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    backgroundColor: '#0d1017',
    alwaysOnTop: true,
    icon: iconPath(),
    title: 'Arena Mini Player',
    webPreferences: {
      preload: path.join(__dirname, 'mini-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  // "above everything": floating level survives focus changes on macOS, and
  // visibleOnAllWorkspaces makes it follow you across virtual desktops.
  miniWindow.setAlwaysOnTop(true, 'floating');
  miniWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  miniWindow.loadFile(miniHtmlPath());

  miniWindow.once('ready-to-show', () => {
    miniWindow.showInactive(); // don't steal focus from what you're doing
    broadcastMiniState();
  });

  miniWindow.on('closed', () => {
    miniWindow = null;
    sendMiniClosed();
  });

  // Keep the player on top even if another app tries to take over.
  miniWindow.on('blur', () => {
    if (miniWindow && !miniWindow.isDestroyed()) {
      miniWindow.setAlwaysOnTop(true, 'floating');
    }
  });

  return miniWindow;
}

function sendMiniClosed() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('mini:state', { video: null, playing: false, closed: true });
  }
}

function openMiniPlayer(video) {
  if (!video || !video.id) return { ok: false, error: 'No video to pop out.' };
  miniState.video = {
    ...video,
    embedUrl: youtube.embedUrl(video.id, {
      start: video.currentTime || 0,
      quality: (browserStore && browserStore.youtube.defaultQuality) || ''
    })
  };
  miniState.playing = !video.paused;

  if (miniWindow && !miniWindow.isDestroyed()) {
    broadcastMiniState();
    miniWindow.showInactive();
  } else {
    createMiniWindow(miniState.video);
  }
  return { ok: true };
}

function closeMiniPlayer() {
  if (miniWindow && !miniWindow.isDestroyed()) miniWindow.close();
  miniWindow = null;
  miniState = { video: null, playing: false };
}

function toggleMiniPlay() {
  // The embed is inside an iframe we don't script directly; send a key event
  // to the page instead, which the YouTube player handles natively.
  if (!miniWindow || miniWindow.isDestroyed()) return;
  miniWindow.webContents.executeJavaScript(`
    (function () {
      var f = document.getElementById('player');
      if (f && f.contentWindow) {
        f.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'togglePlay', args: [] }), '*');
      }
    })();
  `).catch(() => {});
  miniState.playing = !miniState.playing;
  broadcastMiniState();
}

/* ------------------------------------------------------------------ */
/* browser services: downloads, sessions, extensions                   */
/* ------------------------------------------------------------------ */

function browsePartition() {
  return BROWSE_PARTITION;
}

function wireDownloads(browseSession) {
  browseSession.on('will-download', (event, item, webContents) => {
    const id = `dl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const filename = item.getFilename();
    const total = item.getTotalBytes();

    // Default to the OS Downloads folder, but let the user be asked if the
    // shell is visible (matching browser behaviour).
    const saveDir = app.getPath('downloads');
    const target = path.join(saveDir, filename);
    item.setSavePath(uniquePath(target));

    const record = {
      id,
      filename,
      url: item.getURL(),
      path: item.getSavePath(),
      total,
      received: 0,
      state: 'progressing',
      startedAt: Date.now()
    };
    browserStore.upsertDownload(record);
    pushDownloads();

    item.on('updated', (_e, state) => {
      browserStore.upsertDownload({
        id,
        received: item.getReceivedBytes(),
        total: item.getTotalBytes(),
        state: state === 'interrupted' ? 'interrupted' : 'progressing'
      });
      pushDownloads();
    });

    item.once('done', (_e, state) => {
      browserStore.upsertDownload({
        id,
        state: state === 'completed' ? 'completed' : state,
        received: item.getReceivedBytes(),
        total: item.getTotalBytes(),
        endedAt: Date.now()
      });
      pushDownloads();
      if (state === 'completed' && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('toast', {
          message: `Downloaded ${filename}`,
          action: 'reveal',
          path: item.getSavePath()
        });
      }
    });
  });
}

/** Avoid clobbering: "file.zip" -> "file (1).zip". */
function uniquePath(target) {
  if (!fs.existsSync(target)) return target;
  const dir = path.dirname(target);
  const ext = path.extname(target);
  const base = path.basename(target, ext);
  for (let i = 1; i < 500; i++) {
    const candidate = path.join(dir, `${base} (${i})${ext}`);
    if (!fs.existsSync(candidate)) return candidate;
  }
  return path.join(dir, `${base}-${Date.now()}${ext}`);
}

function pushDownloads() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('downloads:changed', browserStore.listDownloads());
  }
}

/* ------------------------------------------------------------------ */
/* page hooks: adblock cosmetics + custom YouTube UI                   */
/* ------------------------------------------------------------------ */

/** Messages relayed from page-preload (the custom YouTube UI lives there). */
function handlePageMessage(message) {
  if (!message || !message.type) return;
  const payload = message.payload || {};

  if (message.type === 'yt-popout' && payload.id) {
    openMiniPlayer(payload);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('toast', { message: 'Popped out the video — it stays on top.' });
    }
    return;
  }

  if (message.type === 'yt-state') {
    if (miniWindow && !miniWindow.isDestroyed() && miniState.video && payload.id === miniState.video.id) return;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('youtube:state', payload);
    }
    return;
  }

  if (message.type === 'yt-leaving' && payload.id) {
    const yt = browserStore.youtube;
    if (yt.enabled && yt.popoutOnNavigate && !(miniWindow && !miniWindow.isDestroyed())) {
      openMiniPlayer(payload);
    }
    return;
  }
}

async function decoratePage(contents) {
  const url = contents.getURL();
  try {
    const summary = adBlocker.summary();
    if (summary.cosmeticCss) await contents.insertCSS(summary.cosmeticCss);

    if (youtube.isYouTube(url) && browserStore.youtube.enabled) {
      await contents.insertCSS(youtube.PAGE_CSS);
      await contents.executeJavaScript(youtube.PAGE_SCRIPT, true).catch(() => {});
    }
  } catch { /* page navigated away mid-inject */ }
}

/* ------------------------------------------------------------------ */
/* window                                                              */
/* ------------------------------------------------------------------ */

function createWindow() {
  const s = settings.get();
  const b = s.windowBounds || {};

  mainWindow = new BrowserWindow({
    width: b.width || 1320,
    height: b.height || 860,
    x: typeof b.x === 'number' ? b.x : undefined,
    y: typeof b.y === 'number' ? b.y : undefined,
    minWidth: 880,
    minHeight: 560,
    show: false,
    backgroundColor: '#0a0b11',
    frame: false,
    titleBarStyle: isWindows ? 'hidden' : 'hiddenInset',
    trafficLightPosition: { x: 14, y: 14 },
    icon: iconPath(),
    title: 'Arena Shell',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true,
      spellcheck: true
    }
  });

  if (b.maximized) mainWindow.maximize();

  mainWindow.loadFile(path.join(__dirname, '..', 'ui', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (s.openDevTools || isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
  });

  const persistBounds = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const maximized = mainWindow.isMaximized();
    const bounds = maximized ? settings.get().windowBounds : mainWindow.getBounds();
    settings.set({
      windowBounds: {
        width: bounds.width,
        height: bounds.height,
        x: maximized ? settings.get().windowBounds.x : bounds.x,
        y: maximized ? settings.get().windowBounds.y : bounds.y,
        maximized
      }
    });
  };
  mainWindow.on('resize', persistBounds);
  mainWindow.on('move', persistBounds);
  mainWindow.on('close', persistBounds);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // External links open in the real browser, not inside the shell.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  // Lock down the shell document itself.
  mainWindow.webContents.on('will-attach-webview', (event, webPreferences) => {
    // Our own bridge for page scripts; the shell's preload never goes in here.
    webPreferences.preload = path.join(__dirname, 'page-preload.js');
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
    webPreferences.sandbox = true;
    // Browsing content lives on its own partitioned session so extensions,
    // ad-block rules and cookies never touch the shell UI.
    webPreferences.partition = BROWSE_PARTITION;
  });

  mainWindow.webContents.on('did-attach-webview', (_e, wc) => {
    wc.setWindowOpenHandler(({ url }) => {
      if (/^https?:/i.test(url)) {
        // A YouTube video opened in a new window should pop out instead.
        if (youtube.isYouTube(url) && browserStore && browserStore.youtube.enabled) {
          const id = youtube.parseVideoId(url);
          if (id) {
            openMiniPlayer({ id, title: url, currentTime: youtube.parseStartTime(url), paused: false });
            return { action: 'deny' };
          }
        }
        shell.openExternal(url);
      }
      return { action: 'deny' };
    });

    wc.on('dom-ready', () => decoratePage(wc));
    wc.on('did-navigate', () => decoratePage(wc));

    // Bridge for the injected YouTube script (it runs in the page world, so it
    // can only talk to us over postMessage -> page-preload -> ipc-message).
    wc.on('ipc-message', (_e, channel, payload) => {
      if (channel === 'page:message') handlePageMessage(payload);
    });

    wc.on('console-message', (_e, level, message) => {
      if (isDev && level >= 2) console.log('[page]', message);
    });

    wc.setZoomFactor(Number(settings.get().pageZoom) || 1);
  });

  if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
}

/* ------------------------------------------------------------------ */
/* app lifecycle                                                       */
/* ------------------------------------------------------------------ */

// One shell at a time: relaunching the launcher should surface the running app.
const gotLock = typeof app.requestSingleInstanceLock === 'function'
  ? app.requestSingleInstanceLock()
  : true;
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });
}

app.whenReady().then(() => {
  // Launcher installs keep everything inside one folder so uninstalling is a
  // single delete. Otherwise fall back to the normal per-user data folder.
  const settingsFile = settingsFileArg
    ? path.resolve(settingsFileArg)
    : installDir
      ? path.join(installDir, 'app', 'data', 'shell-settings.json')
      : path.join(app.getPath('userData'), 'settings.json');
  settings = new SettingsStore(settingsFile);
  if (isDev) console.log('[shell] settings file:', settingsFile);

  // Browser state lives next to the settings file so a single folder holds
  // everything the user can uninstall.
  browserStore = new BrowserStore(path.dirname(settingsFile));

  const browseSession = session.fromPartition(BROWSE_PARTITION);

  adBlocker = new AdBlocker(browseSession, {
    ...browserStore.adblock,
    onUpdate: (summary) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('adblock:changed', summary);
      }
    }
  });

  extensions = new ExtensionManager(browseSession, browserStore, {
    dir: path.join(path.dirname(settingsFile), 'extensions'),
    onEvent: (list) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('extensions:changed', list);
      }
    }
  });

  wireDownloads(browseSession);

  // Extensions need a moment to load and never block startup if one is broken.
  extensions.loadAll().catch((err) => console.error('[ext] loadAll:', err.message));

  // Allow microphone/camera prompts from inside the connected web app.
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    const allow = ['media', 'clipboard-read', 'clipboard-sanitized-write', 'notifications', 'fullscreen'];
    callback(allow.includes(permission));
  });

  createWindow();

  if (settings.get().runScriptOnStartup) {
    // Give the renderer a moment to subscribe to script:log before we spew.
    setTimeout(() => runStartScript({ onStartup: true }), 700);
  }

  buildMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (settings) settings.flush();
});

/* ------------------------------------------------------------------ */
/* menu                                                                */
/* ------------------------------------------------------------------ */

function buildMenu() {
  const send = (channel, payload) => mainWindow && mainWindow.webContents.send(channel, payload);

  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'Settings…', accelerator: 'CmdOrCtrl+,', click: () => send('menu:action', 'settings') },
        { label: 'New Connection…', accelerator: 'CmdOrCtrl+N', click: () => send('menu:action', 'new-connection') },
        { label: 'Run start script', accelerator: 'CmdOrCtrl+R', click: () => runStartScript() },
        { type: 'separator' },
        { label: 'Quit', role: 'quit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload page', accelerator: 'CmdOrCtrl+Shift+R', click: () => send('menu:action', 'reload-page') },
        { label: 'Toggle sidebar', accelerator: 'CmdOrCtrl+B', click: () => send('menu:action', 'toggle-sidebar') },
        { label: 'Toggle script console', accelerator: 'CmdOrCtrl+`', click: () => send('menu:action', 'toggle-console') },
        { type: 'separator' },
        { label: 'Zoom in', role: 'zoomIn' },
        { label: 'Zoom out', role: 'zoomOut' },
        { label: 'Reset zoom', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'Developer tools', role: 'toggleDevTools' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        { label: 'About Arena Shell', click: () => send('menu:action', 'about') },
        { label: 'Open settings folder', click: () => shell.openPath(app.getPath('userData')) }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/* ------------------------------------------------------------------ */
/* IPC                                                                 */
/* ------------------------------------------------------------------ */

ipcMain.handle('settings:get', () => settings.get());
ipcMain.handle('settings:defaults', () => settings.defaults);
ipcMain.handle('settings:set', (_e, patch) => {
  const next = settings.set(patch || {});
  broadcastSettings();
  applyWindowSettings();
  return next;
});
ipcMain.handle('settings:reset', () => {
  const next = settings.reset();
  broadcastSettings();
  return next;
});
ipcMain.handle('settings:export', async () => {
  const res = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Arena Shell settings',
    defaultPath: 'arena-shell-settings.json',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (res.canceled || !res.filePath) return { ok: false };
  fs.writeFileSync(res.filePath, JSON.stringify(settings.get(), null, 2), 'utf8');
  return { ok: true, path: res.filePath };
});
ipcMain.handle('settings:import', async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Arena Shell settings',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  });
  if (res.canceled || !res.filePaths[0]) return { ok: false };
  try {
    const parsed = JSON.parse(fs.readFileSync(res.filePaths[0], 'utf8'));
    const next = settings.replace(parsed);
    broadcastSettings();
    return { ok: true, settings: next };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('settings:file', () => path.join(app.getPath('userData'), 'settings.json'));

ipcMain.handle('script:run', () => runStartScript());
ipcMain.handle('script:stop', () => stopScript());
ipcMain.handle('script:state', () => ({ state: scriptState, log: scriptLog.slice(-MAX_LOG_LINES) }));
ipcMain.handle('script:path', () => {
  const configured = settings.get().scriptPath;
  return configured && fs.existsSync(configured) ? configured : bundledScriptPath();
});
ipcMain.handle('script:pick', async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose a startup script',
    properties: ['openFile']
  });
  if (res.canceled || !res.filePaths[0]) return { ok: false };
  settings.set({ scriptPath: res.filePaths[0] });
  broadcastSettings();
  return { ok: true, path: res.filePaths[0] };
});
ipcMain.handle('script:reveal', async () => {
  const configured = settings.get().scriptPath;
  const p = configured && fs.existsSync(configured) ? configured : bundledScriptPath();
  shell.showItemInFolder(p);
  return { ok: true, path: p };
});

/* --- ad blocking ---------------------------------------------------- */

ipcMain.handle('adblock:get', () => adBlocker.summary());
ipcMain.handle('adblock:set', (_e, patch) => {
  const next = browserStore.setAdblock(patch || {});
  adBlocker.configure({ ...next });
  return adBlocker.summary();
});
ipcMain.handle('adblock:reset-stats', () => {
  adBlocker.resetStats();
  return adBlocker.summary();
});

/* --- history / bookmarks / suggestions ------------------------------- */

ipcMain.handle('history:list', (_e, query) => browserStore.searchHistory(query || ''));
ipcMain.handle('history:clear', (_e, range) => browserStore.clearHistory(range || 'all'));
ipcMain.handle('history:delete', (_e, url) => {
  browserStore.deleteHistoryEntry(url);
  return true;
});
ipcMain.handle('history:suggest', (_e, query) => browserStore.suggest(query || ''));

ipcMain.handle('bookmarks:list', () => browserStore.listBookmarks());
ipcMain.handle('bookmarks:add', (_e, payload) => {
  const item = browserStore.addBookmark(payload || {});
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('bookmarks:changed', browserStore.listBookmarks());
  }
  return item;
});
ipcMain.handle('bookmarks:remove', (_e, id) => {
  const removed = browserStore.removeBookmark(id);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('bookmarks:changed', browserStore.listBookmarks());
  }
  return removed;
});
ipcMain.handle('bookmarks:update', (_e, id, patch) => browserStore.updateBookmark(id, patch));
ipcMain.handle('bookmarks:is', (_e, url) => browserStore.isBookmarked(url));

/* --- downloads ------------------------------------------------------- */

ipcMain.handle('downloads:list', () => browserStore.listDownloads());
ipcMain.handle('downloads:clear', () => {
  browserStore.clearDownloads();
  return browserStore.listDownloads();
});
ipcMain.handle('downloads:open', async (_e, id) => {
  const item = browserStore.listDownloads().find((d) => d.id === id);
  if (!item || !item.path) return { ok: false };
  if (!fs.existsSync(item.path)) return { ok: false, error: 'That file is gone.' };
  await shell.openPath(item.path);
  return { ok: true };
});
ipcMain.handle('downloads:reveal', (_e, idOrPath) => {
  const item = browserStore.listDownloads().find((d) => d.id === idOrPath);
  const target = item ? item.path : idOrPath;
  if (target && fs.existsSync(target)) {
    shell.showItemInFolder(target);
    return { ok: true };
  }
  return { ok: false };
});
ipcMain.handle('downloads:folder', () => {
  shell.openPath(app.getPath('downloads'));
  return app.getPath('downloads');
});

/* --- extensions ------------------------------------------------------ */

ipcMain.handle('extensions:list', () => extensions.list());
ipcMain.handle('extensions:install', async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: 'Install an extension',
    message: 'Pick an unpacked extension folder, a .zip, or a .crx file',
    properties: ['openFile', 'openDirectory'],
    filters: [{ name: 'Chrome extension', extensions: ['zip', 'crx'] }]
  });
  if (res.canceled || !res.filePaths[0]) return { ok: false, canceled: true };
  const result = await extensions.install(res.filePaths[0]);
  return result;
});
ipcMain.handle('extensions:set-enabled', (_e, id, enabled) => extensions.setEnabled(id, enabled));
ipcMain.handle('extensions:folder', () => {
  const dir = extensions.dir;
  fs.mkdirSync(dir, { recursive: true });
  shell.openPath(dir);
  return dir;
});
ipcMain.handle('extensions:remove', (_e, id) => extensions.remove(id));

/* --- YouTube / mini player ------------------------------------------- */

ipcMain.handle('mini:open', (_e, video) => openMiniPlayer(video));
ipcMain.handle('mini:close', () => {
  closeMiniPlayer();
  return true;
});
ipcMain.handle('mini:get', () => miniState);
ipcMain.handle('mini:focus-source', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    if (miniState.video && miniState.video.id) {
      mainWindow.webContents.send('navigate', `https://www.youtube.com/watch?v=${miniState.video.id}`);
    }
  }
  return true;
});
ipcMain.handle('mini:toggle-play', () => {
  toggleMiniPlay();
  return miniState;
});
ipcMain.handle('mini:toggle-size', () => {
  if (!miniWindow || miniWindow.isDestroyed()) return false;
  const current = miniWindow.getBounds();
  const large = current.width >= MINI_SIZES.large.width - 10;
  const size = large ? MINI_SIZES.normal : MINI_SIZES.large;
  miniWindow.setBounds({
    x: current.x + Math.round((current.width - size.width) / 2),
    y: current.y,
    width: size.width,
    height: size.height
  });
  return !large;
});
ipcMain.handle('mini:always-on-top', (_e, on) => {
  if (!miniWindow || miniWindow.isDestroyed()) return false;
  miniWindow.setAlwaysOnTop(!!on, 'floating');
  return miniWindow.isAlwaysOnTop();
});

// --- mini window geometry (screen coordinates from the renderer) --------
ipcMain.handle('mini:drag-start', () => {
  if (!miniWindow || miniWindow.isDestroyed()) return false;
  miniDrag = { bounds: miniWindow.getBounds() };
  return true;
});
ipcMain.handle('mini:drag-move', (_e, point) => {
  if (!miniWindow || miniWindow.isDestroyed() || !miniDrag) return false;
  if (!point || typeof point.x !== 'number') return false;
  const { screen } = require('electron');
  const cursor = screen.getCursorScreenPoint();
  const offset = miniDrag.offset || null;
  if (!offset) {
    miniDrag.offset = { x: cursor.x - miniDrag.bounds.x, y: cursor.y - miniDrag.bounds.y };
  }
  miniWindow.setPosition(
    Math.round(cursor.x - miniDrag.offset.x),
    Math.round(cursor.y - miniDrag.offset.y)
  );
  return true;
});
ipcMain.handle('mini:drag-end', () => {
  miniDrag = null;
  return true;
});

ipcMain.handle('mini:resize-start', () => {
  if (!miniWindow || miniWindow.isDestroyed()) return false;
  const { screen } = require('electron');
  const cursor = screen.getCursorScreenPoint();
  const b = miniWindow.getBounds();
  miniResize = { startX: cursor.x, startY: cursor.y, width: b.width, height: b.height };
  return true;
});
ipcMain.handle('mini:resize-move', () => {
  if (!miniWindow || miniWindow.isDestroyed() || !miniResize) return false;
  const { screen } = require('electron');
  const cursor = screen.getCursorScreenPoint();
  const width = Math.max(280, miniResize.width + (cursor.x - miniResize.startX));
  const height = Math.max(200, miniResize.height + (cursor.y - miniResize.startY));
  miniWindow.setBounds({ width, height });
  return true;
});
ipcMain.handle('mini:resize-end', () => {
  miniResize = null;
  return true;
});

ipcMain.handle('youtube:get', () => browserStore.youtube);
ipcMain.handle('youtube:set', (_e, patch) => browserStore.setYoutube(patch || {}));

/* --- misc browsing --------------------------------------------------- */

ipcMain.handle('shell:open-downloads', () => {
  shell.openPath(app.getPath('downloads'));
  return true;
});
ipcMain.handle('shell:clear-data', async () => {
  const browseSession = session.fromPartition(BROWSE_PARTITION);
  await browseSession.clearStorageData();
  await browseSession.clearCache();
  return true;
});
ipcMain.handle('store:export', () => browserStore.exportAll());

ipcMain.handle('window:minimize', () => mainWindow && mainWindow.minimize());
ipcMain.handle('window:maximize', () => {
  if (!mainWindow) return false;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
  return mainWindow.isMaximized();
});
ipcMain.handle('window:close', () => mainWindow && mainWindow.close());
ipcMain.handle('window:is-maximized', () => !!(mainWindow && mainWindow.isMaximized()));

ipcMain.handle('shell:open-external', (_e, url) => {
  if (/^https?:/i.test(url)) shell.openExternal(url);
});
ipcMain.handle('app:info', () => ({
  version: app.getVersion(),
  installDir: installDir || null,
  electron: process.versions.electron,
  chrome: process.versions.chrome,
  node: process.versions.node,
  platform: process.platform,
  packaged: app.isPackaged,
  userData: app.getPath('userData')
}));
