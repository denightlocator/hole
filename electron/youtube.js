'use strict';

/**
 * YouTube integration.
 *
 * Two separate things live here:
 *
 *  1. PAGE_CSS / pageScript — injected into youtube.com to add a custom UI
 *     (a "Pop out" button in the player, a slimmer header, quality default).
 *
 *  2. parseVideoId / embedUrl — what the always-on-top mini player needs.
 *
 * The mini player window itself is created in main.js; this module only knows
 * how to turn URLs into something embeddable and how to style the page.
 */

const YT_HOSTS = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'];

function isYouTube(url) {
  try {
    return YT_HOSTS.includes(new URL(url).hostname.toLowerCase());
  } catch {
    return false;
  }
}

/** Extract the 11-char video id from watch/short/embed/live URLs. */
function parseVideoId(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (host === 'youtu.be') {
    const id = url.pathname.slice(1).split('/')[0];
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  }
  if (!host.endsWith('youtube.com')) return null;

  const v = url.searchParams.get('v');
  if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;

  const m = url.pathname.match(/^\/(embed|shorts|live|v)\/([A-Za-z0-9_-]{11})/);
  return m ? m[2] : null;
}

/** Seconds from `t=` / `start=` params (handles 90, 1m30s, 1h2m3s). */
function parseStartTime(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const raw = url.searchParams.get('t') || url.searchParams.get('start') || '';
    if (!raw) return 0;
    if (/^\d+$/.test(raw)) return parseInt(raw, 10);
    const m = raw.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
    if (!m) return 0;
    return (parseInt(m[1] || 0, 10) * 3600) +
           (parseInt(m[2] || 0, 10) * 60) +
           parseInt(m[3] || 0, 10);
  } catch {
    return 0;
  }
}

/**
 * Embed URL for the mini player.
 * `enablejsapi` + `origin` are required for the iframe API to talk to us.
 */
