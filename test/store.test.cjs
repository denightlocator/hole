/**
 * BrowserStore tests: history, bookmarks, downloads, persistence.
 *
 *   node test/store.test.cjs
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { BrowserStore, HISTORY_LIMIT } = require('../electron/browser-store');

let failures = 0;
const ok = (label, cond, extra = '') => {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? ' :: ' + extra : ''}`);
};

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'asstore-'));
const store = new BrowserStore(dir);

// --- history ---------------------------------------------------------------
store.addHistory({ url: 'https://arena.ai/agent', title: 'Arena Agent' });
store.addHistory({ url: 'https://example.com/docs', title: 'Docs' });
ok('records history', store.history.entries.length === 2);
ok('newest first', store.history.entries[0].url === 'https://example.com/docs');

// duplicate within the collapse window should not add a second row
store.addHistory({ url: 'https://example.com/docs', title: 'Docs' });
ok('collapses immediate duplicates', store.history.entries.length === 2);

// internal urls are ignored
store.addHistory({ url: 'about:blank', title: 'blank' });
store.addHistory({ url: 'devtools://x', title: 'dt' });
ok('ignores internal urls', store.history.entries.length === 2);

ok('searches by title', store.searchHistory('arena').length === 1);
ok('searches by url', store.searchHistory('example.com').length === 1);
ok('empty query returns all', store.searchHistory('').length === 2);

// suggestions merge history + bookmarks
store.addBookmark({ url: 'https://arena.ai/agent', title: 'Arena Agent' });
store.addBookmark({ url: 'https://arena.ai/pricing', title: 'Pricing' });
const sugg = store.suggest('arena');
ok('suggests from history and bookmarks', sugg.length >= 2, `${sugg.length} results`);
ok('no duplicate urls in suggestions',
  new Set(sugg.map((s) => s.url)).size === sugg.length);
ok('empty query suggests nothing', store.suggest('').length === 0);

// history cap
for (let i = 0; i < HISTORY_LIMIT + 50; i++) {
  store.addHistory({ url: `https://bulk.example/${i}`, title: `Bulk ${i}` });
}
ok('caps history length', store.history.entries.length === HISTORY_LIMIT);

// --- bookmarks -------------------------------------------------------------
ok('bookmarks recorded', store.listBookmarks().length === 2);
const dup = store.addBookmark({ url: 'https://arena.ai/agent', title: 'Renamed' });
ok('adding an existing url updates instead of duplicating', store.listBookmarks().length === 2);
ok('updated title kept', dup.title === 'Renamed');
ok('isBookmarked true', store.isBookmarked('https://arena.ai/agent'));
ok('isBookmarked false', !store.isBookmarked('https://nope.example'));
ok('removes bookmark', store.removeBookmark(dup.id) === true);
ok('bookmark gone', !store.isBookmarked('https://arena.ai/agent'));

// --- downloads -------------------------------------------------------------
store.upsertDownload({ id: 'd1', filename: 'a.zip', state: 'progressing', received: 10, total: 100 });
store.upsertDownload({ id: 'd1', filename: 'a.zip', state: 'completed', received: 100, total: 100 });
ok('download upserts, not duplicates', store.listDownloads().length === 1);
ok('download state updated', store.listDownloads()[0].state === 'completed');
store.upsertDownload({ id: 'd2', filename: 'b.pdf', state: 'progressing' });
store.clearDownloads();
ok('clearDownloads keeps in-flight only',
  store.listDownloads().length === 1 && store.listDownloads()[0].id === 'd2');

// --- extensions ------------------------------------------------------------
store.addExtension({ id: 'e1', name: 'Dark Reader', version: '4.9', path: '/x/dark', enabled: true });
store.addExtension({ id: 'e1', name: 'Dark Reader', version: '4.9.1', path: '/x/dark', enabled: true });
ok('extension upserts by path', store.listExtensions().length === 1);
ok('extension version updated', store.listExtensions()[0].version === '4.9.1');
store.setExtensionEnabled('e1', false);
ok('extension can be disabled', store.listExtensions()[0].enabled === false);
store.removeExtension('e1');
ok('extension removed', store.listExtensions().length === 0);

// --- adblock / youtube settings -------------------------------------------
ok('adblock defaults on', store.adblock.enabled === true);
store.setAdblock({ enabled: false, allowlist: ['news.example'] });
ok('adblock setting updates', store.adblock.enabled === false);
ok('allowlist stored', store.adblock.allowlist[0] === 'news.example');
store.setYoutube({ popoutOnNavigate: false });
ok('youtube setting updates', store.youtube.popoutOnNavigate === false);

// --- persistence -----------------------------------------------------------
store.flush();
const reopened = new BrowserStore(dir);
ok('history persisted', reopened.history.entries.length === HISTORY_LIMIT);
ok('bookmarks persisted', reopened.listBookmarks().length === 1);
ok('adblock settings persisted', reopened.adblock.enabled === false);
ok('youtube settings persisted', reopened.youtube.popoutOnNavigate === false);

// corrupt file must not crash startup
fs.writeFileSync(path.join(dir, 'bookmarks.json'), '{not json');
const recovered = new BrowserStore(dir);
ok('recovers from corrupt json', Array.isArray(recovered.listBookmarks()));

// export excludes history and absolute extension paths
const dump = reopened.exportAll();
ok('export has bookmarks', Array.isArray(dump.bookmarks));
ok('export excludes history', dump.history === undefined);
ok('export strips extension paths',
  dump.extensions.every((e) => e.path === undefined));

console.log(failures === 0 ? '\nAll store checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
