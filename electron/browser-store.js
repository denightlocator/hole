'use strict';

/**
 * Persistent browser state: history, bookmarks, downloads, extensions.
 *
 * Same atomic-write pattern as SettingsStore, but these files can grow, so
 * history is capped and written on a timer rather than per entry.
 */

const fs = require('fs');
const path = require('path');

const HISTORY_LIMIT = 4000;
const DOWNLOAD_LIMIT = 500;

const DEFAULTS = {
  bookmarks: [],   // { id, title, url, folder, addedAt }
  downloads: [],   // { id, filename, path, url, state, received, total, startedAt, endedAt }
  extensions: [],  // { id, name, version, path, enabled, installedAt }
  adblock: {
    enabled: true,
    blockAds: true,
    blockTrackers: true,
    cosmetic: true,
    allowlist: [],
    rules: []
  },
  youtube: {
    enabled: true,
    popoutOnNavigate: true,   // if you leave YouTube while a video plays, keep the audio
    defaultQuality: '',
    miniPlayerCorner: 'bottom-right'
  }
};

function readJson(file, fallback) {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw);
  } catch {
    return JSON.parse(JSON.stringify(fallback));
  }
}

function writeJsonAtomic(file, data) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, file);
    return true;
  } catch (err) {
    console.error(`[store] could not write ${path.basename(file)}:`, err.message);
    return false;
  }
}

class BrowserStore {
  constructor(dir) {
    this.dir = dir;
    this.files = {
      history: path.join(dir, 'history.json'),
      bookmarks: path.join(dir, 'bookmarks.json'),
      downloads: path.join(dir, 'downloads.json'),
      extensions: path.join(dir, 'extensions.json'),
      adblock: path.join(dir, 'adblock.json'),
      youtube: path.join(dir, 'youtube.json')
    };

    this.history = readJson(this.files.history, { entries: [] });
    this.bookmarks = readJson(this.files.bookmarks, { items: [] });
    this.downloads = readJson(this.files.downloads, { items: [] });
    this.extensions = readJson(this.files.extensions, { items: [] });
    this.adblock = { ...DEFAULTS.adblock, ...readJson(this.files.adblock, {}) };
    this.youtube = { ...DEFAULTS.youtube, ...readJson(this.files.youtube, {}) };

    if (!Array.isArray(this.history.entries)) this.history.entries = [];
    for (const key of ['bookmarks', 'downloads', 'extensions']) {
      if (!Array.isArray(this[key].items)) this[key].items = [];
    }
  }

  get defaults() {
    return JSON.parse(JSON.stringify(DEFAULTS));
  }

  /* ------------------------------------------------------------ history -- */

  addHistory({ url, title, favicon }) {
    if (!url || /^(about|chrome|devtools):/i.test(url)) return;
    const entries = this.history.entries;
    const now = Date.now();
    const last = entries[0];
    // Collapse an immediate duplicate (reload / same page event twice).
    if (last && last.url === url && now - last.at < 4000) {
      last.at = now;
      if (title) last.title = title;
      this._scheduleSave('history');
      return;
    }
    entries.unshift({ url, title: title || url, favicon: favicon || '', at: now, visits: 1 });
    // Aggregate repeat visits so search ranking is meaningful.
    const seen = entries.slice(1).find((e) => e.url === url);
    if (seen) seen.visits = (seen.visits || 1) + 1;
    if (entries.length > HISTORY_LIMIT) entries.length = HISTORY_LIMIT;
    this._scheduleSave('history');
  }

  searchHistory(query, limit = 200) {
    const q = String(query || '').toLowerCase().trim();
    const list = this.history.entries;
    if (!q) return list.slice(0, limit);
    return list
      .filter((e) => e.url.toLowerCase().includes(q) || (e.title || '').toLowerCase().includes(q))
      .slice(0, limit);
  }

