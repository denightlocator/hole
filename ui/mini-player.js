/* global window, document */
/**
 * Mini player renderer.
 *
 * Receives the current video from the main process (via preload), shows the
 * YouTube embed, and reports play/pause back so the main window can show state.
 *
 * Dragging and resizing are done by hand (screen coordinates through the
 * preload bridge) instead of CSS app-region dragging, because the player is
 * frameless and always-on-top and needs to keep working while the iframe has
 * focus.
 */
(function () {
  'use strict';

  const api = window.arenaMini;
  const $ = (id) => document.getElementById(id);

  let video = null;
  let dragging = false;
  let dragStart = null;

  function setOverlay(visible, text) {
    const overlay = $('overlay');
    overlay.hidden = !visible;
    if (text) $('overlayText').textContent = text;
  }

  function applyVideo(next) {
    if (!next) return;
    video = next;

    const title = next.title || 'Video';
    $('videoTitle').textContent = title;
    $('dragTitle').textContent = title;
    document.title = `${title} — Mini Player`;

    if (next.quality) {
      $('qualityBadge').hidden = false;
      $('qualityBadge').textContent = next.quality;
    } else {
      $('qualityBadge').hidden = true;
    }

    if (next.embedUrl) {
      setOverlay(true, 'Loading video…');
      $('player').src = next.embedUrl;
    }
  }

  function setPlaying(playing) {
    $('liveDot').classList.toggle('paused', !playing);
    $('liveDot').title = playing ? 'Playing' : 'Paused';
  }

  /* ---------------------------------------------------------------- events */

  $('player').addEventListener('load', () => {
    // The iframe has loaded; the video may still be buffering, so clear the
    // overlay after a short grace period rather than immediately.
    setTimeout(() => setOverlay(false), 450);
  });

  $('btnClose').addEventListener('click', () => {
    api.close();
  });

  $('btnBack').addEventListener('click', () => {
    api.focusSource();
  });

  // --- dragging ------------------------------------------------------------
  const strip = $('dragStrip');

  strip.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.icon-btn')) return;
    dragging = true;
    dragStart = { x: e.screenX, y: e.screenY };
    document.body.classList.add('dragging');
    strip.setPointerCapture(e.pointerId);
    api.dragStart({ x: e.screenX, y: e.screenY });
  });

  strip.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    api.dragMove({ x: e.screenX, y: e.screenY });
  });

  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    dragStart = null;
    document.body.classList.remove('dragging');
    try {
      strip.releasePointerCapture(e.pointerId);
    } catch { /* already released */ }
    api.dragEnd();
  };
  strip.addEventListener('pointerup', endDrag);
  strip.addEventListener('pointercancel', endDrag);

  // --- resizing ------------------------------------------------------------
  const handle = $('resizeHandle');
  let resizing = false;

  handle.addEventListener('pointerdown', (e) => {
    resizing = true;
    handle.setPointerCapture(e.pointerId);
    api.resizeStart({ x: e.screenX, y: e.screenY });
    e.stopPropagation();
  });

  handle.addEventListener('pointermove', (e) => {
    if (!resizing) return;
    api.resizeMove({ x: e.screenX, y: e.screenY });
  });

  const endResize = (e) => {
    if (!resizing) return;
    resizing = false;
    try {
      handle.releasePointerCapture(e.pointerId);
    } catch { /* already released */ }
    api.resizeEnd();
  };
  handle.addEventListener('pointerup', endResize);
  handle.addEventListener('pointercancel', endResize);

  // Double-clicking the bar toggles a roomy/small size.
  strip.addEventListener('dblclick', (e) => {
    if (e.target.closest('.icon-btn')) return;
    api.toggleSize();
  });

  // --- keyboard ------------------------------------------------------------
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') api.close();
    if (e.key === ' ') {
      e.preventDefault();
      api.togglePlay();
    }
  });

  /* ------------------------------------------------------------------ boot */

  api.onVideo(applyVideo);
  api.onPlaying(setPlaying);

  api.get().then((state) => {
    if (state && state.video) applyVideo(state.video);
    else setOverlay(true, 'No video selected');
    if (state) setPlaying(!!state.playing);
  }).catch(() => setOverlay(true, 'Could not load the player'));
})();
