/* global window, document, ArenaThemes */
/**
 * Arena Shell — renderer.
 *
 * State lives in the main process (settings.json). This file:
 *   - renders the shell and applies themes
 *   - drives the <webview> and keeps the URL bar honest
 *   - mirrors the start.bat console
 */
(function () {
  'use strict';

  const api = window.arena;
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };

  let settings = null;
  let currentView = 'web';       // web | settings
  let currentUrl = '';
  let activeConnection = null;

  const webview = $('webview');

  /* ------------------------------------------------------------------ */
  /* theme application                                                   */
  /* ------------------------------------------------------------------ */

  let shellStyleTag = null;
  let pageStyleKey = null; // injected into the remote page

  function applyShellTheme() {
    const css = ArenaThemes.shellCss(settings);
    if (!shellStyleTag) {
      shellStyleTag = document.createElement('style');
      shellStyleTag.id = 'arena-tokens';
      document.head.appendChild(shellStyleTag);
    }
    shellStyleTag.textContent = css;

    document.body.classList.toggle('no-anim', !settings.animations);
    document.body.classList.toggle('translucent', !!settings.transparency);
    document.body.style.zoom = String(settings.uiScale || 1);

    $('sidebar').classList.toggle('collapsed', !settings.sidebar);
    $('sidebar').style.width = `${settings.sidebarWidth}px`;
    $('statusbar').hidden = !settings.showStatusbar;

    const theme = ArenaThemes.themeFor(settings.theme);
    $('statusTheme').textContent = `${theme.name} theme`;
  }

  /** Inject/refresh the stylesheet inside the connected web app. */
  async function applyPageTheme(force) {
    if (!webview || typeof webview.insertCSS !== 'function') return;
    if (!currentUrl || currentUrl === 'about:blank') return;
    const key = JSON.stringify([
      settings.theme, settings.accent, settings.pageStyling, settings.customCss,
      settings.monoFamily, settings.fontFamily, settings.zoomKey
    ]);
    if (!force && key === pageStyleKey) return;
    pageStyleKey = key;
    try {
      const css = `${ArenaThemes.pageCss(settings)}\n${ArenaThemes.customCss(settings)}`;
      if (!css.trim()) return;
      await wv.css(css);
    } catch (err) {
      console.warn('[page-theme]', err.message);
    }
  }

  function refreshPageZoom() {
    wv.zoom(Number(settings.pageZoom) || 1);
  }

  /* ------------------------------------------------------------------ */
  /* navigation                                                          */
  /* ------------------------------------------------------------------ */

  /* Safe wrappers: the <webview> is unavailable in browser previews and can
     briefly be un-attached in Electron. Never let that kill the shell. */
  const wv = {
    load(url) {
      try {
        if (typeof webview.loadURL === 'function') return Promise.resolve(webview.loadURL(url)).catch(() => {});
        webview.src = url;
      } catch { /* ignore */ }
      return Promise.resolve();
    },
    reload() {
      try {
        if (typeof webview.reload === 'function') webview.reload();
        else webview.src = webview.src;
      } catch { /* ignore */ }
    },
    back() { try { if (webview.canGoBack && webview.canGoBack()) webview.goBack(); } catch { /* ignore */ } },
    forward() { try { if (webview.canGoForward && webview.canGoForward()) webview.goForward(); } catch { /* ignore */ } },
    canBack() { try { return !!(webview.canGoBack && webview.canGoBack()); } catch { return false; } },
    canForward() { try { return !!(webview.canGoForward && webview.canGoForward()); } catch { return false; } },
    zoom(factor) { try { if (typeof webview.setZoomFactor === 'function') webview.setZoomFactor(factor); } catch { /* ignore */ } },
    css(css) { try { if (typeof webview.insertCSS === 'function') return Promise.resolve(webview.insertCSS(css)).catch(() => {}); } catch { /* ignore */ } return Promise.resolve(); }
  };

  function normalizeUrl(input) {
    let value = String(input || '').trim();
    if (!value) return '';
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value) || value.startsWith('about:')) return value;
    if (/^localhost(:\d+)?(\/|$)/i.test(value)) return `http://${value}`;
    if (/^[\w-]+(\.[\w-]+)+/.test(value)) return `https://${value}`;
    return `https://www.google.com/search?q=${encodeURIComponent(value)}`;
  }

  function navigate(url, { record = true } = {}) {
    const target = normalizeUrl(url);
    if (!target) return;
    currentUrl = target;
    $('urlInput').value = target;
    $('statusUrl').textContent = target;
    $('webError').hidden = true;
    if (record) {
      $('loadingBar').classList.add('active');
      $('loadingBar').style.width = '35%';
    }
    wv.load(target);
    if (record) {
      settings.homeUrl = target;
      api.settings.set({ homeUrl: target });
    }
  }

  function openConnection(conn) {
    if (!conn) return;
    activeConnection = conn;
    navigate(conn.url);
    renderConnections();
    $('statusConn').textContent = conn.name;
  }

  /* ------------------------------------------------------------------ */
  /* webview wiring                                                      */
  /* ------------------------------------------------------------------ */

  function wireWebview() {
    const bar = $('loadingBar');

    const setLoading = (on) => {
      bar.classList.toggle('active', on);
      if (on) {
        bar.style.width = '30%';
        setTimeout(() => { if (bar.classList.contains('active')) bar.style.width = '72%'; }, 180);
      } else {
        bar.style.width = '100%';
        setTimeout(() => { bar.classList.remove('active'); bar.style.width = '0'; }, 260);
      }
    };

    webview.addEventListener('did-start-loading', () => setLoading(true));
    webview.addEventListener('did-stop-loading', () => setLoading(false));

    webview.addEventListener('did-navigate', (e) => {
      currentUrl = e.url;
      $('urlInput').value = e.url;
      $('statusUrl').textContent = e.url;
      $('webError').hidden = true;
      pageStyleKey = null;
      setTimeout(() => { applyPageTheme(true); refreshPageZoom(); }, 120);
      updateNavButtons();
    });

    webview.addEventListener('did-navigate-in-page', (e) => {
      currentUrl = e.url;
      $('urlInput').value = e.url;
      $('statusUrl').textContent = e.url;
      updateNavButtons();
    });

    webview.addEventListener('page-title-updated', (e) => {
      document.title = e.title ? `${e.title} — Arena Shell` : 'Arena Shell';
    });

    webview.addEventListener('did-fail-load', (e) => {
      if (e.errorCode === -3) return; // aborted, benign
      $('webError').hidden = false;
      $('webErrorMsg').textContent = `${e.errorDescription || 'The site did not respond'} (${e.errorCode})`;
      setLoading(false);
    });

    webview.addEventListener('dom-ready', () => {
      applyPageTheme(true);
      refreshPageZoom();
    });

    const updateNavButtons = () => {
      $('btnBack').disabled = !wv.canBack();
      $('btnForward').disabled = !wv.canForward();
    };
    webview.addEventListener('did-navigate', updateNavButtons);
    webview.addEventListener('did-navigate-in-page', updateNavButtons);
  }

  /* ------------------------------------------------------------------ */
  /* rendering: sidebar                                                  */
  /* ------------------------------------------------------------------ */

  function renderConnections() {
    const list = $('connList');
    list.textContent = '';
    for (const conn of settings.connections || []) {
      const btn = el('button', 'conn-item');
      btn.classList.toggle('active', conn.id === settings.activeConnectionId);
      const glyph = el('span', 'conn-glyph', (conn.icon || conn.name || '?').slice(0, 1).toUpperCase());
      const name = el('span', 'conn-name', conn.name);
      btn.append(glyph, name);

      if (settings.connections.length > 1 && conn.id !== 'arena-agent') {
        const del = el('button', 'conn-del');
        del.title = 'Remove';
        del.innerHTML = '<svg viewBox="0 0 24 24"><path d="M7.5 7.5l9 9M16.5 7.5l-9 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
        del.addEventListener('click', (ev) => {
          ev.stopPropagation();
          removeConnection(conn.id);
        });
        btn.appendChild(del);
      }

      btn.addEventListener('click', () => {
        settings.activeConnectionId = conn.id;
        api.settings.set({ activeConnectionId: conn.id });
        openConnection(conn);
      });
      list.appendChild(btn);
    }
  }

  function renderThemeChips() {
    const list = $('themeList');
    list.textContent = '';
    for (const theme of ArenaThemes.list()) {
      const chip = el('button', 'theme-chip');
      chip.classList.toggle('active', settings.theme === theme.id);
      const swatch = el('span', 'theme-swatch');
      swatch.append(el('i'), el('i'));
      swatch.children[0].style.background = theme.swatch[0];
      swatch.children[1].style.background = theme.swatch[1];
      chip.append(swatch, el('span', '', theme.name));
      chip.addEventListener('click', () => setTheme(theme.id));
      list.appendChild(chip);
    }
  }

  function renderThemeGrid() {
    const grid = $('themeGrid');
    grid.textContent = '';
    for (const theme of ArenaThemes.list()) {
      const card = el('button', 'theme-card');
      card.classList.toggle('active', settings.theme === theme.id);

      const preview = el('div', 'theme-preview');
      preview.style.background = theme.swatch[0];
      const side = el('div', 'tp-side');
      side.style.background = theme.swatch[1] + '26';
      const main = el('div', 'tp-main');
      main.style.color = theme.swatch[1];
      const dot = el('div', 'tp-dot');
      dot.style.background = theme.swatch[1];
      main.append(dot, el('div', 'tp-line'), el('div', 'tp-line w70'), el('div', 'tp-line w45'));
      preview.append(side, main);

      card.append(preview, el('div', 'theme-card-name', theme.name), el('div', 'theme-card-blurb', theme.blurb));
      card.addEventListener('click', () => setTheme(theme.id));
      grid.appendChild(card);
    }
  }

  /* ------------------------------------------------------------------ */
  /* renderers: settings forms                                           */
  /* ------------------------------------------------------------------ */

  function fillForm() {
    $('inpAccent').value = settings.accent || ArenaThemes.themeFor(settings.theme).tokens.accent;
    $('inpFont').value = settings.fontFamily || '';
    $('inpMono').value = settings.monoFamily || '';
    $('inpFontSize').value = settings.fontSize;
    $('lblFontSize').textContent = `${settings.fontSize}px`;
    $('inpRadius').value = settings.radius;
    $('lblRadius').textContent = `${settings.radius}px`;
    $('inpScale').value = settings.uiScale;
    $('lblScale').textContent = `${Math.round(settings.uiScale * 100)}%`;
    $('inpDensity').value = settings.density;
    $('inpAnimations').checked = !!settings.animations;
    $('inpSidebar').checked = !!settings.sidebar;
    $('inpTransparency').checked = !!settings.transparency;
    $('inpStatusbar').checked = !!settings.showStatusbar;

    $('inpHomeUrl').value = settings.homeUrl;
    $('inpZoom').value = settings.pageZoom;
    $('lblZoom').textContent = `${Math.round(settings.pageZoom * 100)}%`;
    document.querySelectorAll('#segPageStyle button').forEach((b) => {
      b.classList.toggle('active', b.dataset.value === settings.pageStyling);
    });

    $('inpRunOnStartup').checked = !!settings.runScriptOnStartup;
    $('inpCustomCss').value = settings.customCss || '';
  }

  function renderConnEditor() {
    const wrap = $('connEditor');
    wrap.textContent = '';
    (settings.connections || []).forEach((conn) => {
      const row = el('div', 'conn-row');
      const name = document.createElement('input');
      name.type = 'text';
      name.value = conn.name;
      const url = document.createElement('input');
      url.type = 'text';
      url.value = conn.url;
      url.spellcheck = false;
      const del = el('button', 'btn btn-sm btn-danger', 'Remove');

      const commit = () => {
        const next = settings.connections.map((c) =>
          c.id === conn.id ? { ...c, name: name.value.trim() || c.name, url: normalizeUrl(url.value) } : c
        );
        settings.connections = next;
        api.settings.set({ connections: next });
        renderConnections();
      };
      name.addEventListener('change', commit);
      url.addEventListener('change', commit);
      del.addEventListener('click', () => removeConnection(conn.id));
      if (conn.id === 'arena-agent') del.disabled = true;

      row.append(name, url, del);
      wrap.appendChild(row);
    });
  }

  function renderAbout(info) {
    const grid = $('aboutGrid');
    grid.textContent = '';
    const rows = [
      ['Version', info.version],
      ['Electron', info.electron],
      ['Chromium', info.chrome],
      ['Node', info.node],
      ['Platform', info.platform],
      ['Data folder', info.userData]
    ];
    for (const [k, v] of rows) {
      const cell = el('div', 'about-cell');
      cell.append(el('span', '', k), el('b', '', String(v)));
      grid.appendChild(cell);
    }
  }

  /* ------------------------------------------------------------------ */
  /* state mutations                                                     */
  /* ------------------------------------------------------------------ */

  async function setTheme(id) {
    settings.theme = id;
    settings.accent = '';
    await api.settings.set({ theme: id, accent: '' });
    afterThemeChange();
    toast(`Theme: ${ArenaThemes.themeFor(id).name}`);
  }

  function afterThemeChange() {
    applyShellTheme();
    renderThemeChips();
    renderThemeGrid();
    fillForm();
    applyPageTheme(true);
  }

  async function patch(p, { silent = false } = {}) {
    settings = await api.settings.set(p);
    if (!silent) afterThemeChange();
    return settings;
  }

  async function removeConnection(id) {
    const next = (settings.connections || []).filter((c) => c.id !== id);
    const nextActive = settings.activeConnectionId === id ? (next[0] && next[0].id) : settings.activeConnectionId;
    settings = await api.settings.set({ connections: next, activeConnectionId: nextActive });
    renderConnections();
    renderConnEditor();
    if (nextActive && next.find((c) => c.id === nextActive)) openConnection(next.find((c) => c.id === nextActive));
  }

  /* ------------------------------------------------------------------ */
  /* script console                                                      */
  /* ------------------------------------------------------------------ */

  let scriptState = { running: false };

  function renderScriptLog(lines) {
    const html = lines.map((l) => {
      const cls = l.stream === 'err' ? 'l-err' : l.stream === 'shell' ? 'l-shell' : '';
      const safe = String(l.line).replace(/&/g, '&amp;').replace(/</g, '&lt;');
      return cls ? `<span class="${cls}">${safe}</span>` : safe;
    }).join('\n');
    for (const id of ['drawerConsole', 'settingsConsole']) {
      const node = $(id);
      const atBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - 30;
      node.innerHTML = html || 'Waiting for the script…';
      if (atBottom) node.scrollTop = node.scrollHeight;
    }
  }

  function renderScriptState(state) {
    if (!state) return;
    scriptState = state;
    const cls = state.running ? 'running' : state.code === 0 ? 'ok' : state.code == null ? '' : 'err';
    for (const id of ['scriptDot', 'statusScriptDot']) {
      const dot = $(id);
      dot.className = `dot ${cls}`;
    }
    const label = state.running
      ? 'app-start running…'
      : state.code === 0
        ? 'app-start done'
        : state.code == null
          ? 'app-start idle'
          : `app-start exited (${state.code})`;
    $('scriptLabel').textContent = label;
    $('statusScriptDot').title = label;
  }

  /* ------------------------------------------------------------------ */
  /* view switching                                                     */
  /* ------------------------------------------------------------------ */

  function setView(view) {
    currentView = view;
    const isSettings = view === 'settings';
    $('paneWeb').hidden = isSettings;
    $('paneSettings').hidden = !isSettings;
    $('urlBar').style.opacity = isSettings ? '.45' : '1';
    $('urlBar').style.pointerEvents = isSettings ? 'none' : 'auto';
    if (isSettings) {
      renderConnEditor();
      fillForm();
      api.settings.file().then((p) => { $('settingsFileLabel').textContent = p; });
    }
  }

  function setConsole(open) {
    $('consoleDrawer').hidden = !open;
  }

  /* ------------------------------------------------------------------ */
  /* toasts / modal                                                     */
  /* ------------------------------------------------------------------ */

  function toast(message, kind = 'ok') {
    const node = el('div', 'toast');
    const dot = el('span', `dot ${kind}`);
    node.append(dot, el('span', '', message));
    $('toasts').appendChild(node);
    setTimeout(() => {
      node.classList.add('out');
      setTimeout(() => node.remove(), 200);
    }, 2200);
  }

  let modalMode = 'new';
  let modalConnId = null;

  function openModal(mode, conn) {
    modalMode = mode;
    modalConnId = conn ? conn.id : null;
    $('modalTitle').textContent = mode === 'edit' ? 'Edit connection' : 'New connection';
    $('modalName').value = conn ? conn.name : '';
    $('modalUrl').value = conn ? conn.url : '';
    $('modalBackdrop').hidden = false;
    setTimeout(() => $('modalName').focus(), 30);
  }

  function closeModal() {
    $('modalBackdrop').hidden = true;
  }

  async function saveModal() {
    const name = $('modalName').value.trim() || 'Untitled';
    const url = normalizeUrl($('modalUrl').value);
    if (!url) { toast('Enter a URL first', 'err'); return; }
    let next;
    if (modalMode === 'edit' && modalConnId) {
      next = settings.connections.map((c) => (c.id === modalConnId ? { ...c, name, url } : c));
    } else {
      next = [...(settings.connections || []), {
        id: `conn-${Date.now().toString(36)}`,
        name,
        url,
        icon: name.slice(0, 1)
      }];
    }
    settings = await api.settings.set({ connections: next });
    renderConnections();
    renderConnEditor();
    closeModal();
    toast('Connection saved');
    const saved = next.find((c) => c.name === name);
    if (modalMode !== 'edit' && saved) {
      settings.activeConnectionId = saved.id;
      await api.settings.set({ activeConnectionId: saved.id });
      openConnection(saved);
    }
  }

  /* ------------------------------------------------------------------ */
  /* events                                                             */
  /* ------------------------------------------------------------------ */

  function wireEvents() {
    // window controls
    $('btnMin').addEventListener('click', () => api.window.minimize());
    $('btnMax').addEventListener('click', () => api.window.maximize());
    $('btnClose').addEventListener('click', () => api.window.close());

    // navigation
    $('btnBack').addEventListener('click', () => wv.back());
    $('btnForward').addEventListener('click', () => wv.forward());
    $('btnReload').addEventListener('click', () => wv.reload());
    $('btnGo').addEventListener('click', () => navigate($('urlInput').value));
    $('btnRetry').addEventListener('click', () => { $('webError').hidden = true; navigate(currentUrl); });
    $('btnOpenBrowser').addEventListener('click', () => api.app.openExternal(currentUrl));

    $('urlInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        navigate($('urlInput').value);
        $('urlInput').blur();
      }
      if (e.key === 'Escape') $('urlInput').blur();
    });
    $('urlInput').addEventListener('focus', (e) => e.target.select());

    // view buttons
    $('btnSettings').addEventListener('click', () => setView('settings'));
    $('btnOpenSettings').addEventListener('click', () => setView('settings'));
    $('btnCloseSettings').addEventListener('click', () => setView('web'));
    $('btnConsole').addEventListener('click', () => setConsole($('consoleDrawer').hidden));
    $('btnConsoleClose').addEventListener('click', () => setConsole(false));
    $('btnConsoleRun').addEventListener('click', () => runScript());
    $('btnConsoleClear').addEventListener('click', () => {
      $('drawerConsole').textContent = '';
      $('settingsConsole').textContent = '';
    });

    // settings tabs
    $('settingsTabs').addEventListener('click', (e) => {
      const tab = e.target.closest('.tab');
      if (!tab) return;
      document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === tab));
      document.querySelectorAll('.tab-panel').forEach((p) => {
        p.classList.toggle('active', p.dataset.panel === tab.dataset.tab);
      });
    });

    // appearance inputs
    $('inpAccent').addEventListener('input', () => patch({ accent: $('inpAccent').value }));
    $('btnAccentReset').addEventListener('click', () => patch({ accent: '' }));
    $('inpFont').addEventListener('change', () => patch({ fontFamily: $('inpFont').value.trim() }));
    $('inpMono').addEventListener('change', () => patch({ monoFamily: $('inpMono').value.trim() }));
    $('inpFontSize').addEventListener('input', () => {
      $('lblFontSize').textContent = `${$('inpFontSize').value}px`;
      patch({ fontSize: Number($('inpFontSize').value) });
    });
    $('inpRadius').addEventListener('input', () => {
      $('lblRadius').textContent = `${$('inpRadius').value}px`;
      patch({ radius: Number($('inpRadius').value) });
    });
    $('inpScale').addEventListener('input', () => {
      $('lblScale').textContent = `${Math.round($('inpScale').value * 100)}%`;
      patch({ uiScale: Number($('inpScale').value) });
    });
    $('inpDensity').addEventListener('change', () => patch({ density: $('inpDensity').value }));
    $('inpAnimations').addEventListener('change', () => patch({ animations: $('inpAnimations').checked }));
    $('inpSidebar').addEventListener('change', () => patch({ sidebar: $('inpSidebar').checked }));
    $('inpTransparency').addEventListener('change', () => patch({ transparency: $('inpTransparency').checked }));
    $('inpStatusbar').addEventListener('change', () => patch({ showStatusbar: $('inpStatusbar').checked }));

    // page tab
    $('btnApplyHome').addEventListener('click', () => {
      navigate($('inpHomeUrl').value);
      toast('Home page saved');
    });
    $('segPageStyle').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      patch({ pageStyling: b.dataset.value }).then(() => {
        pageStyleKey = null;
        applyPageTheme(true);
        toast(b.dataset.value === 'none' ? 'Page styling off' : `Page styling: ${b.dataset.value}`);
      });
    });
    $('inpZoom').addEventListener('input', () => {
      $('lblZoom').textContent = `${Math.round($('inpZoom').value * 100)}%`;
      patch({ pageZoom: Number($('inpZoom').value) }).then(refreshPageZoom);
    });

    // startup tab
    $('btnRunScript').addEventListener('click', () => runScript());
    $('btnPickScript').addEventListener('click', async () => {
      const res = await api.script.pick();
      if (res.ok) {
        settings = await api.settings.get();
        refreshScriptPath();
        toast('Script updated');
      }
    });
    $('btnRevealScript').addEventListener('click', () => api.script.reveal());
    $('inpRunOnStartup').addEventListener('change', () => patch({ runScriptOnStartup: $('inpRunOnStartup').checked }, { silent: true }));

    // connections
    $('btnAddConn').addEventListener('click', () => openModal('new'));
    $('btnNewConn').addEventListener('click', () => openModal('new'));
    $('modalCancel').addEventListener('click', closeModal);
    $('modalSave').addEventListener('click', saveModal);
    $('modalBackdrop').addEventListener('click', (e) => { if (e.target === $('modalBackdrop')) closeModal(); });
    $('modalUrl').addEventListener('keydown', (e) => { if (e.key === 'Enter') saveModal(); });

    // advanced
    $('btnApplyCss').addEventListener('click', async () => {
      await patch({ customCss: $('inpCustomCss').value }, { silent: true });
      pageStyleKey = null;
      applyPageTheme(true);
      $('cssStatus').textContent = 'Applied to the page.';
      setTimeout(() => { $('cssStatus').textContent = ''; }, 2400);
    });
    $('btnExport').addEventListener('click', async () => {
      const res = await api.settings.export();
      if (res.ok) toast('Settings exported');
    });
    $('btnImport').addEventListener('click', async () => {
      const res = await api.settings.import();
      if (res.ok) {
        settings = await api.settings.get();
        syncEverything();
        toast('Settings imported');
      } else if (res.error) {
        toast(`Import failed: ${res.error}`, 'err');
      }
    });
    $('btnReset').addEventListener('click', async () => {
      if (!window.confirm('Reset every setting back to defaults?')) return;
      settings = await api.settings.reset();
      syncEverything();
      navigate(settings.homeUrl);
      toast('Settings reset');
    });

    // sidebar resizer
    const resizer = $('resizer');
    let dragging = false;
    resizer.addEventListener('mousedown', (e) => {
      dragging = true;
      resizer.classList.add('dragging');
      e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const w = Math.min(420, Math.max(170, e.clientX));
      $('sidebar').style.width = `${w}px`;
    });
    window.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      resizer.classList.remove('dragging');
      const w = parseInt($('sidebar').style.width, 10);
      if (w) api.settings.set({ sidebarWidth: w });
    });

    // keyboard
    document.addEventListener('keydown', (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === ',') { e.preventDefault(); setView('settings'); }
      if (mod && e.key === 'b') { e.preventDefault(); patch({ sidebar: !settings.sidebar }); }
      if (mod && e.key === '`') { e.preventDefault(); setConsole($('consoleDrawer').hidden); }
      if (mod && e.key.toLowerCase() === 'l') { e.preventDefault(); $('urlInput').focus(); }
      if (e.key === 'Escape') {
        if (!$('modalBackdrop').hidden) closeModal();
        else if (currentView === 'settings') setView('web');
      }
    });

    // menu actions from the main process
    api.app.onMenuAction((action) => {
      if (action === 'settings') setView('settings');
      if (action === 'reload-page') wv.reload();
      if (action === 'toggle-sidebar') patch({ sidebar: !settings.sidebar });
      if (action === 'toggle-console') setConsole($('consoleDrawer').hidden);
      if (action === 'new-connection') openModal('new');
      if (action === 'about') setView('settings');
    });

    api.layout.onSidebarWidth((w) => { $('sidebar').style.width = `${w}px`; });
  }

  async function runScript() {
    const res = await api.script.run();
    if (!res.ok) toast(res.error || 'Could not run the script', 'err');
    else setConsole(true);
  }

  function refreshScriptPath() {
    api.script.path().then((p) => { $('scriptPathLabel').textContent = p; });
  }

  /* ------------------------------------------------------------------ */
  /* boot                                                               */
  /* ------------------------------------------------------------------ */

  function syncEverything() {
    applyShellTheme();
    renderConnections();
    renderThemeChips();
    renderThemeGrid();
    renderConnEditor();
    fillForm();
    refreshScriptPath();
  }

  async function boot() {
    settings = await api.settings.get();

    // Register the settings listener first: if anything below fails, the shell
    // must still react to changes instead of going stale.
    api.settings.onChanged((next) => {
      settings = next;
      applyShellTheme();
      renderThemeChips();
      renderThemeGrid();
      renderConnections();
      fillForm();
    });

    wireWebview();
    wireEvents();
    syncEverything();

    api.app.info().then(renderAbout).catch(() => {});

    const conns = settings.connections || [];
    activeConnection = conns.find((c) => c.id === settings.activeConnectionId) || conns[0];
    if (activeConnection) {
      $('statusConn').textContent = activeConnection.name;
      currentUrl = activeConnection.url;
      $('urlInput').value = activeConnection.url;
      $('statusUrl').textContent = activeConnection.url;
      await wv.load(activeConnection.url);
    }

    // script console replay
    const state = await api.script.state();
    renderScriptLog(state.log || []);
    renderScriptState(state.state);
    api.script.onLog(renderScriptLog);
    api.script.onState(renderScriptState);

  }

  document.addEventListener('DOMContentLoaded', () => {
    boot().catch((err) => {
      console.error(err);
      toast(`Startup error: ${err.message}`, 'err');
    });
  });
})();
