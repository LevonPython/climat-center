import type { NextApiRequest, NextApiResponse } from 'next';

type RevalidateEvent = 'content' | 'services';
type Body = { event?: RevalidateEvent };

const LOCALE_PREFIXES = ['', '/en', '/am'] as const;

function localizePath(basePath: string, localePrefix: (typeof LOCALE_PREFIXES)[number]) {
  if (!localePrefix) return basePath;
  if (basePath === '/') return localePrefix;
  return `${localePrefix}${basePath}`;
}

function pathsForEvent(event: RevalidateEvent): string[] {
  const basePaths =
    event === 'content'
      ? ['/', '/about', '/contacts']
      : event === 'services'
        ? ['/services']
        : [];

  const out: string[] = [];
  for (const p of basePaths) {
    for (const prefix of LOCALE_PREFIXES) {
      out.push(localizePath(p, prefix));
    }
  }
  return out;
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
  if (event !== 'content' && event !== 'services') {
    return res.status(400).json({ ok: false, error: { message: 'Invalid event' } });
  }

  const paths = pathsForEvent(event);
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

