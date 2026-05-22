const path = require('path');

/** @type {import('next-i18next').UserConfig} */
module.exports = {
  i18n: {
    defaultLocale: 'ru',
    locales: ['ru', 'en', 'am']
  },
  localePath: path.join(__dirname, 'public/locales'),
  returnObjects: true
};