function embedUrl(videoId, { start = 0, autoplay = 1, quality = '' } = {}) {
  if (!videoId) return '';
  const params = new URLSearchParams({
    autoplay: String(autoplay),
    rel: '0',
    modestbranding: '1',
    enablejsapi: '1',
    playsinline: '1',
    origin: 'https://www.youtube.com'
  });
  if (start > 0) params.set('start', String(start));
  if (quality) params.set('vq', quality);
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

// --------------------------------------------------------------- page CSS --
// A custom, quieter YouTube: slimmer chrome, rounded player, no shorts shelf.

const PAGE_CSS = `
  /* --- Arena Shell :: custom YouTube UI --- */
  ytd-masthead#masthead-container { height: 46px !important; background: var(--yt-spec-base-background) !important; }
  #masthead-container.ytd-app { height: 46px !important; }
  ytd-watch-flexy[flexy] #primary { max-width: none !important; }

  /* Rounded player with a soft shadow */
  #movie_player.html5-video-player,
  .html5-video-container video {
    border-radius: 14px !important;
    overflow: hidden !important;
  }
  ytd-player#ytd-player { border-radius: 14px !important; overflow: hidden !important; }

  /* Hide the things nobody uses */
  ytd-reel-shelf-renderer,
  ytd-rich-shelf-renderer[is-shorts],
  ytd-guide-entry-renderer a[title="Shorts"],
  ytd-mini-guide-entry-renderer[aria-label="Shorts"],
  #related ytd-compact-promoted-video-renderer,
  ytd-display-ad-renderer,
  ytd-ad-slot-renderer,
  .ytp-ad-module,
  #masthead-ad { display: none !important; }

  /* Tighter, more readable metadata */
  ytd-watch-metadata { border-radius: 12px !important; }
  #above-the-fold { margin-bottom: 8px !important; }

  /* The custom pop-out button injected next to the player controls */
  .arena-yt-popout {
    position: absolute;
    right: 12px;
    top: 12px;
    z-index: 2147483000;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 30px;
    padding: 0 11px;
    border: 0;
    border-radius: 999px;
    background: rgba(16,18,24,0.82);
    color: #eaf6f1;
    font: 600 12px/1 'Inter', system-ui, sans-serif;
    cursor: pointer;
    opacity: 0;
    transform: translateY(-4px);
    transition: opacity .18s ease, transform .18s ease, background .18s ease;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(201,242,228,0.28);
  }
  #movie_player:hover .arena-yt-popout,
  .arena-yt-popout:focus-visible { opacity: 1; transform: translateY(0); }
  .arena-yt-popout:hover { background: rgba(201,242,228,0.18); }
  .arena-yt-popout svg { width: 13px; height: 13px; }

  /* A floating "keep listening" chip shown when navigating away mid-video */
  .arena-yt-persist {
    position: fixed; left: 50%; bottom: 22px; transform: translateX(-50%);
    z-index: 2147483000; display: flex; align-items: center; gap: 10px;
    padding: 9px 14px; border-radius: 999px;
    background: rgba(16,18,24,0.92); color: #eaf6f1;
    border: 1px solid rgba(201,242,228,0.28);
    font: 500 12.5px/1 'Inter', system-ui, sans-serif;
    box-shadow: 0 14px 40px rgba(0,0,0,.55);
    backdrop-filter: blur(12px);
  }
  .arena-yt-persist button {
    border: 0; border-radius: 999px; padding: 5px 10px; cursor: pointer;
    background: #c9f2e4; color: #10231c; font: 600 11.5px/1 inherit;
  }
`;

// ------------------------------------------------------------ page script --
// Runs in the page's main world, so it talks to the shell via window.postMessage
// (Electron's contextBridge isn't available out there).

const PAGE_SCRIPT = `
(function () {
  if (window.__arenaYouTube) return;
  window.__arenaYouTube = true;

  var ICON = '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="13" rx="2.5" stroke="currentColor" stroke-width="1.7"/><path d="M13 9.2v5l4-2.5-4-2.5Z" fill="currentColor"/><path d="M8 21h8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';

  function post(type, payload) {
    try { window.postMessage({ __arena: true, type: type, payload: payload }, '*'); } catch (e) {}
  }

  function currentVideo() {
    var id = new URLSearchParams(location.search).get('v');
    if (!id) {
      var m = location.pathname.match(/^\\/(shorts|embed|live)\\/([A-Za-z0-9_-]{11})/);
      if (m) id = m[2];
    }
    if (!id) return null;
    var titleEl = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, #title h1 yt-formatted-string');
    var vid = document.querySelector('video');
    return {
      id: id,
      title: titleEl ? titleEl.textContent.trim() : document.title.replace(/ - YouTube$/, ''),
      currentTime: vid ? Math.floor(vid.currentTime) : 0,
      paused: vid ? vid.paused : true
    };
  }

  function addPopoutButton() {
    var player = document.getElementById('movie_player');
    if (!player || player.querySelector('.arena-yt-popout')) return;
    var btn = document.createElement('button');
    btn.className = 'arena-yt-popout';
    btn.type = 'button';
    btn.innerHTML = ICON + '<span>Pop out</span>';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var v = currentVideo();
      if (v) post('yt-popout', v);
    });
    player.appendChild(btn);
  }

  // Keep the pop-out button present across YouTube's SPA navigations.
  var observer = new MutationObserver(function () { addPopoutButton(); });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  addPopoutButton();

  // Tell the shell which video is playing, so it can survive navigation.
  setInterval(function () {
    var v = currentVideo();
    if (v) post('yt-state', v);
  }, 3000);

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      var v = currentVideo();
      if (v && !v.paused) post('yt-leaving', v);
    }
  });
})();
`;

module.exports = {
  isYouTube,
  parseVideoId,
  parseStartTime,
  embedUrl,
  PAGE_CSS,
  PAGE_SCRIPT,
  YT_HOSTS
};
