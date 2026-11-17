'use strict';

/**
 * Ad / tracker blocker.
 *
 * Deliberately dependency-free and explainable: a hostname blocklist plus a
 * small number of URL patterns, applied through Electron's webRequest API on
 * the browsing session. No remote lists are fetched automatically — the seed
 * list below ships with the app, and users can paste extra rules in settings.
 *
 * Two independent switches:
 *   - blockAds     : known ad-serving domains
 *   - blockTrackers: analytics / telemetry / fingerprinting endpoints
 *
 * Sites can be allowlisted per-hostname, and blocked requests are counted so
 * the UI can show something real instead of a fake "you saved 3 seconds" stat.
 */

// --- seed lists ------------------------------------------------------------
// Kept as plain hostnames so matching is a Set lookup on the hot path.

const AD_HOSTS = [
  // Google ads
  'doubleclick.net', 'googleadservices.com', 'googlesyndication.com',
  'adservice.google.com', 'pagead2.googlesyndication.com', 'tpc.googlesyndication.com',
  'adclick.g.doubleclick.net', 'securepubads.g.doubleclick.net',
  // Major ad networks / SSPs
  'adnxs.com', 'adsrvr.org', 'rubiconproject.com', 'pubmatic.com', 'openx.net',
  'casalemedia.com', 'criteo.com', 'criteo.net', 'smartadserver.com', 'teads.tv',
  'outbrain.com', 'taboola.com', 'revcontent.com', 'mgid.com', 'zedo.com',
  'adroll.com', 'bidswitch.net', 'sharethrough.com', 'spotxchange.com',
  'yieldmo.com', 'indexww.com', 'sovrn.com', 'gumgum.com', 'triplelift.com',
  '33across.com', 'amazon-adsystem.com', 'moatads.com', 'adform.net',
  'advertising.com', 'contextweb.com', 'emxdgt.com', 'improvedigital.com',
  'lijit.com', 'loopme.me', 'nativo.com', 'onetag-sys.com', 'richaudience.com',
  'seedtag.com', 'smaato.net', 'stickyadstv.com', 'synacor.com', 'vidoomy.com',
  'yieldlab.net', 'adcolony.com', 'applovin.com', 'chartboost.com',
  'inmobi.com', 'ironsrc.com', 'unityads.unity3d.com', 'vungle.com',
  // Pop / interstitial
  'popads.net', 'popcash.net', 'propellerads.com', 'adcash.com',
  'exoclick.com', 'juicyads.com', 'trafficjunky.com',
  // Common ad containers served from otherwise-legit CDNs
  'ads.yahoo.com', 'adserver.yahoo.com', 'ads.linkedin.com', 'ads.pinterest.com',
  'ads.reddit.com', 'ads.tiktok.com', 'ads.twitter.com', 'ads.youtube.com',
  'ads.yap.yahoo.com', 'ads.spotify.com'
];

const TRACKER_HOSTS = [
  // Analytics / telemetry
  'google-analytics.com', 'analytics.google.com', 'ssl.google-analytics.com',
  'googletagmanager.com', 'googletagservices.com', 'stats.g.doubleclick.net',
  'segment.io', 'segment.com', 'api.segment.io', 'mixpanel.com', 'api.mixpanel.com',
  'amplitude.com', 'api.amplitude.com', 'heap.io', 'heapanalytics.com',
  'fullstory.com', 'hotjar.com', 'static.hotjar.com', 'mouseflow.com',
  'crazyegg.com', 'luckyorange.com', 'inspectlet.com', 'smartlook.com',
  'clarity.ms', 'newrelic.com', 'nr-data.net', 'sentry-cdn.com',
  'datadoghq-browser-agent.com', 'bugsnag.com', 'rollbar.com',
  // Tag managers / session replay
  'quantserve.com', 'quantcount.com', 'scorecardresearch.com', 'comscore.com',
  'chartbeat.com', 'chartbeat.net', 'parsely.com', 'permutive.com',
  'krxd.net', 'demdex.net', 'omtrdc.net', 'everesttech.net', 'adobedtm.com',
  // Social pixels
  'connect.facebook.net', 'facebook.net', 'analytics.tiktok.com',
  'analytics.twitter.com', 'static.ads-twitter.com', 'snap.licdn.com',
  'ct.pinterest.com', 'bat.bing.com', 'clarity.ms',
  // Fingerprinting-adjacent
  'fingerprintjs.com', 'fpjs.io', 'fpapi.io', 'deviceatlas.com',
  // Affiliate / click tracking
  'doubleclick.com', 'linksynergy.com', 'impactradius-event.com',
  'awin1.com', 'prf.hn', 'clickbank.net'
];

