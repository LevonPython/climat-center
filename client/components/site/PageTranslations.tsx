import i18next, { type i18n as I18n } from 'i18next';
import { I18nContext, type SSRConfig } from 'next-i18next';
import { useMemo, type ReactNode } from 'react';

type PageTranslationsProps = { config?: SSRConfig['_nextI18Next']; children: ReactNode };

function createInstance(config: NonNullable<SSRConfig['_nextI18Next']>): I18n {
  const instance = i18next.createInstance();
  instance.init({
    lng: config.initialLocale,
    resources: config.initialI18nStore,
    ns: config.ns,
    defaultNS: 'common',
    fallbackLng: false,
    returnObjects: true,
    initAsync: false,
    interpolation: { escapeValue: false },
    react: { useSuspense: false }
  });
  return instance;
}

// appWithTranslation renders on the server from one shared store, which never sees text edited in the admin,
// so the server and browser would disagree. Each page's own props hold the merged text, so we render from those.
// The context comes from next-i18next because on the server it holds its own copy of react-i18next.
export function PageTranslations({ config, children }: PageTranslationsProps) {
  const value = useMemo(() => (config ? { i18n: createInstance(config), defaultNS: 'common' } : null), [config]);
  return value ? <I18nContext.Provider value={value}>{children}</I18nContext.Provider> : <>{children}</>;
}
