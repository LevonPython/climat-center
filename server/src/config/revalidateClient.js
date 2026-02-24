async function triggerRevalidate(event) {
  const publicSiteUrl = process.env.PUBLIC_SITE_URL;
  const secret = process.env.REVALIDATE_SECRET;

  if (!publicSiteUrl || !secret) return;
  if (event !== 'content' && event !== 'services') return;

  let url;
  try {
    url = new URL('/api/revalidate', publicSiteUrl);
    url.searchParams.set('secret', secret);
  } catch {
    console.warn('[revalidate] invalid PUBLIC_SITE_URL');
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event }),
      signal: controller.signal
    });

    // Don't fail the admin request if revalidation fails.
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn(`[revalidate] failed (${res.status}) event=${event} body=${text.slice(0, 200)}`);
    }
  } catch (err) {
    console.warn(`[revalidate] error event=${event}`, err && err.name ? err.name : err);
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { triggerRevalidate };

