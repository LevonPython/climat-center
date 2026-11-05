import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import type { PublicPage } from '../lib/site';
import { Layout } from './Layout';
import { Sections } from './sections';

// The whole public site renders through here, so a new page in the admin needs no code.
export function PageView({ page }: { page: PublicPage | null }) {
  const { t } = useTranslation('common');
  const crumbs = useRef<HTMLElement>(null);
  const slug = page?.slug;
  const showsHero = page?.type === 'service' || page?.type === 'fault';

  // These pages open below the hero, as on the original, so the content is on screen straight away.
  useEffect(() => {
    if (showsHero && !window.location.hash) crumbs.current?.scrollIntoView();
  }, [slug, showsHero]);

  if (!page) {
    return (
      <Layout front>
        <p className="py-10 text-center">{t('errors.generic')}</p>
      </Layout>
    );
  }

  const isHome = page.type === 'home';
  const banner = page.sections[0]?.block_type === 'service_banner' ? page.sections.slice(0, 1) : [];
  const rest = page.sections.slice(banner.length);
  const hideContacts = page.sections.some((section) => section.block_type === 'contacts_strip');

  const breadcrumbs = isHome ? null : (
    <nav ref={crumbs} aria-label={t('layout.breadcrumbs')} className="my-2.5 py-1 text-sm">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link href="/" className="text-ink no-underline hover:text-brand">
            {t('layout.home')}
          </Link>
        </li>
        {page.breadcrumbs.map((crumb) => (
          <li key={crumb.href} className="flex items-center gap-2">
            <span aria-hidden="true" className="inline-block h-[7px] w-[7px] rounded-full bg-brand" />
            <Link href={crumb.href} className="text-ink no-underline hover:text-brand">
              {crumb.title}
            </Link>
          </li>
        ))}
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="inline-block h-[7px] w-[7px] rounded-full bg-brand" />
          <span aria-current="page">{page.title}</span>
        </li>
      </ol>
    </nav>
  );

  return (
    <Layout title={page.title} metaTitle={page.meta_title} description={page.meta_description} front={isHome} hero={isHome || showsHero} breadcrumbs={breadcrumbs} hideContacts={hideContacts}>
      <Sections sections={banner} />
      {isHome ? null : <h1 className="mb-6 text-[160%] font-medium uppercase">{page.title}</h1>}
      <Sections sections={rest} />
    </Layout>
  );
}
