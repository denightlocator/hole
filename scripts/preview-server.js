/**
 * Preview harness for Arena Shell.
 *
 * Runs the real ui/ folder in a normal browser with a stubbed `window.arena`
 * bridge, so the whole shell (themes, settings, sidebar, layouts) can be seen
 * and screenshotted without Electron. The <webview> is replaced by a plain
 * iframe of an offline demo page.
 *
 *   node scripts/preview-server.js        -> http://localhost:4600
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = Number(process.env.PORT || 4600);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json'
};

const fixture = fs.readFileSync(path.join(__dirname, 'fixtures', 'demo-page.html'));

function serve(file, res) {
  fs.readFile(path.join(ROOT, file), (err, buf) => {
    if (err) {
      res.writeHead(404).end('not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let p = url.pathname;

  // re-skin demo page (a realistic chat app to restyle)
  if (p === '/reskin-demo') {
    let html = fs.readFileSync(path.join(__dirname, 'fixtures', 'reskin-demo.html'), 'utf8');
    html = html.replace('</body>', `
  <script src="/reskin/engine.js"></script>
  <script src="/reskin/profiles.js"></script>
</body>`);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  // demo page for the "webview" iframe
  if (p === '/demo') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fixture);
    return;
  }

  // stub bridge
  if (p === '/preview-arena.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
    res.end(fs.readFileSync(path.join(__dirname, 'preview-arena.js')));
    return;
  }

  if (p === '/') {
    res.writeHead(302, { Location: '/ui/index.html' }).end();
    return;
  }

  if (p === '/ui/index.html' || p === '/ui/index-preview.html') {
    const demo = (new URL(req.url, 'http://x')).searchParams.get('demo') === 'reskin' ? '/reskin-demo' : '/demo';
    // inject the stub bridge + iframe swap
    let html = fs.readFileSync(path.join(ROOT, 'ui/index.html'), 'utf8');
    html = html
      .replace('<script src="themes.js"></script>', '<script src="/preview-arena.js"></script>\n  <script src="themes.js"></script>')
      .replace(/<webview[\s\S]*?<\/webview>/, `<iframe id="webview" src="${demo}" style="flex:1 1 auto;width:100%;height:100%;border:0;background:#000"></iframe>`);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  serve(p.replace(/^\//, ''), res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Arena Shell preview on http://0.0.0.0:${PORT}`);
});
