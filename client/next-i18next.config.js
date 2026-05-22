const path = require('path');

/** @type {import('next-i18next').UserConfig} */
module.exports = {
  i18n: {
    defaultLocale: 'ru',
    locales: ['ru', 'en', 'am']
  },
  // Bundle locale JSON so ISR/SSR on Vercel can read translations without filesystem access to public/.
  resources: {
    ru: { common: require('./public/locales/ru/common.json') },
    en: { common: require('./public/locales/en/common.json') },
    am: { common: require('./public/locales/am/common.json') }
  },
  ns: ['common'],
  defaultNS: 'common',
  localePath:
    typeof window === 'undefined'
      ? path.resolve(process.cwd(), 'public/locales')
      : '/locales',
  returnObjects: true
};
