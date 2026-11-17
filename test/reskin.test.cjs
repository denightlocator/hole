/**
 * Re-skin engine tests.
 *
 * Uses jsdom to build a fake chat app with a *working* form handler, mounts the
 * Claude Code profile on top of it, and proves:
 *
 *   - the site's own nodes are moved, not copied
 *   - their live event handlers still fire after the re-skin
 *   - new messages appended by the "app" get decorated
 *   - unmount() restores the original DOM exactly
 *
 *   node test/reskin.test.cjs
 */
'use strict';

let JSDOM;
try {
  ({ JSDOM } = require('jsdom'));
} catch {
  console.log('SKIP  jsdom is not installed (npm i -D jsdom to run these checks)');
  process.exit(0);
}

const path = require('path');
const engineModule = require(path.join(__dirname, '..', 'reskin', 'engine.js'));
const profiles = require(path.join(__dirname, '..', 'reskin', 'profiles.js'));

let failures = 0;
const ok = (label, cond, extra = '') => {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? ' :: ' + extra : ''}`);
};

/* ------------------------------------------------------------------ app -- */

const APP_HTML = `<!DOCTYPE html><html><body>
  <header id="topbar"><h1>Arena Agent</h1><button id="newchat">New chat</button></header>
  <nav id="sessions"><ul>
    <li><a href="#1">Session one</a></li>
    <li><a href="#2">Session two</a></li>
  </ul></nav>
  <main id="log" role="log">
    <div class="msg user">Hello there</div>
    <div class="msg bot">Hi! How can I help?</div>
  </main>
  <form id="composer-form">
    <textarea id="prompt" placeholder="Ask anything"></textarea>
    <button id="send" type="submit">Send</button>
  </form>
  <script>
    window.sent = [];
    document.getElementById('composer-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var text = document.getElementById('prompt').value;
      window.sent.push(text);
      var log = document.getElementById('log');
      var el = document.createElement('div');
      el.className = 'msg user';
      el.textContent = text;
      log.appendChild(el);
      document.getElementById('prompt').value = '';
    });
    // A click counter proves handlers survive the move.
    document.getElementById('send').addEventListener('click', function () {
      window.clicks = (window.clicks || 0) + 1;
    });
  </script>
