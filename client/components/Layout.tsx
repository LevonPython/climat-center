import { useTranslation } from 'next-i18next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { telHref } from '../lib/contactPhone';
import { LOCALES, localizedUrl } from '../lib/seo';
import { ContactsStrip } from './site/ContactsStrip';
import { Hero } from './site/Hero';
import { RequestPopup } from './site/RequestPopup';
import { Sidebar } from './site/Sidebar';
import { RequestPopupContext, useSite } from './site/SiteContext';
import { SiteFooter } from './site/SiteFooter';
import { SiteHeader } from './site/SiteHeader';
import { TopBar } from './site/TopBar';

type LayoutProps = {
  title?: string | null;
  metaTitle?: string | null;
  description?: string | null;
  front?: boolean;
  hero?: boolean;
  breadcrumbs?: ReactNode;
  hideContacts?: boolean;
  children: ReactNode;
};

export function Layout({ title, metaTitle, description, front = false, hero = false, breadcrumbs, hideContacts = false, children }: LayoutProps) {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { settings } = useSite();
  const [requestOpen, setRequestOpen] = useState(false);
  const openRequest = useCallback(() => setRequestOpen(true), []);
  const closeRequest = useCallback(() => setRequestOpen(false), []);
  const brand = settings.branding?.site_name || t('brand');
  const fullTitle = useMemo(() => metaTitle || (title ? `${title} | ${brand}` : brand), [metaTitle, title, brand]);
  const path = router.asPath.split(/[?#]/)[0];
  const locale = router.locale || 'hy';
  const phone = settings.contacts?.phone;

  return (
    <RequestPopupContext.Provider value={openRequest}>
      <Head>
        <title>{fullTitle}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {description ? <meta name="description" content={description} /> : null}
        <link rel="canonical" href={localizedUrl(path, locale)} />
        {LOCALES.map((other) => (
          <link key={other} rel="alternate" hrefLang={other} href={localizedUrl(path, other)} />
        ))}
        <link rel="alternate" hrefLang="x-default" href={localizedUrl(path, 'hy')} />
      </Head>
      <div className={`flex min-h-screen flex-col break-words ${front ? "[background:url('/theme/volna-1.webp')_50%_580px_no-repeat,url('/theme/volna-2.webp')_50%_1260px_no-repeat,url('/theme/volna-3.webp')_0_2660px_no-repeat]" : ''}`}>
        <TopBar />
        <SiteHeader />
        {hero ? <Hero showBrands={front} /> : null}
        {breadcrumbs ? <div className="mx-auto w-full max-w-site px-5">{breadcrumbs}</div> : null}
        <div className="mx-auto flex w-full max-w-site flex-1 flex-col-reverse gap-5 px-5 pb-10 pt-2.5 desk:flex-row">
          <Sidebar />
          <main className="min-w-0 flex-1">
            {children}
            {hideContacts ? null : <ContactsStrip />}
          </main>
        </div>
        <SiteFooter />
      </div>
      {phone ? (
        <a
          href={telHref(phone)}
          aria-label={t('layout.call')}
          className="fixed bottom-5 right-5 z-30 grid h-14 w-14 place-items-center rounded-full bg-[#3b5ba5] text-white shadow-lg hover:opacity-90"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 fill-current">
            <path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" />
          </svg>
        </a>
      ) : null}
      {requestOpen ? <RequestPopup onClose={closeRequest} /> : null}
    </RequestPopupContext.Provider>
  );
}
