/**
 * Dev-only: take screenshots of the shell preview with headless Chromium.
 * Not shipped with the app and not needed to run it.
 *
 *   node scripts/screenshot.js [outDir]
 */
'use strict';

const path = require('path');
const fs = require('fs');

const OUT = path.resolve(process.argv[2] || path.join(__dirname, '..', 'docs', 'screens'));
const BASE = process.env.PREVIEW_URL || 'http://127.0.0.1:4600/';

async function main() {
  // Optional deps, loaded lazily so they never block the app itself.
  let chromium;
  let puppeteer;
  try {
    const mod = require('@sparticuz/chromium');
    chromium = mod.default || mod;
    puppeteer = require('puppeteer-core');
  } catch {
    console.error('Install puppeteer-core and @sparticuz/chromium to take screenshots.');
    process.exit(1);
  }

  fs.mkdirSync(OUT, { recursive: true });
  const executablePath = await chromium.executablePath();
  const browser = await puppeteer.launch({
    executablePath,
    args: [...chromium.args, '--no-sandbox', '--font-render-hinting=none'],
    headless: 'shell',
    defaultViewport: { width: 1400, height: 900, deviceScaleFactor: 1 }
  });

  const page = await browser.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle2' });
  await page.waitForFunction('window.arena && document.querySelector("#themeGrid")');
  await new Promise((r) => setTimeout(r, 700));

  const shot = async (name) => {
    await page.screenshot({ path: path.join(OUT, `${name}.png`) });
    console.log('wrote', name);
  };

  await shot('01-default-arena');

  const themes = [
    ['claude-code', '02-theme-claude-code'],
    ['chatgpt', '03-theme-chatgpt'],
    ['claude-light', '04-theme-claude-light'],
    ['midnight', '05-theme-midnight']
  ];

  for (const [id, name] of themes) {
    await page.evaluate((tid) => window.arena.settings.set({ theme: tid, accent: '' }), id);
    await new Promise((r) => setTimeout(r, 450));
    await shot(name);
  }

  // settings page, appearance tab
  await page.evaluate(() => window.arena.settings.set({ theme: 'arena' }));
  await new Promise((r) => setTimeout(r, 350));
  await page.click('#btnSettings');
  await new Promise((r) => setTimeout(r, 450));
  await shot('06-settings-appearance');

  await page.click('.tab[data-tab="startup"]');
  await new Promise((r) => setTimeout(r, 400));
  await shot('07-settings-startup');

  await page.click('.tab[data-tab="page"]');
  await new Promise((r) => setTimeout(r, 350));
  await shot('08-settings-webapp');

  // console drawer over the web view
  await page.click('#btnCloseSettings');
  await new Promise((r) => setTimeout(r, 250));
  await page.click('#btnConsole');
  await new Promise((r) => setTimeout(r, 450));
  await shot('09-console-drawer');

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
