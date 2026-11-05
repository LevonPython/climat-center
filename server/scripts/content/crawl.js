// Downloads climatecentr.ru pages into server/content/raw, one request every 10 seconds as its robots.txt asks.
// Safe to stop and rerun: pages already downloaded are skipped.
const fs = require('fs');
const path = require('path');

const ORIGIN = 'https://climatecentr.ru';
const USER_AGENT = 'climat-center-content-import';
const DELAY_MS = 10000;
const MAX_PAGES = 250;
const RAW_DIR = path.join(__dirname, '..', '..', 'content', 'raw');
const PAGES_DIR = path.join(RAW_DIR, 'pages');
const MANIFEST = path.join(RAW_DIR, 'manifest.json');
// Not in the sitemap, but linked from the site.
const EXTRA_PATHS = ['/', '/nashi-raboty'];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function get(url) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, redirect: 'follow' });
  return { status: res.status, finalUrl: res.url, text: await res.text() };
}

function parseDisallowed(robots) {
  const rules = [];
  let applies = false;
  for (const raw of robots.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const [key, ...rest] = line.split(':');
    const value = rest.join(':').trim();
    if (/^user-agent$/i.test(key)) applies = value === '*';
    if (applies && /^disallow$/i.test(key) && value) rules.push(value);
  }
  return rules;
}

function fileFor(urlPath) {
  const name = urlPath === '/' ? 'home' : urlPath.replace(/^\//, '').replace(/[^a-z0-9-]+/gi, '__');
  return `${name}.html`;
}

function findLinks(html) {
  const found = new Set();
  for (const match of html.matchAll(/href="(?:https?:\/\/(?:www\.)?climatecentr\.ru)?(\/[^"#?]*)"/g)) {
    const link = match[1];
    if (!/\.[a-z0-9]{2,5}$/i.test(link) && !link.startsWith('//')) found.add(link.length > 1 ? link.replace(/\/$/, '') : link);
  }
  return found;
}

async function main() {
  fs.mkdirSync(PAGES_DIR, { recursive: true });
  const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};

  const robots = await get(`${ORIGIN}/robots.txt`);
  const disallowed = parseDisallowed(robots.text);
  const allowed = (urlPath) => !disallowed.some((rule) => urlPath.startsWith(rule.replace(/\*.*$/, '')));
  await wait(DELAY_MS);

  const sitemap = await get(`${ORIGIN}/sitemap.xml`);
  fs.writeFileSync(path.join(RAW_DIR, 'sitemap.xml'), sitemap.text);
  const fromSitemap = [...sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname);
  await wait(DELAY_MS);

  const queue = [...new Set([...EXTRA_PATHS, ...fromSitemap])];
  const seen = new Set(queue);

  for (const urlPath of queue) {
    if (Object.keys(manifest).length >= MAX_PAGES) break;
    if (!allowed(urlPath)) {
      manifest[urlPath] = { skipped: 'robots' };
      continue;
    }

    const file = fileFor(urlPath);
    const target = path.join(PAGES_DIR, file);
    let html;
    if (manifest[urlPath]?.status === 200 && fs.existsSync(target)) {
      html = fs.readFileSync(target, 'utf8');
    } else {
      const page = await get(`${ORIGIN}${urlPath}`);
      manifest[urlPath] = { status: page.status, finalUrl: page.finalUrl, file, inSitemap: fromSitemap.includes(urlPath) };
      fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));
      console.log(`${page.status} ${urlPath}`);
      if (page.status === 200) fs.writeFileSync(target, page.text);
      html = page.status === 200 ? page.text : '';
      await wait(DELAY_MS);
    }

    for (const link of findLinks(html)) {
      if (!seen.has(link)) {
        seen.add(link);
        queue.push(link);
      }
    }
  }

  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));
  console.log(`Done: ${Object.keys(manifest).length} paths.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
