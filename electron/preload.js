'use strict';

const { contextBridge, ipcRenderer } = require('electron');

/**
 * The only bridge between the shell UI and Node. Everything is a narrow,
 * named operation — no generic `invoke(channel)` escape hatch.
 */
contextBridge.exposeInMainWorld('arena', {
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    defaults: () => ipcRenderer.invoke('settings:defaults'),
    set: (patch) => ipcRenderer.invoke('settings:set', patch),
    reset: () => ipcRenderer.invoke('settings:reset'),
    export: () => ipcRenderer.invoke('settings:export'),
    import: () => ipcRenderer.invoke('settings:import'),
    file: () => ipcRenderer.invoke('settings:file'),
    onChanged: (cb) => {
      const handler = (_e, s) => cb(s);
      ipcRenderer.on('settings:changed', handler);
      return () => ipcRenderer.removeListener('settings:changed', handler);
    }
  },

  script: {
    run: () => ipcRenderer.invoke('script:run'),
    stop: () => ipcRenderer.invoke('script:stop'),
    state: () => ipcRenderer.invoke('script:state'),
    path: () => ipcRenderer.invoke('script:path'),
    pick: () => ipcRenderer.invoke('script:pick'),
    reveal: () => ipcRenderer.invoke('script:reveal'),
    onLog: (cb) => {
      const handler = (_e, lines) => cb(lines);
      ipcRenderer.on('script:log', handler);
      return () => ipcRenderer.removeListener('script:log', handler);
    },
    onState: (cb) => {
      const handler = (_e, state) => cb(state);
      ipcRenderer.on('script:state', handler);
      return () => ipcRenderer.removeListener('script:state', handler);
    }
  },

  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:is-maximized')
  },

  app: {
    info: () => ipcRenderer.invoke('app:info'),
    openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
    onMenuAction: (cb) => {
      const handler = (_e, action) => cb(action);
      ipcRenderer.on('menu:action', handler);
      return () => ipcRenderer.removeListener('menu:action', handler);
    }
  },

  adblock: {
    get: () => ipcRenderer.invoke('adblock:get'),
    set: (patch) => ipcRenderer.invoke('adblock:set', patch),
    resetStats: () => ipcRenderer.invoke('adblock:reset-stats'),
    onChanged: (cb) => {
      const handler = (_e, summary) => cb(summary);
      ipcRenderer.on('adblock:changed', handler);
      return () => ipcRenderer.removeListener('adblock:changed', handler);
    }
  },

  history: {
    list: (query) => ipcRenderer.invoke('history:list', query),
    clear: (range) => ipcRenderer.invoke('history:clear', range),
    remove: (url) => ipcRenderer.invoke('history:delete', url),
    suggest: (query) => ipcRenderer.invoke('history:suggest', query)
  },

  bookmarks: {
    list: () => ipcRenderer.invoke('bookmarks:list'),
    add: (payload) => ipcRenderer.invoke('bookmarks:add', payload),
    remove: (id) => ipcRenderer.invoke('bookmarks:remove', id),
    update: (id, patch) => ipcRenderer.invoke('bookmarks:update', id, patch),
    isBookmarked: (url) => ipcRenderer.invoke('bookmarks:is', url),
    onChanged: (cb) => {
      const handler = (_e, items) => cb(items);
      ipcRenderer.on('bookmarks:changed', handler);
      return () => ipcRenderer.removeListener('bookmarks:changed', handler);
    }
  },

  downloads: {
    list: () => ipcRenderer.invoke('downloads:list'),
    clear: () => ipcRenderer.invoke('downloads:clear'),
    open: (id) => ipcRenderer.invoke('downloads:open', id),
    reveal: (idOrPath) => ipcRenderer.invoke('downloads:reveal', idOrPath),
    folder: () => ipcRenderer.invoke('downloads:folder'),
    onChanged: (cb) => {
      const handler = (_e, items) => cb(items);
      ipcRenderer.on('downloads:changed', handler);
      return () => ipcRenderer.removeListener('downloads:changed', handler);
    }
  },

  extensions: {
    list: () => ipcRenderer.invoke('extensions:list'),
    install: () => ipcRenderer.invoke('extensions:install'),
    setEnabled: (id, enabled) => ipcRenderer.invoke('extensions:set-enabled', id, enabled),
    folder: () => ipcRenderer.invoke('extensions:folder'),
    remove: (id) => ipcRenderer.invoke('extensions:remove', id),
    onChanged: (cb) => {
      const handler = (_e, list) => cb(list);
      ipcRenderer.on('extensions:changed', handler);
      return () => ipcRenderer.removeListener('extensions:changed', handler);
    }
  },

  mini: {
    open: (video) => ipcRenderer.invoke('mini:open', video),
    close: () => ipcRenderer.invoke('mini:close'),
    get: () => ipcRenderer.invoke('mini:get'),
    focusSource: () => ipcRenderer.invoke('mini:focus-source'),
    setAlwaysOnTop: (on) => ipcRenderer.invoke('mini:always-on-top', on),
    onState: (cb) => {
      const handler = (_e, state) => cb(state);
      ipcRenderer.on('mini:state', handler);
      return () => ipcRenderer.removeListener('mini:state', handler);
    }
  },

  reskin: {
    profiles: () => ipcRenderer.invoke('reskin:profiles'),
    apply: (payload) => ipcRenderer.invoke('reskin:apply', payload),
    remove: () => ipcRenderer.invoke('reskin:remove'),
    status: () => ipcRenderer.invoke('reskin:status'),
    pick: (role) => ipcRenderer.invoke('reskin:pick', role)
  },

  youtube: {
    get: () => ipcRenderer.invoke('youtube:get'),
    set: (patch) => ipcRenderer.invoke('youtube:set', patch),
    onState: (cb) => {
      const handler = (_e, state) => cb(state);
      ipcRenderer.on('youtube:state', handler);
      return () => ipcRenderer.removeListener('youtube:state', handler);
    }
  },

  browser: {
    clearData: () => ipcRenderer.invoke('shell:clear-data'),
    exportStore: () => ipcRenderer.invoke('store:export'),
    onNavigate: (cb) => {
      const handler = (_e, url) => cb(url);
      ipcRenderer.on('navigate', handler);
      return () => ipcRenderer.removeListener('navigate', handler);
    },
    onToast: (cb) => {
      const handler = (_e, payload) => cb(payload);
      ipcRenderer.on('toast', handler);
      return () => ipcRenderer.removeListener('toast', handler);
    }
  },

  layout: {
    onSidebarWidth: (cb) => {
      const handler = (_e, w) => cb(w);
      ipcRenderer.on('layout:sidebar', handler);
      return () => ipcRenderer.removeListener('layout:sidebar', handler);
    }
  }
});
