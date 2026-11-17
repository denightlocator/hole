/* global window, document, ArenaThemes */
/**
 * Browser features for the shell UI: tabs, bookmarks, history, downloads,
 * ad-block panel, extensions and the YouTube/mini-player panel.
 *
 * Loaded after shell.js; it reuses the `ArenaShell` context that shell.js
 * publishes so there is exactly one source of truth for settings/webview state.
 */
(function () {
  'use strict';

  const api = window.arena;
  const ctx = window.ArenaShell;
  if (!api || !ctx) return;

  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
  const toast = (msg, kind) => ctx.toast(msg, kind || 'ok');

  /* ==================================================================== */
  /* tabs                                                                 */
  /* ==================================================================== */

  let tabs = [];
  let activeTabId = null;
  let tabSeq = 0;

  function newTab({ url, title, activate = true } = {}) {
    const id = `tab-${++tabSeq}`;
    const tab = {
      id,
      url: url || ctx.settings().homeUrl,
      title: title || 'New tab',
      favicon: ''
    };
    tabs.push(tab);
    if (activate || tabs.length === 1) {
      activeTabId = id;
      ctx.navigate(tab.url);
    }
    renderTabs();
    return tab;
  }

  function activeTab() {
    return tabs.find((t) => t.id === activeTabId) || null;
  }

  function activateTab(id) {
    const tab = tabs.find((t) => t.id === id);
    if (!tab) return;
    const current = activeTab();
    if (current) {
      // Remember where this tab was before switching away.
      current.url = ctx.currentUrl() || current.url;
    }
    activeTabId = id;
    ctx.navigate(tab.url, { record: false });
    renderTabs();
  }

  function closeTab(id) {
    const idx = tabs.findIndex((t) => t.id === id);
    if (idx === -1) return;
    tabs.splice(idx, 1);

    if (tabs.length === 0) {
      tabs = [];
      activeTabId = null;
      renderTabs();
      newTab();
      return;
    }
    if (activeTabId === id) {
      const next = tabs[Math.min(idx, tabs.length - 1)];
      activeTabId = next.id;
      ctx.navigate(next.url, { record: false });
    }
    renderTabs();
  }

  function renderTabs() {
    const strip = $('tabsScroll');
    if (!strip) return;
    strip.textContent = '';

    for (const tab of tabs) {
      const node = el('div', 'browser-tab');
      node.classList.toggle('active', tab.id === activeTabId);
      node.title = tab.title;

      const icon = el('span', 'tab-favicon');
      if (tab.favicon) {
        const img = document.createElement('img');
        img.src = tab.favicon;
        img.alt = '';
        img.onerror = () => { img.remove(); icon.textContent = (tab.title || '?').slice(0, 1).toUpperCase(); };
        icon.appendChild(img);
      } else {
        icon.textContent = (tab.title || '?').slice(0, 1).toUpperCase();
      }

      const label = el('span', 'tab-label', tab.title || 'New tab');

      const close = el('button', 'tab-close');
      close.title = 'Close tab';
      close.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 8l8 8M16 8l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
      close.addEventListener('click', (e) => {
        e.stopPropagation();
        closeTab(tab.id);
      });

      node.addEventListener('click', () => activateTab(tab.id));
      node.addEventListener('auxclick', (e) => {
        if (e.button === 1) closeTab(tab.id);
      });

      node.append(icon, label, close);
      strip.appendChild(node);
    }

    // Keep the active tab visible when many are open.
    const active = strip.querySelector('.browser-tab.active');
    if (active) active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  /** A human-readable guess for pages that have not reported a title yet. */
  function fallbackTitle(url) {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.replace(/^www\./, '');
      const path = parsed.pathname.replace(/\/$/, '');
      if (!path) return host;
      const last = decodeURIComponent(path.split('/').filter(Boolean).pop() || '');
      return `${last.replace(/[-_]/g, ' ')} · ${host}`;
    } catch {
      return 'New tab';
    }
  }

  /** Called by shell.js whenever the webview navigates. */
  function syncActiveTab(url, title, favicon) {
    const tab = activeTab();
    if (!tab) return;
    if (url) tab.url = url;
    // Never leave a tab called "Loading…": fall back to the URL's own words.
    tab.title = title || fallbackTitle(url || tab.url);
    if (favicon) tab.favicon = favicon;
    renderTabs();
    refreshBookmarkState(url || tab.url);
    refreshHistoryIfOpen();
  }

  /* ==================================================================== */
  /* bookmarks                                                            */
  /* ==================================================================== */

  let bookmarks = [];

  async function loadBookmarks() {
    bookmarks = await api.bookmarks.list();
    renderBookmarks();
  }

  function renderBookmarks() {
    const wrap = $('bmItems');
    if (!wrap) return;
    wrap.textContent = '';
    if (!bookmarks.length) {
      wrap.appendChild(el('span', 'bm-empty', 'Bookmark something — Ctrl+D'));
      return;
    }
    for (const bm of bookmarks.slice(0, 24)) {
      const btn = el('button', 'bm-item');
      btn.title = bm.url;
      btn.append(el('span', 'dot'), el('span', '', bm.title || bm.url));
      btn.addEventListener('click', () => {
        const tab = activeTab();
        if (tab) tab.url = bm.url;
        ctx.navigate(bm.url);
      });
      btn.addEventListener('auxclick', (e) => {
        if (e.button === 1) api.bookmarks.remove(bm.id).then(loadBookmarks);
      });
      wrap.appendChild(btn);
    }
  }

  async function refreshBookmarkState(url) {
    const star = $('btnBmStar');
    if (!star || !url) return;
    const has = await api.bookmarks.isBookmarked(url);
    star.classList.toggle('on', has);
    star.title = has ? 'Remove bookmark (Ctrl+D)' : 'Bookmark this page (Ctrl+D)';
  }

  async function toggleBookmark() {
    const url = ctx.currentUrl();
    if (!url) return;
    const has = await api.bookmarks.isBookmarked(url);
    if (has) {
      const bm = (await api.bookmarks.list()).find((b) => b.url === url);
      if (bm) await api.bookmarks.remove(bm.id);
      toast('Bookmark removed');
    } else {
      await api.bookmarks.add({ url, title: activeTab() ? activeTab().title : url });
      toast('Bookmarked');
    }
    await loadBookmarks();
    refreshBookmarkState(url);
  }

  /* ==================================================================== */
  /* URL bar suggestions                                                  */
  /* ==================================================================== */

  let suggBox = null;
  let suggIndex = -1;
  let suggItems = [];

  function ensureSuggBox() {
    if (suggBox) return suggBox;
    suggBox = el('div', 'suggestions');
    suggBox.hidden = true;
    $('titlebar').appendChild(suggBox);
    return suggBox;
  }

  function hideSuggestions() {
    if (suggBox) suggBox.hidden = true;
    suggIndex = -1;
    suggItems = [];
  }

  async function renderSuggestions(query) {
    const box = ensureSuggBox();
    const q = String(query || '').trim();
    if (!q) { hideSuggestions(); return; }

    const items = await api.history.suggest(q);
    suggItems = items;
    suggIndex = -1;
    if (!items.length) { hideSuggestions(); return; }

    box.textContent = '';
    items.forEach((item, i) => {
      const row = el('button', 'sugg');
      row.dataset.index = String(i);
      const icon = el('span', 'sugg-icon');
      icon.innerHTML = item.kind === 'bookmark'
        ? '<svg viewBox="0 0 24 24"><path d="M12 4.8l2.3 4.7 5.2.8-3.8 3.6.9 5.1-4.6-2.4-4.6 2.4.9-5.1L4.5 10.3l5.2-.8L12 4.8Z" stroke="currentColor" stroke-width="1.7" fill="none"/></svg>'
        : '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.4" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M12 7.6V12l3 2" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>';
      row.append(icon, el('span', 'sugg-title', item.title || item.url), el('span', 'sugg-url', item.url));
      row.addEventListener('mousedown', (e) => {
        e.preventDefault();
        hideSuggestions();
        ctx.navigate(item.url);
      });
      box.appendChild(row);
    });
    box.hidden = false;
  }

  function moveSuggestion(delta) {
    const box = suggBox;
    if (!box || box.hidden || !suggItems.length) return false;
    suggIndex = (suggIndex + delta + suggItems.length) % suggItems.length;
    box.querySelectorAll('.sugg').forEach((n, i) => n.classList.toggle('selected', i === suggIndex));
    return true;
  }

  /* ==================================================================== */
  /* ad blocking panel                                                    */
  /* ==================================================================== */

  let adblockSummary = null;

  function applyAdblockSummary(summary) {
    adblockSummary = summary;
    if (!summary) return;

    const set = (id, val) => { const n = $(id); if (n) n.checked = !!val; };
    set('abEnabled', summary.enabled);
    set('abAds', summary.blockAds);
    set('abTrackers', summary.blockTrackers);
    set('abCosmetic', summary.cosmetic);

    if ($('statBlocked')) $('statBlocked').textContent = String(summary.blocked);
    if ($('statHosts')) $('statHosts').textContent = String(summary.top.length);
    if ($('statSession')) {
      const mins = Math.max(1, Math.round((Date.now() - summary.since) / 60000));
      $('statSession').textContent = String(mins);
    }

    const badge = $('shieldCount');
    if (badge) {
      const n = summary.blocked;
      badge.textContent = n > 999 ? '999+' : String(n);
      badge.classList.toggle('on', n > 0);
    }

    const hostList = $('abHosts');
    if (hostList) {
      hostList.textContent = '';
      if (!summary.top.length) {
        hostList.appendChild(el('p', 'hint', 'Nothing blocked yet. Browse something with ads.'));
      } else {
        const max = summary.top[0].count || 1;
        for (const entry of summary.top) {
          const row = el('div', 'ab-host');
          const bar = el('div', 'bar');
          const fill = document.createElement('i');
          fill.style.width = `${Math.round((entry.count / max) * 100)}%`;
          bar.appendChild(fill);
          row.append(el('span', '', entry.host), bar, el('span', 'n', String(entry.count)));
          hostList.appendChild(row);
        }
      }
    }

    if ($('abAllowlist') && document.activeElement !== $('abAllowlist')) {
      $('abAllowlist').value = (summary.allowlist || []).join('\n');
    }
    if ($('abRules') && document.activeElement !== $('abRules')) {
      $('abRules').value = (summary.rules || []).join('\n');
    }

    const shieldBtn = $('btnShield');
    if (shieldBtn) shieldBtn.title = summary.enabled
      ? `Ad blocking on — ${summary.blocked} blocked`
      : 'Ad blocking off';
  }

  async function initAdblock() {
    const summary = await api.adblock.get();
    applyAdblockSummary(summary);

    const push = async (patch) => applyAdblockSummary(await api.adblock.set(patch));

    $('abEnabled')?.addEventListener('change', () => push({ enabled: $('abEnabled').checked }));
    $('abAds')?.addEventListener('change', () => push({ blockAds: $('abAds').checked }));
    $('abTrackers')?.addEventListener('change', () => push({ blockTrackers: $('abTrackers').checked }));
    $('abCosmetic')?.addEventListener('change', () => push({ cosmetic: $('abCosmetic').checked }));

    const splitLines = (value) => value.split('\n').map((l) => l.trim()).filter(Boolean);

    $('btnAbSave')?.addEventListener('click', async () => {
      await push({ allowlist: splitLines($('abAllowlist').value) });
      $('abSaveStatus').textContent = 'Saved.';
      setTimeout(() => { $('abSaveStatus').textContent = ''; }, 2000);
    });

    $('btnAbRules')?.addEventListener('click', async () => {
      await push({ rules: splitLines($('abRules').value) });
      toast('Blocking rules saved');
    });

    $('btnAbReset')?.addEventListener('click', async () => {
      applyAdblockSummary(await api.adblock.resetStats());
      toast('Counters reset');
    });

    $('btnShield')?.addEventListener('click', () => {
      ctx.setView('settings');
      selectTab('shields');
    });

    api.adblock.onChanged(applyAdblockSummary);
  }

  /* ==================================================================== */
  /* downloads                                                            */
  /* ==================================================================== */

  function formatBytes(n) {
    if (!n || n < 0) return '—';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let v = n;
    while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
    return `${v < 10 && i > 0 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
  }

  function renderDownloads(items) {
    const list = $('dlList');
    if (!list) return;

    const active = items.filter((d) => d.state === 'progressing');
    const badge = $('downloadCount');
    if (badge) {
      badge.textContent = String(active.length);
      badge.classList.toggle('on', active.length > 0);
    }

    if (!items.length) {
      list.textContent = '';
      list.appendChild(el('p', 'hint', 'No downloads yet.'));
      return;
    }

    list.textContent = '';
    for (const d of items.slice(0, 60)) {
      const card = el('div', 'dl-card');
      const top = el('div', 'dl-top');
      const name = el('span', 'dl-name', d.filename);
      const pct = d.total > 0 ? Math.min(100, Math.round((d.received / d.total) * 100)) : 0;

      const pill = el('span', `pill ${
        d.state === 'completed' ? 'ok'
          : d.state === 'progressing' ? 'warn'
            : d.state === 'cancelled' ? 'muted' : 'bad'
      }`, d.state === 'progressing' ? `${pct}%` : d.state);

      top.append(name, pill);

      const actions = el('div', 'row-gap');
      if (d.state === 'completed') {
        const open = el('button', 'btn btn-sm', 'Open');
        open.addEventListener('click', async () => {
          const res = await api.downloads.open(d.id);
          if (!res.ok) toast(res.error || 'Could not open that file', 'err');
        });
        const reveal = el('button', 'btn btn-sm', 'Folder');
        reveal.addEventListener('click', () => api.downloads.reveal(d.id));
        actions.append(open, reveal);
      }
      top.appendChild(actions);

      const sub = el('div', 'dl-sub',
        `${formatBytes(d.received)}${d.total ? ` of ${formatBytes(d.total)}` : ''} · ${d.url ? new URL(d.url).hostname : ''}`);

      card.append(top, sub);

      if (d.state === 'progressing') {
        const bar = el('div', 'dl-bar');
        const fill = document.createElement('i');
        fill.style.width = `${pct}%`;
        bar.appendChild(fill);
        card.appendChild(bar);
      }
      list.appendChild(card);
    }
  }

  async function initDownloads() {
    renderDownloads(await api.downloads.list());
    api.downloads.onChanged(renderDownloads);

    $('btnDownloads')?.addEventListener('click', async () => {
      ctx.setView('settings');
      selectTab('downloads');
      renderDownloads(await api.downloads.list());
    });
    $('btnDlFolder')?.addEventListener('click', () => api.downloads.folder());
    $('btnDlClear')?.addEventListener('click', async () => {
      renderDownloads(await api.downloads.clear());
      toast('Cleared finished downloads');
    });
  }

  /* ==================================================================== */
  /* history                                                              */
  /* ==================================================================== */

  function formatWhen(ts) {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.round(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.round(diff / 3600000)}h`;
    const d = new Date(ts);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  }

  async function renderHistory(query = '') {
    const list = $('historyList');
    if (!list) return;
    let items = [];
    try {
      items = await api.history.list(query);
    } catch (err) {
      console.error('[history]', err);
    }
    if (!Array.isArray(items)) items = [];
    list.textContent = '';
    if (!items.length) {
      list.appendChild(el('p', 'hint', query ? 'No matches.' : 'No history yet.'));
      return;
    }
    for (const item of items.slice(0, 300)) {
      const row = el('div', 'hist-row');
      const body = el('div', 'hist-body');
      body.append(
        el('div', 'hist-title', item.title || item.url),
        el('div', 'hist-url', item.url)
      );
      const actions = el('div', 'hist-actions');
      const del = el('button', 'mini-btn');
      del.title = 'Remove from history';
      del.innerHTML = '<svg viewBox="0 0 24 24"><path d="M7.5 7.5l9 9M16.5 7.5l-9 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
      del.addEventListener('click', async (e) => {
        e.stopPropagation();
        await api.history.remove(item.url);
        renderHistory($('historySearch').value);
      });
      actions.appendChild(del);

      row.append(el('span', 'hist-time', formatWhen(item.at)), body, actions);
      row.addEventListener('click', () => {
        ctx.setView('web');
        ctx.navigate(item.url);
      });
      list.appendChild(row);
    }
  }

  let historyTimer = null;
  function refreshHistoryIfOpen() {
    const panel = document.querySelector('.tab-panel[data-panel="history"].active');
    if (!panel) return;
    clearTimeout(historyTimer);
    historyTimer = setTimeout(() => renderHistory($('historySearch')?.value || ''), 600);
  }

  async function initHistory() {
    $('historySearch')?.addEventListener('input', (e) => renderHistory(e.target.value));
    $('btnHistoryClear')?.addEventListener('click', async () => {
      if (!window.confirm('Clear all browsing history?')) return;
      await api.history.clear('all');
      renderHistory();
      toast('History cleared');
    });
  }

  /* ==================================================================== */
  /* extensions                                                           */
  /* ==================================================================== */

  function renderExtensions(list) {
    const wrap = $('extList');
    if (!wrap) return;
    wrap.textContent = '';
    if (!list.length) {
      wrap.appendChild(el('p', 'hint', 'No extensions installed.'));
      return;
    }
    for (const ext of list) {
      const card = el('div', 'ext-card');
      const icon = el('div', 'ext-icon', (ext.name || '?').slice(0, 1).toUpperCase());
      const body = el('div', 'ext-body');
      const nameRow = el('div', 'ext-name', ext.name || 'Unnamed');
      if (!ext.loaded) nameRow.appendChild(el('span', 'pill bad', 'not running'));
      body.appendChild(nameRow);
      body.appendChild(el('div', 'ext-meta', `v${ext.version} · Manifest V${ext.manifestVersion || '?'}`));
      if (ext.description) body.appendChild(el('div', 'ext-desc', ext.description));
      if (ext.error) body.appendChild(el('div', 'ext-error', ext.error));

      const actions = el('div', 'ext-actions');
      const toggle = el('button', 'btn btn-sm', ext.enabled ? 'Disable' : 'Enable');
      toggle.addEventListener('click', async () => {
        await api.extensions.setEnabled(ext.id, !ext.enabled);
        renderExtensions(await api.extensions.list());
      });
      const remove = el('button', 'btn btn-sm btn-danger', 'Remove');
      remove.addEventListener('click', async () => {
        await api.extensions.remove(ext.id);
        renderExtensions(await api.extensions.list());
        toast('Extension removed');
      });
      actions.append(toggle, remove);

      card.append(icon, body, actions);
      wrap.appendChild(card);
    }
  }

  async function initExtensions() {
    renderExtensions(await api.extensions.list());
    api.extensions.onChanged(renderExtensions);

    $('btnExtInstall')?.addEventListener('click', async () => {
      const res = await api.extensions.install();
      if (res.canceled) return;
      if (!res.ok) {
        toast(res.error || 'Could not install that extension', 'err');
        return;
      }
      if (res.warning) toast(res.warning, 'err');
      else toast(`Installed ${res.extension.name}`);
      renderExtensions(await api.extensions.list());
    });

    $('btnExtFolder')?.addEventListener('click', async () => {
      const dir = await api.extensions.folder();
      toast(`Opened ${dir}`, 'ok');
    });
  }

  /* ==================================================================== */
  /* youtube / mini player                                                */
  /* ==================================================================== */

  let miniState = { video: null, playing: false };

  function paintMiniState(state) {
    miniState = state || { video: null, playing: false };
    const status = $('miniStatus');
    const btn = $('btnMini');
    if (status) {
      status.textContent = miniState.video
        ? `Playing${miniState.playing ? '' : ' (paused)'}: ${miniState.video.title || miniState.video.id}`
        : 'No mini player open.';
    }
    if (btn) btn.classList.toggle('on', !!miniState.video);
  }

  /** Ask the page for the video currently playing (via the injected hook). */
  async function popOutCurrent() {
    const url = ctx.currentUrl() || '';
    const match = url.match(/(?:v=|youtu\.be\/|\/shorts\/|\/live\/|\/embed\/)([A-Za-z0-9_-]{11})/);
    if (!match) {
      toast('Open a YouTube video first', 'err');
      return;
    }
    const params = new URL(url);
    const t = parseInt(params.searchParams.get('t') || params.searchParams.get('start') || '0', 10) || 0;
    const res = await api.mini.open({
      id: match[1],
      title: (document.title || '').replace(/ - YouTube$/, '') || 'YouTube video',
      currentTime: t,
      paused: false
    });
    if (!res.ok) toast(res.error || 'Could not open the mini player', 'err');
    else toast('Popped out — it floats above other apps');
  }

  async function initYoutube() {
    const yt = await api.youtube.get();
    if ($('ytEnabled')) $('ytEnabled').checked = !!yt.enabled;
    if ($('ytPopout')) $('ytPopout').checked = !!yt.popoutOnNavigate;
    if ($('ytQuality')) $('ytQuality').value = yt.defaultQuality || '';

    const push = async (patch) => { await api.youtube.set(patch); };

    $('ytEnabled')?.addEventListener('change', () => push({ enabled: $('ytEnabled').checked }));
    $('ytPopout')?.addEventListener('change', () => push({ popoutOnNavigate: $('ytPopout').checked }));
    $('ytQuality')?.addEventListener('change', () => push({ defaultQuality: $('ytQuality').value }));

    $('btnMiniShortcut')?.addEventListener('click', popOutCurrent);
    $('btnMini')?.addEventListener('click', popOutCurrent);
    $('btnMiniClose')?.addEventListener('click', async () => {
      await api.mini.close();
      paintMiniState({ video: null, playing: false });
      toast('Mini player closed');
    });

    paintMiniState(await api.mini.get());
    api.mini.onState(paintMiniState);
  }

  /* ==================================================================== */
  /* re-skin                                                              */
  /* ==================================================================== */

  const RESKIN_ROLES = ['header', 'messages', 'composer', 'send', 'sidebar', 'newChat', 'status'];
  let reskinProfiles = [];
  let reskinSelected = null;
  let reskinMap = {};

  async function initReskin() {
    const info = await api.reskin.profiles();
    reskinProfiles = info.profiles || [];
    reskinSelected = (await api.settings.get()).reskin?.profile || reskinProfiles[0]?.id || 'claude-code';
    reskinMap = (await api.settings.get()).reskin?.map || {};

    renderReskinProfiles();
    renderReskinMap();

    const state = await api.reskin.status();
    paintReskinStatus(state);

    $('btnReskinApply')?.addEventListener('click', async () => {
      await api.settings.set({ reskin: { profile: reskinSelected, map: reskinMap, enabled: true } });
      const result = await api.reskin.apply({ profile: reskinSelected, mapping: reskinMap });
      paintReskinStatus(result);
      if (result.ok) toast('Re-skin applied — the site\'s own controls still work');
      else toast(result.error || 'Could not apply the re-skin', 'err');
    });

    $('btnReskinRemove')?.addEventListener('click', async () => {
      await api.reskin.remove();
      await api.settings.set({ reskin: { profile: reskinSelected, map: reskinMap, enabled: false } });
      paintReskinStatus({ mounted: false });
      toast('Original UI restored');
    });

    $('btnReskinAuto')?.addEventListener('click', async () => {
      // Ask the page to auto-detect and report what it found.
      const result = await api.reskin.apply({ profile: reskinSelected, mapping: {} });
      const detected = {};
      for (const slot of (result.slots || [])) {
        if (slot.filled && slot.role) detected[slot.role] = '';
      }
      toast(result.ok
        ? 'Auto-detected the page structure — check the mapping below'
        : result.error || 'Auto-detect failed', result.ok ? 'ok' : 'err');
      paintReskinStatus(result);
    });

    $('btnReskinResetMap')?.addEventListener('click', async () => {
      reskinMap = {};
      await api.settings.set({ reskin: { profile: reskinSelected, map: {}, enabled: false } });
      renderReskinMap();
      toast('Mapping cleared');
    });
  }

  function renderReskinProfiles() {
    const grid = $('reskinGrid');
    if (!grid) return;
    grid.textContent = '';
    for (const p of reskinProfiles) {
      const card = el('button', 'reskin-card');
      card.classList.toggle('active', p.id === reskinSelected);

      const swatch = el('div', 'reskin-swatch');
      const main = el('div', 'rs-main');
      main.append(el('div', 'rs-line'), el('div', 'rs-line'), el('div', 'rs-input'));
      swatch.append(main, el('div', 'rs-side'));

      card.append(swatch, el('div', 'reskin-card-name', p.name), el('div', 'reskin-card-desc', p.description));
      card.addEventListener('click', () => {
        reskinSelected = p.id;
        renderReskinProfiles();
      });
      grid.appendChild(card);
    }
  }

  function renderReskinMap() {
    const list = $('reskinMap');
    if (!list) return;
    list.textContent = '';

    for (const role of RESKIN_ROLES) {
      const row = el('div', 'map-row');
      row.append(el('span', 'map-role', role));

      const input = document.createElement('input');
      input.type = 'text';
      input.spellcheck = false;
      input.placeholder = 'auto-detect';
      input.value = reskinMap[role] || '';
      input.addEventListener('change', () => {
        const v = input.value.trim();
        if (v) reskinMap[role] = v;
        else delete reskinMap[role];
      });

      const pick = el('button', 'btn btn-sm', 'Pick');
      pick.addEventListener('click', async () => {
        toast('Click the element on the page… (Esc to cancel)');
        const res = await api.reskin.pick(role);
        if (res && res.ok && res.selector) {
          reskinMap[role] = res.selector;
          input.value = res.selector;
          toast(`${role} → ${res.selector}`);
        } else if (res && res.canceled) {
          toast('Cancelled');
        } else {
          toast(res?.error || 'Could not pick that element', 'err');
        }
      });

      const state = el('span', 'map-state', 'auto');
      if (reskinMap[role]) {
        state.textContent = 'set';
        state.classList.add('ok');
      }

      row.append(input, pick, state);
      list.appendChild(row);
    }
  }

  function paintReskinStatus(status) {
    const label = $('reskinStatus');
    if (!label) return;
    if (!status || !status.mounted) {
      label.textContent = 'Not applied.';
      return;
    }
    const missing = status.missing || [];
    const filled = (status.slots || []).filter((s) => s.filled).length;
    const inPlace = (status.inPlace || []).length;
    const parts = [`Applied — ${filled} slots mapped`];
    if (inPlace) parts.push(`${inPlace} left in place inside the site's own controls`);
    if (missing.length) parts.push(`${missing.length} not found (${missing.join(', ')})`);
    label.textContent = parts.join(', ') + '.';
  }

  /* ==================================================================== */
  /* wiring                                                               */
  /* ==================================================================== */

  function selectTab(name) {
    const tab = document.querySelector(`.tab[data-tab="${name}"]`);
    if (!tab) return;
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === tab));
    document.querySelectorAll('.tab-panel').forEach((p) => {
      p.classList.toggle('active', p.dataset.panel === name);
    });
    // The strip scrolls once there are more than a handful of tabs; keep the
    // selected one in view instead of clipping its label.
    if (tab.scrollIntoView) tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (name === 'history') renderHistory($('historySearch')?.value || '');
    if (name === 'downloads') api.downloads.list().then(renderDownloads);
    if (name === 'extensions') api.extensions.list().then(renderExtensions);
    if (name === 'shields') api.adblock.get().then(applyAdblockSummary);
    if (name === 'reskin') api.reskin.status().then(paintReskinStatus);
  }

  function wire() {
    $('btnNewTab')?.addEventListener('click', () => newTab());

    // Our own listener runs after shell.js's, so panels are already visible.
    $('settingsTabs')?.addEventListener('click', (e) => {
      const tab = e.target.closest('.tab');
      if (tab) selectTab(tab.dataset.tab);
    });

    // URL bar suggestions
    const input = $('urlInput');
    input?.addEventListener('input', (e) => renderSuggestions(e.target.value));
    input?.addEventListener('focus', (e) => { if (e.target.value) renderSuggestions(e.target.value); });
    input?.addEventListener('blur', () => setTimeout(hideSuggestions, 120));
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' && moveSuggestion(1)) e.preventDefault();
      else if (e.key === 'ArrowUp' && moveSuggestion(-1)) e.preventDefault();
      else if (e.key === 'Enter' && suggIndex >= 0 && suggItems[suggIndex]) {
        e.preventDefault();
        e.stopPropagation();
        const item = suggItems[suggIndex];
        hideSuggestions();
        ctx.navigate(item.url);
      } else if (e.key === 'Escape') {
        hideSuggestions();
      }
    }, true);

    $('btnBmStar')?.addEventListener('click', toggleBookmark);

    // keyboard shortcuts that belong to browsing
    document.addEventListener('keydown', (e) => {
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && key === 't') { e.preventDefault(); newTab(); }
      if (mod && key === 'w') { e.preventDefault(); if (activeTab()) closeTab(activeTabId); }
      if (mod && key === 'd') { e.preventDefault(); toggleBookmark(); }
      if (mod && key === 'j') {
        e.preventDefault();
        ctx.setView('settings');
        selectTab('downloads');
      }
      if (mod && key === 'h') {
        e.preventDefault();
        ctx.setView('settings');
        selectTab('history');
      }
      if (mod && e.shiftKey && key === 'tab') { e.preventDefault(); cycleTab(-1); }
      if (mod && key === 'tab') { e.preventDefault(); cycleTab(1); }
      if (mod && /^[1-9]$/.test(key)) {
        e.preventDefault();
        const idx = parseInt(key, 10) - 1;
        if (tabs[idx]) activateTab(tabs[idx].id);
      }
    });

    // toasts pushed from the main process (download finished, etc.)
    api.browser.onToast((payload) => {
      if (!payload || !payload.message) return;
      toast(payload.message);
    });

    // main process asked us to navigate (e.g. "back to the video page")
    api.browser.onNavigate((url) => {
      ctx.setView('web');
      const tab = activeTab();
      if (tab) tab.url = url;
      ctx.navigate(url);
    });

    api.bookmarks.onChanged(loadBookmarks);
  }

  function cycleTab(delta) {
    if (tabs.length < 2) return;
    const idx = tabs.findIndex((t) => t.id === activeTabId);
    const next = (idx + delta + tabs.length) % tabs.length;
    activateTab(tabs[next].id);
  }

  async function boot() {
    wire();
    await Promise.all([
      loadBookmarks(), initAdblock(), initDownloads(), initHistory(),
      initExtensions(), initYoutube(), initReskin()
    ]);

    // Seed the first tab from whatever the shell already navigated to.
    const startUrl = ctx.currentUrl() || ctx.settings().homeUrl;
    const first = newTab({ url: startUrl });
    first.title = fallbackTitle(startUrl);
    renderTabs();

    // React to every navigation coming from shell.js.
    ctx.onNavigate((info) => syncActiveTab(info.url, info.title, info.favicon));

    paintMiniState(await api.mini.get());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { boot().catch((err) => console.error('[browser]', err)); });
  } else {
    boot().catch((err) => console.error('[browser]', err));
  }
})();
