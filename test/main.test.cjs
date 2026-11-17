const Module = require('module');
const path = require('path');
const os = require('os');
const fs = require('fs');

/**
 * Headless checks for the main process: settings persistence, IPC surface and
 * the start-script runner. Electron itself is stubbed, so this runs anywhere:
 *
 *   node test/main.test.cjs
 */
let failures = 0;
const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'arena-'));
const handlers = {};
const call = (ch, ...args) => handlers[ch]({}, ...args);
const sent = [];

const fakeWin = {
  webContents: { send: (c, p) => sent.push([c, p]), setWindowOpenHandler(){}, on(){}, openDevTools(){} },
  isDestroyed: () => false, isMaximized: () => false, maximize(){}, unmaximize(){},
  minimize(){}, close(){}, show(){}, loadFile(){}, getBounds: () => ({}), on(){}, once(){}
};

const electronStub = {
  app: {
    isPackaged: false,
    getPath: (n) => (n === 'userData' ? userData : os.tmpdir()),
    getVersion: () => '1.0.0',
    whenReady: () => Promise.resolve(),
    on(){}, quit(){}
  },
  BrowserWindow: Object.assign(function(){ return fakeWin; }, { getAllWindows: () => [] }),
  ipcMain: { handle: (ch, fn) => { handlers[ch] = fn; } },
  shell: { openExternal(){}, openPath(){}, showItemInFolder(){} },
  Menu: { setApplicationMenu(){}, buildFromTemplate: () => ({}) },
  Tray: function(){ return {}; },
  nativeImage: { createFromPath: () => ({}) },
  dialog: { showSaveDialog: async () => ({ canceled: true }), showOpenDialog: async () => ({ canceled: true }) },
  session: { defaultSession: { setPermissionRequestHandler(){} } }
};

const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'electron') return electronStub;
  return origLoad.apply(this, arguments);
};

(async () => {
  require(path.join(__dirname, '..', 'electron', 'main.js'));
  await new Promise((r) => setTimeout(r, 300));

  const ok = (label, cond, extra='') => {
    if (!cond) failures++;
    console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? ' :: ' + extra : ''}`);
  };

  // 1. settings defaults
  let s = await call('settings:get', );
  ok('settings default theme', s.theme === 'arena');
  ok('settings default home', s.homeUrl === 'https://arena.ai/agent');

  // 2. settings mutation persists to disk
  s = await call('settings:set', { theme: 'chatgpt', radius: 14, connections: [{id:'x',name:'X',url:'https://example.com'}] });
  await new Promise((r) => setTimeout(r, 400));
  const onDisk = JSON.parse(fs.readFileSync(path.join(userData, 'settings.json'), 'utf8'));
  ok('settings written to disk', onDisk.theme === 'chatgpt' && onDisk.radius === 14, JSON.stringify({theme:onDisk.theme,radius:onDisk.radius,files:fs.readdirSync(userData)}));
  ok('connections replaced', onDisk.connections.length === 1);
  ok('changed broadcast sent', sent.some(([c]) => c === 'settings:changed'));

  // 3. reset
  s = await call('settings:reset', );
  ok('reset restores defaults', s.theme === 'arena');

  // Let the automatic startup run finish so it can't race the manual run below.
  await new Promise((r) => setTimeout(r, 1500));

  // 4. script path resolves to bundled start.sh (linux here)
  const sp = await call('script:path', );
  ok('script path found', fs.existsSync(sp), sp);

  // 5. run the script and verify it streams output + reports exit 0
  const run = await call('script:run', );
  ok('script launch ok', run.ok === true);
  await new Promise((r) => setTimeout(r, 1200));
  const st = await call('script:state', );
  ok('script finished', st.state.running === false && st.state.code === 0, JSON.stringify(st.state));
  ok('script produced output', st.log.length > 0, `${st.log.length} lines`);
  ok('log contains banner', st.log.some((l) => /ARENA|A R E N A|start\.sh/i.test(l.line)));
  ok('logs streamed to renderer', sent.filter(([c]) => c === 'script:log').length > 0);

  // 5b. the launcher must NEVER be runnable from inside the app (recursion)
  await call('settings:set', { scriptPath: path.join(__dirname, '..', 'start.sh') });
  const guarded = await call('script:run');
  ok('refuses to run the launcher', guarded.ok === false, guarded.error);
  ok('does not set running state', (await call('script:state')).state.running === false);
  await call('settings:set', { scriptPath: '' });

  // 6. app info
  const info = await call('app:info', );
  ok('app info shape', info.version === '1.0.0' && info.platform);

  // 7. window ipc
  ok('window:is-maximized', (await call('window:is-maximized', )) === false);

  console.log('\n--- script output tail ---');
  console.log(st.log.slice(-6).map((l) => `${l.stream}: ${l.line}`).join('\n'));

  console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
})();
