/** @type {import('next-i18next').UserConfig} */
module.exports = {
  i18n: {
    defaultLocale: 'hy',
    locales: ['ru', 'en', 'hy', 'ar']
  },
  // Pre-bundle locale JSON so both SSR and client use in-memory resources —
  // no filesystem or network access needed, works with Turbopack.
  resources: {
    ru: { common: require('./public/locales/ru/common.json') },
    en: { common: require('./public/locales/en/common.json') },
    hy: { common: require('./public/locales/hy/common.json') },
    ar: { common: require('./public/locales/ar/common.json') }
  },
  ns: ['common'],
  defaultNS: 'common',
  returnObjects: true
};
