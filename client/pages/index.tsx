import type { GetStaticProps } from 'next';
import { PageView } from '../components/PageView';
import { ISR_SECONDS, isProductionBuild, loadCommonProps, loadCommonPropsSafely, loadPage, type PublicPage } from '../lib/site';

export default function HomePage({ page }: { page: PublicPage | null }) {
  return <PageView page={page} />;
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  const lang = locale || 'hy';
  try {
    const [common, page] = await Promise.all([loadCommonProps(lang), loadPage('home', lang)]);
    return { props: { ...common, page }, revalidate: ISR_SECONDS };
  } catch (err) {
    // A failed refresh keeps the last good page by throwing. Only a build has no good page to keep.
    if (!isProductionBuild()) throw err;
    return { props: { ...(await loadCommonPropsSafely(lang)), page: null }, revalidate: 10 };
  }
};
