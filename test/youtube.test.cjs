/**
 * YouTube URL parsing + embed URL tests.
 *
 *   node test/youtube.test.cjs
 */
'use strict';

const yt = require('../electron/youtube');

let failures = 0;
const ok = (label, cond, extra = '') => {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? ' :: ' + extra : ''}`);
};

const ID = 'dQw4w9WgXcQ';

// --- video id extraction ---------------------------------------------------
ok('watch url', yt.parseVideoId(`https://www.youtube.com/watch?v=${ID}`) === ID);
ok('watch url with extras',
  yt.parseVideoId(`https://www.youtube.com/watch?v=${ID}&list=PL123&index=4`) === ID);
ok('youtu.be short', yt.parseVideoId(`https://youtu.be/${ID}`) === ID);
ok('youtu.be with time', yt.parseVideoId(`https://youtu.be/${ID}?t=42`) === ID);
ok('shorts', yt.parseVideoId(`https://www.youtube.com/shorts/${ID}`) === ID);
ok('embed', yt.parseVideoId(`https://www.youtube.com/embed/${ID}`) === ID);
ok('live', yt.parseVideoId(`https://www.youtube.com/live/${ID}`) === ID);
ok('m.youtube', yt.parseVideoId(`https://m.youtube.com/watch?v=${ID}`) === ID);
ok('music.youtube', yt.parseVideoId(`https://music.youtube.com/watch?v=${ID}`) === ID);

// --- must NOT false-positive ----------------------------------------------
ok('channel page has no video', yt.parseVideoId('https://www.youtube.com/@somechannel') === null);
ok('home page has no video', yt.parseVideoId('https://www.youtube.com/') === null);
ok('playlist has no video', yt.parseVideoId('https://www.youtube.com/playlist?list=PL123') === null);
ok('bad id length rejected',
  yt.parseVideoId('https://www.youtube.com/watch?v=tooshort') === null);
ok('non-youtube rejected', yt.parseVideoId(`https://vimeo.com/${ID}`) === null);
ok('garbage rejected', yt.parseVideoId('not a url') === null);
ok('empty rejected', yt.parseVideoId('') === null);

// --- start time ------------------------------------------------------------
ok('numeric t', yt.parseStartTime('https://youtu.be/x?t=90') === 90);
ok('start= param', yt.parseStartTime('https://www.youtube.com/watch?v=x&start=15') === 15);
ok('1m30s format', yt.parseStartTime('https://youtu.be/x?t=1m30s') === 90);
ok('1h2m3s format', yt.parseStartTime('https://youtu.be/x?t=1h2m3s') === 3723);
ok('no time is 0', yt.parseStartTime('https://youtu.be/x') === 0);

// --- isYouTube -------------------------------------------------------------
ok('isYouTube true', yt.isYouTube('https://www.youtube.com/watch?v=x'));
ok('isYouTube false', !yt.isYouTube('https://example.com'));
ok('isYouTube handles garbage', !yt.isYouTube('nope'));

// --- embed url -------------------------------------------------------------
const emb = yt.embedUrl(ID, { start: 30 });
const parsed = new URL(emb);
ok('embed points at /embed/<id>', parsed.pathname === `/embed/${ID}`);
ok('embed has autoplay', parsed.searchParams.get('autoplay') === '1');
ok('embed has start', parsed.searchParams.get('start') === '30');
ok('embed enables js api', parsed.searchParams.get('enablejsapi') === '1');
ok('embed disables related videos', parsed.searchParams.get('rel') === '0');
ok('embed includes origin', parsed.searchParams.get('origin') === 'https://www.youtube.com');
ok('embed without id is empty', yt.embedUrl(null) === '');
ok('embed can omit autoplay',
  new URL(yt.embedUrl(ID, { autoplay: 0 })).searchParams.get('autoplay') === '0');

// --- injected assets sanity ------------------------------------------------
ok('page css has the popout class', yt.PAGE_CSS.includes('.arena-yt-popout'));
ok('page css hides shorts', /reel-shelf-renderer/.test(yt.PAGE_CSS));
ok('page script posts popout events', yt.PAGE_SCRIPT.includes("post('yt-popout'"));
ok('page script is an IIFE', /^\(function \(\) {/m.test(yt.PAGE_SCRIPT.trim()));
ok('page script does not use require', !yt.PAGE_SCRIPT.includes('require('));

// The injected script must be syntactically valid JavaScript.
try {
  new Function(yt.PAGE_SCRIPT);
  ok('page script parses', true);
} catch (err) {
  ok('page script parses', false, err.message);
}

console.log(failures === 0 ? '\nAll youtube checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
