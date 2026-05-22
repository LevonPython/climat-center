/** @type {import('next-i18next').UserConfig} */
module.exports = {
  i18n: {
    defaultLocale: 'am',
    locales: ['ru', 'en', 'am']
  },
  // Pre-bundle locale JSON so both SSR and client use in-memory resources —
  // no filesystem or network access needed, works with Turbopack.
  resources: {
    ru: { common: require('./public/locales/ru/common.json') },
    en: { common: require('./public/locales/en/common.json') },
    am: { common: require('./public/locales/am/common.json') }
  },
  ns: ['common'],
  defaultNS: 'common',
  returnObjects: true
};
