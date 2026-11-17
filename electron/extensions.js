'use strict';

/**
 * Chrome-extension support.
 *
 * Electron can load *unpacked* Chrome extensions (MV2 and a subset of MV3)
 * via session.loadExtension(). It cannot install .crx files from the Web Store
 * — Google's update service is the only thing allowed to do that — so this
 * module supports:
 *
 *   - installing a folder the user picks (unpacked extension)
 *   - installing a .zip / .crx the user downloaded (we unpack it first)
 *   - enabling / disabling / removing
 *   - listing what is loaded and what failed, with the real error text
 *
 * Everything is stored under <userData>/extensions/<id>/ so removals are clean.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

function isDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function readManifest(dir) {
  const file = path.join(dir, 'manifest.json');
  if (!fs.existsSync(file)) return null;
  try {
    const raw = fs.readFileSync(file, 'utf8');
    // Chrome allows // comments and trailing commas in manifest.json.
    const cleaned = raw
      .replace(/^\s*\/\/.*$/gm, '')
      .replace(/,(\s*[}\]])/g, '$1');
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

/** A stable id derived from the source path, so reinstalls update in place. */
function idForPath(p) {
  return crypto.createHash('sha1').update(path.resolve(p)).digest('hex').slice(0, 16);
}

/**
 * Find the folder that actually contains manifest.json.
 * Handles both `ext/` and the very common `ext/extension-name/` from zips.
 */
function findExtensionRoot(startDir) {
  if (readManifest(startDir)) return startDir;
  let entries = [];
  try {
    entries = fs.readdirSync(startDir, { withFileTypes: true });
  } catch {
    return null;
  }
  const dirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith('__MACOSX'));
  if (dirs.length === 1) {
    const nested = findExtensionRoot(path.join(startDir, dirs[0].name));
    if (nested) return nested;
  }
  for (const d of dirs) {
    const found = findExtensionRoot(path.join(startDir, d.name));
    if (found) return found;
  }
  return null;
}

function unzip(zipPath, destDir, platform) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(destDir, { recursive: true });
    let args;
    let cmd;
    if (platform === 'win32') {
      cmd = 'powershell';
      args = [
        '-NoProfile', '-NonInteractive', '-Command',
        `Expand-Archive -LiteralPath "${zipPath}" -DestinationPath "${destDir}" -Force`
      ];
    } else {
      cmd = 'unzip';
      args = ['-o', '-q', zipPath, '-d', destDir];
    }
    const child = spawn(cmd, args, { windowsHide: true });
    let err = '';
    child.stderr.on('data', (d) => { err += d; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(err.trim() || `unzip exited with ${code}`));
    });
  });
}

class ExtensionManager {
  /**
   * @param {Electron.Session} browserSession
   * @param {BrowserStore} store
   * @param {object} opts { dir, platform, onEvent }
   */
  constructor(browserSession, store, opts = {}) {
    this.session = browserSession;
    this.store = store;
    this.dir = opts.dir;
    this.platform = opts.platform || process.platform;
    this.onEvent = opts.onEvent || (() => {});
    this.loaded = new Map(); // id -> Electron.Extension
    this.failures = new Map(); // id -> message
  }

  list() {
    return this.store.listExtensions().map((e) => ({
      ...e,
      loaded: this.loaded.has(e.id),
      error: this.failures.get(e.id) || null
    }));
  }

  async loadAll() {
    for (const entry of this.store.listExtensions()) {
      if (!entry.enabled) continue;
      await this._loadOne(entry);
    }
    this._emit();
  }

  async _loadOne(entry) {
    const extPath = entry.path;
    if (!extPath || !isDir(extPath) || !readManifest(extPath)) {
      this.failures.set(entry.id, 'Files are missing — reinstall this extension.');
      return false;
    }
    try {
      const ext = await this.session.loadExtension(extPath, { allowFileAccess: true });
      this.loaded.set(entry.id, ext);
      this.failures.delete(entry.id);
      return true;
    } catch (err) {
      // Surface the real reason: MV3 service workers, unsupported APIs, etc.
      this.failures.set(entry.id, String(err.message || err).split('\n')[0]);
      return false;
    }
  }

