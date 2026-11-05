import type { GetStaticPaths, GetStaticProps } from 'next';
import { PageView } from '../components/PageView';
import { ISR_SECONDS, loadCommonProps, loadPage, type PublicPage } from '../lib/site';

export default function ContentPage({ page }: { page: PublicPage }) {
  return <PageView page={page} />;
}

// Pages are generated on first view, so a build never depends on the API being up.
export const getStaticPaths: GetStaticPaths = async () => ({ paths: [], fallback: 'blocking' });

export const getStaticProps: GetStaticProps = async ({ locale, params }) => {
  const lang = locale || 'hy';
  const slug = (params?.slug as string[]).join('/');
  // The home page lives at the root, not at /home.
  if (slug === 'home') return { notFound: true, revalidate: ISR_SECONDS };

  // Throws when the API fails, so a page being refreshed keeps its last good copy.
  const page = await loadPage(slug, lang);
  // A page with no text in this language would be blank, so it isn't offered in it.
  if (!page || !page.title) return { notFound: true, revalidate: ISR_SECONDS };
  return { props: { ...(await loadCommonProps(lang)), page }, revalidate: ISR_SECONDS };
};