  /** Suggestions for the URL bar: history first, then bookmarks. */
  suggest(query, limit = 8) {
    const q = String(query || '').toLowerCase().trim();
    if (!q) return [];
    const out = [];
    const seen = new Set();
    for (const e of this.history.entries) {
      const hay = `${e.title} ${e.url}`.toLowerCase();
      if (!hay.includes(q)) continue;
      const key = e.url;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ kind: 'history', title: e.title, url: e.url, visits: e.visits || 1 });
      if (out.length >= limit) return out;
    }
    for (const b of this.bookmarks.items) {
      const hay = `${b.title} ${b.url}`.toLowerCase();
      if (!hay.includes(q)) continue;
      if (seen.has(b.url)) continue;
      seen.add(b.url);
      out.push({ kind: 'bookmark', title: b.title, url: b.url });
      if (out.length >= limit) break;
    }
    return out;
  }

  clearHistory(range) {
    const now = Date.now();
    const spans = { hour: 36e5, day: 864e5, week: 6048e5, all: Infinity };
    const span = spans[range] === undefined ? Infinity : spans[range];
    this.history.entries = span === Infinity
      ? []
      : this.history.entries.filter((e) => now - e.at > span);
    this._scheduleSave('history');
    return this.history.entries.length;
  }

  deleteHistoryEntry(url) {
    this.history.entries = this.history.entries.filter((e) => e.url !== url);
    this._scheduleSave('history');
  }

  /* ---------------------------------------------------------- bookmarks -- */

  listBookmarks() {
    return this.bookmarks.items;
  }

  addBookmark({ url, title, folder = '' }) {
    if (!url) return null;
    const existing = this.bookmarks.items.find((b) => b.url === url);
    if (existing) {
      existing.title = title || existing.title;
      if (folder) existing.folder = folder;
      this._scheduleSave('bookmarks');
      return existing;
    }
    const item = {
      id: `bm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      url,
      title: title || url,
      folder,
      addedAt: Date.now()
    };
    this.bookmarks.items.unshift(item);
    this._scheduleSave('bookmarks');
    return item;
  }

  removeBookmark(id) {
    const before = this.bookmarks.items.length;
    this.bookmarks.items = this.bookmarks.items.filter((b) => b.id !== id);
    this._scheduleSave('bookmarks');
    return this.bookmarks.items.length !== before;
  }

  updateBookmark(id, patch) {
    const item = this.bookmarks.items.find((b) => b.id === id);
    if (!item) return null;
    Object.assign(item, patch || {});
    this._scheduleSave('bookmarks');
    return item;
  }

  isBookmarked(url) {
    return this.bookmarks.items.some((b) => b.url === url);
  }

  /* ---------------------------------------------------------- downloads -- */

  upsertDownload(record) {
    const items = this.downloads.items;
    const idx = items.findIndex((d) => d.id === record.id);
    if (idx === -1) items.unshift(record);
    else items[idx] = { ...items[idx], ...record };
    if (items.length > DOWNLOAD_LIMIT) items.length = DOWNLOAD_LIMIT;
    this._scheduleSave('downloads');
    return record;
  }

  listDownloads() {
    return this.downloads.items;
  }

  clearDownloads() {
    // Remove finished entries only; in-flight ones stay.
    this.downloads.items = this.downloads.items.filter((d) => d.state === 'progressing');
    this._scheduleSave('downloads');
  }

  /* --------------------------------------------------------- extensions -- */

  listExtensions() {
    return this.extensions.items;
  }

  addExtension(record) {
    const items = this.extensions.items;
    const existing = items.findIndex((e) => e.path === record.path);
    if (existing !== -1) items[existing] = { ...items[existing], ...record };
    else items.push(record);
    this._scheduleSave('extensions');
    return record;
  }

  removeExtension(id) {
    this.extensions.items = this.extensions.items.filter((e) => e.id !== id);
    this._scheduleSave('extensions');
  }

  setExtensionEnabled(id, enabled) {
    const item = this.extensions.items.find((e) => e.id === id);
    if (!item) return null;
    item.enabled = !!enabled;
    this._scheduleSave('extensions');
    return item;
  }

  /* -------------------------------------------------------- adblock/youtube */

  setAdblock(patch) {
    this.adblock = { ...this.adblock, ...(patch || {}) };
    this._scheduleSave('adblock');
    return this.adblock;
  }

  setYoutube(patch) {
    this.youtube = { ...this.youtube, ...(patch || {}) };
    this._scheduleSave('youtube');
    return this.youtube;
  }

  /* -------------------------------------------------------------- saving -- */

  _scheduleSave(key) {
    this._pending = this._pending || new Set();
    this._pending.add(key);
    if (this._saveTimer) return;
    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;
      this.flush();
    }, 400);
    if (this._saveTimer.unref) this._saveTimer.unref();
  }

  flush() {
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
      this._saveTimer = null;
    }
    if (!this._pending) return;
    for (const key of this._pending) {
      const data = this[key];
      if (data) writeJsonAtomic(this.files[key], data);
    }
    this._pending.clear();
  }

  /** Export everything the user might want to back up, history excluded. */
  exportAll() {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      bookmarks: this.bookmarks.items,
      downloads: this.downloads.items,
      adblock: this.adblock,
      youtube: this.youtube,
      extensions: this.extensions.items.map(({ path: _p, ...rest }) => rest)
    };
  }
}

module.exports = { BrowserStore, HISTORY_LIMIT, DEFAULTS };
