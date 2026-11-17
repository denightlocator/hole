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

  layout: {
    onSidebarWidth: (cb) => {
      const handler = (_e, w) => cb(w);
      ipcRenderer.on('layout:sidebar', handler);
      return () => ipcRenderer.removeListener('layout:sidebar', handler);
    }
  }
});
