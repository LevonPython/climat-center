import type { AppProps } from 'next/app';
import type { SSRConfig } from 'next-i18next';
import { Noto_Sans_Arabic, Noto_Sans_Armenian, Roboto } from 'next/font/google';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { PageTranslations } from '../components/site/PageTranslations';
import { SiteContext } from '../components/site/SiteContext';
import { textDirection } from '../lib/direction';
import type { SiteData } from '../lib/site';
import '../styles/globals.css';

const roboto = Roboto({ subsets: ['latin', 'cyrillic'], weight: ['300', '400', '500', '700'], variable: '--font-roboto', display: 'swap' });
// Roboto has no Armenian letters.
const armenian = Noto_Sans_Armenian({ subsets: ['armenian'], weight: ['300', '400', '500', '700'], variable: '--font-armenian', display: 'swap' });
// Not preloaded: browsers fetch it only for pages that contain Arabic letters.
const arabic = Noto_Sans_Arabic({ subsets: ['arabic'], weight: ['300', '400', '500', '700'], variable: '--font-arabic', display: 'swap', preload: false });

export default function App({ Component, pageProps }: AppProps<{ site?: SiteData | null } & Partial<SSRConfig>>) {
  const { locale } = useRouter();
  // The document sets these on the first page; switching language in the browser doesn't render it again.
  useEffect(() => {
    document.documentElement.lang = locale || 'hy';
    document.documentElement.dir = textDirection(locale);
  }, [locale]);

  return (
    <PageTranslations config={pageProps._nextI18Next}>
      <SiteContext.Provider value={pageProps.site ?? null}>
        <div className={`${roboto.variable} ${armenian.variable} ${arabic.variable} font-sans`}>
          <Component {...pageProps} />
        </div>
      </SiteContext.Provider>
    </PageTranslations>
  );
}
