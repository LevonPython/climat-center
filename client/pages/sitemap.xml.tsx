import type { GetServerSideProps } from 'next';
import { loadPublishedSlugs } from '../lib/site';
import { buildSitemap } from '../lib/seo';

export default function Sitemap() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const slugs = await loadPublishedSlugs();
  const paths = ['/', '/booking', '/quiz', ...slugs.filter((slug) => slug !== 'home').map((slug) => `/${slug}`)];
  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.write(buildSitemap(paths));
  res.end();
  return { props: {} };
};
