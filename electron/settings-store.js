'use strict';

/**
 * Tiny dependency-free JSON settings store.
 * Writes atomically so a crash never leaves a half-written config behind.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_SETTINGS = {
  version: 1,

  // --- where the shell goes ---
  homeUrl: 'https://arena.ai/agent',
  connections: [
    { id: 'arena-agent', name: 'Arena Agent', url: 'https://arena.ai/agent', icon: '◆' }
  ],
  activeConnectionId: 'arena-agent',

  // --- appearance ---
  theme: 'arena',            // arena | claude-code | chatgpt | claude-light | midnight
  accent: '',                // '' = use theme accent, otherwise #rrggbb
  fontFamily: '',            // '' = theme default
  monoFamily: '',            // '' = theme default
  fontSize: 14,              // px, base UI font size
  radius: 10,                // px
  density: 'cozy',           // compact | cozy | roomy
  uiScale: 1,                // 0.85 - 1.3
  animations: true,
  transparency: false,
  pageZoom: 1,
  pageStyling: 'subtle',     // none | subtle | aggressive
  customCss: '',

  // --- layout ---
  sidebar: true,
  sidebarWidth: 248,
  showTitlebarUrl: true,
  showStatusbar: true,

  // --- runtime ---
  runScriptOnStartup: true,
  scriptPath: '',            // '' = bundled start.bat / start.sh
  openDevTools: false,

  // --- window ---
  windowBounds: { width: 1320, height: 860, x: null, y: null, maximized: false }
};

function deepMerge(base, patch) {
  if (Array.isArray(base)) return Array.isArray(patch) ? patch : base;
  if (typeof base !== 'object' || base === null) return patch === undefined ? base : patch;
  const out = Array.isArray(patch) ? [...base] : { ...base };
  if (patch && typeof patch === 'object') {
    for (const key of Object.keys(patch)) {
      if (key in base) out[key] = deepMerge(base[key], patch[key]);
      else out[key] = patch[key];
    }
  }
  return out;
}

class SettingsStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = this._read();
    this._saveTimer = null;
    this._dirty = false;
  }

  _read() {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      return deepMerge(DEFAULT_SETTINGS, parsed);
    } catch {
      return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    }
  }

  get() {
    return this.data;
  }

  get defaults() {
    return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  }

  set(patch) {
    this.data = deepMerge(this.data, patch || {});
    this.scheduleSave();
    return this.data;
  }

  replace(next) {
    this.data = deepMerge(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)), next || {});
    this.scheduleSave();
    return this.data;
  }

  reset() {
    this.data = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    this.scheduleSave();
    return this.data;
  }

  flush() {
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
      this._saveTimer = null;
    }
    this._dirty = true;
    this.save();
    return this.data;
  }

  /**
   * Mark dirty and start the flush clock. Once armed, the timer is never
   * re-armed — it always writes whatever the latest in-memory state is, so a
   * burst of rapid updates (dragging a slider) produces exactly one write.
   */
  scheduleSave() {
    this._dirty = true;
    if (this._saveTimer) return;
    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;
      this.save();
    }, 120);
    if (this._saveTimer.unref) this._saveTimer.unref();
  }

  save() {
    if (!this._dirty && fs.existsSync(this.filePath)) return;
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      const tmp = `${this.filePath}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf8');
      fs.renameSync(tmp, this.filePath);
      this._dirty = false;
    } catch (err) {
      console.error('[settings] could not save:', err.message);
    }
  }
}

module.exports = { SettingsStore, DEFAULT_SETTINGS };