// URL fragments that are almost always ads even on a clean hostname.
const PATH_PATTERNS = [
  /\/pagead\//i,
  /\/adserver\//i,
  /\/adsystem\//i,
  /\/ads?[/_-](banner|slot|frame|serve|delivery)/i,
  /[?&](utm_source|utm_medium|utm_campaign)=/i, // only used for the "trackers" switch
  /\/beacon(\?|$)/i,
  /\/collect(\?|$)/i,
  /\/track(ing)?(\?|$)/i,
  /\/pixel\.(gif|png)/i,
  /\/analytics\.js$/i
];

// Cosmetic rules: hide leftover empty ad containers.
const COSMETIC_CSS = `
  ins.adsbygoogle, .adsbygoogle, .ad-container, .ad-wrapper, .ad-slot,
  .advertisement, .advert, [id^="google_ads"], [id^="div-gpt-ad"],
  [id^="taboola"], [id^="outbrain"], [class*="sponsored-"],
  iframe[src*="doubleclick.net"], iframe[src*="/ads/"],
  [data-ad-slot], [data-ad-client] { display: none !important; }
`.replace(/\s+/g, ' ').trim();

function normalizeHost(host) {
  return String(host || '').toLowerCase().replace(/^\.+/, '').replace(/\.+$/, '');
}

/** True when `hostname` equals `entry` or is a subdomain of it. */
function hostMatches(hostname, entry) {
  const h = normalizeHost(hostname);
  const e = normalizeHost(entry);
  if (!h || !e) return false;
  return h === e || h.endsWith('.' + e);
}

class AdBlocker {
  /**
   * @param {Electron.Session} browserSession session the webviews use
   * @param {object} opts { enabled, blockAds, blockTrackers, cosmetic, onUpdate }
   */
  constructor(browserSession, opts = {}) {
    this.session = browserSession;
    this.enabled = opts.enabled !== false;
    this.blockAds = opts.blockAds !== false;
    this.blockTrackers = opts.blockTrackers !== false;
    this.cosmetic = opts.cosmetic !== false;
    this.onUpdate = opts.onUpdate || (() => {});
    this.userRules = [];
    this.allowlist = new Set();
    this.stats = { blocked: 0, byHost: new Map(), since: Date.now() };
    this.listener = null;
    this.ads = new Set(AD_HOSTS.map(normalizeHost));
    this.trackers = new Set(TRACKER_HOSTS.map(normalizeHost));

    // Constructor options are a full configuration, not just switches.
    if (Array.isArray(opts.allowlist)) this.allowlist = new Set(opts.allowlist.map(normalizeHost));
    if (Array.isArray(opts.rules)) this.userRules = opts.rules.filter(Boolean);

    this._attachIfNeeded();
  }

  configure(patch = {}) {
    if ('enabled' in patch) this.enabled = !!patch.enabled;
    if ('blockAds' in patch) this.blockAds = !!patch.blockAds;
    if ('blockTrackers' in patch) this.blockTrackers = !!patch.blockTrackers;
    if ('cosmetic' in patch) this.cosmetic = !!patch.cosmetic;
    if (Array.isArray(patch.allowlist)) this.allowlist = new Set(patch.allowlist.map(normalizeHost));
    if (Array.isArray(patch.rules)) this.userRules = patch.rules.filter(Boolean);
    this._attachIfNeeded();
  }

