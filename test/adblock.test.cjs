/**
 * Ad-blocker logic tests. No Electron needed — the matcher is pure.
 *
 *   node test/adblock.test.cjs
 */
'use strict';

const { AdBlocker, hostMatches, normalizeHost } = require('../electron/adblock');

let failures = 0;
const ok = (label, cond, extra = '') => {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? ' :: ' + extra : ''}`);
};

// A minimal stand-in for Electron's session.webRequest.
function fakeSession() {
  return {
    webRequest: {
      onBeforeRequest(_filter, listener) {
        fakeSession.listener = listener;
      }
    }
  };
}

const block = new AdBlocker(fakeSession(), {});

// --- hostname matching -----------------------------------------------------
ok('exact host matches', hostMatches('doubleclick.net', 'doubleclick.net'));
ok('subdomain matches', hostMatches('ad.click.doubleclick.net', 'doubleclick.net'));
ok('lookalike does NOT match', !hostMatches('notdoubleclick.net', 'doubleclick.net'));
ok('suffix trick does NOT match', !hostMatches('doubleclick.net.evil.com', 'doubleclick.net'));
ok('normalizes leading dot', normalizeHost('.Example.COM') === 'example.com');

// --- core decisions --------------------------------------------------------
ok('blocks doubleclick image',
  block.shouldBlock('https://ad.doubleclick.net/pixel.gif', 'image', 'news.example'));
ok('blocks google-analytics script',
  block.shouldBlock('https://www.google-analytics.com/analytics.js', 'script', 'example.com'));
ok('blocks known ad path',
  block.shouldBlock('https://cdn.example.com/pagead/show_ads.js', 'script', 'example.com'));
ok('allows ordinary image',
  !block.shouldBlock('https://cdn.example.com/logo.png', 'image', 'example.com'));
ok('allows api call',
  !block.shouldBlock('https://api.example.com/v1/data', 'xhr', 'example.com'));

// --- safety: never break the page the user asked for ----------------------
ok('never blocks main frame (even if ad host)',
  !block.shouldBlock('https://doubleclick.net/', 'mainFrame', ''));
ok('allows non-http schemes', !block.shouldBlock('file:///etc/passwd', 'script', ''));

// --- allowlist -------------------------------------------------------------
const allowed = new AdBlocker(fakeSession(), { allowlist: ['news.example'] });
ok('allowlisted initiator disables blocking on that page',
  !allowed.shouldBlock('https://ad.doubleclick.net/x.gif', 'image', 'news.example'));
ok('still blocks elsewhere',
  allowed.shouldBlock('https://ad.doubleclick.net/x.gif', 'image', 'other.example'));

// --- user rules ------------------------------------------------------------
const ruled = new AdBlocker(fakeSession(), {
  rules: ['tracker.example', '@@ads.example']
});
ok('user rule blocks a custom host',
  ruled.shouldBlock('https://a.tracker.example/t.gif', 'image', 'site.example'));
ok('user @@ rule allows its host',
  !ruled.shouldBlock('https://ads.example/ad.gif', 'image', 'site.example'));
ok('regex user rule works',
  new AdBlocker(fakeSession(), { rules: ['re:\\/promo\\/banner'] })
    .shouldBlock('https://cdn.example/promo/banner.png', 'image', 'site.example'));

// --- switches --------------------------------------------------------------
ok('disabled blocks nothing',
  !new AdBlocker(fakeSession(), { enabled: false })
    .shouldBlock('https://ad.doubleclick.net/x.gif', 'image', 'site.example'));
ok('ads-off still blocks trackers',
  new AdBlocker(fakeSession(), { blockAds: false })
    .shouldBlock('https://www.google-analytics.com/analytics.js', 'script', 's.example'));
ok('trackers-off still blocks ads',
  new AdBlocker(fakeSession(), { blockTrackers: false })
    .shouldBlock('https://ad.doubleclick.net/x.gif', 'image', 's.example'));

// --- stats -----------------------------------------------------------------
const counting = new AdBlocker(fakeSession(), {});
counting.shouldBlock('https://ad.doubleclick.net/a.gif', 'image', 's');
counting._record('https://ad.doubleclick.net/a.gif');
counting._record('https://www.google-analytics.com/analytics.js');
const s = counting.summary();
ok('counts blocked requests', s.blocked === 2, String(s.blocked));
ok('reports top hosts', s.top.length === 2 && typeof s.top[0].host === 'string');
ok('cosmetic css included when enabled', s.cosmeticCss.length > 0);
ok('cosmetic css omitted when disabled',
  new AdBlocker(fakeSession(), { cosmetic: false }).summary().cosmeticCss === '');

counting.resetStats();
ok('resetStats zeroes counts', counting.summary().blocked === 0);

// --- the listener wiring ---------------------------------------------------
let cancelled = null;
const wired = new AdBlocker(fakeSession(), {});
fakeSession.listener(
  { url: 'https://ad.doubleclick.net/p.gif', resourceType: 'image', initiator: 'https://site.example' },
  (r) => { cancelled = r.cancel; }
);
ok('listener cancels an ad request', cancelled === true);

fakeSession.listener(
  { url: 'https://site.example/logo.png', resourceType: 'image', initiator: 'https://site.example' },
  (r) => { cancelled = r.cancel; }
);
ok('listener allows a normal request', cancelled === false);

// A malformed request must not throw.
fakeSession.listener({ url: 'not a url', resourceType: 'other' }, (r) => { cancelled = r.cancel; });
ok('malformed url is allowed, not thrown', cancelled === false);

console.log(failures === 0 ? '\nAll ad-block checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
