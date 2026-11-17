'use strict';

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Narrow bridge for the always-on-top mini player window.
 * Window movement/resizing is done in screen coordinates because a frameless
 * always-on-top window can't use CSS app-region dragging reliably.
 */
contextBridge.exposeInMainWorld('arenaMini', {
  get: () => ipcRenderer.invoke('mini:get'),
  close: () => ipcRenderer.invoke('mini:close'),
  focusSource: () => ipcRenderer.invoke('mini:focus-source'),
  togglePlay: () => ipcRenderer.invoke('mini:toggle-play'),
  toggleSize: () => ipcRenderer.invoke('mini:toggle-size'),

  dragStart: (p) => ipcRenderer.invoke('mini:drag-start', p),
  dragMove: (p) => ipcRenderer.invoke('mini:drag-move', p),
  dragEnd: () => ipcRenderer.invoke('mini:drag-end'),

  resizeStart: (p) => ipcRenderer.invoke('mini:resize-start', p),
  resizeMove: (p) => ipcRenderer.invoke('mini:resize-move', p),
  resizeEnd: () => ipcRenderer.invoke('mini:resize-end'),

  onVideo: (cb) => {
    const handler = (_e, video) => cb(video);
    ipcRenderer.on('mini:video', handler);
    return () => ipcRenderer.removeListener('mini:video', handler);
  },
  onPlaying: (cb) => {
    const handler = (_e, playing) => cb(playing);
    ipcRenderer.on('mini:playing', handler);
    return () => ipcRenderer.removeListener('mini:playing', handler);
  }
});