  /** Should this single request be cancelled? Pure function — unit tested. */
  shouldBlock(rawUrl, resourceType, initiatorHost) {
    if (!this.enabled) return false;
    if (resourceType === 'mainFrame') return false; // never break navigation
    if (initiatorHost && this.isAllowlisted(initiatorHost)) return false;

    let url;
    try {
      url = new URL(rawUrl);
    } catch {
      return false;
    }
    if (!/^https?:$/.test(url.protocol)) return false;

    const host = normalizeHost(url.hostname);
    if (this.isAllowlisted(host)) return false;

    // Explicit user rules win over everything (both allow and block).
    for (const rule of this.userRules) {
      const r = String(rule).trim();
      if (!r || r.startsWith('#')) continue;
      const negate = r.startsWith('@@');
      const body = negate ? r.slice(2) : r;
      if (!body) continue;
      let hit = false;
      try {
        hit = body.startsWith('re:')
          ? new RegExp(body.slice(3), 'i').test(rawUrl)
          : url.hostname.toLowerCase().includes(body.toLowerCase().replace(/^\*\./, ''));
      } catch {
        hit = false;
      }
      if (hit) return !negate;
    }

    if (this.blockAds) {
      for (const entry of this.ads) {
        if (hostMatches(host, entry)) return true;
      }
    }

    if (this.blockTrackers) {
      for (const entry of this.trackers) {
        if (hostMatches(host, entry)) return true;
      }
    }

    // Path heuristics: only for ads, and never for documents the user opened.
    if (this.blockAds && (resourceType === 'image' || resourceType === 'script' ||
        resourceType === 'xhr' || resourceType === 'subFrame' || resourceType === 'other')) {
      for (const pattern of PATH_PATTERNS) {
        // utm_* only counts as tracking, not as an ad
        if (pattern.source.includes('utm_source')) continue;
        if (pattern.test(url.pathname + url.search)) return true;
      }
    }

    return false;
  }

  isAllowlisted(hostname) {
    for (const entry of this.allowlist) {
      if (hostMatches(hostname, entry)) return true;
    }
    return false;
  }

  _attachIfNeeded() {
    if (!this.session) return;
    if (this.listener) return;
    this.listener = (details, callback) => {
      try {
        const initiator = details.initiator || details.referrer || '';
        const initiatorHost = initiator ? new URL(initiator).hostname : '';
        if (this.shouldBlock(details.url, details.resourceType, initiatorHost)) {
          this._record(details.url);
          callback({ cancel: true });
          return;
        }
      } catch {
        // never let the blocker throw into the network stack
      }
      callback({ cancel: false });
    };
    this.session.webRequest.onBeforeRequest({ urls: ['<all_urls>'] }, this.listener);
  }

  _record(url) {
    this.stats.blocked += 1;
    let host = '';
    try {
      host = new URL(url).hostname;
    } catch {
      host = url.slice(0, 40);
    }
    this.stats.byHost.set(host, (this.stats.byHost.get(host) || 0) + 1);
    this._emitSoon();
  }

  _emitSoon() {
    if (this._emitTimer) return;
    this._emitTimer = setTimeout(() => {
      this._emitTimer = null;
      this.onUpdate(this.summary());
    }, 350);
  }

  summary(topN = 8) {
    const top = [...this.stats.byHost.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([host, count]) => ({ host, count }));
    return {
      enabled: this.enabled,
      blockAds: this.blockAds,
      blockTrackers: this.blockTrackers,
      cosmetic: this.cosmetic,
      blocked: this.stats.blocked,
      since: this.stats.since,
      top,
      allowlist: [...this.allowlist],
      rules: this.userRules,
      cosmeticCss: this.cosmetic ? COSMETIC_CSS : ''
    };
  }

  resetStats() {
    this.stats = { blocked: 0, byHost: new Map(), since: Date.now() };
    this.onUpdate(this.summary());
  }
}

module.exports = { AdBlocker, AD_HOSTS, TRACKER_HOSTS, COSMETIC_CSS, hostMatches, normalizeHost };