  /**
   * Install from a folder or a .zip/.crx file.
   * Returns { ok, extension } or { ok:false, error }.
   */
  async install(inputPath) {
    try {
      if (!fs.existsSync(inputPath)) return { ok: false, error: 'That path does not exist.' };

      let sourceDir = inputPath;
      let tempDir = null;

      const stat = fs.statSync(inputPath);
      if (stat.isFile()) {
        const ext = path.extname(inputPath).toLowerCase();
        if (ext !== '.zip' && ext !== '.crx') {
          return { ok: false, error: 'Pick a folder, a .zip, or a .crx file.' };
        }
        tempDir = path.join(this.dir, 'tmp', `${Date.now()}`);
        if (ext === '.crx') {
          await this._unpackCrx(inputPath, tempDir);
        } else {
          await unzip(inputPath, tempDir, this.platform);
        }
        sourceDir = tempDir;
      }

      const root = findExtensionRoot(sourceDir);
      if (!root) {
        return { ok: false, error: 'No manifest.json found — that is not a Chrome extension.' };
      }

      const manifest = readManifest(root);
      if (!manifest || !manifest.name || !manifest.version) {
        return { ok: false, error: 'manifest.json is missing a name or version.' };
      }

      // Copy into our own storage so the user can move/delete the original.
      const id = idForPath(inputPath);
      const dest = path.join(this.dir, id);
      fs.rmSync(dest, { recursive: true, force: true });
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      copyDir(root, dest);

      if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });

      const record = this.store.addExtension({
        id,
        name: String(manifest.name).slice(0, 80),
        version: String(manifest.version),
        description: String(manifest.description || '').slice(0, 200),
        manifestVersion: manifest.manifest_version || 2,
        path: dest,
        enabled: true,
        installedAt: Date.now()
      });

      const loaded = await this._loadOne(record);
      this._emit();

      if (!loaded) {
        return {
          ok: true,
          extension: { ...record, loaded: false, error: this.failures.get(id) },
          warning: `Installed, but Chrome could not start it: ${this.failures.get(id)}`
        };
      }
      return { ok: true, extension: { ...record, loaded: true, error: null } };
    } catch (err) {
      return { ok: false, error: String(err.message || err) };
    }
  }

  /** .crx files are a header + zip; find the PK signature and unpack from there. */
  async _unpackCrx(crxPath, destDir) {
    const buf = fs.readFileSync(crxPath);
    const pkIndex = buf.indexOf(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    if (pkIndex < 0) throw new Error('That .crx file is not valid (no zip payload found).');
    const zipPath = path.join(destDir, 'payload.zip');
    fs.mkdirSync(destDir, { recursive: true });
    fs.writeFileSync(zipPath, buf.subarray(pkIndex));
    await unzip(zipPath, destDir, this.platform);
    fs.rmSync(zipPath, { force: true });
  }

  async setEnabled(id, enabled) {
    const entry = this.store.setExtensionEnabled(id, enabled);
    if (!entry) return { ok: false, error: 'Unknown extension.' };

    if (enabled) {
      await this._loadOne(entry);
    } else {
      // Disabling must actually unload it from the session, otherwise it keeps
      // running until restart.
      this._unload(id);
    }
    this._emit();
    return { ok: true, extension: { ...entry, loaded: this.loaded.has(id) } };
  }

  /** Remove a loaded extension from the session (best effort across versions). */
  _unload(id) {
    const loaded = this.loaded.get(id);
    if (!loaded) return;
    try {
      if (typeof this.session.removeExtension === 'function') {
        this.session.removeExtension(loaded.id || id);
      }
    } catch { /* nothing else we can do; it stops at next restart */ }
    this.loaded.delete(id);
  }

  async remove(id) {
    const entry = this.store.listExtensions().find((e) => e.id === id);
    this._unload(id);
    this.failures.delete(id);
    this.store.removeExtension(id);
    if (entry && entry.path && entry.path.startsWith(this.dir)) {
      try {
        fs.rmSync(entry.path, { recursive: true, force: true });
      } catch { /* best effort */ }
    }
    this._emit();
    return { ok: true };
  }

  _emit() {
    this.onEvent(this.list());
  }
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dst);
    else if (entry.isSymbolicLink()) fs.symlinkSync(fs.readlinkSync(src), dst);
    else fs.copyFileSync(src, dst);
  }
}

module.exports = { ExtensionManager, findExtensionRoot, readManifest, idForPath, copyDir };