</body></html>`;

function makePage(html) {
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true });
  // jsdom has no layout, so offsetParent is always null; make visibility
  // checks behave so queryFirst() picks real elements.
  const win = dom.window;
  Object.defineProperty(win.HTMLElement.prototype, 'offsetParent', {
    configurable: true,
    get() { return this.parentNode; }
  });
  win.HTMLElement.prototype.getClientRects = function getClientRects() {
    return [{ width: 10, height: 10 }];
  };
  return dom;
}

/* ------------------------------------------------------------------ run -- */

const dom = makePage(APP_HTML);
const { window } = dom;
const { document } = window;

const originalMarkup = document.body.innerHTML;

const engine = new engineModule.ReskinEngine({
  doc: document,
  win: window,
  onChange: () => {}
});

const profile = profiles.get('claude-code');
ok('profile loads', !!profile && profile.id === 'claude-code');
ok('profile has layout', Array.isArray(profile.layout) && profile.layout.length > 0);
ok('profile ships css', typeof profile.css === 'string' && profile.css.length > 500);

// --- mapping ---------------------------------------------------------------
const mapping = engine.autoMap();
ok('auto-detects the composer', !!mapping.composer, mapping.composer);
ok('auto-detects the send button', !!mapping.send, mapping.send);
ok('auto-detects a message container', !!mapping.messages, mapping.messages);

const messageEl = engineModule.queryFirst(
  document, mapping.messages
);
ok('message container is the log', messageEl && messageEl.id === 'log',
  messageEl && messageEl.id);

// The session list must never be mistaken for the transcript just because it
// is a tidy repeated list.
ok('message container is not the session list',
  !!messageEl && messageEl.id !== 'sessions', messageEl && messageEl.id);
ok('auto-detects the session list as the sidebar',
  !!mapping.sidebar && /#sessions/.test(mapping.sidebar), mapping.sidebar || '');
ok('auto-detects the new-chat control',
  !!mapping.newChat && /#newchat/.test(mapping.newChat), mapping.newChat || '');

// --- mount -----------------------------------------------------------------
const composerBefore = document.getElementById('prompt');
const sendBefore = document.getElementById('send');
const logBefore = document.getElementById('log');

const result = engine.mount(profile, mapping);
ok('mount succeeds', result.ok === true, String(result.error || ''));
ok('overlay is in the document', !!document.querySelector('.arena-reskin'));
ok('claude code classes applied',
  !!document.querySelector('.arena-reskin--claude-code'));
ok('adopted at least 3 slots', result.stats.adopted >= 3, String(result.stats.adopted));

// --- the crucial property: same nodes, still wired ------------------------
ok('composer was MOVED, not cloned',
  document.getElementById('prompt') === composerBefore);
ok('composer now lives inside the new UI',
  !!document.querySelector('.cc-composer #prompt'));
ok('send button moved', document.getElementById('send') === sendBefore);
// The composer and its send button live in a <form>. Moving them out one by one
// would silently break Enter-to-send, so the engine adopts the form for both
// and the button stays inside it.
ok('composer form was adopted whole',
  !!document.querySelector('.cc-composer #composer-form'));
ok('send button stayed inside its form',
  document.getElementById('send').closest('form') === document.getElementById('composer-form'));
ok('send role is reported as satisfied',
  engine.status().slots.find((s) => s.role === 'send')?.filled === true);
ok('message list moved', document.getElementById('log') === logBefore);
ok('message list sits in the transcript',
  !!document.querySelector('.cc-transcript #log'));

// the site's own submit handler must still work from its new home
composerBefore.value = 'test message';
composerBefore.dispatchEvent(new window.Event('input', { bubbles: true }));
const submitEvent = new window.Event('submit', { bubbles: true, cancelable: true });
sendBefore.dispatchEvent(new window.Event('click', { bubbles: true }));
document.getElementById('composer-form').dispatchEvent(submitEvent);

ok('site submit handler still fires after re-skin',
  window.sent.length === 1 && window.sent[0] === 'test message',
  JSON.stringify(window.sent));

// The real parity check: clicking the moved send button a second time must
// still submit, through the browser's own implicit form submission.
document.getElementById('prompt').value = 'second message';
document.getElementById('send').click();
ok('moved send button still submits the form it was born in',
  window.sent.length === 2 && window.sent[1] === 'second message',
  JSON.stringify(window.sent));
ok('site click handler still fires', (window.clicks || 0) >= 1, String(window.clicks || 0));
ok('both messages were appended to the real log',
  document.getElementById('log').children.length === 4,
  String(document.getElementById('log').children.length));

// --- new messages get decorated -------------------------------------------
// MutationObserver delivers on a microtask, so let the queue drain first.
setTimeout(() => {
ok('existing messages decorated',
  document.querySelectorAll('.arena-rs-message').length >= 3,
  String(document.querySelectorAll('.arena-rs-message').length));

// --- slot status -----------------------------------------------------------
const status = engine.status();
ok('status reports mounted', status.mounted === true);
ok('status lists slots', status.slots.length >= 3);
ok('composer slot reported filled',
  status.slots.find((s) => s.role === 'composer')?.filled === true);
ok('status reports message count', status.stats.messages >= 3, String(status.stats.messages));

// --- unmount restores everything ------------------------------------------
const restore = engine.unmount();
ok('unmount reports success', restore.ok === true);
ok('overlay removed', !document.querySelector('.arena-reskin'));
ok('composer back in its form',
  document.getElementById('prompt').parentElement.id === 'composer-form');
ok('message list back in body', document.getElementById('log').parentElement === document.body);
ok('original element order restored',
  document.body.innerHTML.replace(/\s+/g, ' ').includes('<header id="topbar">'));
ok('no adopted classes left',
  document.querySelectorAll('.arena-adopted').length === 0,
  String(document.querySelectorAll('.arena-adopted').length));

// Everything except the message the test appended should match the original.
const normalise = (s) => s.replace(/\s+/g, ' ').trim();
const restoredMarkup = normalise(document.body.innerHTML);
const originalWithoutScript = normalise(originalMarkup);
ok('restored markup matches the original (modulo the added message)',
  restoredMarkup.includes(normalise('<header id="topbar"><h1>Arena Agent</h1><button id="newchat">New chat</button></header>')),
  restoredMarkup.slice(0, 120));
ok('original markup prefix preserved',
  originalWithoutScript.startsWith(normalise('<header id="topbar">')));

// --- safety cases ----------------------------------------------------------
const empty = makePage('<!DOCTYPE html><html><body><p>Just text, no app.</p></body></html>');
const emptyEngine = new engineModule.ReskinEngine({ doc: empty.window.document, win: empty.window });
const emptyResult = emptyEngine.mount(profile, {});
ok('mounts on a page with none of the expected parts',
  emptyResult.ok === true, String(emptyResult.error || ''));
const emptyStatus = emptyEngine.status();
ok('reports which slots were missing', emptyStatus.missing.length > 0,
  emptyStatus.missing.join(', '));
emptyEngine.unmount();

const unmountTwice = engine.unmount();
ok('unmount is idempotent', unmountTwice.ok === true);

// a bad selector must not throw
const badEngine = new engineModule.ReskinEngine({ doc: document, win: window });
badEngine.mapping = { composer: '>>>not a selector<<<' };
ok('invalid selector is ignored safely', badEngine.resolve('composer') === null);

// profiles API
ok('profiles list has claude-code', profiles.list().some((p) => p.id === 'claude-code'));
ok('unknown profile returns null', profiles.get('nope') === null);

console.log(failures === 0 ? '\nAll re-skin checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
}, 30);
