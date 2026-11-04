import type { NextApiRequest, NextApiResponse } from 'next';

type RevalidateEvent = 'content' | 'services';
type Body = { event?: RevalidateEvent; paths?: unknown };

const LOCALE_PREFIXES = ['', '/en', '/ru'] as const;
const PATH_PATTERN = /^\/[a-z0-9/-]*$/;
const MAX_PATHS = 20;

function localizePath(basePath: string, localePrefix: (typeof LOCALE_PREFIXES)[number]) {
  if (!localePrefix) return basePath;
  if (basePath === '/') return localePrefix;
  return `${localePrefix}${basePath}`;
}

function basePathsForEvent(event: RevalidateEvent): string[] {
  return event === 'content' ? ['/', '/about', '/contacts'] : ['/services'];
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

  for (const path of paths) {
    try {
      // Next.js ISR revalidation for Pages Router
      await (res as NextApiResponse & { revalidate: (p: string) => Promise<void> }).revalidate(path);
      revalidated.push(path);
    } catch {
      failed[path] = 'revalidate_failed';
    }
  }

  return res.status(200).json({
    ok: true,
    event,
    revalidated,
    failed: Object.keys(failed).length ? failed : null
  });
}

