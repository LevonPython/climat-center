// Downloads the stylesheets and images the crawled pages use, one request every 10 seconds as robots.txt asks.
// Safe to stop and rerun: files already downloaded are skipped.
const fs = require('fs');
const path = require('path');

const ORIGIN = 'https://climatecentr.ru';
const USER_AGENT = 'climat-center-content-import';
const DELAY_MS = 10000;
const RAW_DIR = path.join(__dirname, '..', '..', 'content', 'raw');
const PAGES_DIR = path.join(RAW_DIR, 'pages');
const FILES_DIR = path.join(RAW_DIR, 'files');
const CITY_PAGE = /^(krasnogorsk|himki|lubertsy|mytishi|odintsovo)/;
const IMAGE_FILE = /\.(jpe?g|png|webp|gif|svg|avif)$/i;
// Tracking pixels, Russian payment logos and messenger icons that aren't copied.
const SKIPPED = /(paysystems|mail\.ru|yandex|google|gstatic|top-fwz|max-|\/max\.)/i;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function toLocalPath(raw, base) {
  try {
    const url = new URL(raw.replace(/&amp;/g, '&'), base);
    if (!/(^|\.)climatecentr\.ru$/.test(url.hostname)) return null;
    return decodeURIComponent(url.pathname);
  } catch {
    return null;
  }
}

function targetFor(assetPath) {
  return path.join(FILES_DIR, assetPath.replace(/^\/+/, ''));
}

async function download(assetPath) {
  const target = targetFor(assetPath);
  if (fs.existsSync(target)) return { skipped: true, target };
  const res = await fetch(`${ORIGIN}${encodeURI(assetPath)}`, { headers: { 'User-Agent': USER_AGENT } });
  if (res.status !== 200) {
    console.log(`${res.status} ${assetPath}`);
    return { failed: true, target };
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, Buffer.from(await res.arrayBuffer()));
  console.log(`200 ${assetPath}`);
  return { target };
}

function collectFromPages() {
  const sheets = new Set();
  const images = new Set();
  for (const name of fs.readdirSync(PAGES_DIR)) {
    if (CITY_PAGE.test(name) && name !== 'krasnogorsk.html') continue;
    const html = fs.readFileSync(path.join(PAGES_DIR, name), 'utf8');
    for (const match of html.matchAll(/<link[^>]+href="([^"]+\.css[^"]*)"/g)) {
      const local = toLocalPath(match[1], ORIGIN);
      if (local) sheets.add(local);
    }
    for (const match of html.matchAll(/@import url\("([^"]+\.css[^"]*)"\)/g)) {
      const local = toLocalPath(match[1], ORIGIN);
      if (local) sheets.add(local);
    }
    for (const match of html.matchAll(/(?:src|href|data-src)="([^"]+)"/g)) {
      const local = toLocalPath(match[1], ORIGIN);
      if (local && IMAGE_FILE.test(local) && !SKIPPED.test(local)) images.add(local);
    }
  }
  return { sheets, images };
}

async function main() {
  fs.mkdirSync(FILES_DIR, { recursive: true });
  const { sheets, images } = collectFromPages();
  console.log(`${sheets.size} stylesheets, ${images.size} images in pages`);

  for (const sheet of sheets) {
    const { skipped, failed, target } = await download(sheet);
    if (!skipped) await wait(DELAY_MS);
    if (failed) continue;
    for (const match of fs.readFileSync(target, 'utf8').matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
      const local = toLocalPath(match[1], `${ORIGIN}${sheet}`);
      if (local && /^\/sites\/(all\/themes|default\/files)/.test(local) && IMAGE_FILE.test(local) && !SKIPPED.test(local)) images.add(local);
    }
  }

  console.log(`${images.size} images in total`);
  fs.writeFileSync(path.join(RAW_DIR, 'assets.json'), JSON.stringify({ sheets: [...sheets], images: [...images] }, null, 1));

  for (const image of images) {
    const { skipped } = await download(image);
    if (!skipped) await wait(DELAY_MS);
  }
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
