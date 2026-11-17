/* global window, module */
/**
 * Re-skin profiles.
 *
 * A profile is: a layout tree, a selector map per role, and CSS.
 * Layout slots pull the *site's own* elements in, so nothing functional is
 * lost — see engine.js for the mechanism.
 *
 * Roles a profile can use:
 *   header, messages, composer, send, newChat, sidebar, modelPicker,
 *   accounts, attachments, settings
 */
(function (root) {
  'use strict';

  /* ==================================================================== */
  /* Claude Code — terminal-native, monospace, transcript-driven          */
  /* ==================================================================== */

  const CLAUDE_CODE_CSS = `
/* ===== Arena Re-skin :: Claude Code ===== */
:root {
  --cc-bg: #0d0d0c;
  --cc-panel: #131312;
  --cc-elev: #1a1a18;
  --cc-line: rgba(255,255,255,0.09);
  --cc-line-strong: rgba(217,119,87,0.34);
  --cc-text: #eeece2;
  --cc-dim: #a9a79b;
  --cc-mute: #6f6d64;
  --cc-accent: #d97757;      /* terracotta: Claude's prompt colour */
  --cc-ok: #7fb069;
  --cc-warn: #e0b341;

  --cc-mono: 'JetBrains Mono', 'Cascadia Mono', ui-monospace, 'SF Mono',
             Menlo, Consolas, monospace;
}

/* Our layer must not add layout: the site keeps its own scrollbar. */
html.arena-rs-active body > *:not(.arena-reskin) { visibility: visible; }

.arena-reskin {
  position: fixed;
  inset: 0;
  z-index: 2147482900;
  display: flex;
  background: var(--cc-bg);
  color: var(--cc-text);
  font-family: var(--cc-mono);
  font-size: 13px;
  line-height: 1.58;
  letter-spacing: -0.005em;
  overflow: hidden;
}

.arena-rs-host {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  flex-direction: column;
}

/* ── header ─────────────────────────────────────────────────── */

.cc-header {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 0 0 38px;
  height: 38px;
  padding: 0 14px;
  border-bottom: 1px solid var(--cc-line);
  background: var(--cc-panel);
}

.cc-prompt-glyph {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--cc-accent);
  font-weight: 600;
  white-space: nowrap;
}
.cc-prompt-glyph::before {
  content: '>';
  color: var(--cc-accent);
  font-weight: 700;
}

.cc-cwd {
  color: var(--cc-mute);
  font-size: 11.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cc-header-spacer { flex: 1 1 auto; }

.cc-header-slot { display: flex; align-items: center; gap: 8px; }
.cc-header-slot > * { max-height: 30px; }

/* Adopted site header: keep it usable, shrink its footprint. */
.cc-header .arena-adopted {
  display: flex !important;
  align-items: center;
  gap: 8px;
  min-height: 0 !important;
  height: 30px;
  overflow: hidden;
}

/* ── conversation ───────────────────────────────────────────── */

.cc-main {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.cc-transcript {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 18px 0 26px;
  scrollbar-width: thin;
  scrollbar-color: rgba(217,119,87,0.4) transparent;
}
.cc-transcript::-webkit-scrollbar { width: 9px; }
.cc-transcript::-webkit-scrollbar-thumb {
  background: rgba(217,119,87,0.35);
  border-radius: 6px;
  border: 2px solid transparent;
  background-clip: content-box;
}

/* The site's own message list, moved inside. */
.cc-transcript > [data-arena-role="messages"] {
  display: flex !important;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  max-width: 820px;
  margin: 0 auto;
  padding: 0 22px;
}

/* Every message becomes a transcript block with a gutter glyph. */
.arena-rs-message {
  position: relative;
  margin: 0 !important;
  padding: 6px 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  font-size: 13px !important;
  line-height: 1.6 !important;
}

/* Gutters belong to top-level turns only. Sites often wrap a turn in several
   rows, and every wrapper gets .arena-rs-message so it can be de-chromed; if we
   drew a glyph on each, the transcript would sprout doubles. */
.cc-transcript [data-arena-role="messages"] > .arena-rs-message {
  padding-left: 26px !important;
  margin: 0 0 14px !important;
}
.cc-transcript [data-arena-role="messages"] > .arena-rs-message > .arena-rs-message {
  padding-left: 0 !important;
}

/* User turns: terracotta chevron. Assistant turns: dim bullet.
   Sites rarely expose a reliable author class, so we use position:
   the first block of a pair is usually the user's. */
.cc-transcript [data-arena-role="messages"] > .arena-rs-message::before {
  position: absolute;
  left: 6px;
  top: 7px;
  color: var(--cc-accent);
  font-weight: 700;
  content: '>';
}
.cc-transcript [data-arena-role="messages"] > .arena-rs-message:nth-child(even)::before {
  content: '⏺';
  color: var(--cc-dim);
  font-weight: 400;
}

/* Speaker labels ("You", "Assistant") sit on their own dim line, the way a
   shell prints a command and then its output. */
.arena-rs-message > .arena-rs-author {
  display: block !important;
  margin: 0 0 3px !important;
  padding: 0 !important;
  font-size: 11px !important;
  line-height: 1.5 !important;
  letter-spacing: .02em;
  color: var(--cc-mute) !important;
  text-transform: lowercase;
}
.arena-rs-message > .arena-rs-author::before {
  content: '· ';
  color: var(--cc-line-strong);
}

/* Links and inline code in the site's own markup, restyled not replaced. */
.arena-rs-message a { color: var(--cc-accent) !important; text-decoration: underline; text-underline-offset: 2px; }
.arena-rs-message code,
.arena-rs-message pre {
  font-family: var(--cc-mono) !important;
  background: #08080a !important;
  border: 1px solid var(--cc-line) !important;
  border-radius: 5px !important;
  font-size: 12px !important;
}
.arena-rs-message pre { padding: 10px 12px !important; overflow-x: auto; }
.arena-rs-message img { border-radius: 6px; max-width: 100%; }

/* ── composer ───────────────────────────────────────────────── */

.cc-composer-wrap {
  flex: 0 0 auto;
  padding: 10px 22px 18px;
  background: linear-gradient(to top, var(--cc-bg) 62%, transparent);
}

.cc-composer {
  position: relative;
  max-width: 820px;
  margin: 0 auto;
  display: flex;
  align-items: flex-end;
  gap: 9px;
  padding: 9px 11px 9px 12px;
  border: 1px solid var(--cc-line-strong);
  border-radius: 8px;
  background: var(--cc-panel);
  transition: border-color .16s ease, box-shadow .16s ease;
}
.cc-composer:focus-within {
  border-color: var(--cc-accent);
  box-shadow: 0 0 0 3px rgba(217,119,87,0.13);
}

/* A leading prompt caret, like a shell. */
.cc-composer::before {
  content: '>';
  flex: 0 0 auto;
  color: var(--cc-accent);
  font-weight: 700;
  padding-bottom: 4px;
  user-select: none;
}

/* The site's real textarea, moved in and de-chromed. */
.cc-composer [data-arena-role="composer"] {
  flex: 1 1 auto;
  min-width: 0;
  width: 100%;
  min-height: 22px;
  max-height: 40vh;
  padding: 2px 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  color: var(--cc-text) !important;
  font-family: var(--cc-mono) !important;
  font-size: 13px !important;
  line-height: 1.55 !important;
  resize: none;
  outline: none !important;
  box-shadow: none !important;
}
.cc-composer [data-arena-role="composer"]::placeholder { color: var(--cc-mute) !important; }

/* When the site keeps its input and submit button inside a <form> — the common
   case, and the only way Enter-to-send keeps working — the engine adopts the
   whole form. It becomes the composer row itself. */
.cc-composer [data-arena-role="composer-form"] {
  display: flex !important;
  align-items: flex-end;
  gap: 9px;
  flex: 1 1 auto;
  min-width: 0;
  width: 100%;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}
.cc-composer [data-arena-role="composer-form"] > [data-arena-role="send"],
.cc-composer [data-arena-role="composer-form"] > button[type="submit"],
.cc-composer [data-arena-role="composer-form"] > button:last-of-type {
  flex: 0 0 auto;
  height: 26px;
  min-width: 26px;
  margin: 0 !important;
  padding: 0 9px !important;
  border: 1px solid var(--cc-line-strong) !important;
  border-radius: 5px !important;
  background: var(--cc-elev) !important;
  color: var(--cc-accent) !important;
  font-family: var(--cc-mono) !important;
  font-size: 11.5px !important;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}
.cc-composer [data-arena-role="composer-form"] > button[type="submit"]:hover,
.cc-composer [data-arena-role="composer-form"] > [data-arena-role="send"]:hover {
  background: rgba(217,119,87,0.16) !important;
}
.cc-composer [data-arena-role="composer-form"] > [data-arena-role="composer"],
.cc-composer [data-arena-role="composer-form"] > textarea,
.cc-composer [data-arena-role="composer-form"] > [contenteditable="true"] {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 22px;
  max-height: 40vh;
  padding: 2px 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  color: var(--cc-text) !important;
  font-family: var(--cc-mono) !important;
  font-size: 13px !important;
  line-height: 1.55 !important;
  resize: none;
  outline: none !important;
  box-shadow: none !important;
}
.cc-composer [data-arena-role="composer-form"] > textarea::placeholder {
  color: var(--cc-mute) !important;
}

/* A form adopted for the group, and the slot markers for its members. */
.arena-rs-formslot { flex: 1 1 auto; min-width: 0; display: flex; }

/* The site's send button, shrunk to a terminal key. */
.cc-send-slot { display: flex; align-items: center; gap: 6px; flex: 0 0 auto; }
.cc-send-slot [data-arena-role="send"] {
  height: 26px;
  min-width: 26px;
  padding: 0 9px !important;
  border: 1px solid var(--cc-line-strong) !important;
  border-radius: 5px !important;
  background: var(--cc-elev) !important;
  color: var(--cc-accent) !important;
  font-family: var(--cc-mono) !important;
  font-size: 11.5px !important;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}
.cc-send-slot [data-arena-role="send"]:hover { background: rgba(217,119,87,0.16) !important; }
.cc-send-slot [data-arena-role="send"]:disabled { opacity: .4; cursor: default; }

.cc-composer-hint {
  max-width: 820px;
  margin: 7px auto 0;
  display: flex;
  gap: 14px;
  font-size: 10.5px;
  color: var(--cc-mute);
  padding-left: 2px;
}
.cc-composer-hint kbd {
  font-family: var(--cc-mono);
  font-size: 10px;
  padding: 1px 5px;
  border: 1px solid var(--cc-line);
  border-bottom-width: 2px;
  border-radius: 4px;
  background: var(--cc-elev);
  color: var(--cc-dim);
}

/* ── right rail: the site's own sidebar, moved and quietened ── */

.cc-rail {
  flex: 0 0 232px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-left: 1px solid var(--cc-line);
  background: var(--cc-panel);
  overflow-y: auto;
  scrollbar-width: thin;
}
.cc-rail[data-empty="true"] { display: none; }

.cc-rail-title {
  padding: 11px 13px 7px;
  font-size: 10px;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: var(--cc-mute);
  border-bottom: 1px solid var(--cc-line);
  position: sticky;
  top: 0;
  background: var(--cc-panel);
  z-index: 2;
}

.cc-rail [data-arena-role="sidebar"] {
  display: block !important;
  width: 100% !important;
  max-width: none !important;
  height: auto !important;
  min-height: 0 !important;
  padding: 8px !important;
  border: 0 !important;
  background: transparent !important;
  font-family: var(--cc-mono) !important;
  font-size: 12px !important;
  overflow: visible !important;
}

/* Generic de-chroming for whatever list the site renders in the rail. */
.cc-rail [data-arena-role="sidebar"] a,
.cc-rail [data-arena-role="sidebar"] button,
.cc-rail [data-arena-role="sidebar"] li {
  border-radius: 4px !important;
  font-family: var(--cc-mono) !important;
  font-size: 12px !important;
  color: var(--cc-dim) !important;
  background: transparent !important;
  padding: 4px 7px !important;
  text-align: left;
}
.cc-rail [data-arena-role="sidebar"] a:hover,
.cc-rail [data-arena-role="sidebar"] button:hover,
.cc-rail [data-arena-role="sidebar"] li:hover {
  background: rgba(217,119,87,0.10) !important;
  color: var(--cc-text) !important;
}

/* ── status line ────────────────────────────────────────────── */

.cc-status {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 0 0 24px;
  height: 24px;
  padding: 0 12px;
  border-top: 1px solid var(--cc-line);
  background: var(--cc-panel);
  color: var(--cc-mute);
  font-size: 10.5px;
  white-space: nowrap;
  overflow: hidden;
}
.cc-status .cc-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: var(--cc-ok);
  flex: 0 0 5px;
}
.cc-status .cc-grow { flex: 1 1 auto; }
.cc-status .cc-sep { color: var(--cc-line); }

/* ── unmapped roles ─────────────────────────────────────────── */

.arena-rs-missing {
  display: none !important;   /* never show a hole where a slot should be */
}

/* A role that already lives inside a container we adopted (a "new chat" button
   inside the site header, for example). It stays where it is, so its slot is a
   zero-size marker instead of a duplicate. */
.arena-rs-inplace {
  display: none !important;
}

/* Fallback banner shown when a required role can't be found. */
.cc-warning {
  flex: 0 0 auto;
  margin: 10px 22px 0;
  padding: 8px 11px;
  border: 1px solid rgba(224,179,65,0.4);
  border-radius: 6px;
  background: rgba(224,179,65,0.10);
  color: var(--cc-warn);
  font-size: 11.5px;
}
.cc-warning b { font-weight: 700; }

/* Small screens: drop the rail before squashing the transcript. */
@media (max-width: 900px) {
  .cc-rail { display: none; }
}
`;

  const CLAUDE_CODE = {
    id: 'claude-code',
    name: 'Claude Code',
    version: '1.0.0',
    description:
      'Terminal-native transcript: monospace, prompt carets, terracotta accents, ' +
      'a status line, and the site\'s own session list in a right rail.',

    /**
     * Selectors are best-effort defaults. Anything wrong here is fixable from
     * Settings -> Re-skin -> Map elements, which writes to settings.reskin.map.
     */
    selectors: {
      composer: 'textarea',
      send: 'button[type="submit"], button[aria-label*="send" i]',
      messages: 'main',
      sidebar: 'nav, aside',
      header: 'header, [role="banner"]'
    },

    layout: [
      {
        tag: 'div',
        cls: 'cc-header',
        children: [
          { tag: 'span', cls: 'cc-prompt-glyph', text: 'arena' },
          { tag: 'span', cls: 'cc-header-slot', slot: 'header' },
          { tag: 'span', cls: 'cc-cwd', text: '~/workspace' },
          { tag: 'span', cls: 'cc-header-spacer' },
          { tag: 'span', cls: 'cc-header-slot', slot: 'newChat' }
        ]
      },
      {
        tag: 'div',
        cls: 'cc-main',
        children: [
          {
            tag: 'div',
            cls: 'cc-transcript',
            children: [{ tag: 'div', cls: 'cc-messages', slot: 'messages' }]
          },
          {
            tag: 'div',
            cls: 'cc-rail',
            children: [
              { tag: 'div', cls: 'cc-rail-title', text: 'history' },
              { tag: 'div', cls: 'cc-rail-body', slot: 'sidebar' }
            ]
          }
        ]
      },
      {
        tag: 'div',
        cls: 'cc-composer-wrap',
        children: [
          {
            tag: 'div',
            cls: 'cc-composer',
            children: [
              { tag: 'div', cls: 'cc-composer-field', slot: 'composer' },
              {
                tag: 'div',
                cls: 'cc-send-slot',
                children: [{ tag: 'div', cls: 'cc-send', slot: 'send' }]
              }
            ]
          },
          {
            tag: 'div',
            cls: 'cc-composer-hint',
            children: [
              { tag: 'span', text: 'enter to send' },
              { tag: 'span', text: 'shift+enter for a new line' },
              { tag: 'span', text: '/ for commands' }
            ]
          }
        ]
      },
      {
        tag: 'div',
        cls: 'cc-status',
        children: [
          { tag: 'span', cls: 'cc-dot' },
          { tag: 'span', text: 'connected' },
          { tag: 'span', cls: 'cc-sep', text: '·' },
          { tag: 'span', text: 'arena shell' },
          { tag: 'span', cls: 'cc-grow' },
          { tag: 'span', cls: 'cc-slot-status', slot: 'status' }
        ]
      }
    ],

    css: CLAUDE_CODE_CSS
  };

  /* ==================================================================== */
  /* Minimal (a blank-slate structural re-skin)                           */
  /* ==================================================================== */

  const MINIMAL_CSS = `
.arena-reskin {
  position: fixed; inset: 0; z-index: 2147482900;
  display: flex; flex-direction: column;
  background: #0f0f0e; color: #ececec;
  font-family: 'Inter', system-ui, sans-serif;
}
.arena-rs-host { display: flex; flex-direction: column; flex: 1 1 auto; min-width: 0; }
.mn-scroll { flex: 1 1 auto; overflow-y: auto; }
.mn-scroll > [data-arena-role="messages"] {
  max-width: 760px; margin: 0 auto; padding: 24px 20px;
  display: flex !important; flex-direction: column; gap: 14px;
  width: 100%;
}
.mn-bar {
  display: flex; gap: 10px; align-items: center;
  padding: 12px 16px; border-top: 1px solid rgba(255,255,255,.1);
  background: #151514;
}
.mn-bar > [data-arena-role="composer"] {
  flex: 1 1 auto; min-height: 38px; max-height: 30vh;
  padding: 8px 12px !important; border-radius: 9px !important;
  border: 1px solid rgba(255,255,255,.14) !important;
  background: #0d0d0c !important; color: inherit !important;
  font: 13.5px/1.5 inherit !important; resize: none; outline: none;
}
.mn-bar > [data-arena-role="send"] {
  height: 34px; padding: 0 14px !important; border-radius: 9px !important;
  border: 0 !important; background: #ececec !important; color: #111 !important;
  font: 600 12.5px inherit !important; cursor: pointer;
}
.arena-rs-message { padding: 0 !important; border: 0 !important; background: transparent !important; }
`;

  const MINIMAL = {
    id: 'minimal',
    name: 'Minimal',
    version: '1.0.0',
    description: 'A blank structural canvas: your messages, one input, nothing else.',
    selectors: { composer: 'textarea', send: 'button[type="submit"]', messages: 'main' },
    layout: [
      { tag: 'div', cls: 'mn-scroll', children: [{ tag: 'div', slot: 'messages' }] },
      {
        tag: 'div',
        cls: 'mn-bar',
        children: [
          { tag: 'div', slot: 'composer', cls: 'mn-field' },
          { tag: 'div', slot: 'send', cls: 'mn-send' }
        ]
      }
    ],
    css: MINIMAL_CSS
  };

  const PROFILES = { 'claude-code': CLAUDE_CODE, minimal: MINIMAL };

  const api = {
    PROFILES,
    list() {
      return Object.keys(PROFILES).map((id) => ({
        id,
        name: PROFILES[id].name,
        description: PROFILES[id].description,
        version: PROFILES[id].version
      }));
    },
    get(id) {
      return PROFILES[id] || null;
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ArenaReskinProfiles = api;
}(typeof window !== 'undefined' ? window : globalThis));
