'use strict';

/**
 * Preload for the *browsing* webview (not the shell UI).
 *
 * Runs in an isolated world next to whatever site is loaded. Its only job is
 * to relay `window.postMessage({ __arena: true, ... })` events from our
 * injected page scripts up to the main process, and to expose a tiny, fixed
 * helper for the custom YouTube UI.
 *
 * Security notes:
 *   - no Node, no `require`, no remote calls
 *   - only messages tagged `__arena: true` are forwarded
 *   - every forwarded type is on an allowlist
 */

const { ipcRenderer } = require('electron');

const ALLOWED_TYPES = new Set(['yt-popout', 'yt-state', 'yt-leaving', 'arena-ready']);

window.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;
  if (data.__arena !== true) return;
  if (!ALLOWED_TYPES.has(data.type)) return;

  ipcRenderer.sendToHost('page:message', {
    type: data.type,
    payload: sanitize(data.payload)
  });
});

/** Only pass through primitives we expect — never arbitrary objects. */
function sanitize(payload) {
  if (!payload || typeof payload !== 'object') return {};
  const out = {};
  if (typeof payload.id === 'string' && /^[A-Za-z0-9_-]{11}$/.test(payload.id)) out.id = payload.id;
  if (typeof payload.title === 'string') out.title = payload.title.slice(0, 300);
  if (typeof payload.currentTime === 'number' && isFinite(payload.currentTime)) {
    out.currentTime = Math.max(0, Math.floor(payload.currentTime));
  }
  if (typeof payload.paused === 'boolean') out.paused = payload.paused;
  return out;
}
