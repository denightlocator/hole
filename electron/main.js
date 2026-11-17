'use strict';

/**
 * Arena Shell — main process.
 *
 * Responsibilities:
 *   - create the frameless shell window (custom titlebar, settings, etc.)
 *   - host the <webview> that shows the connected website
 *   - run start.bat (Windows) / start.sh (macOS, Linux) on startup
 *   - persist settings to userData/settings.json
 */

const {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  Menu,
  Tray,
  nativeImage,
  dialog,
  session
} = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const { SettingsStore } = require('./settings-store');

const isDev = process.argv.includes('--dev');
const isWindows = process.platform === 'win32';

let mainWindow = null;
let tray = null;
let settings = null;
let scriptLog = [];
let scriptState = { running: false, code: null, startedAt: null, endedAt: null, command: '' };

const MAX_LOG_LINES = 500;

/* ------------------------------------------------------------------ */
/* paths                                                               */
/* ------------------------------------------------------------------ */

/** Where start.bat lives: bundled resource, or the repo during development. */
function bundledScriptPath() {
  const name = isWindows ? 'start.bat' : 'start.sh';
  const candidates = app.isPackaged
    ? [path.join(process.resourcesPath, name), path.join(path.dirname(app.getPath('exe')), name)]
    : [path.join(__dirname, '..', name), path.join(process.cwd(), name)];
  return candidates.find((p) => fs.existsSync(p)) || candidates[0];
}

function iconPath() {
  const candidates = [
    path.join(__dirname, '..', 'assets', 'icon.png'),
    path.join(process.resourcesPath || '', 'assets', 'icon.png')
  ];
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
    delete webPreferences.preload;
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
    webPreferences.sandbox = true;
  });

  mainWindow.webContents.on('did-attach-webview', (_e, wc) => {
    wc.setWindowOpenHandler(({ url }) => {
      if (/^https?:/i.test(url)) shell.openExternal(url);
      return { action: 'deny' };
    });
  });

  if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
}

/* ------------------------------------------------------------------ */
/* app lifecycle                                                       */
/* ------------------------------------------------------------------ */

app.whenReady().then(() => {
  const settingsFile = path.join(app.getPath('userData'), 'settings.json');
  settings = new SettingsStore(settingsFile);

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
  electron: process.versions.electron,
  chrome: process.versions.chrome,
  node: process.versions.node,
  platform: process.platform,
  packaged: app.isPackaged,
  userData: app.getPath('userData')
}));
