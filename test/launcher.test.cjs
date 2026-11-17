// Verify the app honours `--settings-file` / `--install-dir` from the launcher.
const Module = require('module');
const path = require('path');
const os = require('os');
const fs = require('fs');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'asargs-'));
const settingsFile = path.join(tmp, 'data', 'shell-settings.json');
const installDir = '/tmp/fake-install';

// What start.bat/bootstrap passes:  electron <app> -- --settings-file=... --install-dir=...
process.argv.push('--', `--settings-file=${settingsFile}`, `--install-dir=${installDir}`);

const handlers = {};
const call = (ch, ...a) => handlers[ch]({}, ...a);
const fakeWin = {
  webContents: { send(){}, setWindowOpenHandler(){}, on(){}, openDevTools(){} },
  isDestroyed: () => false, isMaximized: () => false, maximize(){}, unmaximize(){},
  minimize(){}, close(){}, show(){}, loadFile(){}, getBounds: () => ({}), on(){}, once(){}
};
const stub = {
  app: { isPackaged: false, getPath: (n) => (n === 'userData' ? tmp : os.tmpdir()),
         getVersion: () => '1.0.0', whenReady: () => Promise.resolve(), on(){}, quit(){},
         requestSingleInstanceLock: () => true },
  BrowserWindow: Object.assign(function(){ return fakeWin; }, { getAllWindows: () => [] }),
  ipcMain: { handle: (c, f) => { handlers[c] = f; } },
  shell: {}, Menu: { setApplicationMenu(){}, buildFromTemplate: () => ({}) },
  Tray: function(){}, nativeImage: { createFromPath: () => ({}) }, dialog: {},
  session: { defaultSession: { setPermissionRequestHandler(){} } }
};
const orig = Module._load;
Module._load = function (r) { if (r === 'electron') return stub; return orig.apply(this, arguments); };

let fails = 0;
const ok = (l, c, x='') => { if (!c) fails++; console.log(`${c?'PASS':'FAIL'}  ${l}${x?' :: '+x:''}`); };

(async () => {
  require(path.join(__dirname, '..', 'electron', 'main.js'));
  await new Promise(r => setTimeout(r, 300));

  await call('settings:set', { theme: 'chatgpt' });
  await new Promise(r => setTimeout(r, 300));

  ok('writes to the launcher settings file', fs.existsSync(settingsFile), settingsFile);
  if (fs.existsSync(settingsFile)) {
    ok('settings content correct', JSON.parse(fs.readFileSync(settingsFile,'utf8')).theme === 'chatgpt');
  }

  const info = await call('app:info');
  ok('reports install dir', info.installDir === installDir, String(info.installDir));

  const scriptPath = await call('script:path');
  ok('start script resolves', typeof scriptPath === 'string' && scriptPath.length > 0, scriptPath);

  console.log(fails === 0 ? '\nAll launcher-arg checks passed.' : `\n${fails} failed.`);
  process.exit(fails ? 1 : 0);
})();
