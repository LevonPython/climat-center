import type { NextApiRequest, NextApiResponse } from 'next';
import { DEFAULT_LOCALE, LOCALES } from '../../lib/seo';

type RevalidateEvent = 'content' | 'services';
type Body = { event?: RevalidateEvent; paths?: unknown };

const LOCALE_PREFIXES = LOCALES.map((locale) => (locale === DEFAULT_LOCALE ? '' : `/${locale}`));
const PATH_PATTERN = /^\/[a-z0-9/-]*$/;
const MAX_PATHS = 20;

function localizePath(basePath: string, localePrefix: string) {
  if (!localePrefix) return basePath;
  if (basePath === '/') return localePrefix;
  return `${localePrefix}${basePath}`;
}

function basePathsForEvent(event: RevalidateEvent): string[] {
  return event === 'content' ? ['/'] : ['/', '/uslugi/uslugi-i-servis', '/uslugi/neispravnosti'];
}

function localizePaths(basePaths: string[]): string[] {
  const out: string[] = [];
  for (const p of basePaths) {
    for (const prefix of LOCALE_PREFIXES) {
      out.push(localizePath(p, prefix));
    }
  }
  return out;
}

function isValidPathList(paths: unknown): paths is string[] {
  return (
    Array.isArray(paths) &&
    paths.length > 0 &&
    paths.length <= MAX_PATHS &&
    paths.every((p) => typeof p === 'string' && PATH_PATTERN.test(p))
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: { message: 'Method Not Allowed' } });
  }

  const secret = req.query.secret;
  if (typeof secret !== 'string' || secret !== process.env.REVALIDATE_SECRET) {
    return res.status(401).json({ ok: false, error: { message: 'Unauthorized' } });
  }

  let body: Body = {};
  try {
    body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as Body;
  } catch {
    return res.status(400).json({ ok: false, error: { message: 'Invalid JSON body' } });
  }

  const event = body?.event;
  const requestedPaths = body?.paths;
  let paths: string[];
  if (isValidPathList(requestedPaths)) {
    paths = localizePaths(requestedPaths);
  } else if (event === 'content' || event === 'services') {
    paths = localizePaths(basePathsForEvent(event));
  } else {
    return res.status(400).json({ ok: false, error: { message: 'Invalid event' } });
  }

  const revalidated: string[] = [];
  const failed: Record<string, string> = {};

  // All at once: the server gives up after 3 seconds, and each language adds another rebuild.
  const results = await Promise.allSettled(
    paths.map((path) => (res as NextApiResponse & { revalidate: (p: string) => Promise<void> }).revalidate(path))
  );
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') revalidated.push(paths[index]);
    else failed[paths[index]] = 'revalidate_failed';
  });

  return res.status(200).json({
    ok: true,
    event,
    revalidated,
    failed: Object.keys(failed).length ? failed : null
  });
}

