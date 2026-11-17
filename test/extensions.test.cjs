/**
 * Extension install/packing logic. Electron's session is faked, so this runs
 * anywhere and proves the manifest/zip/crx handling without Chrome.
 *
 *   node test/extensions.test.cjs
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const { execFileSync } = require('child_process');

const { ExtensionManager, findExtensionRoot, readManifest } = require('../electron/extensions');
const { BrowserStore } = require('../electron/browser-store');

let failures = 0;
const ok = (label, cond, extra = '') => {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? ' :: ' + extra : ''}`);
};

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'asext-'));
const extStorage = path.join(tmp, 'extensions');
const store = new BrowserStore(path.join(tmp, 'data'));

// Fake Electron session: loadExtension succeeds unless told otherwise.
let loadCalls = [];
const fakeSession = {
  async loadExtension(dir) {
    loadCalls.push(dir);
    const manifest = readManifest(dir) || {};
    if (String(manifest.name || '').includes('Broken')) {
      throw new Error('Service worker registration failed');
    }
    return { id: 'fake-' + (manifest.name || 'x'), name: manifest.name, path: dir };
  }
  ,
  removeExtension() { fakeSession.removed = (fakeSession.removed || 0) + 1; }
};

const mgr = new ExtensionManager(fakeSession, store, { dir: extStorage, platform: 'linux' });

// --- manifest reading ------------------------------------------------------
const goodDir = path.join(tmp, 'good-ext');
fs.mkdirSync(goodDir, { recursive: true });
fs.writeFileSync(path.join(goodDir, 'manifest.json'), JSON.stringify({
  manifest_version: 3, name: 'Test Ext', version: '1.2.3', description: 'does things'
}));
ok('reads a valid manifest', readManifest(goodDir).version === '1.2.3');

const commented = path.join(tmp, 'commented-ext');
fs.mkdirSync(commented, { recursive: true });
fs.writeFileSync(path.join(commented, 'manifest.json'),
  '{\n  // a comment\n  "manifest_version": 2,\n  "name": "C",\n  "version": "1.0",\n}\n');
ok('tolerates comments and trailing commas', readManifest(commented).name === 'C');
ok('missing manifest returns null', readManifest(path.join(tmp, 'nope')) === null);

// --- root discovery --------------------------------------------------------
const nested = path.join(tmp, 'nested', 'MyExtension');
fs.mkdirSync(nested, { recursive: true });
fs.writeFileSync(path.join(nested, 'manifest.json'), '{"name":"N","version":"1"}');
ok('finds manifest one level down', findExtensionRoot(path.join(tmp, 'nested')) === nested);
ok('returns the dir itself when it has a manifest', findExtensionRoot(goodDir) === goodDir);
const bareDir = path.join(tmp, 'no-manifest-here');
fs.mkdirSync(bareDir, { recursive: true });
fs.writeFileSync(path.join(bareDir, 'readme.txt'), 'nothing');
ok('returns null when there is no manifest', findExtensionRoot(bareDir) === null);

// --- install from a folder -------------------------------------------------
(async () => {
  const r1 = await mgr.install(goodDir);
  ok('installs from a folder', r1.ok === true, JSON.stringify(r1).slice(0, 120));
  ok('recorded name and version',
    r1.extension.name === 'Test Ext' && r1.extension.version === '1.2.3');
  ok('copied into managed storage', fs.existsSync(path.join(r1.extension.path, 'manifest.json')));
  ok('loaded into the session', r1.extension.loaded === true);
  ok('appears in list()', mgr.list().length === 1);
  ok('store persisted it', store.listExtensions().length === 1);

  // Re-installing the same path updates rather than duplicating.
  const r1b = await mgr.install(goodDir);
  ok('reinstall does not duplicate', mgr.list().length === 1, `${mgr.list().length}`);
  ok('reinstall keeps the same id', r1b.extension.id === r1.extension.id);

  // --- install from a zip --------------------------------------------------
  const zipSrc = path.join(tmp, 'zip-src', 'zipped-ext');
  fs.mkdirSync(zipSrc, { recursive: true });
  fs.writeFileSync(path.join(zipSrc, 'manifest.json'),
    JSON.stringify({ manifest_version: 2, name: 'Zipped', version: '0.9' }));
  const zipPath = path.join(tmp, 'ext.zip');
  try {
    execFileSync('zip', ['-q', '-r', zipPath, '.'], { cwd: path.join(tmp, 'zip-src') });
    const r2 = await mgr.install(zipPath);
    ok('installs from a .zip', r2.ok === true, String(r2.error || ''));
    ok('zip extension named correctly', r2.extension && r2.extension.name === 'Zipped');
    ok('two extensions now', mgr.list().length === 2);
  } catch (err) {
    ok('installs from a .zip', false, 'zip missing: ' + err.message.split('\n')[0]);
  }

  // --- rejections ----------------------------------------------------------
  const badFile = path.join(tmp, 'notes.txt');
  fs.writeFileSync(badFile, 'hi');
  const rb = await mgr.install(badFile);
  ok('rejects non-archive files', rb.ok === false, rb.error);

  const emptyZipDir = path.join(tmp, 'empty');
  fs.mkdirSync(emptyZipDir, { recursive: true });
  const rz = await mgr.install(emptyZipDir);
  ok('rejects a folder with no manifest', rz.ok === false, rz.error);

  const missing = await mgr.install(path.join(tmp, 'does-not-exist'));
  ok('rejects a missing path', missing.ok === false);

  // --- broken extension surfaces the real error ----------------------------
  const brokenDir = path.join(tmp, 'BROKEN-ext');
  fs.mkdirSync(brokenDir, { recursive: true });
  fs.writeFileSync(path.join(brokenDir, 'manifest.json'),
    JSON.stringify({ manifest_version: 3, name: 'Broken', version: '1.0' }));
  const rbroken = await mgr.install(brokenDir);
  ok('broken extension still installs', rbroken.ok === true);
  ok('broken extension reports a warning', !!rbroken.warning);
  ok('broken extension marked not loaded', rbroken.extension.loaded === false);
  ok('error text is surfaced',
    /Service worker/.test(rbroken.extension.error || ''), String(rbroken.extension.error));

  // --- enable / disable / remove -------------------------------------------
  const target = mgr.list().find((e) => e.name === 'Test Ext');
  const disabled = await mgr.setEnabled(target.id, false);
  ok('can disable', disabled.ok && disabled.extension.loaded === false);
  ok('disable unloads from the session', (fakeSession.removed || 0) > 0);
  ok('disabled state persisted',
    store.listExtensions().find((e) => e.id === target.id).enabled === false);

  loadCalls = [];
  await mgr.setEnabled(target.id, true);
  ok('can re-enable', mgr.list().find((e) => e.id === target.id).loaded === true);
  ok('re-enable triggered a load', loadCalls.length > 0);

  const storedPath = store.listExtensions().find((e) => e.id === target.id).path;
  await mgr.remove(target.id);
  ok('removed from list', !mgr.list().some((e) => e.id === target.id));
  ok('removed from store', !store.listExtensions().some((e) => e.id === target.id));
  ok('deleted files from disk', !fs.existsSync(storedPath));

  // --- loadAll only loads enabled -----------------------------------------
  const onDir = path.join(tmp, 'on-ext');
  const offDir = path.join(tmp, 'off-ext');
  for (const [d, n] of [[onDir, 'On'], [offDir, 'Off']]) {
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, 'manifest.json'), JSON.stringify({ name: n, version: '1' }));
  }
  store.addExtension({ id: 'a1', name: 'On', version: '1', path: onDir, enabled: true });
  store.addExtension({ id: 'a2', name: 'Off', version: '1', path: offDir, enabled: false });
  loadCalls = [];
  await mgr.loadAll();
  ok('loadAll loads the enabled extension', loadCalls.includes(onDir));
  ok('loadAll skips the disabled extension', !loadCalls.includes(offDir));

  store.flush();
  console.log(failures === 0 ? '\nAll extension checks passed.' : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
})();
