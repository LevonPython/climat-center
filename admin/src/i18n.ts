import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';

const LOCALES = ['ru', 'en', 'am'] as const;
export type Locale = (typeof LOCALES)[number];

const STORAGE_KEY = 'admin-locale';

export function getStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && LOCALES.includes(stored as Locale)) return stored as Locale;
  } catch {
    /* ignore */
  }
  return 'ru';
}

export function setStoredLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
}

i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    lng: getStoredLocale(),
    fallbackLng: 'ru',
    supportedLngs: LOCALES,
    ns: ['common'],
    defaultNS: 'common',
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json'
    },
    interpolation: {
      escapeValue: false
    },
    react: {
      useSuspense: true
    }
  });

i18n.on('languageChanged', (lng) => {
  setStoredLocale(lng as Locale);
});

export default i18n;
