/* global window, document */
/**
 * Arena Shell theme engine (renderer-side, no build step).
 *
 * A theme is a bag of design tokens. Those tokens are turned into:
 *   1. CSS variables on the shell chrome (so the app itself restyles), and
 *   2. an injected stylesheet for the remote web app inside the <webview>.
 *
 * Themes can be extended/replaced by editing THEMES below — the whole UI is
 * driven by tokens, so a new look is ~12 numbers away.
 */
(function () {
  'use strict';

  const THEMES = {
    arena: {
      name: 'Arena Shell',
      blurb: 'Deep space navy with a violet glow. The default.',
      swatch: ['#0b0d14', '#7c6cf6'],
      tokens: {
        'bg-app': '#0a0b11',
        'bg-panel': '#10121b',
        'bg-elev': '#161926',
        'bg-input': '#0d0f17',
        'bg-hover': 'rgba(255,255,255,0.055)',
        'bg-active': 'rgba(124,108,246,0.16)',
        'border': 'rgba(255,255,255,0.08)',
        'border-strong': 'rgba(255,255,255,0.16)',
        'text': '#eef0f8',
        'text-dim': '#a6abc2',
        'text-mute': '#6e7490',
        'accent': '#7c6cf6',
        'accent-contrast': '#ffffff',
        'ok': '#4ade80',
        'warn': '#fbbf24',
        'bad': '#f87171',
        'font-ui': "'Inter', 'Segoe UI Variable', 'Segoe UI', system-ui, -apple-system, sans-serif",
        'font-mono': "'JetBrains Mono', 'Cascadia Code', Consolas, 'SF Mono', monospace",
        'font-weight': '450',
        'letter-spacing': '0',
        'titlebar-bg': 'rgba(10,11,17,0.82)',
        'sidebar-bg': 'rgba(13,15,23,0.72)',
        'shadow': '0 18px 50px rgba(0,0,0,0.55)',
        'radius': '10px'
      },
      page: { background: '#0a0b11', text: '#eef0f8', scheme: 'dark', font: null }
    },

    'claude-code': {
      name: 'Claude Code',
      blurb: 'Terminal-native: near-black, monospace, Claude terracotta prompts.',
      swatch: ['#111110', '#d97757'],
      tokens: {
        'bg-app': '#0f0f0e',
        'bg-panel': '#141413',
        'bg-elev': '#1b1b19',
        'bg-input': '#0b0b0a',
        'bg-hover': 'rgba(217,119,87,0.10)',
        'bg-active': 'rgba(217,119,87,0.18)',
        'border': 'rgba(255,255,255,0.09)',
        'border-strong': 'rgba(217,119,87,0.35)',
        'text': '#f0eee6',
        'text-dim': '#b8b5a8',
        'text-mute': '#7c7a6f',
        'accent': '#d97757',
        'accent-contrast': '#1a1410',
        'ok': '#7fb069',
        'warn': '#e0b341',
        'bad': '#e07a5f',
        'font-ui': "'JetBrains Mono', 'Cascadia Mono', 'SF Mono', Consolas, monospace",
        'font-mono': "'JetBrains Mono', 'Cascadia Mono', 'SF Mono', Consolas, monospace",
        'font-weight': '400',
        'letter-spacing': '-0.01em',
        'titlebar-bg': '#0f0f0e',
        'sidebar-bg': '#121211',
        'shadow': '0 0 0 1px rgba(217,119,87,0.18), 0 14px 40px rgba(0,0,0,0.7)',
        'radius': '6px'
      },
      page: { background: '#0f0f0e', text: '#f0eee6', scheme: 'dark', font: "'JetBrains Mono', Consolas, monospace" }
    },

    chatgpt: {
      name: 'ChatGPT',
      blurb: 'OpenAI style: flat #212121 canvas, sidebar rail, pill-shaped inputs.',
      swatch: ['#212121', '#10a37f'],
      tokens: {
        'bg-app': '#212121',
        'bg-panel': '#171717',
        'bg-elev': '#2a2a2a',
        'bg-input': '#2f2f2f',
        'bg-hover': 'rgba(255,255,255,0.07)',
        'bg-active': 'rgba(255,255,255,0.12)',
        'border': 'rgba(255,255,255,0.10)',
        'border-strong': 'rgba(255,255,255,0.22)',
        'text': '#ececec',
        'text-dim': '#b4b4b4',
        'text-mute': '#8e8e8e',
        'accent': '#10a37f',
        'accent-contrast': '#ffffff',
        'ok': '#10a37f',
        'warn': '#f5a623',
        'bad': '#ef4146',
        'font-ui': "'Söhne', 'Inter', 'Segoe UI', system-ui, sans-serif",
        'font-mono': "'Söhne Mono', 'JetBrains Mono', Consolas, monospace",
        'font-weight': '400',
        'letter-spacing': '0',
        'titlebar-bg': '#171717',
        'sidebar-bg': '#171717',
        'shadow': '0 12px 40px rgba(0,0,0,0.45)',
        'radius': '12px'
      },
      page: { background: '#212121', text: '#ececec', scheme: 'dark', font: null }
    },

    'claude-light': {
      name: 'Claude (Light)',
      blurb: 'Warm paper background, serif accents, terracotta buttons.',
      swatch: ['#faf9f5', '#c96442'],
      tokens: {
        'bg-app': '#faf9f5',
        'bg-panel': '#f3f1ea',
        'bg-elev': '#ffffff',
        'bg-input': '#ffffff',
        'bg-hover': 'rgba(0,0,0,0.05)',
        'bg-active': 'rgba(201,100,66,0.14)',
        'border': 'rgba(30,26,20,0.12)',
        'border-strong': 'rgba(30,26,20,0.24)',
        'text': '#1f1d1a',
        'text-dim': '#5c574e',
        'text-mute': '#8b857a',
        'accent': '#c96442',
        'accent-contrast': '#ffffff',
        'ok': '#3f8f5c',
        'warn': '#b07d10',
        'bad': '#c0392b',
        'font-ui': "'Inter', 'Segoe UI', system-ui, sans-serif",
        'font-mono': "'JetBrains Mono', Consolas, monospace",
        'font-weight': '400',
        'letter-spacing': '0',
        'titlebar-bg': '#f3f1ea',
        'sidebar-bg': '#f3f1ea',
        'shadow': '0 14px 40px rgba(60,50,35,0.14)',
        'radius': '10px'
      },
      page: { background: '#faf9f5', text: '#1f1d1a', scheme: 'light', font: null }
    },

    midnight: {
      name: 'Midnight Mono',
      blurb: 'Near-black, hairline borders, cyan accent. Maximum focus.',
      swatch: ['#000000', '#22d3ee'],
      tokens: {
        'bg-app': '#050506',
        'bg-panel': '#0a0a0c',
        'bg-elev': '#111114',
        'bg-input': '#08080a',
        'bg-hover': 'rgba(34,211,238,0.08)',
        'bg-active': 'rgba(34,211,238,0.16)',
        'border': 'rgba(255,255,255,0.07)',
        'border-strong': 'rgba(34,211,238,0.35)',
        'text': '#f5f7f8',
        'text-dim': '#9aa4ad',
        'text-mute': '#5f6a74',
        'accent': '#22d3ee',
        'accent-contrast': '#04181c',
        'ok': '#34d399',
        'warn': '#facc15',
        'bad': '#fb7185',
        'font-ui': "'Inter', system-ui, sans-serif",
        'font-mono': "'JetBrains Mono', Consolas, monospace",
        'font-weight': '400',
        'letter-spacing': '0',
        'titlebar-bg': 'rgba(5,5,6,0.9)',
        'sidebar-bg': 'rgba(10,10,12,0.8)',
        'shadow': '0 20px 60px rgba(0,0,0,0.75)',
        'radius': '8px'
      },
      page: { background: '#050506', text: '#f5f7f8', scheme: 'dark', font: null }
    }
  };

  const DENSITY = { compact: 0.86, cozy: 1, roomy: 1.14 };

  function hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex).trim());
    if (!m) return null;
    return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
  }

  function rgba(hex, alpha) {
    const c = hexToRgb(hex);
    if (!c) return `rgba(124,108,246,${alpha})`;
    return `rgba(${c.r},${c.g},${c.b},${alpha})`;
  }

  function themeFor(id) {
    return THEMES[id] || THEMES.arena;
  }

  /** Build the CSS custom properties for the shell chrome. */
  function tokens(settings) {
    const theme = themeFor(settings.theme);
    const t = { ...theme.tokens };

    if (settings.accent && hexToRgb(settings.accent)) {
      t.accent = settings.accent;
      t['bg-active'] = rgba(settings.accent, 0.16);
      t['bg-hover'] = rgba(settings.accent, 0.09);
      t['border-strong'] = rgba(settings.accent, 0.34);
    }
    if (settings.fontFamily) t['font-ui'] = settings.fontFamily;
    if (settings.monoFamily) t['font-mono'] = settings.monoFamily;

    const density = DENSITY[settings.density] || 1;
    t.radius = `${Math.round(settings.radius)}px`;
    t.scale = String((Number(settings.uiScale) || 1));
    t.row = `${Math.round(28 * density)}px`;
    t.gap = `${Math.round(8 * density)}px`;
    t['pad-x'] = `${Math.round(12 * density)}px`;
    t['pad-y'] = `${Math.round(7 * density)}px`;

    return t;
  }

  /** CSS variables -> inline style block for the shell. */
  function shellCss(settings) {
    const t = tokens(settings);
    const body = Object.keys(t)
      .map((k) => `  --${k}: ${t[k]};`)
      .join('\n');
    return `:root {\n${body}\n  --font-size: ${settings.fontSize}px;\n}`;
  }

  /**
   * CSS injected into the remote page.
   * `subtle` only touches neutral things (scrollbars, selection, fonts).
   * `aggressive` also forces backgrounds/text so a light site becomes dark.
   */
  function pageCss(settings) {
    const theme = themeFor(settings.theme);
    const t = tokens(settings);
    const p = theme.page;
    const level = settings.pageStyling || 'subtle';
    if (level === 'none') return '';

    const safe = `
      html { color-scheme: ${p.scheme}; }
      ::selection { background: ${rgba(t.accent, 0.35)} !important; }
      * { scrollbar-width: thin; scrollbar-color: ${rgba(t.accent, 0.45)} transparent; }
      ::-webkit-scrollbar { width: 10px; height: 10px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb {
        background: ${rgba(t.accent, 0.35)};
        border-radius: 8px;
        border: 2px solid transparent;
        background-clip: content-box;
      }
      ::-webkit-scrollbar-thumb:hover { background: ${rgba(t.accent, 0.6)}; background-clip: content-box; }
      ${p.font ? `body, input, textarea, button, select { font-family: ${p.font} !important; }` : ''}
      body { -webkit-font-smoothing: antialiased; }
    `;

    if (level === 'subtle') return safe;

    // aggressive: broad, deliberately blunt overrides
    return `${safe}
      html, body, #root, #__next, main {
        background-color: ${p.background} !important;
        color: ${p.text} !important;
      }
      div, section, article, aside, header, footer, nav, form, li, p, span, h1, h2, h3, h4, h5, h6, label {
        border-color: ${rgba(p.text, 0.12)} !important;
      }
      input, textarea, select, [contenteditable='true'] {
        background-color: ${rgba(p.text, 0.06)} !important;
        color: ${p.text} !important;
        border-color: ${rgba(p.text, 0.18)} !important;
      }
      a { color: ${t.accent} !important; }
      button { color: inherit; }
      ::placeholder { color: ${rgba(p.text, 0.45)} !important; }
    `;
  }

  function customCss(settings) {
    return settings.customCss || '';
  }

  window.ArenaThemes = {
    THEMES,
    themeFor,
    tokens,
    shellCss,
    pageCss,
    customCss,
    list() {
      return Object.keys(THEMES).map((id) => ({
        id,
        name: THEMES[id].name,
        blurb: THEMES[id].blurb,
        swatch: THEMES[id].swatch
      }));
    }
  };
})();
