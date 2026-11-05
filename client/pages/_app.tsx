import type { AppProps } from 'next/app';
import type { SSRConfig } from 'next-i18next';
import { Noto_Sans_Armenian, Roboto } from 'next/font/google';
import { PageTranslations } from '../components/site/PageTranslations';
import { SiteContext } from '../components/site/SiteContext';
import type { SiteData } from '../lib/site';
import '../styles/globals.css';

const roboto = Roboto({ subsets: ['latin', 'cyrillic'], weight: ['300', '400', '500', '700'], variable: '--font-roboto', display: 'swap' });
// Roboto has no Armenian letters.
const armenian = Noto_Sans_Armenian({ subsets: ['armenian'], weight: ['300', '400', '500', '700'], variable: '--font-armenian', display: 'swap' });

export default function App({ Component, pageProps }: AppProps<{ site?: SiteData | null } & Partial<SSRConfig>>) {
  return (
    <PageTranslations config={pageProps._nextI18Next}>
      <SiteContext.Provider value={pageProps.site ?? null}>
        <div className={`${roboto.variable} ${armenian.variable} font-sans`}>
          <Component {...pageProps} />
        </div>
      </SiteContext.Provider>
    </PageTranslations>
  );
}
